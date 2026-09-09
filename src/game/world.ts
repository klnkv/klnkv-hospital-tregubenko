import * as THREE from "three";
import { CLEAR_H, FLOOR_Z, NEW_WING_X } from "./constants";
import {
  allRooms,
  corridorsOn,
  cx,
  cy,
  doorEdge,
  rd,
  roomsOn,
  rw,
} from "./layout";
import { SHOTS } from "./shots";
import * as tex from "./textures";
import type { FloorId, RoomDef, RoomType } from "./types";

const _tmp = new THREE.Object3D();

function mat(
  color: string,
  opts: {
    map?: THREE.Texture;
    rough?: number;
    metal?: number;
    emissive?: string;
    em?: number;
    roughMap?: THREE.Texture;
    env?: number;
  } = {},
) {
  return new THREE.MeshStandardMaterial({
    color,
    ...(opts.map ? { map: opts.map } : {}),
    roughness: opts.rough ?? 0.86,
    metalness: opts.metal ?? 0.02,
    ...(opts.roughMap ? { roughnessMap: opts.roughMap } : {}),
    envMapIntensity: opts.env ?? 1,
    emissive: opts.emissive ? new THREE.Color(opts.emissive) : 0x000000,
    emissiveIntensity: opts.em ?? 0,
  });
}

function wet(
  color: string,
  opts: {
    map?: THREE.Texture;
    rough?: number;
    metal?: number;
    coat?: number;
    coatRough?: number;
    roughMap?: THREE.Texture;
    env?: number;
  } = {},
) {
  return new THREE.MeshPhysicalMaterial({
    color,
    ...(opts.map ? { map: opts.map } : {}),
    roughness: opts.rough ?? 0.42,
    metalness: opts.metal ?? 0.06,
    ...(opts.roughMap ? { roughnessMap: opts.roughMap } : {}),
    clearcoat: opts.coat ?? 0.45,
    clearcoatRoughness: opts.coatRough ?? 0.28,
    envMapIntensity: opts.env ?? 1.1,
  });
}

class Instancer {
  mesh: THREE.InstancedMesh;
  n = 0;
  readonly max: number;
  constructor(geo: THREE.BufferGeometry, material: THREE.Material, max: number, parent: THREE.Object3D) {
    this.max = max;
    this.mesh = new THREE.InstancedMesh(geo, material, max);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.count = 0;
    parent.add(this.mesh);
  }
  reset() {
    this.n = 0;
  }
  add(x: number, y: number, z: number, sx: number, sy: number, sz: number, rotY = 0) {
    if (this.n >= this.max) return;
    _tmp.position.set(x, y, z);
    _tmp.rotation.set(0, rotY, 0);
    _tmp.scale.set(sx, sy, sz);
    _tmp.updateMatrix();
    this.mesh.setMatrixAt(this.n++, _tmp.matrix);
  }
  commit() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export type WorldHandle = {
  root: THREE.Group;
  interior: THREE.Group;
  massing: THREE.Group;
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
  setInteriorFloor: (floor: FloorId) => void;
  setMassingVisible: (v: boolean) => void;
  setVehicles: (mode: "all" | "none" | "car" | "taxi") => void;
  attachRain: (cam: THREE.Camera) => void;
  setRainVisible: (v: boolean, lens?: boolean) => void;
  tick: (dt: number, cam: THREE.Vector3) => void;
  dispose: () => void;
};

export function createWorld(): WorldHandle {
  const root = new THREE.Group();
  root.name = "hospital-root";
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const trackG = (g: THREE.BufferGeometry) => (geos.push(g), g);
  const trackM = <T extends THREE.Material>(m: T) => (mats.push(m), m);

  const box = trackG(new THREE.BoxGeometry(1, 1, 1));
  const cyl = trackG(new THREE.CylinderGeometry(1, 1, 1, 12));
  const plane = trackG(new THREE.PlaneGeometry(1, 1));
  const sphere = trackG(new THREE.SphereGeometry(1, 12, 8));

  const plasterOld = trackM(mat("#b7b09f", { map: tex.plaster("#b7b09f"), rough: 0.72, env: 0.55 }));
  const plasterNew = trackM(mat("#c5c8c6", { map: tex.plaster("#c5c8c6", 10), rough: 0.62, env: 0.5 }));
  plasterNew.side = THREE.DoubleSide;
  const plasterIn = trackM(mat("#cfc6b4", { map: tex.plaster("#cfc6b4"), rough: 0.9 }));
  plasterIn.side = THREE.DoubleSide;
  const sage = trackM(mat("#7d8b78", { rough: 0.88 }));
  sage.side = THREE.DoubleSide;
  const sageNew = trackM(mat("#8a9aa0", { rough: 0.8 }));
  sageNew.side = THREE.DoubleSide;
  const floorOld = trackM(mat("#8a7a62", { map: tex.linoleum("#8a7a62"), rough: 0.7 }));
  const floorNew = trackM(mat("#6e7678", { map: tex.linoleum("#6e7678"), rough: 0.65 }));
  const floorCor = trackM(mat("#5c564c", { map: tex.linoleum("#5c564c"), rough: 0.75 }));
  const ceilM = trackM(mat("#d4cec2", { rough: 0.95 }));
  const concreteM = trackM(mat("#6a6862", { map: tex.concrete(), rough: 0.88, env: 0.4 }));
  const asphaltM = trackM(
    wet("#1a1c1e", {
      map: tex.asphalt(),
      rough: 0.34,
      metal: 0.08,
      coat: 0.62,
      coatRough: 0.22,
      roughMap: tex.asphaltRough(),
      env: 1.35,
    }),
  );
  const grassM = trackM(mat("#1a2214", { map: tex.grass(), rough: 0.92, env: 0.25 }));
  const brickM = trackM(mat("#6a5044", { map: tex.brick(), rough: 0.82, env: 0.35 }));
  const walkM = trackM(wet("#6a6862", { map: tex.sidewalk(), rough: 0.48, coat: 0.25, coatRough: 0.4, env: 0.7 }));
  const puddleM = trackM(
    wet("#070a0e", { rough: 0.04, metal: 0.02, coat: 1, coatRough: 0.04, env: 1.85 }),
  );
  puddleM.transparent = true;
  puddleM.opacity = 0.82;
  const zebraM = trackM(wet("#cfc8b8", { map: tex.zebra(), rough: 0.38, coat: 0.35, env: 0.9 }));
  const taxiM = trackM(wet("#c4a24a", { rough: 0.28, metal: 0.12, coat: 0.55, coatRough: 0.18, env: 1.2 }));
  const sedanM = trackM(wet("#2a3036", { rough: 0.24, metal: 0.18, coat: 0.7, coatRough: 0.14, env: 1.3 }));
  const rubberM = trackM(mat("#121214", { rough: 0.95 }));
  const glassCar = trackM(mat("#1a2228", { rough: 0.08, metal: 0.45, env: 1.4 }));
  glassCar.transparent = true;
  glassCar.opacity = 0.55;
  const woodM = trackM(mat("#4a3828", { map: tex.wood(), rough: 0.7 }));
  const walnutM = trackM(mat("#6a4630", { map: tex.walnut(), rough: 0.48, env: 0.55 }));
  const metalM = trackM(mat("#8a9094", { map: tex.metal(), rough: 0.35, metal: 0.7, env: 1.1 }));
  const darkMetal = trackM(mat("#2a2e30", { map: tex.rustMetal(), rough: 0.42, metal: 0.55, env: 0.8 }));
  const fenceM = trackM(mat("#2a2c28", { map: tex.rustMetal(), rough: 0.48, metal: 0.42, env: 0.7 }));
  const linen = trackM(mat("#d8d2c6", { rough: 0.95 }));
  const parquetM = trackM(
    wet("#8a6a44", { map: tex.parquet(), rough: 0.32, coat: 0.28, coatRough: 0.35, env: 0.7 }),
  );
  const tileKitM = trackM(mat("#c8c2b4", { map: tex.kitchenTile(), rough: 0.32, env: 0.4 }));
  const clothM = trackM(mat("#efe6d2", { map: tex.damask(), rough: 0.72 }));
  const napkinM = trackM(mat("#f4eee4", { map: tex.napkin(), rough: 0.88 }));
  const velvetM = trackM(mat("#2c362c", { map: tex.velvet(), rough: 0.78 }));
  const rugM = trackM(mat("#3a2820", { map: tex.rug(), rough: 0.92 }));
  const copperM = trackM(mat("#b56a32", { map: tex.copper(), rough: 0.28, metal: 0.72, env: 1.15 }));
  const chinaM = trackM(
    wet("#f4efe6", { map: tex.china(), rough: 0.14, coat: 0.72, coatRough: 0.12, env: 0.85 }),
  );
  const silverM = trackM(
    wet("#c5ccd2", { map: tex.silver(), rough: 0.12, metal: 0.92, coat: 0.55, coatRough: 0.18, env: 1.55 }),
  );
  const tomatoM = trackM(
    wet("#c43824", { map: tex.tomato(), rough: 0.36, coat: 0.5, coatRough: 0.22, env: 0.55 }),
  );
  const brassM = trackM(mat("#c4a056", { rough: 0.32, metal: 0.68, env: 1.05 }));
  const skinM = trackM(mat("#c4a07a", { rough: 0.68 }));
  const skinPale = trackM(mat("#d4b896", { rough: 0.7 }));
  const skinElder = trackM(mat("#c8b090", { rough: 0.74 }));
  const whitesM = trackM(mat("#ece8e0", { rough: 0.78 }));
  const crystalM = trackM(mat("#e8eef4", { rough: 0.06, metal: 0.12, env: 1.45 }));
  crystalM.transparent = true;
  crystalM.opacity = 0.32;
  const calyxM = trackM(mat("#3a5a28", { rough: 0.7 }));
  const glassNight = trackM(
    mat("#1a1810", { rough: 0.18, metal: 0.05, emissive: "#f0d9a0", em: 0.7, env: 0.35 }),
  );
  const glassDark = trackM(mat("#1a1e22", { rough: 0.18, metal: 0.12, env: 0.5 }));
  const emissiveWarm = trackM(mat("#000000", { emissive: "#f3d7a0", em: 1.4 }));
  const emissiveCool = trackM(mat("#000000", { emissive: "#cfe4f0", em: 0.9 }));
  const blackM = trackM(mat("#141210", { rough: 0.9 }));
  const columnM = trackM(mat("#cfc8b8", { map: tex.plaster("#cfc8b8"), rough: 0.72, env: 0.5 }));
  const signM = trackM(mat("#ffffff", { map: tex.makeSign("БОЛЬНИЦА №6") }));
  const letterM = trackM(mat("#ffffff"));
  letterM.map = tex.makeLetterB();
  letterM.transparent = true;
  letterM.depthWrite = false;
  const stainM = trackM(mat("#ffffff", { map: tex.stainOverlay(), rough: 1, env: 0 }));
  stainM.transparent = true;
  stainM.opacity = 0.72;
  stainM.depthWrite = false;

  function mesh(
    geo: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    parent: THREE.Object3D,
    rotY = 0,
  ) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.y = rotY;
    m.castShadow = false;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  const site = new THREE.Group();
  root.add(site);
  mesh(box, asphaltM, 0, -0.08, 20, 220, 0.16, 220, site);
  mesh(box, asphaltM, 0, 0.0, 66, 16, 0.05, 52, site);
  mesh(box, walkM, -10.4, 0.04, 66, 2.2, 0.08, 48, site);
  mesh(box, walkM, 10.4, 0.04, 66, 2.2, 0.08, 48, site);
  mesh(box, walkM, 0, 0.05, 47.6, 22, 0.08, 8, site);
  mesh(box, grassM, -28, -0.02, 50, 36, 0.06, 70, site);
  mesh(box, grassM, 28, -0.02, 50, 36, 0.06, 70, site);
  mesh(box, grassM, 0, -0.04, -10, 70, 0.04, 28, site);
  mesh(box, concreteM, -8.15, 0.12, 66, 0.28, 0.18, 48, site);
  mesh(box, concreteM, 8.15, 0.12, 66, 0.28, 0.18, 48, site);

  const barMax = 1600;
  const bars = new Instancer(box, fenceM, barMax, site);
  const tips = new Instancer(trackG(new THREE.ConeGeometry(0.045, 0.22, 5)), fenceM, 400, site);
  const addBar = (x: number, z: number, dense = false) => {
    bars.add(x, 1.15, z, dense ? 0.045 : 0.05, 2.3, dense ? 0.045 : 0.05);
    if (dense) tips.add(x, 2.41, z, 1, 1, 1);
  };
  for (let x = -98; x < -7.5; x += x > -24 ? 0.22 : 0.6) addBar(x, 88, x > -24);
  for (let x = 7.5; x <= 98; x += x < 24 ? 0.22 : 0.6) addBar(x, 88, x < 24);
  for (let z = -80; z <= 88; z += 0.6) {
    addBar(-98, z);
    addBar(98, z);
  }
  for (let x = -90; x <= 90; x += 0.6) addBar(x, -80);
  bars.commit();
  tips.commit();
  mesh(box, fenceM, -52, 2.22, 88, 88, 0.05, 0.05, site);
  mesh(box, fenceM, 52, 2.22, 88, 88, 0.05, 0.05, site);
  mesh(box, fenceM, -52, 0.18, 88, 88, 0.08, 0.08, site);
  mesh(box, fenceM, 52, 0.18, 88, 88, 0.08, 0.08, site);
  mesh(box, fenceM, -7.6, 1.35, 87.2, 0.22, 2.7, 0.22, site);
  mesh(box, fenceM, 7.6, 1.35, 87.2, 0.22, 2.7, 0.22, site);
  mesh(box, fenceM, -7.6, 2.72, 87.2, 0.36, 0.12, 0.36, site);
  mesh(box, fenceM, 7.6, 2.72, 87.2, 0.36, 0.12, 0.36, site);
  mesh(box, darkMetal, -5.1, 1.25, 86.4, 4.6, 2.2, 0.08, site, 0.38);
  mesh(box, darkMetal, 5.1, 1.25, 86.4, 4.6, 2.2, 0.08, site, -0.38);

  mesh(box, zebraM, 0, 0.035, 86.4, 12, 0.02, 3.6, site);
  for (let z = 50; z <= 84; z += 4.2) {
    mesh(box, trackM(mat("#c8c2b4", { rough: 0.55 })), 0, 0.03, z, 0.14, 0.01, 1.6, site);
  }
  const puddles: Array<[number, number, number, number]> = [
    [-2.6, 81.2, 4.2, 1.9],
    [1.6, 74.4, 3.4, 1.5],
    [4.8, 67.2, 2.6, 1.2],
    [-5.4, 58.6, 3.8, 1.7],
    [0.4, 52.2, 5.1, 2.0],
    [6.2, 79.8, 2.2, 1.1],
    [-1.1, 88.6, 3.0, 1.3],
  ];
  for (const [px, pz, sx, sz] of puddles) {
    mesh(box, puddleM, px, 0.045, pz, sx, 0.012, sz, site);
  }

  mesh(box, brickM, -11.2, 1.45, 78.2, 3.4, 2.9, 2.8, site);
  mesh(box, blackM, -11.2, 3.0, 78.2, 3.6, 0.16, 3.0, site);
  mesh(box, glassNight, -11.2, 1.7, 79.62, 1.6, 1.1, 0.06, site);
  mesh(box, emissiveWarm, -11.2, 2.55, 79.7, 0.35, 0.1, 0.2, site);
  mesh(box, darkMetal, -8.4, 1.05, 79.4, 4.8, 0.08, 0.12, site, 0.08);
  mesh(box, darkMetal, -6.2, 1.05, 79.6, 0.12, 0.9, 0.12, site);
  mesh(box, darkMetal, -8.2, 1.85, 79.5, 0.08, 1.6, 0.08, site);

  const chrome = trackM(mat("#c5c8cc", { rough: 0.22, metal: 0.85, env: 1.4 }));
  function addVehicle(
    x: number,
    z: number,
    rotY: number,
    bodyMat: THREE.Material,
    taxi: boolean,
  ) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    site.add(g);
    mesh(box, bodyMat, 0, 0.48, 0.05, 1.78, 0.5, 4.55, g);
    mesh(box, bodyMat, 0, 0.96, -0.18, 1.64, 0.48, 2.35, g);
    mesh(box, bodyMat, 0, 0.42, 2.12, 1.7, 0.28, 0.42, g);
    mesh(box, chrome, 0, 0.32, 2.34, 1.62, 0.08, 0.1, g);
    mesh(box, chrome, 0, 0.32, -2.28, 1.62, 0.08, 0.1, g);
    mesh(box, glassCar, 0, 1.04, 0.98, 1.52, 0.34, 0.06, g);
    mesh(box, glassCar, 0, 1.04, -1.28, 1.52, 0.34, 0.06, g);
    mesh(box, glassCar, 0.83, 1.02, -0.14, 0.04, 0.3, 1.7, g);
    mesh(box, glassCar, -0.83, 1.02, -0.14, 0.04, 0.3, 1.7, g);
    mesh(box, emissiveWarm, 0.58, 0.5, 2.28, 0.22, 0.12, 0.08, g);
    mesh(box, emissiveWarm, -0.58, 0.5, 2.28, 0.22, 0.12, 0.08, g);
    const tail = trackM(mat("#000", { emissive: "#a03028", em: 0.7 }));
    mesh(box, tail, 0.56, 0.5, -2.26, 0.2, 0.1, 0.06, g);
    mesh(box, tail, -0.56, 0.5, -2.26, 0.2, 0.1, 0.06, g);
    for (const sx of [-0.76, 0.76]) {
      for (const sz of [1.42, -1.42]) {
        const wh = new THREE.Mesh(cyl, rubberM);
        wh.scale.set(0.3, 0.18, 0.3);
        wh.rotation.z = Math.PI / 2;
        wh.position.set(sx, 0.28, sz);
        g.add(wh);
      }
    }
    if (taxi) {
      const cream = trackM(mat("#efe6c8", { rough: 0.5 }));
      mesh(box, cream, 0, 1.24, -0.12, 1.66, 0.05, 2.2, g);
      mesh(box, cream, 0, 0.55, 0, 1.82, 0.08, 4.5, g);
      mesh(box, emissiveWarm, 0, 1.42, 0.08, 0.32, 0.16, 0.55, g);
      mesh(box, blackM, 0, 0.72, 2.18, 0.9, 0.22, 0.04, g);
    }
    return g;
  }
  const sedanG = addVehicle(-3.15, 73.4, Math.PI + 0.12, sedanM, false);
  const taxiG = addVehicle(4.15, 79.1, Math.PI - 0.06, taxiM, true);

