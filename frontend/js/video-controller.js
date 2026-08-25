/**
 * NEBULON VIDEO CONTROLLER
 * IntersectionObserver playback management, fallback handling & reduced-motion policy
 */

window.NebulonVideo = (function () {
  'use strict';

  let observer = null;

  function init() {
    setupObserver();
    bindVideoSlots();
  }

  function setupObserver() {
    if (!('IntersectionObserver' in window)) return;

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const video = entry.target.querySelector('video');
        if (!video) return;

        if (entry.isIntersecting && !isReducedMotionActive()) {
          video.play().catch(function () {
            // Browser autoplay restrictions handled quietly
          });
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.15 });
  }

  function bindVideoSlots() {
    const slots = document.querySelectorAll('[data-video-slot]');
    slots.forEach(function (slot) {
      const video = slot.querySelector('video');
      if (!video) return;

      // Gracefully catch missing video files without breaking layout
      video.addEventListener('error', function () {
        slot.classList.add('has-error');
      });

      // Observe visibility
      if (observer) {
        observer.observe(slot);
      }
    });
  }

  function isReducedMotionActive() {
    return document.documentElement.getAttribute('data-motion') === 'reduced' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function handleMotionChange(mode) {
    const videos = document.querySelectorAll('.video-slot video');
    videos.forEach(function (v) {
      if (mode === 'reduced') {
        v.pause();
      } else {
        v.play().catch(function () {});
      }
    });
  }

  return {
    init: init,
    handleMotionChange: handleMotionChange
  };
})();
