/* ==========================================================================
   NEBULON ORBITAL THEATER — THREE.JS PHOTOREALISTIC 3D GLOBE & SPACECRAFT
   Integrated with Criss-Crossing 3D Orbital Trajectories & Proportional Globe Sizing
   ========================================================================== */

(function () {
  'use strict';

  const TEXTURES = {
    day: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
    normal: 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg',
    specular: 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg',
    clouds: 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png'
  };

  // Proportional globe size to fit gracefully in HUD viewport
  const EARTH_RADIUS = 52;
  const AUTO_REVOLUTION_SPEED = 0.04; // radians per second
  const CLOUD_DRIFT_SPEED = 0.012; // radians per second

  let scene, camera, renderer;
  let rootGroup, earthSystem, earthMesh, cloudMesh, starField;
  let resizeObserver, animationFrameId;
  let lastFrameTime = 0;

  const telemetryPulses = [];
  const satelliteOrbits = [];
  const rotationTarget = { x: 0.22, y: -0.6 };
  const interaction = {
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0
  };

  let activeTrackId = 'obj-56987';
  let layers = {
    all_candidates: true,
    station_visibility: true
  };

  // Distinct Criss-Crossing 3D Orbital Parameters (Different Planes & Angles)
  const SATELLITE_DEFINITIONS = [
    {
      id: 'obj-56987',
      name: 'Aurora-1 / NORAD 56987 (Obj C)',
      radius: EARTH_RADIUS + 16,
      inc_rad: THREE.MathUtils.degToRad(97.45), // Sun-Synchronous Polar Plane
      raan_rad: THREE.MathUtils.degToRad(214.0),
      speed: 0.13,
      color: 0x00f0ff,
      glowColor: '#00f0ff',
      phase: 0.5,
      isFlagship: true,
      alt_km: 516.2,
      vel_kms: 7.61,
      inc_deg: 97.45,
      ecc: 0.0012,
      epoch: '2026-08-25 09:14:02 UTC'
    },
    {
      id: 'obj-56983',
      name: 'NORAD 56983 (Obj A)',
      radius: EARTH_RADIUS + 22,
      inc_rad: THREE.MathUtils.degToRad(48.2), // Diagonal Mid-Latitude Plane (Crosses Orbit 1)
      raan_rad: THREE.MathUtils.degToRad(68.0),
      speed: 0.11,
      color: 0xf59e0b,
      glowColor: '#f59e0b',
      phase: 2.2,
      isFlagship: false,
      alt_km: 520.6,
      vel_kms: 7.59,
      inc_deg: 48.2,
      ecc: 0.0015,
      epoch: '2026-08-25 08:44:10 UTC'
    },
    {
      id: 'obj-56991',
      name: 'NORAD 56991 (Obj G)',
      radius: EARTH_RADIUS + 28,
      inc_rad: THREE.MathUtils.degToRad(-62.5), // Retrograde Cross-Orbital Plane
      raan_rad: THREE.MathUtils.degToRad(325.0),
      speed: 0.095,
      color: 0xf43f5e,
      glowColor: '#f43f5e',
      phase: 4.1,
      isFlagship: false,
      alt_km: 527.1,
      vel_kms: 7.56,
      inc_deg: 62.5,
      ecc: 0.0021,
      epoch: '2026-08-25 07:12:35 UTC'
    }
  ];

  const STATIONS = [
    { id: 'gs-142', name: 'GS-142 Svalbard', lat: 78.22, lon: 15.65, color: 0xa855f7, size: 2.0, maxScale: 3.8 },
    { id: 'gs-088', name: 'GS-088 Hawaii', lat: 19.82, lon: -155.46, color: 0x3b82f6, size: 1.8, maxScale: 3.4 },
    { id: 'gs-044', name: 'GS-044 Hartebeesthoek', lat: -25.88, lon: 27.70, color: 0x10b981, size: 1.8, maxScale: 3.4 }
  ];

  function initGlobe() {
    const container = document.getElementById('globe-container');
    if (!container || typeof THREE === 'undefined') return;

    container.innerHTML = '';
    container.style.touchAction = 'none';

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2500);
    camera.position.set(0, 0, 195); // Proportionally fitted

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.cursor = 'grab';
    container.appendChild(renderer.domElement);

    rootGroup = new THREE.Group();
    rootGroup.rotation.set(rotationTarget.x, rotationTarget.y, 0);
    scene.add(rootGroup);

    // Earth axial tilt
    earthSystem = new THREE.Group();
    earthSystem.rotation.z = THREE.MathUtils.degToRad(-23.4);
    rootGroup.add(earthSystem);

    addLighting();
    addRealisticEarth();
    addAtmosphere();
    addStarfield();
    addTelemetryMarkers();
    addCrissCrossingSatelliteOrbits();
    attachInteraction(container);
    watchContainerSize(container);
    bindUIControls();
    updateTelemetryCard();

    lastFrameTime = performance.now();
    animate(lastFrameTime);

    // Listen to timeline scrubber
    window.addEventListener('nebulon:timeline-scrub', function (e) {
      const val = e.detail.value;
      satelliteOrbits.forEach((orb, i) => {
        orb.phase = (val / 100) * Math.PI * 4 + i * 1.5;
      });
    });
  }

  function addLighting() {
    const hemisphereLight = new THREE.HemisphereLight(0xa5e5ff, 0x020718, 1.4);
    scene.add(hemisphereLight);

    const sunlight = new THREE.DirectionalLight(0xfff8ea, 2.6);
    sunlight.position.set(-160, 90, 220);
    scene.add(sunlight);

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 0.9);
    rimLight.position.set(170, -50, -130);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x183d72, 0.6);
    fillLight.position.set(-60, -140, 40);
    scene.add(fillLight);
  }

  function addRealisticEarth() {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    const dayTexture = loadTexture(textureLoader, TEXTURES.day, true);
    const normalTexture = loadTexture(textureLoader, TEXTURES.normal, false);
    const specularTexture = loadTexture(textureLoader, TEXTURES.specular, false);
    const cloudsTexture = loadTexture(textureLoader, TEXTURES.clouds, true);

    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 128, 128);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: dayTexture,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.85, 0.85),
      specularMap: specularTexture,
      specular: new THREE.Color(0x38bdf8),
      shininess: 12
    });

    earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMesh.name = 'Photorealistic Earth';
    earthSystem.add(earthMesh);

    // Cloud layer
    const cloudGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 0.85, 128, 128);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloudMesh.name = 'Dynamic Cloud Layer';
    earthSystem.add(cloudMesh);
  }

  function addAtmosphere() {
    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 3.2, 128, 128);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        glowColor: { value: new THREE.Color(0x00f0ff) },
        power: { value: 3.2 },
        intensity: { value: 0.9 }
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

    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphere.name = 'Cyan Atmospheric Halo';
    earthSystem.add(atmosphere);

    const outerGlowGeo = new THREE.SphereGeometry(EARTH_RADIUS + 6.2, 96, 96);
    const outerGlowMat = atmosphereMaterial.clone();
    outerGlowMat.uniforms = {
      glowColor: { value: new THREE.Color(0x0284c7) },
      power: { value: 4.8 },
      intensity: { value: 0.28 }
    };
    const outerGlow = new THREE.Mesh(outerGlowGeo, outerGlowMat);
    earthSystem.add(outerGlow);
  }

  function addStarfield() {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 300 + Math.random() * 700;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const offset = i * 3;

      positions[offset] = radius * Math.sin(phi) * Math.cos(theta);
      positions[offset + 1] = radius * Math.cos(phi);
      positions[offset + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const warmth = Math.random();
      colors[offset] = 0.5 + warmth * 0.5;
      colors[offset + 1] = 0.75 + warmth * 0.25;
      colors[offset + 2] = 1.0;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      sizeAttenuation: true
    });

    starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);
  }

  function addTelemetryMarkers() {
    STATIONS.forEach((st, index) => {
      const position = latLonToVector3(st.lat, st.lon, EARTH_RADIUS + 1.2);
      const normal = position.clone().normalize();

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(st.size, 16, 16),
        new THREE.MeshBasicMaterial({ color: st.color })
      );
      marker.position.copy(position);
      earthSystem.add(marker);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: makeGlowTexture(st.color),
          color: st.color,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      halo.position.copy(position.clone().add(normal.clone().multiplyScalar(0.6)));
      halo.scale.set(10, 10, 1);
      earthSystem.add(halo);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(st.size * 1.2, st.size * 2.0, 48),
        new THREE.MeshBasicMaterial({
          color: st.color,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        })
      );
      ring.position.copy(position.clone().add(normal.clone().multiplyScalar(0.5)));
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      earthSystem.add(ring);

      telemetryPulses.push({
        ring,
        halo,
        offset: index * 0.7,
        maxScale: st.maxScale
      });
    });
  }

  /* --------------------------------------------------------------------------
     CRISS-CROSSING 3D ORBITAL TRAJECTORY SYSTEM
     -------------------------------------------------------------------------- */

  function computeOrbitPoint3D(radius, incRad, raanRad, theta) {
    // 3D Point along inclined and rotated orbital plane
    const xp = radius * Math.cos(theta);
    const yp = radius * Math.sin(theta);

    const x = xp * Math.cos(raanRad) - yp * Math.cos(incRad) * Math.sin(raanRad);
    const y = yp * Math.sin(incRad);
    const z = xp * Math.sin(raanRad) + yp * Math.cos(incRad) * Math.cos(raanRad);

    return new THREE.Vector3(x, y, z);
  }

  function createCrissCrossingOrbitRibbon(def) {
    const points = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(computeOrbitPoint3D(def.radius, def.inc_rad, def.raan_rad, theta));
    }

    const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMat = new THREE.LineBasicMaterial({
      color: def.color || 0x00f0ff,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitLine.name = `Orbit Track: ${def.name}`;
    return orbitLine;
  }

  function buildRealisticSatelliteMesh(options = {}) {
    const satellite = new THREE.Group();
    satellite.name = options.name || 'Spacecraft';

    const goldFoilMat = new THREE.MeshPhongMaterial({
      color: 0xdeb841,
      emissive: 0x221703,
      specular: 0xfff5b8,
      shininess: 90
    });

    const titaniumMat = new THREE.MeshPhongMaterial({
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

    const dishMat = new THREE.MeshPhongMaterial({
      color: 0xf1f5f9,
      specular: 0xffffff,
      shininess: 80,
      side: THREE.DoubleSide
    });

    // 1. Central Avionics Bus
    const busGeo = new THREE.BoxGeometry(2.4, 1.5, 1.5);
    const busMesh = new THREE.Mesh(busGeo, goldFoilMat);
    satellite.add(busMesh);

    // Caps
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 1.6), titaniumMat);
    topCap.position.y = 0.8;
    const botCap = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 1.6), titaniumMat);
    botCap.position.y = -0.8;
    satellite.add(topCap, botCap);

    // 2. Optical Sensor Lens
    const lensTubeGeo = new THREE.CylinderGeometry(0.38, 0.3, 0.65, 20);
    const lensMat = new THREE.MeshPhongMaterial({
      color: options.color || 0x00f0ff,
      emissive: 0x003355,
      specular: 0xffffff,
      shininess: 100
    });
    const lensTube = new THREE.Mesh(lensTubeGeo, lensMat);
    lensTube.rotation.x = Math.PI / 2;
    lensTube.position.set(0, 0, 0.9);
    satellite.add(lensTube);

    // 3. Parabolic Communications Dish
    const dishGroup = new THREE.Group();
    const dishGeo = new THREE.CylinderGeometry(1.1, 0.15, 0.38, 20, 1, true);
    const dishMesh = new THREE.Mesh(dishGeo, dishMat);
    dishMesh.rotation.x = Math.PI / 2;

    const feedMast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), titaniumMat);
    feedMast.rotation.x = Math.PI / 2;
    feedMast.position.z = 0.35;
    dishGroup.add(dishMesh, feedMast);
    dishGroup.position.set(0, -0.8, 0.4);
    dishGroup.rotation.x = Math.PI / 5;
    satellite.add(dishGroup);

    // 4. Solar Wings
    const solarWingLeft = new THREE.Group();
    const solarWingRight = new THREE.Group();

    const boomLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 8), goldFoilMat);
    boomLeft.rotation.z = Math.PI / 2;
    boomLeft.position.x = -1.0;

    const panelLeftGeo = new THREE.BoxGeometry(4.0, 1.4, 0.08);
    const panelLeft = new THREE.Mesh(panelLeftGeo, solarCellMat);
    panelLeft.position.x = -3.5;

    const navLedLeft = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xff3b30 })
    );
    navLedLeft.position.set(-5.6, 0.6, 0);
    solarWingLeft.add(boomLeft, panelLeft, navLedLeft);

    const boomRight = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 8), goldFoilMat);
    boomRight.rotation.z = Math.PI / 2;
    boomRight.position.x = 1.0;

    const panelRightGeo = new THREE.BoxGeometry(4.0, 1.4, 0.08);
    const panelRight = new THREE.Mesh(panelRightGeo, solarCellMat);
    panelRight.position.x = 3.5;

    const navLedRight = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10),
      new THREE.MeshBasicMaterial({ color: options.color || 0x00f0ff })
    );
    navLedRight.position.set(5.6, 0.6, 0);
    solarWingRight.add(boomRight, panelRight, navLedRight);

    satellite.add(solarWingLeft, solarWingRight);

    // 5. Thruster
    const thrusterBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.5, 0.45, 14),
      titaniumMat
    );
    thrusterBell.rotation.x = Math.PI / 2;
    thrusterBell.position.set(0, 0, -0.9);

    const ionConeMat = new THREE.MeshBasicMaterial({
      color: options.color || 0x00f0ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const ionPlume = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.2, 14), ionConeMat);
    ionPlume.rotation.x = -Math.PI / 2;
    ionPlume.position.set(0, 0, -1.6);
    satellite.add(thrusterBell, ionPlume);

    // 6. Conical Telemetry Radar Beam
    const radarBeamMat = new THREE.MeshBasicMaterial({
      color: options.color || 0x00f0ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const radarBeamGeo = new THREE.ConeGeometry(4.2, 16, 28, 1, true);
    const radarBeam = new THREE.Mesh(radarBeamGeo, radarBeamMat);
    radarBeam.rotation.x = Math.PI / 2;
    radarBeam.position.set(0, 0, 9);
    satellite.add(radarBeam);

    const footprintRing = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 4.0, 32),
      new THREE.MeshBasicMaterial({
        color: options.color || 0x00f0ff,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    footprintRing.position.set(0, 0, 17);
    satellite.add(footprintRing);

    return {
      group: satellite,
      solarWings: [solarWingLeft, solarWingRight],
      navLeds: [navLedLeft, navLedRight],
      ionPlume,
      radarBeam,
      footprintRing
    };
  }

  function addCrissCrossingSatelliteOrbits() {
    SATELLITE_DEFINITIONS.forEach((def) => {
      // 1. Add Distinct Criss-Crossing 3D Orbit Path
      const orbitPath = createCrissCrossingOrbitRibbon(def);
      rootGroup.add(orbitPath);

      // 2. Build Realistic 3D Spacecraft
      const spacecraft = buildRealisticSatelliteMesh({ name: def.name, color: def.color });
      
      if (!def.isFlagship) {
        spacecraft.group.scale.setScalar(0.72);
        spacecraft.radarBeam.material.opacity = 0.08;
      }

      rootGroup.add(spacecraft.group);

      satelliteOrbits.push({
        id: def.id,
        name: def.name,
        spacecraft,
        orbitPath,
        def: def,
        phase: def.phase
      });
    });
  }

  function loadTexture(loader, url, isColorTexture) {
    const texture = loader.load(url);
    if (isColorTexture && THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
    if (renderer && renderer.capabilities) {
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  function makeGlowTexture(hexColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    const color = new THREE.Color(hexColor);
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
    gradient.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, .75)`);
    gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, .15)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
    return texture;
  }

  function latLonToVector3(lat, lon, radius) {
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon + 180);

    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function attachInteraction(container) {
    const canvasEl = renderer.domElement;

    canvasEl.addEventListener('pointerdown', (event) => {
      interaction.dragging = true;
      interaction.pointerId = event.pointerId;
      interaction.lastX = event.clientX;
      interaction.lastY = event.clientY;
      canvasEl.setPointerCapture(event.pointerId);
      canvasEl.style.cursor = 'grabbing';
    });

    canvasEl.addEventListener('pointermove', (event) => {
      if (!interaction.dragging || event.pointerId !== interaction.pointerId) return;

      const deltaX = event.clientX - interaction.lastX;
      const deltaY = event.clientY - interaction.lastY;

      rotationTarget.y += deltaX * 0.007;
      rotationTarget.x = THREE.MathUtils.clamp(rotationTarget.x + deltaY * 0.005, -0.75, 0.75);
      interaction.lastX = event.clientX;
      interaction.lastY = event.clientY;
    });

    const finishDrag = (event) => {
      if (!interaction.dragging || event.pointerId !== interaction.pointerId) return;
      interaction.dragging = false;
      interaction.pointerId = null;
      canvasEl.style.cursor = 'grab';
      if (canvasEl.hasPointerCapture(event.pointerId)) canvasEl.releasePointerCapture(event.pointerId);
    };

    canvasEl.addEventListener('pointerup', finishDrag);
    canvasEl.addEventListener('pointercancel', finishDrag);

    canvasEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + e.deltaY * 0.15, 130, 360);
    }, { passive: false });
  }

  function watchContainerSize(container) {
    const resize = () => {
      if (!renderer || !camera) return;
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
  }

  function bindUIControls() {
    const btnIn = document.getElementById('orbit-zoom-in');
    const btnOut = document.getElementById('orbit-zoom-out');
    const btnReset = document.getElementById('orbit-reset-view');

    if (btnIn) btnIn.addEventListener('click', () => { camera.position.z = Math.max(130, camera.position.z - 25); });
    if (btnOut) btnOut.addEventListener('click', () => { camera.position.z = Math.min(360, camera.position.z + 25); });
    if (btnReset) btnReset.addEventListener('click', () => { camera.position.z = 195; rotationTarget.x = 0.22; rotationTarget.y = -0.6; });

    document.querySelectorAll('[data-orbit-toggle]').forEach(btn => {
      btn.addEventListener('click', function () {
        const key = this.dataset.orbitToggle;
        layers[key] = !layers[key];
        this.classList.toggle('is-active', layers[key]);
        const stateEl = this.querySelector('.toggle-state');
        if (stateEl) stateEl.textContent = layers[key] ? 'ON' : 'OFF';

        if (key === 'all_candidates') {
          satelliteOrbits.forEach(orb => {
            if (!orb.def.isFlagship) {
              orb.spacecraft.group.visible = layers[key];
              orb.orbitPath.visible = layers[key];
            }
          });
        }
      });
    });

    document.querySelectorAll('[data-track-select]').forEach(btn => {
      btn.addEventListener('click', function () {
        activeTrackId = this.dataset.trackSelect;
        document.querySelectorAll('[data-track-select]').forEach(b => b.classList.remove('is-active'));
        this.classList.add('is-active');
        updateTelemetryCard();
      });
    });
  }

  function updateTelemetryCard() {
    const orb = satelliteOrbits.find(s => s.id === activeTrackId) || satelliteOrbits[0];
    if (!orb || !orb.def) return;

    const nameEl = document.getElementById('orbit-track-name');
    const altEl = document.getElementById('orbit-track-alt');
    const incEl = document.getElementById('orbit-track-inc');
    const eccEl = document.getElementById('orbit-track-ecc');
    const epochEl = document.getElementById('orbit-track-epoch');

    if (nameEl) nameEl.textContent = orb.name;
    if (altEl) altEl.textContent = `${orb.def.alt_km} km`;
    if (incEl) incEl.textContent = `${orb.def.inc_deg}°`;
    if (eccEl) eccEl.textContent = `${orb.def.ecc}`;
    if (epochEl) epochEl.textContent = orb.def.epoch;
  }

  function animate(frameTime) {
    animationFrameId = requestAnimationFrame(animate);
    const deltaSeconds = Math.min((frameTime - lastFrameTime) / 1000, 0.05);
    const elapsedSeconds = frameTime / 1000;
    lastFrameTime = frameTime;

    if (!interaction.dragging) rotationTarget.y += AUTO_REVOLUTION_SPEED * deltaSeconds;
    rootGroup.rotation.x = THREE.MathUtils.damp(rootGroup.rotation.x, rotationTarget.x, 8, deltaSeconds);
    rootGroup.rotation.y = THREE.MathUtils.damp(rootGroup.rotation.y, rotationTarget.y, 6, deltaSeconds);

    if (cloudMesh) cloudMesh.rotation.y += CLOUD_DRIFT_SPEED * deltaSeconds;
    if (starField) starField.rotation.y += 0.0012 * deltaSeconds;

    telemetryPulses.forEach((pulse) => {
      const cycle = (Math.sin(elapsedSeconds * 2.5 + pulse.offset) + 1) * 0.5;
      const scale = 1 + cycle * (pulse.maxScale - 1);
      pulse.ring.scale.setScalar(scale);
      pulse.ring.material.opacity = (1 - cycle) * 0.75;
      pulse.halo.material.opacity = 0.4 + cycle * 0.45;
      pulse.halo.scale.setScalar(8 + cycle * 6);
    });

    // Spacecraft Motion on Criss-Crossing 3D Planes
    satelliteOrbits.forEach((orbit) => {
      const angle = elapsedSeconds * orbit.def.speed + orbit.phase;
      const pos3D = computeOrbitPoint3D(orbit.def.radius, orbit.def.inc_rad, orbit.def.raan_rad, angle);

      const sc = orbit.spacecraft;
      if (!sc || !sc.group) return;

      sc.group.position.copy(pos3D);
      sc.group.lookAt(0, 0, 0); // True Nadir pointing to Earth center

      if (sc.solarWings) {
        const solarPitch = Math.sin(elapsedSeconds * 0.4 + orbit.phase) * 0.35;
        sc.solarWings.forEach((wing) => { wing.rotation.x = solarPitch; });
      }

      if (sc.ionPlume) {
        const plumeFlicker = 1.0 + Math.sin(elapsedSeconds * 9.0 + orbit.phase) * 0.15;
        sc.ionPlume.scale.set(plumeFlicker, plumeFlicker * 1.1, 1);
        sc.ionPlume.material.opacity = 0.65 + Math.sin(elapsedSeconds * 7.5) * 0.25;
      }

      if (sc.navLeds) {
        const strobeTime = (elapsedSeconds * 1.5 + orbit.phase) % 1.0;
        const isStrobe = strobeTime < 0.12 || (strobeTime > 0.22 && strobeTime < 0.32);
        sc.navLeds.forEach((led) => { led.visible = isStrobe; });
      }

      if (sc.footprintRing) {
        const radarSweep = (Math.sin(elapsedSeconds * 2.6 + orbit.phase) + 1) * 0.5;
        sc.footprintRing.scale.setScalar(1.0 + radarSweep * 0.2);
        sc.footprintRing.material.opacity = 0.22 + (1 - radarSweep) * 0.45;
      }
    });

    renderer.render(scene, camera);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initGlobe, { once: true });
  } else {
    initGlobe();
  }
})();
