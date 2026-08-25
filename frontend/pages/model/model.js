/**
 * NEBULON INTELLIGENCE LAYER CONTROLLER
 */

(function () {
  'use strict';

  let meshCanvas, meshCtx;
  let meshNodes = [];

  function init() {
    meshCanvas = document.getElementById('model-mesh-canvas');
    if (meshCanvas) meshCtx = meshCanvas.getContext('2d');

    loadModelStatus();
    initNeuralMesh();
  }

  async function loadModelStatus() {
    if (!window.NebulonAPI) return;
    try {
      const data = await window.NebulonAPI.getModelStatus();
      renderPhysicsBaseline(data.physics_baseline);
      renderNeuralIntelligence(data.neural_intelligence);
    } catch (e) {
      console.error(e);
    }
  }

  function renderPhysicsBaseline(physics) {
    if (!physics) return;
    const body = document.getElementById('model-physics-body');
    if (!body) return;

    body.innerHTML = `
      <div class="model-metric-row">
        <span class="n-muted">Algorithm</span>
        <strong style="color: var(--n-cyan);">${physics.algorithm}</strong>
      </div>
      <div class="model-metric-row">
        <span class="n-muted">Covariance Gate</span>
        <strong>≤ ${physics.covariance_threshold_km} km residual</strong>
      </div>
      <div class="model-metric-row">
        <span class="n-muted">Doppler Tolerance</span>
        <strong>±${physics.doppler_tolerance_hz} Hz maximum</strong>
      </div>
      <div class="model-metric-row">
        <span class="n-muted">Active Contradiction Rules</span>
        <strong style="color: var(--n-green);">${physics.contradiction_rules_active} Rules Enforced</strong>
      </div>
      <div class="model-metric-row">
        <span class="n-muted">Status</span>
        <span class="n-chip n-chip--cyan">Deterministic Primary Arbiter</span>
      </div>
    `;
  }

  function renderNeuralIntelligence(neural) {
    if (!neural) return;
    const body = document.getElementById('model-neural-body');
    if (!body) return;

    body.innerHTML = `
      <div class="model-metric-row">
        <span class="n-muted">Architecture</span>
        <strong style="color: var(--n-violet);">${neural.model_name} (${neural.version})</strong>
      </div>
      <div class="model-metric-row">
        <span class="n-muted">Calibration Score</span>
        <strong style="color: var(--n-green);">${neural.calibration_score} (Well-Calibrated)</strong>
      </div>
      <div class="model-metric-row">
        <span class="n-muted">Training Corpus</span>
        <strong>${neural.training_window}</strong>
      </div>
      <div class="model-metric-row">
        <span class="n-muted">Inference Latency</span>
        <strong>${neural.inference_latency_ms} ms</strong>
      </div>
      <div class="model-metric-row">
        <span class="n-muted">Distribution State</span>
        <span class="n-chip ${neural.is_ood ? 'n-chip--amber' : 'n-chip--green'}">
          ${neural.is_ood ? '⚠ Out-of-Distribution' : '✓ In-Distribution Nominal'}
        </span>
      </div>
    `;
  }

  function initNeuralMesh() {
    if (!meshCanvas) return;
    function resize() {
      meshCanvas.width = meshCanvas.parentElement.offsetWidth;
      meshCanvas.height = meshCanvas.parentElement.offsetHeight;
      meshNodes = [];
      for (let i = 0; i < 28; i++) {
        meshNodes.push({
          x: Math.random() * meshCanvas.width,
          y: Math.random() * meshCanvas.height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          radius: Math.random() * 2.5 + 1.5,
          color: i % 3 === 0 ? '#62e8ff' : '#a276ff'
        });
      }
    }

    window.addEventListener('resize', resize);
    resize();

    function renderMesh() {
      meshCtx.clearRect(0, 0, meshCanvas.width, meshCanvas.height);

      // Draw Connections
      for (let i = 0; i < meshNodes.length; i++) {
        for (let j = i + 1; j < meshNodes.length; j++) {
          const dx = meshNodes[i].x - meshNodes[j].x;
          const dy = meshNodes[i].y - meshNodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 85) {
            meshCtx.strokeStyle = `rgba(162, 118, 255, ${0.35 * (1 - dist / 85)})`;
            meshCtx.lineWidth = 1;
            meshCtx.beginPath();
            meshCtx.moveTo(meshNodes[i].x, meshNodes[i].y);
            meshCtx.lineTo(meshNodes[j].x, meshNodes[j].y);
            meshCtx.stroke();
          }
        }
      }

      // Draw Nodes
      meshNodes.forEach(node => {
        meshCtx.fillStyle = node.color;
        meshCtx.beginPath();
        meshCtx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        meshCtx.fill();

        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > meshCanvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > meshCanvas.height) node.vy *= -1;
      });

      if (window.NebulonMotion && window.NebulonMotion.getMode() !== 'reduced') {
        requestAnimationFrame(renderMesh);
      }
    }

    renderMesh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
