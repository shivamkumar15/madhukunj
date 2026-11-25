export interface FlyItemSpec {
  sourceEl: HTMLElement;
  delayMs?: number;
}

export function flySpritesToCart(
  items: FlyItemSpec[],
  basketEl: HTMLElement | null,
  reducedMotion: boolean,
  onEachLand: () => void,
  onAllDone: () => void
): void {
  if (items.length === 0) {
    onAllDone();
    return;
  }

  if (reducedMotion || !basketEl) {
    for (let i = 0; i < items.length; i++) {
      onEachLand();
    }
    onAllDone();
    return;
  }

  const basketRect = basketEl.getBoundingClientRect();
  const targetCx = basketRect.left + basketRect.width / 2;
  const targetCy = basketRect.top + basketRect.height / 2;

  let completed = 0;

  items.forEach(({ sourceEl, delayMs = 0 }) => {
    const rect = sourceEl.getBoundingClientRect();
    const cs = window.getComputedStyle(sourceEl);

    const clone = document.createElement('div');
    clone.style.position = 'fixed';
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.backgroundImage = cs.backgroundImage;
    clone.style.backgroundRepeat = 'no-repeat';
    clone.style.backgroundSize = cs.backgroundSize;
    clone.style.backgroundPosition = cs.backgroundPosition;
    clone.style.zIndex = '70';
    clone.style.pointerEvents = 'none';
    clone.style.filter = 'drop-shadow(0 10px 14px rgba(0, 0, 0, 0.25))';
    clone.style.transformOrigin = 'center center';
    document.body.appendChild(clone);

    const srcCx = rect.left + rect.width / 2;
    const srcCy = rect.top + rect.height / 2;
    const dx = targetCx - srcCx;
    const dy = targetCy - srcCy;
    const lift = Math.min(160, 0.35 * Math.abs(dy) + 60);
    const k = Math.min(0.2, 30 / Math.max(1, rect.height));

    const anim = clone.animate(
      [
        {
          transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)',
          opacity: 1,
          offset: 0,
        },
        {
          transform: `translate3d(${0.4 * dx}px, ${0.4 * dy - lift}px, 0) scale(${0.45 + k}) rotate(-10deg)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate3d(${dx}px, ${dy}px, 0) scale(${k}) rotate(-18deg)`,
          opacity: 0.15,
          offset: 1,
        },
      ],
      {
        duration: 900,
        delay: delayMs,
        easing: 'cubic-bezier(0.5, 0, 0.2, 1)',
        fill: 'forwards',
      }
    );

    const finish = () => {
      clone.remove();
      onEachLand();
      completed++;
      if (completed === items.length) {
        onAllDone();
      }
    };

    anim.onfinish = finish;
    anim.oncancel = finish;
  });
}
