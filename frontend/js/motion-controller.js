/**
 * NEBULON MOTION & PERFORMANCE CONTROLLER
 * Full / Balanced / Reduced Motion performance tier management
 */

window.NebulonMotion = (function () {
  'use strict';

  const STORAGE_KEY = 'nebulon_motion_pref';
  let currentMode = 'full';

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ['full', 'balanced', 'reduced'].includes(saved)) {
      currentMode = saved;
    } else if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      currentMode = 'reduced';
    }

    applyMode(currentMode, false);
  }

  function applyMode(mode, save = true) {
    currentMode = mode;
    document.documentElement.setAttribute('data-motion', mode);
    if (save) {
      localStorage.setItem(STORAGE_KEY, mode);
    }

    // Update navbar label if element exists
    const label = document.querySelector('[data-perf-label]');
    if (label) {
      label.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    }

    // Notify Video Controller
    if (window.NebulonVideo && window.NebulonVideo.handleMotionChange) {
      window.NebulonVideo.handleMotionChange(mode);
    }

    // Announce to Screen Reader
    if (window.NebulonApp && window.NebulonApp.announce) {
      window.NebulonApp.announce(`Motion mode set to ${mode}`);
    }
  }

  function cycleMode() {
    const modes = ['full', 'balanced', 'reduced'];
    const nextIndex = (modes.indexOf(currentMode) + 1) % modes.length;
    applyMode(modes[nextIndex], true);
  }

  function getMode() {
    return currentMode;
  }

  return {
    init: init,
    applyMode: applyMode,
    cycleMode: cycleMode,
    getMode: getMode
  };
})();
