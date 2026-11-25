import { useEffect, useRef, useState } from 'react';
import { ARTWORK_SHEET_URL, PRINTS } from '../data/prints';
import { getDomCropStyle } from '../utils/galleryMath';

interface CropImageProps {
  printIndex: number;
  className?: string;
  alt?: string;
}

function SheetCrop({
  printIndex,
  className,
  label,
}: {
  printIndex: number;
  className: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 168, h: 224 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize((prev) =>
          Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5
            ? prev
            : { w: rect.width, h: rect.height },
        );
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const crop = getDomCropStyle(printIndex, size.w, size.h);

  return (
    <div
      ref={ref}
      className={className}
      role="img"
      aria-label={label}
      style={{
        backgroundImage: `url("${ARTWORK_SHEET_URL}")`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: crop.backgroundSize,
        backgroundPosition: crop.backgroundPosition,
      }}
    />
  );
}

export function CropImage({ printIndex, className = '', alt }: CropImageProps) {
  const count = PRINTS.length;
  const print = PRINTS[((printIndex % count) + count) % count];
  const label = alt ?? print.title;

  if (print.image) {
    return (
      <div className={`crop-image ${className}`} role="img" aria-label={label}>
        {print.fit === 'contain' && (
          <span
            className="crop-image-backdrop"
            style={{ backgroundImage: `url("${print.image}")` }}
            aria-hidden="true"
          />
        )}
        <img
          src={print.image}
          alt=""
          loading="lazy"
          className={`crop-image-img crop-image-${print.fit}`}
        />
      </div>
    );
  }

  return <SheetCrop printIndex={printIndex} className={className} label={label} />;
}
