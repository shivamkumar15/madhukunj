import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARTWORK_SHEET_URL, PRINTS } from '../data/prints';
import {
  computeWalkSlotTarget,
  easeExpoOut,
  evaluateCameraPose,
  getFocusPose,
  getWalkOffset,
  getWalkPose,
  getWebGLUV,
  INNER_PRINT_COUNT,
  interpolateFocusPose,
  nearestOuterAngleForPrint,
  OUTER_PRINT_COUNT,
  PRINT_CENTER_Y,
  PRINT_HEIGHT,
  PRINT_WIDTH,
  RING_INNER_RADIUS,
  RING_OUTER_RADIUS,
  shortestAngleCopy,
  WALL_HEIGHT,
  type CameraPose,
  type WallSide,
} from '../utils/galleryMath';

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GalleryController {
  stepSlot: (delta: number) => void;
  stepBack: () => void;
  focusPrint: (printIndex: number) => void;
}

interface GalleryCanvasProps {
  controllerRef: React.RefObject<GalleryController | null>;
  active: boolean;
  onIntroReady: () => void;
  onFocusChange: (focused: boolean, printIndex: number | null) => void;
  onPillChange: (visible: boolean, pos: { x: number; y: number }) => void;
  onOpenPrint: (printIndex: number, rect: ScreenRect | null) => void;
}

interface PrintMeshMeta {
  printIndex: number;
  wall: WallSide;
  angle: number;
  slotIndex: number;
}

const SMALL_SCREEN_QUERY =
  '(max-width: 819px), (orientation: portrait) and (max-width: 1100px), (orientation: landscape) and (max-height: 500px)';

// Only the products placed on the two walls need WebGL materials/labels.
const GALLERY_PRINT_COUNT = Math.min(
  PRINTS.length,
  OUTER_PRINT_COUNT + INNER_PRINT_COUNT,
);

