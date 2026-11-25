import { useEffect, useRef, useState } from 'react';

interface RollingNumberProps {
  value: string | number;
  className?: string;
}

function numeric(text: string): number {
  const parsed = Number(text.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function RollingNumber({ value, className = '' }: RollingNumberProps) {
  const text = String(value);
  const [shown, setShown] = useState(text);
  const [previous, setPrevious] = useState<string | null>(null);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const timerRef = useRef(0);

  useEffect(() => {
    if (shown === text) return;
    setDirection(numeric(text) >= numeric(shown) ? 'up' : 'down');
    setPrevious(shown);
    setShown(text);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setPrevious(null), 320);
  }, [shown, text]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return (
    <span className={`roll-number${direction === 'down' ? ' is-down' : ''} ${className}`}>
      {previous !== null && (
        <span className="roll-number-out" key={`out-${previous}`} aria-hidden="true">
          {previous}
        </span>
      )}
      <span className="roll-number-in" key={`in-${text}`}>
        {text}
      </span>
    </span>
  );
}
