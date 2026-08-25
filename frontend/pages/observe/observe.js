/**
 * NEBULON OBSERVATION FORGE — NASA 2070 / JARVIS TACTICAL TARGETING CONTROLLER
 */

(function () {
  'use strict';

  let opportunities = [];
  let selectedOpp = null;
  let radarCanvas, radarCtx;
  let radarAnimId;
  let sweepAngle = 0;

  function init() {
    radarCanvas = document.getElementById('observe-radar-canvas');
    if (radarCanvas) radarCtx = radarCanvas.getContext('2d');

    loadOpportunities();
    setupRadarCanvas();
  }

  async function loadOpportunities() {
    if (!window.NebulonAPI) return;
    try {
      const data = await window.NebulonAPI.getObservationOpportunities();
      opportunities = data;
      selectedOpp = data.find(o => o.is_recommended) || data[0];

      renderHeroRecommendation();
      renderOpportunitiesList();
      startRadarAnimation();
    } catch (e) {
      console.error(e);
    }
  }

  function renderHeroRecommendation() {
    const opp = selectedOpp;
    if (!opp) return;

    const hero = document.getElementById('observe-hero-container');
    if (!hero) return;

    hero.innerHTML = `
      <div class="observe-hero-card n-panel--tech">
        <div class="observe-hero-scanner"></div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div class="n-kicker">${opp.is_recommended ? 'TOP-RANKED TACTICAL RECOMMENDATION' : 'CANDIDATE GROUND PASS'}</div>
            <h2 style="font-size: 1.75rem; color: #ffffff; margin-top: 2px;">${opp.station_id}</h2>
            <div style="font-family: var(--n-font-mono); font-size: 0.825rem; color: var(--n-cyan); margin-top: 4px;">
              Pass Window: <strong>${opp.window}</strong> · Coordinates: ${opp.location}
            </div>
          </div>
          <div style="text-align: right;">
            <span class="n-chip n-chip--cyan" style="font-size: 0.85rem; padding: 6px 12px;">Info Gain: ${opp.expected_information_gain}%</span>
          </div>
        </div>

        <p class="n-body" style="margin-top: 1rem; color: var(--n-text-soft);">
          ${opp.reason}
        </p>

        <!-- NASA 2070 Metric Grid -->
        <div class="observe-metrics-grid">
          <div class="observe-metric-box n-crosshair">
            <span class="n-label-micro">Expected Info Gain</span>
            <div class="n-telemetry-val" style="color: var(--n-cyan);">${opp.expected_information_gain}%</div>
          </div>
          <div class="observe-metric-box n-crosshair">
            <span class="n-label-micro">Doppler Separation</span>
            <div class="n-telemetry-val" style="color: var(--n-green);">${opp.predicted_doppler_separation}</div>
          </div>
          <div class="observe-metric-box n-crosshair">
            <span class="n-label-micro">Station Feasibility</span>
            <div class="n-telemetry-val">${Math.round(opp.station_feasibility * 100)}%</div>
          </div>
          <div class="observe-metric-box n-crosshair">
            <span class="n-label-micro">Max Elevation Zenith</span>
            <div class="n-telemetry-val">${opp.elevation_max_deg}°</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-top: 1px solid var(--n-line); padding-top: 1.25rem;">
          <div style="font-family: var(--n-font-mono); font-size: 0.75rem; color: var(--n-muted);">
            Sensor Mode: <strong style="color: var(--n-text);">${opp.observation_type}</strong>
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="investigate.html" class="n-btn n-btn--secondary n-btn--sm">View in Graph</a>
            <a href="evidence.html" class="n-btn n-btn--primary n-btn--sm">Inspect Station Provenance →</a>
          </div>
        </div>
      </div>
    `;
  }

  function renderOpportunitiesList() {
    const list = document.getElementById('observe-opps-list');
    if (!list) return;

    list.innerHTML = opportunities.map(opp => {
      const isSelected = selectedOpp && selectedOpp.id === opp.id;
      return `
        <div class="n-panel observe-opp-card n-crosshair ${isSelected ? 'is-selected n-panel--tech' : ''}" data-opp-id="${opp.id}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div class="n-label-micro">#${opp.rank} · ${opp.window}</div>
              <h4 style="font-size: 1.1rem; color: var(--n-text); margin-top: 2px;">${opp.station_id}</h4>
            </div>
            <span class="n-chip ${opp.is_recommended ? 'n-chip--cyan' : 'n-chip--amber'}">
              ${opp.expected_information_gain}% Gain
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; font-family: var(--n-font-mono); font-size: 0.75rem; color: var(--n-muted); margin-top: 10px;">
            <span>Doppler Sep: <strong style="color: var(--n-cyan);">${opp.predicted_doppler_separation}</strong></span>
            <span>Feasibility: ${Math.round(opp.station_feasibility * 100)}%</span>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('[data-opp-id]').forEach(el => {
      el.addEventListener('click', function () {
        const id = this.dataset.oppId;
        selectedOpp = opportunities.find(o => o.id === id);
        renderHeroRecommendation();
        renderOpportunitiesList();
      });
    });
  }

  function setupRadarCanvas() {
    if (!radarCanvas) return;
    function resize() {
      radarCanvas.width = radarCanvas.parentElement.offsetWidth;
      radarCanvas.height = radarCanvas.parentElement.offsetWidth;
    }
    window.addEventListener('resize', resize);
    resize();
  }

  function startRadarAnimation() {
    if (radarAnimId) cancelAnimationFrame(radarAnimId);

    function loop() {
      drawRadarScope();
      sweepAngle += 0.025;
      if (window.NebulonMotion && window.NebulonMotion.getMode() !== 'reduced') {
        radarAnimId = requestAnimationFrame(loop);
      }
    }
    loop();
  }

  function drawRadarScope() {
    if (!radarCtx || !radarCanvas || !selectedOpp) return;
    const w = radarCanvas.width;
    const h = radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.40;

    radarCtx.clearRect(0, 0, w, h);

    // 1. Draw Tactical HUD Radar Circles & Crosshairs
    radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
    radarCtx.lineWidth = 1;

    [0.25, 0.5, 0.75, 1.0].forEach(r => {
      radarCtx.beginPath();
      radarCtx.arc(cx, cy, radius * r, 0, Math.PI * 2);
      radarCtx.stroke();
    });

    radarCtx.beginPath();
    radarCtx.moveTo(cx - radius, cy);
    radarCtx.lineTo(cx + radius, cy);
    radarCtx.moveTo(cx, cy - radius);
    radarCtx.lineTo(cx, cy + radius);
    radarCtx.stroke();

    // 2. Sweeping Radar Beam (Jarvis Radar Sweep)
    const sweepGrad = radarCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
    sweepGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');

    radarCtx.save();
    radarCtx.beginPath();
    radarCtx.moveTo(cx, cy);
    radarCtx.arc(cx, cy, radius, sweepAngle - 0.45, sweepAngle);
    radarCtx.closePath();
    radarCtx.fillStyle = 'rgba(0, 240, 255, 0.12)';
    radarCtx.fill();
    radarCtx.restore();

    // 3. Multi-Axis Decision Polygon
    const axes = [
      { label: 'Info Gain', val: selectedOpp.expected_information_gain / 100 },
      { label: 'Feasibility', val: selectedOpp.station_feasibility },
      { label: 'Doppler Sep', val: selectedOpp.value_factors.doppler_separation_weight },
      { label: 'Independence', val: selectedOpp.value_factors.sensor_independence },
      { label: 'Latency Score', val: 1 - (selectedOpp.value_factors.latency_seconds / 20) }
    ];

    const numAxes = axes.length;
    const angleStep = (Math.PI * 2) / numAxes;

    // Draw Data Polygon
    radarCtx.beginPath();
    for (let i = 0; i < numAxes; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const val = Math.max(0.12, Math.min(1, axes[i].val));
      const x = cx + Math.cos(angle) * (radius * val);
      const y = cy + Math.sin(angle) * (radius * val);
      if (i === 0) radarCtx.moveTo(x, y);
      else radarCtx.lineTo(x, y);
    }
    radarCtx.closePath();

    radarCtx.fillStyle = 'rgba(0, 240, 255, 0.30)';
    radarCtx.fill();
    radarCtx.strokeStyle = '#00f0ff';
    radarCtx.lineWidth = 2;
    radarCtx.stroke();

    // Draw Spoke Labels
    radarCtx.font = '10px "DM Mono", monospace';
    radarCtx.fillStyle = '#b4c5e8';
    radarCtx.textAlign = 'center';

    for (let i = 0; i < numAxes; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const labelX = cx + Math.cos(angle) * (radius + 18);
      const labelY = cy + Math.sin(angle) * (radius + 18);
      radarCtx.fillText(axes[i].label, labelX, labelY);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
