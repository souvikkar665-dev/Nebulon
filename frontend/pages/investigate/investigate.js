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
      renderGraph();
      renderHypotheses();
      renderEvidenceDrawer();
      renderAccessibleTable();
      initSpectrumCanvas();
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

  function renderGraph() {
    const svgContainer = document.getElementById('inv-svg-container');
    if (!svgContainer || !workspaceData) return;

    // Tactical HUD Node Positioning with Dedicated Badge Offsets (Collision-Free)
    const nodes = [
      { id: 'craft-aurora', label: 'TARGET: Aurora-1 (6U)', type: 'craft', x: 420, y: 105, r: 20, fill: '#00f0ff', badgeOffsetY: -36, badgeW: 160 },
      { id: 'obs-204', label: 'OBS-204 (SatNOGS RF)', type: 'obs', x: 130, y: 155, r: 14, fill: '#10b981', badgeOffsetY: -28, badgeW: 150 },
      { id: 'obs-229', label: 'OBS-229 (Doppler Track)', type: 'obs', x: 710, y: 155, r: 14, fill: '#10b981', badgeOffsetY: -28, badgeW: 165 },
      { id: 'obj-56987', label: 'NORAD 56987 (Obj C)', type: 'object', x: 235, y: 295, r: 17, fill: '#3b82f6', badgeOffsetY: 38, badgeW: 155 },
      { id: 'obj-56983', label: 'NORAD 56983 (Obj A)', type: 'object', x: 420, y: 395, r: 17, fill: '#f59e0b', badgeOffsetY: 38, badgeW: 155 },
      { id: 'obj-56991', label: 'NORAD 56991 (Obj G)', type: 'object', x: 605, y: 295, r: 17, fill: '#f43f5e', badgeOffsetY: 38, badgeW: 155 },
      { id: 'gs-142', label: 'GS-142 Svalbard Ground Station', type: 'station', x: 165, y: 455, r: 13, fill: '#a855f7', badgeOffsetY: 26, badgeW: 205 }
    ];

    const edges = [
      { id: 'e1', from: 'craft-aurora', to: 'obj-56987', kind: 'supporting', strokeWidth: 3, dur: '3.2s' },
      { id: 'e2', from: 'craft-aurora', to: 'obj-56983', kind: 'conflict', strokeWidth: 2.5, dur: '2.8s' },
      { id: 'e3', from: 'craft-aurora', to: 'obj-56991', kind: 'conflict', strokeWidth: 2, dur: '3.6s' },
      { id: 'e4', from: 'obs-204', to: 'obj-56987', kind: 'supporting', strokeWidth: 2, dur: '2.5s' },
      { id: 'e5', from: 'obs-229', to: 'obj-56987', kind: 'supporting', strokeWidth: 2.5, dur: '3.0s' },
      { id: 'e6', from: 'gs-142', to: 'obj-56987', kind: 'supporting', strokeWidth: 1.8, dur: '2.2s' },
      { id: 'e7', from: 'obs-229', to: 'obj-56983', kind: 'conflict', strokeWidth: 2, dur: '2.7s' }
    ];

    let svgHtml = `
      <svg class="investigate-svg" viewBox="0 0 840 520" preserveAspectRatio="xMidYMid meet">
        <defs>
          <!-- Holographic Glow Filters -->
          <filter id="hud-glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hud-glow-amber" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hud-glow-red" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <!-- Gradients -->
          <linearGradient id="edge-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00f0ff" />
            <stop offset="100%" stop-color="#3b82f6" />
          </linearGradient>
          <linearGradient id="edge-red-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#f43f5e" />
          </linearGradient>
        </defs>

        <!-- NASA 2070 Tactical HUD Radar Compass Background -->
        <g class="hud-radar-bg" opacity="0.6">
          <circle cx="420" cy="260" r="100" class="hud-grid-ring" />
          <circle cx="420" cy="260" r="190" class="hud-grid-ring" />
          <circle cx="420" cy="260" r="280" class="hud-grid-ring" />
          <circle cx="420" cy="260" r="370" class="hud-grid-ring" />
          <line x1="50" y1="260" x2="790" y2="260" class="hud-grid-axis" />
          <line x1="420" y1="20" x2="420" y2="500" class="hud-grid-axis" />
          <line x1="160" y1="50" x2="680" y2="470" class="hud-grid-axis" stroke-dasharray="2 6" />
          <line x1="160" y1="470" x2="680" y2="50" class="hud-grid-axis" stroke-dasharray="2 6" />
          <!-- Crosshair Ticks -->
          <text x="428" y="32" font-family="'DM Mono', monospace" font-size="9" fill="#00f0ff" opacity="0.5">000° NORTH ZENITH</text>
          <text x="735" y="254" font-family="'DM Mono', monospace" font-size="9" fill="#00f0ff" opacity="0.5">090° EAST</text>
          <text x="428" y="495" font-family="'DM Mono', monospace" font-size="9" fill="#00f0ff" opacity="0.5">180° NADIR</text>
          <text x="56" y="254" font-family="'DM Mono', monospace" font-size="9" fill="#00f0ff" opacity="0.5">270° WEST</text>
        </g>

        <!-- Edges (Connecting Multi-Sensor Filaments) -->
        <g class="graph-edges">
          ${edges.map(e => {
            const n1 = nodes.find(n => n.id === e.from);
            const n2 = nodes.find(n => n.id === e.to);
            if (!n1 || !n2) return '';
            const pathD = `M ${n1.x} ${n1.y} L ${n2.x} ${n2.y}`;
            const grad = e.kind === 'conflict' ? 'url(#edge-red-grad)' : 'url(#edge-cyan-grad)';
            return `
              <path id="${e.id}" d="${pathD}" 
                class="graph-edge ${e.kind === 'conflict' ? 'is-conflict' : 'is-supporting'}" 
                stroke="${grad}" stroke-width="${e.strokeWidth}" />

              <!-- Flowing Photon Pulse Along Edge -->
              <circle r="${e.kind === 'conflict' ? '3' : '3.5'}" fill="${e.kind === 'conflict' ? '#f43f5e' : '#00f0ff'}" filter="url(#hud-glow-cyan)">
                <animateMotion dur="${e.dur}" repeatCount="indefinite" path="${pathD}" />
              </circle>
            `;
          }).join('')}
        </g>

        <!-- Nodes (Jarvis Multi-Ring Holographic Beacons) -->
        <g class="graph-nodes">
          ${nodes.map(n => {
            const isSelected = selectedNodeId === n.id;
            const filterUrl = n.fill === '#f43f5e' ? 'url(#hud-glow-red)' : (n.fill === '#f59e0b' ? 'url(#hud-glow-amber)' : 'url(#hud-glow-cyan)');
            const badgeX = n.x - n.badgeW / 2;
            const badgeY = n.y + n.badgeOffsetY - 12;

            return `
              <g class="graph-node ${isSelected ? 'is-selected' : ''}" data-node-id="${n.id}">
                <!-- Outer Dashed Reticle Ring -->
                <circle cx="${n.x}" cy="${n.y}" r="${n.r + 9}" fill="none" stroke="${n.fill}" stroke-width="1.2" stroke-dasharray="3 3" opacity="${isSelected ? '0.9' : '0.4'}" class="node-target-ring" />
                
                <!-- Inner Pulse Aura -->
                <circle cx="${n.x}" cy="${n.y}" r="${n.r + 4}" fill="${n.fill}" opacity="0.15" />

                <!-- Solid Beacon Core -->
                <circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${n.fill}" filter="${filterUrl}" opacity="0.95" class="node-beacon" />
                <circle cx="${n.x}" cy="${n.y}" r="${n.r * 0.42}" fill="#ffffff" />

                <!-- Holographic Capsule Badge (Collision-Free Glass Pill) -->
                <g transform="translate(${badgeX}, ${badgeY})">
                  <rect x="0" y="0" width="${n.badgeW}" height="24" rx="12" ry="12" class="node-badge-bg" />
                  <circle cx="12" cy="12" r="3" fill="${n.fill}" />
                  <text x="22" y="15.5" class="node-badge-text">${n.label}</text>
                </g>
              </g>
            `;
          }).join('')}
        </g>
      </svg>
    `;

    svgContainer.innerHTML = svgHtml;

    // Attach Node Click Handlers
    svgContainer.querySelectorAll('[data-node-id]').forEach(el => {
      el.addEventListener('click', function () {
        const nodeId = this.dataset.nodeId;
        selectedNodeId = nodeId;
        playHudChirp(960, 'sine', 0.08);

        // If an object node was clicked, focus its hypothesis
        if (nodeId === 'obj-56987') selectedHypothesis = workspaceData.hypotheses[0];
        else if (nodeId === 'obj-56983') selectedHypothesis = workspaceData.hypotheses[1];
        else if (nodeId === 'obj-56991') selectedHypothesis = workspaceData.hypotheses[2];

        renderGraph();
        renderHypotheses();
        renderEvidenceDrawer();
      });
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
