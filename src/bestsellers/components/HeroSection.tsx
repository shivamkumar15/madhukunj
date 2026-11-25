import { useEffect, useRef, useState } from 'react';
import { BITS, FLAVORS, HERO_BITS } from '../data/flavors';
import { computeSpriteCrop } from '../utils/strideMath';

interface HeroSectionProps {
  entered: boolean;
  activeIdx: number;
  titleDisplayIdx: number;
  titleSwapKey: number;
  titleDir: 1 | -1;
  countDisplayIdx: number;
  countSwapKey: number;
  autoplay: boolean;
  reducedMotion: boolean;
  onToggleAutoplay: () => void;
  onNext: () => void;
  arcRef: React.RefObject<HTMLDivElement | null>;
  revealRef: React.RefObject<HTMLDivElement | null>;
  sectionRef: React.RefObject<HTMLElement | null>;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
}

const BIT_CROPS = BITS.map((box) => computeSpriteCrop(box, 0));

function measureTitleFontSize(name: string): string {
  if (typeof window === 'undefined') return '96px';
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const upper = name.toUpperCase();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'calc(96 * var(--u))';
  ctx.font = '400 100px "Archivo Black", sans-serif';

  if (vw < 820) {
    const isLandscapePhone =
      vw <= 920 && vh <= 500 && vw > vh;
    const words = upper.split(' ');
    let maxWordW = 1;
    for (const word of words) {
      maxWordW = Math.max(maxWordW, ctx.measureText(word).width);
    }
    const maxW = vw - 36;
    const fitPx = (maxW * 100) / maxWordW;
    const basePx = isLandscapePhone
      ? 36
      : Math.max(40, Math.min(vw * 0.125, 64));
    return `${Math.min(basePx, fitPx).toFixed(1)}px`;
  }

  const u = Math.min(vw / 1440, vh / 900);
  const fullW = Math.max(1, ctx.measureText(upper).width);
  const desktopSize = Math.min(96 * u, (760 * u * 100) / fullW);
  return `${desktopSize.toFixed(1)}px`;
}

