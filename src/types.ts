/**
 * Định nghĩa kiểu dữ liệu cho toàn bộ nội dung bảo tàng 3D từ museum.json
 */

export interface MuseumInfo {
  name: string;
  welcome: string;
  guideName: string;
}

export interface RoomSize {
  width: number;
  depth: number;
  height: number;
}

export type FloorMaterial = 'wood' | 'stone' | 'carpet' | string;
export type LightingStyle = 'warm' | 'cool' | 'dramatic' | string;

export interface RoomStyle {
  wall: string;
  floor: FloorMaterial;
  lighting: LightingStyle;
  ambientAudio?: string | null;
}

export type ExhibitType = 'image' | 'model' | 'video';

export interface WallPosition {
  wall: 'north' | 'south' | 'east' | 'west' | string;
  offset: number;
  height?: number;
}

export interface CoordPosition {
  x: number;
  y?: number;
  z: number;
}

export type ExhibitPosition = WallPosition | CoordPosition;

export interface ExhibitData {
  id: string;
  type: ExhibitType;
  title: string;
  period: string;
  origin: string;
  summary: string;
  description: string;
  story: string;
  source: string;
  asset?: string | null;
  audio?: string | null;
  stats?: Array<{ label: string; value: string }>;
  procedural?: Record<string, unknown>;
  position: ExhibitPosition;
  tourOrder: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface RoomData {
  id: string;
  name: string;
  theme: string;
  intro: string;
  guideIntro: string;
  size: RoomSize;
  style: RoomStyle;
  exhibits: ExhibitData[];
  quiz: QuizQuestion[];
  suggestedQuestions: string[];
}

export interface MuseumData {
  museum: MuseumInfo;
  rooms: RoomData[];
}

/**
 * Lớp lỗi dữ liệu bảo tàng với thông báo chi tiết bằng tiếng Việt
 */
export class MuseumValidationError extends Error {
  constructor(message: string, public readonly fieldPath?: string) {
    super(message);
    this.name = 'MuseumValidationError';
  }
}

/**
 * Kiểm tra tính đầy đủ và hợp lệ của dữ liệu bảo tàng
 * Ném lỗi tiếng Việt chỉ rõ tên trường và vị trí nếu thiếu hoặc sai kiểu
 */
export function validateMuseumData(data: unknown): asserts data is MuseumData {
  if (!data || typeof data !== 'object') {
    throw new MuseumValidationError('Dữ liệu museum.json không hợp lệ hoặc rỗng.');
  }

  const raw = data as Record<string, unknown>;

  // Kiểm tra trường gốc: museum
  if (!raw.museum || typeof raw.museum !== 'object') {
    throw new MuseumValidationError("Thiếu thông tin bảo tàng: trường 'museum' không tồn tại hoặc sai định dạng.", 'museum');
  }

  const museum = raw.museum as Record<string, unknown>;
  if (typeof museum.name !== 'string' || !museum.name.trim()) {
    throw new MuseumValidationError("Thiếu trường 'museum.name' (Tên bảo tàng).", 'museum.name');
  }
  if (typeof museum.welcome !== 'string' || !museum.welcome.trim()) {
    throw new MuseumValidationError("Thiếu trường 'museum.welcome' (Lời chào sảnh).", 'museum.welcome');
  }
  if (typeof museum.guideName !== 'string' || !museum.guideName.trim()) {
    throw new MuseumValidationError("Thiếu trường 'museum.guideName' (Tên hướng dẫn viên).", 'museum.guideName');
  }

  // Kiểm tra trường gốc: rooms
  if (!Array.isArray(raw.rooms)) {
    throw new MuseumValidationError("Thiếu danh sách phòng: trường 'rooms' phải là một mảng.", 'rooms');
  }
  if (raw.rooms.length === 0) {
    throw new MuseumValidationError("Danh sách phòng 'rooms' không được để trống.", 'rooms');
  }

  // Kiểm tra từng phòng
  raw.rooms.forEach((roomRaw: unknown, roomIdx: number) => {
    const rPrefix = `Phòng số ${roomIdx + 1}`;
    if (!roomRaw || typeof roomRaw !== 'object') {
      throw new MuseumValidationError(`${rPrefix}: Dữ liệu phòng không hợp lệ.`, `rooms[${roomIdx}]`);
    }

    const room = roomRaw as Record<string, unknown>;
    const roomId = typeof room.id === 'string' && room.id ? room.id : `phòng chỉ số ${roomIdx}`;

    const checkStr = (val: unknown, field: string, label: string) => {
      if (typeof val !== 'string' || !val.trim()) {
        throw new MuseumValidationError(
          `Phòng [${roomId}]: Thiếu trường '${field}' (${label}).`,
          `rooms[${roomIdx}].${field}`
        );
      }
    };

    checkStr(room.id, 'id', 'Mã định danh phòng');
    checkStr(room.name, 'name', 'Tên phòng');
    checkStr(room.theme, 'theme', 'Chủ đề phòng');
    checkStr(room.intro, 'intro', 'Đoạn giới thiệu phòng');
    checkStr(room.guideIntro, 'guideIntro', 'Lời dẫn hướng dẫn viên');

    // Kiểm tra size
    if (!room.size || typeof room.size !== 'object') {
      throw new MuseumValidationError(`Phòng [${roomId}]: Thiếu trường 'size' (Kích thước phòng).`, `rooms[${roomIdx}].size`);
    }
    const size = room.size as Record<string, unknown>;
    if (typeof size.width !== 'number') {
      throw new MuseumValidationError(`Phòng [${roomId}]: Thiếu trường 'size.width' hoặc không phải số.`, `rooms[${roomIdx}].size.width`);
    }
    if (typeof size.depth !== 'number') {
      throw new MuseumValidationError(`Phòng [${roomId}]: Thiếu trường 'size.depth' hoặc không phải số.`, `rooms[${roomIdx}].size.depth`);
    }
    if (typeof size.height !== 'number') {
      throw new MuseumValidationError(`Phòng [${roomId}]: Thiếu trường 'size.height' hoặc không phải số.`, `rooms[${roomIdx}].size.height`);
    }

    // Kiểm tra style
    if (!room.style || typeof room.style !== 'object') {
      throw new MuseumValidationError(`Phòng [${roomId}]: Thiếu trường 'style' (Kiểu dáng, màu sắc phòng).`, `rooms[${roomIdx}].style`);
    }
    const style = room.style as Record<string, unknown>;
    if (typeof style.wall !== 'string' || !style.wall.trim()) {
      throw new MuseumValidationError(`Phòng [${roomId}]: Thiếu trường 'style.wall' (Màu tường).`, `rooms[${roomIdx}].style.wall`);
    }
    if (typeof style.floor !== 'string' || !style.floor.trim()) {
      throw new MuseumValidationError(`Phòng [${roomId}]: Thiếu trường 'style.floor' (Vật liệu sàn).`, `rooms[${roomIdx}].style.floor`);
    }
    if (typeof style.lighting !== 'string' || !style.lighting.trim()) {
      throw new MuseumValidationError(`Phòng [${roomId}]: Thiếu trường 'style.lighting' (Kiểu đèn).`, `rooms[${roomIdx}].style.lighting`);
    }

    // Kiểm tra exhibits
    if (!Array.isArray(room.exhibits)) {
      throw new MuseumValidationError(`Phòng [${roomId}]: Thiếu trường 'exhibits' (Danh sách hiện vật phải là mảng).`, `rooms[${roomIdx}].exhibits`);
    }

    room.exhibits.forEach((exhibitRaw: unknown, exIdx: number) => {
      if (!exhibitRaw || typeof exhibitRaw !== 'object') {
        throw new MuseumValidationError(
          `Phòng [${roomId}], hiện vật thứ ${exIdx + 1}: Dữ liệu không hợp lệ.`,
          `rooms[${roomIdx}].exhibits[${exIdx}]`
        );
      }
      const exhibit = exhibitRaw as Record<string, unknown>;
      const exId = typeof exhibit.id === 'string' && exhibit.id ? exhibit.id : `hiện vật #${exIdx + 1}`;

      const checkExStr = (val: unknown, field: string, label: string) => {
        if (typeof val !== 'string' || !val.trim()) {
          throw new MuseumValidationError(
            `Phòng [${roomId}], hiện vật [${exId}]: Thiếu trường '${field}' (${label}).`,
            `rooms[${roomIdx}].exhibits[${exIdx}].${field}`
          );
        }
      };

      checkExStr(exhibit.id, 'id', 'Mã hiện vật');
      checkExStr(exhibit.type, 'type', 'Loại hiện vật (image/model/video)');
      if (!['image', 'model', 'video'].includes(exhibit.type as string)) {
        throw new MuseumValidationError(
          `Phòng [${roomId}], hiện vật [${exId}]: Trường 'type' phải là 'image', 'model' hoặc 'video'.`,
          `rooms[${roomIdx}].exhibits[${exIdx}].type`
        );
      }
      checkExStr(exhibit.title, 'title', 'Tên hiện vật');
      checkExStr(exhibit.period, 'period', 'Niên đại');
      checkExStr(exhibit.origin, 'origin', 'Xuất xứ');
      checkExStr(exhibit.summary, 'summary', 'Nhãn tóm tắt');
      checkExStr(exhibit.description, 'description', 'Thuyết minh');
      checkExStr(exhibit.story, 'story', 'Câu chuyện kể');
      checkExStr(exhibit.source, 'source', 'Nguồn tư liệu');
      if (
        exhibit.asset !== null &&
        exhibit.asset !== undefined &&
        typeof exhibit.asset !== 'string'
      ) {
        throw new MuseumValidationError(
          `Phòng [${roomId}], hiện vật [${exId}]: Trường 'asset' phải là đường dẫn chuỗi hoặc null.`,
          `rooms[${roomIdx}].exhibits[${exIdx}].asset`
        );
      }

      if (!exhibit.position || typeof exhibit.position !== 'object') {
        throw new MuseumValidationError(
          `Phòng [${roomId}], hiện vật [${exId}]: Thiếu trường 'position' (Vị trí hiện vật).`,
          `rooms[${roomIdx}].exhibits[${exIdx}].position`
        );
      }

      if (typeof exhibit.tourOrder !== 'number') {
        throw new MuseumValidationError(
          `Phòng [${roomId}], hiện vật [${exId}]: Thiếu trường 'tourOrder' (Thứ tự tham quan).`,
          `rooms[${roomIdx}].exhibits[${exIdx}].tourOrder`
        );
      }
    });

    // Kiểm tra quiz
    if (!Array.isArray(room.quiz)) {
      throw new MuseumValidationError(`Phòng [${roomId}]: Thiếu trường 'quiz' (Bộ câu đố phải là mảng).`, `rooms[${roomIdx}].quiz`);
    }

    room.quiz.forEach((qRaw: unknown, qIdx: number) => {
      if (!qRaw || typeof qRaw !== 'object') {
        throw new MuseumValidationError(
          `Phòng [${roomId}], câu đố thứ ${qIdx + 1}: Dữ liệu không hợp lệ.`,
          `rooms[${roomIdx}].quiz[${qIdx}]`
        );
      }
      const q = qRaw as Record<string, unknown>;
      if (typeof q.question !== 'string' || !q.question.trim()) {
        throw new MuseumValidationError(
          `Phòng [${roomId}], câu đố ${qIdx + 1}: Thiếu trường 'question' (Nội dung câu hỏi).`,
          `rooms[${roomIdx}].quiz[${qIdx}].question`
        );
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new MuseumValidationError(
          `Phòng [${roomId}], câu đố ${qIdx + 1}: Trường 'options' phải là danh sách tối thiểu 2 lựa chọn.`,
          `rooms[${roomIdx}].quiz[${qIdx}].options`
        );
      }
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) {
        throw new MuseumValidationError(
          `Phòng [${roomId}], câu đố ${qIdx + 1}: Trường 'answer' phải là chỉ số đáp án đúng hợp lệ.`,
          `rooms[${roomIdx}].quiz[${qIdx}].answer`
        );
      }
      if (typeof q.explain !== 'string' || !q.explain.trim()) {
        throw new MuseumValidationError(
          `Phòng [${roomId}], câu đố ${qIdx + 1}: Thiếu trường 'explain' (Lời giải thích).`,
          `rooms[${roomIdx}].quiz[${qIdx}].explain`
        );
      }
    });

    // Kiểm tra suggestedQuestions
    if (!Array.isArray(room.suggestedQuestions)) {
      throw new MuseumValidationError(
        `Phòng [${roomId}]: Thiếu trường 'suggestedQuestions' (Câu hỏi gợi ý phải là mảng).`,
        `rooms[${roomIdx}].suggestedQuestions`
      );
    }
  });
}

/**
 * Hàm đọc tệp dữ liệu bảo tàng, kiểm tra thiếu trường và báo lỗi rõ ràng bằng tiếng Việt
 */
export async function loadMuseum(path = '/data/museum.json'): Promise<MuseumData> {
  let response: Response;
  try {
    response = await fetch(path);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new MuseumValidationError(`Không thể tải tệp dữ liệu '${path}': Lỗi kết nối mạng (${errorMsg}).`);
  }

  if (!response.ok) {
    throw new MuseumValidationError(`Không thể tải tệp '${path}': Máy chủ trả về mã lỗi HTTP ${response.status} (${response.statusText}).`);
  }

  let jsonData: unknown;
  try {
    jsonData = await response.json();
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new MuseumValidationError(`Tệp '${path}' không đúng định dạng JSON: ${errorMsg}.`);
  }

  // Xác thực toàn bộ các trường theo chuẩn của hệ thống
  validateMuseumData(jsonData);

  return jsonData;
}
