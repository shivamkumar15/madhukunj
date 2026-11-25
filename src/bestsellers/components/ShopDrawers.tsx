import { useState } from 'react';
import { FLAVORS } from '../data/flavors';
import { computeSpriteCrop } from '../utils/strideMath';

export interface CartItem {
  id: string;
  type: 'bag' | 'pack';
  flavorIndices: number[];
  title: string;
  unitPrice: number;
  qty: number;
}

interface ShopDrawersProps {
  drawer: 'cart' | 'offer' | 'dibs' | null;
  cartItems: CartItem[];
  onClose: () => void;
  onUpdateQty: (id: string, delta: number) => void;
  onClearCart: () => void;
}

const WRAPPER_CROPS = FLAVORS.map((f) => computeSpriteCrop(f.box, 4));

export function ShopDrawers({
  drawer,
  cartItems,
  onClose,
  onUpdateQty,
  onClearCart,
}: ShopDrawersProps) {
  const [email, setEmail] = useState('');
  const [submittedMsg, setSubmittedMsg] = useState<string | null>(null);
  const [checkedOut, setCheckedOut] = useState(false);

  if (!drawer) return null;

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.qty,
    0
  );

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) return;
    setSubmittedMsg(
      drawer === 'offer'
        ? `15% off code MADHUKUNJ15 sent to ${trimmed}.`
        : `You're on the list — early drops will go to ${trimmed}.`
    );
    setEmail('');
  };

  return (
    <div
      className="drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={
        drawer === 'cart'
          ? 'Your Madhukunj bag'
          : drawer === 'offer'
            ? '15% off your first order'
            : 'First dibs early access'
      }
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSubmittedMsg(null);
          setCheckedOut(false);
          onClose();
        }
      }}
    >
      <div className="drawer-panel">
        <div>
          <div className="flex items-center justify-between pb-5 border-b border-[#1c1a1f]/15">
            <h2 className="disp text-2xl">
              {drawer === 'cart'
                ? 'YOUR BAG'
                : drawer === 'offer'
                  ? '15% OFF'
                  : 'FIRST DIBS'}
            </h2>
            <button
              type="button"
              aria-label="Close panel"
              className="w-9 h-9 rounded-full border border-[#1c1a1f]/25 flex items-center justify-center hover:bg-[#1c1a1f] hover:text-[#f0e8e0] transition-colors"
              onClick={() => {
                setSubmittedMsg(null);
                setCheckedOut(false);
                onClose();
              }}
            >
              ✕
            </button>
          </div>

          {drawer === 'cart' ? (
            <div className="mt-6 space-y-4">
              {checkedOut ? (
                <div className="p-5 rounded-2xl bg-[#94bdb4]/35 text-[#1c1a1f] space-y-2">
                  <p className="font-bold text-base">Order placed</p>
                  <p className="text-sm opacity-80">
                    Your Madhukunj fragrances are being packed.
                  </p>
                </div>
              ) : cartItems.length === 0 ? (
                <p className="text-sm opacity-75 py-8">
                  Your bag is empty. Pick a best seller or build a combo pack.
                </p>
              ) : (
                cartItems.map((item) => {
                  const mainFlavor = FLAVORS[item.flavorIndices[0]] ?? FLAVORS[1];
                  const crop = WRAPPER_CROPS[mainFlavor.index];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 rounded-2xl bg-white/60"
                    >
                      <div
                        className="w-12 h-14 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: mainFlavor.color }}
                      >
                        <div
                          className="spr w-6 h-12"
                          style={{
                            backgroundSize: crop.backgroundSize,
                            backgroundPosition: crop.backgroundPosition,
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">
                          {item.title}
                        </div>
                        <div className="text-xs opacity-70 font-mono">
                          Rs. ${item.unitPrice * item.qty}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${item.title}`}
                          className="w-7 h-7 rounded-full border border-[#1c1a1f]/25 flex items-center justify-center text-sm"
                          onClick={() => onUpdateQty(item.id, -1)}
                        >
                          −
                        </button>
                        <span className="font-mono text-xs w-4 text-center">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${item.title}`}
                          className="w-7 h-7 rounded-full border border-[#1c1a1f]/25 flex items-center justify-center text-sm"
                          onClick={() => onUpdateQty(item.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <p className="text-sm leading-relaxed opacity-85">
                {drawer === 'offer'
                  ? 'Get 15% off your first Madhukunj order — handcrafted incense blended in small batches.'
                  : 'New fragrances drop to members first. Leave your email for early access.'}
              </p>

              {submittedMsg ? (
                <div className="p-4 rounded-2xl bg-[#94bdb4]/40 text-sm font-medium">
                  {submittedMsg}
                </div>
              ) : (
                <form onSubmit={handleSubmitEmail} className="space-y-3">
                  <label className="block text-xs font-mono uppercase tracking-wider opacity-75">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 px-4 rounded-xl bg-white border border-[#1c1a1f]/20 text-sm text-[#1c1a1f] focus:outline-none focus:border-[#1c1a1f]"
                  />
                  <button
                    type="submit"
                    className="w-full h-11 rounded-full bg-[#1c1a1f] text-[#f0e8e0] font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    {drawer === 'offer' ? 'Claim 15% off' : 'Join first dibs'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {drawer === 'cart' && cartItems.length > 0 && !checkedOut && (
          <div className="pt-6 border-t border-[#1c1a1f]/15 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono uppercase tracking-wider opacity-75">
                Subtotal
              </span>
              <span className="font-mono font-semibold text-base">
                Rs. ${subtotal}
              </span>
            </div>
            <button
              type="button"
              className="w-full h-12 rounded-full bg-[#1c1a1f] text-[#f0e8e0] font-semibold text-sm hover:opacity-90 transition-opacity"
              onClick={() => {
                setCheckedOut(true);
                onClearCart();
              }}
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
