/**
 * NEBULON MOTION & PERFORMANCE CONTROLLER
 * Full / Balanced performance mode management (No reduced mode).
 */

window.NebulonMotion = (function () {
  'use strict';

  const STORAGE_KEY = 'nebulon_motion_pref';
  const MODES = ['full', 'balanced'];
  let currentMode = 'full';

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && MODES.includes(saved)) {
      currentMode = saved;
    } else {
      currentMode = 'full';
    }

    applyMode(currentMode, false);
  }

  function applyMode(mode, save = true) {
    if (!MODES.includes(mode)) {
      mode = 'full';
    }
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
    const nextIndex = (MODES.indexOf(currentMode) + 1) % MODES.length;
    applyMode(MODES[nextIndex], true);
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
