import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BuilderSection } from './components/BuilderSection';
import { flySpritesToCart } from './components/FlyToCart';
import { HeroSection } from './components/HeroSection';
import { InsideSection } from './components/InsideSection';
import { IntroOverlay } from './components/IntroOverlay';
import { Navbar, type NavSectionId, type NavTheme } from './components/Navbar';
import { ShopDrawers, type CartItem } from './components/ShopDrawers';
import { ShopSection, type CardTiltState } from './components/ShopSection';
import {
  BITS,
  FLAVORS,
  INITIAL_FLAVOR_INDEX,
  INSIDE_STEPS,
} from './data/flavors';
import {
  clamp,
  computeArcSlot,
  computeSection2Scroll,
  computeSpriteCrop,
  computeStormPieceTransform,
  computeTravellerState,
  createStormPieces,
  entranceEase,
  lerp,
  mod,
  sineEaseInOut,
  slideEase,
  type BarScreenState,
} from './utils/strideMath';
import { BarStage } from './webgl/BarStage';

const BIT_CROPS = BITS.map((box) => computeSpriteCrop(box, 0));

export default function App() {
  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Intro & UI state
  const [entered, setEntered] = useState(false);
  const [activeIdx, setActiveIdx] = useState(INITIAL_FLAVOR_INDEX);
  const [titleDisplayIdx, setTitleDisplayIdx] = useState(INITIAL_FLAVOR_INDEX);
  const [titleSwapKey, setTitleSwapKey] = useState(0);
  const [titleDir, setTitleDir] = useState<1 | -1>(1);
  const [countDisplayIdx, setCountDisplayIdx] = useState(INITIAL_FLAVOR_INDEX);
  const [countSwapKey, setCountSwapKey] = useState(0);
  const [autoplay, setAutoplay] = useState(!reducedMotion);

  // Inside section state
  const [displayStep, setDisplayStep] = useState(0);
  const [insideFlavorIdx, setInsideFlavorIdx] = useState(INITIAL_FLAVOR_INDEX);
  const [insideTextKey, setInsideTextKey] = useState(0);

  // Nav & Cart state
  const [activeNav, setActiveNav] = useState<NavSectionId>('flavors');
  const [navTheme, setNavTheme] = useState<NavTheme>('default');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [badgePopKey, setBadgePopKey] = useState(0);
  const [basketBumpKey, setBasketBumpKey] = useState(0);
  const [drawer, setDrawer] = useState<'cart' | 'offer' | 'dibs' | null>(null);

  // DOM Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<BarStage | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const arcRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const insideRef = useRef<HTMLElement>(null);
  const inBarRef = useRef<HTMLDivElement>(null);
  const inDarkRef = useRef<HTMLDivElement>(null);
  const inFrontRef = useRef<HTMLDivElement>(null);
  const frontFrameRef = useRef<HTMLDivElement>(null);
  const backFrameRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLDivElement>(null);
  const stormPieceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shopRef = useRef<HTMLElement>(null);
  const shopGridRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLElement>(null);
  const livePkRef = useRef<HTMLDivElement | null>(null);
  const liveTiltRef = useRef<CardTiltState>({ tiltX: 0, tiltY: 0 });
  const basketBtnRef = useRef<HTMLButtonElement>(null);

  // Mutable animation engine state
  const animRef = useRef({
    pos: reducedMotion ? INITIAL_FLAVOR_INDEX : -2.6,
    target: INITIAL_FLAVOR_INDEX,
    slideStartPos: INITIAL_FLAVOR_INDEX,
    slideTargetPos: INITIAL_FLAVOR_INDEX,
    slideStartTime: 0,
    slideDuration: 0,
    slideActive: false,
    slideEaseMode: 'slide' as 'slide' | 'entrance',
    revealFired: true,
    revealDir: 1 as 1 | -1,
    revealPendingIdx: INITIAL_FLAVOR_INDEX,

    // Colour circle reveal
    colorRevealActive: false,
    colorRevealStart: 0,
    colorRevealColor: FLAVORS[INITIAL_FLAVOR_INDEX].color,

    // Drag
    pointerDown: false,
    dragging: false,
    pointerId: -1,
    startX: 0,
    lastX: 0,
    lastTime: 0,
    pos0: INITIAL_FLAVOR_INDEX,
    vel: 0,

    // Autoplay & timing
    entered: false,
    lastInteract: 0,
    autoplay: !reducedMotion,

    // Section 2 flip
    currentStep: 0,
    flipStartRy: 0,
    flipTargetRy: 0,
    flipCurrentRy: 0,
    flipStartTime: 0,
    flipDuration: 0,
    flipActive: false,
    stepTextSwapped: true,
    pendingStep: 0,

    // Squash poke on live 3D bar
    pokeActive: false,
    pokeStart: 0,

    // Phone shop snap once
    phoneShopSnapped: false,

    // Smooth wheel scroll
    smoothActive: false,
    smoothCurY: 0,
    smoothTargetY: 0,

    // Last nav state to avoid extra setState
    lastNav: 'flavors' as NavSectionId,
    lastNavTheme: 'default' as NavTheme,
    lastStormBits: new Array(20).fill(-1) as number[],
  });

  const stormPieces = useMemo(() => createStormPieces(20), []);
  const drawerRef = useRef(drawer);
  drawerRef.current = drawer;

  // Keep autoplay ref synced
  useEffect(() => {
    animRef.current.autoplay = autoplay;
  }, [autoplay]);

  const finishColorReveal = useCallback(() => {
    const st = animRef.current;
    if (!st.colorRevealActive) return;
    st.colorRevealActive = false;
    document.documentElement.style.setProperty('--flav', st.colorRevealColor);
    document.documentElement.style.setProperty('--rv', 'transparent');
    const revEl = revealRef.current;
    if (revEl) {
      revEl.style.webkitMaskImage = '';
      revEl.style.maskImage = '';
      revEl.style.clipPath = 'circle(0 at 50% 50%)';
    }
  }, []);

  const triggerFlavorVisuals = useCallback(
    (newIdx: number, dir: 1 | -1) => {
      const st = animRef.current;
      const newColor = FLAVORS[newIdx].color;

      setActiveIdx(newIdx);

      if (reducedMotion) {
        document.documentElement.style.setProperty('--flav', newColor);
        setTitleDisplayIdx(newIdx);
        setTitleSwapKey((k) => k + 1);
        setCountDisplayIdx(newIdx);
        setCountSwapKey((k) => k + 1);
        setInsideFlavorIdx(newIdx);
        return;
      }

      // Colour reveal (feathered circle)
      finishColorReveal();
      st.colorRevealActive = true;
      st.colorRevealStart = performance.now();
      st.colorRevealColor = newColor;
      document.documentElement.style.setProperty('--rv', newColor);
      if (revealRef.current) {
        revealRef.current.style.clipPath = 'none';
      }

      // Title letter-rise
      setTitleDir(dir);
      setTitleDisplayIdx(newIdx);
      setTitleSwapKey((k) => k + 1);

      // Counter soft crossfade (out 220ms, swap 60ms later)
      const countInner = document.getElementById('count-inner');
      if (countInner) {
        countInner.animate(
          [
            { translate: '0 0', opacity: 1 },
            { translate: '0 -10px', opacity: 0 },
          ],
          {
            duration: 220,
            easing: 'cubic-bezier(0.5, 0, 0.75, 0)',
            fill: 'forwards',
          }
        );
      }
      window.setTimeout(() => {
        setCountDisplayIdx(newIdx);
        setCountSwapKey((k) => k + 1);
      }, 60);

      // Update section 2 step 04 flavour name if currently on step 04
      if (st.currentStep === 3) {
        setInsideFlavorIdx(newIdx);
        setInsideTextKey((k) => k + 1);
      }
    },
    [finishColorReveal, reducedMotion]
  );

  const goTo = useCallback(
    (newTarget: number, customDurationMs?: number) => {
      const st = animRef.current;
      const prevTarget = st.target;
      const prevFlavor = mod(prevTarget, FLAVORS.length);
      const nextFlavor = mod(newTarget, FLAVORS.length);
      const dir: 1 | -1 = newTarget >= prevTarget ? 1 : -1;

      st.target = newTarget;
      st.lastInteract = performance.now();
      st.phoneShopSnapped = false;

      if (reducedMotion) {
        st.pos = newTarget;
        st.slideActive = false;
        if (nextFlavor !== prevFlavor) {
          triggerFlavorVisuals(nextFlavor, dir);
        }
        return;
      }

      const delta = Math.abs(newTarget - st.pos);
      const dur =
        customDurationMs ?? 650 + 160 * Math.max(0, Math.floor(delta) - 1);

      st.slideStartPos = st.pos;
      st.slideTargetPos = newTarget;
      st.slideStartTime = performance.now();
      st.slideDuration = Math.max(120, dur);
      st.slideEaseMode = 'slide';
      st.slideActive = true;

      if (nextFlavor !== prevFlavor) {
        st.revealFired = false;
        st.revealDir = dir;
        st.revealPendingIdx = nextFlavor;
      }
    },
    [reducedMotion, triggerFlavorVisuals]
  );

  const handleEnterHero = useCallback(() => {
    const st = animRef.current;
    if (st.entered) return;
    st.entered = true;
    st.lastInteract = performance.now();
    setEntered(true);

    if (reducedMotion) {
      st.pos = INITIAL_FLAVOR_INDEX;
      st.target = INITIAL_FLAVOR_INDEX;
      st.slideActive = false;
      return;
    }

    st.pos = -2.6;
    st.target = INITIAL_FLAVOR_INDEX;
    st.slideStartPos = -2.6;
    st.slideTargetPos = INITIAL_FLAVOR_INDEX;
    st.slideStartTime = performance.now();
    st.slideDuration = 1700;
    st.slideEaseMode = 'entrance';
    st.slideActive = true;
    st.revealFired = true;
  }, [reducedMotion]);

  // Mount WebGL stage & main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    document.documentElement.classList.add('gl');
    const stage = new BarStage(canvas);
    stageRef.current = stage;

    const handleResize = () => {
      canvas.style.height = `${window.innerHeight}px`;
      stage.resize(window.innerWidth, window.innerHeight);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let prevTime = performance.now();

    const stepLoop = (now: number) => {
      if (disposed) return;
      const dt = Math.min(50, Math.max(1, now - prevTime));
      prevTime = now;

      const st = animRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isPhone = vw < 820;

      // 1. Smooth wheel scrolling
      if (st.smoothActive) {
        const k = 1 - Math.exp(-dt / 120);
        st.smoothCurY += (st.smoothTargetY - st.smoothCurY) * k;
        window.scrollTo(0, st.smoothCurY);
        if (Math.abs(st.smoothTargetY - st.smoothCurY) < 0.5) {
          window.scrollTo(0, st.smoothTargetY);
          st.smoothActive = false;
        }
      }

      // 2. Hero slide tween
      if (st.slideActive) {
        const rawT = clamp((now - st.slideStartTime) / st.slideDuration, 0, 1);
        const eased =
          st.slideEaseMode === 'entrance'
            ? entranceEase(rawT)
            : slideEase(rawT);
        st.pos = lerp(st.slideStartPos, st.slideTargetPos, eased);

        if (!st.revealFired && rawT >= 0.12) {
          st.revealFired = true;
          triggerFlavorVisuals(st.revealPendingIdx, st.revealDir);
        }

        if (rawT >= 1) {
          st.pos = st.slideTargetPos;
          st.slideActive = false;
          if (!st.revealFired) {
            st.revealFired = true;
            triggerFlavorVisuals(st.revealPendingIdx, st.revealDir);
          }
        }
      }

      // 3. Autoplay check (every 3200 ms of no interaction, hero >= 60% in view)
      const heroEl = heroRef.current;
      const heroRect = heroEl?.getBoundingClientRect();
      const heroH = heroRect ? heroRect.height : vh;
      const heroVisiblePx = heroRect
        ? Math.max(0, Math.min(vh, heroRect.bottom) - Math.max(0, heroRect.top))
        : 0;
      const heroVisibleRatio = heroH > 0 ? heroVisiblePx / heroH : 0;

      if (
        st.entered &&
        st.autoplay &&
        !st.dragging &&
        !st.slideActive &&
        !reducedMotion &&
        document.visibilityState === 'visible' &&
        heroVisibleRatio >= 0.6 &&
        now - st.lastInteract >= 3200
      ) {
        goTo(st.target + 1);
      }

      // 4. Feathered colour circle reveal
      const uHero = isPhone
        ? Math.min(vw / 560, heroH / 980)
        : Math.min(vw / 1440, vh / 900);
      const arcCx = vw / 2;
      const arcCy = isPhone ? heroH * 0.4 : heroH / 2 - 78 * uHero;
      const spreadX = isPhone ? 1.02 : 1;

      if (st.colorRevealActive && revealRef.current) {
        const ct = clamp((now - st.colorRevealStart) / 420, 0, 1);
        const maxDist = Math.max(
          Math.hypot(arcCx, arcCy),
          Math.hypot(vw - arcCx, arcCy),
          Math.hypot(arcCx, heroH - arcCy),
          Math.hypot(vw - arcCx, heroH - arcCy)
        );
        const R = 1.45 * maxDist;
        const r = R * slideEase(ct);
        const f = Math.max(60, 0.35 * r);
        const mask = `radial-gradient(circle at ${arcCx.toFixed(1)}px ${arcCy.toFixed(1)}px, #000 ${Math.max(0, r - f).toFixed(1)}px, transparent ${r.toFixed(1)}px)`;
        revealRef.current.style.webkitMaskImage = mask;
        revealRef.current.style.maskImage = mask;

        if (ct >= 1) {
          finishColorReveal();
        }
      }

      // 5. Section 2 scroll, pinY, frames scaling, step flip, storm
      const sec2El = insideRef.current;
      const sec2Rect = sec2El?.getBoundingClientRect();
      const s2 = sec2Rect
        ? computeSection2Scroll(sec2Rect.top, sec2Rect.height, vh)
        : { p: 0, step: 0, q: 0, pinY: 0, visible: false };

      if (inFrontRef.current) {
        inFrontRef.current.classList.toggle('visible', s2.visible);
        inFrontRef.current.style.transform = `translate3d(0, ${s2.pinY.toFixed(2)}px, 0)`;
      }

      const frameScale = isPhone
        ? Math.min(vw / 390, vh / 780)
        : Math.min(vw / 1440, vh / 900);
      const frameTransform = `translate(-50%, -50%) scale(${frameScale.toFixed(5)})`;
      if (backFrameRef.current) backFrameRef.current.style.transform = frameTransform;
      if (frontFrameRef.current) frontFrameRef.current.style.transform = frameTransform;

      const frontFade = 1 - clamp(4 * s2.q, 0, 1);
      if (frontFrameRef.current) {
        frontFrameRef.current.style.opacity = String(frontFade);
      }
      if (numRef.current) {
        numRef.current.style.opacity = String(frontFade);
      }
      if (inDarkRef.current) {
        inDarkRef.current.style.opacity = String(clamp(3.5 * s2.q, 0, 1) * 0.42);
      }

      // Trigger Section 2 step flip on step change
      if (s2.step !== st.currentStep) {
        st.currentStep = s2.step;
        const targetRy = INSIDE_STEPS[s2.step].ry;

        if (reducedMotion) {
          st.flipCurrentRy = targetRy;
          st.flipActive = false;
          setDisplayStep(s2.step);
          setInsideFlavorIdx(mod(st.target, FLAVORS.length));
          setInsideTextKey((k) => k + 1);
        } else {
          const halfTurns = clamp(
            Math.abs(targetRy - st.flipCurrentRy) / 180,
            0.4,
            2
          );
          st.flipStartRy = st.flipCurrentRy;
          st.flipTargetRy = targetRy;
          st.flipStartTime = now;
          st.flipDuration = 720 * halfTurns;
          st.flipActive = true;
          st.stepTextSwapped = false;
          st.pendingStep = s2.step;
        }
      }

      if (st.flipActive) {
        const ft = clamp((now - st.flipStartTime) / st.flipDuration, 0, 1);
        st.flipCurrentRy = lerp(
          st.flipStartRy,
          st.flipTargetRy,
          sineEaseInOut(ft)
        );

        const swapAt = 0.38 * Math.min(st.flipDuration, 720);
        if (!st.stepTextSwapped && now - st.flipStartTime >= swapAt) {
          st.stepTextSwapped = true;
          const nextStep = st.pendingStep;
          const flavAtTarget = mod(st.target, FLAVORS.length);

          // Soft crossfade out
          const targets = [
            frontFrameRef.current?.querySelector('.in-head'),
            numRef.current,
            frontFrameRef.current?.querySelector('.in-cap'),
          ];
          targets.forEach((el) => {
            if (!el) return;
            el.getAnimations().forEach((a) => a.cancel());
            el.animate(
              [
                { translate: '0 0', opacity: 1 },
                { translate: '0 -10px', opacity: 0 },
              ],
              {
                duration: 240,
                easing: 'cubic-bezier(0.5, 0, 0.75, 0)',
                fill: 'forwards',
              }
            );
          });
          window.setTimeout(() => {
            setDisplayStep(nextStep);
            setInsideFlavorIdx(flavAtTarget);
            setInsideTextKey((k) => k + 1);
          }, 40);
        }

        if (ft >= 1) {
          st.flipCurrentRy = st.flipTargetRy;
          st.flipActive = false;
        }
      }

      // Update storm sprites
      const activeFlavorIdx = mod(st.target, FLAVORS.length);
      const activeBit = FLAVORS[activeFlavorIdx].bit;
      for (let i = 0; i < stormPieces.length; i++) {
        const el = stormPieceRefs.current[i];
        if (!el) continue;
        if (reducedMotion || s2.q <= 0 || s2.q >= 1) {
          el.style.opacity = '0';
          continue;
        }
        const t = computeStormPieceTransform(
          stormPieces[i],
          s2.q,
          vw,
          vh,
          activeBit
        );
        if (!t.visible) {
          el.style.opacity = '0';
          continue;
        }
        if (st.lastStormBits[i] !== t.bit) {
          st.lastStormBits[i] = t.bit;
          const crop = BIT_CROPS[t.bit];
          el.style.backgroundSize = crop.backgroundSize;
          el.style.backgroundPosition = crop.backgroundPosition;
        }
        const aspect = BITS[t.bit][3] / BITS[t.bit][2];
        el.style.width = `${t.sizePx.toFixed(1)}px`;
        el.style.height = `${(t.sizePx * aspect).toFixed(1)}px`;
        el.style.opacity = t.opacity.toFixed(3);
        el.style.transform = `translate3d(${(t.x - t.sizePx / 2).toFixed(1)}px, ${(t.y - (t.sizePx * aspect) / 2).toFixed(1)}px, 0) scale(${t.scale.toFixed(3)}) rotate(${t.rotDeg.toFixed(1)}deg)`;
      }

      // 6. Traveller transitions p1, p3
      const shopEl = shopRef.current;
      const shopRect = shopEl?.getBoundingClientRect();
      const rangeEl = rangeRef.current;
      const rangeRect = rangeEl?.getBoundingClientRect();

      const p1 = sec2Rect ? clamp(1 - sec2Rect.top / vh, 0, 1) : 0;
      const p3 = shopRect
        ? clamp((vh - shopRect.top) / (0.7 * vh), 0, 1)
        : 0;

      // On phones, first time p3 rises above 0, smoothly center live card
      if (isPhone && p3 > 0 && !st.phoneShopSnapped && shopGridRef.current) {
        st.phoneShopSnapped = true;
        const liveCard = shopGridRef.current.querySelector<HTMLElement>(
          `.card[data-flavor-card="${FLAVORS[activeFlavorIdx].id}"]`
        );
        if (liveCard) {
          const grid = shopGridRef.current;
          const targetLeft =
            liveCard.offsetLeft - (grid.clientWidth - liveCard.offsetWidth) / 2;
          grid.scrollTo({ left: targetLeft, behavior: reducedMotion ? 'auto' : 'smooth' });
        }
      }

      // Nav active section & theme
      let nextNav: NavSectionId = 'flavors';
      const threshold = vh * 0.35;
      if (sec2Rect && sec2Rect.top <= threshold) nextNav = 'inside';
      if (shopRect && shopRect.top <= threshold) nextNav = 'shop';
      if (rangeRect && rangeRect.top <= threshold) nextNav = 'range';

      let nextTheme: NavTheme = 'default';
      if (rangeRect && rangeRect.top <= 48) nextTheme = 'dark';
      else if (shopRect && shopRect.top <= 48) nextTheme = 'light';

      if (nextNav !== st.lastNav) {
        st.lastNav = nextNav;
        setActiveNav(nextNav);
      }
      if (nextTheme !== st.lastNavTheme) {
        st.lastNavTheme = nextTheme;
        setNavTheme(nextTheme);
      }

      // 7. Compute Hero pool bars & Traveller bar
      const jT = Math.round(st.target);
      const otherFade = 1 - clamp(1.6 * p1, 0, 1);
      const floorPos = Math.floor(st.pos);
      const poolEntries: {
        state: BarScreenState;
        flavorIdx: number;
        slotOffset: number;
      }[] = [];

      for (let j = floorPos - 5; j <= floorPos + 5; j++) {
        if (j === jT) continue;
        const k = j - st.pos;
        const s = computeArcSlot(k, arcCx, arcCy, uHero, spreadX, otherFade);
        if (!reducedMotion) {
          const b = Math.sin((now / 4600) * Math.PI * 2 + 1.37 * j);
          s.y -= (0.5 * b + 0.5) * 9 * uHero;
          s.rz += 0.4 * b;
        }
        poolEntries.push({
          state: s,
          flavorIdx: mod(j, FLAVORS.length),
          slotOffset: k,
        });
      }

      // Anchor A (hero)
      const kT = jT - st.pos;
      const A = computeArcSlot(kT, arcCx, arcCy, uHero, spreadX, 1);
      if (!reducedMotion) {
        const bT = Math.sin((now / 4600) * Math.PI * 2 + 1.37 * jT);
        A.y -= (0.5 * bT + 0.5) * 9 * uHero;
        A.rz += 0.4 * bT;
      }

      // Anchor B (section 2)
      const inBarRect = inBarRef.current?.getBoundingClientRect();
      const bBob = reducedMotion
        ? 0
        : Math.sin((now / 2600) * Math.PI * 2) * 6;
      const bRy = st.flipCurrentRy + (reducedMotion ? 0 : 720 * s2.q);
      const B: BarScreenState = inBarRect
        ? {
            x: inBarRect.left + inBarRect.width / 2,
            y: inBarRect.top + inBarRect.height / 2 + bBob,
            h: inBarRect.height,
            rz: 14,
            ry: bRy,
            rx: 0,
            z: 0,
            op: 1,
            sx: 1,
            sy: 1,
            shadow: 1,
          }
        : A;

      // Anchor C (live shop card)
      const pkRect = livePkRef.current?.getBoundingClientRect();
      let pokeSx = 1;
      let pokeSy = 1;
      if (st.pokeActive) {
        const pt = clamp((now - st.pokeStart) / 500, 0, 1);
        if (pt < 0.3) {
          const u = pt / 0.3;
          pokeSx = lerp(1, 1.06, u);
          pokeSy = lerp(1, 0.93, u);
        } else if (pt < 0.6) {
          const u = (pt - 0.3) / 0.3;
          pokeSx = lerp(1.06, 0.97, u);
          pokeSy = lerp(0.93, 1.04, u);
        } else {
          const u = (pt - 0.6) / 0.4;
          pokeSx = lerp(0.97, 1, u);
          pokeSy = lerp(1.04, 1, u);
        }
        if (pt >= 1) st.pokeActive = false;
      }

      const C: BarScreenState = pkRect
        ? {
            x: pkRect.left + pkRect.width / 2,
            y: pkRect.top + pkRect.height / 2,
            h: pkRect.height,
            rz: 0,
            ry:
              Math.round(B.ry / 360) * 360 + liveTiltRef.current.tiltX * 14,
            rx: -liveTiltRef.current.tiltY * 14,
            z: 30,
            op: 1,
            sx: pokeSx,
            sy: pokeSy,
            shadow: 0.7,
          }
        : B;

      const traveller = computeTravellerState(A, B, C, p1, p3);

      stage.updateBars(poolEntries, {
        state: traveller,
        flavorIdx: mod(jT, FLAVORS.length),
        slotOffset: kT,
      });
      stage.render();

      if (stage.isSoftwareGl) {
        timerId = stage.afterDraw(() => {
          if (!disposed) {
            rafId = requestAnimationFrame(stepLoop);
          }
        });
      } else {
        rafId = requestAnimationFrame(stepLoop);
      }
    };

    rafId = requestAnimationFrame(stepLoop);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      stage.dispose();
      stageRef.current = null;
    };
  }, [
    finishColorReveal,
    goTo,
    reducedMotion,
    stormPieces,
    triggerFlavorVisuals,
  ]);

  // Smooth wheel scroll (desktop mouse/trackpad only) + keyboard navigation
  useEffect(() => {
    const isCoarseOnly =
      window.matchMedia('(pointer: coarse)').matches &&
      !window.matchMedia('(any-pointer: fine)').matches;

    const handleWheel = (e: WheelEvent) => {
      if (
        reducedMotion ||
        isCoarseOnly ||
        e.ctrlKey ||
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ||
        document.body.classList.contains('locked') ||
        drawerRef.current !== null
      ) {
        return;
      }
      e.preventDefault();
      const st = animRef.current;
      if (!st.smoothActive) {
        st.smoothCurY = window.scrollY;
        st.smoothTargetY = window.scrollY;
        st.smoothActive = true;
      }
      const mult =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      st.smoothTargetY = clamp(
        st.smoothTargetY + e.deltaY * mult,
        0,
        maxScroll
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (drawerRef.current !== null) return;
      if (
        e.key === 'PageDown' ||
        e.key === 'PageUp' ||
        e.key === 'Home' ||
        e.key === 'End' ||
        e.key === ' '
      ) {
        animRef.current.smoothActive = false;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const heroEl = heroRef.current;
        if (!heroEl) return;
        const r = heroEl.getBoundingClientRect();
        const vis = Math.max(
          0,
          Math.min(window.innerHeight, r.bottom) - Math.max(0, r.top)
        );
        if (vis / Math.max(1, r.height) >= 0.5) {
          goTo(animRef.current.target + (e.key === 'ArrowRight' ? 1 : -1));
        }
      }
    };

    const handleNativePointer = (e: PointerEvent) => {
      // Stop smooth wheel scroll if user grabs native scrollbar
      if (e.clientX >= document.documentElement.clientWidth) {
        animRef.current.smoothActive = false;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handleNativePointer);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handleNativePointer);
    };
  }, [goTo, reducedMotion]);

  // Hero arc pointer drag / tap / cursor hover handlers
  const handleArcPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const st = animRef.current;
    st.pointerDown = true;
    st.dragging = false;
    st.pointerId = e.pointerId;
    st.startX = e.clientX;
    st.lastX = e.clientX;
    st.lastTime = performance.now();
    st.pos0 = st.pos;
    st.vel = 0;
    st.lastInteract = performance.now();
  };

  const handleArcPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = animRef.current;
    const arcEl = arcRef.current;

    if (!st.pointerDown) {
      if (e.pointerType === 'mouse' && arcEl && stageRef.current) {
        const hit = stageRef.current.hitTestHeroBar(e.clientX, e.clientY);
        arcEl.classList.toggle('over-bar', hit !== null);
      }
      return;
    }

    const now = performance.now();
    st.lastInteract = now;
    const dx = e.clientX - st.startX;

    if (!st.dragging && Math.abs(dx) > 6) {
      st.dragging = true;
      st.slideActive = false;
      document.body.classList.add('dragging');
      try {
        arcEl?.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    if (st.dragging) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const heroH = heroRef.current?.getBoundingClientRect().height || vh;
      const isPhone = vw < 820;
      const uHero = isPhone
        ? Math.min(vw / 560, heroH / 980)
        : Math.min(vw / 1440, vh / 900);
      const spreadX = isPhone ? 1.02 : 1;
      const slotPx = Math.max(40, 245 * uHero * spreadX);

      const dt = Math.max(1, now - st.lastTime);
      const stepDx = e.clientX - st.lastX;
      const sampleVel = -stepDx / slotPx / dt;
      st.vel = lerp(st.vel, sampleVel, 0.4);
      st.lastX = e.clientX;
      st.lastTime = now;
      st.pos = st.pos0 - dx / slotPx;
    }
  };

  const finishArcDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    isCancel: boolean
  ) => {
    const st = animRef.current;
    if (!st.pointerDown) return;
    st.pointerDown = false;
    st.lastInteract = performance.now();

    if (st.dragging) {
      st.dragging = false;
      document.body.classList.remove('dragging');
      try {
        arcRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      if (isCancel && Math.abs(st.pos - Math.round(st.pos)) < 0.02) {
        return;
      }
      const snap = Math.round(st.pos + clamp(st.vel * 220, -2, 2));
      const dur = Math.max(
        380,
        650 * Math.min(1, Math.abs(snap - st.pos) + 0.35)
      );
      goTo(snap, dur);
      return;
    }

    if (!isCancel && stageRef.current) {
      const hitK = stageRef.current.hitTestHeroBar(e.clientX, e.clientY);
      if (hitK !== null && Math.round(hitK) !== 0) {
        goTo(st.target + Math.round(hitK));
      }
    }
  };

  const handleNavigate = (id: NavSectionId) => {
    animRef.current.smoothActive = false;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  const handleSelectStep = (stepIdx: number) => {
    const sec2 = insideRef.current;
    if (!sec2) return;
    animRef.current.smoothActive = false;
    const rect = sec2.getBoundingClientRect();
    const secTopDoc = window.scrollY + rect.top;
    const travel = Math.max(1, rect.height - window.innerHeight);
    const pMid = stepIdx * 0.19 + 0.095;
    window.scrollTo({
      top: secTopDoc + pMid * travel,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  const handleSelectFlavorCard = (idx: number) => {
    const st = animRef.current;
    const curIdx = mod(st.target, FLAVORS.length);
    if (curIdx === idx) return;
    let diff = idx - curIdx;
    if (diff > 2) diff -= 5;
    if (diff < -2) diff += 5;
    goTo(st.target + diff);
  };

  const handlePokeLiveBar = () => {
    if (reducedMotion) return;
    animRef.current.pokeActive = true;
    animRef.current.pokeStart = performance.now();
  };

  const incrementCartItem = (itemToAdd: Omit<CartItem, 'qty'>) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === itemToAdd.id);
      if (existing) {
        return prev.map((i) =>
          i.id === itemToAdd.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...itemToAdd, qty: 1 }];
    });
    setBadgePopKey((k) => k + 1);
  };

  const handleAddBag = (flavorIdx: number, sourceEl: HTMLElement) => {
    const flav = FLAVORS[flavorIdx];
    flySpritesToCart(
      [{ sourceEl, delayMs: 0 }],
      basketBtnRef.current,
      reducedMotion,
      () => {
        setBasketBumpKey((k) => k + 1);
      },
      () => {
        incrementCartItem({
          id: `bag-${flav.id}`,
          type: 'bag',
          flavorIndices: [flavorIdx],
          title: `${flav.name} (80 g)`,
          unitPrice: flav.price,
        });
      }
    );
  };

  const handleAddPackToCart = (
    slots: (number | null)[],
    slotEls: HTMLElement[],
    onEmptied: () => void
  ) => {
    const validSlots = slots.filter((s): s is number => s !== null);
    if (validSlots.length < 3) return;
    const flyItems = slotEls.map((el, i) => ({
      sourceEl: el,
      delayMs: i * 120,
    }));

    window.setTimeout(() => {
      onEmptied();
    }, 60);

    flySpritesToCart(
      flyItems,
      basketBtnRef.current,
      reducedMotion,
      () => {
        setBasketBumpKey((k) => k + 1);
      },
      () => {
        const sorted = [...validSlots].sort((a, b) => a - b);
        const names = validSlots.map((i) => FLAVORS[i].name).join(', ');
        incrementCartItem({
          id: `pack-${sorted.join('-')}`,
          type: 'pack',
          flavorIndices: validSlots,
          title: `Combo (${names})`,
          unitPrice: 540,
        });
      }
    );
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  return (
    <>
      <canvas id="gl" ref={canvasRef} data-testid="gl-canvas" />

      <IntroOverlay
        reducedMotion={reducedMotion}
        onEnterHero={handleEnterHero}
      />

      <Navbar
        entered={entered}
        activeSection={activeNav}
        navTheme={navTheme}
        cartCount={cartCount}
        badgePopKey={badgePopKey}
        basketBumpKey={basketBumpKey}
        onNavigate={handleNavigate}
        onOpenCart={() => setDrawer('cart')}
        onOpenOffer={() => setDrawer('offer')}
        onOpenDibs={() => setDrawer('dibs')}
        basketBtnRef={basketBtnRef}
      />

      <main>
        <HeroSection
          entered={entered}
          activeIdx={activeIdx}
          titleDisplayIdx={titleDisplayIdx}
          titleSwapKey={titleSwapKey}
          titleDir={titleDir}
          countDisplayIdx={countDisplayIdx}
          countSwapKey={countSwapKey}
          autoplay={autoplay}
          reducedMotion={reducedMotion}
          onToggleAutoplay={() => {
            animRef.current.lastInteract = performance.now();
            setAutoplay((a) => !a);
          }}
          onNext={() => goTo(animRef.current.target + 1)}
          arcRef={arcRef}
          revealRef={revealRef}
          sectionRef={heroRef}
          onPointerDown={handleArcPointerDown}
          onPointerMove={handleArcPointerMove}
          onPointerUp={(e) => finishArcDrag(e, false)}
          onPointerCancel={(e) => finishArcDrag(e, true)}
        />

        <InsideSection
          sectionRef={insideRef}
          inBarRef={inBarRef}
          inDarkRef={inDarkRef}
          inFrontRef={inFrontRef}
          frontFrameRef={frontFrameRef}
          backFrameRef={backFrameRef}
          numRef={numRef}
          stormPieceRefs={stormPieceRefs}
          displayStep={displayStep}
          displayFlavorIdx={insideFlavorIdx}
          textSwapKey={insideTextKey}
          reducedMotion={reducedMotion}
          onSelectStep={handleSelectStep}
        />

        <ShopSection
          sectionRef={shopRef}
          gridRef={shopGridRef}
          activeFlavorIdx={activeIdx}
          livePkRef={livePkRef}
          liveTiltRef={liveTiltRef}
          reducedMotion={reducedMotion}
          onSelectFlavorCard={handleSelectFlavorCard}
          onPokeLiveBar={handlePokeLiveBar}
          onAddBag={handleAddBag}
        />

        <BuilderSection
          sectionRef={rangeRef}
          activeFlavorIdx={activeIdx}
          reducedMotion={reducedMotion}
          onAddPackToCart={handleAddPackToCart}
        />
      </main>

      <ShopDrawers
        drawer={drawer}
        cartItems={cartItems}
        onClose={() => setDrawer(null)}
        onUpdateQty={(id, delta) => {
          setCartItems((prev) =>
            prev
              .map((item) =>
                item.id === id ? { ...item, qty: item.qty + delta } : item
              )
              .filter((item) => item.qty > 0)
          );
        }}
        onClearCart={() => setCartItems([])}
      />
    </>
  );
}
