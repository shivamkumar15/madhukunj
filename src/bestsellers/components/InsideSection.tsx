import { useEffect, useMemo, useRef } from 'react';
import { BITS, FLAVORS, INSIDE_STEPS } from '../data/flavors';
import { computeSpriteCrop, createStormPieces } from '../utils/strideMath';

interface InsideSectionProps {
  sectionRef: React.RefObject<HTMLElement | null>;
  inBarRef: React.RefObject<HTMLDivElement | null>;
  inDarkRef: React.RefObject<HTMLDivElement | null>;
  inFrontRef: React.RefObject<HTMLDivElement | null>;
  frontFrameRef: React.RefObject<HTMLDivElement | null>;
  backFrameRef: React.RefObject<HTMLDivElement | null>;
  numRef: React.RefObject<HTMLDivElement | null>;
  stormPieceRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  displayStep: number;
  displayFlavorIdx: number;
  textSwapKey: number;
  reducedMotion: boolean;
  onSelectStep: (stepIdx: number) => void;
}

const BIT_CROPS = BITS.map((box) => computeSpriteCrop(box, 0));

function StepIcon({ idx }: { idx: number }) {
  switch (idx) {
    case 0: // Leaf
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 5c-7 0-12 3.5-13 11 4.5 1 9.5-.5 12-5 1-1.8 1-4 1-6Z" />
          <path d="M5 19c1.5-3 4.5-6 9-8.5" />
        </svg>
      );
    case 1: // Four grains
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <ellipse cx="8" cy="8" rx="2.6" ry="4.2" transform="rotate(-25 8 8)" />
          <ellipse cx="16" cy="8" rx="2.6" ry="4.2" transform="rotate(25 16 8)" />
          <ellipse cx="8" cy="16" rx="2.6" ry="4.2" transform="rotate(25 8 16)" />
          <ellipse cx="16" cy="16" rx="2.6" ry="4.2" transform="rotate(-25 16 16)" />
        </svg>
      );
    case 2: // Heart
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20.5s-7-4.6-9-9.1C1.3 7.6 4 4.5 7.4 4.5c2 0 3.7 1.1 4.6 2.7.9-1.6 2.6-2.7 4.6-2.7 3.4 0 6.1 3.1 4.4 6.9-2 4.5-9 9.1-9 9.1Z" />
        </svg>
      );
    default: // Bolt
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M13.5 2.5L5.5 13h6l-1 8.5L18.5 11h-6l1-8.5Z" />
        </svg>
      );
  }
}

export function InsideSection({
  sectionRef,
  inBarRef,
  inDarkRef,
  inFrontRef,
  frontFrameRef,
  backFrameRef,
  numRef,
  stormPieceRefs,
  displayStep,
  displayFlavorIdx,
  textSwapKey,
  reducedMotion,
  onSelectStep,
}: InsideSectionProps) {
  const headRef = useRef<HTMLHeadingElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const firstMount = useRef(true);
  const stormPieces = useMemo(() => createStormPieces(20), []);

  const stepSpec = INSIDE_STEPS[displayStep] ?? INSIDE_STEPS[0];
  const flavor = FLAVORS[displayFlavorIdx] ?? FLAVORS[1];
  const headLines =
    stepSpec.headLines ?? flavor.name.toUpperCase().split(' ');
  const isCompact =
    stepSpec.headLines === null &&
    headLines.some((w) => w.length > 9);

  // Soft crossfade in when step text swaps
  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    if (reducedMotion) return;
    const targets = [headRef.current, numRef.current, capRef.current];
    targets.forEach((el) => {
      if (!el) return;
      el.getAnimations().forEach((a) => a.cancel());
      el.animate(
        [
          { translate: '0 14px', opacity: 0 },
          { translate: '0 0', opacity: 1 },
        ],
        {
          duration: 460,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'backwards',
        }
      );
    });
  }, [textSwapKey, reducedMotion, numRef]);

  return (
    <>
      <section id="inside" ref={sectionRef} data-step={displayStep + 1}>
        <div className="pin">
          <div className="in-dark" ref={inDarkRef} aria-hidden="true" />
          <div className="in-frame" ref={backFrameRef}>
            <div className="in-num disp" ref={numRef} aria-hidden="true">
              {stepSpec.num}
            </div>
            <div id="inBar" ref={inBarRef} aria-hidden="true" />
          </div>
        </div>
      </section>

      <div id="inFront" ref={inFrontRef}>
        <div className="in-frame" ref={frontFrameRef}>
          <h2
            ref={headRef}
            className={`in-head disp ${isCompact ? 'compact' : ''}`}
          >
            {headLines.map((ln, idx) => (
              <span key={idx} className="block">
                {ln}
              </span>
            ))}
          </h2>

          <div className="in-icons" role="tablist" aria-label=" steps">
            {INSIDE_STEPS.map((st, idx) => (
              <button
                key={st.num}
                type="button"
                role="tab"
                aria-selected={displayStep === idx}
                aria-label={`Step ${st.num}`}
                className={`in-icon-btn ${displayStep === idx ? 'active' : ''}`}
                onClick={() => onSelectStep(idx)}
              >
                <StepIcon idx={idx} />
              </button>
            ))}
          </div>

          <div className="in-cap" ref={capRef}>
            {stepSpec.captionLines.map((ln, idx) => (
              <div key={idx}>{ln}</div>
            ))}
          </div>
        </div>

        <div className="storm-layer" aria-hidden="true">
          {stormPieces.map((_, i) => (
            <div
              key={i}
              ref={(el) => {
                stormPieceRefs.current[i] = el;
              }}
              className="storm-piece spr"
              style={{
                backgroundSize: BIT_CROPS[0].backgroundSize,
                backgroundPosition: BIT_CROPS[0].backgroundPosition,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
