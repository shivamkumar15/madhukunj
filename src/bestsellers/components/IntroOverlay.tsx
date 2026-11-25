import { useEffect, useRef, useState } from 'react';
import { MadhukunjMark } from './MadhukunjMark';

interface IntroOverlayProps {
  reducedMotion: boolean;
  onEnterHero: () => void;
}

export function IntroOverlay({ reducedMotion, onEnterHero }: IntroOverlayProps) {
  const [phase, setPhase] = useState<'stamp' | 'done'>(() =>
    reducedMotion ? 'done' : 'stamp'
  );
  const enteredRef = useRef(false);

  useEffect(() => {
    if (phase === 'done') {
      if (!enteredRef.current) {
        enteredRef.current = true;
        document.body.classList.remove('locked');
        onEnterHero();
      }
      return;
    }
    document.body.classList.add('locked');
    const timer = window.setTimeout(() => setPhase('done'), 900);
    return () => window.clearTimeout(timer);
  }, [phase, onEnterHero]);

  if (phase === 'done') {
    return (
      <div id="intro" className="cream done" aria-hidden="true">
        <div className="logo-stamp">
          <MadhukunjMark className="logo-stamp-mark" />
          <span className="logo-stamp-text">MADHUKUNJ</span>
        </div>
      </div>
    );
  }

  return (
    <div id="intro" className="cream" aria-label="Madhukunj introduction">
      <button
        type="button"
        className="skip-pill"
        onClick={() => setPhase('done')}
      >
        Skip intro
      </button>
      <div className="logo-stamp pop">
        <MadhukunjMark className="logo-stamp-mark" />
        <span className="logo-stamp-text">MADHUKUNJ</span>
      </div>
    </div>
  );
}
