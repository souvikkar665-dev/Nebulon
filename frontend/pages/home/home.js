/**
 * NEBULON GATEWAY (HOME) — $500,000 ULTRA-FUTURISTIC JARVIS HOLOGRAPHIC CORE
 * Cinema-Grade 60fps Arc Reactor, Procedural Lightning Arcs, Multi-Tier Concentric HUD Rings,
 * Keplerian 3D Orbital Planes, Quantum Particle Vortex, 3D Parallax Tilt, and Audio Feedback.
 */

(function () {
  'use strict';

  // Mouse & Parallax State
  let mouseX = 0, mouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;
  let isOverclocked = false;
  let overclockTransition = 0; // 0 to 1 smooth blend

  // Web Audio Context for Procedural Sci-Fi HUD Sounds
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSciFiChirp(freq, duration, type) {
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq || 1200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime((freq || 1200) * 1.5, audioCtx.currentTime + duration);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  function playSciFiClick() {
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) { }
  }

  function init() {
    initJarvisHeroHolographicMatrix();
    startLiveTelemetryStream();
    setupInteractiveMouseParallax();
    setupGatewayControls();
    setupButtonInteractions();
  }

  // Gateway queue selection
  function setupGatewayControls() {
    const items = document.querySelectorAll('[data-gateway-focus]');
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        items.forEach(function (entry) { entry.classList.remove('is-selected'); });
        item.classList.add('is-selected');
        const target = item.getAttribute('data-gateway-focus');
        const announcer = document.getElementById('live-announcer');
        if (announcer) announcer.textContent = target === 'observe' ? 'Next sensor pass selected.' : 'Spacecraft identity investigation selected.';
        playSciFiChirp(980, 0.08, 'sine');
      });
    });
  }

  // High-Tech Buttons Overclock & Audio Triggers
  function setupButtonInteractions() {
    const buttons = document.querySelectorAll('.tech-btn, .btn-luxury-primary, .btn-luxury-secondary');
    buttons.forEach(function (btn) {
      btn.addEventListener('mouseenter', function () {
        isOverclocked = true;
        playSciFiChirp(1400, 0.09, 'sine');
      });
      btn.addEventListener('mouseleave', function () {
        isOverclocked = false;
      });
      btn.addEventListener('click', function () {
        playSciFiClick();
      });
    });
  }

  // Mouse Parallax & Target Tracking
  function setupInteractiveMouseParallax() {
    window.addEventListener('mousemove', function (e) {
      targetMouseX = (e.clientX - window.innerWidth / 2);
      targetMouseY = (e.clientY - window.innerHeight / 2);
    });
    // First user gesture initializes audio
    window.addEventListener('click', initAudio, { once: true });
  }

  // =========================================================================
  // $500,000 JARVIS HOLOGRAPHIC ARC REACTOR & TELEMETRY ENGINE
  // =========================================================================
  function initJarvisHeroHolographicMatrix() {
    const canvas = document.getElementById('home-hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let angle = 0;
    let pulsePhase = 0;
    let frameCount = 0;

    // Quantum Vortex Particles
    const NUM_PARTICLES = 120;
    const particles = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
      particles.push({
        dist: 40 + Math.random() * 320,
        theta: Math.random() * Math.PI * 2,
        speed: 0.004 + Math.random() * 0.012,
        size: 0.8 + Math.random() * 2.2,
        alpha: 0.2 + Math.random() * 0.7,
        color: Math.random() > 0.3 ? '#00f0ff' : (Math.random() > 0.5 ? '#ffffff' : '#a855f7')
      });
    }

    // Procedural Lightning Tendril Generator
    let lightningArcs = [];
    function generateLightningArcs(numArcs, maxRadius) {
      const arcs = [];
      for (let a = 0; a < numArcs; a++) {
        const startAngle = Math.random() * Math.PI * 2;
        const targetRadius = 38 + Math.random() * (maxRadius - 38);
        const segments = 6 + Math.floor(Math.random() * 5);
        const pts = [{ x: 0, y: 0 }];
        let curR = 0;
        let curA = startAngle;
        for (let s = 1; s <= segments; s++) {
          curR += targetRadius / segments;
          curA += (Math.random() - 0.5) * 0.35;
          pts.push({
            x: Math.cos(curA) * curR + (Math.random() - 0.5) * 6,
            y: Math.sin(curA) * curR + (Math.random() - 0.5) * 6
          });
        }
        arcs.push(pts);
      }
      return arcs;
    }

    function resize() {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    }

    function render() {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse damping & 3D tilt calculation
      mouseX += (targetMouseX - mouseX) * 0.06;
      mouseY += (targetMouseY - mouseY) * 0.06;

      // Overclock blend (accelerates rings and brightens core when hovering buttons)
      const targetOverclock = isOverclocked ? 1.0 : 0.0;
      overclockTransition += (targetOverclock - overclockTransition) * 0.08;

      const currentSpeedMultiplier = 1.0 + overclockTransition * 1.6;
      angle += 0.0038 * currentSpeedMultiplier;
      pulsePhase += 0.045 * currentSpeedMultiplier;

      // Position: Centered with subtle responsive 3D parallax
      const cx = width / 2 + mouseX * 0.035;
      const cy = height / 2 + mouseY * 0.035;
      const baseR = Math.min(width, height) * 0.44;

      // 3D Perspective Tilt Values
      const tiltX = (mouseY / height) * 0.18; // Pitch
      const tiltY = (mouseX / width) * -0.18; // Yaw

      ctx.save();
      ctx.translate(cx, cy);

      // Apply 3D perspective simulated shear/scale
      ctx.transform(1, tiltX * 0.25, tiltY * 0.25, 1, 0, 0);

      // -----------------------------------------------------------------------
      // LAYER 0: Ambient Core Volumetric Nebula & Radial Energy Flare
      // -----------------------------------------------------------------------
      const flareR = baseR * (1.1 + Math.sin(pulsePhase * 0.8) * 0.05 + overclockTransition * 0.15);
      const ambientGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, flareR);
      ambientGlow.addColorStop(0, 'rgba(0, 240, 255, 0.18)');
      ambientGlow.addColorStop(0.25, 'rgba(59, 130, 246, 0.10)');
      ambientGlow.addColorStop(0.55, 'rgba(168, 85, 247, 0.05)');
      ambientGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = ambientGlow;
      ctx.beginPath();
      ctx.arc(0, 0, flareR, 0, Math.PI * 2);
      ctx.fill();

      // -----------------------------------------------------------------------
      // LAYER 1: Interactive Laser Vector Targeting Line to Cursor
      // -----------------------------------------------------------------------
      const localMouseX = targetMouseX - mouseX * 0.035;
      const localMouseY = targetMouseY - mouseY * 0.035;
      const distToCursor = Math.hypot(localMouseX, localMouseY);
      const cursorAngle = Math.atan2(localMouseY, localMouseX);

      ctx.save();
      // Target Laser Beam with dual-line chromatic halo
      ctx.strokeStyle = overclockTransition > 0.5 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(0, 240, 255, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(localMouseX, localMouseY);
      ctx.stroke();

      // Secondary micro laser trace
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 12]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(localMouseX, localMouseY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dynamic Holographic Reticle at Cursor Target
      ctx.save();
      ctx.translate(localMouseX, localMouseY);
      ctx.rotate(angle * 3);

      // Rotating Outer Target Caliper
      ctx.strokeStyle = overclockTransition > 0.5 ? '#00f0ff' : 'rgba(0, 240, 255, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 16, Math.PI, Math.PI * 1.7);
      ctx.stroke();

      // Inner Reticle Crosshairs
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
      ctx.moveTo(0, -5); ctx.lineTo(0, 5);
      ctx.stroke();

      // Center Pinpoint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      // Real-time Telemetry Tag adjacent to cursor
      ctx.restore();
      ctx.save();
      ctx.font = '9px "Corpta", monospace';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
      const degReading = ((cursorAngle * 180 / Math.PI + 360) % 360).toFixed(1);
      const distKm = (distToCursor * 0.95).toFixed(0);
      ctx.fillText(`AZ:${degReading}° · R:${distKm}KM`, localMouseX + 22, localMouseY + 4);
      ctx.restore();

      ctx.restore();

      // -----------------------------------------------------------------------
      // LAYER 2: Quantum Vortex Particle Cloud (Swirling inward & orbiting)
      // -----------------------------------------------------------------------
      ctx.save();
      for (let i = 0; i < NUM_PARTICLES; i++) {
        const p = particles[i];
        p.theta += p.speed * currentSpeedMultiplier;
        p.dist -= 0.12 * currentSpeedMultiplier;
        if (p.dist < 28) {
          p.dist = baseR * (0.65 + Math.random() * 0.4);
          p.theta = Math.random() * Math.PI * 2;
        }
        const px = Math.cos(p.theta) * p.dist;
        const py = Math.sin(p.theta) * (p.dist * 0.58); // Keplerian inclination

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (0.4 + overclockTransition * 0.5);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // -----------------------------------------------------------------------
      // LAYER 3: Outer Keplerian Elliptical Orbit Tracks & Satellites (3D Planes)
      // -----------------------------------------------------------------------
      // Orbit Plane 1: Primary Satellite (Cyan Tracking Node)
      ctx.save();
      ctx.rotate(angle * 0.35);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.28)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.ellipse(0, 0, baseR * 0.98, baseR * 0.52, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Satellite 1 Position
      const sat1X = Math.cos(angle * 1.5) * (baseR * 0.98);
      const sat1Y = Math.sin(angle * 1.5) * (baseR * 0.52);

      // Trailing Orbit Ribbon
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let trail = 0; trail < 12; trail++) {
        const trAngle = angle * 1.5 - trail * 0.035;
        const tx = Math.cos(trAngle) * (baseR * 0.98);
        const ty = Math.sin(trAngle) * (baseR * 0.52);
        if (trail === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.stroke();

      // Satellite 1 Beacon
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(sat1X, sat1Y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Pulse Halo
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sat1X, sat1Y, 11 + Math.sin(pulsePhase * 2.2) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Orbit Plane 2: Counter-Inclined Secondary Satellite (Violet Node)
      ctx.save();
      ctx.rotate(-angle * 0.45 + Math.PI / 4);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.24)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 10]);
      ctx.beginPath();
      ctx.ellipse(0, 0, baseR * 0.88, baseR * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const sat2X = Math.cos(-angle * 1.1 + Math.PI) * (baseR * 0.88);
      const sat2Y = Math.sin(-angle * 1.1 + Math.PI) * (baseR * 0.42);

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(sat2X, sat2Y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sat2X, sat2Y, 9 + Math.cos(pulsePhase * 2) * 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // -----------------------------------------------------------------------
      // LAYER 4: Planetary Counter-Rotating Segmented Heavy Gear Ring
      // -----------------------------------------------------------------------
      ctx.save();
      ctx.rotate(angle * 0.7);
      const gearR = baseR * 0.74;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.42)';
      ctx.lineWidth = 2;
      const numTeeth = 36;
      for (let i = 0; i < numTeeth; i++) {
        const tAngle = (i * Math.PI * 2) / numTeeth;
        const tx1 = Math.cos(tAngle) * gearR;
        const ty1 = Math.sin(tAngle) * gearR;
        const isLongTooth = i % 3 === 0;
        const toothLen = isLongTooth ? 14 : 7;
        const tx2 = Math.cos(tAngle) * (gearR + toothLen);
        const ty2 = Math.sin(tAngle) * (gearR + toothLen);
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.stroke();

        // High-tech micro telemetry tick labels on gear
        if (isLongTooth && i % 6 === 0) {
          ctx.save();
          ctx.translate(tx2, ty2);
          ctx.rotate(tAngle + Math.PI / 2);
          ctx.font = '7px "Corpta", monospace';
          ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
          ctx.fillText(`0x${(i * 7).toString(16).toUpperCase()}`, -10, -4);
          ctx.restore();
        }
      }
      ctx.restore();

      // -----------------------------------------------------------------------
      // LAYER 5: Live Circular Audio / Oscilloscope Frequency Waveform Ring
      // -----------------------------------------------------------------------
      ctx.save();
      ctx.rotate(-angle * 1.1);
      const waveR = baseR * 0.62;
      ctx.strokeStyle = overclockTransition > 0.5 ? 'rgba(0, 240, 255, 0.85)' : 'rgba(0, 240, 255, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const waveSteps = 96;
      for (let w = 0; w <= waveSteps; w++) {
        const wAngle = (w * Math.PI * 2) / waveSteps;
        // Harmonic ripple simulation
        const harmonic = Math.sin(wAngle * 8 + pulsePhase * 2.5) * (3.5 + overclockTransition * 4) +
          Math.cos(wAngle * 16 - pulsePhase * 1.5) * 2;
        const curR = waveR + harmonic;
        const wx = Math.cos(wAngle) * curR;
        const wy = Math.sin(wAngle) * curR;
        if (w === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // -----------------------------------------------------------------------
      // LAYER 6: Vernier Degree Compass Dial with Cardinal Index Bars
      // -----------------------------------------------------------------------
      ctx.save();
      ctx.rotate(angle * 0.45);
      const compassR = baseR * 0.52;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.65)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, compassR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cardinal & 30-degree compass marks
      const compassTicks = 24;
      for (let c = 0; c < compassTicks; c++) {
        const cAngle = (c * Math.PI * 2) / compassTicks;
        const isCardinal = c % 6 === 0;
        const tLen = isCardinal ? 16 : 8;
        const cx1 = Math.cos(cAngle) * (compassR - tLen / 2);
        const cy1 = Math.sin(cAngle) * (compassR - tLen / 2);
        const cx2 = Math.cos(cAngle) * (compassR + tLen / 2);
        const cy2 = Math.sin(cAngle) * (compassR + tLen / 2);
        ctx.strokeStyle = isCardinal ? '#00f0ff' : 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = isCardinal ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.stroke();

        // Cardinal Degree Text
        if (isCardinal) {
          ctx.save();
          const deg = (c * 15).toString().padStart(3, '0');
          ctx.translate(cx2 * 1.12, cy2 * 1.12);
          ctx.rotate(cAngle + Math.PI / 2);
          ctx.font = '8px "Corpta", monospace';
          ctx.fillStyle = '#00f0ff';
          ctx.textAlign = 'center';
          ctx.fillText(`${deg}°`, 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();

      // -----------------------------------------------------------------------
      // LAYER 7: Segmented Inner Turbine Iris (High-Speed Rotation)
      // -----------------------------------------------------------------------
      ctx.save();
      ctx.rotate(angle * 2.8);
      const irisR = baseR * 0.32;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.4;
      const numBlades = 12;
      for (let b = 0; b < numBlades; b++) {
        const bAngle1 = (b * Math.PI * 2) / numBlades;
        const bAngle2 = bAngle1 + (Math.PI / numBlades) * 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, irisR, bAngle1, bAngle2);
        ctx.stroke();

        // Inner vent blade ribs
        const vx1 = Math.cos(bAngle1) * irisR;
        const vy1 = Math.sin(bAngle1) * irisR;
        const vx2 = Math.cos(bAngle1 + 0.15) * (irisR * 0.78);
        const vy2 = Math.sin(bAngle1 + 0.15) * (irisR * 0.78);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(vx1, vy1);
        ctx.lineTo(vx2, vy2);
        ctx.stroke();
      }
      ctx.restore();

      // -----------------------------------------------------------------------
      // LAYER 8: Rotating Hexagonal Containment Grid Cage
      // -----------------------------------------------------------------------
      ctx.save();
      ctx.rotate(-angle * 1.8);
      const hexR = baseR * 0.22;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let h = 0; h < 6; h++) {
        const hAngle = (h * Math.PI * 2) / 6;
        const hx = Math.cos(hAngle) * hexR;
        const hy = Math.sin(hAngle) * hexR;
        if (h === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // -----------------------------------------------------------------------
      // LAYER 9: Procedural Electrical Lightning Arcs (Singularity Discharge)
      // -----------------------------------------------------------------------
      if (frameCount % 4 === 0) {
        const numArcs = 3 + Math.floor(overclockTransition * 4);
        lightningArcs = generateLightningArcs(numArcs, baseR * 0.32);
      }
      ctx.save();
      for (let a = 0; a < lightningArcs.length; a++) {
        const arcPts = lightningArcs[a];
        ctx.strokeStyle = Math.random() > 0.4 ? '#ffffff' : '#00f0ff';
        ctx.lineWidth = 1.2 + Math.random() * 0.8;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let pt = 0; pt < arcPts.length; pt++) {
          if (pt === 0) ctx.moveTo(arcPts[pt].x, arcPts[pt].y);
          else ctx.lineTo(arcPts[pt].x, arcPts[pt].y);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.restore();

      // -----------------------------------------------------------------------
      // LAYER 10: Blinding White-Hot Plasma Singularity Core & Arc Corona
      // -----------------------------------------------------------------------
      const corePulse = Math.sin(pulsePhase * 1.8) * 8 + (overclockTransition * 14);
      const plasmaR = 42 + corePulse;

      // Outer Plasma Radial Gradient
      const plasmaGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, plasmaR * 3);
      plasmaGrad.addColorStop(0, '#ffffff');
      plasmaGrad.addColorStop(0.18, '#00f0ff');
      plasmaGrad.addColorStop(0.48, 'rgba(59, 130, 246, 0.6)');
      plasmaGrad.addColorStop(0.78, 'rgba(168, 85, 247, 0.25)');
      plasmaGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = plasmaGrad;
      ctx.beginPath();
      ctx.arc(0, 0, plasmaR * 3, 0, Math.PI * 2);
      ctx.fill();

      // Volumetric Cross Starburst Rays
      ctx.save();
      ctx.rotate(angle * 1.2);
      const starRayLen = plasmaR * 2.8;
      const rayGradH = ctx.createLinearGradient(-starRayLen, 0, starRayLen, 0);
      rayGradH.addColorStop(0, 'transparent');
      rayGradH.addColorStop(0.5, '#ffffff');
      rayGradH.addColorStop(1, 'transparent');
      ctx.fillStyle = rayGradH;
      ctx.fillRect(-starRayLen, -1.5, starRayLen * 2, 3);

      const rayGradV = ctx.createLinearGradient(0, -starRayLen, 0, starRayLen);
      rayGradV.addColorStop(0, 'transparent');
      rayGradV.addColorStop(0.5, '#ffffff');
      rayGradV.addColorStop(1, 'transparent');
      ctx.fillStyle = rayGradV;
      ctx.fillRect(-1.5, -starRayLen, 3, starRayLen * 2);
      ctx.restore();

      // Ultra Solid Singularity Core Beacon
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 28 + overclockTransition * 15;
      ctx.beginPath();
      ctx.arc(0, 0, 11 + (overclockTransition * 3), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore(); // Restore translate(cx, cy)

      if (window.NebulonMotion && window.NebulonMotion.getMode() !== 'reduced') {
        requestAnimationFrame(render);
      }
    }

    window.addEventListener('resize', resize);
    resize();
    render();
  }

  // Live Telemetry stream updates
  function startLiveTelemetryStream() {
    let t = 0;
    setInterval(function () {
      t += 1;
      const altEl = document.getElementById('hud-live-alt');
      const velEl = document.getElementById('hud-live-vel');
      const coordsEl = document.getElementById('hud-live-coords');

      if (altEl) {
        const alt = (418.6 + Math.sin(t * 0.1) * 0.4).toFixed(1);
        altEl.textContent = `${alt} KM`;
      }
      if (velEl) {
        const vel = (7.66 + Math.cos(t * 0.1) * 0.02).toFixed(2);
        velEl.textContent = `${vel} KM/S`;
      }
      if (coordsEl) {
        const lat = (24.18 + Math.sin(t * 0.05) * 1.2).toFixed(2);
        const lon = (78.45 + (t * 0.8) % 360).toFixed(2);
        coordsEl.textContent = `${Math.abs(lat)}° ${lat >= 0 ? 'N' : 'S'} · ${lon}° E`;
      }
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
