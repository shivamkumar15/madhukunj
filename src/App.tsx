import { useCallback, useEffect, useRef, useState } from 'react';
import { AboutPage } from './components/AboutPage';
import { BagDrawer } from './components/BagDrawer';
import { CropImage } from './components/CropImage';
import {
  GalleryCanvas,
  type GalleryController,
  type ScreenRect,
} from './components/GalleryCanvas';
import { GalleryHud } from './components/GalleryHud';
import { InfoDialog } from './components/InfoDialog';
import { ListView } from './components/ListView';
import { NavBar, type NavDialogType } from './components/NavBar';
import { PrintPage } from './components/PrintPage';
import { PRINTS, type CurrencyCode } from './data/prints';
import {
  addItemToBag,
  getBagCount,
  removeBagItem,
  updateBagItemQuantity,
  type BagItem,
} from './utils/bag';

type AppMode = 'gallery' | 'list' | 'page' | 'about';

interface FlyerState {
  id: number;
  printIndex: number;
  sourceRect: ScreenRect;
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('gallery');
  const [isFocused, setIsFocused] = useState(false);
  const [introAnimate, setIntroAnimate] = useState(false);
  const [activePrintIndex, setActivePrintIndex] = useState(0);
  const [lastPrintIndex, setLastPrintIndex] = useState(0);

  const [pageImageVisible, setPageImageVisible] = useState(true);
  const [pageDetailsVisible, setPageDetailsVisible] = useState(true);
  const [flyer, setFlyer] = useState<FlyerState | null>(null);

  const [pillVisible, setPillVisible] = useState(false);
  const [pillPos, setPillPos] = useState({ x: 0, y: 0 });

  const [bag, setBag] = useState<BagItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [animateBagKey, setAnimateBagKey] = useState<string | null>(null);

  const [currency] = useState<CurrencyCode>('INR');
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [activeDialog, setActiveDialog] = useState<NavDialogType>(null);

  const galleryControllerRef = useRef<GalleryController | null>(null);
  const artworkTargetRef = useRef<HTMLDivElement | null>(null);
  const pageScrollRef = useRef<HTMLElement | null>(null);
  const flyerElRef = useRef<HTMLDivElement | null>(null);
  const detailsTimerRef = useRef<number>(0);
  const flyerSeqRef = useRef(0);

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Expose semantic state attribute on body for verification
  useEffect(() => {
    const state =
      mode === 'gallery' ? (isFocused ? 'focus' : 'walk') : mode;
    document.body.setAttribute('data-state', state);
  }, [mode, isFocused]);

