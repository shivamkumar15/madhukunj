import { useEffect, useRef, useState } from 'react';
import { Bookmark, Box, X } from 'lucide-react';
import {
  ACCORDION_ITEMS,
  PRINTS,
  STORE_OFFERS,
  type CurrencyCode,
} from '../data/prints';
import { formatPrice } from '../utils/galleryMath';
import { CropImage } from './CropImage';

interface PrintPageProps {
  open: boolean;
  printIndex: number;
  imageVisible: boolean;
  detailsVisible: boolean;
  currency: CurrencyCode;
  isSaved: boolean;
  artworkTargetRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  onToggleSave: (printId: number) => void;
  onAddToBag: (payload: {
    printId: number;
    variant: string;
    unitPrice: number;
    quantity: number;
  }) => void;
  onSelectCollectionPrint: (printIndex: number, sourceEl: HTMLElement | null) => void;
}

export function PrintPage({
  open,
  printIndex,
  imageVisible,
  detailsVisible,
  currency,
  isSaved,
  artworkTargetRef,
  scrollContainerRef,
  onToggleSave,
  onAddToBag,
  onSelectCollectionPrint,
}: PrintPageProps) {
  const count = PRINTS.length;
  const print = PRINTS[((printIndex % count) + count) % count];

  const [variantIndex, setVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [openAcc, setOpenAcc] = useState<Record<string, boolean>>({});
  const [roomPreviewOpen, setRoomPreviewOpen] = useState(false);

  const accRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Reset selections when switching products
  useEffect(() => {
    setQuantity(1);
    setVariantIndex(0);
    setRoomPreviewOpen(false);
  }, [printIndex]);

  const variant = print.variants[variantIndex] ?? print.variants[0];
  const unitPrice = variant?.price ?? print.price;

  const collectionPrints = PRINTS.filter(
    (item) => item.productType === print.productType && item.id !== print.id,
  ).slice(0, 4);

  const relatedPrints =
    collectionPrints.length > 0
      ? collectionPrints
      : [1, 2, 3, 4].map((offset) => PRINTS[(print.id + offset) % count]);

  const detailsClass = detailsVisible ? '' : 'page-details-hidden';

  return (
    <section
      id="page"
      ref={scrollContainerRef}
      className={open ? 'is-open' : ''}
      aria-hidden={!open}
      inert={!open}
      aria-label={print.title}
    >
      <div className="page-grid">
        <div className="page-left">
          <div className="page-artwork-frame" ref={artworkTargetRef}>
            <div
              className="w-full h-full"
              style={{ opacity: imageVisible ? 1 : 0 }}
            >
              <CropImage printIndex={print.id} className="page-artwork-crop" />
            </div>
          </div>

          <div className={`page-meta-row ${detailsClass}`}>
            <span>{variant?.label ?? 'Default'}</span>

            <button
              type="button"
              className="page-meta-action"
              onClick={() => setRoomPreviewOpen(true)}
            >
              <Box className="page-meta-icon" strokeWidth={1.6} aria-hidden="true" />
              <span>Preview</span>
            </button>

            <button
              type="button"
              className="page-meta-action"
              aria-label={isSaved ? `Remove ${print.title} from saved` : `Save ${print.title}`}
              aria-pressed={isSaved}
              onClick={() => onToggleSave(print.id)}
            >
              <Bookmark
                className="page-meta-icon"
                strokeWidth={1.6}
                fill={isSaved ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <div className={`page-right ${detailsClass}`}>
          <h2 className="page-title">{print.title}</h2>
          <p className="page-artist">{print.productType}</p>
          <p className="page-desc">{print.description}</p>
          <p className="page-price">{formatPrice(unitPrice, currency, true)}</p>
          <p className="page-tax">
            All prices include taxes. Shipping calculated at checkout.
          </p>
          <ul className="offer-list" aria-label="Offers">
            {STORE_OFFERS.map((offer) => (
              <li key={offer}>{offer}</li>
            ))}
          </ul>

          <div className="page-options">
            <div>
              <div className="opt-label">
                <span>Pack Size</span>
                <span className="opt-label-value">{variant?.label ?? 'Default'}</span>
              </div>
              <div className="opt-chips" role="group" aria-label="Pack Size">
                {print.variants.map((opt, idx) => (
                  <button
                    key={opt.label}
                    type="button"
                    className={`opt-chip${variantIndex === idx ? ' is-selected' : ''}`}
                    aria-pressed={variantIndex === idx}
                    onClick={() => setVariantIndex(idx)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="buy-row">
            <div className="qty-stepper">
              <button
                type="button"
                className="qty-btn"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span aria-live="polite">{quantity}</span>
              <button
                type="button"
                className="qty-btn"
                aria-label="Increase quantity"
                disabled={quantity >= 9}
                onClick={() => setQuantity((q) => Math.min(9, q + 1))}
              >
                +
              </button>
            </div>

            <button
              type="button"
              className="add-to-bag-btn"
              onClick={() =>
                onAddToBag({
                  printId: print.id,
                  variant: variant?.label ?? 'Default',
                  unitPrice,
                  quantity,
                })
              }
            >
              ADD TO BAG
            </button>
          </div>

          <div className="accordions">
            {ACCORDION_ITEMS.map((item) => {
              const isOpen = !!openAcc[item.id];
              const contentEl = accRefs.current[item.id];
              const maxHeight = isOpen ? `${contentEl?.scrollHeight ?? 200}px` : '0px';

              return (
                <div
                  key={item.id}
                  className={`acc-row${isOpen ? ' is-open' : ''}`}
                >
                  <button
                    type="button"
                    className="acc-trigger"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenAcc((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                  >
                    <span>{item.title}</span>
                    <span className="acc-plus" aria-hidden="true">
                      +
                    </span>
                  </button>
                  <div
                    className="acc-panel"
                    ref={(el) => {
                      accRefs.current[item.id] = el;
                    }}
                    style={{ maxHeight, opacity: isOpen ? 1 : 0 }}
                  >
                    <p className="acc-body">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="spec-block">
            <h3 className="spec-heading">PRODUCT INFORMATION</h3>
            <dl className="spec-list">
              {print.specs.map((spec) => (
                <div className="spec-row" key={spec.label}>
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <div className={`collection-band ${detailsClass}`}>
        <h3 className="collection-heading">MORE FROM MADHUKUNJ</h3>
        <div className="collection-row">
          {relatedPrints.map((item) => (
            <button
              key={item.id}
              type="button"
              className="print-card"
              onClick={(e) => {
                const media = e.currentTarget.querySelector(
                  '.print-card-media',
                ) as HTMLElement | null;
                onSelectCollectionPrint(item.id, media);
              }}
            >
              <div className="print-card-media">
                <CropImage printIndex={item.id} className="w-full h-full" />
              </div>
              <p className="print-card-title">{item.title}</p>
              <p className="print-card-artist">{item.productType}</p>
              <p className="print-card-price">{formatPrice(item.price, currency)}</p>
            </button>
          ))}
        </div>
      </div>

      {roomPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(58, 53, 80, 0.35)' }}
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${print.title}`}
          onClick={() => setRoomPreviewOpen(false)}
        >
          <div
            className="w-full max-w-2xl p-6 sm:p-8 relative"
            style={{ background: '#FBF3E3', border: '1px solid var(--ink-15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p
                  className="uppercase tracking-widest"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-60)' }}
                >
                  Product Preview · {variant?.label ?? 'Default'}
                </p>
                <h3
                  className="mt-1"
                  style={{ fontFamily: 'var(--font-cond)', fontSize: '26px', fontWeight: 600 }}
                >
                  {print.title}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close preview"
                className="w-8 h-8 inline-flex items-center justify-center"
                onClick={() => setRoomPreviewOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div
              className="w-full py-12 px-8 flex flex-col items-center justify-center"
              style={{
                background: 'linear-gradient(180deg, #FBF3E3 0%, #F5EBD8 78%, #EBD7B8 78%, #DFC69F 100%)',
                border: '1px solid var(--ink-15)',
              }}
            >
              <div
                className="w-44 aspect-[3/4.08] shadow-xl"
                style={{
                  boxShadow: '0 0 0 10px #F6EAD8, 0 18px 28px rgba(58,53,80,0.14)',
                }}
              >
                <CropImage printIndex={print.id} className="w-full h-full" />
              </div>
              <div className="mt-10 w-64 h-3 rounded-sm" style={{ background: '#D3AA72', opacity: 0.65 }} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
