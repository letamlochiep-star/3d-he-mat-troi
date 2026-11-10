import { strings } from './strings.vi';
import { VoiceInputService } from '../assistant/VoiceInputService';

export interface ChatDrawerOptions {
  guideName?: string;
  onOpenStateChange?: (isOpen: boolean) => void;
  onGuideSpeak?: (text: string) => void;
  onGetContext?: () => { roomId?: string; exhibitId?: string };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatDrawer {
  private container: HTMLDivElement;
  private backdrop: HTMLDivElement;
  private drawer: HTMLDivElement;
  private messagesContainer: HTMLDivElement;
  private suggestionsContainer: HTMLDivElement;
  private inputElem: HTMLTextAreaElement;
  private sendBtn: HTMLButtonElement;
  private micBtn: HTMLButtonElement | null = null;
  private charCountElem: HTMLSpanElement;

  private isOpen: boolean = false;
  private isGenerating: boolean = false;
  private history: ChatMessage[] = [];
  private currentSuggestedQuestions: string[] = [];

  private voiceService: VoiceInputService | null = null;
  private options: ChatDrawerOptions;

  constructor(options: ChatDrawerOptions = {}) {
    this.options = options;
    const guideName = options.guideName || 'Anh Minh';

    // Tạo backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'chat-backdrop';
    this.backdrop.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1200;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
    `;

    // Tạo Drawer panel
    this.drawer = document.createElement('div');
    this.drawer.id = 'chat-drawer';
    this.drawer.setAttribute('role', 'dialog');
    this.drawer.setAttribute('aria-label', strings.chatDrawerTitle);
    this.drawer.style.cssText = `
      position: fixed;
      top: 0; right: 0;
      width: min(440px, 100vw);
      height: 100%;
      background: rgba(13, 17, 23, 0.98);
      border-left: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: -10px 0 30px rgba(0, 0, 0, 0.7);
      z-index: 1201;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.15s ease-out;
      color: #f0f6fc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      box-sizing: border-box;
    `;

    // Header của Drawer
    const header = document.createElement('header');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(22, 27, 34, 0.9);
    `;

    const titleBox = document.createElement('div');
    titleBox.style.cssText = `display: flex; align-items: center; gap: 12px;`;

    const avatar = document.createElement('div');
    avatar.style.cssText = `
      width: 40px; height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1f6feb 0%, #388bfd 100%);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      box-shadow: 0 0 10px rgba(56, 139, 253, 0.4);
      flex-shrink: 0;
    `;
    avatar.innerText = '👨‍🚀';

    const titleText = document.createElement('div');
    titleText.innerHTML = `
      <div style="font-size: 17px; font-weight: 600; color: #ffffff;">${guideName}</div>
      <div style="font-size: 13px; color: #8b949e;">${strings.guideRole} ảo • Hệ Mặt Trời</div>
    `;

    titleBox.appendChild(avatar);
    titleBox.appendChild(titleText);

    const closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', strings.btnClose);
    closeBtn.style.cssText = `
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #8b949e;
      font-size: 18px;
      width: 36px; height: 36px;
      border-radius: 8px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease;
    `;
    closeBtn.innerHTML = '✕';
    closeBtn.onmouseenter = () => { closeBtn.style.color = '#fff'; closeBtn.style.background = 'rgba(255,255,255,0.1)'; };
    closeBtn.onmouseleave = () => { closeBtn.style.color = '#8b949e'; closeBtn.style.background = 'transparent'; };
    closeBtn.onclick = () => this.close();

    header.appendChild(titleBox);
    header.appendChild(closeBtn);
    this.drawer.appendChild(header);

    // Phần gợi ý câu hỏi
    this.suggestionsContainer = document.createElement('div');
    this.suggestionsContainer.style.cssText = `
      padding: 12px 16px;
      background: rgba(30, 41, 59, 0.5);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    this.drawer.appendChild(this.suggestionsContainer);

    // Vùng chứa tin nhắn
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      scroll-behavior: smooth;
    `;
    this.drawer.appendChild(this.messagesContainer);

    // Vùng nhập liệu
    const inputArea = document.createElement('div');
    inputArea.style.cssText = `
      padding: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(22, 27, 34, 0.95);
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;

    const inputRow = document.createElement('div');
    inputRow.style.cssText = `display: flex; gap: 8px; align-items: flex-end;`;

    this.inputElem = document.createElement('textarea');
    this.inputElem.rows = 2;
    this.inputElem.maxLength = 300;
    this.inputElem.placeholder = strings.chatInputPlaceholder;
    this.inputElem.style.cssText = `
      flex: 1;
      background: rgba(13, 17, 23, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 10px 12px;
      color: #f0f6fc;
      font-size: 15px;
      line-height: 1.4;
      resize: none;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    `;
    this.inputElem.onfocus = () => { this.inputElem.style.borderColor = '#58a6ff'; };
    this.inputElem.onblur = () => { this.inputElem.style.borderColor = 'rgba(255, 255, 255, 0.2)'; };
    this.inputElem.oninput = () => {
      this.updateCharCount();
    };
    this.inputElem.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    };

    // Nút Micro tiếng Việt nếu trình duyệt hỗ trợ
    if (VoiceInputService.isSupported()) {
      this.micBtn = document.createElement('button');
      this.micBtn.title = strings.btnVoiceStart;
      this.micBtn.setAttribute('aria-label', strings.btnVoiceStart);
      this.micBtn.style.cssText = `
        width: 44px; height: 44px;
        background: rgba(33, 38, 45, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: #f0f6fc;
        font-size: 18px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
      `;
      this.micBtn.innerHTML = '🎤';
      this.micBtn.onclick = () => this.toggleVoiceInput();
      inputRow.appendChild(this.micBtn);

      this.initVoiceService();
    }

    // Nút Gửi
    this.sendBtn = document.createElement('button');
    this.sendBtn.innerText = strings.btnSend;
    this.sendBtn.setAttribute('aria-label', strings.btnSend);
    this.sendBtn.style.cssText = `
      height: 44px;
      padding: 0 18px;
      background: #238636;
      border: 1px solid rgba(240, 246, 252, 0.1);
      border-radius: 8px;
      color: #ffffff;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s ease;
      flex-shrink: 0;
    `;
    this.sendBtn.onmouseenter = () => { this.sendBtn.style.background = '#2ea043'; };
    this.sendBtn.onmouseleave = () => { this.sendBtn.style.background = '#238636'; };
    this.sendBtn.onclick = () => this.sendMessage();
    inputRow.appendChild(this.sendBtn);

    inputArea.appendChild(inputRow);

    // Footer info và đếm ký tự
    const footerInfo = document.createElement('div');
    footerInfo.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #8b949e;
      padding: 0 2px;
    `;

    const tip = document.createElement('span');
    tip.innerText = 'Nhấn Enter để gửi • Shift+Enter xuống dòng';

    this.charCountElem = document.createElement('span');
    this.charCountElem.innerText = `0/300`;

    footerInfo.appendChild(tip);
    footerInfo.appendChild(this.charCountElem);
    inputArea.appendChild(footerInfo);

    this.drawer.appendChild(inputArea);

    this.container = document.createElement('div');
    this.container.appendChild(this.backdrop);
    this.container.appendChild(this.drawer);
    document.body.appendChild(this.container);

    // Lắng nghe đóng mở backdrop & phím Esc
    this.backdrop.onclick = () => this.close();
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Thêm tin nhắn chào mừng ban đầu
    this.appendMessage('assistant', `Chào bạn! Mình là ${guideName}, hướng dẫn viên không gian 3D. Bạn có thắc mắc gì về các hành tinh và vũ trụ trong bảo tàng cứ hỏi mình nhé!`);
  }

  private initVoiceService(): void {
    this.voiceService = new VoiceInputService({
      onStart: () => {
        if (this.micBtn) {
          this.micBtn.style.background = '#da3633';
          this.micBtn.style.borderColor = '#f85149';
          this.micBtn.innerHTML = '🔴';
          this.micBtn.title = strings.btnVoiceStop;
        }
      },
      onResult: (text, isFinal) => {
        this.inputElem.value = text;
        this.updateCharCount();
        if (isFinal) {
          // Khi câu nói hoàn tất, tự động gửi
          setTimeout(() => {
            this.sendMessage();
          }, 400);
        }
      },
      onError: (err) => {
        console.warn('Voice input error:', err);
        this.resetMicBtn();
      },
      onEnd: () => {
        this.resetMicBtn();
      },
    });
  }

  private toggleVoiceInput(): void {
    if (!this.voiceService) return;
    if (this.voiceService.isListening()) {
      this.voiceService.stop();
      this.resetMicBtn();
    } else {
      this.voiceService.start();
    }
  }

  private resetMicBtn(): void {
    if (this.micBtn) {
      this.micBtn.style.background = 'rgba(33, 38, 45, 0.9)';
      this.micBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      this.micBtn.innerHTML = '🎤';
      this.micBtn.title = strings.btnVoiceStart;
    }
  }

  private updateCharCount(): void {
    const len = this.inputElem.value.length;
    this.charCountElem.innerText = `${len}/300`;
    if (len >= 300) {
      this.charCountElem.style.color = '#f85149';
    } else {
      this.charCountElem.style.color = '#8b949e';
    }
  }

  public setSuggestedQuestions(questions: string[]): void {
    this.currentSuggestedQuestions = questions || [];
    this.renderSuggestedQuestions();
  }

  private renderSuggestedQuestions(): void {
    this.suggestionsContainer.innerHTML = '';
    if (!this.currentSuggestedQuestions || this.currentSuggestedQuestions.length === 0) {
      this.suggestionsContainer.style.display = 'none';
      return;
    }
    this.suggestionsContainer.style.display = 'flex';

    const label = document.createElement('div');
    label.style.cssText = `
      font-size: 13px;
      font-weight: 600;
      color: #79c0ff;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    label.innerHTML = `💡 ${strings.chatSuggestedQuestions}`;
    this.suggestionsContainer.appendChild(label);

    const questionsList = document.createElement('div');
    questionsList.style.cssText = `display: flex; flex-direction: column; gap: 6px;`;

    // Lấy tối đa 3 câu gợi ý
    const topQuestions = this.currentSuggestedQuestions.slice(0, 3);
    for (const q of topQuestions) {
      const btn = document.createElement('button');
      btn.style.cssText = `
        text-align: left;
        background: rgba(56, 139, 253, 0.1);
        border: 1px solid rgba(56, 139, 253, 0.25);
        border-radius: 6px;
        padding: 8px 12px;
        color: #e6edf3;
        font-size: 13.5px;
        cursor: pointer;
        line-height: 1.35;
        transition: all 0.2s ease;
      `;
      btn.innerText = `• ${q}`;
      btn.onmouseenter = () => {
        btn.style.background = 'rgba(56, 139, 253, 0.25)';
        btn.style.borderColor = '#58a6ff';
      };
      btn.onmouseleave = () => {
        btn.style.background = 'rgba(56, 139, 253, 0.1)';
        btn.style.borderColor = 'rgba(56, 139, 253, 0.25)';
      };
      btn.onclick = () => {
        this.inputElem.value = q;
        this.updateCharCount();
        this.sendMessage();
      };
      questionsList.appendChild(btn);
    }

    this.suggestionsContainer.appendChild(questionsList);
  }

  private appendMessage(role: 'user' | 'assistant', text: string): HTMLDivElement {
    const msgBox = document.createElement('div');
    msgBox.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: ${role === 'user' ? 'flex-end' : 'flex-start'};
      gap: 4px;
      max-width: 88%;
      align-self: ${role === 'user' ? 'flex-end' : 'flex-start'};
    `;

    const senderName = document.createElement('div');
    senderName.style.cssText = `font-size: 12px; color: #8b949e; padding: 0 4px;`;
    senderName.innerText = role === 'user' ? 'Bạn' : (this.options.guideName || 'Anh Minh');

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble-text';
    bubble.style.cssText = `
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 15px;
      line-height: 1.5;
      word-break: break-word;
      ${role === 'user'
        ? 'background: #1f6feb; color: #ffffff; border-bottom-right-radius: 2px;'
        : 'background: rgba(33, 38, 45, 0.95); border: 1px solid rgba(255, 255, 255, 0.1); color: #f0f6fc; border-bottom-left-radius: 2px;'
      }
    `;
    bubble.innerText = text;

    msgBox.appendChild(senderName);
    msgBox.appendChild(bubble);
    this.messagesContainer.appendChild(msgBox);

    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    return bubble;
  }

  public async sendMessage(): Promise<void> {
    const text = this.inputElem.value.trim();
    if (!text || this.isGenerating) return;

    this.inputElem.value = '';
    this.updateCharCount();

    // Dừng micro nếu đang nghe
    if (this.voiceService?.isListening()) {
      this.voiceService.stop();
      this.resetMicBtn();
    }

    // Đưa tin nhắn của người dùng vào giao diện và history
    this.appendMessage('user', text);
    this.history.push({ role: 'user', content: text });

    // Trạng thái đang sinh phản hồi
    this.isGenerating = true;
    this.sendBtn.disabled = true;
    this.sendBtn.style.opacity = '0.5';

    // Tạo bubble phản hồi của trợ lý
    const responseBubble = this.appendMessage('assistant', strings.chatThinking);
    responseBubble.style.fontStyle = 'italic';
    responseBubble.style.color = '#8b949e';

    // Lấy context hiện tại (phòng & hiện vật)
    const context = this.options.onGetContext ? this.options.onGetContext() : {};

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          roomId: context.roomId,
          exhibitId: context.exhibitId,
          history: this.history.slice(-6),
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          responseBubble.innerText = strings.chatRateLimitExceeded;
        } else {
          responseBubble.innerText = strings.chatErrorFallback;
        }
        responseBubble.style.fontStyle = 'normal';
        responseBubble.style.color = '#f85149';
        this.finishGenerating(responseBubble.innerText);
        return;
      }

      if (!response.body) {
        throw new Error('Body rỗng');
      }

      // Xóa chữ "Anh Minh đang suy nghĩ..." để stream câu trả lời vào
      responseBubble.innerText = '';
      responseBubble.style.fontStyle = 'normal';
      responseBubble.style.color = '#f0f6fc';

      let accumulatedText = '';
      const reader = response.body.getReader();
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
            const dataStr = trimmed.substring(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                accumulatedText += data.text;
                responseBubble.innerText = accumulatedText;
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
              }
            } catch {
              // Bỏ qua JSON parse lỗi từ chunk
            }
          }
        }
      }

      if (!accumulatedText.trim()) {
        accumulatedText = strings.chatErrorFallback;
        responseBubble.innerText = accumulatedText;
      }

      this.finishGenerating(accumulatedText);
    } catch (err) {
      console.error('Chat request error:', err);
      responseBubble.innerText = strings.chatErrorFallback;
      responseBubble.style.fontStyle = 'normal';
      responseBubble.style.color = '#f85149';
      this.finishGenerating(strings.chatErrorFallback);
    }
  }

  private finishGenerating(fullText: string): void {
    this.isGenerating = false;
    this.sendBtn.disabled = false;
    this.sendBtn.style.opacity = '1';

    this.history.push({ role: 'assistant', content: fullText });

    // Gọi Anh Minh nói câu trả lời và chuyển animation 'talk'
    if (this.options.onGuideSpeak && fullText) {
      this.options.onGuideSpeak(fullText);
    }
  }

  public open(immediate = false): void {
    this.isOpen = true;
    this.backdrop.style.opacity = '1';
    this.backdrop.style.pointerEvents = 'auto';
    if (immediate) {
      this.drawer.style.transition = 'none';
      this.backdrop.style.transition = 'none';
    } else {
      this.drawer.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      this.backdrop.style.transition = 'opacity 0.25s ease';
    }
    this.drawer.style.transform = 'translateX(0)';

    setTimeout(() => {
      this.inputElem.focus();
    }, 300);

    if (this.options.onOpenStateChange) {
      this.options.onOpenStateChange(true);
    }
  }

  public close(): void {
    this.isOpen = false;
    this.backdrop.style.opacity = '0';
    this.backdrop.style.pointerEvents = 'none';
    this.drawer.style.transform = 'translateX(100%)';

    if (this.voiceService?.isListening()) {
      this.voiceService.stop();
      this.resetMicBtn();
    }

    if (this.options.onOpenStateChange) {
      this.options.onOpenStateChange(false);
    }
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }

  public addDemoConversation(userQuestion: string, assistantAnswer: string): void {
    this.appendMessage('user', userQuestion);
    this.appendMessage('assistant', assistantAnswer);
    this.history.push({ role: 'user', content: userQuestion });
    this.history.push({ role: 'assistant', content: assistantAnswer });
  }
}
