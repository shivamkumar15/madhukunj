import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { CurrencyCode } from '../data/prints';
import { getBagSubtotal, type BagItem } from '../utils/bag';
import { formatPrice } from '../utils/galleryMath';
import { CropImage } from './CropImage';
import { RollingNumber } from './RollingNumber';

interface BagDrawerProps {
  open: boolean;
  items: readonly BagItem[];
  currency: CurrencyCode;
  animateKey: string | null;
  onClose: () => void;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearBag: () => void;
}

export function BagDrawer({
  open,
  items,
  currency,
  animateKey,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearBag,
}: BagDrawerProps) {
  const [checkedOut, setCheckedOut] = useState(false);
  const subtotal = getBagSubtotal(items);

  const handleCheckout = () => {
    if (items.length === 0) return;
    setCheckedOut(true);
    onClearBag();
  };

  const handleClose = () => {
    setCheckedOut(false);
    onClose();
  };

  return (
    <>
      <div
        className={`drawer-backdrop${open ? ' is-open' : ''}`}
        aria-hidden="true"
        onClick={handleClose}
      />

      <aside
        className={`drawer${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Your shopping bag"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="drawer-header">
          <h2 className="drawer-title">YOUR BAG</h2>
          <button
            type="button"
            className="drawer-close"
            aria-label="Close bag"
            onClick={handleClose}
          >
            <X size={20} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>

        <div className="drawer-items">
          {checkedOut && items.length === 0 ? (
            <div className="mt-10 text-center px-3">
              <p
                className="uppercase tracking-widest mb-2"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
              >
                Order Confirmed
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '15px',
                  lineHeight: 1.5,
                  color: 'var(--ink-60)',
                }}
              >
                Your Madhukunj order is placed. We'll pack it within 1–2 business days.
              </p>
              <button
                type="button"
                className="mt-6 px-5 py-2.5 text-xs uppercase tracking-widest"
                style={{
                  fontFamily: 'var(--font-mono)',
                  border: '1px solid var(--ink-35)',
                }}
                onClick={handleClose}
              >
                Continue Exploring
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="drawer-empty">YOUR BAG IS EMPTY</p>
          ) : (
            items.map((item) => {
              const shouldAnimate = animateKey === item.key;
              return (
                <div
                  key={item.key}
                  className={`drawer-item${shouldAnimate ? ' drawer-item-enter' : ''}`}
                >
                  <div className="drawer-thumb">
                    <CropImage printIndex={item.printId} className="w-full h-full" />
                  </div>

                  <div className="drawer-item-info">
                    <p className="drawer-item-title">{item.title}</p>
                    <p className="drawer-item-artist">{item.artist}</p>
                    <p className="drawer-item-size">
                      {item.size} · {item.frame}
                    </p>

                    <div className="drawer-item-controls">
                      <div className="drawer-qty">
                        <button
                          type="button"
                          className="drawer-qty-btn"
                          aria-label={`Decrease quantity of ${item.title}`}
                          onClick={() => onUpdateQty(item.key, -1)}
                        >
                          −
                        </button>
                        <RollingNumber value={item.quantity} />
                        <button
                          type="button"
                          className="drawer-qty-btn"
                          aria-label={`Increase quantity of ${item.title}`}
                          onClick={() => onUpdateQty(item.key, 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          <RollingNumber value={formatPrice(item.unitPrice * item.quantity, currency)} />
                        </span>
                        <button
                          type="button"
                          className="drawer-trash"
                          aria-label={`Remove ${item.title} from bag`}
                          onClick={() => onRemoveItem(item.key)}
                        >
                          <Trash2 size={15} strokeWidth={1.6} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="drawer-footer">
          <div className="drawer-subtotal-row">
            <span>Subtotal</span>
            <span className="drawer-subtotal-val" data-testid="bag-subtotal">
              <RollingNumber value={formatPrice(subtotal, currency, true)} />
            </span>
          </div>
          <button
            type="button"
            className="drawer-checkout-btn"
            disabled={items.length === 0}
            onClick={handleCheckout}
          >
            CHECKOUT →
          </button>
        </div>
      </aside>
    </>
  );
}