export function HeroSection({
  entered,
  activeIdx,
  titleDisplayIdx,
  titleSwapKey,
  titleDir,
  countDisplayIdx,
  countSwapKey,
  autoplay,
  reducedMotion,
  onToggleAutoplay,
  onNext,
  arcRef,
  revealRef,
  sectionRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: HeroSectionProps) {
  const [titleFontSize, setTitleFontSize] = useState<string>('calc(96 * var(--u))');
  const [isPhone, setIsPhone] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 820 : false
  );
  const bitRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const countInnerRef = useRef<HTMLSpanElement>(null);
  const firstTitleMount = useRef(true);
  const firstCountMount = useRef(true);

  const displayFlavor = FLAVORS[titleDisplayIdx] ?? FLAVORS[1];
  const activeFlavor = FLAVORS[activeIdx] ?? FLAVORS[1];

  // Update title font size on swap, resize, and font load
  useEffect(() => {
    const updateSize = () => {
      setIsPhone(window.innerWidth < 820);
      setTitleFontSize(measureTitleFontSize(displayFlavor.name));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    document.fonts?.load('400 100px "Archivo Black"').then(updateSize).catch(() => {});
    return () => window.removeEventListener('resize', updateSize);
  }, [displayFlavor.name]);

  // Animate floating bits after entrance
  useEffect(() => {
    if (!entered || reducedMotion) return;
    const anims: Animation[] = [];

    bitRefs.current.forEach((el, i) => {
      if (!el) return;
      const fadeAnim = el.animate(
        [{ opacity: 0 }, { opacity: 0.6 }],
        {
          duration: 900,
          delay: 300 + 90 * i,
          easing: 'ease-out',
          fill: 'forwards',
        }
      );
      anims.push(fadeAnim);

      const dx = (i % 2 === 0 ? 1 : -1) * (12 + (i % 3));
      const dy = -(22 + 3 * i);
      const dRot = (i % 2 === 0 ? 1 : -1) * (10 + (i % 3));

      const driftAnim = el.animate(
        [
          { transform: 'translate(0px, 0px) rotate(0deg)' },
          { transform: `translate(${dx}px, ${dy}px) rotate(${dRot}deg)` },
          { transform: 'translate(0px, 0px) rotate(0deg)' },
        ],
        {
          duration: 7000 + 900 * i,
          easing: 'ease-in-out',
          iterations: Infinity,
          composite: 'add',
        }
      );
      anims.push(driftAnim);
    });

    return () => {
      anims.forEach((a) => a.cancel());
    };
  }, [entered, reducedMotion]);

  const [outgoingState, setOutgoingState] = useState<{
    idx: number;
    key: number;
    dir: 1 | -1;
  } | null>(null);
  const prevTitleIdxRef = useRef(titleDisplayIdx);
  const prevTitleKeyRef = useRef(titleSwapKey);
  const outgoingRef = useRef<HTMLSpanElement>(null);

  // Title letter-rise animation on flavour swap (outgoing + incoming overlap)
  useEffect(() => {
    if (firstTitleMount.current) {
      firstTitleMount.current = false;
      prevTitleIdxRef.current = titleDisplayIdx;
      prevTitleKeyRef.current = titleSwapKey;
      return;
    }

    const oldIdx = prevTitleIdxRef.current;
    const oldKey = prevTitleKeyRef.current;
    prevTitleIdxRef.current = titleDisplayIdx;
    prevTitleKeyRef.current = titleSwapKey;

    if (reducedMotion || !titleRef.current) return;

    setOutgoingState({ idx: oldIdx, key: oldKey, dir: titleDir });

    const chars = Array.from(
      titleRef.current.querySelectorAll<HTMLSpanElement>('.title-char-in')
    );
    const enterFrom = titleDir > 0 ? '110%' : '-110%';

    chars.forEach((el, idx) => {
      el.animate(
        [
          { transform: `translateY(${enterFrom})`, opacity: 0 },
          { transform: 'translateY(0%)', opacity: 1 },
        ],
        {
          duration: 620,
          delay: 120 + 22 * idx,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'both',
        }
      );
    });
  }, [titleSwapKey, titleDisplayIdx, titleDir, reducedMotion]);

  useEffect(() => {
    if (!outgoingState || !outgoingRef.current) return;
    const outChars = Array.from(
      outgoingRef.current.querySelectorAll<HTMLSpanElement>('.title-char-out')
    );
    const exitTo = outgoingState.dir > 0 ? '-110%' : '110%';
    let maxEnd = 300;
    outChars.forEach((el, idx) => {
      const delay = 11 * idx;
      maxEnd = Math.max(maxEnd, delay + 300);
      el.animate(
        [
          { transform: 'translateY(0%)', opacity: 1 },
          { transform: `translateY(${exitTo})`, opacity: 0 },
        ],
        {
          duration: 300,
          delay,
          easing: 'cubic-bezier(0.45, 0, 0.75, 0.3)',
          fill: 'forwards',
        }
      );
    });
    const timer = window.setTimeout(() => setOutgoingState(null), maxEnd + 40);
    return () => window.clearTimeout(timer);
  }, [outgoingState]);

  // Counter soft crossfade in
  useEffect(() => {
    if (firstCountMount.current) {
      firstCountMount.current = false;
      return;
    }
    if (reducedMotion || !countInnerRef.current) return;
    countInnerRef.current.animate(
      [
        { translate: '0 14px', opacity: 0 },
        { translate: '0 0', opacity: 1 },
      ],
      {
        duration: 380,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both',
      }
    );
  }, [countSwapKey, reducedMotion]);

  const words = displayFlavor.name.toUpperCase().split(' ');
  const outWords = outgoingState
    ? (FLAVORS[outgoingState.idx] ?? FLAVORS[1]).name.toUpperCase().split(' ')
    : null;
  const countStr = String(countDisplayIdx + 1).padStart(2, '0');

  return (
    <section
      id="flavors"
      ref={sectionRef}
      data-flavor={activeFlavor.id}
      data-flavor-index={activeIdx}
    >
      <div className="hero-reveal" ref={revealRef} aria-hidden="true" />
      <div
        className={`hero-rings ${entered ? 'entered' : ''}`}
        aria-hidden="true"
      />

      <div className="hero-bits" aria-hidden="true">
        {HERO_BITS.map((b, i) => {
          if (isPhone && b.hideOnPhone) return null;
          const box = BITS[b.bit];
          const aspect = box[3] / box[2];
          const sizeFactor = isPhone ? b.size * 1.3 : b.size;
          const crop = BIT_CROPS[b.bit];
          return (
            <div
              key={i}
              ref={(el) => {
                bitRefs.current[i] = el;
              }}
              className="hero-bit spr"
              style={{
                left: `${b.x * 100}%`,
                top: `${b.y * 100}%`,
                width: `calc(${sizeFactor} * var(--u))`,
                height: `calc(${(sizeFactor * aspect).toFixed(2)} * var(--u))`,
                transform: `translate(-50%, -50%) rotate(${b.rot}deg)`,
                backgroundSize: crop.backgroundSize,
                backgroundPosition: crop.backgroundPosition,
              }}
            />
          );
        })}
      </div>

      <div
        ref={arcRef}
        className="hero-arc"
        data-testid="hero-arc"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />

      <button
        id="play"
        type="button"
        className={entered ? 'entered' : ''}
        aria-label="Next product"
        onClick={onNext}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 12h15M13.5 6.5L19.5 12l-6 5.5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <h1
        id="title"
        ref={titleRef}
        className="disp"
        aria-live="polite"
        style={{ fontSize: titleFontSize }}
      >
        {outWords && outgoingState && (
          <span
            ref={outgoingRef}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              pointerEvents: 'none',
            }}
          >
            {outWords.map((word, wIdx) => (
              <span key={`out-${outgoingState.key}-${wIdx}`} className="title-word">
                {word.split('').map((ch, cIdx) => (
                  <span key={cIdx} className="title-char-clip">
                    <span className="title-char title-char-out">{ch}</span>
                  </span>
                ))}
              </span>
            ))}
          </span>
        )}
        {words.map((word, wIdx) => (
          <span key={`in-${titleSwapKey}-${wIdx}`} className="title-word">
            {word.split('').map((ch, cIdx) => (
              <span key={cIdx} className="title-char-clip">
                <span className="title-char title-char-in">{ch}</span>
              </span>
            ))}
          </span>
        ))}
      </h1>

      <div
        id="count"
        className={`disp ${entered ? 'entered' : ''}`}
        aria-hidden="true"
      >
        <span id="count-inner" ref={countInnerRef}>
          {countStr}
        </span>
      </div>

      <button
        id="auto"
        type="button"
        className={entered ? 'entered' : ''}
        aria-pressed={autoplay}
        aria-label={autoplay ? 'Pause autoplay' : 'Resume autoplay'}
        onClick={onToggleAutoplay}
      >
        <span className="auto-ring" aria-hidden="true">
          {autoplay ? (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
              <rect x="2.2" y="1.5" width="2.6" height="9" rx="1.2" />
              <rect x="7.2" y="1.5" width="2.6" height="9" rx="1.2" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
              <path d="M3 1.8L10 6L3 10.2V1.8Z" />
            </svg>
          )}
        </span>
        <span className="auto-label">AUTOPLAY</span>
      </button>
    </section>
  );
}