  // Global keyboard shortcuts (Cmd/Ctrl+K for search, Escape for dialog/drawer)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveDialog((prev) => (prev === 'search' ? null : 'search'));
        return;
      }
      if (e.key === 'Escape') {
        if (activeDialog) {
          e.preventDefault();
          setActiveDialog(null);
        } else if (drawerOpen) {
          e.preventDefault();
          setDrawerOpen(false);
        } else if (mode === 'about') {
          e.preventDefault();
          setMode('gallery');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeDialog, drawerOpen, mode]);

  const handleIntroReady = useCallback(() => {
    setIntroAnimate(true);
  }, []);

  const handleFocusChange = useCallback(
    (focused: boolean, printIndex: number | null) => {
      setIsFocused(focused);
      if (printIndex !== null) {
        setLastPrintIndex(printIndex);
      }
    },
    [],
  );

  const handlePillChange = useCallback(
    (visible: boolean, pos: { x: number; y: number }) => {
      setPillVisible(visible);
      if (visible) {
        setPillPos(pos);
      }
    },
    [],
  );

  const openPrintWithFlyer = useCallback(
    (printIndex: number, sourceRect: ScreenRect | null) => {
      window.clearTimeout(detailsTimerRef.current);
      const reduced = prefersReducedMotion();

      setActivePrintIndex(printIndex);
      setLastPrintIndex(printIndex);
      setMode('page');
      setPillVisible(false);

      if (pageScrollRef.current) {
        pageScrollRef.current.scrollTo({
          top: 0,
          behavior: reduced ? 'auto' : 'smooth',
        });
      }

      if (reduced || !sourceRect) {
        setFlyer(null);
        setPageImageVisible(true);
        setPageDetailsVisible(true);
        return;
      }

      setPageImageVisible(false);
      setPageDetailsVisible(false);

      flyerSeqRef.current += 1;
      setFlyer({
        id: flyerSeqRef.current,
        printIndex,
        sourceRect,
      });

      detailsTimerRef.current = window.setTimeout(() => {
        setPageDetailsVisible(true);
      }, 1000);
    },
    [],
  );

  // Run WAAPI flyer animation once flyer node mounts
  useEffect(() => {
    if (!flyer) return;
    const el = flyerElRef.current;
    const targetEl = artworkTargetRef.current;
    if (!el || !targetEl) {
      setFlyer(null);
      setPageImageVisible(true);
      return;
    }

    let cancelled = false;
    let animation: Animation | null = null;

    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      const scroller = pageScrollRef.current;
      let destRect: DOMRect;
      if (scroller && scroller.scrollTop > 0) {
        const savedTop = scroller.scrollTop;
        scroller.scrollTop = 0;
        destRect = targetEl.getBoundingClientRect();
        scroller.scrollTop = savedTop;
        scroller.scrollTo({
          top: 0,
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
      } else {
        destRect = targetEl.getBoundingClientRect();
      }
      const src = flyer.sourceRect;

      if (destRect.width <= 0 || destRect.height <= 0) {
        setFlyer(null);
        setPageImageVisible(true);
        return;
      }

      const dx = destRect.left - src.left;
      const dy = destRect.top - src.top;
      const sx = destRect.width / Math.max(1, src.width);
      const sy = destRect.height / Math.max(1, src.height);

      animation = el.animate(
        [
          { transform: 'translate(0px, 0px) scale(1, 1)' },
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        ],
        {
          duration: prefersReducedMotion() ? 0 : 300,
          easing: 'cubic-bezier(0.25, 0.75, 0.25, 1)',
          fill: 'forwards',
        },
      );

      animation.onfinish = () => {
        if (cancelled) return;
        setPageImageVisible(true);
        setFlyer(null);
      };
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      animation?.cancel();
    };
  }, [flyer]);

  useEffect(() => {
    return () => {
      window.clearTimeout(detailsTimerRef.current);
    };
  }, []);

  const handleOpenFromElement = useCallback(
    (printIndex: number, sourceEl: HTMLElement | null) => {
      if (!sourceEl) {
        openPrintWithFlyer(printIndex, null);
        return;
      }
      const r = sourceEl.getBoundingClientRect();
      openPrintWithFlyer(printIndex, {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      });
    },
    [openPrintWithFlyer],
  );

  const handleGoGallery = useCallback(() => {
    if (mode !== 'gallery') {
      window.clearTimeout(detailsTimerRef.current);
      setFlyer(null);
      setPageImageVisible(true);
      setPageDetailsVisible(true);
      setMode('gallery');
      galleryControllerRef.current?.focusPrint(lastPrintIndex);
    } else if (isFocused) {
      galleryControllerRef.current?.stepBack();
    }
  }, [mode, lastPrintIndex, isFocused]);

  const handleGoList = useCallback(() => {
    window.clearTimeout(detailsTimerRef.current);
    setFlyer(null);
    setPillVisible(false);
    setMode('list');
  }, []);

  const handleGoAbout = useCallback(() => {
    window.clearTimeout(detailsTimerRef.current);
    setFlyer(null);
    setPillVisible(false);
    setActiveDialog(null);
    setDrawerOpen(false);
    setMode('about');
  }, []);

  const handleToggleSave = useCallback((printId: number) => {
    setSavedIds((prev) =>
      prev.includes(printId)
        ? prev.filter((id) => id !== printId)
        : [...prev, printId],
    );
  }, []);

  const handleAddToBag = useCallback(
    (payload: {
      printId: number;
      variant: string;
      unitPrice: number;
      quantity: number;
    }) => {
      const print = PRINTS[payload.printId];
      const result = addItemToBag(bag, {
        printId: print.id,
        title: print.title,
        artist: print.productType,
        unitPrice: payload.unitPrice,
        paper: payload.variant,
        size: print.productType,
        signature: '',
        frame: payload.variant,
        quantity: payload.quantity,
      });
      setBag(result.items);
      setAnimateBagKey(result.isNewLine ? result.addedKey : null);
      setDrawerOpen(true);
    },
    [bag],
  );

  const handleUpdateQty = useCallback((key: string, delta: number) => {
    setBag((prev) => updateBagItemQuantity(prev, key, delta));
  }, []);

  const handleRemoveItem = useCallback((key: string) => {
    setBag((prev) => removeBagItem(prev, key));
  }, []);

  const handleClearBag = useCallback(() => {
    setBag([]);
  }, []);

  const bagCount = getBagCount(bag);

  return (
    <>
      <NavBar
        isSolid={mode !== 'gallery'}
        introAnimate={introAnimate}
        bagCount={bagCount}
        savedCount={savedIds.length}
        onGoGallery={handleGoGallery}
        onGoList={handleGoList}
        onGoAbout={handleGoAbout}
        onOpenDialog={setActiveDialog}
        onOpenBag={() => {
          setAnimateBagKey(null);
          setDrawerOpen(true);
        }}
      />

      <GalleryCanvas
        controllerRef={galleryControllerRef}
        active={mode === 'gallery'}
        onIntroReady={handleIntroReady}
        onFocusChange={handleFocusChange}
        onPillChange={handlePillChange}
        onOpenPrint={openPrintWithFlyer}
      />

      <GalleryHud
        visible={mode === 'gallery'}
        isFocused={isFocused}
        mode={mode === 'list' ? 'list' : 'gallery'}
        introAnimate={introAnimate}
        pillVisible={pillVisible && mode === 'gallery'}
        pillPos={pillPos}
        onPrev={() => galleryControllerRef.current?.stepSlot(-1)}
        onNext={() => galleryControllerRef.current?.stepSlot(1)}
        onSelectGallery={handleGoGallery}
        onSelectList={handleGoList}
      />

      <ListView
        open={mode === 'list'}
        currency={currency}
        savedIds={savedIds}
        onToggleSave={handleToggleSave}
        onOpenPrint={handleOpenFromElement}
      />

      <PrintPage
        open={mode === 'page'}
        printIndex={activePrintIndex}
        imageVisible={pageImageVisible}
        detailsVisible={pageDetailsVisible}
        currency={currency}
        isSaved={savedIds.includes(activePrintIndex)}
        artworkTargetRef={artworkTargetRef}
        scrollContainerRef={pageScrollRef}
        onToggleSave={handleToggleSave}
        onAddToBag={handleAddToBag}
        onSelectCollectionPrint={handleOpenFromElement}
      />

      {flyer && (
        <div
          key={flyer.id}
          ref={flyerElRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: `${flyer.sourceRect.left}px`,
            top: `${flyer.sourceRect.top}px`,
            width: `${flyer.sourceRect.width}px`,
            height: `${flyer.sourceRect.height}px`,
            transformOrigin: 'top left',
            zIndex: 26,
            pointerEvents: 'none',
          }}
        >
          <CropImage printIndex={flyer.printIndex} className="w-full h-full" />
        </div>
      )}

      <BagDrawer
        open={drawerOpen}
        items={bag}
        currency={currency}
        animateKey={animateBagKey}
        onClose={() => setDrawerOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearBag={handleClearBag}
      />

      <InfoDialog
        dialog={activeDialog}
        currency={currency}
        savedIds={savedIds}
        onClose={() => setActiveDialog(null)}
        onSelectPrint={(id) => openPrintWithFlyer(id, null)}
      />

      <AboutPage
        open={mode === 'about'}
        onGoGallery={handleGoGallery}
        onGoList={handleGoList}
      />
    </>
  );
}
