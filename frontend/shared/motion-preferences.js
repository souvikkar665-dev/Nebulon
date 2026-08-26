/**
 * NEBULON MOTION PREFERENCES (SHARED)
 * Compliance: Full / Balanced Mode Toggle
 */

window.NebulonMotionPreferences = (function () {
  'use strict';

  function getMode() {
    return (window.NebulonMotion ? window.NebulonMotion.getMode() : 'full');
  }

  function setMode(mode) {
    if (window.NebulonMotion) {
      window.NebulonMotion.applyMode(mode);
    }
  }

  return {
    getMode: getMode,
    setMode: setMode,
    isReducedMotion: () => false
  };
})();
