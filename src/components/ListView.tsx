import { Heart } from 'lucide-react';
import { PRINTS, type CurrencyCode } from '../data/prints';
import { formatPrice } from '../utils/galleryMath';
import { CropImage } from './CropImage';

interface ListViewProps {
  open: boolean;
  currency: CurrencyCode;
  savedIds: readonly number[];
  onToggleSave: (printId: number) => void;
  onOpenPrint: (printIndex: number, sourceEl: HTMLElement | null) => void;
}

export function ListView({
  open,
  currency,
  savedIds,
  onToggleSave,
  onOpenPrint,
}: ListViewProps) {
  // Combos first, matching the store's "Combo Packs" collection.
  const combos = PRINTS.filter((print) => print.productType === 'Combo');
  const others = PRINTS.filter((print) => print.productType !== 'Combo');

  const renderCard = (print: (typeof PRINTS)[number]) => {
    const isSaved = savedIds.includes(print.id);
    const from =
      print.variants.length > 1
        ? `from ${formatPrice(print.price, currency)}`
        : formatPrice(print.price, currency);

    return (
      <div
        key={print.id}
        className={`print-card${print.productType === 'Combo' ? ' combo-card' : ''}`}
      >
        <button
          type="button"
          className="print-card-open"
          onClick={(e) => {
            const media = e.currentTarget.querySelector('.print-card-media') as HTMLElement | null;
            onOpenPrint(print.id, media);
          }}
        >
          <div className="print-card-media">
            <CropImage printIndex={print.id} className="w-full h-full" />
          </div>
          <p className="print-card-title">{print.title}</p>
          <p className="print-card-artist">{print.productType}</p>
          <p className="print-card-price">{from}</p>
        </button>
        <button
          type="button"
          className={`card-heart${isSaved ? ' is-saved' : ''}`}
          aria-label={isSaved ? `Remove ${print.title} from saved` : `Save ${print.title}`}
          aria-pressed={isSaved}
          onClick={() => onToggleSave(print.id)}
        >
          <Heart size={17} strokeWidth={1.6} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </div>
    );
  };

  return (
    <section
      id="list"
      className={open ? 'is-open' : ''}
      aria-hidden={!open}
      inert={!open}
      aria-label="Madhukunj products"
    >
      <header className="list-hero">
        <p className="list-eyebrow">The Collection</p>
        <h2 className="list-heading">All Products</h2>
        <p className="list-subhead">
          Fragrances for every mood, ritual and occasion — made in Kalinga.
        </p>
        <span className="list-count">{PRINTS.length} PRODUCTS</span>
      </header>

      <div className="list-grid">
        <div className="combo-banner">
          <p className="combo-banner-kicker">BEST VALUE</p>
          <h3 className="combo-banner-title">BUY OUR COMBO PACKS</h3>
          <p className="combo-banner-sub">More fragrance, better value — curated sets for every occasion.</p>
        </div>
        {combos.map(renderCard)}
        {others.map(renderCard)}
      </div>
    </section>
  );
}
