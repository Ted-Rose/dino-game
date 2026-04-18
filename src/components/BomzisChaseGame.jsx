import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  BOMZISCHASE_HACK_CHANGED,
  BOMZISCHASE_HACK_EVENT,
  BOMZISCHASE_REVIVED_EVENT,
  BOMZISCHASE_REVIVE_EVENT,
  getHackDef,
  loadHacks,
  loadSelectedHackKind,
  normalizeHackKind,
  saveHacks,
} from '../data/bomzischaseHacks';

const RUN_SPEED = 15;
const GRAVITY = 42;
const JUMP_V = 13;
/** Mērķa attālums skrienot — jābūt pietiekami mazam, lai var «trāpīt» */
const CHASE_SAFE = 5.4;
/** Kamera — platāks kadrs un vērstā pret bomzi, lai abi iekrājas skatā */
const CAM_DIST_BACK = 9.6;
const CAM_SIDE_X = 4.1;
const LOOK_BOMZI_MIX = 0.42;
const HURDLE_GAP_MIN = 11.8;
const HURDLE_GAP_MAX = 14.5;
/** Varbūtības vienai «rindai» (atlikums = parastais zems klucis) */
const LASER_CHANCE = 0.23;
const HIGH_WALL_CHANCE = 0.17;
const WIDE_LOW_CHANCE = 0.13;
const PILLAR_GAP_CHANCE = 0.11;
const PIT_SPAN_CHANCE = 0.12;
/** Leciena augstums, lai pārskriet šķērsli / zem lāzera */
const CLEAR_LOW = 1.02;
const CLEAR_LASER = 1.38;
const CLEAR_HIGH = 1.52;
/** Spēles beigas, kad bomzis pietuvojies šim (z virzienā + lodes tests) */
const CATCH_DIST = 3.05;
/** Ķermeņu centru attālums — uzticamāks par lodziņiem */
const BOMZI_HIT_RADIUS = 2.95;
/** «Sitiena» tuvināšanās uz priekšu, kad jau tuvu */
const STRIKE_LUNGE_SPEED = 22;
/** Nūjas lodziņa paplašinājums */
const STICK_HIT_PAD = 1.05;
const STUMBLE_TIME = 1.15;
const STUMBLE_SLOW = 0.22;
/** Sānu slīdēšana + «bedres» šķērslim */
const TRACK_HALF = 2.38;
const STRAFE_SPEED = 11.5;

export const BOMZISCHASE_STRAFE_LEFT_EVENT = 'bomzischase:strafe-left';
export const BOMZISCHASE_STRAFE_RIGHT_EVENT = 'bomzischase:strafe-right';

export const BOMZISCHASE_JUMP_EVENT = 'bomzischase:jump';
export const BOMZISCHASE_BRAKE_EVENT = 'bomzischase:brake';
export {
  BOMZISCHASE_HACK_CHANGED,
  BOMZISCHASE_HACK_EVENT,
  BOMZISCHASE_REVIVED_EVENT,
  BOMZISCHASE_REVIVE_EVENT,
} from '../data/bomzischaseHacks';

/** Roblox-style blocky avatar (R6-ish): head, torso, arms, legs — feet at y=0 */
function makeRobloxPlayerMesh(skinDef) {
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinDef.skin,
    roughness: 0.6,
  });
  const shirt = new THREE.MeshStandardMaterial({
    color: skinDef.shirt,
    roughness: 0.5,
  });
  const pants = new THREE.MeshStandardMaterial({
    color: skinDef.pants,
    roughness: 0.65,
  });

  const root = new THREE.Group();

  const hipY = 0.54;
  const legH = 0.52;
  const legW = 0.2;
  const legD = 0.22;

  function legMesh(mat) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(legW, legH, legD),
      mat,
    );
    m.castShadow = true;
    m.position.set(0, -legH * 0.48, 0);
    return m;
  }

  const legL = new THREE.Group();
  legL.position.set(-0.14, hipY, 0);
  legL.add(legMesh(pants));
  root.add(legL);

  const legR = new THREE.Group();
  legR.position.set(0.14, hipY, 0);
  legR.add(legMesh(pants));
  root.add(legR);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.48, 0.32),
    shirt,
  );
  torso.castShadow = true;
  torso.position.set(0, 0.98, 0);
  root.add(torso);

  const armL = new THREE.Group();
  armL.position.set(-0.38, 1.12, 0);
  const armMeshL = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.5, 0.18),
    skinMat,
  );
  armMeshL.castShadow = true;
  armMeshL.position.set(0, -0.24, 0);
  armL.add(armMeshL);
  root.add(armL);

  const armR = new THREE.Group();
  armR.position.set(0.38, 1.12, 0);
  const armMeshR = armMeshL.clone();
  armMeshR.material = skinMat;
  armMeshR.castShadow = true;
  armR.add(armMeshR);
  root.add(armR);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.38),
    skinMat,
  );
  head.castShadow = true;
  head.position.set(0, 1.42, 0);
  root.add(head);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35 });
  for (const ox of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.03), eyeMat);
    eye.castShadow = true;
    eye.position.set(ox, 1.44, 0.19);
    root.add(eye);
  }

  root.rotation.y = Math.PI;
  root.scale.setScalar(1.28);
  root.userData.rig = { legL, legR, armL, armR, torso, head };
  return root;
}

