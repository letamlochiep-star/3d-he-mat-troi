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

// Đọc danh sách khóa API từ biến môi trường hoặc tệp .env.local
let currentKeyIndex = 0;
function getAvailableApiKeys(): string[] {
  // Ưu tiên đọc biến môi trường
  let rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';

  // Đọc trực tiếp từ .env.local nếu biến môi trường chưa kịp nạp
  if (!rawKeys || rawKeys.includes('PLACEHOLDER') || rawKeys.includes('your_gemini_api_key_here')) {
    try {
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        const matchKeys = content.match(/GEMINI_API_KEYS\s*=\s*([^\r\n]+)/);
        const matchSingle = content.match(/GEMINI_API_KEY\s*=\s*([^\r\n]+)/);
        if (matchKeys) {
          rawKeys = matchKeys[1];
        } else if (matchSingle) {
          rawKeys = matchSingle[1];
        }
      }
    } catch {
      // bỏ qua lỗi đọc file
    }
  }

  const list = rawKeys
    .split(/[\r\n,;]+/)
    .map(k => k.trim())
    .filter(k => k && !k.startsWith('#') && k !== 'your_gemini_api_key_here' && k !== 'PLACEHOLDER_API_KEY');

  // Loại bỏ các khóa trùng lặp
  return Array.from(new Set(list));
}

function getModelName(): string {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/GEMINI_MODEL\s*=\s*([^\r\n]+)/);
      if (match && match[1].trim()) return match[1].trim();
    }
  } catch {}
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
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

  // Đọc danh sách khóa API và tên mô hình
  const apiKeys = getAvailableApiKeys();
  const modelName = getModelName();

  // Thiết lập SSE response
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Nếu không có khóa API, trả về phản hồi lịch sự từ dữ liệu sẵn có (F4.6)
  if (apiKeys.length === 0) {
    let mockAnswer = 'Chào bạn! Mình là Anh Minh. Khóa API Gemini chưa được thiết lập trên máy chủ nên mình đang trò chuyện ở chế độ offline. ';
    if (museum?.guide?.introduction) {
      mockAnswer += museum.guide.introduction + ' ';
    }
    mockAnswer += 'Bạn hãy nhấn vào các bảng hiện vật trong phòng để đọc thuyết minh chi tiết nhé!';

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
  for (const item of recentHistory) {
    contents.push({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }],
    });
  }
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
      maxOutputTokens: 800,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  // Cơ chế luân chuyển khóa thông minh (Key Rotation Pool)
  let successful = false;
  const startIndex = currentKeyIndex % apiKeys.length;

  for (let attempt = 0; attempt < apiKeys.length; attempt++) {
    const keyIdx = (startIndex + attempt) % apiKeys.length;
    const apiKey = apiKeys[keyIdx];

    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Khóa Gemini [${keyIdx + 1}/${apiKeys.length}] trả về mã lỗi ${response.status}. Đang chuyển sang khóa tiếp theo...`);
        // Nếu là lỗi rate limit hoặc auth, thử key tiếp theo
        continue;
      }

      if (!response.body) {
        continue;
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
                // Bỏ qua dòng JSON chưa trọn vẹn
              }
            }
          }
        }
      } else {
        const fullText = await response.text();
        res.write(`data: ${JSON.stringify({ text: fullText, done: false })}\n\n`);
      }

      // Lưu lại key index hoạt động tốt
      currentKeyIndex = keyIdx;
      successful = true;
      break;
    } catch (keyErr) {
      console.warn(`Lỗi khi gọi API với khóa [${keyIdx + 1}/${apiKeys.length}]:`, keyErr);
    }
  }

  if (successful) {
    res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
    res.end();
  } else {
    const fallbackMsg = 'Hiện tại các đường truyền đến máy chủ AI đều đang quá tải hoặc gián đoạn. Bạn có thể nhấn vào các thiên thể trong phòng để nghe thuyết minh chi tiết nhé!';
    res.write(`data: ${JSON.stringify({ text: fallbackMsg, done: true, error: true })}\n\n`);
    res.end();
  }
}