  mesh(box, plasterOld, -38, 1.8, 68, 5.4, 2.6, 2.4, site);
  mesh(box, darkMetal, -38, 1.15, 64, 2.4, 1.3, 5.2, site);
  mesh(box, darkMetal, -32, 1.15, 66, 2.4, 1.3, 5.2, site);
  mesh(box, darkMetal, 38, 0.7, 52, 2.2, 1.2, 4.6, site);
  mesh(box, darkMetal, 44, 0.7, 56, 2.2, 1.2, 4.6, site);
  mesh(box, asphaltM, 34, 0.02, 58, 26, 0.04, 22, site);
  for (let i = 0; i < 6; i++) {
    mesh(box, trackM(mat("#b0aa9c", { rough: 0.6 })), 26 + i * 3.6, 0.04, 58, 0.06, 0.01, 4.8, site);
  }

  for (const [lx, lz] of [
    [-16, 50],
    [16, 50],
    [-10, 68],
    [10, 68],
    [-10, 86],
    [10, 86],
    [0, 58],
    [-30, 42],
    [30, 42],
    [0, 46],
  ] as const) {
    mesh(cyl, darkMetal, lx, 3.4, lz, 0.09, 6.8, 0.09, site);
    mesh(box, emissiveWarm, lx, 6.7, lz, 0.5, 0.14, 0.5, site);
    mesh(box, darkMetal, lx, 6.55, lz, 0.7, 0.05, 0.22, site);
  }

  for (const s of SHOTS) {
    const [px, , pz] = s.pole;
    mesh(cyl, metalM, px, s.poleH / 2, pz, 0.055, s.poleH, 0.055, site);
    mesh(box, darkMetal, px, s.poleH + 0.1, pz, 0.28, 0.18, 0.28, site);
    mesh(box, emissiveCool, px, s.poleH + 0.22, pz, 0.1, 0.08, 0.1, site);
  }

  const city = new THREE.Group();
  root.add(city);
  const cityM = trackM(mat("#14161a", { rough: 1 }));
  const winM = trackM(mat("#000", { emissive: "#d9c48a", em: 0.7 }));
  for (let i = 0; i < 48; i++) {
    const ang = (i / 48) * Math.PI + 0.2;
    const dist = 140 + (i % 7) * 18;
    const bx = Math.sin(ang) * dist;
    const bz = -Math.cos(ang) * dist - 40;
    const h = 10 + (i * 17) % 38;
    const w = 8 + (i % 5) * 3;
    const d = 8 + (i % 4) * 3;
    mesh(box, cityM, bx, h / 2, bz, w, h, d, city);
    if (i % 2 === 0) mesh(box, winM, bx, h * 0.6, bz + d * 0.51, w * 0.7, h * 0.5, 0.08, city);
  }

  const water = trackM(wet("#0c1418", { rough: 0.12, metal: 0.08, coat: 0.7, coatRough: 0.15, env: 1.2 }));
  mesh(box, water, 0, -0.2, -130, 400, 0.1, 80, site);

