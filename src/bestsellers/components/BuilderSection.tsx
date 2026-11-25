import { useEffect, useRef, useState } from 'react';
import { FLAVORS, PACK_SLOTS } from '../data/flavors';
import { computeSpriteCrop, hexToRgba } from '../utils/strideMath';

interface BuilderSectionProps {
  sectionRef: React.RefObject<HTMLElement | null>;
  activeFlavorIdx: number;
  reducedMotion: boolean;
  onAddPackToCart: (
    slots: (number | null)[],
    slotEls: HTMLElement[],
    onEmptied: () => void
  ) => void;
}

const WRAPPER_CROPS = FLAVORS.map((f) => computeSpriteCrop(f.box, 4));

export function BuilderSection({
  sectionRef,
  activeFlavorIdx,
  reducedMotion,
  onAddPackToCart,
}: BuilderSectionProps) {
  const [revealed, setRevealed] = useState(false);
  const [slots, setSlots] = useState<(number | null)[]>([null, null, null]);
  const [glowColor, setGlowColor] = useState<string>(
    hexToRgba(FLAVORS[3].color, 0.72) // default mint
  );
  const [glowPulseKey, setGlowPulseKey] = useState(0);
  const [addedState, setAddedState] = useState(false);

  const userTouchedRef = useRef(false);
  const autoFilledRef = useRef(false);
  const slotBarRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeFlavorRef = useRef(activeFlavorIdx);
  activeFlavorRef.current = activeFlavorIdx;

  // Reveal & initial 30% auto-fill
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const timers: number[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            setRevealed(true);
            if (!userTouchedRef.current && !autoFilledRef.current) {
              autoFilledRef.current = true;
              const base = activeFlavorRef.current;
              const seq = [base, (base + 1) % 5, (base + 2) % 5];
              const delays = reducedMotion ? [0, 0, 0] : [250, 410, 570];
              seq.forEach((flavIdx, slotIdx) => {
                const t = window.setTimeout(() => {
                  if (userTouchedRef.current) return;
                  setSlots((prev) => {
                    if (prev[slotIdx] !== null) return prev;
                    const next = [...prev];
                    next[slotIdx] = flavIdx;
                    return next;
                  });
                  setGlowColor(hexToRgba(FLAVORS[flavIdx].color, 0.72));
                  setGlowPulseKey((k) => k + 1);
                }, delays[slotIdx]);
                timers.push(t);
              });
            }
            io.disconnect();
          }
        }
      },
      { threshold: [0.3] }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [sectionRef, reducedMotion]);

  const filledCount = slots.filter((s) => s !== null).length;
  const remaining = 3 - filledCount;

  const handlePickFlavor = (flavIdx: number) => {
    userTouchedRef.current = true;
    const firstEmpty = slots.findIndex((s) => s === null);
    if (firstEmpty === -1) return;
    setSlots((prev) => {
      const next = [...prev];
      next[firstEmpty] = flavIdx;
      return next;
    });
    setGlowColor(hexToRgba(FLAVORS[flavIdx].color, 0.72));
    setGlowPulseKey((k) => k + 1);
  };

  const handleRemoveSlot = (slotIdx: number) => {
    userTouchedRef.current = true;
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setGlowPulseKey((k) => k + 1);
  };

  const handleBuy = () => {
    if (remaining > 0 || addedState) return;
    userTouchedRef.current = true;
    const snapshot = [...slots];
    const els = slotBarRefs.current.filter(
      (e): e is HTMLDivElement => e !== null
    );
    onAddPackToCart(snapshot, els, () => {
      setSlots([null, null, null]);
      setAddedState(true);
      window.setTimeout(() => {
        setAddedState(false);
      }, 1600);
    });
  };

  const counts = FLAVORS.map(
    (_, fIdx) => slots.filter((s) => s === fIdx).length
  );

  return (
    <section id="range" ref={sectionRef}>
      <div className="range-inner">
        <div className="range-left">
          <h2 className={`range-head disp ${revealed ? 'revealed' : ''}`}>
            <span className="reveal-line-mask">
              <span className="reveal-line-inner">BUILD YOUR</span>
            </span>
            <span className="reveal-line-mask">
              <span className="reveal-line-inner">
                <span className="range-three-box">3</span> PACK &amp;
              </span>
            </span>
            <span className="reveal-line-mask">
              <span className="reveal-line-inner">SAVE Rs. 60</span>
            </span>
          </h2>

          <div className="range-thumbs" role="group" aria-label="Choose fragrances for your combo">
            {FLAVORS.map((f, idx) => {
              const crop = WRAPPER_CROPS[idx];
              const count = counts[idx];
              return (
                <button
                  key={f.id}
                  type="button"
                  className="thumb-btn"
                  aria-label={`Add ${f.name} to combo`}
                  onClick={() => handlePickFlavor(idx)}
                >
                  <span
                    className="thumb-sq"
                    style={{ backgroundColor: f.color }}
                  >
                    <span
                      className="thumb-spr spr"
                      style={{
                        backgroundSize: crop.backgroundSize,
                        backgroundPosition: crop.backgroundPosition,
                      }}
                    />
                    {count > 0 && (
                      <span className="thumb-count">
                        {count === 1 ? '✓' : count}
                      </span>
                    )}
                  </span>
                  <span className="thumb-name">{f.name}</span>
                </button>
              );
            })}
          </div>

          <button
            id="buy"
            type="button"
            disabled={remaining > 0 && !addedState}
            className={addedState ? 'added' : ''}
            onClick={handleBuy}
          >
            {addedState ? (
              <span>Added to cart</span>
            ) : remaining > 0 ? (
              <span>Pick {remaining} more</span>
            ) : (
              <>
                <span>Add combo to cart</span>
                <span className="buy-price">Rs. 540</span>
              </>
            )}
          </button>
        </div>

        <div
          key={`glow-${glowPulseKey}`}
          className={`range-glow ${glowPulseKey > 0 ? 'pulse' : ''}`}
          style={{ ['--g' as string]: glowColor }}
        >
          {PACK_SLOTS.map((pos, sIdx) => {
            const flavIdx = slots[sIdx];
            const isFilled = flavIdx !== null;
            const crop = isFilled ? WRAPPER_CROPS[flavIdx] : null;
            return (
              <div
                key={sIdx}
                className="pack-slot"
                style={{ left: `${pos.leftPct}%`, top: `${pos.topPct}%` }}
              >
                {isFilled && crop && (
                  <div
                    ref={(el) => {
                      slotBarRefs.current[sIdx] = el;
                    }}
                    className="slot-bar spr"
                    data-slot-flavor={FLAVORS[flavIdx].id}
                    style={{
                      backgroundSize: crop.backgroundSize,
                      backgroundPosition: crop.backgroundPosition,
                    }}
                  />
                )}
                <button
                  type="button"
                  className={`slot-x ${isFilled ? 'filled' : ''}`}
                  aria-label={
                    isFilled
                      ? `Remove ${FLAVORS[flavIdx].name} from slot ${sIdx + 1}`
                      : `Empty pack slot ${sIdx + 1}`
                  }
                  onClick={() => {
                    if (isFilled) handleRemoveSlot(sIdx);
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
