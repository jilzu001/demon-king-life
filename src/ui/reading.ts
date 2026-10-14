export type ReadingStep = { element: HTMLElement; stage: 'chronicle' | 'scene' };

// 읽기 진행은 화면에서만 유지한다. 저장 원장·판정·난수에는 관여하지 않는다.
export class ReadingSequence {
  private key = '';
  private shown = 0;
  private complete = false;
  private fast = false;
  private userPaused = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private cleanup = () => {};

  detach() {
    clearTimeout(this.timer); this.timer = undefined;
    this.cleanup(); this.cleanup = () => {};
  }

  bind(options: {
    key: string; steps: ReadingStep[]; surface: HTMLElement; controls: HTMLElement;
    status: HTMLElement; faster: HTMLButtonElement; skip: HTMLButtonElement;
    pause?: HTMLButtonElement; keepControls?: boolean; choiceButtons?: HTMLButtonElement[];
    gates: HTMLElement[]; paused: boolean; canChoose: () => boolean;
    onReveal: (step: ReadingStep, firstOfStage: boolean) => void;
    onSkip: () => void;
    onComplete?: () => void; onStage?: (stage: 'chronicle' | 'scene', step?: ReadingStep) => void;
  }) {
    this.detach();
    if (this.key !== options.key) {
      this.key = options.key; this.shown = 0; this.complete = false; this.fast = false; this.userPaused = false;
    }
    const { steps, gates, controls, status, faster, skip, surface } = options;
    const update = () => {
      steps.forEach((step, i) => { step.element.hidden = !this.complete && i >= this.shown; });
      gates.forEach(gate => { gate.hidden = !this.complete; });
      surface.dataset.reading = String(!this.complete);
      controls.hidden = this.complete && !options.keepControls;
      faster.disabled = this.fast || this.complete;
      skip.disabled = this.complete;
      if (options.pause) { options.pause.disabled = this.complete; options.pause.textContent = this.userPaused ? '재생' : '일시정지'; options.pause.setAttribute('aria-pressed', String(this.userPaused)); }
      status.textContent = this.complete ? '선택을 기다립니다.' : this.userPaused ? '잠시 멈췄습니다.' : this.fast ? '빠르게 표시 중 · 내용을 누르면 한 줄씩 진행' : '내용을 누르면 다음 한 줄 · 스킵하면 바로 선택';
      const active = steps[Math.max(0, this.shown - 1)];
      options.onStage?.(active?.stage ?? 'chronicle', active);
      (options.choiceButtons ?? [...surface.querySelectorAll<HTMLButtonElement>('[data-choice]')]).forEach(b => {
        b.disabled = !this.complete || !options.canChoose() || b.dataset.enabled === 'false';
      });
    };
    const schedule = () => {
      if (this.complete || options.paused || this.userPaused || !this.fast) return;
      // 자동 진행은 사용자가 빠르게 버튼을 눌렀을 때만 사용한다.
      this.timer = setTimeout(advance, 160);
    };
    const advance = () => {
      if (this.shown >= steps.length) { this.complete = true; update(); options.onComplete?.(); return; }
      const step = steps[this.shown]!;
      const firstOfStage = this.shown === 0 || steps[this.shown - 1]!.stage !== step.stage;
      this.shown++; this.complete = this.shown >= steps.length; update();
      step.element.classList.add('reading-arrival');
      options.onReveal(step, firstOfStage);
      if (this.complete) options.onComplete?.();
      schedule();
    };
    const accelerate = () => {
      if (this.complete || options.paused || this.fast) return;
      this.fast = true; clearTimeout(this.timer); update(); schedule();
    };
    const skipAll = () => {
      if (this.complete || options.paused) return;
      clearTimeout(this.timer); this.shown = steps.length; this.complete = true; update(); options.onSkip(); options.onComplete?.();
    };
    const pause = () => {
      if (this.complete || options.paused) return;
      this.userPaused = !this.userPaused; clearTimeout(this.timer); update(); schedule();
    };
    const click = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target.closest('button, a, input, summary, select, textarea, [role="button"], dialog, .past-chat') || this.complete || options.paused || this.userPaused) return;
      // 클릭 한 번에 한 단계만 공개하고 자동 진행을 해제한다.
      clearTimeout(this.timer); this.fast = false; advance();
    };
    surface.addEventListener('click', click); faster.addEventListener('click', accelerate); skip.addEventListener('click', skipAll);
    options.pause?.addEventListener('click', pause);
    this.cleanup = () => {
      surface.removeEventListener('click', click); faster.removeEventListener('click', accelerate); skip.removeEventListener('click', skipAll);
      options.pause?.removeEventListener('click', pause);
    };
    update();
    if (this.complete && !options.paused) options.onComplete?.();
    if (!this.complete && !options.paused) {
      if (this.shown === 0) advance(); else schedule();
    }
  }
}