  const shell = new THREE.Group();
  shell.name = "massing";
  root.add(shell);
  const y0 = FLOOR_Z.B1;
  const yR = FLOOR_Z.R;
  const H = yR - y0;
  const yC = (y0 + yR) / 2;

  function block(
    x: number,
    z: number,
    sx: number,
    sz: number,
    material: THREE.Material,
    y = yC,
    h = H,
  ) {
    mesh(box, material, x, y, z, sx, h, sz, shell);
  }

  block(0, 30.6, 96.0, 11.2, plasterOld);
  block(0, -30.6, 96.0, 11.2, plasterOld);
  block(-40.5, 0, 15.0, 50.0, plasterOld);
  block(40.5, 0, 15.0, 50.0, plasterNew);
  block(-55.0, -4, 14.0, 24.0, plasterOld);
  block(55.0, -4, 14.0, 24.0, plasterNew);
  block(0, 40.2, 16.0, 8.4, plasterOld, 4.2, 11.2);
  block(0, 0, 36.4, 28.4, concreteM, y0 + 1.58, 3.16);
  const roofY = yR + 0.2;
  block(0, 25, 96, 22, concreteM, roofY, 0.4);
  block(0, -25, 96, 22, concreteM, roofY, 0.4);
  block(-33, 0, 30, 28, concreteM, roofY, 0.4);
  block(33, 0, 30, 28, concreteM, roofY, 0.4);
  block(-55, -4, 14, 24, concreteM, roofY, 0.4);
  block(55, -4, 14, 24, concreteM, roofY, 0.4);

  for (const cxn of [-4.8, -1.6, 1.6, 4.8]) {
    mesh(cyl, columnM, cxn, 3.2, 44.2, 0.38, 6.4, 0.38, shell);
  }
  mesh(box, plasterOld, 0, 6.6, 43.6, 14, 0.5, 3.2, shell);
  mesh(plane, signM, 0, 6.6, 45.25, 10, 1.4, 1, shell);
  mesh(box, darkMetal, -0.72, 1.55, 45.55, 1.28, 3.1, 0.08, shell);
  mesh(box, darkMetal, 0.72, 1.55, 45.55, 1.28, 3.1, 0.08, shell);
  mesh(box, glassNight, -0.72, 1.7, 45.62, 0.9, 2.2, 0.04, shell);
  mesh(box, glassNight, 0.72, 1.7, 45.62, 0.9, 2.2, 0.04, shell);
  mesh(plane, letterM, -48.05, 9.5, 18, 6, 8, 1, shell, Math.PI / 2);
  mesh(plane, stainM, 0, 10.2, 36.22, 92, 18, 1, shell);
  mesh(plane, stainM, 0, 10.2, -36.22, 92, 18, 1, shell, Math.PI);
  mesh(plane, stainM, -48.12, 10.2, 0, 50, 18, 1, shell, Math.PI / 2);
  mesh(plane, stainM, 48.12, 10.2, 0, 50, 18, 1, shell, -Math.PI / 2);

  const roofDress = new THREE.Group();
  roofDress.name = "roof-dress";
  root.add(roofDress);
  mesh(cyl, darkMetal, -8, 24.2, -22, 0.9, 5.2, 0.9, roofDress);
  mesh(cyl, darkMetal, -4, 24.8, -22, 0.7, 6.4, 0.7, roofDress);
  mesh(cyl, darkMetal, 0, 24.2, -22, 0.9, 5.2, 0.9, roofDress);

  const helipad = trackM(mat("#3a3c3e", { rough: 0.7 }));
  mesh(box, helipad, 0, 21.85, 25, 16, 0.08, 16, roofDress);
  const hSign = trackM(mat("#000", { emissive: "#e8e8e8", em: 0.6 }));
  mesh(box, hSign, 0, 21.92, 25, 1.2, 0.04, 6, roofDress);
  mesh(box, hSign, 0, 21.92, 25, 6, 0.04, 1.2, roofDress);

  mesh(box, darkMetal, -22, 23.4, -22, 10, 2.8, 8, roofDress);
  mesh(box, darkMetal, 28, 23.4, 0, 8, 2.8, 8, roofDress);
  mesh(box, darkMetal, 18, 23.4, 24, 10, 2.8, 7, roofDress);

  mesh(box, grassM, 0, 0.02, 0, 35.2, 0.04, 27.2, root);
  const canopyM = trackM(mat("#24321c", { rough: 1 }));
  const trunkM = trackM(mat("#2a2218", { rough: 0.92 }));
  const bloomM = trackM(mat("#8a4a5a", { rough: 0.7 }));
  const bloomY = trackM(mat("#c4a24a", { rough: 0.7 }));
  function addTree(x: number, z: number, h = 3.4, r = 1.8) {
    mesh(cyl, trunkM, x, h * 0.35, z, 0.16 + r * 0.04, h * 0.7, 0.16 + r * 0.04, root);
    mesh(sphere, canopyM, x, h * 0.85, z, r, r * 0.7, r, root);
    mesh(sphere, canopyM, x + r * 0.35, h * 0.72, z - r * 0.2, r * 0.55, r * 0.4, r * 0.55, root);
  }
  function addBed(x: number, z: number, sx: number, sz: number) {
    mesh(box, grassM, x, 0.08, z, sx, 0.12, sz, root);
    for (let i = 0; i < 7; i++) {
      const fx = x + (i / 6 - 0.5) * sx * 0.7;
      const fz = z + ((i % 3) - 1) * sz * 0.22;
      mesh(cyl, (i % 2 ? bloomM : bloomY), fx, 0.28, fz, 0.06, 0.16, 0.06, root);
    }
  }
  for (const [px, pz] of [
    [-8, -6],
    [8, -6],
    [-8, 6],
    [8, 6],
    [0, 0],
    [-12, 2],
    [12, 2],
  ] as const) {
    addTree(px, pz, 3.2 + Math.abs(px) * 0.04, 1.7);
  }
  addBed(-6, 10.5, 4.2, 1.4);
  addBed(6, 10.5, 4.2, 1.4);
  addBed(-6, -10.5, 4.2, 1.4);
  addBed(8, -9.2, 3.6, 1.2);
  for (const z of [48, 56, 64, 72, 80]) {
    addTree(-13.5, z, 4.2, 2.1);
    addTree(13.5, z, 4.0, 1.9);
  }
  addTree(-22, 42, 5.2, 2.6);
  addTree(24, 44, 4.8, 2.4);
  addTree(-28, 58, 4.4, 2.2);
  addBed(-10.4, 62, 2.2, 6.5);
  addBed(10.4, 62, 2.2, 6.5);

