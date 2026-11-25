import { useEffect, useRef, useState } from 'react';
import { FLAVORS } from '../data/flavors';
import { computeSpriteCrop } from '../utils/strideMath';

export interface CardTiltState {
  tiltX: number;
  tiltY: number;
}

interface ShopSectionProps {
  sectionRef: React.RefObject<HTMLElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  activeFlavorIdx: number;
  livePkRef: React.MutableRefObject<HTMLDivElement | null>;
  liveTiltRef: React.MutableRefObject<CardTiltState>;
  reducedMotion: boolean;
  onSelectFlavorCard: (idx: number) => void;
  onPokeLiveBar: () => void;
  onAddBag: (flavorIdx: number, sourceEl: HTMLElement) => void;
}

const WRAPPER_CROPS = FLAVORS.map((f) => computeSpriteCrop(f.box, 4));

export function ShopSection({
  sectionRef,
  gridRef,
  activeFlavorIdx,
  livePkRef,
  liveTiltRef,
  reducedMotion,
  onSelectFlavorCard,
  onPokeLiveBar,
  onAddBag,
}: ShopSectionProps) {
  const [revealed, setRevealed] = useState(false);
  const pkRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    livePkRef.current = pkRefs.current[activeFlavorIdx] ?? null;
  }, [activeFlavorIdx, livePkRef]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (reducedMotion) {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.18) {
            setRevealed(true);
            io.disconnect();
          }
        }
      },
      { threshold: [0.18] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sectionRef, reducedMotion]);

  const handlePointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    idx: number
  ) => {
    if (e.pointerType !== 'mouse') return;
    const card = cardRefs.current[idx];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.classList.add('tilting');
    card.style.transform = `translateY(-8px) rotateX(${(-y * 12).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`;
    if (idx === activeFlavorIdx) {
      liveTiltRef.current.tiltX = x;
      liveTiltRef.current.tiltY = y;
    }
  };

  const handlePointerLeave = (idx: number) => {
    const card = cardRefs.current[idx];
    if (card) {
      card.classList.remove('tilting');
      card.style.transform = '';
    }
    if (idx === activeFlavorIdx) {
      liveTiltRef.current.tiltX = 0;
      liveTiltRef.current.tiltY = 0;
    }
  };

  const handlePointerDownCard = (idx: number) => {
    const card = cardRefs.current[idx];
    if (!card) return;
    card.style.transform = 'scale(0.97)';
  };

  const handlePointerUpCard = (idx: number) => {
    const card = cardRefs.current[idx];
    if (!card) return;
    if (card.classList.contains('tilting')) return;
    card.style.transform = '';
  };

  const handlePoke = (idx: number) => {
    if (idx === activeFlavorIdx) {
      onPokeLiveBar();
      return;
    }
    onSelectFlavorCard(idx);
    const pk = pkRefs.current[idx];
    if (!pk || reducedMotion) return;
    pk.animate(
      [
        { transform: 'translateX(-50%) translateZ(30px) scale(1, 1)', offset: 0 },
        { transform: 'translateX(-50%) translateZ(30px) scale(1.06, 0.93)', offset: 0.3 },
        { transform: 'translateX(-50%) translateZ(30px) scale(0.97, 1.04)', offset: 0.6 },
        { transform: 'translateX(-50%) translateZ(30px) scale(1, 1)', offset: 1 },
      ],
      { duration: 500, easing: 'ease-out' }
    );
  };

  return (
    <section id="shop" ref={sectionRef}>
      <h2 className={`shop-head disp ${revealed ? 'revealed' : ''}`}>
        <span className="reveal-line-mask">
          <span className="reveal-line-inner">GRAB</span>
        </span>
        <span className="reveal-line-mask">
          <span className="reveal-line-inner">A BAG</span>
        </span>
      </h2>

      <p className={`shop-cap ${revealed ? 'revealed' : ''}`}>
        Five best sellers. Each
        <br />
        blended with care. Pick your
        <br />
        favourite (or try them all).
      </p>

      <div className="shop-grid" ref={gridRef}>
        {FLAVORS.map((f, idx) => {
          const isLive = idx === activeFlavorIdx;
          const crop = WRAPPER_CROPS[idx];
          return (
            <div
              key={f.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              className={`card ${isLive ? 'live' : ''} ${revealed ? 'revealed' : ''}`}
              style={{
                backgroundColor: f.color,
                transitionDelay: revealed ? `${idx * 80}ms` : '0ms',
              }}
              data-flavor-card={f.id}
              onPointerMove={(e) => handlePointerMove(e, idx)}
              onPointerLeave={() => handlePointerLeave(idx)}
              onPointerDown={() => handlePointerDownCard(idx)}
              onPointerUp={() => handlePointerUpCard(idx)}
              onClick={() => handlePoke(idx)}
            >
              <div className="card-name disp">
                {f.cardLines[0]}
                <br />
                {f.cardLines[1]}
              </div>

              <div
                ref={(el) => {
                  pkRefs.current[idx] = el;
                  if (isLive) {
                    livePkRef.current = el;
                  }
                }}
                className="pk spr"
                style={{
                  backgroundSize: crop.backgroundSize,
                  backgroundPosition: crop.backgroundPosition,
                }}
              />

              <button
                type="button"
                className="card-add"
                aria-label={`Add a bag of ${f.name} to the cart`}
                onClick={(e) => {
                  e.stopPropagation();
                  const pk = pkRefs.current[idx];
                  if (pk) onAddBag(idx, pk);
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
