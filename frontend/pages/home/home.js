/**
 * NEBULON GATEWAY (HOME) — NASA 2070 / JARVIS HOLOGRAPHIC LATTICE CONTROLLER
 */

(function () {
  'use strict';

  function init() {
    initHeroHolographicLattice();
    loadPulseStatus();
  }

  function initHeroHolographicLattice() {
    const canvas = document.getElementById('home-hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, angle = 0, pulsePhase = 0;

    function resize() {
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    }

    function render() {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const coreR = Math.min(width, height) * 0.38;

      ctx.save();
      ctx.translate(cx, cy);

      // 1. Jarvis Arc Reactor Glowing Plasma Center
      const plasmaR = 30 + Math.sin(pulsePhase) * 6;
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, plasmaR * 2.5);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#00f0ff');
      coreGrad.addColorStop(0.7, 'rgba(59, 130, 246, 0.4)');
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, plasmaR * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Solid Core Dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      // 2. Multi-Tier Concentric Segmented Jarvis HUD Rings
      // Ring 1: Inner High-Speed Turbine Segments (Clockwise)
      ctx.save();
      ctx.rotate(angle * 2.2);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      const numSegs1 = 8;
      for (let i = 0; i < numSegs1; i++) {
        ctx.beginPath();
        const a1 = (i * Math.PI * 2) / numSegs1;
        const a2 = a1 + (Math.PI / numSegs1) * 0.7;
        ctx.arc(0, 0, coreR * 0.28, a1, a2);
        ctx.stroke();
      }
      ctx.restore();

      // Ring 2: Counter-Rotating Middle Data Ring (Violet)
      ctx.save();
      ctx.rotate(-angle * 1.5);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, coreR * 0.52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Ring 3: Segmented Gear Ring with Laser Teeth
      ctx.save();
      ctx.rotate(angle * 0.8);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.5;
      const numTeeth = 24;
      for (let i = 0; i < numTeeth; i++) {
        const tAngle = (i * Math.PI * 2) / numTeeth;
        const tx1 = Math.cos(tAngle) * (coreR * 0.72);
        const ty1 = Math.sin(tAngle) * (coreR * 0.72);
        const tx2 = Math.cos(tAngle) * (coreR * 0.77);
        const ty2 = Math.sin(tAngle) * (coreR * 0.77);
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.stroke();
      }
      ctx.restore();

      // Ring 4: Outer Keplerian Elliptical Orbital Beacons
      ctx.save();
      ctx.rotate(angle * 0.5);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.ellipse(0, 0, coreR, coreR * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Orbiting Satellites on Outer Ring
      ctx.fillStyle = '#00f0ff';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#00f0ff';
      const sx1 = Math.cos(angle * 1.8) * coreR;
      const sy1 = Math.sin(angle * 1.8) * (coreR * 0.45);
      ctx.beginPath();
      ctx.arc(sx1, sy1, 5, 0, Math.PI * 2);
      ctx.fill();

      // Opposing Node
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      const sx2 = Math.cos(-angle * 1.4 + Math.PI) * coreR;
      const sy2 = Math.sin(-angle * 1.4 + Math.PI) * (coreR * 0.45);
      ctx.beginPath();
      ctx.arc(sx2, sy2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      ctx.restore();

      angle += 0.0035;
      pulsePhase += 0.045;

      if (window.NebulonMotion && window.NebulonMotion.getMode() !== 'reduced') {
        requestAnimationFrame(render);
      }
    }

    window.addEventListener('resize', resize);
    resize();
    render();
  }

  async function loadPulseStatus() {
    if (!window.NebulonAPI) return;
    try {
      const health = await window.NebulonAPI.getSourcesHealth();
      const el = document.getElementById('home-source-sync');
      if (el && health) {
        el.textContent = `${health.sources.length} Sources Synchronized`;
      }
    } catch (e) {
      console.warn(e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
