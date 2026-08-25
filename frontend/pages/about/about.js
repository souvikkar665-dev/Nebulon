/**
 * NEBULON PROTOCOL (ABOUT) CONTROLLER
 */

(function () {
  'use strict';

  function init() {
    setupChapterHighlights();
  }

  function setupChapterHighlights() {
    const cards = document.querySelectorAll('.about-pipeline-card');
    cards.forEach(c => {
      c.addEventListener('mouseenter', function () {
        this.style.borderColor = 'var(--n-cyan)';
      });
      c.addEventListener('mouseleave', function () {
        this.style.borderColor = 'var(--n-line)';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
