import * as THREE from "three";
import {
  CC_FIXED_DT,
  EYE,
  FLOOR_ORDER,
  FLOOR_Z,
  PLAYER_RADIUS,
  SPRINT_SPEED,
  WALK_SPEED,
} from "./constants";
import { moveCharacter } from "./controller";
import {
  corridorAt,
  coreRooms,
  isOutside,
  isWalkable,
  roomAt,
  SPAWN,
  SPAWN_DOOR,
  toBible,
} from "./layout";
import type { FloorId, GameMode, GameSnapshot } from "./types";
import { SHOT_BY_ID, type ShotId } from "./shots";
import { createWorld, type WorldHandle } from "./world";
import { nightEnv } from "./textures";

export type Engine = {
  snapshot: () => GameSnapshot;
  setMode: (mode: GameMode) => void;
  setFloor: (floor: FloorId) => void;
  setShot: (id: ShotId) => void;
  teleportTo: (floor: FloorId, x: number, y: number) => void;
  setLabels: (v: boolean) => void;
  resize: () => void;
  dispose: () => void;
};

type Keys = Set<string>;

export function mountEngine(
  canvas: HTMLCanvasElement,
  onChange: () => void,
): Engine {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvas.clientWidth || 1280, canvas.clientHeight || 720, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;
  renderer.setClearColor(0x07080c, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07080c, 0.011);

  const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.12, 420);
  scene.add(camera);
  const hemi = new THREE.HemisphereLight(0x8aa0b8, 0x1a120c, 0.45);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xc8d4e8, 0.55);
  moon.position.set(-40, 80, 30);
  scene.add(moon);
  const fill = new THREE.DirectionalLight(0xf0d4a0, 0.18);
  fill.position.set(20, 20, 60);
  scene.add(fill);
  const entry = new THREE.PointLight(0xf3d7a0, 22, 32, 1.6);
  entry.position.set(0, 5.5, 44);
  scene.add(entry);
  const courtLight = new THREE.PointLight(0x9aaa90, 10, 44, 2);
  courtLight.position.set(0, 10, 0);
  scene.add(courtLight);
  const gateLamp = new THREE.PointLight(0xf3d7a0, 14, 28, 1.8);
  gateLamp.position.set(0, 6.8, 86);
  scene.add(gateLamp);
  const kppLamp = new THREE.PointLight(0xf3d7a0, 9, 14, 2);
  kppLamp.position.set(-11, 3.4, 79);
  scene.add(kppLamp);
  const driveLamp = new THREE.PointLight(0xf3d7a0, 11, 20, 1.8);
  driveLamp.position.set(0, 6.6, 58);
  scene.add(driveLamp);
  const plazaLamp = new THREE.PointLight(0xf3d7a0, 10, 18, 1.8);
  plazaLamp.position.set(0, 6.6, 46);
  scene.add(plazaLamp);
  const eastGateLamp = new THREE.PointLight(0xf3d7a0, 8, 16, 2);
  eastGateLamp.position.set(10, 6.6, 86);
  scene.add(eastGateLamp);
  const torch = new THREE.SpotLight(0xf6e4b8, 6.5, 24, Math.PI / 6, 0.45, 1.1);
  torch.position.set(0.15, 0.05, 0.2);
  torch.target.position.set(0, 0, -6);
  camera.add(torch);
  camera.add(torch.target);

  const world: WorldHandle = createWorld();
  scene.add(world.root);
  world.attachRain(camera);
  world.setRainVisible(true, false);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envSrc = nightEnv();
  scene.environment = pmrem.fromEquirectangular(envSrc).texture;
  scene.environmentIntensity = 0.55;
  envSrc.dispose();
  pmrem.dispose();

  let mode: GameMode = "title";
  let floor: FloorId = "F1";
  let shotId: ShotId = "gate";
  let x = SPAWN.x;
  let y = SPAWN.y;
  let yaw = SPAWN.yaw;
  let pitch = -0.12;
  let speed = 0;
  let labels = true;
  let locked = false;
  const keys: Keys = new Set();
  let injectKeys: string[] | null = null;
  let raf = 0;
  let last = performance.now();
  let orbitA = 0.55;
  let orbitY = 28;
  let orbitD = 92;
  let planH = 55;
  let bob = 0;
  let touchLook: { id: number; x: number; y: number } | null = null;
  let stick = { x: 0, y: 0 };
  let hudAcc = 0;
  let physAcc = 0;

  world.setInteriorFloor(floor);
  world.setMassingVisible(true);

  const held = (): Keys => {
    if (injectKeys) return new Set(injectKeys);
    return keys;
  };

  function syncVis() {
    const outside = mode === "shot" || mode === "orbit" || mode === "title" || isOutside(floor, x, y);
    const inside = (mode === "walk" || mode === "plan") && !outside;
    world.setMassingVisible(!inside);
    world.setRainVisible(!inside && mode !== "plan", mode === "walk");
    torch.visible = mode === "walk";
    scene.fog = inside ? null : new THREE.FogExp2(0x07080c, 0.011);
    renderer.toneMappingExposure = inside ? 1.12 : 0.88;
    hemi.intensity = inside ? 0.9 : 0.45;
    moon.intensity = inside ? 0.22 : 0.55;
  }

  function applyCamera() {
    const zUp = FLOOR_Z[floor] + EYE;
    if (mode === "shot") {
      const s = SHOT_BY_ID[shotId];
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
      camera.position.set(s.pos[0], s.pos[1], s.pos[2]);
      camera.lookAt(s.look[0], s.look[1], s.look[2]);
      return;
    }
    if (camera.fov !== 72) {
      camera.fov = 72;
      camera.updateProjectionMatrix();
    }
    if (mode === "orbit" || mode === "title") {
      const cxn = Math.sin(orbitA) * orbitD;
      const cz = Math.cos(orbitA) * orbitD;
      camera.position.set(cxn, orbitY, cz);
      camera.lookAt(0, 8, 8);
      return;
    }
    if (mode === "plan") {
      camera.position.set(x, FLOOR_Z[floor] + planH, -y);
      camera.up.set(0, 0, -1);
      camera.lookAt(x, FLOOR_Z[floor], -y);
      camera.up.set(0, 1, 0);
      return;
    }
    const bobY = Math.sin(bob) * (speed > 0.4 ? 0.035 : 0);
    camera.position.set(x, zUp + bobY, -y);
    const cyaw = yaw;
    const cp = pitch;
    const lx = x + -Math.sin(cyaw) * Math.cos(cp);
    const ly = zUp + bobY + Math.sin(cp);
    const lz = -y + -Math.cos(cyaw) * Math.cos(cp);
    camera.lookAt(lx, ly, lz);
  }

  function tryMove(nx: number, ny: number) {
    const moved = moveCharacter(floor, x, y, nx - x, ny - y);
    x = moved.x;
    y = moved.y;
  }

  function walkPhysics(dt: number) {
    const k = held();
    const sprint = k.has("ShiftLeft") || k.has("ShiftRight");
    const sp = sprint ? SPRINT_SPEED : WALK_SPEED;
    let fx = 0;
    let fy = 0;
    const fwdX = -Math.sin(yaw);
    const fwdY = Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightY = Math.sin(yaw);
    if (k.has("KeyW") || k.has("ArrowUp")) {
      fx += fwdX;
      fy += fwdY;
    }
    if (k.has("KeyS") || k.has("ArrowDown")) {
      fx -= fwdX;
      fy -= fwdY;
    }
    if (k.has("KeyD") || k.has("ArrowRight")) {
      fx += rightX;
      fy += rightY;
    }
    if (k.has("KeyA") || k.has("ArrowLeft")) {
      fx -= rightX;
      fy -= rightY;
    }
    fx += stick.x * rightX + stick.y * fwdX;
    fy += stick.x * rightY + stick.y * fwdY;
    const len = Math.hypot(fx, fy);
    if (len > 1e-4) {
      fx /= len;
      fy /= len;
      tryMove(x + fx * sp * dt, y + fy * sp * dt);
      speed = sp;
      bob += dt * (sprint ? 14 : 10);
    } else {
      speed = 0;
    }
  }

  function step(now: number) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    if (mode === "title") {
      orbitA += dt * 0.08;
      applyCamera();
    } else if (mode === "orbit") {
      const k = held();
      if (k.has("KeyA") || k.has("ArrowLeft")) orbitA -= dt * 0.9;
      if (k.has("KeyD") || k.has("ArrowRight")) orbitA += dt * 0.9;
      if (k.has("KeyW") || k.has("ArrowUp")) orbitD = Math.max(28, orbitD - dt * 28);
      if (k.has("KeyS") || k.has("ArrowDown")) orbitD = Math.min(160, orbitD + dt * 28);
      applyCamera();
    } else if (mode === "walk") {
      physAcc += dt;
      if (physAcc > 0.2) physAcc = 0.2;
      while (physAcc >= CC_FIXED_DT) {
        walkPhysics(CC_FIXED_DT);
        physAcc -= CC_FIXED_DT;
      }
      applyCamera();
      hudAcc += dt;
      if (hudAcc > 0.12) {
        hudAcc = 0;
        syncVis();
        onChange();
      }
    } else if (mode === "plan") {
      const k = held();
      if (k.has("KeyW") || k.has("ArrowUp")) tryMove(x, y + 18 * dt);
      if (k.has("KeyS") || k.has("ArrowDown")) tryMove(x, y - 18 * dt);
      if (k.has("KeyD") || k.has("ArrowRight")) tryMove(x + 18 * dt, y);
      if (k.has("KeyA") || k.has("ArrowLeft")) tryMove(x - 18 * dt, y);
      if (k.has("Equal") || k.has("NumpadAdd")) planH = Math.max(14, planH - 28 * dt);
      if (k.has("Minus") || k.has("NumpadSubtract")) planH = Math.min(140, planH + 28 * dt);
      applyCamera();
    } else if (mode === "shot") {
      applyCamera();
    } else {
      applyCamera();
    }

    world.tick(dt, camera.position);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(step);
  }

  function onKeyDown(e: KeyboardEvent) {
    keys.add(e.code);
    if ((e.code === "KeyE" || e.code === "KeyQ") && mode === "walk") {
      const cores = coreRooms(floor);
      const here = cores.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
      if (here) {
        const idx = FLOOR_ORDER.indexOf(floor);
        const next =
          e.code === "KeyE"
            ? FLOOR_ORDER[Math.max(0, idx - 1)]
            : FLOOR_ORDER[Math.min(FLOOR_ORDER.length - 1, idx + 1)];
        if (next && next !== floor) setFloor(next, true);
      }
    }
    if (e.code === "KeyC") {
      setMode(mode === "orbit" ? "walk" : "orbit");
    }
    if (e.code === "KeyM") {
      setMode(mode === "plan" ? "walk" : "plan");
    }
    if (e.code === "Digit1") setShot("gate");
    if (e.code === "Digit2") setShot("gate-car");
    if (e.code === "Digit3") setShot("gate-taxi");
    if (e.code === "KeyP") {
      setMode(mode === "shot" ? "walk" : "shot");
    }
    if (e.code === "KeyG" || e.code === "KeyF") {
      if (locked) document.exitPointerLock();
    }
    if (e.code === "Escape" && locked) {
      document.exitPointerLock();
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }

  function onMouse(e: MouseEvent) {
    if (!locked || mode !== "walk") return;
    yaw -= e.movementX * 0.0022;
    pitch -= e.movementY * 0.0022;
    const lim = Math.PI / 2 - 0.04;
    if (pitch > lim) pitch = lim;
    if (pitch < -lim) pitch = -lim;
  }

  function onLockChange() {
    locked = document.pointerLockElement === canvas;
    onChange();
  }

  canvas.addEventListener("click", () => {
    if (mode === "title") return;
    if (mode === "walk") {
      try {
        const req = canvas.requestPointerLock as (opts?: { unadjustedMovement?: boolean }) => Promise<void> | void;
        const result = req.call(canvas, { unadjustedMovement: true });
        if (result && typeof result.catch === "function") {
          result.catch(() => canvas.requestPointerLock());
        }
      } catch {
        canvas.requestPointerLock();
      }
    }
  });

  canvas.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    if (!t) return;
    const r = canvas.getBoundingClientRect();
    const px = t.clientX - r.left;
    if (px < r.width * 0.42) {
      stick = { x: 0, y: 0 };
    } else {
      touchLook = { id: t.identifier, x: t.clientX, y: t.clientY };
    }
  }, { passive: true });
  canvas.addEventListener("touchmove", (e) => {
    const r = canvas.getBoundingClientRect();
    for (const t of Array.from(e.changedTouches)) {
      const px = t.clientX - r.left;
      if (touchLook && t.identifier === touchLook.id) {
        yaw -= (t.clientX - touchLook.x) * 0.004;
        pitch -= (t.clientY - touchLook.y) * 0.004;
        const lim = Math.PI / 2 - 0.04;
        pitch = Math.max(-lim, Math.min(lim, pitch));
        touchLook.x = t.clientX;
        touchLook.y = t.clientY;
      } else if (px < r.width * 0.42) {
        const cxn = r.width * 0.18;
        const cy = r.height * 0.72;
        stick.x = Math.max(-1, Math.min(1, (t.clientX - r.left - cxn) / 56));
        stick.y = Math.max(-1, Math.min(1, -(t.clientY - r.top - cy) / 56));
      }
    }
  }, { passive: true });
  canvas.addEventListener("touchend", () => {
    touchLook = null;
    stick = { x: 0, y: 0 };
  });

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", () => keys.clear());
  document.addEventListener("mousemove", onMouse);
  document.addEventListener("pointerlockchange", onLockChange);

  function resize() {
    const w = canvas.clientWidth || 1280;
    const h = canvas.clientHeight || 720;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (mode !== "plan" && mode !== "orbit") return;
      e.preventDefault();
      if (mode === "plan") {
        planH = Math.min(140, Math.max(14, planH * (e.deltaY < 0 ? 0.88 : 1.14)));
      } else {
        orbitD = Math.min(160, Math.max(28, orbitD + (e.deltaY > 0 ? 10 : -10)));
      }
    },
    { passive: false },
  );

  function setFloor(next: FloorId, keepXy = false) {
    floor = next;
    world.setInteriorFloor(next);
    if (!keepXy) {
      if (next === "F1") {
        x = SPAWN_DOOR.x;
        y = SPAWN_DOOR.y;
      } else if (next === "R") {
        x = 0;
        y = -28;
      } else {
        x = 0;
        y = -23.5;
      }
    } else if (!isWalkable(floor, x, y, 0.1)) {
      x = 0;
      y = next === "R" ? -28 : -23.5;
    }
    syncVis();
    onChange();
  }

  function dressCars() {
    if (mode !== "shot") world.setVehicles("all");
    else world.setVehicles(SHOT_BY_ID[shotId].cars);
  }

  function setShot(id: ShotId) {
    shotId = id;
    mode = "shot";
    if (locked) document.exitPointerLock();
    dressCars();
    syncVis();
    onChange();
  }

  function setMode(next: GameMode) {
    mode = next;
    if (next !== "walk" && locked) document.exitPointerLock();
    if (next === "orbit" || next === "title") {
      orbitA = 0.55;
      orbitY = next === "title" ? 32 : 28;
      orbitD = next === "title" ? 98 : 80;
    }
    if (next === "shot" && !SHOT_BY_ID[shotId]) shotId = "gate";
    dressCars();
    syncVis();
    onChange();
  }

  function snapshot(): GameSnapshot {
    const room = roomAt(floor, x, y);
    const cor = corridorAt(floor, x, y);
    return {
      mode,
      floor,
      roomId: room?.id ?? cor?.id ?? null,
      roomName: room?.name ?? cor?.name ?? (floor === "R" ? "Кровля" : "Территория"),
      x,
      y,
      z: FLOOR_Z[floor],
      yaw,
      speed,
      locked,
      labels,
      shotId: mode === "shot" ? shotId : null,
    };
  }

  window.__controlsTest = {
    getYaw: () => yaw,
    getSpeed: () => speed,
    setKeys: (codes) => {
      injectKeys = codes.length ? codes : null;
    },
    getPosition: () => ({ x, y: FLOOR_Z[floor] + EYE, z: -y }),
    setYaw: (v) => {
      yaw = v;
    },
  };
  window.__hospital = {
    teleport: (f, tx, tz) => {
      const b = toBible(tx, tz);
      teleportTo(f, b.x, b.y);
    },
    setFloor: (f) => setFloor(f),
    setMode,
    setShot: (id) => setShot(id as ShotId),
    walkable: (bx: number, by: number) => isWalkable(floor, bx, by, PLAYER_RADIUS),
  };

  function teleportTo(f: FloorId, bx: number, by: number) {
    floor = f;
    world.setInteriorFloor(f);
    x = bx;
    y = by;
    if (mode === "title") mode = "walk";
    syncVis();
    onChange();
  }

  applyCamera();
  raf = requestAnimationFrame(step);

  function dispose() {
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", resize);
    document.removeEventListener("mousemove", onMouse);
    document.removeEventListener("pointerlockchange", onLockChange);
    world.dispose();
    renderer.dispose();
    delete window.__controlsTest;
    delete window.__hospital;
  }

  return {
    snapshot,
    setMode,
    setShot,
    setFloor,
    teleportTo,
    setLabels: (v) => {
      labels = v;
      onChange();
    },
    resize,
    dispose,
  };
}
