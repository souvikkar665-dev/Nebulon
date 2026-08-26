/**
 * NEBULON APP SHELL — NASA 2070 / JARVIS MISSION CONTROL ORCHESTRATOR
 */

window.NebulonApp = (function () {
  'use strict';

  let currentRoute = 'home';
  let timelineValue = 100;
  let isReplay = false;
  let metSeconds = 15502; // Mission Elapsed Time simulation in seconds

  const ROUTES = [
    { id: 'home', label: 'Gateway', href: 'index.html' },
    { id: 'investigate', label: 'Investigate', href: 'investigate.html' },
    { id: 'orbit', label: 'Orbit', href: 'orbit.html' },
    { id: 'solar', label: 'Solar', href: 'solar.html' },
    { id: 'observe', label: 'Observe', href: 'observe.html' },
    { id: 'evidence', label: 'Evidence', href: 'evidence.html' },
    { id: 'model', label: 'Model', href: 'model.html' },
    { id: 'review', label: 'Review', href: 'review.html' },
    { id: 'about', label: 'Protocol', href: 'about.html' }
  ];

  function init() {
    // 2-Step Verification Route Guard
    if (window.NebulonAuth && typeof window.NebulonAuth.enforceRouteGuard === 'function') {
      window.NebulonAuth.enforceRouteGuard();
    }

    currentRoute = document.body.dataset.page || 'home';
    if (window.NebulonMotion) window.NebulonMotion.init();
    renderBackgroundElements();
    renderNavbar();
    renderMissionDrawer();
    setupShortcuts();
    initStarfield();
    startClockAndMet();

    // Initialize Subsystems
    if (window.NebulonVideo) window.NebulonVideo.init();
    if (window.NebulonStream) window.NebulonStream.init();

    // Toast Container
    if (!document.getElementById('n-toast-container')) {
      const tc = document.createElement('div');
      tc.id = 'n-toast-container';
      document.body.appendChild(tc);
    }
  }

  function renderBackgroundElements() {
    const bgContainer = document.getElementById('site-background');
    if (!bgContainer) return;
    bgContainer.innerHTML = `
      <canvas id="starfield-canvas"></canvas>
      <div class="ambient-grid"></div>
      <div class="aurora-bg aurora-bg--1"></div>
      <div class="aurora-bg aurora-bg--2"></div>
    `;
  }

  function renderNavbar() {
    const nav = document.getElementById('nebula-navbar');
    if (!nav) return;

    const missionId = window.NebulonAPI ? window.NebulonAPI.getCurrentMissionId() : 'transporter-8-ambiguity';
    const missionName = missionId.includes('starlink') ? 'Starlink G6-12' : (missionId.includes('pslv') ? 'PSLV-C37 Swarm' : 'Transporter-8 SSO');

    nav.innerHTML = `
      <div class="nebula-navbar__inner">
        <!-- Left: Brand & Mission Switcher -->
        <div class="nebula-navbar__left">
          <a href="index.html" class="n-brand-link" aria-label="Nebulon Gateway">
            <div class="n-brand-mark">
              <svg viewBox="0 0 100 100" fill="none">
                <ellipse cx="50" cy="50" rx="42" ry="20" stroke="url(#nav-grad)" stroke-width="3" stroke-dasharray="4 2" transform="rotate(-30 50 50)" />
                <circle cx="50" cy="50" r="8" fill="#00f0ff" />
                <circle cx="80" cy="36" r="4" fill="#a855f7" />
                <defs>
                  <linearGradient id="nav-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#00f0ff"/>
                    <stop offset="100%" stop-color="#a855f7"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <div class="n-brand-title">NEBULON</div>
              <div class="n-brand-sub">ORBITAL IDENTITY // NASA 2070</div>
            </div>
          </a>

          <button type="button" class="n-mission-btn" id="n-mission-trigger" aria-haspopup="dialog" aria-expanded="false" title="Switch Mission Workspace">
            <span class="n-label-micro">MISSION:</span>
            <span class="n-mission-badge" id="n-active-mission-label">${missionName}</span>
            <span style="font-size: 0.65rem; color: var(--n-muted);">▾</span>
          </button>
        </div>

        <!-- Center: Navigation Rail -->
        <nav class="nebula-navbar__center" aria-label="Main Navigation">
          <div class="n-nav-rail" id="n-nav-rail">
            <div class="n-nav-indicator" id="n-nav-indicator"></div>
            ${ROUTES.map(r => `
              <a href="${r.href}" class="n-nav-link ${r.id === currentRoute ? 'is-active' : ''}" data-route="${r.id}">
                ${r.label}
              </a>
            `).join('')}
          </div>
        </nav>

        <!-- Right: Atomic Clock + Permanent Live Beacon + Actions -->
        <div class="nebula-navbar__right">
          <!-- Live UTC Atomic Clock & MET -->
          <div class="n-nav-clock-capsule">
            <div class="n-nav-clock-utc" id="n-live-utc-clock">00:00:00 UTC</div>
            <div class="n-nav-clock-met" id="n-live-met-clock">MET T+04:18:22</div>
          </div>

          <!-- Permanent Live Telemetry Stream Indicator -->
          <div class="n-pulse-badge" id="n-nav-pulse" title="Authoritative Live Telemetry Stream Active">
            <span class="n-live-dot"></span>
            <span id="n-nav-pulse-text">LIVE</span>
          </div>

          <a href="review.html" class="n-nav-review-badge" title="Unresolved Contradictions">
            <span>REVIEW</span>
            <span class="n-nav-review-badge__count" id="n-contradiction-count">1</span>
          </a>

          <!-- Active Operator Badge & Prominent Logout Button -->
          <div class="n-nav-member-badge" id="n-active-operator-badge" title="Authenticated Operator Profile">
            <span class="n-label-micro">OP:</span>
            <strong style="color: var(--n-cyan); font-size: 0.74rem;" id="n-active-operator-name">Souvik Kar</strong>
            <button type="button" class="n-nav-logout-btn" id="n-logout-btn" title="Log Out & Lock System">
              <span>LOGOUT</span>
              <span>⏻</span>
            </button>
          </div>

          <!-- Performance Mode Toggle: Full / Balanced Only -->
          <button type="button" class="n-perf-toggle" id="n-perf-btn" title="Toggle Performance Mode (Full / Balanced)">
            <span class="n-label-micro">PERF:</span>
            <strong data-perf-label>${window.NebulonMotion ? window.NebulonMotion.getMode().charAt(0).toUpperCase() + window.NebulonMotion.getMode().slice(1) : 'Full'}</strong>
          </button>

          <button type="button" class="n-mobile-menu-btn" id="n-mobile-toggle" aria-label="Open Navigation Menu">
            ☰
          </button>
        </div>
      </div>
    `;

    updateNavIndicator();
    setupNavHoverGlide();
    window.addEventListener('resize', () => updateNavIndicator());

    // Populate active operator name
    if (window.NebulonAuth) {
      const activeMember = window.NebulonAuth.getActiveMember();
      const opEl = document.getElementById('n-active-operator-name');
      if (opEl && activeMember) opEl.textContent = activeMember.name.split(' ')[0];

      const logoutBtn = document.getElementById('n-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
          window.NebulonAuth.logout();
        });
      }
    }

    // Bind Perf Toggle (Full / Balanced)
    const perfBtn = document.getElementById('n-perf-btn');
    if (perfBtn) {
      perfBtn.addEventListener('click', function () {
        if (window.NebulonMotion) {
          window.NebulonMotion.cycleMode();
        }
      });
    }

    // Bind Mission Selector Trigger
    document.getElementById('n-mission-trigger').addEventListener('click', toggleMissionDrawer);

    // Mobile Toggle
    document.getElementById('n-mobile-toggle').addEventListener('click', toggleMobileDrawer);
  }

  function startClockAndMet() {
    setInterval(function () {
      const d = new Date();
      const utcStr = d.toISOString().substring(11, 19) + ' UTC';
      const clockEl = document.getElementById('n-live-utc-clock');
      if (clockEl) clockEl.textContent = utcStr;

      metSeconds++;
      const hrs = String(Math.floor(metSeconds / 3600)).padStart(2, '0');
      const mins = String(Math.floor((metSeconds % 3600) / 60)).padStart(2, '0');
      const secs = String(metSeconds % 60).padStart(2, '0');
      const metEl = document.getElementById('n-live-met-clock');
      if (metEl) metEl.textContent = `MET T+${hrs}:${mins}:${secs}`;
    }, 1000);
  }

  function updateNavIndicator(targetElement) {
    const rail = document.getElementById('n-nav-rail');
    const targetLink = targetElement || document.querySelector('.n-nav-link.is-active') || document.querySelector('.n-nav-link');
    const indicator = document.getElementById('n-nav-indicator');
    if (!rail || !targetLink || !indicator) return;

    const railRect = rail.getBoundingClientRect();
    const linkRect = targetLink.getBoundingClientRect();

    if (linkRect.width === 0) return; // Prevent zero-width calculation before layout

    const left = linkRect.left - railRect.left;
    const width = linkRect.width;

    indicator.style.left = `${left}px`;
    indicator.style.width = `${width}px`;
  }

  function setupNavHoverGlide() {
    const rail = document.getElementById('n-nav-rail');
    if (!rail) return;

    const links = rail.querySelectorAll('.n-nav-link');
    links.forEach(link => {
      link.addEventListener('mouseenter', function () {
        updateNavIndicator(this);
      });
    });

    rail.addEventListener('mouseleave', function () {
      updateNavIndicator();
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => updateNavIndicator());
    }
  }

  function setupTimelineScrubber() {
    const input = document.getElementById('n-timeline-input');
    const fill = document.getElementById('n-slider-fill');
    const thumb = document.getElementById('n-slider-thumb');
    const modeEl = document.querySelector('[data-time-mode]');
    const timeEl = document.querySelector('[data-time-value]');
    const pulseEl = document.getElementById('n-nav-pulse');
    const pulseText = document.getElementById('n-nav-pulse-text');

    if (!input) return;

    input.addEventListener('input', function (e) {
      const val = Number(e.target.value);
      timelineValue = val;
      if (fill) fill.style.width = `${val}%`;
      if (thumb) thumb.style.left = `${val}%`;

      if (val >= 98) {
        isReplay = false;
        if (modeEl) modeEl.textContent = 'LIVE';
        if (timeEl) timeEl.textContent = '2026-08-25 14:22:10 UTC';
        if (pulseEl) {
          pulseEl.className = 'n-pulse-badge';
          if (pulseText) pulseText.textContent = 'LIVE';
        }
      } else {
        isReplay = true;
        const minsAgo = Math.round((100 - val) * 2.4);
        if (modeEl) modeEl.textContent = 'REPLAY';
        if (timeEl) timeEl.textContent = `-${minsAgo}m / 2026-08-25 ${formatHistoricalTime(minsAgo)}`;
        if (pulseEl) {
          pulseEl.className = 'n-pulse-badge is-replay';
          if (pulseText) pulseText.textContent = 'REPLAY';
        }
      }

      window.dispatchEvent(new CustomEvent('nebulon:timeline-scrub', { detail: { value: val, isReplay: isReplay } }));
    });
  }

  function formatHistoricalTime(minsAgo) {
    const d = new Date(Date.now() - minsAgo * 60000);
    return d.toISOString().substring(11, 19) + ' UTC';
  }

  function renderMissionDrawer() {
    if (document.getElementById('n-mission-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'n-mission-drawer';
    drawer.innerHTML = `
      <div class="n-modal-backdrop" id="n-drawer-backdrop"></div>
      <div class="n-drawer" id="n-drawer-panel">
        <div class="n-drawer__head">
          <div>
            <span class="n-kicker">MISSION SELECTION</span>
            <h3 style="margin-top: 2px;">Active Investigation Workspaces</h3>
          </div>
          <button type="button" class="n-drawer__close-btn" id="n-drawer-close" aria-label="Close Drawer">✕</button>
        </div>
        <div class="n-drawer__body">
          <!-- Active Operator Profile & Logout -->
          <div style="padding: 12px 16px; background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.35); border-radius: var(--n-radius-sm); margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span class="n-label-micro" style="color: var(--n-red);">SESSION ACTIVE</span>
              <div style="font-family: var(--n-font-display); font-weight: 700; color: #ffffff;" id="n-drawer-operator-name">Souvik Kar</div>
            </div>
            <button type="button" class="n-btn n-btn--danger n-btn--sm" id="n-drawer-logout-btn">
              LOG OUT ⏻
            </button>
          </div>

          <p class="n-muted" style="margin-bottom: 1.25rem;">
            Select an orbital launch cluster ambiguity to investigate real Doppler separation, observation opportunities, and identity convergence.
          </p>

          <div style="display: flex; flex-direction: column; gap: 12px;" id="n-mission-list">
            <!-- Mission Cards inserted dynamically -->
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);

    document.getElementById('n-drawer-backdrop').addEventListener('click', closeMissionDrawer);
    document.getElementById('n-drawer-close').addEventListener('click', closeMissionDrawer);

    // Bind Drawer Logout
    const drawerLogout = document.getElementById('n-drawer-logout-btn');
    if (drawerLogout && window.NebulonAuth) {
      drawerLogout.addEventListener('click', function () {
        window.NebulonAuth.logout();
      });
    }

    if (window.NebulonAuth) {
      const activeMember = window.NebulonAuth.getActiveMember();
      const drawerOp = document.getElementById('n-drawer-operator-name');
      if (drawerOp && activeMember) drawerOp.textContent = activeMember.name;
    }

    populateMissionCards();
  }

  async function populateMissionCards() {
    const list = document.getElementById('n-mission-list');
    if (!list || !window.NebulonAPI) return;

    const missions = await window.NebulonAPI.getMissionEvents();
    const activeId = window.NebulonAPI.getCurrentMissionId();

    list.innerHTML = missions.map(m => `
      <div class="n-panel n-panel--strong ${m.id === activeId ? 'n-panel--tech' : ''}" style="padding: 16px; cursor: pointer; border-color: ${m.id === activeId ? 'var(--n-cyan)' : 'var(--n-line)'};" data-select-mission="${m.id}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
          <strong style="font-family: var(--n-font-display); font-size: 0.95rem; color: var(--n-text);">${m.name}</strong>
          <span class="n-chip ${m.id === activeId ? 'n-chip--cyan' : 'n-chip--amber'}">${m.is_historical ? 'HISTORICAL REPLAY' : 'ACTIVE'}</span>
        </div>
        <p style="font-size: 0.8rem; margin-bottom: 8px; color: var(--n-text-soft);">${m.summary}</p>
        <div style="display: flex; justify-content: space-between; font-family: var(--n-font-mono); font-size: 0.72rem; color: var(--n-muted);">
          <span>Target: <strong style="color: var(--n-cyan);">${m.target_spacecraft}</strong></span>
          <span>Tracked: ${m.objects_tracked} objects</span>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-select-mission]').forEach(el => {
      el.addEventListener('click', function () {
        const id = this.dataset.selectMission;
        window.NebulonAPI.setMissionId(id);
        const activeLabel = document.getElementById('n-active-mission-label');
        if (activeLabel) {
          activeLabel.textContent = id.includes('starlink') ? 'Starlink G6-12' : (id.includes('pslv') ? 'PSLV-C37 Swarm' : 'Transporter-8 SSO');
        }
        closeMissionDrawer();
        showToast('Mission Workspace Switched', `Active workspace loaded: ${id}`, 'info');
        window.dispatchEvent(new CustomEvent('nebulon:mission-changed', { detail: { mission_id: id } }));
      });
    });
  }

  function toggleMissionDrawer() {
    const backdrop = document.getElementById('n-drawer-backdrop');
    const panel = document.getElementById('n-drawer-panel');
    if (!backdrop || !panel) return;

    backdrop.classList.toggle('is-active');
    panel.classList.toggle('is-open');
  }

  function closeMissionDrawer() {
    const backdrop = document.getElementById('n-drawer-backdrop');
    const panel = document.getElementById('n-drawer-panel');
    if (backdrop) backdrop.classList.remove('is-active');
    if (panel) panel.classList.remove('is-open');
  }

  function toggleMobileDrawer() {
    toggleMissionDrawer();
  }

  function showToast(title, message, type = 'info') {
    const container = document.getElementById('n-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'n-toast';
    const icon = type === 'success' ? '✓' : (type === 'error' ? '⚠' : '⌁');
    const iconColor = type === 'success' ? 'var(--n-green)' : (type === 'error' ? 'var(--n-red)' : 'var(--n-cyan)');

    toast.innerHTML = `
      <span class="n-toast__icon" style="color: ${iconColor}; font-weight: bold;">${icon}</span>
      <div class="n-toast__body">
        <div class="n-toast__title">${window.NebulonFormatters ? window.NebulonFormatters.escapeHtml(title) : title}</div>
        <div class="n-toast__msg">${window.NebulonFormatters ? window.NebulonFormatters.escapeHtml(message) : message}</div>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  function announce(msg) {
    const announcer = document.getElementById('live-announcer');
    if (announcer) {
      announcer.textContent = msg;
    }
  }

  function setupShortcuts() {
    window.addEventListener('keydown', function (e) {
      if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;

      if (e.key === '?') {
        showToast('Keyboard Shortcuts', '1-8: Switch Pages | M: Mission Drawer | L: Jump Live | Space: Play/Pause', 'info');
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMissionDrawer();
      } else if (e.key === 'l' || e.key === 'L') {
        const input = document.getElementById('n-timeline-input');
        if (input) {
          input.value = 100;
          input.dispatchEvent(new Event('input'));
          showToast('Timeline Sync', 'Returned to latest LIVE telemetry.', 'info');
        }
      } else if (e.key >= '1' && e.key <= '8') {
        const idx = Number(e.key) - 1;
        if (ROUTES[idx]) {
          window.location.href = ROUTES[idx].href;
        }
      }
    });
  }

  function initStarfield() {
    const canvas = document.getElementById('starfield-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, stars = [];

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      stars = [];
      const count = Math.floor((width * height) / 7500);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.3 + 0.4,
          alpha: Math.random() * 0.75 + 0.25,
          speed: Math.random() * 0.15 + 0.03
        });
      }
    }

    function render() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';

      stars.forEach(star => {
        ctx.globalAlpha = star.alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        star.y -= star.speed;
        if (star.y < 0) {
          star.y = height;
          star.x = Math.random() * width;
        }
      });

      if (window.NebulonMotion && window.NebulonMotion.getMode() !== 'reduced') {
        requestAnimationFrame(render);
      }
    }

    window.addEventListener('resize', resize);
    resize();
    render();
  }

  // Self-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init: init,
    showToast: showToast,
    announce: announce,
    toggleMissionDrawer: toggleMissionDrawer
  };
})();