  const winGeo = trackG(new THREE.BoxGeometry(1.5, 2.1, 0.08));
  const lit = new THREE.InstancedMesh(winGeo, glassNight, 900);
  const dark = new THREE.InstancedMesh(winGeo, glassDark, 900);
  let li = 0;
  let di = 0;
  const floors = [0, 3.6, 7.2, 10.8, 14.4, 18.0];
  const seed = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  };
  function addWin(x: number, y: number, z: number, rotY: number) {
    _tmp.position.set(x, y, z);
    _tmp.rotation.set(0, rotY, 0);
    _tmp.scale.set(1, 1, 1);
    _tmp.updateMatrix();
    const on = seed(x, y + z) > 0.38;
    if (on && li < 900) lit.setMatrixAt(li++, _tmp.matrix);
    else if (di < 900) dark.setMatrixAt(di++, _tmp.matrix);
  }
  for (const fz of floors) {
    const wy = fz + 1.45;
    for (let x = -44; x <= 44; x += 3.5) {
      if (Math.abs(x) < 8 && fz < 3.6) continue;
      addWin(x, wy, 36.08, 0);
      if (Math.abs(x) > 10) addWin(x, wy, -36.08, Math.PI);
    }
    for (let z = -22; z <= 22; z += 3.6) {
      addWin(-48.08, wy, z, Math.PI / 2);
      addWin(48.08, wy, z, -Math.PI / 2);
    }
    for (let x = -16; x <= 16; x += 3.5) {
      addWin(x, wy, 14.08, Math.PI);
      addWin(x, wy, -14.08, 0);
    }
    for (let z = -12; z <= 12; z += 3.6) {
      addWin(-18.08, wy, z, -Math.PI / 2);
      addWin(18.08, wy, z, Math.PI / 2);
    }
  }
  lit.count = li;
  dark.count = di;
  lit.instanceMatrix.needsUpdate = true;
  dark.instanceMatrix.needsUpdate = true;
  shell.add(lit, dark);

  const inner = trackM(mat("#8e8878", { map: tex.plaster("#8e8878"), rough: 0.92 }));
  mesh(box, inner, -10, yC, 14.3, 16, H, 0.5, shell);
  mesh(box, inner, 10, yC, 14.3, 16, H, 0.5, shell);
  mesh(box, inner, -10, yC, -14.3, 16, H, 0.5, shell);
  mesh(box, inner, 10, yC, -14.3, 16, H, 0.5, shell);
  mesh(box, inner, 18.3, yC, -8, 0.5, H, 12, shell);
  mesh(box, inner, 18.3, yC, 8, 0.5, H, 12, shell);
  mesh(box, inner, -18.3, yC, -8, 0.5, H, 12, shell);
  mesh(box, inner, -18.3, yC, 8, 0.5, H, 12, shell);

  const interior = new THREE.Group();
  interior.name = "interior";
  root.add(interior);

  const B = {
    floorOld: new Instancer(box, floorOld, 80, interior),
    floorNew: new Instancer(box, floorNew, 80, interior),
    floorCor: new Instancer(box, floorCor, 40, interior),
    floorCon: new Instancer(box, concreteM, 40, interior),
    parquet: new Instancer(box, parquetM, 8, interior),
    tile: new Instancer(box, tileKitM, 8, interior),
    ceil: new Instancer(box, ceilM, 120, interior),
    sage: new Instancer(box, sage, 700, interior),
    sageNew: new Instancer(box, sageNew, 400, interior),
    plaster: new Instancer(box, plasterIn, 700, interior),
    plasterNew: new Instancer(box, plasterNew, 400, interior),
    wood: new Instancer(box, woodM, 700, interior),
    walnut: new Instancer(box, walnutM, 240, interior),
    metal: new Instancer(box, metalM, 700, interior),
    linen: new Instancer(box, linen, 280, interior),
    cloth: new Instancer(box, clothM, 40, interior),
    napkin: new Instancer(box, napkinM, 24, interior),
    velvet: new Instancer(box, velvetM, 100, interior),
    rug: new Instancer(box, rugM, 4, interior),
    china: new Instancer(box, chinaM, 80, interior),
    brass: new Instancer(box, brassM, 80, interior),
    silver: new Instancer(box, silverM, 80, interior),
    copper: new Instancer(box, copperM, 80, interior),
    tomato: new Instancer(box, tomatoM, 8, interior),
    dark: new Instancer(box, darkMetal, 500, interior),
    light: new Instancer(box, emissiveWarm, 220, interior),
    lightCool: new Instancer(box, emissiveCool, 60, interior),
    glass: new Instancer(box, glassDark, 180, interior),
    crystal: new Instancer(box, crystalM, 40, interior),
    glassLit: new Instancer(winGeo, glassNight, 220, interior),
    cylMetal: new Instancer(cyl, metalM, 80, interior),
    cylDark: new Instancer(cyl, darkMetal, 80, interior),
    cylLight: new Instancer(cyl, emissiveCool, 40, interior),
    cylCopper: new Instancer(cyl, copperM, 50, interior),
    cylBrass: new Instancer(cyl, brassM, 30, interior),
    cylSilver: new Instancer(cyl, silverM, 40, interior),
    cylChina: new Instancer(cyl, chinaM, 40, interior),
    cylTomato: new Instancer(sphere, tomatoM, 8, interior),
    sphereSilver: new Instancer(sphere, silverM, 16, interior),
  };

  const diningSignM = trackM(mat("#d8d0c4", { map: tex.makeSign("ЭЛИТНАЯ СТОЛОВАЯ") }));
  if (diningSignM.map) {
    diningSignM.map.wrapS = diningSignM.map.wrapT = THREE.ClampToEdgeWrapping;
    diningSignM.map.repeat.set(1, 1);
  }
  const kitchenSignM = trackM(mat("#d0ccc4", { map: tex.makeSign("ПИЩЕБЛОК") }));
  if (kitchenSignM.map) {
    kitchenSignM.map.wrapS = kitchenSignM.map.wrapT = THREE.ClampToEdgeWrapping;
    kitchenSignM.map.repeat.set(1, 1);
  }
  const diningPlaque = mesh(box, diningSignM, 0, -24, 0, 2.8, 0.34, 0.04, interior);
  const kitchenPlaque = mesh(box, kitchenSignM, 0, -24, 0, 2.1, 0.3, 0.04, interior);
  diningPlaque.visible = false;
  kitchenPlaque.visible = false;

  const diningLight = new THREE.PointLight(0xffe2b8, 22, 16, 1.6);
  diningLight.visible = false;
  diningLight.castShadow = false;
  interior.add(diningLight);
  const diningFill = new THREE.PointLight(0xf3d7a0, 8, 12, 1.8);
  diningFill.visible = false;
  interior.add(diningFill);

  const chefG = new THREE.Group();
  chefG.name = "chef";
  chefG.visible = false;
  interior.add(chefG);
  mesh(box, blackM, 0.12, 0.05, 0.06, 0.16, 0.08, 0.28, chefG);
  mesh(box, blackM, -0.12, 0.05, 0.06, 0.16, 0.08, 0.28, chefG);
  mesh(box, darkMetal, 0.1, 0.42, 0.03, 0.18, 0.72, 0.2, chefG);
  mesh(box, darkMetal, -0.1, 0.42, 0.03, 0.18, 0.72, 0.2, chefG);
  mesh(box, whitesM, 0, 1.14, 0.02, 0.5, 0.62, 0.3, chefG);
  mesh(box, linen, 0, 1.0, 0.18, 0.42, 0.55, 0.05, chefG);
  mesh(box, whitesM, 0, 1.14, 0.2, 0.05, 0.5, 0.02, chefG);
  mesh(box, darkMetal, 0, 0.82, 0.18, 0.44, 0.06, 0.06, chefG);
  mesh(box, darkMetal, 0, 1.28, 0.21, 0.035, 0.035, 0.02, chefG);
  mesh(box, darkMetal, 0, 1.12, 0.21, 0.035, 0.035, 0.02, chefG);
  mesh(box, darkMetal, 0, 0.96, 0.21, 0.035, 0.035, 0.02, chefG);
  mesh(box, whitesM, 0.32, 1.1, 0.06, 0.12, 0.55, 0.13, chefG);
  mesh(box, whitesM, -0.32, 1.1, 0.08, 0.12, 0.55, 0.13, chefG);
  mesh(box, skinM, 0.32, 0.78, 0.14, 0.1, 0.12, 0.1, chefG);
  mesh(box, skinM, -0.32, 0.9, 0.22, 0.1, 0.1, 0.1, chefG);
  mesh(box, napkinM, -0.32, 0.98, 0.28, 0.16, 0.04, 0.18, chefG);
  mesh(sphere, tomatoM, -0.32, 1.06, 0.3, 0.055, 0.05, 0.055, chefG);
  mesh(box, calyxM, -0.32, 1.12, 0.3, 0.04, 0.02, 0.04, chefG);
  mesh(box, silverM, 0.32, 0.74, 0.3, 0.018, 0.018, 0.28, chefG);
  mesh(box, silverM, 0.32, 0.74, 0.46, 0.045, 0.01, 0.07, chefG);
  mesh(box, skinM, 0.28, 0.96, 0.42, 0.12, 0.04, 0.16, chefG);
  mesh(box, skinM, 0, 1.46, 0.02, 0.16, 0.12, 0.14, chefG);
  mesh(sphere, skinM, 0, 1.58, 0.04, 0.14, 0.16, 0.14, chefG);
  mesh(box, skinM, 0, 1.56, 0.16, 0.04, 0.04, 0.06, chefG);
  mesh(box, blackM, -0.05, 1.62, 0.15, 0.035, 0.02, 0.02, chefG);
  mesh(box, blackM, 0.05, 1.62, 0.15, 0.035, 0.02, 0.02, chefG);
  mesh(box, blackM, 0, 1.5, 0.16, 0.1, 0.025, 0.03, chefG);
  mesh(box, blackM, 0, 1.68, 0.0, 0.24, 0.06, 0.2, chefG);
  mesh(cyl, whitesM, 0, 1.8, 0.02, 0.12, 0.2, 0.12, chefG);
  mesh(sphere, whitesM, 0, 1.96, 0.02, 0.14, 0.1, 0.14, chefG);

  const suitNavy = trackM(mat("#1c2430", { rough: 0.7 }));
  const suitChar = trackM(mat("#2a2c2e", { rough: 0.68 }));
  const dressM = trackM(mat("#2a2420", { map: tex.velvet(), rough: 0.8 }));
  const hairSilver = trackM(mat("#c8c4bc", { rough: 0.7 }));
  const hairSand = trackM(mat("#8a6a48", { rough: 0.75 }));
  const goldM = trackM(mat("#c4a056", { rough: 0.28, metal: 0.7, env: 1.1 }));

  function seatedGuest(opts: {
    skin: THREE.Material;
    body: THREE.Material;
    hair: THREE.Material;
    wide: number;
    tall: number;
    bun?: boolean;
  }) {
    const g = new THREE.Group();
    g.visible = false;
    interior.add(g);
    const w = opts.wide;
    const t = opts.tall;
    mesh(box, opts.body, 0, 0.72 * t, 0.04, 0.42 * w, 0.5 * t, 0.28, g);
    mesh(box, opts.body, 0, 0.52 * t, 0.02, 0.4 * w, 0.18, 0.32, g);
    mesh(box, opts.body, 0.16 * w, 0.78 * t, 0.12, 0.1, 0.38 * t, 0.1, g);
    mesh(box, opts.body, -0.16 * w, 0.78 * t, 0.12, 0.1, 0.38 * t, 0.1, g);
    mesh(box, opts.skin, 0.16 * w, 0.56 * t, 0.18, 0.08, 0.08, 0.08, g);
    mesh(box, opts.skin, -0.16 * w, 0.56 * t, 0.18, 0.08, 0.08, 0.08, g);
    mesh(sphere, opts.skin, 0, 1.08 * t, 0.06, 0.11 * w, 0.13, 0.11, g);
    mesh(box, opts.hair, 0, 1.16 * t, 0.02, 0.2 * w, 0.05, 0.16, g);
    if (opts.bun) {
      mesh(sphere, opts.hair, 0, 1.22 * t, -0.04, 0.07, 0.06, 0.07, g);
      mesh(box, goldM, 0, 0.95 * t, 0.18, 0.08, 0.02, 0.08, g);
    }
    mesh(box, blackM, -0.04 * w, 1.12 * t, 0.16, 0.03, 0.015, 0.015, g);
    mesh(box, blackM, 0.04 * w, 1.12 * t, 0.16, 0.03, 0.015, 0.015, g);
    return g;
  }

  const guestWoman = seatedGuest({
    skin: skinElder,
    body: dressM,
    hair: hairSilver,
    wide: 0.92,
    tall: 0.92,
    bun: true,
  });
  const guestShort = seatedGuest({
    skin: skinM,
    body: suitChar,
    hair: blackM,
    wide: 0.88,
    tall: 0.8,
  });
  const guestAnglo = seatedGuest({
    skin: skinPale,
    body: suitNavy,
    hair: hairSand,
    wide: 1.22,
    tall: 1.02,
  });
  guestAnglo.scale.set(1, 1, 1.05);

  function standingStaff(body: THREE.Material, skin: THREE.Material, hair: THREE.Material) {
    const g = new THREE.Group();
    g.visible = false;
    interior.add(g);
    mesh(box, blackM, 0.1, 0.05, 0.04, 0.14, 0.08, 0.26, g);
    mesh(box, blackM, -0.1, 0.05, 0.04, 0.14, 0.08, 0.26, g);
    mesh(box, body, 0, 0.5, 0.02, 0.36, 0.8, 0.22, g);
    mesh(box, body, 0, 1.15, 0.02, 0.44, 0.5, 0.26, g);
    mesh(box, linen, 0, 1.12, 0.16, 0.2, 0.08, 0.04, g);
    mesh(box, body, 0.28, 1.05, 0.04, 0.1, 0.5, 0.12, g);
    mesh(box, body, -0.28, 1.05, 0.04, 0.1, 0.5, 0.12, g);
    mesh(box, skin, 0.28, 0.76, 0.08, 0.08, 0.1, 0.08, g);
    mesh(box, skin, -0.28, 0.76, 0.08, 0.08, 0.1, 0.08, g);
    mesh(sphere, skin, 0, 1.52, 0.02, 0.12, 0.14, 0.12, g);
    mesh(box, hair, 0, 1.62, 0, 0.2, 0.06, 0.16, g);
    mesh(box, blackM, -0.04, 1.54, 0.12, 0.03, 0.015, 0.015, g);
    mesh(box, blackM, 0.04, 1.54, 0.12, 0.03, 0.015, 0.015, g);
    return g;
  }
  const orderlyA = standingStaff(suitChar, skinM, blackM);
  const orderlyB = standingStaff(suitNavy, skinPale, hairSand);
  const nurseG = standingStaff(whitesM, skinElder, hairSilver);

  function wallPair(
    isNew: boolean,
    x: number,
    z: number,
    sx: number,
    sz: number,
    y: number,
    lowerH: number,
    upperH: number,
  ) {
    const lo = isNew ? B.sageNew : B.sage;
    const hi = isNew ? B.plasterNew : B.plaster;
    lo.add(x, y + lowerH / 2, z, sx, lowerH, sz);
    hi.add(x, y + lowerH + upperH / 2, z, sx, upperH, sz);
  }

  function furnish(r: RoomDef, y: number) {
    const mx = cx(r);
    const mz = -cy(r);
    const w = rw(r);
    const d = rd(r);
    const t = r.type;
    const add = (
      b: Instancer,
      dx: number,
      dy: number,
      dz: number,
      sx: number,
      sy: number,
      sz: number,
      rotY = 0,
    ) => b.add(mx + dx, y + dy, mz + dz, sx, sy, sz, rotY);

    if (t === "WARD" || t === "ICU") {
      for (let i = 0; i < 2; i++) {
        const dx = (i === 0 ? -1 : 1) * Math.min(2.2, w * 0.28);
        add(B.metal, dx, 0.32, 0, 0.95, 0.64, 2.05);
        add(B.linen, dx, 0.72, 0, 0.9, 0.16, 2.0);
        add(B.linen, dx, 0.88, -0.7, 0.5, 0.18, 0.35);
        add(B.wood, dx + 0.85, 0.4, -0.7, 0.45, 0.8, 0.45);
      }
      add(B.wood, 0, 1.1, d * 0.35, Math.min(w * 0.7, 2.4), 2.2, 0.4);
    } else if (t === "OR") {
      add(B.metal, 0, 0.55, 0, 1.8, 0.9, 0.7);
      B.cylMetal.add(mx, y + 2.4, mz, 0.08, 1.6, 0.08);
      B.cylLight.add(mx, y + 3.05, mz, 0.55, 0.08, 0.55);
      add(B.metal, -w * 0.32, 0.9, 0, 0.5, 1.8, 2.2);
    } else if (t === "OFFICE" || t === "POST") {
      add(B.wood, 0, 0.72, -d * 0.12, 1.6, 0.08, 0.8);
      add(B.wood, 0, 0.36, -d * 0.12, 1.5, 0.7, 0.08);
      add(B.dark, 0, 0.5, 0.35, 0.42, 0.9, 0.42);
      add(B.wood, w * 0.32, 1.0, 0, 0.4, 2.0, 1.4);
    } else if (r.floor === "F1" && r.id === "WW2") {
      furnishDining(add, w, d, y, mx, mz);
    } else if (r.floor === "F1" && r.id === "WW1") {
      furnishKitchen(add, w, d, y, mx, mz);
    } else if (t === "CONF" || t === "DINING") {
      add(B.wood, 0, 0.74, 0, Math.min(w * 0.7, 5.2), 0.08, Math.min(d * 0.35, 1.6));
      for (let i = -2; i <= 2; i++) {
        add(B.dark, i * 0.9, 0.48, 0.7, 0.4, 0.9, 0.4);
        add(B.dark, i * 0.9, 0.48, -0.7, 0.4, 0.9, 0.4);
      }
    } else if (t === "LAB") {
      add(B.metal, 0, 0.9, -d * 0.22, Math.min(w * 0.8, 4), 0.08, 0.7);
      add(B.metal, 0, 0.45, -d * 0.22, Math.min(w * 0.8, 4), 0.9, 0.6);
      add(B.glass, w * 0.3, 1.2, d * 0.28, 0.4, 1.8, 1.6);
    } else if (t === "CT") {
      B.cylMetal.add(mx, y + 1.1, mz, 1.6, 0.7, 1.6);
      B.cylDark.add(mx, y + 1.1, mz, 1.05, 0.72, 1.05);
      add(B.metal, 0, 0.55, 1.4, 0.7, 1.1, 1.8);
    } else if (t === "TECH" || t === "ARCHIVE") {
      for (let i = -1; i <= 1; i++) {
        add(
          t === "ARCHIVE" ? B.wood : B.metal,
          i * Math.min(1.6, w * 0.28),
          1.2,
          0,
          0.4,
          2.4,
          Math.min(d * 0.7, 3.2),
        );
      }
    } else if (t === "WC") {
      add(B.metal, -w * 0.2, 1.0, 0, 0.04, 2.0, 1.4);
      add(B.metal, w * 0.2, 1.0, 0, 0.04, 2.0, 1.4);
      add(B.metal, 0, 0.45, d * 0.3, 1.2, 0.2, 0.4);
    } else if (t === "LOBBY") {
      add(B.wood, 0, 0.55, d * 0.15, Math.min(w * 0.6, 4.5), 1.1, 0.8);
      add(B.wood, -w * 0.28, 0.4, -d * 0.2, 1.6, 0.45, 0.55);
      add(B.wood, w * 0.28, 0.4, -d * 0.2, 1.6, 0.45, 0.55);
    } else if (t === "KITCHEN") {
      add(B.metal, 0, 0.9, -d * 0.28, Math.min(w * 0.85, 5), 0.08, 0.7);
      add(B.dark, -w * 0.2, 0.7, d * 0.2, 1.2, 1.4, 0.8);
    } else if (t === "MORGUE") {
      add(B.metal, -1.4, 0.55, 0, 0.8, 1.1, 2.1);
      add(B.metal, 1.4, 0.55, 0, 0.8, 1.1, 2.1);
      add(B.dark, 0, 1.2, d * 0.3, 2.4, 2.4, 0.6);
    } else if (t === "CORE") {
      for (let i = 0; i < 8; i++) {
        add(B.floorCon, 0, 0.12 + i * 0.38, -d * 0.15 + i * 0.28, 1.4, 0.1, 0.4);
      }
      add(B.dark, w * 0.22, 1.2, 0, 1.3, 2.4, 1.3);
    }
    add(B.light, 0, CLEAR_H[r.floor] - 0.08, 0, Math.min(w * 0.4, 2.4), 0.05, 0.4);
  }

  type AddFn = (
    b: Instancer,
    dx: number,
    dy: number,
    dz: number,
    sx: number,
    sy: number,
    sz: number,
    rotY?: number,
  ) => void;

  function armchair(add: AddFn, dx: number, dz: number) {
    add(B.walnut, dx, 0.22, dz, 0.5, 0.36, 0.5);
    add(B.velvet, dx, 0.46, dz, 0.54, 0.12, 0.54);
    add(B.walnut, dx, 0.72, dz - 0.24, 0.5, 0.88, 0.08);
    add(B.velvet, dx, 0.9, dz - 0.2, 0.54, 0.72, 0.1);
    add(B.walnut, dx - 0.28, 0.58, dz, 0.06, 0.28, 0.42);
    add(B.walnut, dx + 0.28, 0.58, dz, 0.06, 0.28, 0.42);
  }

  function furnishDining(add: AddFn, w: number, d: number, y: number, mx: number, mz: number) {
    const nWall = -d / 2 + 0.18;
    const sWall = d / 2 - 0.18;
    const eWall = w / 2 - 0.18;
    const wWall = -w / 2 + 0.18;
    const h = 3.36;

    add(B.plaster, 0, h * 0.5, nWall, w - 0.08, h, 0.06);
    add(B.plaster, 0, h * 0.5, sWall, w - 0.08, h, 0.06);
    add(B.plaster, eWall, h * 0.5, 0, 0.06, h, d - 0.08);
    add(B.plaster, wWall, h * 0.5, 0, 0.06, h, d - 0.08);

    add(B.walnut, 0, 0.58, nWall + 0.04, w - 0.2, 1.16, 0.08);
    add(B.walnut, eWall - 0.04, 0.58, 0, 0.08, 1.16, d - 0.35);
    add(B.walnut, wWall + 0.04, 0.58, 0, 0.08, 1.16, d - 0.35);
    add(B.walnut, -2.2, 0.58, sWall - 0.04, 6.2, 1.16, 0.08);
    add(B.walnut, 2.2, 0.58, sWall - 0.04, 6.2, 1.16, 0.08);

    add(B.walnut, 0, 0.06, nWall + 0.05, w - 0.15, 0.12, 0.1);
    add(B.walnut, 0, 0.06, sWall - 0.05, w - 0.15, 0.12, 0.1);
    add(B.walnut, eWall - 0.05, 0.06, 0, 0.1, 0.12, d - 0.2);
    add(B.walnut, wWall + 0.05, 0.06, 0, 0.1, 0.12, d - 0.2);

    add(B.walnut, 0, h - 0.08, nWall + 0.06, w - 0.2, 0.1, 0.16);
    add(B.walnut, 0, h - 0.08, sWall - 0.06, w - 0.2, 0.1, 0.16);
    add(B.walnut, eWall - 0.06, h - 0.08, 0, 0.16, 0.1, d - 0.25);
    add(B.walnut, wWall + 0.06, h - 0.08, 0, 0.16, 0.1, d - 0.25);

    add(B.plaster, 0, h - 0.12, 0, w - 1.2, 0.04, d - 1.2);
    add(B.walnut, 0, h - 0.16, nWall + 0.7, w - 1.6, 0.05, 0.08);
    add(B.walnut, 0, h - 0.16, sWall - 0.7, w - 1.6, 0.05, 0.08);
    add(B.walnut, eWall - 0.7, h - 0.16, 0, 0.08, 0.05, d - 1.6);
    add(B.walnut, wWall + 0.7, h - 0.16, 0, 0.08, 0.05, d - 1.6);
    add(B.light, 0, h - 0.2, nWall + 0.55, w - 2.2, 0.03, 0.06);
    add(B.light, 0, h - 0.2, sWall - 0.55, w - 2.2, 0.03, 0.06);
    add(B.light, eWall - 0.55, h - 0.2, 0, 0.06, 0.03, d - 2.2);
    add(B.light, wWall + 0.55, h - 0.2, 0, 0.06, 0.03, d - 2.2);

    add(B.walnut, -0.82, 1.1, sWall, 0.08, 2.2, 0.1);
    add(B.walnut, 0.82, 1.1, sWall, 0.08, 2.2, 0.1);
    add(B.walnut, 0, 2.24, sWall, 1.72, 0.08, 0.1);
    add(B.walnut, -0.4, 1.1, sWall + 0.04, 0.76, 2.18, 0.06);
    add(B.walnut, 0.4, 1.1, sWall + 0.04, 0.76, 2.18, 0.06);
    add(B.brass, -0.12, 1.12, sWall + 0.08, 0.04, 0.04, 0.04);
    add(B.brass, 0.12, 1.12, sWall + 0.08, 0.04, 0.04, 0.04);

    const winZ = [1.45, -1.85];
    for (const dz of winZ) {
      add(B.walnut, wWall + 0.06, 1.55, dz, 0.1, 2.2, 1.7);
      add(B.velvet, wWall + 0.12, 1.58, dz, 0.08, 2.14, 1.62);
      add(B.walnut, wWall + 0.1, 2.66, dz, 0.12, 0.08, 1.74);
      add(B.walnut, wWall + 0.1, 0.48, dz, 0.12, 0.08, 1.74);
      add(B.brass, wWall + 0.16, 1.55, dz + 0.7, 0.04, 0.04, 0.04);
    }
    add(B.velvet, wWall + 0.14, 1.7, -0.2, 0.06, 2.4, 5.6);

    add(B.walnut, wWall + 0.28, 1.15, -3.6, 0.48, 2.3, 1.15);
    add(B.walnut, wWall + 0.28, 1.15, 3.4, 0.48, 2.3, 1.15);
    add(B.china, wWall + 0.4, 2.05, -3.6, 0.22, 0.12, 0.22);
    add(B.dark, wWall + 0.42, 1.7, 3.4, 0.06, 0.9, 0.7);

    add(B.rug, 0, 0.03, 0.15, 5.4, 0.02, 4.2);

    add(B.walnut, 0, 0.36, 0.28, 2.85, 0.7, 1.22);
    add(B.walnut, 0, 0.74, 0.28, 3.05, 0.07, 1.38);
    add(B.cloth, 0, 0.8, 0.28, 2.96, 0.03, 1.32);

    armchair(add, -0.95, -0.58);
    armchair(add, 0, -0.58);
    armchair(add, 0.95, -0.58);

    const covers = [-0.92, 0, 0.92];
    for (const dx of covers) {
      add(B.china, dx, 0.85, 0.02, 0.3, 0.016, 0.3);
      add(B.china, dx, 0.87, 0.02, 0.2, 0.012, 0.2);
      add(B.silver, dx, 0.92, 0.02, 0.22, 0.01, 0.22);
      B.sphereSilver.add(mx + dx, y + 1.0, mz + 0.02, 0.115, 0.085, 0.115);
      add(B.silver, dx, 1.1, 0.02, 0.035, 0.05, 0.035);
      add(B.silver, dx, 1.16, 0.02, 0.07, 0.012, 0.03);
      add(B.napkin, dx - 0.22, 0.845, 0.12, 0.16, 0.02, 0.16);
      add(B.crystal, dx + 0.16, 0.98, 0.16, 0.045, 0.16, 0.045);
      add(B.crystal, dx + 0.16, 1.08, 0.16, 0.055, 0.04, 0.055);
      add(B.silver, dx - 0.22, 0.848, 0.08, 0.014, 0.008, 0.22);
      add(B.silver, dx + 0.22, 0.848, 0.04, 0.012, 0.008, 0.2);
      add(B.silver, dx + 0.28, 0.852, 0.1, 0.018, 0.01, 0.28);
      add(B.silver, dx + 0.28, 0.86, -0.02, 0.03, 0.012, 0.055);
    }

    add(B.silver, 0.72, 0.88, 0.48, 0.07, 0.05, 0.07);
    B.cylSilver.add(mx + 0.72, y + 0.94, mz + 0.48, 0.035, 0.06, 0.035);
    add(B.silver, 0.72, 0.98, 0.48, 0.08, 0.012, 0.08);
    add(B.silver, -0.55, 0.86, 0.55, 0.16, 0.01, 0.04);
    add(B.silver, -0.55, 0.87, 0.62, 0.03, 0.02, 0.08);

    add(B.china, 0.48, 0.86, 0.42, 0.1, 0.04, 0.1);
    B.cylChina.add(mx + 0.48, y + 0.9, mz + 0.42, 0.045, 0.05, 0.045);
    add(B.silver, 0.48, 0.94, 0.42, 0.08, 0.01, 0.08);

    add(B.walnut, 0, 0.52, nWall + 0.28, 10.4, 1.04, 0.52);
    add(B.walnut, 0, 1.08, nWall + 0.28, 10.5, 0.08, 0.58);
    add(B.walnut, 0, 1.78, nWall + 0.18, 10.2, 1.22, 0.28);
    add(B.walnut, -3.4, 1.08, nWall + 0.28, 0.06, 1.12, 0.5);
    add(B.walnut, 3.4, 1.08, nWall + 0.28, 0.06, 1.12, 0.5);
    B.cylSilver.add(mx, y + 1.48, mz + nWall + 0.32, 0.16, 0.42, 0.16);
    B.cylSilver.add(mx, y + 1.72, mz + nWall + 0.32, 0.12, 0.1, 0.12);
    add(B.silver, 0.18, 1.38, nWall + 0.42, 0.12, 0.04, 0.04);
    for (const dx of [-4.4, -4.05, -3.7, 3.55, 3.9, 4.25]) {
      B.cylDark.add(mx + dx, y + 1.32, mz + nWall + 0.32, 0.045, 0.32, 0.045);
    }
    add(B.china, -1.6, 1.2, nWall + 0.32, 0.3, 0.16, 0.3);
    add(B.china, 1.6, 1.2, nWall + 0.32, 0.3, 0.16, 0.3);
    add(B.china, -1.6, 1.3, nWall + 0.32, 0.22, 0.06, 0.22);
    add(B.crystal, 4.6, 1.48, nWall + 0.32, 0.22, 0.55, 0.12);

    add(B.walnut, eWall - 0.12, 0.46, 0.35, 0.52, 0.92, 2.7);
    add(B.walnut, eWall - 0.12, 0.94, 0.35, 0.56, 0.06, 2.76);
    add(B.walnut, eWall - 0.12, 1.72, 0.35, 0.48, 1.4, 0.22);
    add(B.china, eWall - 0.16, 1.55, -0.5, 0.28, 0.2, 0.28);
    add(B.china, eWall - 0.16, 1.7, -0.5, 0.22, 0.08, 0.22);
    add(B.napkin, eWall - 0.16, 0.98, -0.35, 0.36, 0.02, 0.36);
    add(B.napkin, eWall - 0.16, 0.98, 0.35, 0.36, 0.02, 0.36);
    add(B.napkin, eWall - 0.16, 0.98, 1.05, 0.36, 0.02, 0.36);
    B.cylSilver.add(mx + eWall - 0.16, y + 1.12, mz - 0.35, 0.16, 0.22, 0.16);
    B.cylSilver.add(mx + eWall - 0.16, y + 1.12, mz + 0.35, 0.16, 0.22, 0.16);
    B.cylSilver.add(mx + eWall - 0.16, y + 1.12, mz + 1.05, 0.16, 0.22, 0.16);
    add(B.silver, eWall - 0.16, 1.24, -0.35, 0.04, 0.06, 0.04);
    add(B.silver, eWall - 0.16, 1.24, 0.35, 0.04, 0.06, 0.04);
    add(B.silver, eWall - 0.16, 1.24, 1.05, 0.04, 0.06, 0.04);
    add(B.china, eWall - 0.16, 1.0, -1.0, 0.28, 0.04, 0.28);

    add(B.brass, -4.8, 2.15, nWall + 0.12, 0.08, 0.28, 0.08);
    add(B.light, -4.8, 2.0, nWall + 0.14, 0.12, 0.08, 0.12);
    add(B.brass, 4.8, 2.15, nWall + 0.12, 0.08, 0.28, 0.08);
    add(B.light, 4.8, 2.0, nWall + 0.14, 0.12, 0.08, 0.12);
    add(B.brass, eWall - 0.12, 2.15, -2.6, 0.08, 0.28, 0.08);
    add(B.light, eWall - 0.14, 2.0, -2.6, 0.12, 0.08, 0.12);
    add(B.brass, eWall - 0.12, 2.15, 2.8, 0.08, 0.28, 0.08);
    add(B.light, eWall - 0.14, 2.0, 2.8, 0.12, 0.08, 0.12);

    add(B.brass, 0, 2.92, 0.28, 1.7, 0.05, 0.6);
    add(B.brass, 0, 3.1, 0.28, 0.12, 0.32, 0.12);
    add(B.light, -0.52, 2.76, 0.28, 0.24, 0.08, 0.24);
    add(B.light, 0.52, 2.76, 0.28, 0.24, 0.08, 0.24);
    add(B.light, 0, 2.76, 0.28, 0.2, 0.08, 0.2);

    diningLight.visible = true;
    diningLight.position.set(mx, y + 2.7, mz + 0.28);
    diningFill.visible = true;
    diningFill.position.set(mx - 2.2, y + 1.6, mz + 2.4);

    diningPlaque.visible = true;
    diningPlaque.position.set(mx, y + 2.48, mz + nWall + 0.08);

    chefG.visible = true;
    chefG.position.set(mx + 0.72, y, mz + 0.92);
    chefG.rotation.y = Math.PI;

    guestWoman.visible = true;
    guestWoman.position.set(mx - 0.95, y, mz - 0.5);
    guestWoman.rotation.y = 0;
    guestShort.visible = true;
    guestShort.position.set(mx, y, mz - 0.5);
    guestShort.rotation.y = 0;
    guestAnglo.visible = true;
    guestAnglo.position.set(mx + 0.95, y, mz - 0.5);
    guestAnglo.rotation.y = 0;
  }

  function furnishKitchen(add: AddFn, w: number, d: number, y: number, mx: number, mz: number) {
    const wWall = -w / 2 + 0.38;
    const nWall = -d / 2 + 0.4;
    const sWall = d / 2 - 0.38;

    add(B.metal, wWall, 1.15, 0.15, 0.58, 2.3, 6.6);
    add(B.dark, wWall + 0.32, 1.15, 0.15, 0.06, 2.1, 6.4);
    add(B.metal, wWall, 2.34, 0.15, 0.62, 0.08, 6.6);
    for (const dz of [-2.4, -0.8, 0.8, 2.4]) {
      add(B.metal, wWall, 1.15, dz, 0.6, 0.04, 0.04);
      B.cylChina.add(mx + wWall + 0.12, y + 1.55, mz + dz, 0.08, 0.18, 0.08);
      B.cylChina.add(mx + wWall + 0.12, y + 1.95, mz + dz + 0.25, 0.07, 0.16, 0.07);
    }
    add(B.linen, wWall + 0.28, 0.35, -2.8, 0.4, 0.5, 0.35);
    add(B.linen, wWall + 0.28, 0.35, 2.9, 0.4, 0.5, 0.35);

    add(B.metal, 0, 0.45, 0, 2.55, 0.9, 2.15);
    add(B.dark, 0, 0.92, 0, 2.62, 0.06, 2.22);
    add(B.metal, 0.55, 0.98, 0.15, 1.05, 0.05, 0.85);
    B.cylDark.add(mx + 0.3, y + 1.02, mz + 0.0, 0.12, 0.04, 0.12);
    B.cylDark.add(mx + 0.75, y + 1.02, mz + 0.0, 0.12, 0.04, 0.12);
    B.cylDark.add(mx + 0.3, y + 1.02, mz + 0.35, 0.12, 0.04, 0.12);
    B.cylDark.add(mx + 0.75, y + 1.02, mz + 0.35, 0.12, 0.04, 0.12);
    add(B.china, -0.7, 0.98, 0.35, 0.32, 0.04, 0.42);
    add(B.dark, -0.7, 0.97, 0.35, 0.28, 0.02, 0.28);
    add(B.walnut, -0.95, 0.99, -0.15, 0.38, 0.04, 0.55);
    add(B.dark, -0.95, 1.12, 0.12, 0.1, 0.28, 0.12);
    for (const k of [-0.08, 0, 0.08, 0.16]) {
      add(B.silver, -0.95 + k * 0.4, 1.18, 0.12, 0.012, 0.32, 0.02);
    }
    B.cylCopper.add(mx - 0.55, y + 1.08, mz - 0.45, 0.14, 0.16, 0.14);
    B.cylCopper.add(mx - 0.2, y + 1.12, mz - 0.5, 0.11, 0.22, 0.11);
    add(B.linen, 0.15, 0.97, -0.7, 0.35, 0.03, 0.22);

    add(B.metal, 0, 2.48, 0, 1.7, 0.1, 1.25);
    add(B.dark, 0, 2.38, 0, 1.5, 0.08, 1.05);
    add(B.metal, 0, 2.95, 0, 0.35, 0.85, 0.35);
    add(B.light, 0, 2.32, 0, 0.5, 0.04, 0.4);

    add(B.metal, 0, 2.12, 0, 2.3, 0.03, 0.04);
    for (let i = 0; i < 6; i++) {
      const dx = -0.9 + i * 0.36;
      B.cylCopper.add(mx + dx, y + 1.78, mz + 0.02, 0.1 + (i % 3) * 0.02, 0.08, 0.1 + (i % 3) * 0.02);
      add(B.metal, dx, 1.95, 0, 0.01, 0.32, 0.01);
    }

    add(B.metal, 0.2, 0.9, nWall, 1.9, 0.08, 0.48);
    add(B.metal, 0.2, 0.7, nWall, 1.7, 0.35, 0.4);
    add(B.china, -0.4, 0.96, nWall, 0.26, 0.03, 0.26);
    add(B.china, 0.15, 0.96, nWall, 0.26, 0.03, 0.26);
    add(B.linen, 0.7, 0.96, nWall, 0.3, 0.04, 0.22);
    add(B.dark, -1.15, 1.15, nWall - 0.02, 0.04, 1.6, 0.5);

    add(B.metal, 1.6, 0.9, sWall, 3.4, 0.08, 0.62);
    add(B.metal, 1.6, 0.45, sWall, 3.3, 0.9, 0.55);
    B.cylMetal.add(mx + 0.5, y + 0.92, mz + sWall, 0.16, 0.12, 0.16);
    add(B.metal, 2.4, 1.7, sWall, 1.6, 0.9, 0.5);
    add(B.dark, 2.4, 1.7, sWall + 0.22, 1.4, 0.7, 0.06);

    add(B.lightCool, -2.2, 3.18, -1.6, 2.6, 0.04, 0.18);
    add(B.lightCool, 2.2, 3.18, 1.4, 2.6, 0.04, 0.18);
    add(B.lightCool, 0, 3.18, 0, 2.2, 0.04, 0.18);

    kitchenPlaque.visible = true;
    kitchenPlaque.position.set(mx + 2.4, y + 2.42, mz + sWall - 0.28);
  }

  function placeOuterWindow(r: RoomDef, y: number) {
    if (r.floor === "F1" && r.id === "WW2") return;
    const wy = y + 1.45;
    if (r.y1 > 33) {
      B.glassLit.add(cx(r), wy, -(r.y1) + 0.12, 1, 1, 1);
    }
    if (r.y0 < -33) {
      B.glassLit.add(cx(r), wy, -(r.y0) - 0.12, 1, 1, 1);
    }
    if (r.x0 < -45) {
      B.glassLit.add(r.x0 + 0.12, wy, -cy(r), 1, 1, 1, Math.PI / 2);
    }
    if (r.x1 > 45) {
      B.glassLit.add(r.x1 - 0.12, wy, -cy(r), 1, 1, 1, Math.PI / 2);
    }
  }

  function buildFloor(floor: FloorId) {
    for (const b of Object.values(B)) b.reset();
    chefG.visible = false;
    diningPlaque.visible = false;
    kitchenPlaque.visible = false;
    guestWoman.visible = false;
    guestShort.visible = false;
    guestAnglo.visible = false;
    diningLight.visible = false;
    diningFill.visible = false;
    orderlyA.visible = false;
    orderlyB.visible = false;
    nurseG.visible = false;

    if (floor === "R") {
      const y = FLOOR_Z.R;
      B.floorCon.add(-33, y + 0.02, 0, 30, 0.04, 72);
      B.floorCon.add(33, y + 0.02, 0, 30, 0.04, 72);
      B.floorCon.add(0, y + 0.02, 25, 36, 0.04, 22);
      B.floorCon.add(0, y + 0.02, -25, 36, 0.04, 22);
      for (const b of Object.values(B)) b.commit();
      return;
    }

    const y = FLOOR_Z[floor];
    const h = CLEAR_H[floor];
    const rooms = roomsOn(floor);
    const cors = corridorsOn(floor);
    const lowerH = 1.15;
    const upperH = h - lowerH;
    const th = 0.24;

    for (const c of cors) {
      if (c.y1 < -36) continue;
      const mx = cx(c);
      const mz = -cy(c);
      const slab = floor === "B1" ? B.floorCon : B.floorCor;
      slab.add(mx, y + 0.02, mz, rw(c), 0.04, rd(c));
      B.ceil.add(mx, y + h - 0.02, mz, rw(c), 0.04, rd(c));
      const n = Math.max(1, Math.floor(Math.max(rw(c), rd(c)) / 8));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const lx = c.x0 + t * rw(c);
        const ly = c.y0 + t * rd(c);
        const alongX = rw(c) >= rd(c);
        B.light.add(alongX ? lx : mx, y + h - 0.06, alongX ? mz : -ly, 1.6, 0.05, 0.22);
      }
    }

    for (const r of rooms) {
      const mx = cx(r);
      const mz = -cy(r);
      const w = rw(r);
      const d = rd(r);
      const isNew = mx > NEW_WING_X;
      const fm = floor === "B1" ? B.floorCon : isNew ? B.floorNew : B.floorOld;
      if (floor === "F1" && r.id === "WW2") B.parquet.add(mx, y + 0.02, mz, w, 0.04, d);
      else if (floor === "F1" && r.id === "WW1") B.tile.add(mx, y + 0.02, mz, w, 0.04, d);
      else fm.add(mx, y + 0.02, mz, w, 0.04, d);
      B.ceil.add(mx, y + h - 0.02, mz, w, 0.04, d);

      const door = doorEdge(r);
      const edges: Array<{
        e: "N" | "S" | "E" | "W";
        x: number;
        z: number;
        sx: number;
        sz: number;
        len: number;
      }> = [
        { e: "N", x: mx, z: -(r.y1), sx: w, sz: th, len: w },
        { e: "S", x: mx, z: -(r.y0), sx: w, sz: th, len: w },
        { e: "E", x: r.x1, z: mz, sx: th, sz: d, len: d },
        { e: "W", x: r.x0, z: mz, sx: th, sz: d, len: d },
      ];
      for (const ed of edges) {
        if (ed.e === door) {
          const gap = 1.2;
          const half = (ed.len - gap) / 2;
          if (ed.e === "N" || ed.e === "S") {
            wallPair(isNew, ed.x - (gap / 2 + half / 2), ed.z, half, th, y, lowerH, upperH);
            wallPair(isNew, ed.x + (gap / 2 + half / 2), ed.z, half, th, y, lowerH, upperH);
            const hi = isNew ? B.plasterNew : B.plaster;
            hi.add(ed.x, y + 2.2 + (h - 2.2) / 2, ed.z, gap, h - 2.2, th);
            B.wood.add(ed.x + 0.45, y + 1.1, ed.z, 0.9, 2.2, 0.05);
          } else {
            wallPair(isNew, ed.x, ed.z - (gap / 2 + half / 2), th, half, y, lowerH, upperH);
            wallPair(isNew, ed.x, ed.z + (gap / 2 + half / 2), th, half, y, lowerH, upperH);
            const hi = isNew ? B.plasterNew : B.plaster;
            hi.add(ed.x, y + 2.2 + (h - 2.2) / 2, ed.z, th, h - 2.2, gap);
            B.wood.add(ed.x, y + 1.1, ed.z + 0.45, 0.05, 2.2, 0.9);
          }
        } else {
          wallPair(isNew, ed.x, ed.z, ed.sx, ed.sz, y, lowerH, upperH);
        }
      }
      furnish(r, y);
      placeOuterWindow(r, y);
    }

    if (floor === "F1") {
      orderlyA.visible = true;
      orderlyA.position.set(-10.5, y, 30.2);
      orderlyA.rotation.y = 0.4;
      orderlyB.visible = true;
      orderlyB.position.set(8.4, y, 23.4);
      orderlyB.rotation.y = -1.2;
    } else if (floor === "F2") {
      nurseG.visible = true;
      nurseG.position.set(-23.8, y, -18.4);
      nurseG.rotation.y = Math.PI * 0.5;
    }

    for (const b of Object.values(B)) b.commit();
  }

  buildFloor("F1");
  interior.visible = false;

  const _rainTmp = new THREE.Object3D();
  const _rainUp = new THREE.Vector3(0, 1, 0);
  const _rainDir = new THREE.Vector3();
  const STREAKS = 4800;
  const SPLASHES = 320;
  const BOUNCE = 240;
  const RAIN_G = 22;
  const WIND_BASE_X = 1.35;
  const WIND_BASE_Z = 5.6;

  const streakGeo = trackG(new THREE.BoxGeometry(0.012, 1, 0.012));
  const streakMat = trackM(
    new THREE.MeshBasicMaterial({
      color: 0xb7c4d2,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      fog: true,
    }),
  );
  const streaks = new THREE.InstancedMesh(streakGeo, streakMat, STREAKS);
  streaks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  streaks.frustumCulled = false;
  streaks.renderOrder = 4;
  streaks.count = STREAKS;
  root.add(streaks);

  const sx = new Float32Array(STREAKS);
  const sy = new Float32Array(STREAKS);
  const sz = new Float32Array(STREAKS);
  const svx = new Float32Array(STREAKS);
  const svy = new Float32Array(STREAKS);
  const svz = new Float32Array(STREAKS);
  const ssize = new Float32Array(STREAKS);

  const splashGeo = trackG(new THREE.CircleGeometry(1, 12));
  splashGeo.rotateX(-Math.PI / 2);
  const splashMat = trackM(
    new THREE.MeshBasicMaterial({
      color: 0xc8d6e4,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    }),
  );
  const splashes = new THREE.InstancedMesh(splashGeo, splashMat, SPLASHES);
  splashes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  splashes.frustumCulled = false;
  splashes.renderOrder = 3;
  splashes.count = SPLASHES;
  root.add(splashes);
  const spx = new Float32Array(SPLASHES);
  const spz = new Float32Array(SPLASHES);
  const spLife = new Float32Array(SPLASHES);
  const spSize = new Float32Array(SPLASHES);
  let spHead = 0;

  const bounces = new THREE.InstancedMesh(streakGeo, streakMat, BOUNCE);
  bounces.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bounces.frustumCulled = false;
  bounces.renderOrder = 4;
  bounces.count = BOUNCE;
  root.add(bounces);
  const bx = new Float32Array(BOUNCE);
  const by = new Float32Array(BOUNCE);
  const bz = new Float32Array(BOUNCE);
  const bvx = new Float32Array(BOUNCE);
  const bvy = new Float32Array(BOUNCE);
  const bvz = new Float32Array(BOUNCE);
  const bLife = new Float32Array(BOUNCE);
  let bHead = 0;

  _rainTmp.scale.set(0, 1, 0);
  _rainTmp.position.set(0, -4, 0);
  _rainTmp.quaternion.identity();
  _rainTmp.updateMatrix();
  for (let i = 0; i < SPLASHES; i++) {
    spLife[i] = 0;
    splashes.setMatrixAt(i, _rainTmp.matrix);
  }
  for (let i = 0; i < BOUNCE; i++) {
    bLife[i] = 0;
    bounces.setMatrixAt(i, _rainTmp.matrix);
  }
  splashes.instanceMatrix.needsUpdate = true;
  bounces.instanceMatrix.needsUpdate = true;

  let rainT = 0;
  let windX = WIND_BASE_X;
  let windZ = WIND_BASE_Z;

  function terminalOf(size: number) {
    return 11 + size * 12;
  }

  function seedDrop(i: number, cxn: number, camY: number, cz: number, anywhere: boolean) {
    const r = (anywhere ? 0.12 + Math.random() * 0.88 : Math.random()) * 42;
    const a = Math.random() * Math.PI * 2;
    sx[i] = cxn + Math.cos(a) * r;
    sz[i] = cz + Math.sin(a) * r;
    const top = Math.max(20, camY + 14);
    sy[i] = anywhere ? Math.random() * top : top;
    const size = Math.pow(Math.random(), 1.35);
    ssize[i] = size;
    const vt = terminalOf(size);
    svy[i] = -(0.72 + Math.random() * 0.28) * vt;
    svx[i] = windX * (0.7 + Math.random() * 0.5) + (Math.random() - 0.5) * 1.2;
    svz[i] = windZ * (0.7 + Math.random() * 0.5) + (Math.random() - 0.5) * 1.2;
  }

  function writeStreak(i: number) {
    const vx = svx[i]!;
    const vy = svy[i]!;
    const vz = svz[i]!;
    _rainDir.set(vx, vy, vz);
    const spd = _rainDir.length();
    if (spd > 1e-4) _rainDir.multiplyScalar(1 / spd);
    else _rainDir.set(0, -1, 0);
    _rainTmp.position.set(sx[i]!, sy[i]!, sz[i]!);
    _rainTmp.quaternion.setFromUnitVectors(_rainUp, _rainDir);
    const len = 0.22 + spd * 0.042;
    const th = 0.7 + ssize[i]! * 1.55;
    _rainTmp.scale.set(th, len, th);
    _rainTmp.updateMatrix();
    streaks.setMatrixAt(i, _rainTmp.matrix);
  }

  function spawnBounce(x: number, z: number, vx: number, vz: number, size: number) {
    const i = bHead++ % BOUNCE;
    bx[i] = x;
    by[i] = 0.06;
    bz[i] = z;
    bvx[i] = vx * 0.28 + (Math.random() - 0.5) * 3.4;
    bvy[i] = 2.4 + size * 4.2 + Math.random() * 1.8;
    bvz[i] = vz * 0.28 + (Math.random() - 0.5) * 3.4;
    bLife[i] = 0.22 + size * 0.2;
  }

  function writeBounce(i: number) {
    _rainDir.set(bvx[i]!, bvy[i]!, bvz[i]!);
    const spd = _rainDir.length();
    if (spd > 1e-4) _rainDir.multiplyScalar(1 / spd);
    else _rainDir.set(0, -1, 0);
    _rainTmp.position.set(bx[i]!, by[i]!, bz[i]!);
    _rainTmp.quaternion.setFromUnitVectors(_rainUp, _rainDir);
    _rainTmp.scale.set(0.55, 0.12 + spd * 0.03, 0.55);
    _rainTmp.updateMatrix();
    bounces.setMatrixAt(i, _rainTmp.matrix);
  }

  function hideInstance(mesh: THREE.InstancedMesh, i: number) {
    _rainTmp.position.set(0, -8, 0);
    _rainTmp.quaternion.identity();
    _rainTmp.scale.set(0.001, 0.001, 0.001);
    _rainTmp.updateMatrix();
    mesh.setMatrixAt(i, _rainTmp.matrix);
  }

  for (let i = 0; i < STREAKS; i++) {
    seedDrop(i, 0, 8, 72, true);
    writeStreak(i);
  }
  streaks.instanceMatrix.needsUpdate = true;

  const sheetGroup = new THREE.Group();
  sheetGroup.name = "rain-lens";
  const sheetA = tex.rainSheetTex();
  sheetA.repeat.set(2.4, 1.5);
  const sheetB = sheetA.clone();
  sheetB.repeat.set(3.6, 2.4);
  function makeSheet(map: THREE.Texture, w: number, h: number, z: number, op: number) {
    const m = new THREE.Mesh(
      trackG(new THREE.PlaneGeometry(w, h)),
      trackM(
        new THREE.MeshBasicMaterial({
          map,
          color: 0x8aa0b4,
          transparent: true,
          opacity: op,
          depthWrite: false,
          depthTest: false,
          fog: false,
        }),
      ),
    );
    m.position.set(0, 0, -z);
    m.renderOrder = 10;
    sheetGroup.add(m);
  }
  makeSheet(sheetA, 3.8, 2.6, 1.25, 0.1);
  makeSheet(sheetB, 8.4, 5.4, 2.7, 0.055);
  sheetGroup.visible = false;

  let rainOn = true;
  const rainRoot = [streaks, splashes, bounces] as const;

  return {
    root,
    interior,
    massing: shell,
    materials: mats,
    geometries: geos,
    setInteriorFloor: buildFloor,
    setMassingVisible: (v: boolean) => {
      shell.visible = v;
      interior.visible = !v;
    },
    setVehicles: (mode) => {
      sedanG.visible = mode === "all" || mode === "car";
      taxiG.visible = mode === "all" || mode === "taxi";
    },
    attachRain: (cam) => {
      if (sheetGroup.parent) return;
      cam.add(sheetGroup);
    },
    setRainVisible: (v, lens = v) => {
      rainOn = v;
      rainRoot[0].visible = v;
      rainRoot[1].visible = v;
      rainRoot[2].visible = v;
      sheetGroup.visible = v && !!lens;
    },
    tick: (dt: number, cam: THREE.Vector3) => {
      if (!rainOn) return;
      rainT += dt;
      const gust = 1 + 0.34 * Math.sin(rainT * 0.52) + 0.14 * Math.sin(rainT * 1.41 + 0.7);
      windX = WIND_BASE_X * gust;
      windZ = WIND_BASE_Z * gust;

      sheetA.offset.y -= dt * (1.8 + gust * 0.9);
      sheetB.offset.y -= dt * (1.2 + gust * 0.55);
      sheetA.offset.x += dt * (0.04 + windX * 0.012);
      sheetB.offset.x += dt * (0.02 + windX * 0.008);
      if (sheetA.offset.y < 0) sheetA.offset.y += 1;
      if (sheetB.offset.y < 0) sheetB.offset.y += 1;

      const cxn = cam.x;
      const camY = cam.y;
      const cz = cam.z;
      for (let i = 0; i < STREAKS; i++) {
        const size = ssize[i]!;
        const vt = terminalOf(size);
        const tau = 0.18 + size * 0.28;
        const turbX = Math.sin(rainT * 2.7 + i * 0.031) * (1.1 - size * 0.5);
        const turbZ = Math.cos(rainT * 2.1 + i * 0.027) * (1.1 - size * 0.5);
        svx[i] += ((windX + turbX - svx[i]!) / tau) * dt;
        svz[i] += ((windZ + turbZ - svz[i]!) / tau) * dt;
        svy[i]! -= RAIN_G * dt;
        if (svy[i]! < -vt) svy[i] = -vt;

        sx[i]! += svx[i]! * dt;
        sy[i]! += svy[i]! * dt;
        sz[i]! += svz[i]! * dt;

        if (sy[i]! < 0.04) {
          const dx = sx[i]! - cxn;
          const dz = sz[i]! - cz;
          if (dx * dx + dz * dz < 900) {
            const s = spHead++ % SPLASHES;
            spx[s] = sx[i]!;
            spz[s] = sz[i]!;
            spLife[s] = 0.7 + size * 0.4;
            spSize[s] = 0.08 + size * 0.38;
            spawnBounce(sx[i]!, sz[i]!, svx[i]!, svz[i]!, size);
            if (size > 0.45) spawnBounce(sx[i]!, sz[i]!, svx[i]!, svz[i]!, size);
          }
          seedDrop(i, cxn, camY, cz, false);
        } else if (Math.abs(sx[i]! - cxn) > 48 || Math.abs(sz[i]! - cz) > 48) {
          seedDrop(i, cxn, camY, cz, true);
        }
        writeStreak(i);
      }
      streaks.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < BOUNCE; i++) {
        if (bLife[i]! <= 0) continue;
        bLife[i]! -= dt;
        bvy[i]! -= RAIN_G * dt;
        bx[i]! += bvx[i]! * dt;
        by[i]! += bvy[i]! * dt;
        bz[i]! += bvz[i]! * dt;
        if (by[i]! < 0.02 || bLife[i]! <= 0) {
          bLife[i] = 0;
          hideInstance(bounces, i);
          continue;
        }
        writeBounce(i);
      }
      bounces.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < SPLASHES; i++) {
        if (spLife[i]! <= 0) continue;
        spLife[i]! -= dt * 2.4;
        if (spLife[i]! <= 0) {
          hideInstance(splashes, i);
          continue;
        }
        const k = 1 - Math.min(1, spLife[i]!);
        const sc = spSize[i]! * (0.35 + k * 1.4);
        _rainTmp.position.set(spx[i]!, 0.03, spz[i]!);
        _rainTmp.quaternion.identity();
        _rainTmp.scale.set(sc, 1, sc);
        _rainTmp.updateMatrix();
        splashes.setMatrixAt(i, _rainTmp.matrix);
      }
      splashes.instanceMatrix.needsUpdate = true;
    },
    dispose: () => {
      sheetGroup.removeFromParent();
      root.removeFromParent();
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}

export function roomTint(type: RoomType): string {
  void type;
  return "#888";
}

export const ROOM_COUNT = () => allRooms().length;
