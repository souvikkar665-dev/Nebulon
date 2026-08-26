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
    if (successCount === ids.length) setInvestigationFeedStatus('LIVE / NASA TLE', true);
    else if (successCount > 0) setInvestigationFeedStatus(`PARTIAL / ${successCount} OF ${ids.length}`, true);
    else setInvestigationFeedStatus('FALLBACK / WORKSPACE DATA', false);
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
