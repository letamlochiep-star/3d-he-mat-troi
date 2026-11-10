/**
 * Quản lý lưu trữ tiến độ tham quan ("đã xem x/y") vào localStorage (F2.5)
 */
export class ProgressTracker {
  private static readonly STORAGE_KEY = 'museum_viewed_exhibits';
  private viewedSet: Set<string>;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.viewedSet = this.loadFromStorage();
  }

  private loadFromStorage(): Set<string> {
    try {
      const raw = localStorage.getItem(ProgressTracker.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return new Set(parsed);
        }
      }
    } catch (e) {
      console.warn('Không thể đọc tiến độ từ localStorage:', e);
    }
    return new Set<string>();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(
        ProgressTracker.STORAGE_KEY,
        JSON.stringify(Array.from(this.viewedSet))
      );
    } catch (e) {
      console.warn('Không thể lưu tiến độ vào localStorage:', e);
    }
  }

  public markAsViewed(exhibitId: string): boolean {
    if (!this.viewedSet.has(exhibitId)) {
      this.viewedSet.add(exhibitId);
      this.saveToStorage();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public isViewed(exhibitId: string): boolean {
    return this.viewedSet.has(exhibitId);
  }

  public getRoomProgress(exhibitIds: string[]): { viewed: number; total: number } {
    const total = exhibitIds.length;
    let viewed = 0;
    for (const id of exhibitIds) {
      if (this.viewedSet.has(id)) {
        viewed++;
      }
    }
    return { viewed, total };
  }

  public addListener(listener: () => void): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }
}
