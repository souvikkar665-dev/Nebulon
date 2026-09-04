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
  let radarMode = 'weight';
  let mousePos = null;
  let contactPulse = 0;

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
      renderParametricConsole();
      renderComparisonMatrix();
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
        renderParametricConsole();
        renderComparisonMatrix();
      });
    });
  }

  function parseDopplerSeparation(value) {
    const match = String(value || '').replace(',', '').match(/[-+]?\d*\.?\d+/);
    return match ? Number(match[0]) : 0;
  }

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function getParametrics(opp) {
    const factors = opp.value_factors || {};
    const dopplerKHz = parseDopplerSeparation(opp.predicted_doppler_separation);
    const latency = Number(factors.latency_seconds) || 0;
    const independence = Number(factors.sensor_independence) || 0;
    const dopplerWeight = Number(factors.doppler_separation_weight) || 0;
    const infoGain = clamp(opp.expected_information_gain);
    const feasibility = clamp((Number(opp.station_feasibility) || 0) * 100);
    const latencyRisk = clamp((latency / 20) * 100);
    const pressure = clamp((infoGain * 0.36) + (dopplerWeight * 100 * 0.28) + (latencyRisk * 0.2) + ((100 - feasibility) * 0.16));
    const infoRate = latency > 0 ? infoGain / latency : infoGain;
    const discrimination = clamp((dopplerKHz / 5) * 60 + (dopplerWeight * 40));
    const confidenceLift = clamp(infoGain * 0.55 + independence * 100 * 0.45);
    return {
      dopplerKHz,
      latency,
      pressure,
      infoRate,
      discrimination,
      confidenceLift,
      latencyRisk,
      rf: clamp(dopplerWeight * 100),
      optical: clamp(independence * 100),
      timing: clamp(100 - latencyRisk)
    };
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function renderParametricConsole() {
    if (!selectedOpp) return;
    const metrics = getParametrics(selectedOpp);
    const pressureColor = metrics.pressure >= 75 ? 'var(--n-red)' : metrics.pressure >= 50 ? 'var(--n-amber)' : 'var(--n-cyan)';
    const dial = document.getElementById('observe-pressure-dial');
    if (dial) {
      const angle = metrics.pressure * 3.6;
      dial.style.background = `conic-gradient(${pressureColor} 0deg ${angle}deg, rgba(255, 255, 255, 0.08) ${angle}deg 360deg)`;
      dial.style.boxShadow = `0 0 24px ${pressureColor}, inset 0 0 12px rgba(0, 0, 0, 0.5)`;
    }
    setText('observe-pressure-index', metrics.pressure.toFixed(0));
    setText('observe-pressure-label', metrics.pressure >= 75 ? 'CRITICAL WINDOW' : metrics.pressure >= 50 ? 'HIGH LEVERAGE' : 'STABLE WINDOW');
    setText('observe-info-rate', `${metrics.infoRate.toFixed(1)}%/s`);
    setText('observe-doppler-index', `${metrics.discrimination.toFixed(0)}/100`);
    setText('observe-confidence-lift', `+${metrics.confidenceLift.toFixed(0)}%`);
    setText('observe-latency-risk', `${metrics.latencyRisk.toFixed(0)}%`);
    [['observe-signal-rf', 'observe-signal-rf-value', metrics.rf], ['observe-signal-optical', 'observe-signal-optical-value', metrics.optical], ['observe-signal-time', 'observe-signal-time-value', metrics.timing]].forEach(([barId, valueId, value]) => {
      const bar = document.getElementById(barId);
      if (bar) bar.style.width = `${value}%`;
      setText(valueId, `${value.toFixed(0)}%`);
    });
  }

  function renderComparisonMatrix() {
    const grid = document.getElementById('observe-comparison-grid');
    if (!grid || !opportunities.length) return;
    const maxInfo = Math.max(...opportunities.map(item => Number(item.expected_information_gain) || 0), 1);
    const maxDoppler = Math.max(...opportunities.map(item => getParametrics(item).dopplerKHz), 1);
    grid.innerHTML = opportunities.map((opp, index) => {
      const metrics = getParametrics(opp);
      const infoWidth = clamp((Number(opp.expected_information_gain) / maxInfo) * 100);
      const dopplerWidth = clamp((metrics.dopplerKHz / maxDoppler) * 100);
      return `<article class="observe-comparison-card ${selectedOpp && selectedOpp.id === opp.id ? 'is-selected' : ''}">
        <div class="observe-comparison-card__top"><strong>${opp.station_id}</strong><span class="observe-comparison-card__rank">RANK ${String(index + 1).padStart(2, '0')}</span></div>
        <div class="observe-comparison-card__metric"><span>INFO GAIN</span><strong>${opp.expected_information_gain}%</strong></div>
        <div class="observe-comparison-bar"><i style="width: ${infoWidth}%"></i></div>
        <div class="observe-comparison-card__metric"><span>DOPPLER FIELD</span><strong>${opp.predicted_doppler_separation}</strong></div>
        <div class="observe-comparison-bar"><i style="width: ${dopplerWidth}%"></i></div>
        <div class="observe-comparison-card__footer"><span>PRESSURE ${metrics.pressure.toFixed(0)}</span><span>${metrics.latency.toFixed(1)}s LATENCY</span></div>
      </article>`;
    }).join('');
    setText('observe-comparison-badge', `${opportunities.length} WINDOWS · NORMALIZED`);
  }

  function clamp01(v) {
    return Math.max(0.12, Math.min(1.0, Number(v) || 0));
  }

  function setupRadarCanvas() {
    if (!radarCanvas) return;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = radarCanvas.getBoundingClientRect();
      const size = rect.width || radarCanvas.parentElement.offsetWidth || 340;
      radarCanvas.width = size * dpr;
      radarCanvas.height = size * dpr;
    }

    window.addEventListener('resize', resize);
    resize();

    radarCanvas.addEventListener('mousemove', (e) => {
      const rect = radarCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const radius = Math.min(rect.width, rect.height) * 0.33;

      const angle = Math.atan2(my - cy, mx - cx);
      const az = ((angle * 180 / Math.PI + 90 + 360) % 360);
      const r = Math.hypot(mx - cx, my - cy) / radius;
      const rng = Math.min(100, Math.max(0, Math.round(r * 100)));
      const elev = Math.max(0, Math.min(90, Math.round((1 - r) * 90)));

      mousePos = { x: mx, y: my };
      setText('observe-radar-coords', `AZ: ${String(Math.round(az)).padStart(3, '0')}° · RNG: ${rng}% · EL: ${elev}°`);
    });

    radarCanvas.addEventListener('mouseleave', () => {
      mousePos = null;
      if (selectedOpp) {
        const az = selectedOpp.station_id.includes('Svalbard') ? '048' : (selectedOpp.station_id.includes('Hawaii') ? '132' : '228');
        setText('observe-radar-coords', `AZ: ${az}° · RNG: 68% · EL: ${selectedOpp.elevation_max_deg}°`);
      }
    });

    setupRadarControls();
  }

  function setupRadarControls() {
    const btnWeight = document.getElementById('observe-mode-weight');
    const btnSky = document.getElementById('observe-mode-skypass');
    if (btnWeight && btnSky) {
      btnWeight.addEventListener('click', () => {
        radarMode = 'weight';
        btnWeight.classList.add('is-active');
        btnSky.classList.remove('is-active');
      });
      btnSky.addEventListener('click', () => {
        radarMode = 'skypass';
        btnSky.classList.add('is-active');
        btnWeight.classList.remove('is-active');
      });
    }
  }

  function startRadarAnimation() {
    if (radarAnimId) cancelAnimationFrame(radarAnimId);

    function loop() {
      drawRadarScope();
      sweepAngle += 0.024;
      if (window.NebulonMotion && window.NebulonMotion.getMode() !== 'reduced') {
        radarAnimId = requestAnimationFrame(loop);
      }
    }
    loop();
  }

  function drawRadarScope() {
    if (!radarCtx || !radarCanvas || !selectedOpp) return;
    const rect = radarCanvas.getBoundingClientRect();
    const w = rect.width || 380;
    const h = rect.height || 380;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    radarCtx.save();
    radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
    radarCtx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.33; // Scope radius leaving margin for badges & compass bezel

    // 0. Ambient Holographic Background Glow
    const bgGrad = radarCtx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.3);
    bgGrad.addColorStop(0, 'rgba(0, 240, 255, 0.08)');
    bgGrad.addColorStop(0.65, 'rgba(2, 18, 44, 0.45)');
    bgGrad.addColorStop(1, 'rgba(1, 6, 18, 0.0)');
    radarCtx.fillStyle = bgGrad;
    radarCtx.beginPath();
    radarCtx.arc(cx, cy, radius * 1.3, 0, Math.PI * 2);
    radarCtx.fill();

    // 1. Outer Compass Bezel with 360° Azimuth Graduation
    const rBezel = radius * 1.15;
    const rBezelInner = radius * 1.03;

    // Outer and Inner Compass Rings
    radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
    radarCtx.lineWidth = 1.2;
    radarCtx.beginPath();
    radarCtx.arc(cx, cy, rBezel, 0, Math.PI * 2);
    radarCtx.stroke();

    radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
    radarCtx.lineWidth = 0.9;
    radarCtx.beginPath();
    radarCtx.arc(cx, cy, rBezelInner, 0, Math.PI * 2);
    radarCtx.stroke();

    // Radial Azimuth Graduation Ticks
    for (let deg = 0; deg < 360; deg += 2) {
      const rad = (deg - 90) * Math.PI / 180;
      const isMajor = deg % 30 === 0;
      const isMed = deg % 10 === 0;
      const tickLen = isMajor ? 6.5 : (isMed ? 4.2 : 2.2);
      const rStart = rBezel;
      const rEnd = rBezel - tickLen;

      const x1 = cx + Math.cos(rad) * rStart;
      const y1 = cy + Math.sin(rad) * rStart;
      const x2 = cx + Math.cos(rad) * rEnd;
      const y2 = cy + Math.sin(rad) * rEnd;

      radarCtx.beginPath();
      radarCtx.moveTo(x1, y1);
      radarCtx.lineTo(x2, y2);
      radarCtx.strokeStyle = isMajor ? '#00f0ff' : (isMed ? 'rgba(0, 240, 255, 0.65)' : 'rgba(0, 240, 255, 0.22)');
      radarCtx.lineWidth = isMajor ? 1.4 : 0.8;
      radarCtx.stroke();

      // Degree Numbers every 30°
      if (isMajor && deg % 30 === 0 && deg !== 0 && deg !== 90 && deg !== 180 && deg !== 270) {
        const textR = rBezel + 9.5;
        const tx = cx + Math.cos(rad) * textR;
        const ty = cy + Math.sin(rad) * textR;
        radarCtx.font = '7.5px "DM Mono", monospace';
        radarCtx.fillStyle = 'rgba(0, 240, 255, 0.72)';
        radarCtx.textAlign = 'center';
        radarCtx.textBaseline = 'middle';
        radarCtx.fillText(String(deg).padStart(3, '0'), tx, ty);
      }
    }

    // Cardinal Points (N, E, S, W)
    radarCtx.font = 'bold 11px "DM Mono", monospace';
    radarCtx.textAlign = 'center';
    radarCtx.textBaseline = 'middle';

    // North
    radarCtx.fillStyle = '#ffffff';
    radarCtx.fillText('N', cx, cy - (rBezel + 10));
    radarCtx.font = '7px "DM Mono", monospace';
    radarCtx.fillStyle = 'rgba(0, 240, 255, 0.75)';
    radarCtx.fillText('360', cx, cy - (rBezel + 18));

    // East
    radarCtx.font = 'bold 10.5px "DM Mono", monospace';
    radarCtx.fillStyle = '#00f0ff';
    radarCtx.fillText('E', cx + (rBezel + 11), cy);

    // South
    radarCtx.fillText('S', cx, cy + (rBezel + 11));

    // West
    radarCtx.fillText('W', cx - (rBezel + 11), cy);

    // Slow Counter-Rotating Calibration Outer Ring
    radarCtx.save();
    radarCtx.translate(cx, cy);
    radarCtx.rotate(-sweepAngle * 0.12);
    radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
    radarCtx.setLineDash([3, 7]);
    radarCtx.lineWidth = 1.2;
    radarCtx.beginPath();
    radarCtx.arc(0, 0, rBezel + 6, 0, Math.PI * 2);
    radarCtx.stroke();
    radarCtx.restore();

    // 2. Concentric Tactical Range Rings & Calibrations
    const ringFractions = [0.25, 0.50, 0.75, 1.0];
    ringFractions.forEach((frac, idx) => {
      const r = radius * frac;
      radarCtx.beginPath();
      radarCtx.arc(cx, cy, r, 0, Math.PI * 2);
      radarCtx.strokeStyle = idx === 3 ? 'rgba(0, 240, 255, 0.55)' : 'rgba(0, 240, 255, 0.18)';
      radarCtx.lineWidth = idx === 3 ? 1.4 : 0.9;
      radarCtx.stroke();

      // Range Percentage Labels [25%], [50%], [75%], [100%]
      radarCtx.font = '7px "DM Mono", monospace';
      radarCtx.fillStyle = 'rgba(0, 240, 255, 0.65)';
      radarCtx.textAlign = 'center';
      radarCtx.textBaseline = 'bottom';
      radarCtx.fillText(`[${Math.round(frac * 100)}%]`, cx, cy - r - 2);
    });

    // Crosshairs (N-S, E-W)
    radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
    radarCtx.lineWidth = 0.9;
    radarCtx.beginPath();
    radarCtx.moveTo(cx - radius, cy);
    radarCtx.lineTo(cx + radius, cy);
    radarCtx.moveTo(cx, cy - radius);
    radarCtx.lineTo(cx + radius, cy);
    radarCtx.stroke();

    // Diagonal Spoke Guidelines
    radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    radarCtx.setLineDash([3, 3]);
    [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4].forEach(angle => {
      radarCtx.beginPath();
      radarCtx.moveTo(cx, cy);
      radarCtx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      radarCtx.stroke();
    });
    radarCtx.setLineDash([]);

    // 3. Phosphor Radar Sweep Beam with Decaying Luminous Persistence
    const trailSteps = 16;
    const trailArc = 0.65;
    for (let i = 0; i < trailSteps; i++) {
      const startA = sweepAngle - (trailArc * (i + 1) / trailSteps);
      const endA = sweepAngle - (trailArc * i / trailSteps);
      const alpha = (1 - (i / trailSteps)) * 0.25;

      radarCtx.beginPath();
      radarCtx.moveTo(cx, cy);
      radarCtx.arc(cx, cy, radius, startA, endA);
      radarCtx.closePath();
      radarCtx.fillStyle = `rgba(0, 240, 255, ${alpha.toFixed(3)})`;
      radarCtx.fill();
    }

    // Leading High-Energy Beam Line
    const leadX = cx + Math.cos(sweepAngle) * radius;
    const leadY = cy + Math.sin(sweepAngle) * radius;
    radarCtx.beginPath();
    radarCtx.moveTo(cx, cy);
    radarCtx.lineTo(leadX, leadY);
    radarCtx.strokeStyle = '#ffffff';
    radarCtx.lineWidth = 1.8;
    radarCtx.shadowColor = '#00f0ff';
    radarCtx.shadowBlur = 10;
    radarCtx.stroke();
    radarCtx.shadowBlur = 0;

    // 4. Target Satellite Contact Blip & Acquisition Reticle
    const opp = selectedOpp;
    const elev = Number(opp.elevation_max_deg) || 68.4;
    const rTgt = radius * (1 - elev / 90) * 0.92;
    const azDeg = opp.station_id.includes('Svalbard') ? 48 : (opp.station_id.includes('Hawaii') ? 132 : 228);
    const azRad = (azDeg - 90) * Math.PI / 180;
    const tgtX = cx + Math.cos(azRad) * rTgt;
    const tgtY = cy + Math.sin(azRad) * rTgt;

    const currentSweepNorm = ((sweepAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const azNorm = ((azRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const angleDiff = Math.abs(currentSweepNorm - azNorm);
    if (angleDiff < 0.12 || angleDiff > Math.PI * 2 - 0.12) {
      contactPulse = 1.0;
    } else {
      contactPulse = Math.max(0, contactPulse - 0.02);
    }

    // Draw Target Reticle
    radarCtx.save();
    radarCtx.translate(tgtX, tgtY);

    if (contactPulse > 0.05) {
      radarCtx.beginPath();
      radarCtx.arc(0, 0, 9 + (1 - contactPulse) * 14, 0, Math.PI * 2);
      radarCtx.strokeStyle = `rgba(0, 240, 255, ${contactPulse.toFixed(2)})`;
      radarCtx.lineWidth = 1.5;
      radarCtx.stroke();
    }

    radarCtx.rotate(sweepAngle * 0.6);
    radarCtx.strokeStyle = '#00f0ff';
    radarCtx.lineWidth = 1.4;
    const bSize = 7;
    // Top-Left
    radarCtx.beginPath(); radarCtx.moveTo(-bSize, -bSize + 3); radarCtx.lineTo(-bSize, -bSize); radarCtx.lineTo(-bSize + 3, -bSize); radarCtx.stroke();
    // Top-Right
    radarCtx.beginPath(); radarCtx.moveTo(bSize - 3, -bSize); radarCtx.lineTo(bSize, -bSize); radarCtx.lineTo(bSize, -bSize + 3); radarCtx.stroke();
    // Bottom-Left
    radarCtx.beginPath(); radarCtx.moveTo(-bSize, bSize - 3); radarCtx.lineTo(-bSize, bSize); radarCtx.lineTo(-bSize + 3, bSize); radarCtx.stroke();
    // Bottom-Right
    radarCtx.beginPath(); radarCtx.moveTo(bSize - 3, bSize); radarCtx.lineTo(bSize, bSize); radarCtx.lineTo(bSize, bSize - 3); radarCtx.stroke();

    radarCtx.rotate(-sweepAngle * 0.6);
    radarCtx.beginPath();
    radarCtx.arc(0, 0, 2.5, 0, Math.PI * 2);
    radarCtx.fillStyle = '#ffffff';
    radarCtx.shadowColor = '#00f0ff';
    radarCtx.shadowBlur = 8;
    radarCtx.fill();
    radarCtx.shadowBlur = 0;
    radarCtx.restore();

    // 5. Multi-Factor Decision Weight Matrix Polygon
    if (radarMode === 'weight') {
      const axes = [
        { label: 'INFO GAIN', val: clamp01(opp.expected_information_gain / 100), display: `${opp.expected_information_gain}%`, angle: -Math.PI / 2 },
        { label: 'FEASIBILITY', val: clamp01(opp.station_feasibility), display: `${Math.round(opp.station_feasibility * 100)}%`, angle: -Math.PI / 2 + (Math.PI * 2 / 5) },
        { label: 'DOPPLER SEP', val: clamp01(opp.value_factors.doppler_separation_weight), display: `${opp.predicted_doppler_separation}`, angle: -Math.PI / 2 + (Math.PI * 4 / 5) },
        { label: 'INDEPENDENCE', val: clamp01(opp.value_factors.sensor_independence), display: `${Math.round(opp.value_factors.sensor_independence * 100)}%`, angle: -Math.PI / 2 + (Math.PI * 6 / 5) },
        { label: 'LATENCY', val: clamp01(1 - (opp.value_factors.latency_seconds / 20)), display: `${Math.round((1 - opp.value_factors.latency_seconds / 20) * 100)}%`, angle: -Math.PI / 2 + (Math.PI * 8 / 5) }
      ];

      // Draw Spokes with Graduated Tick Marks
      axes.forEach(axis => {
        const axX = cx + Math.cos(axis.angle) * radius;
        const axY = cy + Math.sin(axis.angle) * radius;

        radarCtx.beginPath();
        radarCtx.moveTo(cx, cy);
        radarCtx.lineTo(axX, axY);
        radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.32)';
        radarCtx.lineWidth = 1;
        radarCtx.stroke();

        // Ticks along Spoke
        [0.25, 0.5, 0.75, 1.0].forEach(f => {
          const tx = cx + Math.cos(axis.angle) * (radius * f);
          const ty = cy + Math.sin(axis.angle) * (radius * f);
          const perp = axis.angle + Math.PI / 2;
          radarCtx.beginPath();
          radarCtx.moveTo(tx - Math.cos(perp) * 2.5, ty - Math.sin(perp) * 2.5);
          radarCtx.lineTo(tx + Math.cos(perp) * 2.5, ty + Math.sin(perp) * 2.5);
          radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
          radarCtx.lineWidth = 0.9;
          radarCtx.stroke();
        });
      });

      // Calculate Vertices
      const vertices = axes.map(axis => {
        const val = Math.max(0.14, Math.min(1.0, axis.val));
        const vx = cx + Math.cos(axis.angle) * (radius * val);
        const vy = cy + Math.sin(axis.angle) * (radius * val);
        return { x: vx, y: vy, axis };
      });

      // Draw Polygon Interior Fill (Cyan to Emerald Gradient)
      const polyGrad = radarCtx.createLinearGradient(cx, cy - radius, cx, cy + radius);
      polyGrad.addColorStop(0, 'rgba(0, 240, 255, 0.32)');
      polyGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.22)');
      polyGrad.addColorStop(1, 'rgba(0, 240, 255, 0.16)');

      radarCtx.beginPath();
      vertices.forEach((v, i) => {
        if (i === 0) radarCtx.moveTo(v.x, v.y);
        else radarCtx.lineTo(v.x, v.y);
      });
      radarCtx.closePath();
      radarCtx.fillStyle = polyGrad;
      radarCtx.fill();

      // Outer High-Energy Boundary Stroke with Neon Bloom
      radarCtx.strokeStyle = '#00f0ff';
      radarCtx.lineWidth = 2.0;
      radarCtx.shadowColor = '#00f0ff';
      radarCtx.shadowBlur = 9;
      radarCtx.stroke();
      radarCtx.shadowBlur = 0;

      // Concentric Inner Guideline Polygon (0.65 scale)
      radarCtx.beginPath();
      vertices.forEach((v, i) => {
        const ix = cx + (v.x - cx) * 0.65;
        const iy = cy + (v.y - cy) * 0.65;
        if (i === 0) radarCtx.moveTo(ix, iy);
        else radarCtx.lineTo(ix, iy);
      });
      radarCtx.closePath();
      radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.32)';
      radarCtx.lineWidth = 0.9;
      radarCtx.stroke();

      // Glowing Vertex Energy Nodes & Floating Badges
      vertices.forEach((v, idx) => {
        // Vertex Node Core & Pulse
        radarCtx.beginPath();
        radarCtx.arc(v.x, v.y, 3.2, 0, Math.PI * 2);
        radarCtx.fillStyle = '#ffffff';
        radarCtx.shadowColor = '#00f0ff';
        radarCtx.shadowBlur = 7;
        radarCtx.fill();
        radarCtx.shadowBlur = 0;

        radarCtx.beginPath();
        radarCtx.arc(v.x, v.y, 6.2, 0, Math.PI * 2);
        radarCtx.strokeStyle = '#00f0ff';
        radarCtx.lineWidth = 1.2;
        radarCtx.stroke();

        // Floating Telemetry Badges with Leader Lines
        const badgeAngle = v.axis.angle;
        const badgeDist = radius + 22;
        const bx = cx + Math.cos(badgeAngle) * badgeDist;
        const by = cy + Math.sin(badgeAngle) * badgeDist;

        // Stepped Leader Line
        radarCtx.beginPath();
        radarCtx.moveTo(v.x, v.y);
        radarCtx.lineTo(bx, by);
        radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
        radarCtx.lineWidth = 0.8;
        radarCtx.stroke();

        // Badge Container Box
        const text = `[${v.axis.label}: ${v.axis.display}]`;
        radarCtx.font = 'bold 8px "DM Mono", monospace';
        const textW = radarCtx.measureText(text).width + 10;
        const boxH = 17;
        const boxX = bx - textW / 2;
        const boxY = by - boxH / 2;

        radarCtx.fillStyle = 'rgba(2, 12, 32, 0.94)';
        radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
        radarCtx.lineWidth = 1;
        radarCtx.fillRect(boxX, boxY, textW, boxH);
        radarCtx.strokeRect(boxX, boxY, textW, boxH);

        radarCtx.fillStyle = '#00f0ff';
        radarCtx.textAlign = 'center';
        radarCtx.textBaseline = 'middle';
        radarCtx.fillText(text, bx, by + 0.5);
      });
    } else {
      // Tactical Sky Pass Mode: Draw Polar Horizon-to-Zenith Pass Arc
      radarCtx.beginPath();
      radarCtx.arc(cx, cy, radius * 0.85, azRad - 0.7, azRad + 0.7);
      radarCtx.strokeStyle = '#10b981';
      radarCtx.lineWidth = 2.2;
      radarCtx.setLineDash([4, 4]);
      radarCtx.stroke();
      radarCtx.setLineDash([]);

      radarCtx.fillStyle = '#10b981';
      radarCtx.font = 'bold 8.5px "DM Mono", monospace';
      radarCtx.textAlign = 'center';
      radarCtx.fillText(`POLAR ZENITH PASS ARC · ${opp.window}`, cx, cy + radius * 0.72);
    }

    // 6. Interactive Mouse Crosshair & Cursor Position
    if (mousePos) {
      radarCtx.beginPath();
      radarCtx.arc(mousePos.x, mousePos.y, 6, 0, Math.PI * 2);
      radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
      radarCtx.lineWidth = 1.2;
      radarCtx.stroke();

      radarCtx.beginPath();
      radarCtx.moveTo(mousePos.x - 9, mousePos.y);
      radarCtx.lineTo(mousePos.x + 9, mousePos.y);
      radarCtx.moveTo(mousePos.x, mousePos.y - 9);
      radarCtx.lineTo(mousePos.x, mousePos.y + 9);
      radarCtx.strokeStyle = '#ffffff';
      radarCtx.lineWidth = 1;
      radarCtx.stroke();
    }

    radarCtx.restore();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
