import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PRINTS, type CurrencyCode } from '../data/prints';
import { formatPrice } from '../utils/galleryMath';
import { CropImage } from './CropImage';
import type { NavDialogType } from './NavBar';

interface InfoDialogProps {
  dialog: NavDialogType;
  currency: CurrencyCode;
  savedIds: readonly number[];
  onClose: () => void;
  onSelectPrint: (printIndex: number) => void;
}

export function InfoDialog({
  dialog,
  currency,
  savedIds,
  onClose,
  onSelectPrint,
}: InfoDialogProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (dialog === 'search') {
      setQuery('');
    }
  }, [dialog]);

  if (!dialog) return null;

  const filtered = PRINTS.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.productType.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  const savedPrints = PRINTS.filter((p) => savedIds.includes(p.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(58, 53, 80, 0.28)' }}
      role="dialog"
      aria-modal="true"
      aria-label={
        dialog === 'search'
          ? 'Search products'
          : dialog === 'saved'
            ? 'Saved products'
            : dialog
      }
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[82vh] overflow-y-auto p-6 sm:p-7"
        style={{
          background: 'var(--page)',
          border: '1px solid var(--ink-15)',
          color: 'var(--ink)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between pb-3 mb-5"
          style={{ borderBottom: '1px solid var(--ink-15)' }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-cond)',
              fontSize: '24px',
              fontWeight: 600,
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {dialog === 'search'
              ? 'Search Madhukunj'
              : dialog === 'info'
                ? 'About Madhukunj'
                : dialog === 'auctions'
                  ? 'Collections'
                  : dialog === 'help'
                    ? 'Support'
                    : dialog === 'account'
                      ? 'Your Account'
                      : 'Saved Products'}
          </h2>
          <button
            type="button"
            className="w-8 h-8 inline-flex items-center justify-center"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={18} strokeWidth={1.6} />
          </button>
        </div>

        {dialog === 'search' && (
          <div>
            <label htmlFor="madhukunj-search" className="sr-only">
              Search
            </label>
            <input
              id="madhukunj-search"
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product name, category, or description…"
              className="w-full px-3 py-2.5 mb-4 text-sm outline-none"
              style={{
                background: '#FFFDF7',
                border: '1px solid var(--ink-35)',
                fontFamily: 'var(--font-serif)',
              }}
            />

            <div className="flex flex-col gap-2">
              {filtered.length === 0 ? (
                <p
                  className="py-6 text-center"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-60)' }}
                >
                  No products match “{query}”.
                </p>
              ) : (
                filtered.map((print) => (
                  <button
                    key={print.id}
                    type="button"
                    className="flex items-center gap-3.5 p-2 text-left transition-colors hover:bg-[#FBF3E4]"
                    onClick={() => {
                      onSelectPrint(print.id);
                      onClose();
                    }}
                  >
                    <div className="w-11 aspect-[3/4] shrink-0 bg-[#F6EAD8]">
                      <CropImage printIndex={print.id} className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="m-0 font-medium truncate"
                        style={{ fontFamily: 'var(--font-serif)', fontSize: '15px' }}
                      >
                        {print.title}
                      </p>
                      <p
                        className="m-0 italic"
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '13px',
                          color: 'var(--ink-60)',
                        }}
                      >
                        {print.productType} · {formatPrice(print.price, currency)}
                      </p>
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatPrice(print.price, currency)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {dialog === 'saved' && (
          <div>
            {savedPrints.length === 0 ? (
              <p
                className="py-8 text-center"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-60)' }}
              >
                No saved products yet. Bookmark any product to collect it here.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {savedPrints.map((print) => (
                  <button
                    key={print.id}
                    type="button"
                    className="flex items-center gap-3.5 p-2 text-left hover:bg-[#FBF3E4]"
                    onClick={() => {
                      onSelectPrint(print.id);
                      onClose();
                    }}
                  >
                    <div className="w-12 aspect-[3/4] shrink-0 bg-[#F6EAD8]">
                      <CropImage printIndex={print.id} className="w-full h-full" />
                    </div>
                    <div className="flex-1">
                      <p className="m-0 font-medium" style={{ fontSize: '15px' }}>
                        {print.title}
                      </p>
                      <p
                        className="m-0 italic"
                        style={{ fontSize: '13px', color: 'var(--ink-60)' }}
                      >
                        {print.productType}
                      </p>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {formatPrice(print.price, currency)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {dialog === 'info' && (
          <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--ink-60)' }}>
            <p className="m-0">
              <strong style={{ color: 'var(--ink)' }}>Madhukunj</strong> is the flagship brand of Shri Balaji Incense Industries, founded in 2008 in Odisha. The company began making incense in 1996 and grew to become one of India's best-known agarbatti brands.
            </p>
            <p className="m-0">
              Rooted in Kalinga, Madhukunj makes incense for pooja, meditation and relaxation — with a fragrance for every mood and occasion.
            </p>
            <p className="m-0" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink)' }}>
              "Agarbatti ho toh Madhukunj"
            </p>
          </div>
        )}

        {dialog === 'auctions' && (
          <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--ink-60)' }}>
            <p className="m-0">Browse the store by collection:</p>
            <p className="m-0" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink)' }}>
              Combo Packs · Devotion &amp; Divine · Individual Products · Modern · Nature · Ritual Essentials · Royal Heritage · Urja Aromatherapy
            </p>
          </div>
        )}

        {dialog === 'help' && (
          <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--ink-60)' }}>
            <p className="m-0">
              Orders are packed within 1–2 business days and delivered across India in 3–7 days via Shiprocket. Need help with an order, wholesale enquiry or returns? Reach us at info@madhukunj.com or +91 90400 08686.
            </p>
            <p className="m-0">
              Unopened items can be returned within 7 days of delivery; opened incense cannot be returned for hygiene reasons.
            </p>
          </div>
        )}

        {dialog === 'account' && (
          <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--ink-60)' }}>
            <p className="m-0">
              Demo session · Prices shown in{' '}
              <strong style={{ color: 'var(--ink)' }}>{currency}</strong>.
            </p>
            <p className="m-0">
              Saved products ({savedPrints.length}) and bag selections stay on this device during your visit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