function makeBomziMesh() {
  const g = new THREE.Group();
  const coat = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 1.22, 0.58),
    new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 }),
  );
  coat.castShadow = true;
  coat.position.y = 0.76;
  g.add(coat);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.65 }),
  );
  head.castShadow = true;
  head.position.set(0, 1.44, 0.06);
  g.add(head);
  const hat = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.12, 0.38),
    new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 }),
  );
  hat.position.set(0, 1.62, 0);
  hat.castShadow = true;
  g.add(hat);

  const stickMat = new THREE.MeshStandardMaterial({
    color: 0x4a3528,
    roughness: 0.88,
    emissive: 0x1a1008,
    emissiveIntensity: 0.15,
  });
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.075, 3.35, 10),
    stickMat,
  );
  stick.rotation.z = Math.PI / 4.2;
  stick.rotation.x = Math.PI / 11;
  stick.position.set(0.62, 1.05, -0.42);
  stick.castShadow = true;
  g.add(stick);

  g.scale.setScalar(1.42);
  g.userData = { stick, coat, head };
  return g;
}

const DEFAULT_APPEARANCE = Object.freeze({
  id: 'classic',
  shirt: 0x1e6ef2,
  pants: 0x243a52,
  skin: 0xf5c89a,
});

export default function BomzisChaseGame({
  onHud,
  onGameOver,
  appearance = DEFAULT_APPEARANCE,
}) {
  const wrapRef = useRef(null);
  const hudCb = useRef(onHud);
  const endCb = useRef(onGameOver);

  useEffect(() => {
    hudCb.current = onHud;
    endCb.current = onGameOver;
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    let ended = false;
    const clock = new THREE.Clock();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb8c4d8);
    scene.fog = new THREE.Fog(0xb8c4d8, 35, 145);

    const camera = new THREE.PerspectiveCamera(68, 1, 0.15, 220);
    camera.position.set(CAM_SIDE_X, 6.15, 4 - CAM_DIST_BACK);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    wrap.appendChild(renderer.domElement);

    function fit() {
      const w = Math.max(64, wrap.clientWidth || window.innerWidth);
      const h = Math.max(
        280,
        wrap.clientHeight || Math.floor(window.innerHeight * 0.58),
      );
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    fit();
    window.addEventListener('resize', fit);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6688aa, 0.85));
    const sun = new THREE.DirectionalLight(0xfff4e6, 1.05);
    sun.position.set(-30, 55, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 120;
    sun.shadow.camera.left = -35;
    sun.shadow.camera.right = 35;
    sun.shadow.camera.top = 35;
    sun.shadow.camera.bottom = -35;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xe8f0ff, 0.38);
    fill.position.set(10, 14, -20);
    scene.add(fill);

    const groundGeo = new THREE.PlaneGeometry(220, 900);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x9aab78,
      roughness: 0.92,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.z = 120;
    scene.add(ground);

    const stripeGeo = new THREE.PlaneGeometry(220, 900);
    const stripeMat = new THREE.MeshBasicMaterial({
      color: 0x7a8f5e,
      transparent: true,
      opacity: 0.35,
    });
    const stripes = new THREE.Mesh(stripeGeo, stripeMat);
    stripes.rotation.x = -Math.PI / 2;
    stripes.position.y = 0.02;
    stripes.position.z = 120;
    scene.add(stripes);

    const skinDef = {
      shirt: appearance.shirt ?? DEFAULT_APPEARANCE.shirt,
      pants: appearance.pants ?? DEFAULT_APPEARANCE.pants,
      skin: appearance.skin ?? DEFAULT_APPEARANCE.skin,
    };
    const player = makeRobloxPlayerMesh(skinDef);
    scene.add(player);

    const bomzi = makeBomziMesh();
    scene.add(bomzi);

    const obstacles = [];

    function spawnObstacle(aheadZ) {
      const x = 0;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.55, 0.7, 1.08),
        new THREE.MeshStandardMaterial({
          color: Math.random() < 0.5 ? 0xd4a85c : 0xc2783a,
          roughness: 0.76,
        }),
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(x, 0.35, aheadZ);
      scene.add(mesh);
      obstacles.push({
        mesh,
        z: aheadZ,
        x,
        typ: 'low',
        laneIndex: 1,
      });
    }

    /** Plats «baļķis» — ilgāka sadursmes zona z virzienā */
    function spawnWideLow(aheadZ) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(3.05, 0.68, 2.28),
        new THREE.MeshStandardMaterial({
          color: Math.random() < 0.5 ? 0xb89264 : 0x9e7040,
          roughness: 0.77,
        }),
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(0, 0.34, aheadZ);
      scene.add(mesh);
      obstacles.push({
        mesh,
        z: aheadZ,
        x: 0,
        typ: 'wide',
      });
    }

    /** Augsta siena — jāpārlec (augstāk nekā zemais klucis) */
    function spawnHighWall(aheadZ) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(3.25, 1.52, 1.05),
        new THREE.MeshStandardMaterial({
          color: Math.random() < 0.5 ? 0x7a6548 : 0x5c4a38,
          roughness: 0.82,
        }),
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(0, 0.76, aheadZ);
      scene.add(mesh);
      obstacles.push({
        mesh,
        z: aheadZ,
        x: 0,
        typ: 'high',
      });
    }

    /** Divi stabi ar spraugu vidū — var izspraukt bez lēciena pa vidu */
    function spawnPillarGap(aheadZ) {
      const mat = new THREE.MeshStandardMaterial({
        color: Math.random() < 0.5 ? 0x6b5344 : 0x8a6a52,
        roughness: 0.74,
      });
      const h = 1.08;
      const w = 0.92;
      const d = 1.02;
      const geom = new THREE.BoxGeometry(w, h, d);
      const meshL = new THREE.Mesh(geom, mat);
      meshL.castShadow = true;
      meshL.receiveShadow = true;
      meshL.position.set(-1.2, h * 0.5, 0);
      const meshR = new THREE.Mesh(geom, mat);
      meshR.castShadow = true;
      meshR.receiveShadow = true;
      meshR.position.set(1.2, h * 0.5, 0);
      const root = new THREE.Group();
      root.add(meshL, meshR);
      root.position.set(0, 0, aheadZ);
      scene.add(root);
      obstacles.push({
        mesh: root,
        z: aheadZ,
        typ: 'pillars',
        parts: [meshL, meshR],
      });
    }

    /**
     * Divas malas ar bedri vidū — uz zemes vidū paliekot, trieciens.
     * Jānobīdās uz malu un jālec pāri bedrei uz otru malu.
     */
    function spawnPitSpan(aheadZ) {
      const pitHalfWidth = 0.91;
      const pitHalfZ = 0.69;
      const platW = 1.06;
      const platH = 0.54;
      const platD = 1.38;
      const matPlat = new THREE.MeshStandardMaterial({
        color: Math.random() < 0.5 ? 0x6f5e48 : 0x8c744c,
        roughness: 0.8,
      });
      const geom = new THREE.BoxGeometry(platW, platH, platD);
      const leftPlat = new THREE.Mesh(geom, matPlat);
      leftPlat.castShadow = true;
      leftPlat.receiveShadow = true;
      leftPlat.position.set(-1.44, platH * 0.5, 0);
      const rightPlat = new THREE.Mesh(geom, matPlat);
      rightPlat.castShadow = true;
      rightPlat.receiveShadow = true;
      rightPlat.position.set(1.44, platH * 0.5, 0);
      const pitMat = new THREE.MeshStandardMaterial({
        color: 0x15151c,
        roughness: 1,
      });
      const pitVis = new THREE.Mesh(
        new THREE.PlaneGeometry(1.88, platD * 0.94),
        pitMat,
      );
      pitVis.rotation.x = -Math.PI / 2;
      pitVis.position.set(0, 0.025, 0);
      pitVis.receiveShadow = true;
      const root = new THREE.Group();
      root.add(leftPlat, rightPlat, pitVis);
      root.position.set(0, 0, aheadZ);
      scene.add(root);
      obstacles.push({
        mesh: root,
        z: aheadZ,
        typ: 'pit_span',
        pitHalfWidth,
        pitHalfZ,
      });
    }

    function spawnLaserGate(aheadZ) {
      const root = new THREE.Group();
      const postGeo = new THREE.BoxGeometry(0.24, 1.42, 0.24);
      const postMat = new THREE.MeshStandardMaterial({
        color: 0x4a5060,
        roughness: 0.62,
      });
      const poleL = new THREE.Mesh(postGeo, postMat);
      poleL.position.set(-1.42, 0.71, 0);
      poleL.castShadow = true;
      const poleR = poleL.clone();
      poleR.position.x = 1.42;
      root.add(poleL, poleR);

      const beamGeo = new THREE.BoxGeometry(3.15, 0.14, 0.16);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xff1020,
        transparent: true,
        opacity: 0.9,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 1.14, 0);
      root.add(beam);

      const glowGeo = new THREE.BoxGeometry(3.35, 0.32, 0.26);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff5522,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(0, 1.14, 0);
      glow.renderOrder = 2;
      root.add(glow);

      root.position.set(0, 0, aheadZ);
      scene.add(root);

      obstacles.push({
        mesh: root,
        z: aheadZ,
        x: 0,
        typ: 'laser',
        beamMat,
        glowMat,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    function spawnRow(aheadZ) {
      const r = Math.random();
      let t = 0;
      t += LASER_CHANCE;
      if (r < t) {
        spawnLaserGate(aheadZ);
        return;
      }
      t += HIGH_WALL_CHANCE;
      if (r < t) {
        spawnHighWall(aheadZ);
        return;
      }
      t += WIDE_LOW_CHANCE;
      if (r < t) {
        spawnWideLow(aheadZ);
        return;
      }
      t += PILLAR_GAP_CHANCE;
      if (r < t) {
        spawnPillarGap(aheadZ);
        return;
      }
      t += PIT_SPAN_CHANCE;
      if (r < t) {
        spawnPitSpan(aheadZ);
        return;
      }
      spawnObstacle(aheadZ);
    }

    let px = 0;
    let pz = 4;
    let py = 0;
    let vy = 0;
    let stumble = 0;
    let score = 0;
    let runAnimT = 0;
    let wantJump = false;
    let wantHack = false;
    let pendingHackKind = null;
    let activeHackKind = loadSelectedHackKind();
    let hackInvuln = 0;

    bomzi.position.set(0, 0, pz - CHASE_SAFE);

    let nextZ = pz + 26;
    for (let i = 0; i < 28; i++) {
      spawnRow(nextZ);
      nextZ +=
        HURDLE_GAP_MIN + Math.random() * (HURDLE_GAP_MAX - HURDLE_GAP_MIN);
    }

    const keys = { brake: false, left: false, right: false };

    let raf = 0;

    function emitGameOver(payload) {
      if (ended) return;
      ended = true;
      endCb.current?.({
        ...payload,
        canRevive: loadHacks() >= 1,
      });
    }

    function tryRevive() {
      if (!ended) return;
      const h = loadHacks();
      if (h < 1) return;
      saveHacks(h - 1);
      ended = false;
      hackInvuln = getHackDef('shield').invulnSec;
      stumble = 0;
      bomzi.position.z -= 14;
      window.dispatchEvent(new CustomEvent(BOMZISCHASE_HACK_CHANGED));
      window.dispatchEvent(new CustomEvent(BOMZISCHASE_REVIVED_EVENT));
      raf = requestAnimationFrame(loop);
    }

    const onKd = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        wantJump = true;
        e.preventDefault();
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        keys.brake = true;
        e.preventDefault();
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keys.left = true;
        e.preventDefault();
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keys.right = true;
        e.preventDefault();
      }
      if (e.code === 'KeyH') {
        if (ended) tryRevive();
        else {
          wantHack = true;
          pendingHackKind = loadSelectedHackKind();
        }
        e.preventDefault();
      }
    };
    const onKu = (e) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        keys.brake = false;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keys.left = false;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keys.right = false;
      }
    };
    const onPointerJump = (e) => {
      wantJump = true;
      e.preventDefault();
    };
    const onJumpEvent = () => {
      wantJump = true;
    };
    const onBrakeEvent = (e) => {
      keys.brake = Boolean(e.detail?.down);
    };
    const onHackEvent = (e) => {
      if (ended) tryRevive();
      else {
        wantHack = true;
        pendingHackKind = normalizeHackKind(
          e.detail?.kind != null ? e.detail.kind : loadSelectedHackKind(),
        );
      }
    };
    const onReviveEvent = () => {
      tryRevive();
    };
    const onStrafeLeftEvent = (e) => {
      keys.left = Boolean(e.detail?.down);
    };
    const onStrafeRightEvent = (e) => {
      keys.right = Boolean(e.detail?.down);
    };
    window.addEventListener('keydown', onKd);
    window.addEventListener('keyup', onKu);
    wrap.addEventListener('pointerdown', onPointerJump, { passive: false });
    window.addEventListener(BOMZISCHASE_JUMP_EVENT, onJumpEvent);
    window.addEventListener(BOMZISCHASE_BRAKE_EVENT, onBrakeEvent);
    window.addEventListener(BOMZISCHASE_HACK_EVENT, onHackEvent);
    window.addEventListener(BOMZISCHASE_REVIVE_EVENT, onReviveEvent);
    window.addEventListener(BOMZISCHASE_STRAFE_LEFT_EVENT, onStrafeLeftEvent);
    window.addEventListener(BOMZISCHASE_STRAFE_RIGHT_EVENT, onStrafeRightEvent);

    function loop() {
      if (ended) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const spd = RUN_SPEED * (stumble > 0 ? STUMBLE_SLOW : 1);
      const brakeHeld = keys.brake;
      const forwardSpd = brakeHeld ? 0 : spd;

      if (wantHack) {
        wantHack = false;
        const h = loadHacks();
        const kind = normalizeHackKind(
          pendingHackKind ?? loadSelectedHackKind(),
        );
        pendingHackKind = null;
        const def = getHackDef(kind);
        if (h > 0 && hackInvuln <= 1e-6) {
          saveHacks(h - 1);
          activeHackKind = kind;
          hackInvuln = def.invulnSec;
          stumble = 0;
          bomzi.position.z -= def.bomziKick;
          if (def.vyBoost > 0) vy += def.vyBoost;
          window.dispatchEvent(new CustomEvent(BOMZISCHASE_HACK_CHANGED));
        }
      }
      const immune = hackInvuln > 0;

      stumble = Math.max(0, stumble - dt);

      if (wantJump && py < 0.05) vy = JUMP_V;
      wantJump = false;

      py += vy * dt;
      vy -= GRAVITY * dt;
      if (py < 0) {
        py = 0;
        vy = 0;
      }

      pz += forwardSpd * dt;
      score += forwardSpd * dt;

      let sx = 0;
      if (keys.left) sx -= 1;
      if (keys.right) sx += 1;
      if (sx !== 0) {
        const sm = stumble > 0 ? 0.52 : 1;
        px += sx * STRAFE_SPEED * sm * dt;
        px = THREE.MathUtils.clamp(px, -TRACK_HALF, TRACK_HALF);
      }

      player.position.set(px, py, pz);

      runAnimT += dt * (forwardSpd > 0.5 ? spd : 2.5) * 0.38;
      const rig = player.userData.rig;
      if (rig) {
        const inAir = py > 0.06 || vy > 0.35;
        const strideBase = stumble > 0 ? 0.22 : inAir ? 0.18 : 0.58;
        const stride =
          brakeHeld && !inAir ? strideBase * 0.12 : strideBase;
        const ph = runAnimT * 13;
        const s = Math.sin(ph);
        rig.legL.rotation.x = s * stride;
        rig.legR.rotation.x = -s * stride;
        rig.armL.rotation.x = -s * stride * 0.82;
        rig.armR.rotation.x = s * stride * 0.82;
        if (inAir) {
          rig.armL.rotation.z = 0.42;
          rig.armR.rotation.z = -0.42;
          rig.armL.rotation.x -= 0.55;
          rig.armR.rotation.x -= 0.55;
        } else {
          rig.armL.rotation.z = 0;
          rig.armR.rotation.z = 0;
        }
        player.rotation.z =
          stumble > 0 ? Math.sin(stumble * 24) * 0.14 : THREE.MathUtils.lerp(
              player.rotation.z,
              0,
              Math.min(1, 12 * dt),
            );
      }

      const targetGap = stumble > 0 ? 2.25 : CHASE_SAFE;
      const targetBz = pz - targetGap;
      const gapPrev = pz - bomzi.position.z;
      const rush =
        gapPrev < 10 ? 1 + ((10 - gapPrev) / 10) * 1.05 : 1;
      bomzi.position.z = THREE.MathUtils.lerp(
        bomzi.position.z,
        targetBz,
        Math.min(1, (stumble > 0 ? 7 : 3.9) * rush * dt),
      );
      bomzi.position.x = THREE.MathUtils.lerp(
        bomzi.position.x,
        px,
        Math.min(1, 10 * dt),
      );
      bomzi.position.y = 0;
      bomzi.lookAt(px, py + 0.95, pz + 4);

      let gapNow = pz - bomzi.position.z;
      if (gapNow < 8 && gapNow > 0.18) {
        const room = Math.max(0, gapNow - 0.95);
        bomzi.position.z += Math.min(STRIKE_LUNGE_SPEED * dt, room);
      }
      gapNow = pz - bomzi.position.z;

      const bu = bomzi.userData;
      const close01 = THREE.MathUtils.clamp((10 - gapNow) / 10, 0, 1);
      if (bu?.stick) {
        bu.swingT = (bu.swingT || 0) + dt * (12 + close01 * 18);
        const swingAmp = 0.1 + close01 * 1.15;
        bu.stick.rotation.x =
          Math.PI / 11 +
          Math.sin(bu.swingT) * swingAmp +
          close01 * 0.62;
        bu.stick.rotation.z =
          Math.PI / 4.2 +
          Math.sin(bu.swingT * 0.65) * (0.06 + close01 * 0.35);
      }

      camera.position.x +=
        (px + CAM_SIDE_X - camera.position.x) * Math.min(1, 8 * dt);
      camera.position.z = pz - CAM_DIST_BACK;
      camera.position.y = 6.15 + py * 0.34;
      {
        const aheadZ = pz + 22;
        const tx = THREE.MathUtils.lerp(
          px - 0.55,
          bomzi.position.x,
          LOOK_BOMZI_MIX,
        );
        const ty = THREE.MathUtils.lerp(py + 1.12, py + 1.55, LOOK_BOMZI_MIX);
        const tz = THREE.MathUtils.lerp(
          aheadZ,
          bomzi.position.z + 2.5,
          LOOK_BOMZI_MIX * 0.92,
        );
        camera.lookAt(tx, ty, tz);
      }

      player.updateMatrixWorld(true);
      const playerBox = new THREE.Box3().setFromObject(player);

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        if (o.z < pz - 15) {
          scene.remove(o.mesh);
          obstacles.splice(i, 1);
          continue;
        }
        if (o.typ === 'pit_span') {
          if (
            !immune &&
            py < 0.13 &&
            Math.abs(px) < o.pitHalfWidth &&
            Math.abs(pz - o.z) < o.pitHalfZ
          ) {
            stumble = STUMBLE_TIME;
          }
          continue;
        }
        if (o.typ === 'pillars' && o.parts) {
          let hitPillar = false;
          for (const part of o.parts) {
            part.updateMatrixWorld(true);
            const pb = new THREE.Box3().setFromObject(part);
            if (playerBox.intersectsBox(pb)) hitPillar = true;
          }
          if (hitPillar && !immune) stumble = STUMBLE_TIME;
          continue;
        }
        if (o.typ === 'laser' && o.beamMat) {
          o.pulsePhase += dt * 12;
          o.beamMat.opacity = 0.68 + 0.26 * Math.sin(o.pulsePhase);
          if (o.glowMat)
            o.glowMat.opacity = 0.18 + 0.14 * Math.sin(o.pulsePhase * 1.4);
        }
        o.mesh.updateMatrixWorld(true);
        let box = new THREE.Box3().setFromObject(o.mesh);
        if (o.typ === 'laser') {
          const beam = o.mesh.children.find(
            (ch) => ch.material === o.beamMat,
          );
          if (beam) {
            beam.updateMatrixWorld(true);
            box = new THREE.Box3().setFromObject(beam);
          }
        }
        if (playerBox.intersectsBox(box)) {
          let ok = immune;
          if (!ok && (o.typ === 'low' || o.typ === 'wide') && py > CLEAR_LOW)
            ok = true;
          if (!ok && o.typ === 'high' && py > CLEAR_HIGH) ok = true;
          if (!ok && o.typ === 'laser' && py > CLEAR_LASER) ok = true;
          if (!ok) {
            if (o.typ === 'laser') {
              emitGameOver({
                score: Math.floor(score),
                laser: true,
              });
              renderer.render(scene, camera);
              return;
            }
            stumble = STUMBLE_TIME;
          }
        }
      }

      bomzi.updateMatrixWorld(true);
      const ud = bomzi.userData;
      const dx = px - bomzi.position.x;
      const dy = py + 0.92 - 1.06;
      const dz = pz - bomzi.position.z;
      const hitRs = BOMZI_HIT_RADIUS * BOMZI_HIT_RADIUS;
      let bomziConnected = dx * dx + dy * dy + dz * dz < hitRs;
      if (!bomziConnected && ud?.stick) {
        ud.stick.updateMatrixWorld(true);
        const stickBox = new THREE.Box3()
          .setFromObject(ud.stick)
          .expandByScalar(STICK_HIT_PAD);
        if (playerBox.intersectsBox(stickBox)) bomziConnected = true;
      }
      if (!bomziConnected && ud?.coat) {
        ud.coat.updateMatrixWorld(true);
        if (playerBox.intersectsBox(new THREE.Box3().setFromObject(ud.coat)))
          bomziConnected = true;
      }
      if (!bomziConnected && ud?.head) {
        ud.head.updateMatrixWorld(true);
        if (playerBox.intersectsBox(new THREE.Box3().setFromObject(ud.head)))
          bomziConnected = true;
      }
      if (bomziConnected && !immune) {
        emitGameOver({
          score: Math.floor(score),
          caught: true,
          hitByBomzi: true,
        });
        renderer.render(scene, camera);
        return;
      }

      while (
        obstacles.length === 0 ||
        obstacles[obstacles.length - 1].z < pz + 95
      ) {
        const lastZ =
          obstacles.length > 0 ? obstacles[obstacles.length - 1].z : pz;
        const gap =
          HURDLE_GAP_MIN + Math.random() * (HURDLE_GAP_MAX - HURDLE_GAP_MIN);
        spawnRow(lastZ + gap);
      }

      const distCatch = pz - bomzi.position.z;

      hackInvuln = Math.max(0, hackInvuln - dt);

      hudCb.current?.({
        score: Math.floor(score),
        gap: Math.max(0, Math.round(distCatch * 10) / 10),
        braking: brakeHeld,
        hacks: loadHacks(),
        hackInvuln,
        hackKind: activeHackKind,
      });

      if (!immune && distCatch < CATCH_DIST) {
        emitGameOver({
          score: Math.floor(score),
          caught: true,
          hitByBomzi: true,
        });
        renderer.render(scene, camera);
        return;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }

    loop();

    return () => {
      ended = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', onKd);
      window.removeEventListener('keyup', onKu);
      wrap.removeEventListener('pointerdown', onPointerJump, {
        passive: false,
      });
      window.removeEventListener(BOMZISCHASE_JUMP_EVENT, onJumpEvent);
      window.removeEventListener(BOMZISCHASE_BRAKE_EVENT, onBrakeEvent);
      window.removeEventListener(BOMZISCHASE_HACK_EVENT, onHackEvent);
      window.removeEventListener(BOMZISCHASE_REVIVE_EVENT, onReviveEvent);
      window.removeEventListener(BOMZISCHASE_STRAFE_LEFT_EVENT, onStrafeLeftEvent);
      window.removeEventListener(BOMZISCHASE_STRAFE_RIGHT_EVENT, onStrafeRightEvent);
      renderer.dispose();
      if (renderer.domElement.parentNode === wrap) {
        wrap.removeChild(renderer.domElement);
      }
      groundGeo.dispose();
      groundMat.dispose();
      stripeGeo.dispose();
      stripeMat.dispose();
    };
  }, [appearance.shirt, appearance.pants, appearance.skin]);

  return <div className="bomzischase-canvas-wrap" ref={wrapRef} />;
}
