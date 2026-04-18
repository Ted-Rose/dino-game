import { useEffect, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { createForestAudio } from './Forest99Audio';

const NIGHT_GOAL = 99;
const DAY_SEC = 32;
const NIGHT_SEC = 26;
const WORLD_HALF = 48;
const FIRE_SAFE_R = 7;
const COLD_START_R = 22;
const SANITY_SAFE_R = 14;
const PLAYER_H = 1.45;
const PLAYER_R = 0.45;
const INTERACT_RANGE = 3.35;
const FEED_FIRE_RANGE = 5.5;
const MERCHANT_DIST = 3.8;
const ACTION_CD = 0.4;
const ATTACK_CD = 0.42;
const ATTACK_RANGE = 2.85;
const ATTACK_HALF_ARC = Math.cos((50 * Math.PI) / 180);

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Forest99Game({ onHudUpdate, onGameEnd }) {
  const wrapRef = useRef(null);
  const hudThrottle = useRef(0);
  const endedRef = useRef(false);
  const hudCb = useRef(onHudUpdate);
  const endCb = useRef(onGameEnd);

  useLayoutEffect(() => {
    hudCb.current = onHudUpdate;
    endCb.current = onGameEnd;
  });

  useEffect(() => {
    endedRef.current = false;
    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    const rand = mulberry32(0x991f04e7);
    const audio = createForestAudio();

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(72, 1, 0.12, 220);
    camera.position.set(0, PLAYER_H, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    wrap.appendChild(renderer.domElement);

    function fitRenderer() {
      const el = wrapRef.current;
      if (!el) return;
      let w = el.clientWidth;
      let h = el.clientHeight;
      const r = el.getBoundingClientRect();
      if (w < 4) w = Math.round(r.width) || Math.min(window.innerWidth, 1920);
      if (h < 4) {
        h = Math.round(r.height) || Math.max(360, Math.floor(window.innerHeight * 0.62));
      }
      w = Math.max(64, w);
      h = Math.max(64, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    fitRenderer();
    requestAnimationFrame(() => {
      fitRenderer();
      requestAnimationFrame(fitRenderer);
    });

    const moonLight = new THREE.DirectionalLight(0xd4e8ff, 0.78);
    moonLight.position.set(-40, 80, 20);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(2048, 2048);
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 200;
    moonLight.shadow.camera.left = -70;
    moonLight.shadow.camera.right = 70;
    moonLight.shadow.camera.top = 70;
    moonLight.shadow.camera.bottom = -70;
    scene.add(moonLight);

    const amb = new THREE.HemisphereLight(0x6a9cba, 0x2a3844, 0.62);
    scene.add(amb);

    const fill = new THREE.DirectionalLight(0xa8c8e8, 0.22);
    fill.position.set(30, 40, 35);
    scene.add(fill);

    const groundGeo = new THREE.PlaneGeometry(WORLD_HALF * 2.5, WORLD_HALF * 2.5, 64, 64);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 0.07) * 0.35 + Math.cos(z * 0.05) * 0.28 + (rand() - 0.5) * 0.15);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x355a42,
      roughness: 0.9,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 3.2, 8);
    const crownGeo = new THREE.ConeGeometry(2.2, 5.5, 10);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4030, roughness: 1 });
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x1e4a32, roughness: 0.92 });
    const rockGeo = new THREE.DodecahedronGeometry(0.62, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a6e72, roughness: 1 });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x286030, roughness: 1 });

    const trees = [];

    for (let i = 0; i < 200; i++) {
      const x = (rand() - 0.5) * WORLD_HALF * 1.85;
      const z = (rand() - 0.5) * WORLD_HALF * 1.85;
      if (x * x + z * z < 14 * 14) continue;
      const s = 0.75 + rand() * 0.85;
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      const crown = new THREE.Mesh(crownGeo, crownMat);
      trunk.scale.setScalar(s);
      crown.scale.setScalar(s);
      trunk.position.set(0, 1.6 * s, 0);
      crown.position.set(0, 4.2 * s, 0);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      crown.castShadow = true;
      crown.receiveShadow = true;

      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.add(trunk, crown);
      scene.add(group);
      trees.push(group);
    }

    const rocks = [];
    for (let i = 0; i < 38; i++) {
      const x = (rand() - 0.5) * WORLD_HALF * 1.75;
      const z = (rand() - 0.5) * WORLD_HALF * 1.75;
      if (x * x + z * z < 11 * 11) continue;
      const mesh = new THREE.Mesh(rockGeo, rockMat);
      mesh.position.set(x, 0.45, z);
      mesh.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      rocks.push(mesh);
    }

    const bushes = [];
    for (let i = 0; i < 32; i++) {
      const x = (rand() - 0.5) * WORLD_HALF * 1.72;
      const z = (rand() - 0.5) * WORLD_HALF * 1.72;
      if (x * x + z * z < 16 * 16) continue;
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 8), bushMat);
      bush.position.set(x, 0.65, z);
      bush.castShadow = true;
      bush.receiveShadow = true;
      scene.add(bush);
      bushes.push(bush);
    }

    const merchant = new THREE.Group();
    merchant.position.set(11.5, 0, 9.5);
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 1.35, 10),
      new THREE.MeshStandardMaterial({ color: 0x4a6a8a, roughness: 0.85 })
    );
    body.position.y = 0.85;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xe8c8a8, roughness: 0.9 })
    );
    head.position.y = 1.75;
    head.castShadow = true;
    merchant.add(body, head);
    scene.add(merchant);

    const fireGroup = new THREE.Group();
    fireGroup.position.set(0, 0, 0);
    const ringGeo = new THREE.RingGeometry(2.2, 2.9, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x3a3328,
      roughness: 1,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.receiveShadow = true;
    fireGroup.add(ring);

    const logGeo = new THREE.CylinderGeometry(0.15, 0.18, 2.4, 8);
    const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 1 });
    for (let i = 0; i < 5; i++) {
      const log = new THREE.Mesh(logGeo, logMat);
      const a = (i / 5) * Math.PI * 2 + rand() * 0.4;
      log.rotation.z = Math.PI / 2;
      log.rotation.y = a;
      log.position.set(Math.cos(a) * 0.9, 0.25, Math.sin(a) * 0.9);
      log.castShadow = true;
      fireGroup.add(log);
    }

    const emberGeo = new THREE.SphereGeometry(0.35, 10, 10);
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff6a1a });
    const ember = new THREE.Mesh(emberGeo, emberMat);
    ember.position.y = 0.55;
    fireGroup.add(ember);

    const fireLight = new THREE.PointLight(0xff8c42, 5.5, 38, 1.8);
    fireLight.position.set(0, 1.4, 0);
    fireLight.castShadow = true;
    fireLight.shadow.bias = -0.0008;
    fireGroup.add(fireLight);
    scene.add(fireGroup);

    let fireFuel = 72;

    const lookTarget = new THREE.Vector3();
    const forwardFlat = new THREE.Vector3();

    const player = new THREE.Group();
    player.position.set(0, 0, 6);
    scene.add(player);
    player.add(camera);

    const keys = {};
    const onKeyDown = (e) => {
      keys[e.code] = true;
      if (e.code === 'Escape' && document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
      }
      audio.resume();
    };
    const onKeyUp = (e) => {
      keys[e.code] = false;
    };

    let yaw = 0;
    let pitch = 0;
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');

    const onMouseMove = (e) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      const sens = 0.0022;
      yaw -= e.movementX * sens;
      pitch -= e.movementY * sens;
      const lim = Math.PI / 2 - 0.08;
      pitch = Math.max(-lim, Math.min(lim, pitch));
    };

    const onClick = () => {
      audio.resume();
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    let survivedNights = 0;
    let isDay = true;
    let phaseLeft = DAY_SEC;
    let wood = 2;
    let stone = 1;
    let berries = 2;
    let coins = 5;
    let hp = 100;
    let hunger = 92;
    let stamina = 100;
    let sanity = 100;
    let spearOwned = false;
    let shelterLevel = 0;
    let torchUnlocked = false;
    function effectiveFireFuel() {
      return fireFuel + shelterLevel * 6;
    }

    /** @type {{ mesh: THREE.Group; speed: number; kind: 'animal' | 'shadow'; hp: number }[]} */
    let enemies = [];

    const milestonesSeen = new Set();

    function spawnAnimalEnemy() {
      const angle = rand() * Math.PI * 2;
      const dist = 32 + rand() * 14;
      const group = new THREE.Group();
      group.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.65, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x6b4428, roughness: 0.95 })
      );
      body.position.y = 0.55;
      body.castShadow = true;

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.5, 0.65),
        new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.95 })
      );
      head.position.set(0, 0.75, 0.45);
      head.castShadow = true;

      const tail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.14, 0.55, 6),
        new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 1 })
      );
      tail.rotation.z = Math.PI / 2.4;
      tail.position.set(0, 0.45, -0.55);

      group.add(body, head, tail);
      scene.add(group);
      enemies.push({
        mesh: group,
        speed: 3 + survivedNights * 0.065 + rand() * 0.85,
        kind: 'animal',
        hp: 38 + Math.floor(rand() * 10),
      });
    }

    function spawnShadowEnemy() {
      const angle = rand() * Math.PI * 2;
      const dist = 34 + rand() * 14;
      const group = new THREE.Group();
      group.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 1.35, 0.55),
        new THREE.MeshStandardMaterial({
          color: 0x151018,
          roughness: 0.9,
          emissive: 0x330022,
          emissiveIntensity: 0.35,
        })
      );
      body.position.y = 0.85;
      body.castShadow = true;

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.55, 0.55),
        new THREE.MeshStandardMaterial({
          color: 0x1a1018,
          emissive: 0xff0044,
          emissiveIntensity: 0.95,
        })
      );
      head.position.y = 1.75;
      head.castShadow = true;

      group.add(body, head);
      scene.add(group);
      enemies.push({
        mesh: group,
        speed: 2.55 + survivedNights * 0.06 + rand() * 0.7,
        kind: 'shadow',
        hp: 48 + Math.floor(rand() * 14),
      });
    }

    function clearEnemies() {
      enemies.forEach((e) => scene.remove(e.mesh));
      enemies = [];
    }

    function spawnEnemiesForCurrentPhase() {
      clearEnemies();
      const animalCount = Math.min(2 + Math.floor(survivedNights / 2), 13);
      for (let i = 0; i < animalCount; i++) spawnAnimalEnemy();

      if (!isDay) {
        const shadowCount = Math.min(1 + Math.floor(survivedNights / 4), 9);
        for (let i = 0; i < shadowCount; i++) spawnShadowEnemy();
      }
    }

    function applyDayNightVisuals() {
      if (isDay) {
        audio.dayAmb();
        scene.background = new THREE.Color(0x7ec8e8);
        scene.fog = new THREE.FogExp2(0xa8d4e8, 0.007);
        amb.color.setHex(0x9ecfff);
        amb.groundColor.setHex(0x6a8a5a);
        amb.intensity = 0.78;
        moonLight.color.setHex(0xfff4dd);
        moonLight.intensity = 1.05;
        moonLight.position.set(55, 95, 35);
        fill.intensity = 0.42;
        fill.color.setHex(0xffeed0);
        groundMat.color.setHex(0x4a7a58);
      } else {
        audio.nightAmb();
        scene.background = new THREE.Color(0x182630);
        const fogD = torchUnlocked ? 0.011 : 0.014;
        scene.fog = new THREE.FogExp2(0x243944, fogD);
        amb.color.setHex(0x6a9cba);
        amb.groundColor.setHex(0x2a3844);
        amb.intensity = 0.62;
        moonLight.color.setHex(0xd4e8ff);
        moonLight.intensity = 0.78;
        moonLight.position.set(-40, 80, 20);
        fill.intensity = 0.22;
        fill.color.setHex(0xa8c8e8);
        groundMat.color.setHex(0x355a42);
      }
    }

    applyDayNightVisuals();
    spawnEnemiesForCurrentPhase();

    function resolvePlayerXZ(nx, nz) {
      let x = nx;
      let z = nz;
      const lim = WORLD_HALF - PLAYER_R;
      x = Math.max(-lim, Math.min(lim, x));
      z = Math.max(-lim, Math.min(lim, z));
      return { x, z };
    }

    let actionCd = 0;
    let attackCd = 0;
    let damageCd = 0;
    let prevE = false;
    let prevF = false;
    let prevQ = false;
    let prevR = false;
    let prevH = false;
    let prevSpace = false;
    let prevDigit1 = false;
    let prevDigit2 = false;

    function distMerchant() {
      return Math.hypot(player.position.x - merchant.position.x, player.position.z - merchant.position.z);
    }

    function tryInteractHarvest() {
      if (actionCd > 0) return;
      const px = player.position.x;
      const pz = player.position.z;
      let bestType = '';
      let bestIdx = -1;
      let bestD = INTERACT_RANGE;

      for (let i = 0; i < trees.length; i++) {
        const g = trees[i];
        const d = Math.hypot(g.position.x - px, g.position.z - pz);
        if (d < bestD) {
          bestD = d;
          bestType = 'tree';
          bestIdx = i;
        }
      }
      for (let i = 0; i < rocks.length; i++) {
        const d = Math.hypot(rocks[i].position.x - px, rocks[i].position.z - pz);
        if (d < bestD) {
          bestD = d;
          bestType = 'rock';
          bestIdx = i;
        }
      }
      for (let i = 0; i < bushes.length; i++) {
        const d = Math.hypot(bushes[i].position.x - px, bushes[i].position.z - pz);
        if (d < bestD) {
          bestD = d;
          bestType = 'bush';
          bestIdx = i;
        }
      }

      if (bestIdx < 0) return;
      actionCd = ACTION_CD;
      audio.chop();

      if (bestType === 'tree') {
        const removed = trees.splice(bestIdx, 1)[0];
        scene.remove(removed);
        wood += 1 + Math.floor(rand() * 2);
      } else if (bestType === 'rock') {
        const r = rocks.splice(bestIdx, 1)[0];
        scene.remove(r);
        stone += 1 + Math.floor(rand() * 2);
      } else {
        const b = bushes.splice(bestIdx, 1)[0];
        scene.remove(b);
        berries += 2 + Math.floor(rand() * 3);
      }
    }

    function tryFeedFire() {
      if (actionCd > 0 || wood <= 0) return;
      const distFire = Math.hypot(player.position.x, player.position.z);
      if (distFire > FEED_FIRE_RANGE) return;
      actionCd = ACTION_CD;
      wood -= 1;
      fireFuel = Math.min(100, fireFuel + 34);
    }

    function tryCraftSpear() {
      if (actionCd > 0 || spearOwned) return;
      const distFire = Math.hypot(player.position.x, player.position.z);
      if (distFire > FEED_FIRE_RANGE) return;
      if (wood < 5 || stone < 2) return;
      actionCd = ACTION_CD * 1.5;
      wood -= 5;
      stone -= 2;
      spearOwned = true;
      audio.craft();
    }

    function tryEatBerry() {
      if (actionCd > 0 || berries <= 0) return;
      actionCd = ACTION_CD * 0.8;
      berries -= 1;
      hunger = Math.min(100, hunger + 28);
      audio.eat();
    }

    function tryShelterUpgrade() {
      if (actionCd > 0) return;
      const distFire = Math.hypot(player.position.x, player.position.z);
      if (distFire > FEED_FIRE_RANGE || wood < 10) return;
      actionCd = ACTION_CD * 1.2;
      wood -= 10;
      shelterLevel += 1;
      audio.craft();
    }

    function tryMerchantBuy() {
      if (distMerchant() > MERCHANT_DIST) return;
      if (keys.Digit1 && !prevDigit1 && coins >= 6) {
        coins -= 6;
        berries += 3;
        audio.coin();
        actionCd = ACTION_CD * 0.6;
      }
      if (keys.Digit2 && !prevDigit2 && coins >= 10) {
        coins -= 10;
        wood += 4;
        audio.coin();
        actionCd = ACTION_CD * 0.6;
      }
    }

    function meleeDamage() {
      return spearOwned ? 46 : 26;
    }

    function tryMeleeAttack() {
      if (attackCd > 0) return;
      attackCd = ATTACK_CD;
      euler.set(pitch, yaw, 0, 'YXZ');
      forwardFlat.set(0, 0, -1).applyEuler(euler);
      forwardFlat.y = 0;
      forwardFlat.normalize();
      const ox = player.position.x;
      const oz = player.position.z;

      let hitAny = false;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        const mx = en.mesh.position.x - ox;
        const mz = en.mesh.position.z - oz;
        const dist = Math.hypot(mx, mz);
        if (dist > ATTACK_RANGE || dist < 0.01) continue;
        const nx = mx / dist;
        const nz = mz / dist;
        const dot = nx * forwardFlat.x + nz * forwardFlat.z;
        if (dot < ATTACK_HALF_ARC) continue;
        en.hp -= meleeDamage();
        hitAny = true;
        if (en.hp <= 0) {
          scene.remove(en.mesh);
          enemies.splice(i, 1);
          coins += 1;
          audio.coin();
        }
      }
      if (hitAny) audio.hit();
    }

    let storyMessage = '';
    let storyTimer = 0;

    function triggerStory(msg) {
      storyMessage = msg;
      storyTimer = 12;
    }

    function checkStoryMilestones() {
      const checks = [5, 10, 25, 50];
      const msgs = {
        5: 'Tikai tu un liesma: lāpa atslēdz tumšāku miglu naktī.',
        10: 'Mežs kļūst blīvāks — radības pulcējas tālāk krūmos.',
        25: 'Vecā malkas šķīvis runā par tiem, kas nepaspēja līdz ausmai.',
        50: 'Debesis šķiet zemākas. Nakts nemaz negrib izbeigties.',
      };
      for (const n of checks) {
        if (survivedNights >= n && !milestonesSeen.has(n)) {
          milestonesSeen.add(n);
          triggerStory(msgs[n]);
        }
      }
    }

    function pushHud(force = false) {
      const now = performance.now();
      if (!force && now - hudThrottle.current < 100) return;
      hudThrottle.current = now;
      const distFire = Math.hypot(player.position.x, player.position.z);
      const phaseLen = isDay ? DAY_SEC : NIGHT_SEC;
      const nearMerchant = distMerchant() <= MERCHANT_DIST;

      hudCb.current?.({
        isDay,
        survivedNights,
        nightGoal: NIGHT_GOAL,
        phaseLeft: Math.max(0, phaseLeft),
        phaseLen,
        hp: Math.round(Math.max(0, hp)),
        hunger: Math.round(Math.max(0, Math.min(100, hunger))),
        stamina: Math.round(Math.max(0, Math.min(100, stamina))),
        sanity: Math.round(Math.max(0, Math.min(100, sanity))),
        wood,
        stone,
        berries,
        coins,
        fireFuel: Math.round(effectiveFireFuel()),
        spearOwned,
        shelterLevel,
        torchUnlocked,
        canFeedFire: wood > 0 && distFire <= FEED_FIRE_RANGE,
        canCraftSpear: !spearOwned && wood >= 5 && stone >= 2 && distFire <= FEED_FIRE_RANGE,
        canEat: berries > 0,
        canShelter: wood >= 10 && distFire <= FEED_FIRE_RANGE,
        nearMerchant,
        storyLine: storyTimer > 0 ? storyMessage : '',
      });
    }

    function endGame(won) {
      if (endedRef.current) return;
      endedRef.current = true;
      active = false;
      cancelAnimationFrame(raf);
      audio.stopAmb();
      document.exitPointerLock?.();
      endCb.current?.(won);
    }

    let last = performance.now();
    let raf = 0;
    let active = true;

    function animate(now) {
      if (!active) return;
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      storyTimer = Math.max(0, storyTimer - dt);

      if (keys.KeyE && !prevE) tryInteractHarvest();
      if (keys.KeyF && !prevF) tryFeedFire();
      if (keys.KeyQ && !prevQ) tryCraftSpear();
      if (keys.KeyR && !prevR) tryEatBerry();
      if (keys.KeyH && !prevH) tryShelterUpgrade();
      if (keys.Space && !prevSpace) tryMeleeAttack();

      tryMerchantBuy();

      prevE = keys.KeyE;
      prevF = keys.KeyF;
      prevQ = keys.KeyQ;
      prevR = keys.KeyR;
      prevH = keys.KeyH;
      prevSpace = keys.Space;
      prevDigit1 = keys.Digit1;
      prevDigit2 = keys.Digit2;

      actionCd = Math.max(0, actionCd - dt);
      attackCd = Math.max(0, attackCd - dt);
      damageCd = Math.max(0, damageCd - dt);

      euler.set(pitch, yaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);

      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      right.y = 0;
      right.normalize();

      let sprint = keys.ShiftLeft && stamina > 2;
      let mx = 0;
      let mz = 0;
      if (keys.KeyW) {
        mx += forward.x;
        mz += forward.z;
      }
      if (keys.KeyS) {
        mx -= forward.x;
        mz -= forward.z;
      }
      if (keys.KeyA) {
        mx -= right.x;
        mz -= right.z;
      }
      if (keys.KeyD) {
        mx += right.x;
        mz += right.z;
      }
      const len = Math.hypot(mx, mz);
      let speed = sprint ? 10.2 : 6;
      if (len > 0) {
        if (sprint) stamina = Math.max(0, stamina - 28 * dt);
        else stamina = Math.min(100, stamina + 11 * dt);
        mx = (mx / len) * speed * dt;
        mz = (mz / len) * speed * dt;
      } else {
        stamina = Math.min(100, stamina + 16 * dt);
      }

      const nx = player.position.x + mx;
      const nz = player.position.z + mz;
      const { x, z } = resolvePlayerXZ(nx, nz);
      player.position.x = x;
      player.position.z = z;

      phaseLeft -= dt;
      if (phaseLeft <= 0) {
        if (isDay) {
          isDay = false;
          phaseLeft = NIGHT_SEC;
          applyDayNightVisuals();
          spawnEnemiesForCurrentPhase();
        } else {
          survivedNights += 1;
          coins += 2;
          torchUnlocked = survivedNights >= 5;
          checkStoryMilestones();
          if (survivedNights >= NIGHT_GOAL) {
            endGame(true);
            return;
          }
          isDay = true;
          phaseLeft = DAY_SEC;
          hp = Math.min(100, hp + 8);
          hunger = Math.min(100, hunger + 5);
          applyDayNightVisuals();
          spawnEnemiesForCurrentPhase();
        }
      }

      hunger = Math.max(0, hunger - 4.5 * dt);
      if (hunger <= 0) {
        hp -= 7 * dt;
      }

      const distFire = Math.hypot(player.position.x, player.position.z);
      const shelterR = FIRE_SAFE_R + shelterLevel * 1.4;

      if (isDay && distFire > COLD_START_R) {
        hp -= 5 * dt;
      }

      if (!isDay) {
        if (distFire > SANITY_SAFE_R + shelterLevel * 0.8) {
          sanity = Math.max(0, sanity - 10 * dt);
        } else {
          sanity = Math.min(100, sanity + 8 * dt);
        }
        if (sanity < 22) {
          hp -= 3 * dt;
        }
      } else {
        sanity = Math.min(100, sanity + 5 * dt);
      }

      if (distFire < shelterR) {
        hp = Math.min(100, hp + 2.8 * dt * (fireFuel / 85));
        hunger = Math.min(100, hunger + 1.2 * dt);
      }

      hp = Math.min(100, hp);

      if (hp <= 0) {
        audio.hurt();
        endGame(false);
        return;
      }

      const decay = isDay ? 0.55 : 0.85;
      fireFuel = Math.max(5, fireFuel - decay * dt);

      fireLight.distance = 28 + effectiveFireFuel() * 0.11;

      const pulse = Math.sin(now * 0.008) * 0.08 + 1;
      const fuelMul = 0.45 + (effectiveFireFuel() / 130) * 0.85;
      const baseFire = 4.2 * fuelMul * (0.92 + fireFuel / 200);
      fireLight.intensity = baseFire * pulse * 1.05;
      ember.scale.setScalar(0.85 + Math.sin(now * 0.012) * 0.12);

      enemies.forEach((en) => {
        const { mesh, speed } = en;
        const px = player.position.x;
        const pz = player.position.z;
        const gx = mesh.position.x;
        const gz = mesh.position.z;
        const distToFire = Math.hypot(gx, gz);
        let dx = px - gx;
        let dz = pz - gz;
        const dist = Math.hypot(dx, dz) || 1;
        dx /= dist;
        dz /= dist;

        let sp = speed * (1 + survivedNights * 0.008);
        if (distToFire < shelterR + 2.5) {
          const al = Math.hypot(gx, gz) || 1;
          dx = gx / al;
          dz = gz / al;
          sp *= 0.82;
        }

        mesh.position.x += dx * sp * dt;
        mesh.position.z += dz * sp * dt;
        lookTarget.set(px, mesh.position.y, pz);
        mesh.lookAt(lookTarget);

        const hit = Math.hypot(mesh.position.x - px, mesh.position.z - pz);
        if (hit < 1.38 && damageCd <= 0) {
          hp -= en.kind === 'shadow' ? 22 : 16;
          damageCd = 0.72;
          audio.hurt();
        }
      });

      const phaseLen = isDay ? DAY_SEC : NIGHT_SEC;
      const fogNightBoost = isDay ? 0 : (1 - phaseLeft / phaseLen) * 0.012;
      const baseFog = isDay ? 0.006 : torchUnlocked ? 0.009 : 0.012;
      scene.fog.density = baseFog + fogNightBoost;

      renderer.render(scene, camera);
      pushHud();
    }

    raf = requestAnimationFrame(animate);

    const ro = new ResizeObserver(() => fitRenderer());
    ro.observe(wrap);

    pushHud(true);

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      audio.stopAmb();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      wrap.removeChild(renderer.domElement);
      trunkGeo.dispose();
      crownGeo.dispose();
      trunkMat.dispose();
      crownMat.dispose();
      rockGeo.dispose();
      rockMat.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      logGeo.dispose();
      logMat.dispose();
      emberGeo.dispose();
      emberMat.dispose();
    };
  }, []);

  return <div className="forest99-canvas-wrap" ref={wrapRef} />;
}
