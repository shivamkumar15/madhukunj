import { Heart, Search, ShoppingBag, User } from 'lucide-react';

export type NavDialogType =
  | 'search'
  | 'info'
  | 'auctions'
  | 'help'
  | 'account'
  | 'saved'
  | null;

interface NavBarProps {
  isSolid: boolean;
  introAnimate: boolean;
  bagCount: number;
  savedCount: number;
  onGoGallery: () => void;
  onGoList: () => void;
  onGoAbout: () => void;
  onOpenDialog: (dialog: NavDialogType) => void;
  onOpenBag: () => void;
}

export function NavBar({
  isSolid,
  introAnimate,
  bagCount,
  savedCount,
  onGoGallery,
  onGoList,
  onGoAbout,
  onOpenDialog,
  onOpenBag,
}: NavBarProps) {
  const navDelay = (idx: number) =>
    introAnimate ? { animationDelay: `${250 + (5 + idx) * 60}ms` } : undefined;

  return (
    <header
      className={`nav${isSolid ? ' is-solid' : ''}${introAnimate ? ' intro-animate' : ''}`}
    >
      <a
        href="#gallery"
        className="nav-logo"
        style={navDelay(0)}
        onClick={(e) => {
          e.preventDefault();
          onGoGallery();
        }}
      >
        <img
          src="/madhukunj/images/madhukunj-logo.png"
          alt="Madhukunj"
          className="nav-logo-img"
        />
      </a>

      <nav className="nav-links" aria-label="Primary">
        <a
          href="#list"
          className="nav-link"
          style={navDelay(1)}
          onClick={(e) => {
            e.preventDefault();
            onGoList();
          }}
        >
          All Products
        </a>
        <a
          href="/madhukunj/bestsellers.html"
          className="nav-link"
          style={navDelay(2)}
        >
          Our Best Seller Products
        </a>
        <a
          href="#about"
          className="nav-link"
          style={navDelay(3)}
          onClick={(e) => {
            e.preventDefault();
            onGoAbout();
          }}
        >
          About Us
        </a>
        <a
          href="#gallery"
          className="nav-link"
          style={navDelay(4)}
          onClick={(e) => {
            e.preventDefault();
            onGoGallery();
          }}
        >
          Gallery
        </a>
      </nav>

      <div className="nav-right">
        <button
          type="button"
          className="nav-search"
          style={navDelay(6)}
          aria-label="Search products"
          onClick={() => onOpenDialog('search')}
        >
          <Search className="nav-search-icon" strokeWidth={1.6} aria-hidden="true" />
          <span className="nav-search-label">Search…</span>
          <kbd className="nav-search-kbd">⌘K</kbd>
        </button>

        <button
          type="button"
          className="nav-icon-btn nav-account-btn"
          style={navDelay(8)}
          aria-label="Your account"
          onClick={() => onOpenDialog('account')}
        >
          <User className="nav-icon-svg" strokeWidth={1.6} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="nav-icon-btn nav-heart-btn"
          style={navDelay(9)}
          aria-label={`Saved products (${savedCount})`}
          onClick={() => onOpenDialog('saved')}
        >
          <Heart
            className="nav-icon-svg"
            strokeWidth={1.6}
            fill={savedCount > 0 ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          className="nav-icon-btn nav-bag-btn"
          style={navDelay(10)}
          aria-label={`Open shopping bag (${bagCount} items)`}
          onClick={onOpenBag}
        >
          <ShoppingBag className="nav-icon-svg" strokeWidth={1.6} aria-hidden="true" />
          {bagCount > 0 && (
            <span className="nav-bag-badge" data-testid="bag-badge">
              {bagCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
