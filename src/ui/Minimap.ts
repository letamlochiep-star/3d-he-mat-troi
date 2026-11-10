import { RoomData } from '../types';
import { STRINGS_VI } from './strings.vi';

export class Minimap {
  private readonly container: HTMLElement;
  private readonly rooms: RoomData[];
  private currentRoomId = 'lobby';
  private onSelectRoomCallback: (roomId: string) => void;
  private isExpanded = false;

  constructor(rooms: RoomData[], onSelectRoom: (roomId: string) => void) {
    this.rooms = rooms;
    this.onSelectRoomCallback = onSelectRoom;

    this.container = document.createElement('div');
    this.container.id = 'minimap-navigation';
    this.container.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 120;
      font-family: 'Be Vietnam Pro', system-ui, sans-serif;
      pointer-events: auto;
    `;
    document.body.appendChild(this.container);

    this.render();
  }

  public setCurrentRoom(roomId: string): void {
    this.currentRoomId = roomId;
    this.render();
  }

  private getCurrentRoomLabel(): string {
    if (this.currentRoomId === 'lobby') {
      return STRINGS_VI.navLobby;
    }
    const found = this.rooms.find((r) => r.id === this.currentRoomId);
    return found ? found.name : this.currentRoomId;
  }

  private render(): void {
    const currentName = this.getCurrentRoomLabel();

    this.container.innerHTML = `
      <style>
        .minimap-toggle-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(15, 20, 30, 0.85);
          border: 1px solid rgba(212, 163, 89, 0.4);
          color: #f1f5f9;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
          transition: all 0.2s ease;
        }

        .minimap-toggle-btn:hover {
          border-color: #d4a359;
          color: #d4a359;
        }

        .minimap-dropdown {
          margin-top: 8px;
          background: rgba(15, 20, 30, 0.94);
          border: 1px solid rgba(212, 163, 89, 0.4);
          border-radius: 10px;
          padding: 10px;
          width: 250px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: ${this.isExpanded ? 'flex' : 'none'};
          flex-direction: column;
          gap: 6px;
        }

        .minimap-header-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          padding: 2px 6px 6px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          justify-content: space-between;
        }

        .minimap-item-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          text-align: left;
          background: transparent;
          border: 1px solid transparent;
          color: #cbd5e1;
          font-family: inherit;
          font-size: 13.5px;
          padding: 7px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .minimap-item-btn:hover {
          background: rgba(212, 163, 89, 0.15);
          color: #f1f5f9;
        }

        .minimap-item-btn.active {
          background: rgba(212, 163, 89, 0.25);
          border-color: rgba(212, 163, 89, 0.6);
          color: #fef0cd;
          font-weight: 700;
        }

        .minimap-item-btn:focus-visible {
          outline: 2px solid #d4a359;
        }
      </style>

      <button type="button" class="minimap-toggle-btn" id="btn-toggle-minimap" aria-expanded="${this.isExpanded}">
        <span>🗺️</span>
        <span style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${currentName}</span>
        <span style="font-size: 11px; opacity: 0.7;">${this.isExpanded ? '▲' : '▼'}</span>
      </button>

      <div class="minimap-dropdown" id="minimap-dropdown">
        <div class="minimap-header-title">
          <span>${STRINGS_VI.minimapTitle}</span>
          <span style="color: #d4a359;">Đến nhanh</span>
        </div>

        <button type="button" class="minimap-item-btn ${this.currentRoomId === 'lobby' ? 'active' : ''}" data-room-id="lobby">
          <span>${STRINGS_VI.navLobby}</span>
          ${this.currentRoomId === 'lobby' ? '<span style="font-size: 11px; color: #d4a359;">●</span>' : ''}
        </button>

        ${this.rooms
          .map(
            (r) => `
          <button type="button" class="minimap-item-btn ${this.currentRoomId === r.id ? 'active' : ''}" data-room-id="${r.id}">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.name}</span>
            ${this.currentRoomId === r.id ? '<span style="font-size: 11px; color: #d4a359;">●</span>' : ''}
          </button>
        `
          )
          .join('')}
      </div>
    `;

    this.container.querySelector('#btn-toggle-minimap')?.addEventListener('click', () => {
      this.isExpanded = !this.isExpanded;
      this.render();
    });

    this.container.querySelectorAll('.minimap-item-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const roomId = target.getAttribute('data-room-id');
        if (roomId && roomId !== this.currentRoomId) {
          this.isExpanded = false;
          this.onSelectRoomCallback(roomId);
        }
      });
    });
  }
}
