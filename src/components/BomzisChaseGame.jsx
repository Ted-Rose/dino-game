import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const RUN_SPEED = 15;
const GRAVITY = 42;
const JUMP_V = 13;
const CHASE_SAFE = 11;
/** Kamera aiz spēlētāja (mazāks Z nekā spēlētājs, jo skrien uz +Z) */
const CAM_DIST_BACK = 9.4;
const HURDLE_GAP_MIN = 6.6;
const HURDLE_GAP_MAX = 8.1;
const CATCH_DIST = 2.2;
const STUMBLE_TIME = 1.15;
const STUMBLE_SLOW = 0.22;

/** Roblox-style blocky avatar (R6-ish): head, torso, arms, legs — feet at y=0 */
function makeRobloxPlayerMesh() {
  const skin = new THREE.MeshStandardMaterial({ color: 0xf5c89a, roughness: 0.6 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x1e6ef2, roughness: 0.5 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x243a52, roughness: 0.65 });

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
    skin,
  );
  armMeshL.castShadow = true;
  armMeshL.position.set(0, -0.24, 0);
  armL.add(armMeshL);
  root.add(armL);

  const armR = new THREE.Group();
  armR.position.set(0.38, 1.12, 0);
  const armMeshR = armMeshL.clone();
  armMeshR.material = skin;
  armMeshR.castShadow = true;
  armR.add(armMeshR);
  root.add(armR);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.38),
    skin,
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
    scene.fog = new THREE.Fog(0xb8c4d8, 35, 145);

    const camera = new THREE.PerspectiveCamera(58, 1, 0.15, 220);
    camera.position.set(0, 4.85, 4 - CAM_DIST_BACK);

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

    const player = makeRobloxPlayerMesh();
    scene.add(player);

    const bomzi = makeBomziMesh();
    scene.add(bomzi);

    const obstacles = [];

    /** Viens vidus ceļš — tikai zemie šķēršļi secīgi (lēcienu ķēde) */
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

    const px = 0;
    let pz = 4;
    let py = 0;
    let vy = 0;
    let stumble = 0;
    let score = 0;
    let runAnimT = 0;
    let wantJump = false;

    bomzi.position.set(0, 0, pz - CHASE_SAFE);

    let nextZ = pz + 20;
    for (let i = 0; i < 28; i++) {
      spawnObstacle(nextZ);
      nextZ +=
        HURDLE_GAP_MIN + Math.random() * (HURDLE_GAP_MAX - HURDLE_GAP_MIN);
    }

    const onKd = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        wantJump = true;
        e.preventDefault();
      }
    };
    const onPointerJump = (e) => {
      wantJump = true;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKd);
    wrap.addEventListener('pointerdown', onPointerJump);
    let raf = 0;

    function loop() {
      if (ended) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const spd = RUN_SPEED * (stumble > 0 ? STUMBLE_SLOW : 1);

      stumble = Math.max(0, stumble - dt);

      if (wantJump && py < 0.05) vy = JUMP_V;
      wantJump = false;

      py += vy * dt;
      vy -= GRAVITY * dt;
      if (py < 0) {
        py = 0;
        vy = 0;
      }

      pz += spd * dt;
      score += spd * dt;

      player.position.set(px, py, pz);

      runAnimT += dt * spd * 0.38;
      const rig = player.userData.rig;
      if (rig) {
        const inAir = py > 0.06 || vy > 0.35;
        const stride = stumble > 0 ? 0.22 : inAir ? 0.18 : 0.58;
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

      const targetGap = stumble > 0 ? 4 : CHASE_SAFE;
      const targetBz = pz - targetGap;
      bomzi.position.z = THREE.MathUtils.lerp(
        bomzi.position.z,
        targetBz,
        Math.min(1, (stumble > 0 ? 6 : 2.5) * dt),
      );
      bomzi.position.x = THREE.MathUtils.lerp(bomzi.position.x, 0, Math.min(1, 10 * dt));
      bomzi.position.y = 0;
      bomzi.lookAt(px, py + 0.9, pz + 2);

      camera.position.x += (px - camera.position.x) * Math.min(1, 10 * dt);
      camera.position.z = pz - CAM_DIST_BACK;
      camera.position.y = 4.75 + py * 0.38;
      camera.lookAt(px, py + 1.25, pz + 38);

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
          if (o.typ === 'low' && py > 1.02) ok = true;
          if (!ok) stumble = STUMBLE_TIME;
        }
      }

      while (
        obstacles.length === 0 ||
        obstacles[obstacles.length - 1].z < pz + 60
      ) {
        const lastZ =
          obstacles.length > 0 ? obstacles[obstacles.length - 1].z : pz;
        const gap =
          HURDLE_GAP_MIN + Math.random() * (HURDLE_GAP_MAX - HURDLE_GAP_MIN);
        spawnObstacle(lastZ + gap);
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
      wrap.removeEventListener('pointerdown', onPointerJump);
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
