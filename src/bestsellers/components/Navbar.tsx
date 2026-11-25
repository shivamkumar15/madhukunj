import { useEffect, useLayoutEffect, useRef } from 'react';
import { MadhukunjMark } from './MadhukunjMark';

export type NavSectionId = 'flavors' | 'inside' | 'shop' | 'range';
export type NavTheme = 'default' | 'light' | 'dark';

interface NavbarProps {
  entered: boolean;
  activeSection: NavSectionId;
  navTheme: NavTheme;
  cartCount: number;
  badgePopKey: number;
  basketBumpKey: number;
  onNavigate: (id: NavSectionId) => void;
  onOpenCart: () => void;
  onOpenOffer: () => void;
  onOpenDibs: () => void;
  basketBtnRef: React.RefObject<HTMLButtonElement | null>;
}

const LINKS: readonly { id: NavSectionId; label: string }[] = [
  { id: 'flavors', label: 'Best Sellers' },
  { id: 'inside', label: 'Inside' },
  { id: 'shop', label: 'Shop' },
  { id: 'range', label: 'Combos' },
];

export function Navbar({
  entered,
  activeSection,
  navTheme,
  cartCount,
  badgePopKey,
  basketBumpKey,
  onNavigate,
  onOpenCart,
  onOpenOffer,
  onOpenDibs,
  basketBtnRef,
}: NavbarProps) {
  const pillRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Record<NavSectionId, HTMLAnchorElement | null>>({
    flavors: null,
    inside: null,
    shop: null,
    range: null,
  });

  const updateHighlight = () => {
    const pill = pillRef.current;
    const hl = hlRef.current;
    const activeEl = linkRefs.current[activeSection];
    if (!pill || !hl || !activeEl) return;
    hl.style.left = `${activeEl.offsetLeft}px`;
    hl.style.width = `${activeEl.offsetWidth}px`;
  };

  useLayoutEffect(() => {
    updateHighlight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, entered]);

  useEffect(() => {
    window.addEventListener('resize', updateHighlight);
    return () => window.removeEventListener('resize', updateHighlight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const navClasses = [
    'site-nav',
    entered ? 'entered' : '',
    navTheme === 'light' ? 'light' : '',
    navTheme === 'dark' ? 'dark' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav className={navClasses} aria-label="Primary navigation">
      <a
        href="#flavors"
        className="nav-brand"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('flavors');
        }}
      >
        <MadhukunjMark
          className="nav-brand-mark"
          inverted={navTheme === 'dark'}
        />
        <span className="nav-brand-text">MADHUKUNJ</span>
      </a>

      <div className="nav-pill" ref={pillRef}>
        <div className="nav-pill-hl" ref={hlRef} aria-hidden="true" />
        {LINKS.map((link) => (
          <a
            key={link.id}
            ref={(el) => {
              linkRefs.current[link.id] = el;
            }}
            href={`#${link.id}`}
            className={`nav-pill-link ${activeSection === link.id ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(link.id);
            }}
          >
            {link.label}
          </a>
        ))}
      </div>

      <div className="nav-actions">
        <button
          type="button"
          className="nav-chip nav-off"
          onClick={onOpenOffer}
        >
          % OFF
        </button>

        <button
          ref={basketBtnRef}
          key={`basket-${basketBumpKey}`}
          type="button"
          className={`nav-chip nav-basket ${basketBumpKey > 0 ? 'bump' : ''}`}
          aria-label={`Shopping basket, ${cartCount} items`}
          onClick={onOpenCart}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 8h12l1.2 12H4.8L6 8Z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          {cartCount > 0 && (
            <span
              key={`badge-${badgePopKey}`}
              className="cart-badge pop"
              data-testid="cart-badge"
            >
              {cartCount}
            </span>
          )}
        </button>

        <button
          type="button"
          className="nav-dibs"
          onClick={onOpenDibs}
        >
          First dibs
        </button>

        <a className="nav-dibs" href="/madhukunj/">
          Back to store
        </a>
      </div>
    </nav>
  );
}
