/**
 * API máy chủ gọi Gemini (Chuẩn bị cho Lệnh 5)
 * Khóa API đọc từ biến môi trường GEMINI_API_KEY
 */

export interface ChatRequestBody {
  question: string;
  roomId?: string;
  exhibitId?: string;
  history?: Array<{ role: 'user' | 'model'; parts: string }>;
}

export async function handleChatRequest(_req: ChatRequestBody) {
  // Sẽ được hiện thực chi tiết trong Lệnh 5
  return {
    status: 'pending_implementation',
    message: 'API trợ lý hỏi đáp sẽ được kích hoạt tại Lệnh 5',
  };
}