const _vCorner = new THREE.Vector3();
const _lookVec = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createVerticalGradientTexture(
  stops: Array<[number, string]>,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [offset, color] of stops) {
    grad.addColorStop(offset, color);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFloorGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const innerR = (512 * RING_INNER_RADIUS) / RING_OUTER_RADIUS;
  const grad = ctx.createRadialGradient(512, 512, innerR, 512, 512, 512);
  grad.addColorStop(0, '#EDD6B0');
  grad.addColorStop(0.55, '#F3E1C3');
  grad.addColorStop(1, '#EFDAB8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRadialSpotTexture(
  innerColor: string,
  outerColor: string,
  innerStop: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 128 * innerStop, 128, 128, 128);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawLabelCanvas(
  canvas: HTMLCanvasElement,
  printIndex: number,
): void {
  const p = PRINTS[printIndex];
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#3A3550';
  ctx.font = '500 58px "Newsreader", Georgia, serif';
  ctx.fillText(p.productType.toUpperCase(), 30, 82);

  ctx.fillStyle = '#3A3550';
  ctx.font = 'italic 400 54px "Newsreader", Georgia, serif';
  ctx.fillText(p.title, 30, 150);

  ctx.fillStyle = 'rgba(58, 53, 80, 0.7)';
  ctx.font = '400 30px "DM Mono", ui-monospace, monospace';
  ctx.fillText(`${p.price} INR`, 30, 215);
}

export function GalleryCanvas({
  controllerRef,
  active,
  onIntroReady,
  onFocusChange,
  onPillChange,
  onOpenPrint,
}: GalleryCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [veilHidden, setVeilHidden] = useState(false);
  const [isDraggingUI, setIsDraggingUI] = useState(false);
  const [isPointerUI, setIsPointerUI] = useState(false);

  const callbacksRef = useRef({
    onIntroReady,
    onFocusChange,
    onPillChange,
    onOpenPrint,
  });
  callbacksRef.current = {
    onIntroReady,
    onFocusChange,
    onPillChange,
    onOpenPrint,
  };

  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareGl();
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const smallScreenQuery = window.matchMedia(SMALL_SCREEN_QUERY);

    const isSmall = () => smallScreenQuery.matches;
    const isPortraitSmall = () =>
      smallScreenQuery.matches && window.innerHeight > window.innerWidth;
    const isReducedMotion = () => reducedMotionQuery.matches;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFF9EC);
    scene.fog = new THREE.Fog(0xFFF9EC, 10, 46);

    scene.add(new THREE.HemisphereLight(0xfffdf6, 0xe9cfa6, 1.55));
    scene.add(new THREE.AmbientLight(0xfff6e6, 0.55));

    const camera = new THREE.PerspectiveCamera(
      window.innerWidth >= window.innerHeight ? 56 : 70,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.05,
      100,
    );

    const disposables: Array<{ dispose: () => void }> = [];

    // Room geometry
    const outerWallGeo = new THREE.CylinderGeometry(
      RING_OUTER_RADIUS,
      RING_OUTER_RADIUS,
      WALL_HEIGHT,
      160,
      1,
      true,
    );
    const outerWallTex = createVerticalGradientTexture([
      [0, '#F5EBD8'],
      [0.2, '#FBF3E3'],
      [0.6, '#FBF3E3'],
      [0.86, '#F8EDD9'],
      [1, '#EFDFC4'],
    ]);
    const outerWallMat = new THREE.MeshBasicMaterial({
      map: outerWallTex,
      side: THREE.BackSide,
    });
    const outerWall = new THREE.Mesh(outerWallGeo, outerWallMat);
    outerWall.position.y = WALL_HEIGHT / 2;
    scene.add(outerWall);
    disposables.push(outerWallGeo, outerWallTex, outerWallMat);

    const innerWallGeo = new THREE.CylinderGeometry(
      RING_INNER_RADIUS,
      RING_INNER_RADIUS,
      WALL_HEIGHT,
      120,
      1,
      true,
    );
    const innerWallTex = createVerticalGradientTexture([
      [0, '#F7EEDD'],
      [0.3, '#FFFAF0'],
      [0.8, '#FDF5E6'],
      [1, '#F1E1C6'],
    ]);
    const innerWallMat = new THREE.MeshBasicMaterial({
      map: innerWallTex,
      side: THREE.FrontSide,
    });
    const innerWall = new THREE.Mesh(innerWallGeo, innerWallMat);
    innerWall.position.y = WALL_HEIGHT / 2;
    scene.add(innerWall);
    disposables.push(innerWallGeo, innerWallTex, innerWallMat);

    const floorGeo = new THREE.CircleGeometry(RING_OUTER_RADIUS, 160);
    const floorTex = createFloorGradientTexture();
    const floorMat = new THREE.MeshBasicMaterial({ map: floorTex });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    disposables.push(floorGeo, floorTex, floorMat);

    const ceilingGeo = new THREE.CircleGeometry(RING_OUTER_RADIUS, 160);
    const ceilingMat = new THREE.MeshBasicMaterial({
      color: 0xFAF1E0,
      side: THREE.BackSide,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = -Math.PI / 2;
    ceiling.position.y = WALL_HEIGHT;
    scene.add(ceiling);
    disposables.push(ceilingGeo, ceilingMat);

    // Shared print assets
    const haloGeo = new THREE.PlaneGeometry(2.1 * PRINT_WIDTH, 1.75 * PRINT_HEIGHT);
    const shadowGeo = new THREE.PlaneGeometry(1.25 * PRINT_WIDTH, 1.18 * PRINT_HEIGHT);
    const frameGeo = new THREE.BoxGeometry(PRINT_WIDTH + 0.07, PRINT_HEIGHT + 0.07, 0.06);
    const printGeo = new THREE.PlaneGeometry(PRINT_WIDTH, PRINT_HEIGHT);
    const labelGeo = new THREE.PlaneGeometry(0.92, (0.92 * 260) / 640);

    const haloTex = createRadialSpotTexture(
      'rgba(255, 255, 255, 0.95)',
      'rgba(255, 255, 255, 0)',
      0.35,
    );
    const shadowTex = createRadialSpotTexture(
      'rgba(120, 90, 50, 0.28)',
      'rgba(120, 90, 50, 0)',
      0.25,
    );

    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    const frameMat = new THREE.MeshBasicMaterial({ color: 0xD3AA72 });

    disposables.push(
      haloGeo,
      shadowGeo,
      frameGeo,
      printGeo,
      labelGeo,
      haloTex,
      shadowTex,
      haloMat,
      shadowMat,
      frameMat,
    );

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const printMaterials: THREE.MeshBasicMaterial[] = [];
    const labelCanvases: HTMLCanvasElement[] = [];
    const labelTextures: THREE.CanvasTexture[] = [];
    const labelMaterials: THREE.MeshBasicMaterial[] = [];

    for (let i = 0; i < GALLERY_PRINT_COUNT; i++) {
      const pMat = new THREE.MeshBasicMaterial({ color: 0xF6EAD8 });
      printMaterials.push(pMat);
      disposables.push(pMat);

      const lCanvas = document.createElement('canvas');
      lCanvas.width = 640;
      lCanvas.height = 260;
      drawLabelCanvas(lCanvas, i);
      const lTex = new THREE.CanvasTexture(lCanvas);
      lTex.colorSpace = THREE.SRGBColorSpace;
      lTex.anisotropy = maxAniso;
      const lMat = new THREE.MeshBasicMaterial({
        map: lTex,
        transparent: true,
        depthWrite: false,
      });
      labelCanvases.push(lCanvas);
      labelTextures.push(lTex);
      labelMaterials.push(lMat);
      disposables.push(lTex, lMat);
    }

    const printMeshes: THREE.Mesh[] = [];
    const outerPrintMeshes: THREE.Mesh[] = [];

    function addPrintGroup(
      printIndex: number,
      wall: WallSide,
      angle: number,
      slotIndex: number,
    ) {
      const group = new THREE.Group();
      const radius = wall === 'outer' ? 17.98 : 12.22;
      const gx = radius * Math.cos(angle);
      const gz = radius * Math.sin(angle);
      group.position.set(gx, 0, gz);

      if (wall === 'outer') {
        group.lookAt(0, 0, 0);
      } else {
        group.lookAt(2 * gx, 0, 2 * gz);
      }

      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(0, PRINT_CENTER_Y + 0.05, 0.005);
      group.add(halo);

      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.position.set(0.05, PRINT_CENTER_Y - 0.06, 0.01);
      group.add(shadow);

      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(0, PRINT_CENTER_Y, 0.045);
      group.add(frame);

      const printMesh = new THREE.Mesh(printGeo, printMaterials[printIndex]);
      printMesh.position.set(0, PRINT_CENTER_Y, 0.077);
      const meta: PrintMeshMeta = { printIndex, wall, angle, slotIndex };
      printMesh.userData = meta;
      group.add(printMesh);

      const label = new THREE.Mesh(labelGeo, labelMaterials[printIndex]);
      label.position.set(
        -PRINT_WIDTH / 2 + 0.46,
        PRINT_CENTER_Y - PRINT_HEIGHT / 2 - 0.42,
        0.02,
      );
      group.add(label);

      scene.add(group);
      printMeshes.push(printMesh);
      if (wall === 'outer') {
        outerPrintMeshes.push(printMesh);
      }
    }

    for (let s = 0; s < OUTER_PRINT_COUNT; s++) {
      const angle = (s * Math.PI * 2) / OUTER_PRINT_COUNT;
      addPrintGroup(s % PRINTS.length, 'outer', angle, s);
    }

    for (let k = 0; k < INNER_PRINT_COUNT; k++) {
      const angle = ((k + 0.5) * Math.PI * 2) / INNER_PRINT_COUNT;
      addPrintGroup((k + OUTER_PRINT_COUNT) % PRINTS.length, 'inner', angle, k);
    }

    // Camera & motion state
    let walkOffset = getWalkOffset(isPortraitSmall());
    let th = walkOffset;
    let targetTh = walkOffset;
    let currentPose: CameraPose = getWalkPose(th, isPortraitSmall());

    let introStarted = false;
    let introDone = false;
    let introStartMs = 0;
    let introFromPose: CameraPose = {
      ...currentPose,
      th: walkOffset + 0.16,
      r: currentPose.r - 0.35,
    };

    let focusedMesh: THREE.Mesh | null = null;
    let glideActive = false;
    let glideStartMs = 0;
    let glideDurationMs = 950;
    let glideFrom: CameraPose = { ...currentPose };
    let glideTo: CameraPose = { ...currentPose };
    let glideTargetMesh: THREE.Mesh | null = null;

    function applyPoseToCamera(pose: CameraPose) {
      const { position, lookAt } = evaluateCameraPose(pose);
      camera.position.set(position[0], position[1], position[2]);
      _lookVec.set(lookAt[0], lookAt[1], lookAt[2]);
      camera.lookAt(_lookVec);
    }

    function getMeshScreenRect(mesh: THREE.Mesh): ScreenRect {
      mesh.updateWorldMatrix(true, false);
      const hw = PRINT_WIDTH / 2;
      const hh = PRINT_HEIGHT / 2;
      const corners = [
        [-hw, -hh, 0],
        [hw, -hh, 0],
        [hw, hh, 0],
        [-hw, hh, 0],
      ];

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      for (const [cx, cy, cz] of corners) {
        _vCorner.set(cx, cy, cz).applyMatrix4(mesh.matrixWorld).project(camera);
        const sx = ((_vCorner.x + 1) * 0.5) * vw;
        const sy = ((-_vCorner.y + 1) * 0.5) * vh;
        if (sx < minX) minX = sx;
        if (sy < minY) minY = sy;
        if (sx > maxX) maxX = sx;
        if (sy > maxY) maxY = sy;
      }

      return {
        left: minX,
        top: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
    }

    function updateSmallScreenPill() {
      if (focusedMesh && !glideActive && isSmall() && activeRef.current) {
        const rect = getMeshScreenRect(focusedMesh);
        callbacksRef.current.onPillChange(true, {
          x: rect.left + rect.width * 0.5,
          y: rect.top + rect.height * 0.55,
        });
      }
    }

    // Render scheduling (on-demand + afterDraw on software WebGL)
    let disposed = false;
    let loopRunning = false;
    let frameHandle = 0;
    let lastTickMs = performance.now();

    function scheduleNextFrame() {
      if (disposed || loopRunning) return;
      loopRunning = true;
      lastTickMs = performance.now();
      if (isSoftwareGl) {
        frameHandle = window.setTimeout(tick, 0);
      } else {
        frameHandle = requestAnimationFrame(tick);
      }
    }

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== 'function') {
        frameHandle = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameHandle = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameHandle = window.setTimeout(cb, 80);
        }
      };
      frameHandle = window.setTimeout(poll, 5);
    }

    function requestRender() {
      scheduleNextFrame();
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.1, Math.max(0.001, (now - lastTickMs) / 1000));
      lastTickMs = now;

      let stillAnimating = false;

      if (introStarted && !introDone) {
        const dur = isReducedMotion() ? 0 : 1400;
        const t = dur === 0 ? 1 : (now - introStartMs) / dur;
        const eased = easeExpoOut(t);
        const dest = getWalkPose(walkOffset, isPortraitSmall());
        currentPose = {
          th: introFromPose.th + (dest.th - introFromPose.th) * eased,
          r: introFromPose.r + (dest.r - introFromPose.r) * eased,
          yaw: dest.yaw,
          y: dest.y,
          pitch: dest.pitch,
        };
        th = currentPose.th;
        targetTh = walkOffset;
        if (t >= 1) {
          introDone = true;
          currentPose = dest;
          th = walkOffset;
        } else {
          stillAnimating = true;
        }
      } else if (glideActive) {
        const dur = isReducedMotion() ? 0 : glideDurationMs;
        const t = dur === 0 ? 1 : (now - glideStartMs) / dur;
        currentPose = interpolateFocusPose(glideFrom, glideTo, t);
        th = currentPose.th;
        if (t >= 1) {
          glideActive = false;
          currentPose = { ...glideTo };
          th = currentPose.th;
          targetTh = th;
          updateSmallScreenPill();
        } else {
          stillAnimating = true;
        }
      } else if (!focusedMesh) {
        // Walking mode
        const diff = targetTh - th;
        if (Math.abs(diff) > 1e-5) {
          if (isReducedMotion()) {
            th = targetTh;
          } else {
            th += diff * (1 - Math.exp(-dt / 0.36));
            stillAnimating = true;
          }
        } else {
          th = targetTh;
        }
        currentPose = getWalkPose(th, isPortraitSmall());
      }

      applyPoseToCamera(currentPose);
      renderer.render(scene, camera);

      if (stillAnimating) {
        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameHandle = requestAnimationFrame(tick);
        }
      } else {
        loopRunning = false;
      }
    }

    // Initial render before veil lifts
    applyPoseToCamera(introFromPose);
    renderer.render(scene, camera);

    // Asset + font readiness gating for opening animation
    let sheetReady = false;
    let fontsReady = false;

    function maybeStartIntro() {
      if (introStarted || disposed) return;
      if (!sheetReady || !fontsReady) return;
      introStarted = true;
      introStartMs = performance.now();
      introFromPose = {
        ...getWalkPose(walkOffset, isPortraitSmall()),
        th: walkOffset + 0.16,
        r: getWalkPose(walkOffset, isPortraitSmall()).r - 0.35,
      };
      setVeilHidden(true);
      callbacksRef.current.onIntroReady();
      requestRender();
    }

    const failsafeTimer = window.setTimeout(() => {
      sheetReady = true;
      fontsReady = true;
      maybeStartIntro();
    }, 4000);

    // Load artwork sheet with crossOrigin="anonymous"
    const sheetImg = new Image();
    sheetImg.crossOrigin = 'anonymous';
    sheetImg.onload = () => {
      if (disposed) return;
      const baseTex = new THREE.Texture(sheetImg);
      baseTex.colorSpace = THREE.SRGBColorSpace;
      baseTex.needsUpdate = true;
      disposables.push(baseTex);

      for (let i = 0; i < GALLERY_PRINT_COUNT; i++) {
        const uv = getWebGLUV(i);
        const tex = baseTex.clone();
        tex.image = sheetImg;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAniso;
        tex.repeat.set(uv.repeatX, uv.repeatY);
        tex.offset.set(uv.offsetX, uv.offsetY);
        tex.needsUpdate = true;
        disposables.push(tex);

        printMaterials[i].map = tex;
        printMaterials[i].color.setHex(0xffffff);
        printMaterials[i].needsUpdate = true;
      }

      sheetReady = true;
      requestRender();
      maybeStartIntro();
    };
    sheetImg.onerror = () => {
      sheetReady = true;
      maybeStartIntro();
    };
    sheetImg.src = ARTWORK_SHEET_URL;

    document.fonts.ready.then(() => {
      if (disposed) return;
      for (let i = 0; i < GALLERY_PRINT_COUNT; i++) {
        drawLabelCanvas(labelCanvases[i], i);
        labelTextures[i].needsUpdate = true;
      }
      fontsReady = true;
      requestRender();
      maybeStartIntro();
    });

    // Focus / step-back helpers
    function startFocusGlide(mesh: THREE.Mesh) {
      const meta = mesh.userData as PrintMeshMeta;
      const targetAngle = shortestAngleCopy(meta.angle, th);
      focusedMesh = mesh;
      glideTargetMesh = mesh;
      glideFrom = { ...currentPose };
      glideTo = getFocusPose(meta.wall, targetAngle, isPortraitSmall());
      glideStartMs = performance.now();
      glideDurationMs = 950;
      glideActive = true;
      introDone = true;

      callbacksRef.current.onPillChange(false, { x: 0, y: 0 });
      callbacksRef.current.onFocusChange(true, meta.printIndex);
      requestRender();
    }

    function stepBack() {
      if (!focusedMesh && !glideTargetMesh) return;
      focusedMesh = null;
      glideTargetMesh = null;
      const destTh = th + walkOffset;
      targetTh = destTh;
      glideFrom = { ...currentPose };
      glideTo = getWalkPose(destTh, isPortraitSmall());
      glideStartMs = performance.now();
      glideDurationMs = 950;
      glideActive = true;

      callbacksRef.current.onPillChange(false, { x: 0, y: 0 });
      callbacksRef.current.onFocusChange(false, null);
      requestRender();
    }

    function stepSlot(deltaSlots: number) {
      if (focusedMesh) {
        stepBack();
      }
      introDone = true;
      targetTh = computeWalkSlotTarget(targetTh, walkOffset, deltaSlots);
      requestRender();
    }

    function focusPrintInRoom(printIndex: number) {
      const targetAngle = nearestOuterAngleForPrint(printIndex, th);
      let bestMesh = outerPrintMeshes[0];
      let bestDiff = Infinity;
      for (const m of outerPrintMeshes) {
        const meta = m.userData as PrintMeshMeta;
        const copy = shortestAngleCopy(meta.angle, th);
        const diff = Math.abs(copy - targetAngle);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestMesh = m;
        }
      }
      if (bestMesh) {
        startFocusGlide(bestMesh);
      }
    }

    controllerRef.current = {
      stepSlot,
      stepBack,
      focusPrint: focusPrintInRoom,
    };

    // Raycaster & pointer interaction
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let isPointerDown = false;
    let dragged = false;
    let downX = 0;
    let downY = 0;
    let downTh = th;

    function raycastPrints(clientX: number, clientY: number): THREE.Mesh | null {
      pointerNdc.x = (clientX / window.innerWidth) * 2 - 1;
      pointerNdc.y = -(clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(printMeshes, false);
      return hits.length > 0 ? (hits[0].object as THREE.Mesh) : null;
    }

    const canvasEl = renderer.domElement;

    function onWheel(e: WheelEvent) {
      if (!activeRef.current) return;
      e.preventDefault();
      if (focusedMesh) {
        stepBack();
      }
      introDone = true;
      const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      targetTh += -dy * 0.0016;
      requestRender();
    }

    function onPointerDown(e: PointerEvent) {
      if (!activeRef.current || e.button !== 0) return;
      isPointerDown = true;
      dragged = false;
      downX = e.clientX;
      downY = e.clientY;
      downTh = targetTh;
      canvasEl.setPointerCapture?.(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      if (!activeRef.current) return;

      if (isPointerDown) {
        const dx = e.clientX - downX;
        const dy = e.clientY - downY;
        if (!dragged && Math.hypot(dx, dy) > 6) {
          dragged = true;
          setIsDraggingUI(true);
          if (focusedMesh) {
            stepBack();
            downTh = targetTh;
          }
        }
        if (dragged) {
          introDone = true;
          const deltaPx = Math.abs(dx) > Math.abs(dy) ? dx : dy;
          const factor = isSmall() ? 0.0042 : 0.0022;
          targetTh = downTh + deltaPx * factor;
          callbacksRef.current.onPillChange(false, { x: 0, y: 0 });
          requestRender();
        }
        return;
      }

      // Hover check on desktop
      if (!isSmall()) {
        const hit = raycastPrints(e.clientX, e.clientY);
        setIsPointerUI(!!hit);
        if (focusedMesh && hit === focusedMesh && !glideActive) {
          callbacksRef.current.onPillChange(true, {
            x: e.clientX,
            y: e.clientY,
          });
        } else {
          callbacksRef.current.onPillChange(false, { x: 0, y: 0 });
        }
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (!isPointerDown) return;
      isPointerDown = false;
      setIsDraggingUI(false);
      canvasEl.releasePointerCapture?.(e.pointerId);

      if (!activeRef.current) return;
      if (dragged) {
        dragged = false;
        return;
      }

      const hit = raycastPrints(e.clientX, e.clientY);
      if (hit) {
        if (focusedMesh === hit) {
          const meta = hit.userData as PrintMeshMeta;
          const rect = getMeshScreenRect(hit);
          callbacksRef.current.onPillChange(false, { x: 0, y: 0 });
          callbacksRef.current.onOpenPrint(meta.printIndex, rect);
        } else {
          startFocusGlide(hit);
        }
      } else if (focusedMesh) {
        stepBack();
      }
    }

    function onPointerCancel() {
      isPointerDown = false;
      dragged = false;
      setIsDraggingUI(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!activeRef.current) return;
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        return;
      }

      if (e.key === 'Escape' && focusedMesh) {
        e.preventDefault();
        stepBack();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        stepSlot(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        stepSlot(-1);
      }
    }

    function onResize() {
      const w = window.innerWidth;
      const h = Math.max(1, window.innerHeight);
      camera.fov = w >= h ? 56 : 70;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      walkOffset = getWalkOffset(isPortraitSmall());
      updateSmallScreenPill();
      requestRender();
    }

    function onContextLost(e: Event) {
      e.preventDefault();
    }

    canvasEl.addEventListener('wheel', onWheel, { passive: false });
    canvasEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    canvasEl.addEventListener('webglcontextlost', onContextLost);

    return () => {
      disposed = true;
      window.clearTimeout(failsafeTimer);
      cancelAnimationFrame(frameHandle);
      clearTimeout(frameHandle);
      canvasEl.removeEventListener('wheel', onWheel);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      canvasEl.removeEventListener('webglcontextlost', onContextLost);

      for (const d of disposables) {
        d.dispose();
      }
      renderer.dispose();
      if (canvasEl.parentNode === mount) {
        mount.removeChild(canvasEl);
      }
    };
  }, [controllerRef]);

  return (
    <main
      id="gallery"
      data-testid="gallery-canvas"
      className={`${isDraggingUI ? 'is-dragging' : isPointerUI ? 'is-pointer' : ''}`}
    >
      <div
        ref={mountRef}
        className="w-full h-full"
        style={{ opacity: active ? 1 : 0 }}
      />
      <div id="veil" className={veilHidden ? 'is-hidden' : ''} aria-hidden="true" />
    </main>
  );
}
