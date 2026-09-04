/**
 * NEBULON IDENTITY INVESTIGATION — NASA 2070 & JARVIS HUD CONTROLLER
 */

(function () {
  'use strict';

  let workspaceData = null;
  let selectedNodeId = 'obj-56987';
  let selectedHypothesis = null;
  let spectrumCanvas, spectrumCtx;
  let spectrumAnimId;

  // Live public TLE feed cataloged by NASA. Existing investigation data remains the fallback.
  const LIVE_TLE_ENDPOINT = 'https://tle.ivanstanojevic.me/api/tle';
  const LIVE_REFRESH_MS = 15 * 60 * 1000;
  const EARTH_MEAN_RADIUS_KM = 6378.137;
  const EARTH_MU_KM3_S2 = 398600.4418;
  const liveTleRecords = new Map();
  let liveRefreshTimer = null;
  let liveClockTimer = null;

  // Orbital Intelligence Deck state; scoped to the replacement graph panel.
  const deckState = { radar: true, heatmap: true, sensors: { rf: true, optical: true, ground: true, catalog: true }, replayValue: 58 };
  let deckReplayTimer = null;

  // Web Audio Sci-Fi Synthesizer (Zero External Audio Files Needed)
  let audioCtx = null;
  function playHudChirp(freq = 880, type = 'sine', duration = 0.06) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + duration);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Quiet fail if browser restricts audio
    }
  }

  // Three.js 3D WebGL Orbital Stage State ($700,000 Cybertech Aerospace Engine)
  let threeScene, threeCamera, threeRenderer;
  let rootGroup, earthSystem, earthMesh, cloudMesh, atmosphereMesh, outerHaloMesh, starField;
  let satAurora, satNorad56987, satNorad56983, satNorad56991;
  let svalbardBeacon, svalbardCone, svalbardLaser;
  let nadirBeamMesh, footprintRingMesh;
  const photonBeads = [];
  let threeAnimFrameId = null;
  const rotationTarget = { x: 0.22, y: -0.6 };
  let isDragging3D = false;
  let cameraTargetZ = 185;

  function computeOrbitPoint3D(radius, incRad, raanRad, theta) {
    const xp = radius * Math.cos(theta);
    const yp = radius * Math.sin(theta);
    const x = xp * Math.cos(raanRad) - yp * Math.cos(incRad) * Math.sin(raanRad);
    const y = yp * Math.sin(incRad);
    const z = xp * Math.sin(raanRad) + yp * Math.cos(incRad) * Math.cos(raanRad);
    return new THREE.Vector3(x, y, z);
  }

  function createProceduralEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep aerospace ocean background with subtle latitude gradient
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, 512);
    oceanGrad.addColorStop(0, '#01091a');
    oceanGrad.addColorStop(0.5, '#021230');
    oceanGrad.addColorStop(1, '#01091a');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // High-tech coordinate grid (Meridians & Parallels)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 1024; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
    }

    // Prominent Equator & Tropics
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 256); ctx.lineTo(1024, 256); ctx.stroke();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, 189); ctx.lineTo(1024, 189); ctx.stroke(); // Tropic of Cancer
    ctx.beginPath(); ctx.moveTo(0, 323); ctx.lineTo(1024, 323); ctx.stroke(); // Tropic of Capricorn
    ctx.setLineDash([]);

    // Glowing continental landmasses with tactical fills
    ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
    ctx.lineWidth = 1.8;

    // North America & Greenland
    ctx.beginPath();
    ctx.ellipse(280, 175, 130, 85, -0.2, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(390, 95, 52, 38, 0.2, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // South America
    ctx.beginPath();
    ctx.ellipse(350, 340, 75, 110, 0.2, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Europe & Scandinavia (near Svalbard)
    ctx.beginPath();
    ctx.ellipse(560, 155, 72, 58, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(555, 98, 30, 42, -0.15, 0, Math.PI * 2); // Scandinavia / Arctic approach
    ctx.fill(); ctx.stroke();

    // Africa
    ctx.beginPath();
    ctx.ellipse(570, 290, 85, 115, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Asia
    ctx.beginPath();
    ctx.ellipse(750, 175, 165, 95, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Australia
    ctx.beginPath();
    ctx.ellipse(830, 360, 68, 52, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Glowing city light clusters (amber tactical micro-nodes)
    ctx.fillStyle = 'rgba(255, 215, 0, 0.75)';
    const cities = [
      [260, 160], [290, 180], [315, 170], [330, 195], [545, 145],
      [570, 150], [590, 140], [740, 185], [780, 190], [800, 205],
      [835, 360], [350, 320], [365, 360]
    ];
    cities.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  function initThreeOrbitalStage() {
    const container = document.getElementById('inv-webgl-container');
    if (!container || typeof THREE === 'undefined') return;
    if (threeRenderer) return;

    container.innerHTML = '';
    const width = container.clientWidth || 840;
    const height = container.clientHeight || 520;

    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2500);
    threeCamera.position.set(0, 0, cameraTargetZ);

    threeRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    threeRenderer.setSize(width, height);
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    threeRenderer.setClearColor(0x000000, 0);
    if (THREE.sRGBEncoding) threeRenderer.outputEncoding = THREE.sRGBEncoding;
    if (THREE.ACESFilmicToneMapping) threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    threeRenderer.toneMappingExposure = 1.25;
    container.appendChild(threeRenderer.domElement);

    rootGroup = new THREE.Group();
    rootGroup.rotation.set(rotationTarget.x, rotationTarget.y, 0);
    threeScene.add(rootGroup);

    // Earth axial tilt (-23.4° for authentic orientation)
    earthSystem = new THREE.Group();
    earthSystem.rotation.z = THREE.MathUtils.degToRad(-23.4);
    rootGroup.add(earthSystem);

    // Cinematic Aerospace Lighting
    const hemiLight = new THREE.HemisphereLight(0x8ae4ff, 0x020718, 1.45);
    threeScene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ea, 2.6);
    sunLight.position.set(-160, 95, 200);
    threeScene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
    rimLight.position.set(160, -45, -120);
    threeScene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x0d2850, 0.65);
    fillLight.position.set(-60, -120, 50);
    threeScene.add(fillLight);

    const EARTH_RADIUS = 46;

    // Photorealistic Earth Globe (128x128 high-precision geometry)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    const proceduralMap = createProceduralEarthTexture();
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 128, 128);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: proceduralMap,
      specular: new THREE.Color(0x38bdf8),
      shininess: 15
    });

    earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthSystem.add(earthMesh);

    // Asynchronously stream high-resolution NASA photo textures
    textureLoader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg', (tex) => {
      if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
      earthMaterial.map = tex;
      earthMaterial.needsUpdate = true;
    });
    textureLoader.load('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg', (norm) => {
      earthMaterial.normalMap = norm;
      earthMaterial.normalScale = new THREE.Vector2(0.85, 0.85);
      earthMaterial.needsUpdate = true;
    });
    textureLoader.load('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg', (spec) => {
      earthMaterial.specularMap = spec;
      earthMaterial.needsUpdate = true;
    });

    // Dynamic Cloud Layer
    const cloudGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 0.85, 96, 96);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earthSystem.add(cloudMesh);
    textureLoader.load('https://threejs.org/examples/textures/planets/earth_clouds_1024.png', (cloudTex) => {
      cloudMaterial.map = cloudTex;
      cloudMaterial.needsUpdate = true;
    });

    // Dual-Layer Atmospheric Glow: Inner Cyan Fresnel Shader
    const atmosGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 2.8, 96, 96);
    const atmosMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        glowColor: { value: new THREE.Color(0x00f0ff) },
        power: { value: 3.2 },
        intensity: { value: 1.0 }
      },
      vertexShader: `
        varying vec3 vViewNormal;
        void main() {
          vViewNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float power;
        uniform float intensity;
        varying vec3 vViewNormal;
        void main() {
          float rim = 1.0 - max(dot(vViewNormal, vec3(0.0, 0.0, 1.0)), 0.0);
          float glow = pow(rim, power) * intensity;
          gl_FragColor = vec4(glowColor, glow);
        }
      `
    });
    atmosphereMesh = new THREE.Mesh(atmosGeometry, atmosMaterial);
    earthSystem.add(atmosphereMesh);

    // Outer Celestial Aerospace Halo
    const outerHaloGeo = new THREE.SphereGeometry(EARTH_RADIUS + 6.2, 80, 80);
    const outerHaloMat = atmosMaterial.clone();
    outerHaloMat.uniforms = {
      glowColor: { value: new THREE.Color(0x0284c7) },
      power: { value: 4.8 },
      intensity: { value: 0.35 }
    };
    outerHaloMesh = new THREE.Mesh(outerHaloGeo, outerHaloMat);
    earthSystem.add(outerHaloMesh);

    // Deep-Space Starfield (1,200 stars with subtle depth)
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 260 + Math.random() * 600;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const offset = i * 3;
      starPositions[offset] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[offset + 1] = radius * Math.cos(phi);
      starPositions[offset + 2] = radius * Math.sin(phi) * Math.sin(theta);
      const warmth = Math.random();
      starColors[offset] = 0.55 + warmth * 0.45;
      starColors[offset + 1] = 0.8 + warmth * 0.2;
      starColors[offset + 2] = 1.0;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      sizeAttenuation: true
    });
    starField = new THREE.Points(starGeo, starMat);
    threeScene.add(starField);

    // Holographic Coordinate Grid Shell
    const gridGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 0.3, 32, 20);
    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.1
    });
    earthSystem.add(new THREE.Mesh(gridGeometry, gridMaterial));

    // Build 3D Criss-Crossing Orbital Trajectory Pathways
    build3DOrbits(rootGroup, EARTH_RADIUS);

    // Build 3D Svalbard Ground Station & Dynamic Tracking Beam
    build3DSvalbard(earthSystem, EARTH_RADIUS);

    // Attach Pointer Drag & Mouse Wheel Interaction
    attach3DInteraction(container);

    // Resize Observer
    const ro = new ResizeObserver(() => {
      if (!container || !threeRenderer || !threeCamera) return;
      const w = container.clientWidth || 840;
      const h = container.clientHeight || 520;
      threeCamera.aspect = w / h;
      threeCamera.updateProjectionMatrix();
      threeRenderer.setSize(w, h);
    });
    ro.observe(container);

    // Start 60fps Cybertech Animation Loop
    animateThreeStage();
  }

  function build3DOrbits(parent, R) {
    const orbitGroup = new THREE.Group();
    parent.add(orbitGroup);

    // Orbit 1: Sun-Synchronous Polar Orbit (Aurora-1 & NORAD 56987)
    // Inclination: 97.45°, RAAN: 214.0°, Radius: R + 16
    const r1 = R + 16;
    const inc1 = THREE.MathUtils.degToRad(97.45);
    const raan1 = THREE.MathUtils.degToRad(214.0);

    const pts1 = [];
    const segs = 140;
    for (let i = 0; i <= segs; i++) {
      const u = (i / segs) * Math.PI * 2;
      pts1.push(computeOrbitPoint3D(r1, inc1, raan1, u));
    }
    const curve1 = new THREE.CatmullRomCurve3(pts1, true);

    // Glowing 3D Ribbon Tube
    const tubeGeom1 = new THREE.TubeGeometry(curve1, 120, 0.45, 8, true);
    const tubeMat1 = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.88 });
    const orbitMesh1 = new THREE.Mesh(tubeGeom1, tubeMat1);
    orbitGroup.add(orbitMesh1);

    // Outer Ribbon Aura
    const tubeGeom1Aura = new THREE.TubeGeometry(curve1, 100, 1.35, 6, true);
    const tubeMat1Aura = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.2 });
    const orbitAura1 = new THREE.Mesh(tubeGeom1Aura, tubeMat1Aura);
    orbitGroup.add(orbitAura1);

    // Traveling Photon Pulses along Orbit 1
    const pulseCount1 = 14;
    for (let i = 0; i < pulseCount1; i++) {
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      orbitGroup.add(bead);
      photonBeads.push({
        mesh: bead,
        curve: curve1,
        phase: i / pulseCount1,
        speed: 0.08
      });
    }

    // High-Fidelity Aurora-1 3D Spacecraft Model (6U CubeSat with Articulating Solar Arrays)
    const auroraGroup = new THREE.Group();
    const goldMat = new THREE.MeshPhongMaterial({
      color: 0xdeb841,
      emissive: 0x221703,
      specular: 0xfff5b8,
      shininess: 90
    });
    const titanMat = new THREE.MeshPhongMaterial({
      color: 0x475569,
      specular: 0x94a3b8,
      shininess: 60
    });
    const solarCellMat = new THREE.MeshPhongMaterial({
      color: 0x071e3d,
      emissive: 0x020d1c,
      specular: 0x00f0ff,
      shininess: 95
    });

    // 1. Central 6U Avionics Chassis
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.4), goldMat);
    const capTop = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.15, 1.5), titanMat);
    capTop.position.y = 0.75;
    const capBot = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.15, 1.5), titanMat);
    capBot.position.y = -0.75;

    // 2. Optical Sensor Aperture Lens (Nadir-facing)
    const lensTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.28, 0.6, 16),
      new THREE.MeshPhongMaterial({ color: 0x00f0ff, emissive: 0x003355, specular: 0xffffff, shininess: 100 })
    );
    lensTube.rotation.x = Math.PI / 2;
    lensTube.position.set(0, 0, 0.85);

    // 3. Articulating Solar Panels
    const wingL = new THREE.Group();
    const panelL = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.2, 0.12), solarCellMat);
    panelL.position.x = -2.8;
    const ledL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    ledL.position.set(-4.9, 0.5, 0);
    wingL.add(panelL, ledL);

    const wingR = new THREE.Group();
    const panelR = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.2, 0.12), solarCellMat);
    panelR.position.x = 2.8;
    const ledR = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
    ledR.position.set(4.9, 0.5, 0);
    wingR.add(panelR, ledR);

    // 4. Ion Thruster Exhaust Plume (Flickering Cyan Additive Glow)
    const thrusterBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.42, 0.4, 12),
      titanMat
    );
    thrusterBell.rotation.x = Math.PI / 2;
    thrusterBell.position.set(0, 0, -0.85);

    const plumeCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.3, 14),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
    );
    plumeCone.rotation.x = -Math.PI / 2;
    plumeCone.position.set(0, 0, -1.5);

    // 5. Nadir Footprint Beam to Earth Surface
    const nadirGeom = new THREE.ConeGeometry(3.5, 16, 24, 1, true);
    nadirGeom.translate(0, 8, 0);
    const nadirBeam = new THREE.Mesh(
      nadirGeom,
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    nadirBeam.rotation.x = Math.PI / 2;
    nadirBeam.position.set(0, 0, 0);

    const footprint = new THREE.Mesh(
      new THREE.RingGeometry(2.8, 3.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    footprint.position.set(0, 0, 16);

    auroraGroup.add(body, capTop, capBot, lensTube, wingL, wingR, thrusterBell, plumeCone, nadirBeam, footprint);
    orbitGroup.add(auroraGroup);
    satAurora = auroraGroup;
    satAurora.userData = {
      curve: curve1,
      phase: 0.48,
      speed: 0.08,
      wingL,
      wingR,
      plumeCone,
      footprint
    };

    // NORAD 56987 3D Candidate Lead Marker (Red Tactical Cage)
    const noradGroup = new THREE.Group();
    const noradMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    const noradRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.9, 24),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    const noradRingCross = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.9, 24),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    noradRingCross.rotation.x = Math.PI / 2;
    noradGroup.add(noradMesh, noradRing, noradRingCross);
    orbitGroup.add(noradGroup);
    satNorad56987 = noradGroup;
    satNorad56987.userData = { curve: curve1, phase: 0.32, speed: 0.08 };

    // Orbit 2: NORAD 56983 / Obj A (Diagonal Mid-Latitude Cross Track)
    // Inclination: 48.2°, RAAN: 68.0°, Radius: R + 22
    const r2 = R + 22;
    const inc2 = THREE.MathUtils.degToRad(48.2);
    const raan2 = THREE.MathUtils.degToRad(68.0);
    const pts2 = [];
    for (let i = 0; i <= segs; i++) {
      const u = (i / segs) * Math.PI * 2;
      pts2.push(computeOrbitPoint3D(r2, inc2, raan2, u));
    }
    const curve2 = new THREE.CatmullRomCurve3(pts2, true);
    const tube2 = new THREE.Mesh(
      new THREE.TubeGeometry(curve2, 100, 0.38, 6, true),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.72 })
    );
    const tube2Aura = new THREE.Mesh(
      new THREE.TubeGeometry(curve2, 80, 1.1, 6, true),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.16 })
    );
    orbitGroup.add(tube2, tube2Aura);

    // Traveling Photon Pulses along Orbit 2
    for (let i = 0; i < 10; i++) {
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfde68a })
      );
      orbitGroup.add(bead);
      photonBeads.push({
        mesh: bead,
        curve: curve2,
        phase: i / 10,
        speed: 0.065
      });
    }

    const sat83Group = new THREE.Group();
    const sat83Body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.2), new THREE.MeshPhongMaterial({ color: 0xf59e0b }));
    const sat83WingL = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 0.1), solarCellMat);
    sat83WingL.position.x = -1.9;
    const sat83WingR = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 0.1), solarCellMat);
    sat83WingR.position.x = 1.9;
    sat83Group.add(sat83Body, sat83WingL, sat83WingR);
    orbitGroup.add(sat83Group);
    satNorad56983 = sat83Group;
    satNorad56983.userData = { curve: curve2, phase: 1.85, speed: 0.065 };

    // Orbit 3: NORAD 56991 / Obj G (Retrograde Cross-Orbital Track)
    // Inclination: -62.5°, RAAN: 325.0°, Radius: R + 28
    const r3 = R + 28;
    const inc3 = THREE.MathUtils.degToRad(-62.5);
    const raan3 = THREE.MathUtils.degToRad(325.0);
    const pts3 = [];
    for (let i = 0; i <= segs; i++) {
      const u = (i / segs) * Math.PI * 2;
      pts3.push(computeOrbitPoint3D(r3, inc3, raan3, u));
    }
    const curve3 = new THREE.CatmullRomCurve3(pts3, true);
    const tube3 = new THREE.Mesh(
      new THREE.TubeGeometry(curve3, 100, 0.38, 6, true),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.68 })
    );
    const tube3Aura = new THREE.Mesh(
      new THREE.TubeGeometry(curve3, 80, 1.1, 6, true),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.15 })
    );
    orbitGroup.add(tube3, tube3Aura);

    // Traveling Photon Pulses along Orbit 3
    for (let i = 0; i < 10; i++) {
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xe9d5ff })
      );
      orbitGroup.add(bead);
      photonBeads.push({
        mesh: bead,
        curve: curve3,
        phase: i / 10,
        speed: 0.055
      });
    }

    const sat91Group = new THREE.Group();
    const sat91Body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.2), new THREE.MeshPhongMaterial({ color: 0xa855f7 }));
    const sat91WingL = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 0.1), solarCellMat);
    sat91WingL.position.x = -1.9;
    const sat91WingR = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 0.1), solarCellMat);
    sat91WingR.position.x = 1.9;
    sat91Group.add(sat91Body, sat91WingL, sat91WingR);
    orbitGroup.add(sat91Group);
    satNorad56991 = sat91Group;
    satNorad56991.userData = { curve: curve3, phase: 3.5, speed: 0.055 };
  }

  function build3DSvalbard(parent, R) {
    // Arctic Svalbard Satellite Station coordinates: 78.22°N, 15.65°E
    const latRad = THREE.MathUtils.degToRad(78.22);
    const lonRad = THREE.MathUtils.degToRad(15.65);

    const x = R * Math.cos(latRad) * Math.sin(lonRad);
    const y = R * Math.sin(latRad);
    const z = R * Math.cos(latRad) * Math.cos(lonRad);
    const svalbardPos = new THREE.Vector3(x, y, z);
    const normal = svalbardPos.clone().normalize();

    const stationGroup = new THREE.Group();
    stationGroup.position.copy(svalbardPos);
    parent.add(stationGroup);

    // Geodesic Ground Radome & Concentric Radar Rings
    const domeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    domeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

    const ring1 = new THREE.Mesh(
      new THREE.RingGeometry(2.0, 2.7, 32),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    ring1.lookAt(normal);

    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(3.6, 4.4, 32),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    ring2.lookAt(normal);

    stationGroup.add(domeMesh, ring1, ring2);
    svalbardBeacon = stationGroup;

    // Volumetric 3D Conical Tracking Beam
    const beamHeight = 28;
    const coneGeom = new THREE.CylinderGeometry(8.8, 0.8, beamHeight, 32, 1, true);
    coneGeom.translate(0, beamHeight / 2, 0);

    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    svalbardCone = new THREE.Mesh(coneGeom, coneMat);
    svalbardCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    stationGroup.add(svalbardCone);

    // Central High-Energy Coherent Laser Line
    const laserGeom = new THREE.CylinderGeometry(0.28, 0.28, beamHeight + 4, 8);
    laserGeom.translate(0, (beamHeight + 4) / 2, 0);
    svalbardLaser = new THREE.Mesh(
      laserGeom,
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending })
    );
    svalbardLaser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    stationGroup.add(svalbardLaser);
  }

  function attach3DInteraction(container) {
    let prevX = 0, prevY = 0;

    container.addEventListener('pointerdown', (e) => {
      isDragging3D = true;
      prevX = e.clientX;
      prevY = e.clientY;
      container.setPointerCapture(e.pointerId);
    });

    container.addEventListener('pointermove', (e) => {
      if (!isDragging3D) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      rotationTarget.y += dx * 0.006;
      rotationTarget.x += dy * 0.006;
      rotationTarget.x = Math.max(-1.25, Math.min(1.25, rotationTarget.x));
    });

    const stopDrag = (e) => {
      if (!isDragging3D) return;
      isDragging3D = false;
      try { container.releasePointerCapture(e.pointerId); } catch (_) {}
    };

    container.addEventListener('pointerup', stopDrag);
    container.addEventListener('pointercancel', stopDrag);

    // Mouse wheel camera zooming (clamped between 115 and 320)
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      cameraTargetZ = Math.max(115, Math.min(320, cameraTargetZ + e.deltaY * 0.12));
    }, { passive: false });
  }

  function animateThreeStage() {
    threeAnimFrameId = requestAnimationFrame(animateThreeStage);

    // Smooth inertia rotation towards target
    rootGroup.rotation.y += (rotationTarget.y - rootGroup.rotation.y) * 0.08;
    rootGroup.rotation.x += (rotationTarget.x - rootGroup.rotation.x) * 0.08;

    // Smooth camera zoom damp
    threeCamera.position.z += (cameraTargetZ - threeCamera.position.z) * 0.1;

    if (!isDragging3D) {
      rotationTarget.y += 0.0012;
    }

    earthMesh.rotation.y += 0.0008;
    if (cloudMesh) cloudMesh.rotation.y += 0.0014;
    if (starField) starField.rotation.y += 0.0003;

    // Advance 3D Satellites along trajectories
    const updateSat = (sat) => {
      if (!sat || !sat.userData.curve) return;
      sat.userData.phase = (sat.userData.phase + sat.userData.speed * 0.016) % 1;
      const pt = sat.userData.curve.getPoint(sat.userData.phase);
      sat.position.copy(pt);
      sat.lookAt(0, 0, 0); // Nadir orientation pointing towards Earth center
    };

    updateSat(satAurora);
    updateSat(satNorad56987);
    updateSat(satNorad56983);
    updateSat(satNorad56991);

    // Advance traveling photon beads along orbit pathways
    photonBeads.forEach((bead) => {
      bead.phase = (bead.phase + bead.speed * 0.016) % 1;
      bead.mesh.position.copy(bead.curve.getPoint(bead.phase));
    });

    // Spacecraft micro-animations (Aurora-1 solar wing tilt & ion plasma flicker)
    if (satAurora && satAurora.userData) {
      const now = Date.now() * 0.003;
      if (satAurora.userData.wingL && satAurora.userData.wingR) {
        const tilt = Math.sin(now * 0.6) * 0.25;
        satAurora.userData.wingL.rotation.y = tilt;
        satAurora.userData.wingR.rotation.y = -tilt;
      }
      if (satAurora.userData.plumeCone) {
        satAurora.userData.plumeCone.material.opacity = 0.65 + Math.sin(now * 7.5) * 0.25;
      }
      if (satAurora.userData.footprint) {
        const sweep = (Math.sin(now * 2.5) + 1) * 0.5;
        satAurora.userData.footprint.scale.setScalar(1.0 + sweep * 0.2);
        satAurora.userData.footprint.material.opacity = 0.25 + (1 - sweep) * 0.45;
      }
    }

    // Dynamic Svalbard GS-142 Target Tracking
    if (svalbardBeacon && satAurora && svalbardCone) {
      const svalbardWorld = new THREE.Vector3();
      svalbardBeacon.getWorldPosition(svalbardWorld);
      const auroraWorld = new THREE.Vector3();
      satAurora.getWorldPosition(auroraWorld);

      const toAurora = auroraWorld.clone().sub(svalbardWorld);
      const svalbardUp = svalbardWorld.clone().normalize();
      const elevationSin = toAurora.clone().normalize().dot(svalbardUp);

      if (elevationSin > 0.05) {
        // Aurora-1 is above Svalbard horizon: Lock-on tracking mode
        svalbardCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toAurora.clone().normalize());
        if (svalbardLaser) svalbardLaser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toAurora.clone().normalize());
        svalbardCone.material.opacity = 0.52 + Math.sin(Date.now() * 0.008) * 0.18;
      } else {
        // Standby Arctic zenith scan
        svalbardCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), svalbardUp);
        if (svalbardLaser) svalbardLaser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), svalbardUp);
        svalbardCone.material.opacity = 0.28 + Math.sin(Date.now() * 0.003) * 0.1;
      }
    }

    if (threeRenderer && threeScene && threeCamera) {
      threeRenderer.render(threeScene, threeCamera);
    }

    update3DHudProjections();
  }

  function update3DHudProjections() {
    if (!threeCamera || !threeRenderer) return;

    const projectToSvg = (object3D, elementId, defaultX, defaultY) => {
      if (!object3D) return;
      const el = document.getElementById(elementId);
      if (!el) return;

      const worldPos = new THREE.Vector3();
      object3D.getWorldPosition(worldPos);

      // Earth occlusion test (Earth radius ~46 at origin)
      const camPos = threeCamera.position;
      const toSat = worldPos.clone().sub(camPos);
      const toEarth = new THREE.Vector3(0, 0, 0).sub(camPos);

      let isOccluded = false;
      if (worldPos.z < 0) {
        const rayDist = toEarth.clone().cross(toSat.clone().normalize()).length();
        if (rayDist < 44) {
          isOccluded = true;
        }
      }

      worldPos.project(threeCamera);

      const screenX = (worldPos.x * 0.5 + 0.5) * 840;
      const screenY = (-worldPos.y * 0.5 + 0.5) * 520;

      if (worldPos.z < 1.0) {
        el.setAttribute('transform', `translate(${screenX - defaultX}, ${screenY - defaultY})`);
        if (isOccluded) {
          el.style.opacity = '0.22';
          el.style.filter = 'grayscale(0.8) blur(0.5px)';
        } else {
          el.style.opacity = '1';
          el.style.filter = '';
        }
      }
    };

    projectToSvg(satAurora, 'hud-reticle-aurora', 605, 128);
    projectToSvg(satNorad56987, 'hud-reticle-norad', 655, 230);
    projectToSvg(satNorad56983, 'hud-reticle-norad83', 240, 335);
    projectToSvg(satNorad56991, 'hud-reticle-norad91', 195, 205);
    projectToSvg(svalbardBeacon, 'hud-reticle-svalbard', 580, 345);
  }

  function init() {
    loadWorkspace();
  }

  async function loadWorkspace() {
    if (!window.NebulonAPI) return;
    try {
      const data = await window.NebulonAPI.getWorkspace();
      workspaceData = data;
      selectedHypothesis = data.hypotheses ? data.hypotheses[0] : null;

      renderHeader();
      initThreeOrbitalStage();
      renderGraph();
      renderHypotheses();
      renderEvidenceDrawer();
      renderAccessibleTable();
      initSpectrumCanvas();
      renderLiveOrbitalCard();
      initOrbitalIntelligenceDeck();
      initLiveInvestigationFeed();
    } catch (err) {
      console.error(err);
    }
  }

  function renderHeader() {
    if (!workspaceData) return;
    const launchTitle = document.getElementById('inv-launch-name');
    const launchSub = document.getElementById('inv-launch-sub');
    const targetName = document.getElementById('inv-target-name');
    const candidateLead = document.getElementById('inv-candidate-lead');

    if (launchTitle) launchTitle.textContent = workspaceData.launch_name || 'Transporter-8 SSO CubeSat Swarm';
    if (launchSub) launchSub.textContent = `LAUNCH CONTEXT · ${workspaceData.launch_time || '2023-06-12 21:35:00 UTC'}`;
    if (targetName) targetName.textContent = selectedHypothesis ? selectedHypothesis.spacecraft_name : 'Aurora-1';
    if (candidateLead) {
      const top = workspaceData.hypotheses[0];
      candidateLead.textContent = top ? `${top.tracked_object} (${top.evidence_score}% score)` : '—';
    }
  }

  function initOrbitalIntelligenceDeck() {
    const deck = document.querySelector('.orbital-intelligence-deck');
    if (!deck || deck.dataset.deckBound === 'true') return;
    deck.dataset.deckBound = 'true';

    deck.querySelectorAll('[data-deck-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.deckAction;
        playHudChirp(action === 'reset' ? 720 : 980, action === 'replay' ? 'triangle' : 'sine', 0.06);
        if (action === 'toggle-radar') deckState.radar = !deckState.radar;
        if (action === 'toggle-heatmap') deckState.heatmap = !deckState.heatmap;
        if (action === 'reset') resetOrbitalDeck();
        if (action === 'replay') startOrbitalDeckReplay();
        if (action === 'focus-selected') {
          const target = document.getElementById('inv-evidence-drawer');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        updateOrbitalDeck();
      });
    });

    deck.querySelectorAll('[data-deck-sensor]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.deckSensor;
        deckState.sensors[key] = !deckState.sensors[key];
        button.classList.toggle('is-on', deckState.sensors[key]);
        playHudChirp(deckState.sensors[key] ? 1080 : 560, 'sine', 0.05);
        updateOrbitalDeck();
      });
    });

    const timeline = document.getElementById('investigation-deck-timeline');
    if (timeline) {
      timeline.addEventListener('input', () => {
        deckState.replayValue = Number(timeline.value);
        updateOrbitalDeck();
        window.dispatchEvent(new CustomEvent('nebulon:timeline-scrub', { detail: { value: deckState.replayValue } }));
      });
    }
    updateOrbitalDeck();
  }

  function updateOrbitalDeck() {
    const deck = document.querySelector('.orbital-intelligence-deck');
    if (!deck) return;
    deck.classList.toggle('is-radar-off', !deckState.radar);
    deck.classList.toggle('is-heatmap-off', !deckState.heatmap);
    deck.classList.toggle('is-replaying', Boolean(deckReplayTimer));
    const radarValue = deck.querySelector('[data-deck-value="radar"]');
    const heatmapValue = deck.querySelector('[data-deck-value="heatmap"]');
    if (radarValue) radarValue.textContent = deckState.radar ? 'ON' : 'OFF';
    if (heatmapValue) heatmapValue.textContent = deckState.heatmap ? 'ON' : 'OFF';
    const activeSensors = Object.values(deckState.sensors).filter(Boolean).length;
    setInvestigationDeckText('investigation-active-sensors', `${activeSensors.toString().padStart(2, '0')} / 04`);
    setInvestigationDeckText('investigation-deck-timeline-value', `T+${deckState.replayValue}%`);
    const eventLabel = deckState.replayValue < 25 ? 'Initial detection envelope' : deckState.replayValue < 55 ? 'RF correlation resolving' : deckState.replayValue < 82 ? 'Orbital match consolidating' : 'Current evidence state';
    setInvestigationDeckText('investigation-deck-event', eventLabel);
    const timeline = document.getElementById('investigation-deck-timeline');
    if (timeline && document.activeElement !== timeline) timeline.value = deckState.replayValue;
    renderOrbitalDeckInspector();
  }

  function setInvestigationDeckText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function resetOrbitalDeck() {
    if (deckReplayTimer) window.clearInterval(deckReplayTimer);
    deckReplayTimer = null;
    deckState.radar = true;
    deckState.heatmap = true;
    deckState.replayValue = 58;
    Object.keys(deckState.sensors).forEach((key) => { deckState.sensors[key] = true; });
    selectedNodeId = 'obj-56987';
    if (workspaceData && workspaceData.hypotheses) selectedHypothesis = workspaceData.hypotheses[0] || null;
    renderGraph();
    renderHypotheses();
    renderEvidenceDrawer();
  }

  function startOrbitalDeckReplay() {
    if (deckReplayTimer) {
      window.clearInterval(deckReplayTimer);
      deckReplayTimer = null;
      return;
    }
    deckState.replayValue = 0;
    deckReplayTimer = window.setInterval(() => {
      deckState.replayValue += 1;
      window.dispatchEvent(new CustomEvent('nebulon:timeline-scrub', { detail: { value: deckState.replayValue } }));
      updateOrbitalDeck();
      if (deckState.replayValue >= 100) {
        window.clearInterval(deckReplayTimer);
        deckReplayTimer = null;
        updateOrbitalDeck();
      }
    }, 70);
  }

  function renderOrbitalDeckInspector() {
    const deck = document.querySelector('.orbital-intelligence-deck');
    if (!deck) return;

    if (selectedNodeId === 'craft-aurora') {
      const live56987 = liveTleRecords.get('56987');
      const live = live56987 ? parseTleRecord(live56987) : null;
      setInvestigationDeckText('investigation-selected-target', 'AURORA-1 (6U)');
      setInvestigationDeckText('investigation-selected-id', 'CUBESAT 6U / MISSION TARGET');
      setInvestigationDeckText('investigation-selected-confidence', '87.4% (LEAD)');
      setInvestigationDeckText('investigation-selected-altitude', live ? `${live.meanAltitudeKm.toFixed(1)} km` : '545.3 km');
      setInvestigationDeckText('investigation-selected-inclination', live ? `${live.inclinationDeg.toFixed(2)}°` : '97.45°');
      setInvestigationDeckText('investigation-selected-velocity', live ? `${live.meanVelocityKms.toFixed(2)} km/s` : '7.59 km/s');
      setInvestigationDeckText('investigation-selected-age', live ? `${live.elementAgeDays.toFixed(2)} d` : '0.14 d');
      setInvestigationDeckText('investigation-selected-source', live ? 'NASA TLE / ACTIVE PASS' : 'AURORA-1 TELEMETRY');
      return;
    }

    if (selectedNodeId === 'gs-142') {
      setInvestigationDeckText('investigation-selected-target', 'GS-142 SVALBARD');
      setInvestigationDeckText('investigation-selected-id', 'ARCTIC PASS / 78.22° N');
      setInvestigationDeckText('investigation-selected-confidence', '99.8% LINK');
      setInvestigationDeckText('investigation-selected-altitude', '0.42 km MSL');
      setInvestigationDeckText('investigation-selected-inclination', '78.22° N');
      setInvestigationDeckText('investigation-selected-velocity', 'BEAM LOCK');
      setInvestigationDeckText('investigation-selected-age', '0.00 d (LIVE)');
      setInvestigationDeckText('investigation-selected-source', 'NORWEGIAN SPACE AGENCY / DSN');
      return;
    }

    let satelliteId = selectedNodeId.startsWith('obj-') ? selectedNodeId.replace('obj-', '') : '56987';
    const record = liveTleRecords.get(satelliteId);
    const live = record ? parseTleRecord(record) : null;
    const hypothesis = workspaceData && workspaceData.hypotheses ? workspaceData.hypotheses.find((item) => String(item.tracked_object).includes(satelliteId)) : null;
    const fallback = hypothesis && hypothesis.orbital_elements ? hypothesis.orbital_elements : null;
    setInvestigationDeckText('investigation-selected-target', live ? `NORAD ${satelliteId}` : (hypothesis ? hypothesis.tracked_object : `NORAD ${satelliteId}`));
    setInvestigationDeckText('investigation-selected-id', `OBJ-${satelliteId} / ${hypothesis && hypothesis.status ? hypothesis.status.toUpperCase() : 'PRIMARY'}`);
    setInvestigationDeckText('investigation-selected-confidence', hypothesis ? `${hypothesis.evidence_score}%` : '—');
    setInvestigationDeckText('investigation-selected-altitude', live ? `${live.meanAltitudeKm.toFixed(1)} km` : (fallback ? `${fallback.altitude_km} km` : '—'));
    setInvestigationDeckText('investigation-selected-inclination', live ? `${live.inclinationDeg.toFixed(2)}°` : (fallback ? `${fallback.inclination}°` : '—'));
    setInvestigationDeckText('investigation-selected-velocity', live ? `${live.meanVelocityKms.toFixed(2)} km/s` : '—');
    setInvestigationDeckText('investigation-selected-age', live ? `${live.elementAgeDays.toFixed(2)} d` : '—');
    setInvestigationDeckText('investigation-selected-source', live ? 'NASA TLE / RUNTIME' : 'WORKSPACE FALLBACK');
  }

  function renderGraph() {
    const svgContainer = document.getElementById('inv-svg-container');
    if (!svgContainer || !workspaceData) return;

    // 1. Pull dynamic live NASA TLE data for NORAD 56987 (and fallback gracefully)
    const noradRecord = liveTleRecords.get('56987');
    const liveNorad = noradRecord ? parseTleRecord(noradRecord) : null;
    const hypNorad = workspaceData.hypotheses ? workspaceData.hypotheses.find(h => String(h.tracked_object).includes('56987')) : null;
    const fallbackNorad = hypNorad && hypNorad.orbital_elements ? hypNorad.orbital_elements : null;

    const liveAlt = liveNorad ? liveNorad.meanAltitudeKm.toFixed(1) : (fallbackNorad ? fallbackNorad.altitude_km : '545.3');
    const liveVel = liveNorad ? liveNorad.meanVelocityKms.toFixed(2) : '7.59';
    const liveIncl = liveNorad ? liveNorad.inclinationDeg.toFixed(2) : (fallbackNorad ? fallbackNorad.inclination : '97.45');
    const livePeriod = liveNorad ? liveNorad.periodMinutes.toFixed(1) : '95.5';

    // 2. Selection state flags
    const isAuroraSelected = selectedNodeId === 'craft-aurora';
    const isNoradSelected = selectedNodeId === 'obj-56987';
    const isNorad83Selected = selectedNodeId === 'obj-56983';
    const isNorad91Selected = selectedNodeId === 'obj-56991';
    const isSvalbardSelected = selectedNodeId === 'gs-142';
    const isObs204Selected = selectedNodeId === 'obs-204';
    const isObs229Selected = selectedNodeId === 'obs-229';

    // 3. Orbital Path Definitions for smooth rendering & continuous photon pulses
    const primaryOrbitPath = "M 120,312 C 110,165 324,86 572,120 C 768,150 772,286 662,362 C 554,438 244,424 120,312 Z";
    const outerHaloOrbitPath = "M 108,306 C 98,150 314,70 566,106 C 776,136 786,280 676,366 C 564,448 238,430 108,306 Z";
    const innerSwarmOrbitPath = "M 136,320 C 126,182 336,102 580,136 C 752,166 752,292 646,356 C 546,420 252,414 136,320 Z";

    // Build the 100% exact cybertech tactical display SVG matching the design
    let svgHtml = `
      <svg class="investigate-svg" viewBox="0 0 840 520" preserveAspectRatio="xMidYMid meet">
        <defs>
          <!-- Holographic Glow Filters -->
          <filter id="hud-glow-cyan" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hud-glow-cyan-wide" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hud-glow-red" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hud-glow-amber" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <!-- Holographic Globe & Beam Gradients -->
          <radialGradient id="globe-depth" cx="38%" cy="32%" r="68%">
            <stop offset="0%" stop-color="#09305e" stop-opacity="0.65" />
            <stop offset="55%" stop-color="#03162c" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#010915" stop-opacity="0.98" />
          </radialGradient>

          <linearGradient id="beam-cone-grad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.92" />
            <stop offset="28%" stop-color="#00f0ff" stop-opacity="0.48" />
            <stop offset="72%" stop-color="#00f0ff" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#00f0ff" stop-opacity="0.02" />
          </linearGradient>

          <linearGradient id="orbit-ribbon-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00f0ff" />
            <stop offset="48%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>

          <linearGradient id="orbit-ribbon-outer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(0, 240, 255, 0.45)" />
            <stop offset="50%" stop-color="rgba(99, 102, 241, 0.6)" />
            <stop offset="100%" stop-color="rgba(0, 240, 255, 0.45)" />
          </linearGradient>

          <linearGradient id="hud-card-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(4, 15, 34, 0.95)" />
            <stop offset="100%" stop-color="rgba(1, 7, 20, 0.92)" />
          </linearGradient>

          <linearGradient id="hud-card-red-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(28, 5, 15, 0.95)" />
            <stop offset="100%" stop-color="rgba(14, 2, 8, 0.92)" />
          </linearGradient>
        </defs>

        <!-- 1. CYBERTECH HUD OUTER FRAME & CALIBRATIONS -->
        <g class="cybertech-hud-frame" opacity="0.9">
          <!-- Chamfered Sci-Fi Border -->
          <path d="M 32,14 L 808,14 L 826,32 L 826,488 L 808,506 L 32,506 L 14,488 L 14,32 Z" 
            fill="none" stroke="rgba(0, 240, 255, 0.28)" stroke-width="1.2" />

          <!-- Outer 4-Corner Tech Brackets -->
          <path d="M 10,38 L 10,12 L 36,12" fill="none" stroke="#00f0ff" stroke-width="2.2" />
          <path d="M 830,38 L 830,12 L 804,12" fill="none" stroke="#00f0ff" stroke-width="2.2" />
          <path d="M 10,482 L 10,508 L 36,508" fill="none" stroke="#00f0ff" stroke-width="2.2" />
          <path d="M 830,482 L 830,508 L 804,508" fill="none" stroke="#00f0ff" stroke-width="2.2" />

          <!-- Top Compass Axis & Zenith Indicator -->
          <line x1="260" y1="28" x2="580" y2="28" stroke="rgba(0, 240, 255, 0.35)" stroke-width="1" />
          <polygon points="416,21 424,21 420,27" fill="#00f0ff" />
          <g font-family="'DM Mono', monospace" font-size="8.5" fill="#00f0ff" opacity="0.75" text-anchor="middle">
            <line x1="275" y1="25" x2="275" y2="31" stroke="#00f0ff" stroke-width="1" />
            <text x="275" y="21">300</text>
            <line x1="310" y1="25" x2="310" y2="31" stroke="#00f0ff" stroke-width="1" />
            <text x="310" y="21">270</text>
            <line x1="345" y1="25" x2="345" y2="31" stroke="#00f0ff" stroke-width="1" />
            <text x="345" y="21">240</text>
            <line x1="380" y1="25" x2="380" y2="31" stroke="#00f0ff" stroke-width="1" />
            <text x="380" y="21">330</text>
            <text x="420" y="18" font-weight="700" fill="#ffffff">0</text>
            <line x1="460" y1="25" x2="460" y2="31" stroke="#00f0ff" stroke-width="1" />
            <text x="460" y="21">30</text>
            <line x1="495" y1="25" x2="495" y2="31" stroke="#00f0ff" stroke-width="1" />
            <text x="495" y="21">60</text>
            <line x1="530" y1="25" x2="530" y2="31" stroke="#00f0ff" stroke-width="1" />
            <text x="530" y="21">120</text>
            <line x1="565" y1="25" x2="565" y2="31" stroke="#00f0ff" stroke-width="1" />
            <text x="565" y="21">150</text>
          </g>

          <!-- Top-Left Title Label -->
          <text x="36" y="32" font-family="'DM Mono', monospace" font-size="11" font-weight="700" fill="#00f0ff" letter-spacing="0.5">Sun-Synchronous</text>
          <text x="36" y="46" font-family="'DM Mono', monospace" font-size="8.5" fill="#7482a0" letter-spacing="0.3">CubeSat Orbits</text>

          <!-- Top-Right Readout -->
          <text x="804" y="32" text-anchor="end" font-family="'DM Mono', monospace" font-size="8.5" fill="#7482a0" letter-spacing="0.3">Orbital inclination</text>
          <text x="804" y="46" text-anchor="end" font-family="'DM Mono', monospace" font-size="11" font-weight="700" fill="#00f0ff">${liveIncl}°</text>

          <!-- Left Pitch Caliper & Telemetry -->
          <line x1="26" y1="140" x2="26" y2="380" stroke="rgba(0, 240, 255, 0.3)" stroke-width="1" />
          <line x1="20" y1="160" x2="30" y2="160" stroke="#00f0ff" stroke-width="1" />
          <text x="34" y="163" font-family="'DM Mono', monospace" font-size="8.5" fill="#7482a0">-26.5°</text>
          <line x1="18" y1="260" x2="32" y2="260" stroke="#00f0ff" stroke-width="1.5" />
          <text x="36" y="263" font-family="'DM Mono', monospace" font-size="8.5" fill="#00f0ff">0°</text>
          <line x1="20" y1="360" x2="30" y2="360" stroke="#00f0ff" stroke-width="1" />
          <text x="34" y="363" font-family="'DM Mono', monospace" font-size="8.5" fill="#7482a0">-57.45°</text>

          <!-- Left Telemetry Readout Stack -->
          <g font-family="'DM Mono', monospace" font-size="8.5" fill="#99aac7">
            <text x="34" y="418">Altitude: <tspan fill="#00f0ff" font-weight="700">${liveAlt} km</tspan></text>
            <text x="34" y="432">Velocity: <tspan fill="#00f0ff" font-weight="700">${liveVel} km/s</tspan></text>
            <text x="34" y="446">Period: <tspan fill="#eef8ff">${livePeriod} min</tspan></text>
            <text x="34" y="460">INCL: <tspan fill="#00f0ff">True: 97.45°</tspan></text>
          </g>

          <!-- Right Pitch Caliper & Status -->
          <line x1="814" y1="140" x2="814" y2="380" stroke="rgba(0, 240, 255, 0.3)" stroke-width="1" />
          <line x1="810" y1="160" x2="820" y2="160" stroke="#00f0ff" stroke-width="1" />
          <text x="806" y="163" text-anchor="end" font-family="'DM Mono', monospace" font-size="8.5" fill="#7482a0">+265°</text>
          <line x1="808" y1="260" x2="822" y2="260" stroke="#00f0ff" stroke-width="1.5" />
          <text x="804" y="263" text-anchor="end" font-family="'DM Mono', monospace" font-size="8.5" fill="#00f0ff">0°</text>
          <line x1="810" y1="360" x2="820" y2="360" stroke="#00f0ff" stroke-width="1" />
          <text x="806" y="363" text-anchor="end" font-family="'DM Mono', monospace" font-size="8.5" fill="#7482a0">-97.45°</text>

          <!-- Right Telemetry Readout Stack -->
          <g font-family="'DM Mono', monospace" font-size="8.5" fill="#99aac7" text-anchor="end">
            <text x="806" y="418">Data: <tspan fill="#00f0ff" font-weight="700">396°</tspan></text>
            <text x="806" y="432">Doppler Pass: <tspan fill="#10b981" font-weight="700">LOCKED</tspan></text>
            <text x="806" y="446">FFT Sync: <tspan fill="#00f0ff">Active</tspan></text>
            <text x="806" y="460">SGP4: <tspan fill="#ae8cff">Nominal</tspan></text>
          </g>

          <!-- Bottom Center Status Pill -->
          <g transform="translate(325, 480)">
            <rect x="0" y="0" width="190" height="24" rx="4" fill="rgba(2, 8, 22, 0.9)" stroke="rgba(0, 240, 255, 0.45)" stroke-width="1.2" />
            <text x="95" y="16" text-anchor="middle" font-family="'DM Mono', monospace" font-size="10.5" font-weight="700" fill="#00f0ff" letter-spacing="1.2">SVALBARD GS-142</text>
          </g>

          <!-- Interactive HUD Stage Camera Controls -->
          <g class="hud-camera-controls" transform="translate(732, 478)">
            <g id="hud-btn-zoom-in" class="tactical-node" cursor="pointer">
              <rect x="0" y="0" width="22" height="22" rx="3" fill="rgba(2, 8, 22, 0.92)" stroke="rgba(0, 240, 255, 0.6)" stroke-width="1" />
              <text x="11" y="16" text-anchor="middle" font-family="'DM Mono', monospace" font-size="14" font-weight="700" fill="#00f0ff">+</text>
            </g>
            <g id="hud-btn-zoom-out" class="tactical-node" cursor="pointer" transform="translate(27, 0)">
              <rect x="0" y="0" width="22" height="22" rx="3" fill="rgba(2, 8, 22, 0.92)" stroke="rgba(0, 240, 255, 0.6)" stroke-width="1" />
              <text x="11" y="15" text-anchor="middle" font-family="'DM Mono', monospace" font-size="14" font-weight="700" fill="#00f0ff">−</text>
            </g>
            <g id="hud-btn-reset" class="tactical-node" cursor="pointer" transform="translate(54, 0)">
              <rect x="0" y="0" width="22" height="22" rx="3" fill="rgba(2, 8, 22, 0.92)" stroke="rgba(0, 240, 255, 0.6)" stroke-width="1" />
              <text x="11" y="15" text-anchor="middle" font-family="'DM Mono', monospace" font-size="11" font-weight="700" fill="#00f0ff">⟲</text>
            </g>
          </g>
        </g>

        <!-- 2. CONDITIONAL 2D VECTOR FALLBACK (Only rendered if WebGL is unavailable) -->
        ${threeRenderer ? '' : `
        <g class="holographic-globe" id="hud-holographic-globe">
          <circle cx="420" cy="250" r="125" fill="url(#globe-depth)" stroke="rgba(0, 240, 255, 0.45)" stroke-width="1.5" />
          <circle cx="420" cy="250" r="129" fill="none" stroke="#00f0ff" stroke-width="2.5" opacity="0.38" filter="url(#hud-glow-cyan-wide)" />
          <ellipse cx="420" cy="250" rx="125" ry="24" fill="none" stroke="rgba(0, 240, 255, 0.45)" stroke-width="1.2" stroke-dasharray="4 2" />
          <ellipse cx="420" cy="208" rx="108" ry="21" fill="none" stroke="rgba(0, 240, 255, 0.3)" stroke-width="1" />
          <ellipse cx="420" cy="172" rx="78" ry="15" fill="none" stroke="rgba(0, 240, 255, 0.25)" stroke-width="0.9" />
          <ellipse cx="420" cy="292" rx="108" ry="21" fill="none" stroke="rgba(0, 240, 255, 0.3)" stroke-width="1" />
          <line x1="420" y1="125" x2="420" y2="375" stroke="rgba(0, 240, 255, 0.5)" stroke-width="1.2" stroke-dasharray="4 2" />
          <ellipse cx="420" cy="250" rx="43" ry="125" fill="none" stroke="rgba(0, 240, 255, 0.35)" stroke-width="1" />
          <ellipse cx="420" cy="250" rx="82" ry="125" fill="none" stroke="rgba(0, 240, 255, 0.3)" stroke-width="1" />
          <g class="globe-continents" stroke="#00f0ff" stroke-width="1.2" fill="rgba(0, 240, 255, 0.08)" opacity="0.75">
            <path d="M 372,160 Q 388,148 406,152 Q 418,162 412,176 Q 404,195 382,210 Q 366,218 352,204 Q 335,185 352,170 Z" />
            <path d="M 382,235 Q 402,244 414,272 Q 408,312 394,338 Q 380,328 374,292 Q 368,260 382,235 Z" />
            <path d="M 436,155 Q 454,146 468,160 Q 462,180 448,190 Q 436,184 432,170 Z" />
            <path d="M 436,204 Q 464,208 478,236 Q 470,286 446,322 Q 432,302 434,254 Q 426,224 436,204 Z" />
          </g>
        </g>
        <g class="orbital-trajectories">
          <path d="${outerHaloOrbitPath}" fill="none" stroke="url(#orbit-ribbon-outer)" stroke-width="6" opacity="0.32" filter="url(#hud-glow-cyan)" />
          <path d="${primaryOrbitPath}" fill="none" stroke="url(#orbit-ribbon-cyan)" stroke-width="3.4" opacity="0.9" />
          <path d="${primaryOrbitPath}" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.95" />
          <path d="${innerSwarmOrbitPath}" fill="none" stroke="url(#orbit-ribbon-cyan)" stroke-width="2" stroke-dasharray="6 4" opacity="0.65" />
        </g>
        `}

        <!-- 3. SVALBARD GROUND STATION HUD BEACON -->
        <g id="hud-reticle-svalbard" class="ground-station-beam tactical-node ${isSvalbardSelected ? 'is-selected' : ''}" data-node-id="gs-142">
          ${threeRenderer ? '' : `
          <ellipse cx="580" cy="345" rx="36" ry="14" fill="none" stroke="#00f0ff" stroke-width="1.3" opacity="0.85" class="radar-pulse-ring-1" />
          <ellipse cx="580" cy="345" rx="66" ry="24" fill="none" stroke="#00f0ff" stroke-width="1" opacity="0.6" class="radar-pulse-ring-2" />
          <polygon points="576,345 515,180 645,145 584,345" fill="url(#beam-cone-grad)" class="volumetric-cone" />
          <line x1="580" y1="345" x2="605" y2="128" stroke="#ffffff" stroke-width="2.2" filter="url(#hud-glow-cyan)" opacity="0.95" />
          `}
          <circle cx="580" cy="345" r="5" fill="#ffffff" filter="url(#hud-glow-cyan)" />
          <circle cx="580" cy="345" r="11" fill="none" stroke="#00f0ff" stroke-width="1.5" />
          <text x="580" y="372" text-anchor="middle" font-family="'DM Mono', monospace" font-size="9" font-weight="700" fill="#00f0ff" letter-spacing="0.5">SVALBARD GS-142</text>
        </g>

        <!-- 4. TACTICAL HUD TARGETING RETICLES (3D-TRACKED) -->

        <!-- Target Reticle 1: AURORA-1 (Target Spacecraft) -->
        <g id="hud-reticle-aurora" class="tactical-node ${isAuroraSelected ? 'is-selected' : ''}" data-node-id="craft-aurora">
          <!-- 4-Corner Targeting Brackets [  ] -->
          <g class="bracket-pulse" stroke="#00f0ff" stroke-width="2.2" fill="none">
            <path d="M 587,114 L 587,108 L 593,108" />
            <path d="M 623,114 L 623,108 L 617,108" />
            <path d="M 587,142 L 587,148 L 593,148" />
            <path d="M 623,142 L 623,148 L 617,148" />
          </g>

          <!-- Rotating Dashed Target Ring -->
          <circle cx="605" cy="128" r="22" fill="none" stroke="#00f0ff" stroke-width="1.2" stroke-dasharray="4 3" class="reticle-spin" opacity="0.85" />

          <!-- Center Satellite Glyph Icon -->
          <rect x="601" y="124" width="8" height="8" fill="#00f0ff" filter="url(#hud-glow-cyan)" />
          <rect x="590" y="125" width="9" height="6" fill="rgba(0, 240, 255, 0.65)" stroke="#00f0ff" stroke-width="0.8" />
          <rect x="611" y="125" width="9" height="6" fill="rgba(0, 240, 255, 0.65)" stroke="#00f0ff" stroke-width="0.8" />
          <line x1="605" y1="119" x2="605" y2="137" stroke="#ffffff" stroke-width="1.2" />

          <!-- Orbital Velocity Vector Arrow -->
          <line x1="627" y1="124" x2="648" y2="118" stroke="#00f0ff" stroke-width="1.5" stroke-dasharray="2 2" />
          <polygon points="646,115 652,117 647,121" fill="#00f0ff" />

          <!-- Stepped Leader Line to HUD Telemetry Box -->
          <path d="M 625,122 L 652,98 L 764,98" fill="none" stroke="#00f0ff" stroke-width="1.2" />
          <circle cx="625" cy="122" r="2.5" fill="#00f0ff" />

          <!-- HUD Telemetry Card -->
          <rect x="652" y="70" width="140" height="54" rx="4" fill="url(#hud-card-grad)" stroke="#00f0ff" stroke-width="${isAuroraSelected ? '2' : '1.2'}" filter="url(#hud-glow-cyan)" />
          <text x="662" y="86" font-family="'DM Mono', monospace" font-size="11" font-weight="700" fill="#00f0ff">AURORA-1</text>
          <text x="662" y="99" font-family="'DM Mono', monospace" font-size="8.5" fill="#7482a0">Satellite // Primary Target</text>
          <text x="662" y="114" font-family="'DM Mono', monospace" font-size="9" fill="#eef8ff">Alt: <tspan fill="#00f0ff" font-weight="700">${liveAlt} km</tspan></text>
          <text x="735" y="114" font-family="'DM Mono', monospace" font-size="9" fill="#eef8ff">Vel: <tspan fill="#00f0ff" font-weight="700">${liveVel} km/s</tspan></text>
        </g>

        <!-- Target Reticle 2: NORAD 56987 (Candidate Lead / Object C) -->
        <g id="hud-reticle-norad" class="tactical-node ${isNoradSelected ? 'is-selected-red' : ''}" data-node-id="obj-56987">
          <!-- Red Tactical Targeting Reticle [ + ] -->
          <g stroke="#f43f5e" stroke-width="2" fill="none">
            <path d="M 638,218 L 638,212 L 644,212" />
            <path d="M 672,218 L 672,212 L 666,212" />
            <path d="M 638,242 L 638,248 L 644,248" />
            <path d="M 672,242 L 672,248 L 666,248" />
          </g>
          <circle cx="655" cy="230" r="14" fill="none" stroke="#f43f5e" stroke-width="1.2" opacity="0.85" />
          <line x1="655" y1="212" x2="655" y2="248" stroke="#f43f5e" stroke-width="1.2" />
          <line x1="637" y1="230" x2="673" y2="230" stroke="#f43f5e" stroke-width="1.2" />
          <circle cx="655" cy="230" r="3" fill="#ffffff" filter="url(#hud-glow-red)" />

          <!-- Stepped Leader Line to Red Telemetry Box -->
          <path d="M 674,230 L 696,230 L 708,242 L 778,242" fill="none" stroke="#f43f5e" stroke-width="1.2" />
          <circle cx="674" cy="230" r="2.5" fill="#f43f5e" />

          <!-- Red HUD Telemetry Box -->
          <rect x="696" y="222" width="126" height="42" rx="4" fill="url(#hud-card-red-grad)" stroke="#f43f5e" stroke-width="${isNoradSelected ? '2' : '1.2'}" filter="url(#hud-glow-red)" />
          <text x="705" y="238" font-family="'DM Mono', monospace" font-size="10.5" font-weight="700" fill="#f43f5e">NORAD 56987</text>
          <text x="705" y="252" font-family="'DM Mono', monospace" font-size="8.5" fill="#fecdd3">87.4% Match // Obj C</text>
        </g>

        <!-- Target Reticle 3: NORAD 56983 (Candidate Obj A) -->
        <g id="hud-reticle-norad83" class="tactical-node ${isNorad83Selected ? 'is-selected' : ''}" data-node-id="obj-56983">
          <g stroke="#f59e0b" stroke-width="1.8" fill="none">
            <path d="M 228,328 L 228,323 L 233,323" />
            <path d="M 252,328 L 252,323 L 247,323" />
            <path d="M 228,342 L 228,347 L 233,347" />
            <path d="M 252,342 L 252,347 L 247,347" />
          </g>
          <circle cx="240" cy="335" r="10" fill="none" stroke="#f59e0b" stroke-width="1.2" />
          <circle cx="240" cy="335" r="3" fill="#f59e0b" filter="url(#hud-glow-amber)" />
          <g transform="translate(258, 324)">
            <rect x="0" y="0" width="138" height="24" rx="12" fill="rgba(3, 10, 24, 0.88)" stroke="#f59e0b" stroke-width="1" />
            <circle cx="10" cy="12" r="3" fill="#f59e0b" />
            <text x="18" y="15.5" font-family="'DM Mono', monospace" font-size="8.5" fill="#fcd34d">NORAD 56983 (Obj A) · 41%</text>
          </g>
        </g>

        <!-- Target Reticle 4: NORAD 56991 (Candidate Obj G) -->
        <g id="hud-reticle-norad91" class="tactical-node ${isNorad91Selected ? 'is-selected' : ''}" data-node-id="obj-56991">
          <g stroke="#a855f7" stroke-width="1.8" fill="none">
            <path d="M 183,198 L 183,193 L 188,193" />
            <path d="M 207,198 L 207,193 L 202,193" />
            <path d="M 183,212 L 183,217 L 188,217" />
            <path d="M 207,212 L 207,217 L 202,217" />
          </g>
          <circle cx="195" cy="205" r="10" fill="none" stroke="#a855f7" stroke-width="1.2" />
          <circle cx="195" cy="205" r="3" fill="#a855f7" filter="url(#hud-glow-cyan)" />
          <g transform="translate(100, 222)">
            <rect x="0" y="0" width="144" height="24" rx="12" fill="rgba(3, 10, 24, 0.88)" stroke="#a855f7" stroke-width="1" />
            <circle cx="10" cy="12" r="3" fill="#a855f7" />
            <text x="18" y="15.5" font-family="'DM Mono', monospace" font-size="8.5" fill="#d8b4fe">NORAD 56991 (Obj G) · 18%</text>
          </g>
        </g>

        <!-- Observation Station Nodes: OBS-204 (RF) & OBS-229 (Doppler) -->
        <g id="hud-reticle-obs204" class="tactical-node ${isObs204Selected ? 'is-selected' : ''}" data-node-id="obs-204" transform="translate(130, 135)">
          <circle cx="12" cy="12" r="14" fill="none" stroke="#10b981" stroke-width="1.2" stroke-dasharray="3 2" />
          <circle cx="12" cy="12" r="5" fill="#10b981" filter="url(#hud-glow-cyan)" />
          <g transform="translate(-15, -28)">
            <rect x="0" y="0" width="140" height="22" rx="11" fill="rgba(3, 10, 24, 0.88)" stroke="#10b981" stroke-width="1" />
            <circle cx="10" cy="11" r="2.5" fill="#10b981" />
            <text x="18" y="14.5" font-family="'DM Mono', monospace" font-size="8.5" fill="#6ee7b7">OBS-204 (SatNOGS RF)</text>
          </g>
        </g>

        <g id="hud-reticle-obs229" class="tactical-node ${isObs229Selected ? 'is-selected' : ''}" data-node-id="obs-229" transform="translate(710, 140)">
          <circle cx="12" cy="12" r="14" fill="none" stroke="#10b981" stroke-width="1.2" stroke-dasharray="3 2" />
          <circle cx="12" cy="12" r="5" fill="#10b981" filter="url(#hud-glow-cyan)" />
          <g transform="translate(-50, -28)">
            <rect x="0" y="0" width="148" height="22" rx="11" fill="rgba(3, 10, 24, 0.88)" stroke="#10b981" stroke-width="1" />
            <circle cx="10" cy="11" r="2.5" fill="#10b981" />
            <text x="18" y="14.5" font-family="'DM Mono', monospace" font-size="8.5" fill="#6ee7b7">OBS-229 (Doppler Track)</text>
          </g>
        </g>
      </svg>
    `;

    svgContainer.innerHTML = svgHtml;

    // Attach Tactical HUD Node Click Handlers
    svgContainer.querySelectorAll('[data-node-id]').forEach(el => {
      el.addEventListener('click', function () {
        const nodeId = this.dataset.nodeId;
        selectedNodeId = nodeId;
        playHudChirp(960, 'sine', 0.08);

        // Map clicked tactical node to hypothesis context
        if (nodeId === 'obj-56987' || nodeId === 'craft-aurora' || nodeId === 'gs-142') {
          selectedHypothesis = workspaceData.hypotheses[0];
        } else if (nodeId === 'obj-56983') {
          selectedHypothesis = workspaceData.hypotheses[1];
        } else if (nodeId === 'obj-56991') {
          selectedHypothesis = workspaceData.hypotheses[2];
        } else if (nodeId === 'obs-204' || nodeId === 'obs-229') {
          selectedHypothesis = workspaceData.hypotheses[0];
        }

        renderGraph();
        renderHypotheses();
        renderEvidenceDrawer();
        renderOrbitalDeckInspector();
      });
    });

    // Attach Tactical HUD Camera Control Handlers
    const btnIn = svgContainer.querySelector('#hud-btn-zoom-in');
    const btnOut = svgContainer.querySelector('#hud-btn-zoom-out');
    const btnReset = svgContainer.querySelector('#hud-btn-reset');
    if (btnIn) btnIn.addEventListener('click', (e) => {
      e.stopPropagation();
      cameraTargetZ = Math.max(115, cameraTargetZ - 25);
      playHudChirp(880, 'sine', 0.05);
    });
    if (btnOut) btnOut.addEventListener('click', (e) => {
      e.stopPropagation();
      cameraTargetZ = Math.min(320, cameraTargetZ + 25);
      playHudChirp(720, 'sine', 0.05);
    });
    if (btnReset) btnReset.addEventListener('click', (e) => {
      e.stopPropagation();
      cameraTargetZ = 185;
      rotationTarget.x = 0.22;
      rotationTarget.y = -0.6;
      playHudChirp(960, 'sine', 0.06);
    });
  }

  function renderHypotheses() {
    const list = document.getElementById('inv-hypotheses-container');
    if (!list || !workspaceData) return;

    list.innerHTML = workspaceData.hypotheses.map(item => {
      const isActive = selectedHypothesis && selectedHypothesis.id === item.id;
      return `
        <div class="n-panel investigate-hypothesis-card n-crosshair ${isActive ? 'is-active n-panel--tech' : ''}" data-hyp-id="${item.id}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div>
              <div class="n-label-micro">#${item.rank} · ${item.tracked_object}</div>
              <h4 style="font-size: 1.15rem; color: var(--n-text); margin-top: 2px;">${item.spacecraft_name}</h4>
            </div>
            <div style="text-align: right;">
              <div style="font-family: var(--n-font-mono); font-size: 1.35rem; font-weight: 700; color: ${item.evidence_score > 70 ? 'var(--n-cyan)' : (item.evidence_score > 35 ? 'var(--n-amber)' : 'var(--n-red)')};">
                ${item.evidence_score}%
              </div>
              <span class="n-label-micro">EVIDENCE</span>
            </div>
          </div>

          <div class="investigate-confidence-bar">
            <div class="investigate-confidence-fill ${item.status === 'conflicted' ? 'is-conflict' : ''}" style="width: ${item.evidence_score}%;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-family: var(--n-font-mono); font-size: 0.75rem;">
            <span class="n-chip ${item.status === 'conflicted' ? 'n-chip--red' : 'n-chip--cyan'}">
              ${item.status === 'conflicted' ? '⚠ Conflict Detected' : '✓ SGP4 Physics Match'}
            </span>
            <span class="n-muted">${item.supporting_observations.length} Corroborating Passes</span>
          </div>

          ${item.contradictions && item.contradictions.length > 0 ? `
            <div style="margin-top: 10px; font-family: var(--n-font-mono); font-size: 0.72rem; color: var(--n-red); background: rgba(244,63,94,0.12); border: 1px solid rgba(244,63,94,0.3); padding: 6px 10px; border-radius: 4px;">
              ⚠ CONFLICT: ${window.NebulonFormatters.escapeHtml(item.contradictions[0])}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    list.querySelectorAll('[data-hyp-id]').forEach(el => {
      el.addEventListener('click', function () {
        const id = this.dataset.hypId;
        selectedHypothesis = workspaceData.hypotheses.find(h => h.id === id);
        if (selectedHypothesis) {
          if (selectedHypothesis.tracked_object.includes('56987')) selectedNodeId = 'obj-56987';
          else if (selectedHypothesis.tracked_object.includes('56983')) selectedNodeId = 'obj-56983';
          else if (selectedHypothesis.tracked_object.includes('56991')) selectedNodeId = 'obj-56991';
        }
        playHudChirp(1100, 'triangle', 0.08);
        renderGraph();
        renderHypotheses();
        renderEvidenceDrawer();
      });
    });
  }

  function renderEvidenceDrawer() {
    const drawer = document.getElementById('inv-evidence-drawer-body');
    if (!drawer) return;

    const hyp = selectedHypothesis || (workspaceData ? workspaceData.hypotheses[0] : null);
    if (!hyp) return;

    drawer.innerHTML = `
      <div>
        <span class="n-kicker">SELECTED CANDIDATE</span>
        <h3 style="font-size: 1.3rem; margin-top: 2px; color: #ffffff;">${hyp.tracked_object}</h3>
        <div style="font-family: var(--n-font-mono); font-size: 0.8rem; color: var(--n-cyan); margin-top: 3px;">
          Hypothesis Target: <strong>${hyp.spacecraft_name}</strong>
        </div>
      </div>

      <!-- SGP4 Telemetry Card -->
      <div class="investigate-detail-card n-panel--tech">
        <span class="n-label-micro" style="color: var(--n-cyan);">KEPLERIAN RESIDUAL & SGP4 ORBIT</span>
        <div class="investigate-detail-grid">
          <div><span class="n-muted">Semi-Major Axis:</span> <strong style="color: var(--n-text);">${hyp.orbital_elements.semi_major_axis_km} km</strong></div>
          <div><span class="n-muted">Altitude:</span> <strong style="color: var(--n-text);">${hyp.orbital_elements.altitude_km} km</strong></div>
          <div><span class="n-muted">Inclination:</span> <strong style="color: var(--n-text);">${hyp.orbital_elements.inclination}°</strong></div>
          <div><span class="n-muted">Eccentricity:</span> <strong style="color: var(--n-text);">${hyp.orbital_elements.eccentricity}</strong></div>
        </div>
        <div style="margin-top: 8px; font-family: var(--n-font-mono); font-size: 0.7rem; color: var(--n-muted);">
          Element Epoch: ${hyp.orbital_elements.epoch}
        </div>
      </div>

      <!-- RF Doppler Waterfall Card -->
      <div class="investigate-detail-card n-panel--tech">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="n-label-micro" style="color: var(--n-violet);">RF DOPPLER WATERFALL & SPECTRUM</span>
          <span class="n-chip n-chip--cyan" style="font-size: 0.65rem;">LIVE FFT</span>
        </div>
        
        <canvas class="rf-spectrum-canvas" id="inv-rf-canvas"></canvas>

        <div class="investigate-detail-grid">
          <div><span class="n-muted">Center Freq:</span> <strong>${hyp.rf_characteristics.beacon_freq}</strong></div>
          <div><span class="n-muted">Modulation:</span> <strong>${hyp.rf_characteristics.modulation}</strong></div>
          <div><span class="n-muted">Signal SNR:</span> <strong style="color: var(--n-green);">+${hyp.rf_characteristics.measured_snr_db} dB</strong></div>
          <div><span class="n-muted">Doppler Residual:</span> <strong style="color: ${hyp.rf_characteristics.doppler_residual_hz > 100 ? 'var(--n-red)' : 'var(--n-cyan)'};">${hyp.rf_characteristics.doppler_residual_hz} Hz</strong></div>
        </div>
      </div>

      <div class="investigation-live-orbit-card" id="investigation-live-orbit-card" aria-live="polite">
        <div class="investigation-live-orbit-card__head"><span class="n-label-micro">LIVE NASA ORBITAL ANCHOR</span><span id="investigation-live-orbit-status" class="investigation-feed-badge">AWAITING FEED</span></div>
        <div class="investigation-live-orbit-name" id="investigation-live-orbit-name">NORAD orbital record pending</div>
        <div class="investigation-live-orbit-grid">
          <div><span>Mean altitude</span><strong id="investigation-live-altitude">—</strong></div>
          <div><span>Inclination</span><strong id="investigation-live-inclination">—</strong></div>
          <div><span>Eccentricity</span><strong id="investigation-live-eccentricity">—</strong></div>
          <div><span>Mean velocity</span><strong id="investigation-live-velocity">—</strong></div>
          <div><span>Perigee</span><strong id="investigation-live-perigee">—</strong></div>
          <div><span>Apogee</span><strong id="investigation-live-apogee">—</strong></div>
          <div><span>Orbital period</span><strong id="investigation-live-period">—</strong></div>
          <div><span>Mean motion</span><strong id="investigation-live-motion">—</strong></div>
          <div><span>RAAN</span><strong id="investigation-live-raan">—</strong></div>
          <div><span>Arg. perigee</span><strong id="investigation-live-arg">—</strong></div>
          <div><span>Mean anomaly</span><strong id="investigation-live-anomaly">—</strong></div>
          <div><span>Element age</span><strong id="investigation-live-age">—</strong></div>
        </div>
        <div class="investigation-live-epoch">Element epoch <b id="investigation-live-epoch">—</b></div>
        <a id="investigation-live-source" href="https://tle.ivanstanojevic.me/api/tle/56987" target="_blank" rel="noopener noreferrer">Open NASA-cataloged TLE record ↗</a>
        <details class="investigation-raw-tle"><summary>OPEN RAW TLE LINES</summary><code id="investigation-live-line1">—</code><code id="investigation-live-line2">—</code></details>
      </div>

      <div style="margin-top: auto; padding-top: 1rem; display: flex; flex-direction: column; gap: 8px;">
        <a href="observe.html" class="n-btn n-btn--primary n-btn--sm" style="width: 100%;">
          Find Next Observation for this Candidate →
        </a>
        <a href="review.html" class="n-btn n-btn--secondary n-btn--sm" style="width: 100%;">
          Commit in Verification Chamber
        </a>
      </div>
    `;

    initSpectrumCanvas();
    renderLiveOrbitalCard();
    renderOrbitalDeckInspector();
  }

  function renderLiveOrbitalCard() {
    const card = document.getElementById('investigation-live-orbit-card');
    if (!card) return;
    const satelliteId = selectedNodeId.startsWith('obj-') ? selectedNodeId.replace('obj-', '') : '56987';
    const record = liveTleRecords.get(satelliteId);
    const live = record ? parseTleRecord(record) : null;
    const status = document.getElementById('investigation-live-orbit-status');
    if (status) {
      status.textContent = live ? 'LIVE TLE' : 'AWAITING FEED';
      status.classList.toggle('is-fallback', !live);
    }
    if (!live) return;
    setLiveText('investigation-live-orbit-name', `${live.name} / NORAD ${live.satelliteId}`);
    setLiveText('investigation-live-altitude', `${live.meanAltitudeKm.toFixed(1)} km mean`);
    setLiveText('investigation-live-inclination', `${live.inclinationDeg.toFixed(4)}°`);
    setLiveText('investigation-live-eccentricity', live.eccentricity.toFixed(7));
    setLiveText('investigation-live-velocity', `${live.meanVelocityKms.toFixed(3)} km/s`);
    setLiveText('investigation-live-perigee', `${live.perigeeKm.toFixed(1)} km`);
    setLiveText('investigation-live-apogee', `${live.apogeeKm.toFixed(1)} km`);
    setLiveText('investigation-live-period', `${live.periodMinutes.toFixed(2)} min`);
    setLiveText('investigation-live-motion', `${live.meanMotionRevDay.toFixed(8)} rev/day`);
    setLiveText('investigation-live-raan', `${live.raanDeg.toFixed(4)}°`);
    setLiveText('investigation-live-arg', `${live.argPerigeeDeg.toFixed(4)}°`);
    setLiveText('investigation-live-anomaly', `${live.meanAnomalyDeg.toFixed(4)}°`);
    setLiveText('investigation-live-age', `${live.elementAgeDays.toFixed(2)} days`);
    setLiveText('investigation-live-epoch', live.epochLabel);
    setLiveText('investigation-live-line1', record.line1);
    setLiveText('investigation-live-line2', record.line2);
    const source = document.getElementById('investigation-live-source');
    if (source) {
      source.href = `${LIVE_TLE_ENDPOINT}/${live.satelliteId}`;
      source.textContent = `Open NASA-cataloged TLE record / ${live.satelliteId} ↗`;
    }
  }

  function setLiveText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function parseTleRecord(record) {
    if (!record || !record.line1 || !record.line2) return null;
    const line2 = record.line2;
    const inclinationDeg = Number(line2.slice(8, 16));
    const raanDeg = Number(line2.slice(17, 25));
    const eccentricity = Number(`0.${line2.slice(26, 33).trim()}`);
    const argPerigeeDeg = Number(line2.slice(34, 42));
    const meanAnomalyDeg = Number(line2.slice(43, 51));
    const meanMotionRevDay = Number(line2.slice(52, 63));
    const meanMotionRadSec = meanMotionRevDay * 2 * Math.PI / 86400;
    const semiMajorAxisKm = Math.pow(EARTH_MU_KM3_S2 / (meanMotionRadSec * meanMotionRadSec), 1 / 3);
    const epochDate = parseTleEpoch(record.line1);
    return {
      satelliteId: record.satelliteId,
      name: record.name || `NORAD ${record.satelliteId}`,
      inclinationDeg,
      raanDeg,
      eccentricity,
      argPerigeeDeg,
      meanAnomalyDeg,
      meanMotionRevDay,
      meanAltitudeKm: semiMajorAxisKm - EARTH_MEAN_RADIUS_KM,
      perigeeKm: semiMajorAxisKm * (1 - eccentricity) - EARTH_MEAN_RADIUS_KM,
      apogeeKm: semiMajorAxisKm * (1 + eccentricity) - EARTH_MEAN_RADIUS_KM,
      periodMinutes: 1440 / meanMotionRevDay,
      meanVelocityKms: Math.sqrt(EARTH_MU_KM3_S2 / semiMajorAxisKm),
      elementAgeDays: epochDate ? Math.max(0, (Date.now() - epochDate.getTime()) / 86400000) : 0,
      epochLabel: epochDate ? `${formatUtc(epochDate)} · NASA TLE` : `${record.date || 'Unknown'} · NASA TLE`
    };
  }

  function parseTleEpoch(line1) {
    const year2 = Number(line1.slice(18, 20));
    const day = Number(line1.slice(20, 32));
    if (!Number.isFinite(year2) || !Number.isFinite(day)) return null;
    const year = year2 < 57 ? 2000 + year2 : 1900 + year2;
    return new Date(Date.UTC(year, 0, 1) + (day - 1) * 86400000);
  }

  function formatUtc(date) {
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  }

  async function initLiveInvestigationFeed() {
    if (liveRefreshTimer) window.clearInterval(liveRefreshTimer);
    if (liveClockTimer) window.clearInterval(liveClockTimer);
    updateInvestigationClock();
    liveClockTimer = window.setInterval(updateInvestigationClock, 1000);
    await refreshLiveInvestigationFeed();
    liveRefreshTimer = window.setInterval(refreshLiveInvestigationFeed, LIVE_REFRESH_MS);
  }

  function updateInvestigationClock() {
    const utc = new Date().toISOString().slice(11, 19);
    const clock = document.getElementById('investigation-live-clock');
    const deckClock = document.getElementById('investigation-deck-utc');
    if (clock) clock.textContent = utc;
    if (deckClock) deckClock.textContent = utc;
  }

  async function refreshLiveInvestigationFeed() {
    setInvestigationFeedStatus('CONNECTING', false);
    const ids = ['56987', '56983', '56991'];
    const results = await Promise.allSettled(ids.map(async (id) => {
      const response = await fetch(`${LIVE_TLE_ENDPOINT}/${id}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`TLE ${id} returned ${response.status}`);
      return response.json();
    }));
    let successCount = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value && result.value.line1 && result.value.line2) {
        liveTleRecords.set(ids[index], result.value);
        successCount += 1;
      }
    });
    renderLiveOrbitalCard();
    renderOrbitalDeckInspector();
    applyLiveOrbitTelemetry();
    renderGraph();
    if (successCount === ids.length) setInvestigationFeedStatus('LIVE / NASA TLE', true);
    else if (successCount > 0) setInvestigationFeedStatus(`PARTIAL / ${successCount} OF ${ids.length}`, true);
    else setInvestigationFeedStatus('FALLBACK / WORKSPACE DATA', false);
  }

  function applyLiveOrbitTelemetry() {
    if (!threeScene) return;
    const r56987 = liveTleRecords.get('56987');
    if (r56987) {
      const live = parseTleRecord(r56987);
      if (live && satAurora && satAurora.userData) {
        satAurora.userData.speed = 0.08 * (live.meanMotionRevDay / 15.0);
      }
      if (live && satNorad56987 && satNorad56987.userData) {
        satNorad56987.userData.speed = 0.08 * (live.meanMotionRevDay / 15.0);
      }
    }
    const r56983 = liveTleRecords.get('56983');
    if (r56983) {
      const live = parseTleRecord(r56983);
      if (live && satNorad56983 && satNorad56983.userData) {
        satNorad56983.userData.speed = 0.065 * (live.meanMotionRevDay / 15.0);
      }
    }
    const r56991 = liveTleRecords.get('56991');
    if (r56991) {
      const live = parseTleRecord(r56991);
      if (live && satNorad56991 && satNorad56991.userData) {
        satNorad56991.userData.speed = 0.055 * (live.meanMotionRevDay / 15.0);
      }
    }
  }

  function setInvestigationFeedStatus(label, isLive) {
    const status = document.getElementById('investigation-data-status');
    const drawerStatus = document.getElementById('investigation-drawer-feed');
    const referenceStatus = document.getElementById('investigation-reference-sync');
    const graphStatus = document.getElementById('investigation-link-state');
    const state = document.getElementById('investigation-state');
    if (status) status.textContent = label;
    if (drawerStatus) {
      drawerStatus.textContent = isLive ? 'NASA LINK' : label;
      drawerStatus.classList.toggle('is-fallback', !isLive);
    }
    if (referenceStatus) {
      referenceStatus.textContent = isLive ? `SYNCED ${new Date().toISOString().slice(11, 19)} UTC` : label;
      referenceStatus.classList.toggle('is-synced', isLive);
    }
    if (graphStatus) graphStatus.textContent = isLive ? 'NASA TLE / NOMINAL' : 'WORKSPACE FALLBACK';
    if (state) state.textContent = isLive ? 'FUSION LIVE' : 'ANALYZING';
    const stage = document.getElementById('investigation-live-orbit-status');
    if (stage && !isLive) stage.classList.add('is-fallback');
  }

  function initSpectrumCanvas() {
    spectrumCanvas = document.getElementById('inv-rf-canvas');
    if (!spectrumCanvas) return;
    spectrumCtx = spectrumCanvas.getContext('2d');
    spectrumCanvas.width = spectrumCanvas.parentElement.offsetWidth - 24;
    spectrumCanvas.height = 55;

    if (spectrumAnimId) cancelAnimationFrame(spectrumAnimId);

    let phase = 0;
    function renderSpectrum() {
      if (!spectrumCtx || !spectrumCanvas) return;
      const w = spectrumCanvas.width;
      const h = spectrumCanvas.height;

      spectrumCtx.clearRect(0, 0, w, h);

      // Draw Grid
      spectrumCtx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
      spectrumCtx.lineWidth = 1;
      spectrumCtx.beginPath();
      for (let x = 0; x < w; x += 25) {
        spectrumCtx.moveTo(x, 0);
        spectrumCtx.lineTo(x, h);
      }
      spectrumCtx.stroke();

      // Draw Doppler Peak Waveform
      spectrumCtx.strokeStyle = '#00f0ff';
      spectrumCtx.lineWidth = 1.5;
      spectrumCtx.beginPath();
      const mid = w / 2;

      for (let x = 0; x < w; x++) {
        const dist = Math.abs(x - mid);
        const gaussian = Math.exp(-Math.pow(dist / 22, 2));
        const noise = (Math.random() - 0.5) * 4;
        const y = h - 6 - gaussian * 38 + Math.sin(x * 0.15 + phase) * 2 + noise;
        if (x === 0) spectrumCtx.moveTo(x, y);
        else spectrumCtx.lineTo(x, y);
      }
      spectrumCtx.stroke();

      phase += 0.08;
      if (window.NebulonMotion && window.NebulonMotion.getMode() !== 'reduced') {
        spectrumAnimId = requestAnimationFrame(renderSpectrum);
      }
    }

    renderSpectrum();
  }

  function renderAccessibleTable() {
    const tableBody = document.getElementById('inv-accessible-table-body');
    if (!tableBody || !workspaceData) return;

    tableBody.innerHTML = workspaceData.hypotheses.map(h => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid var(--n-line); font-family: var(--n-font-mono);">${h.rank}</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--n-line); font-weight: 600;">${h.tracked_object}</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--n-line);">${h.spacecraft_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--n-line); font-family: var(--n-font-mono);">${h.evidence_score}%</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--n-line);">${h.status}</td>
      </tr>
    `).join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
