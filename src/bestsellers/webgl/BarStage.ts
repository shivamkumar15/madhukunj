import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BAR_ASPECT, FLAVORS, SHEET_URL } from '../data/flavors';
import {
  buildAllFlavorTextures,
  createShadowTexture,
  createWrapperGeometries,
  type FlavorTexturePair,
  type WrapperGeometries,
} from '../utils/barTextures';
import { clamp, type BarScreenState } from '../utils/strideMath';

interface BarInstance {
  group: THREE.Group;
  frontMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>;
  backMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>;
  shadowMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  frontMat: THREE.MeshPhysicalMaterial;
  backMat: THREE.MeshPhysicalMaterial;
  shadowMat: THREE.MeshBasicMaterial;
  flavorIdx: number;
  slotOffset: number;
}

const DEG = Math.PI / 180;

export function detectSoftwareGl(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class BarStage {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly isSoftwareGl: boolean;

  private geometries: WrapperGeometries;
  private shadowTexture: THREE.CanvasTexture;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget;
  private flavorTextures: FlavorTexturePair[] = [];
  private poolBars: BarInstance[] = [];
  private travellerBar: BarInstance;
  private raycaster = new THREE.Raycaster();
  private pointerNDC = new THREE.Vector2();
  private vw = window.innerWidth;
  private vh = window.innerHeight;
  private texturesReady = false;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, onTexturesReady?: () => void) {
    this.canvas = canvas;
    this.isSoftwareGl = detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 10, 10000);

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRT = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(-0.6, 0.9, 1.4);
    this.scene.add(key);

    this.geometries = createWrapperGeometries();
    this.shadowTexture = createShadowTexture();

    for (let i = 0; i < 11; i++) {
      this.poolBars.push(this.createBarInstance());
    }
    this.travellerBar = this.createBarInstance();

    this.resize(window.innerWidth, window.innerHeight);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      if (this.disposed) return;
      this.flavorTextures = await buildAllFlavorTextures(img);
      if (this.disposed) return;
      this.texturesReady = true;
      for (const b of this.poolBars) {
        this.applyFlavorTexture(b, b.flavorIdx);
      }
      this.applyFlavorTexture(this.travellerBar, this.travellerBar.flavorIdx);
      if (!this.isSoftwareGl) {
        this.renderer.compile(this.scene, this.camera);
      }
      onTexturesReady?.();
    };
    img.src = SHEET_URL;
  }

  private createBarInstance(): BarInstance {
    const frontMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.5,
      roughness: 0.45,
      metalness: 0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.32,
      envMapIntensity: 0.42,
    });
    const backMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.5,
      roughness: 0.45,
      metalness: 0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.32,
      envMapIntensity: 0.42,
    });
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    });

    const frontMesh = new THREE.Mesh(this.geometries.front, frontMat);
    const backMesh = new THREE.Mesh(this.geometries.back, backMat);
    const group = new THREE.Group();
    group.rotation.order = 'ZYX';
    group.add(frontMesh, backMesh);
    group.visible = false;

    const shadowMesh = new THREE.Mesh(this.geometries.shadow, shadowMat);
    shadowMesh.renderOrder = -1;
    shadowMesh.visible = false;

    this.scene.add(shadowMesh, group);

    return {
      group,
      frontMesh,
      backMesh,
      shadowMesh,
      frontMat,
      backMat,
      shadowMat,
      flavorIdx: 1,
      slotOffset: 0,
    };
  }

  private applyFlavorTexture(bar: BarInstance, flavorIdx: number) {
    const idx = ((flavorIdx % FLAVORS.length) + FLAVORS.length) % FLAVORS.length;
    bar.flavorIdx = idx;
    if (!this.texturesReady) return;
    const pair = this.flavorTextures[idx];
    if (!pair) return;
    if (bar.frontMat.map !== pair.front) {
      bar.frontMat.map = pair.front;
      bar.frontMat.needsUpdate = true;
    }
    if (bar.backMat.map !== pair.back) {
      bar.backMat.map = pair.back;
      bar.backMat.needsUpdate = true;
    }
  }

  resize(vw: number, vh: number) {
    this.vw = Math.max(1, vw);
    this.vh = Math.max(1, vh);
    const D = clamp(
      1500 * Math.min(this.vw / 1440, this.vh / 900),
      1000,
      2200
    );
    const fov = 2 * Math.atan(this.vh / 2 / D) * (180 / Math.PI);
    this.camera.fov = fov;
    this.camera.aspect = this.vw / this.vh;
    this.camera.near = 10;
    this.camera.far = 4 * D;
    this.camera.position.set(0, 0, D);
    this.camera.updateProjectionMatrix();

    const dpr = this.isSoftwareGl
      ? 1
      : this.vw < 820
        ? Math.min(window.devicePixelRatio || 1, 1.75)
        : Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.vw, this.vh, false);
  }

  private placeBar(
    bar: BarInstance,
    state: BarScreenState,
    flavorIdx: number,
    slotOffset: number
  ) {
    this.applyFlavorTexture(bar, flavorIdx);
    bar.slotOffset = slotOffset;

    if (!this.texturesReady || state.op <= 0.01) {
      bar.group.visible = false;
      bar.shadowMesh.visible = false;
      return;
    }

    bar.group.visible = true;
    const baseScale = state.h / BAR_ASPECT;
    bar.group.position.set(
      state.x - this.vw / 2,
      this.vh / 2 - state.y,
      state.z
    );
    bar.group.scale.set(baseScale * state.sx, baseScale * state.sy, baseScale);
    bar.group.rotation.set(
      state.rx * DEG,
      state.ry * DEG,
      -state.rz * DEG
    );

    bar.frontMat.opacity = state.op;
    bar.backMat.opacity = state.op;

    const shadowOp = 0.5 * state.op * state.shadow;
    if (shadowOp <= 0.005) {
      bar.shadowMesh.visible = false;
    } else {
      bar.shadowMesh.visible = true;
      bar.shadowMesh.position.set(
        state.x - this.vw / 2,
        this.vh / 2 - (state.y + 0.05 * state.h),
        state.z - 0.32 * state.h
      );
      bar.shadowMesh.rotation.set(0, 0, -state.rz * DEG);
      const cosRy = Math.max(0.3, Math.abs(Math.cos(state.ry * DEG)));
      bar.shadowMesh.scale.set(
        baseScale * cosRy * state.sx,
        baseScale * state.sy,
        1
      );
      bar.shadowMat.opacity = shadowOp;
    }
  }

  updateBars(
    poolEntries: readonly {
      state: BarScreenState;
      flavorIdx: number;
      slotOffset: number;
    }[],
    travellerEntry: {
      state: BarScreenState;
      flavorIdx: number;
      slotOffset: number;
    }
  ) {
    for (let i = 0; i < this.poolBars.length; i++) {
      const entry = poolEntries[i];
      if (!entry) {
        this.poolBars[i].group.visible = false;
        this.poolBars[i].shadowMesh.visible = false;
      } else {
        this.placeBar(
          this.poolBars[i],
          entry.state,
          entry.flavorIdx,
          entry.slotOffset
        );
      }
    }

    this.placeBar(
      this.travellerBar,
      travellerEntry.state,
      travellerEntry.flavorIdx,
      travellerEntry.slotOffset
    );
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  afterDraw(cb: () => void): number {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      return window.setTimeout(cb, 80);
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (status === gl.UNSIGNALED) {
        window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        window.setTimeout(cb, 80);
      }
    };
    return window.setTimeout(poll, 5);
  }

  /**
   * Raycasts against visible hero bars and returns the hit bar's slotOffset (k) or null.
   */
  hitTestHeroBar(clientX: number, clientY: number): number | null {
    if (!this.texturesReady) return null;
    this.pointerNDC.x = (clientX / this.vw) * 2 - 1;
    this.pointerNDC.y = -(clientY / this.vh) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);

    const targets: THREE.Object3D[] = [];
    const ownerMap = new Map<THREE.Object3D, BarInstance>();

    const register = (b: BarInstance) => {
      if (!b.group.visible) return;
      targets.push(b.frontMesh, b.backMesh);
      ownerMap.set(b.frontMesh, b);
      ownerMap.set(b.backMesh, b);
    };

    register(this.travellerBar);
    for (const b of this.poolBars) register(b);

    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length === 0) return null;
    const bar = ownerMap.get(hits[0].object);
    return bar ? bar.slotOffset : null;
  }

  dispose() {
    this.disposed = true;
    this.geometries.front.dispose();
    this.geometries.back.dispose();
    this.geometries.shadow.dispose();
    this.shadowTexture.dispose();
    for (const pair of this.flavorTextures) {
      pair.front.dispose();
      pair.back.dispose();
    }
    for (const b of [...this.poolBars, this.travellerBar]) {
      b.frontMat.dispose();
      b.backMat.dispose();
      b.shadowMat.dispose();
    }
    this.envRT.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
  }
}
