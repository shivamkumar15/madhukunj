import { ArrowLeft, ArrowRight } from 'lucide-react';

interface GalleryHudProps {
  visible: boolean;
  isFocused: boolean;
  mode: 'gallery' | 'list' | 'page';
  introAnimate: boolean;
  pillVisible: boolean;
  pillPos: { x: number; y: number };
  onPrev: () => void;
  onNext: () => void;
  onSelectGallery: () => void;
  onSelectList: () => void;
}

export function GalleryHud({
  visible,
  isFocused,
  mode,
  introAnimate,
  pillVisible,
  pillPos,
  onPrev,
  onNext,
  onSelectGallery,
  onSelectList,
}: GalleryHudProps) {
  const maskDelay = (idx: number) =>
    introAnimate ? { animationDelay: `${250 + idx * 60}ms` } : undefined;

  return (
    <>
      <div className={`gui${visible ? '' : ' is-hidden'}${introAnimate ? ' intro-animate' : ''}`}>
        <div className="gui-arrows">
          <button
            type="button"
            className="gui-arrow-btn"
            aria-label="Previous product"
            onClick={onPrev}
          >
            <ArrowLeft className="gui-arrow-svg" strokeWidth={1.6} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="gui-arrow-btn"
            aria-label="Next product"
            onClick={onNext}
          >
            <ArrowRight className="gui-arrow-svg" strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>

        <div className="gui-hint" aria-live="polite">
          <span className="mask-line">
            <span className="mask-line-inner" style={maskDelay(0)}>
              {isFocused ? 'Click the product to open it' : 'Scroll or drag to walk round'}
            </span>
          </span>
          <span className="mask-line">
            <span className="mask-line-inner" style={maskDelay(1)}>
              {isFocused ? 'Esc or click away to step back' : 'Click a product to look closer'}
            </span>
          </span>
        </div>

        <div className="gui-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={`gui-toggle-btn${mode !== 'list' ? ' is-active' : ''}`}
            aria-pressed={mode !== 'list'}
            onClick={onSelectGallery}
          >
            GALLERY
          </button>
          <button
            type="button"
            className={`gui-toggle-btn${mode === 'list' ? ' is-active' : ''}`}
            aria-pressed={mode === 'list'}
            onClick={onSelectList}
          >
            LIST
          </button>
        </div>

        <div className="gui-caption">
          <p className="gui-kicker">
            <span className="mask-line">
              <span className="mask-line-inner" style={maskDelay(2)}>
                Welcome to corridor of
              </span>
            </span>
          </p>

          <div className="gui-headline-row">
            <h1 className="gui-headline">
              <span className="mask-line">
                <span className="mask-line-inner" style={maskDelay(3)}>
                  MADHUKUNJ
                </span>
              </span>
            </h1>

            <a
              href="#list"
              className="gui-enter-link"
              onClick={(e) => {
                e.preventDefault();
                onSelectList();
              }}
            >
              <span className="mask-line">
                <span className="mask-line-inner" style={maskDelay(4)}>
                  SHOP ALL PRODUCTS →
                </span>
              </span>
            </a>
          </div>
        </div>
      </div>

      <div
        id="pill"
        className={pillVisible ? 'is-visible' : ''}
        style={{ left: `${pillPos.x}px`, top: `${pillPos.y}px` }}
        aria-hidden="true"
      >
        OPEN PRODUCT
      </div>
    </>
  );
}
