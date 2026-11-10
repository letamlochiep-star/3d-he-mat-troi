import type { IncomingMessage, ServerResponse } from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildSystemPrompt } from '../src/assistant/system-prompt';

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestBody {
  message?: string;
  roomId?: string;
  exhibitId?: string;
  history?: ChatHistoryItem[];
}

// Bộ nhớ đệm kiểm soát tần suất truy vấn theo IP: Tối đa 20 câu / giờ / IP
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const MAX_QUESTIONS_PER_HOUR = 20;
const ONE_HOUR_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + ONE_HOUR_MS });
    return { allowed: true, remaining: MAX_QUESTIONS_PER_HOUR - 1 };
  }

  if (record.count >= MAX_QUESTIONS_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: MAX_QUESTIONS_PER_HOUR - record.count };
}

// Đọc dữ liệu bảo tàng để nạp context cho Gemini
let cachedMuseumData: any = null;
function getMuseumData(): any {
  if (cachedMuseumData) return cachedMuseumData;
  try {
    const dataPath = path.resolve(process.cwd(), 'public/data/museum.json');
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      cachedMuseumData = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Không thể đọc museum.json cho chat assistant:', err);
  }
  return cachedMuseumData;
}

export async function handleChatRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // CORS & Header phản hồi SSE (Server-Sent Events)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Phương thức không được hỗ trợ. Vui lòng gửi POST.' }));
    return;
  }

  // Đọc body
  let bodyStr = '';
  try {
    bodyStr = await new Promise<string>((resolve, reject) => {
      let data = '';
      req.on('data', chunk => {
        data += chunk;
        if (data.length > 50000) {
          reject(new Error('Dữ liệu yêu cầu quá lớn'));
        }
      });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
  } catch (err) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Lỗi đọc dữ liệu yêu cầu' }));
    return;
  }

  let body: ChatRequestBody = {};
  try {
    body = JSON.parse(bodyStr || '{}');
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Định dạng JSON không hợp lệ' }));
    return;
  }

  const message = (body.message || '').trim();
  if (!message) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Nội dung câu hỏi không được để trống' }));
    return;
  }

  // Giới hạn câu hỏi tối đa 300 ký tự (F4.2)
  if (message.length > 300) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Câu hỏi vượt quá giới hạn 300 ký tự' }));
    return;
  }

  // Kiểm tra tần suất IP (20 câu / giờ)
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const msg = 'Bạn đã đạt giới hạn 20 câu hỏi trong 1 giờ. Hãy dành thời gian khám phá các hiện vật trong phòng nhé!';
    res.write(`data: ${JSON.stringify({ text: msg, done: true, rateLimited: true })}\n\n`);
    res.end();
    return;
  }

  // Đọc dữ liệu phòng và hiện vật từ museum.json
  const museum = getMuseumData();
  let roomDataStr = '{}';
  let exhibitDataStr = '{}';

  if (museum) {
    if (body.roomId && Array.isArray(museum.rooms)) {
      const room = museum.rooms.find((r: any) => r.id === body.roomId);
      if (room) {
        roomDataStr = JSON.stringify({
          id: room.id,
          name: room.name,
          theme: room.theme,
          description: room.description,
          audioGuideText: room.audioGuideText,
          stories: room.stories,
          suggestedQuestions: room.suggestedQuestions,
        }, null, 2);
      }
    }

    if (body.exhibitId && Array.isArray(museum.rooms)) {
      for (const r of museum.rooms) {
        const exh = r.exhibits?.find((e: any) => e.id === body.exhibitId);
        if (exh) {
          exhibitDataStr = JSON.stringify(exh, null, 2);
          break;
        }
      }
    }
  }

  // Chuẩn bị System Prompt
  const systemPrompt = buildSystemPrompt({
    guideName: museum?.guide?.name || 'Anh Minh',
    museumName: museum?.museum?.name || 'Bảo tàng Không gian 3D',
    roomJson: roomDataStr,
    exhibitJson: exhibitDataStr,
  });

  // Giới hạn 6 lượt hội thoại gần nhất (F4.2)
  const recentHistory = (body.history || []).slice(-6);

  // Đọc cấu hình Gemini từ biến môi trường
  const apiKey = process.env.GEMINI_API_KEY || '';
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  // Thiết lập SSE response
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Nếu không có khóa API, trả về phản hồi lịch sự từ dữ liệu sẵn có (F4.6)
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    let mockAnswer = 'Chào bạn! Mình là Anh Minh. Khóa API Gemini chưa được thiết lập trên máy chủ nên mình đang trò chuyện ở chế độ offline. ';
    if (museum?.guide?.introduction) {
      mockAnswer += museum.guide.introduction + ' ';
    }
    mockAnswer += 'Bạn hãy nhấn vào các bảng hiện vật trong phòng để đọc thuyết minh chi tiết nhé!';

    // Stream giả lập từng từ
    const words = mockAnswer.split(' ');
    for (let i = 0; i < words.length; i++) {
      const part = (i === 0 ? '' : ' ') + words[i];
      res.write(`data: ${JSON.stringify({ text: part, done: false })}\n\n`);
      await new Promise(r => setTimeout(r, 40));
    }
    res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
    res.end();
    return;
  }

  // Chuẩn bị nội dung gửi Gemini
  const contents: any[] = [];
  
  // Nạp 6 lượt lịch sử
  for (const item of recentHistory) {
    contents.push({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }],
    });
  }

  // Thêm câu hỏi hiện tại
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 250,
    },
  };

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Lỗi phản hồi từ Gemini API:', response.status, errText);
      const fallbackMsg = 'Hiện tại kết nối với máy chủ AI tạm thời gián đoạn. Bạn có thể nhấn vào các thiên thể trong phòng để nghe thuyết minh chi tiết nhé!';
      res.write(`data: ${JSON.stringify({ text: fallbackMsg, done: true, error: true })}\n\n`);
      res.end();
      return;
    }

    if (!response.body) {
      throw new Error('Không nhận được body phản hồi');
    }

    // Đọc stream từ Gemini SSE
    const reader = (response.body as any).getReader ? (response.body as any).getReader() : null;

    if (reader) {
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataContent = trimmed.substring(6).trim();
            if (dataContent === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataContent);
              const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (chunkText) {
                res.write(`data: ${JSON.stringify({ text: chunkText, done: false })}\n\n`);
              }
            } catch {
              // Bỏ qua dòng json không hoàn chỉnh
            }
          }
        }
      }
    } else {
      // Fallback khi stream API trả về text
      const fullText = await response.text();
      res.write(`data: ${JSON.stringify({ text: fullText, done: false })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Lỗi khi gọi Gemini API:', error);
    const errorMsg = 'Có lỗi xảy ra khi kết nối tới hướng dẫn viên ảo. Bạn hãy thử lại sau giây lát hoặc khám phá bảng thông tin hiện vật nhé!';
    res.write(`data: ${JSON.stringify({ text: errorMsg, done: true, error: true })}\n\n`);
    res.end();
  }
}
