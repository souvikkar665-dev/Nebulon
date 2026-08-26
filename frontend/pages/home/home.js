/**
 * NEBULON GATEWAY (HOME) — $130,000 ULTRA-LUXURY JARVIS COCKPIT HUD CONTROLLER
 * High-Tech Interactive Holographic Arc Reactor, 60fps Laser Canvas, and Real-Time Telemetry Feeds.
 */

(function () {
  'use strict';

  let mouseX = 0, mouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;

  function init() {
    initJarvisHeroHolographicMatrix();
    startLiveTelemetryStream();
    setupInteractiveMouseParallax();
  }

  // 1. Mouse Parallax & Target Tracking Reticle
  function setupInteractiveMouseParallax() {
    window.addEventListener('mousemove', function (e) {
      targetMouseX = (e.clientX - window.innerWidth / 2);
      targetMouseY = (e.clientY - window.innerHeight / 2);
    });
  }

  // 2. 60fps Full-Screen Interactive Holographic Arc Reactor
  function initJarvisHeroHolographicMatrix() {
    const canvas = document.getElementById('home-hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let angle = 0, pulsePhase = 0;

    function resize() {
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse damping
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const cx = width / 2 + mouseX * 0.04;
      const cy = height / 2 + mouseY * 0.04;
      const coreR = Math.min(width, height) * 0.42;

      ctx.save();
      ctx.translate(cx, cy);

      // -------------------------------------------------------------
      // 1. Interactive Laser Targeting Beam from Center to Mouse
      // -------------------------------------------------------------
      const localMouseX = targetMouseX - mouseX * 0.04;
      const localMouseY = targetMouseY - mouseY * 0.04;

      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(localMouseX, localMouseY);
      ctx.stroke();

      // Mouse Reticle Ring
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(localMouseX, localMouseY, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(localMouseX, localMouseY, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // -------------------------------------------------------------
      // 2. Central Jarvis Arc Reactor Glowing Plasma Core
      // -------------------------------------------------------------
      const plasmaR = 36 + Math.sin(pulsePhase) * 8;
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, plasmaR * 3);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.2, '#00f0ff');
      coreGrad.addColorStop(0.6, 'rgba(59, 130, 246, 0.35)');
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, plasmaR * 3, 0, Math.PI * 2);
      ctx.fill();

      // Core Solid Center Beacon
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // -------------------------------------------------------------
      // 3. Multi-Tier Concentric Segmented Holographic HUD Rings
      // -------------------------------------------------------------

      // Ring 1: Inner Turbine Segments (Fast Clockwise)
      ctx.save();
      ctx.rotate(angle * 2.4);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      const numSegs1 = 8;
      for (let i = 0; i < numSegs1; i++) {
        ctx.beginPath();
        const a1 = (i * Math.PI * 2) / numSegs1;
        const a2 = a1 + (Math.PI / numSegs1) * 0.75;
        ctx.arc(0, 0, coreR * 0.26, a1, a2);
        ctx.stroke();
      }
      ctx.restore();

      // Ring 2: Counter-Rotating Data Ring with Laser Angle Indices
      ctx.save();
      ctx.rotate(-angle * 1.4);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.65)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, coreR * 0.48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cardinal Micro Degree Ticks (0°, 90°, 180°, 270°)
      const cardinalTicks = 12;
      for (let i = 0; i < cardinalTicks; i++) {
        const cAngle = (i * Math.PI * 2) / cardinalTicks;
        const x1 = Math.cos(cAngle) * (coreR * 0.45);
        const y1 = Math.sin(cAngle) * (coreR * 0.45);
        const x2 = Math.cos(cAngle) * (coreR * 0.51);
        const y2 = Math.sin(cAngle) * (coreR * 0.51);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
        ctx.stroke();
      }
      ctx.restore();

      // Ring 3: Segmented Gear Ring with Futuristic Laser Teeth
      ctx.save();
      ctx.rotate(angle * 0.75);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 1.8;
      const numTeeth = 32;
      for (let i = 0; i < numTeeth; i++) {
        const tAngle = (i * Math.PI * 2) / numTeeth;
        const tx1 = Math.cos(tAngle) * (coreR * 0.68);
        const ty1 = Math.sin(tAngle) * (coreR * 0.68);
        const tx2 = Math.cos(tAngle) * (coreR * 0.74);
        const ty2 = Math.sin(tAngle) * (coreR * 0.74);
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.stroke();
      }
      ctx.restore();

      // Ring 4: Outer Keplerian Elliptical Orbit Track with Live Satellites
      ctx.save();
      ctx.rotate(angle * 0.4);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([8, 14]);
      ctx.beginPath();
      ctx.ellipse(0, 0, coreR, coreR * 0.48, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Satellite 1 (Cyan Primary)
      const sx1 = Math.cos(angle * 1.6) * coreR;
      const sy1 = Math.sin(angle * 1.6) * (coreR * 0.48);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(sx1, sy1, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Satellite 1 Pulse Halo
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sx1, sy1, 10 + Math.sin(pulsePhase * 2) * 3, 0, Math.PI * 2);
      ctx.stroke();

      // Satellite 2 (Violet Secondary)
      const sx2 = Math.cos(-angle * 1.2 + Math.PI) * coreR;
      const sy2 = Math.sin(-angle * 1.2 + Math.PI) * (coreR * 0.48);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(sx2, sy2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      ctx.restore();

      angle += 0.0035;
      pulsePhase += 0.04;

      if (window.NebulonMotion && window.NebulonMotion.getMode() !== 'reduced') {
        requestAnimationFrame(render);
      }
    }

    window.addEventListener('resize', resize);
    resize();
    render();
  }

  // 3. Live Synchronized Telemetry Data Simulation
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
