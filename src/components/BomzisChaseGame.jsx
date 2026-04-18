import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const LANES = [-2.5, 0, 2.5];
const RUN_SPEED = 15;
const GRAVITY = 42;
const JUMP_V = 13;
const CHASE_SAFE = 11;
const CATCH_DIST = 2.2;
const STUMBLE_TIME = 1.15;
const STUMBLE_SLOW = 0.22;

function makePlayerMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 0.85, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x4a7ecb, roughness: 0.55 }),
  );
  body.castShadow = true;
  body.position.y = 0.85;
  g.add(body);
  return g;
}

function makeBomziMesh() {
  const g = new THREE.Group();
  const coat = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 1.15, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 }),
  );
  coat.castShadow = true;
  coat.position.y = 0.72;
  g.add(coat);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.65 }),
  );
  head.castShadow = true;
  head.position.set(0, 1.38, 0.05);
  g.add(head);
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 2.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b5344, roughness: 0.9 }),
  );
  stick.rotation.z = Math.PI / 5;
  stick.rotation.x = Math.PI / 12;
  stick.position.set(0.55, 0.95, -0.35);
  stick.castShadow = true;
  g.add(stick);
  return g;
}

export default function BomzisChaseGame({ onHud, onGameOver }) {
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
    scene.fog = new THREE.Fog(0xb8c4d8, 28, 130);

    const camera = new THREE.PerspectiveCamera(62, 1, 0.2, 200);
    camera.position.set(0, 5.2, 11);

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

    const player = makePlayerMesh();
    scene.add(player);

    const bomzi = makeBomziMesh();
    scene.add(bomzi);

    const obstacles = [];

    function spawnObstacle(aheadZ) {
      const lane = Math.floor(Math.random() * 3);
      const x = LANES[lane];
      const typ = Math.random() < 0.55 ? 'low' : 'wall';

      let mesh;
      if (typ === 'low') {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(2.4, 0.65, 1.1),
          new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 }),
        );
        mesh.position.set(x, 0.325, aheadZ);
      } else {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 2.4, 1),
          new THREE.MeshStandardMaterial({ color: 0x6d5a4a, roughness: 0.78 }),
        );
        mesh.position.set(x, 1.2, aheadZ);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      obstacles.push({
        mesh,
        z: aheadZ,
        x,
        lane,
        typ,
        laneIndex: lane,
      });
    }

    let laneIdx = 1;
    let targetX = LANES[laneIdx];
    let px = LANES[laneIdx];
    let pz = 4;
    let py = 0;
    let vy = 0;
    let stumble = 0;
    let score = 0;

    bomzi.position.set(px * 0.6, 0, pz - CHASE_SAFE);

    let spawnZ = pz + 35;
    for (let i = 0; i < 18; i++) {
      spawnObstacle(spawnZ + i * 11 + Math.random() * 5);
    }

    const keys = {};
    const onKd = (e) => {
      keys[e.code] = true;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        laneIdx = Math.max(0, laneIdx - 1);
        targetX = LANES[laneIdx];
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        laneIdx = Math.min(2, laneIdx + 1);
        targetX = LANES[laneIdx];
      }
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (py < 0.05) vy = JUMP_V;
      }
      e.preventDefault();
    };
    const onKu = (e) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', onKd);
    window.addEventListener('keyup', onKu);

    let raf = 0;

    function loop() {
      if (ended) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const spd = RUN_SPEED * (stumble > 0 ? STUMBLE_SLOW : 1);

      stumble = Math.max(0, stumble - dt);

      px += (targetX - px) * Math.min(1, 14 * dt);

      py += vy * dt;
      vy -= GRAVITY * dt;
      if (py < 0) {
        py = 0;
        vy = 0;
      }

      pz += spd * dt;
      score += spd * dt;

      player.position.set(px, py, pz);

      const targetGap = stumble > 0 ? 4 : CHASE_SAFE;
      const targetBz = pz - targetGap;
      bomzi.position.z = THREE.MathUtils.lerp(
        bomzi.position.z,
        targetBz,
        Math.min(1, (stumble > 0 ? 6 : 2.5) * dt),
      );
      bomzi.position.x = THREE.MathUtils.lerp(
        bomzi.position.x,
        px,
        Math.min(1, 10 * dt),
      );
      bomzi.position.y = 0;
      bomzi.lookAt(px, py + 0.9, pz + 2);

      camera.position.x += (px * 0.65 - camera.position.x) * 6 * dt;
      camera.position.z = pz + 10;
      camera.position.y = 5.2 + py * 0.25;
      camera.lookAt(px, py + 1.2, pz + 18);

      player.updateMatrixWorld(true);
      const playerBox = new THREE.Box3().setFromObject(player);

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        if (o.z < pz - 15) {
          scene.remove(o.mesh);
          obstacles.splice(i, 1);
          continue;
        }
        o.mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(o.mesh);
        if (playerBox.intersectsBox(box)) {
          let ok = false;
          if (o.typ === 'low' && py > 0.82) ok = true;
          if (o.typ === 'wall' && Math.abs(px - o.x) > 1.38) ok = true;
          if (!ok) stumble = STUMBLE_TIME;
        }
      }

      while (
        obstacles.length === 0 ||
        obstacles[obstacles.length - 1].z < pz + 55
      ) {
        const lastZ =
          obstacles.length > 0 ? obstacles[obstacles.length - 1].z : pz;
        spawnObstacle(lastZ + 9 + Math.random() * 10);
      }

      const distCatch = pz - bomzi.position.z;

      hudCb.current?.({
        score: Math.floor(score),
        gap: Math.max(0, Math.round(distCatch * 10) / 10),
      });

      if (distCatch < CATCH_DIST) {
        if (!ended) {
          ended = true;
          endCb.current?.({ score: Math.floor(score), caught: true });
        }
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
      renderer.dispose();
      if (renderer.domElement.parentNode === wrap) {
        wrap.removeChild(renderer.domElement);
      }
      groundGeo.dispose();
      groundMat.dispose();
      stripeGeo.dispose();
      stripeMat.dispose();
    };
  }, []);

  return <div className="bomzischase-canvas-wrap" ref={wrapRef} />;
}
