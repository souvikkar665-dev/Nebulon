/**
 * NEBULON DATA FORMATTERS
 * Clean Scientific Formatting for UTC Timestamps, Doppler, Orbital Elements & Provenance
 */

window.NebulonFormatters = (function () {
  'use strict';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, function (tag) {
      const chars = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      };
      return chars[tag] || tag;
    });
  }

  function formatUtc(timestamp) {
    if (!timestamp) return '—';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return String(timestamp);
      return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    } catch (e) {
      return String(timestamp);
    }
  }

  function formatTimeOnly(timestamp) {
    if (!timestamp) return '—';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return String(timestamp);
      return date.toISOString().substring(11, 19) + ' UTC';
    } catch (e) {
      return String(timestamp);
    }
  }

  function formatDoppler(freqKhz) {
    if (freqKhz === undefined || freqKhz === null) return '—';
    const num = Number(freqKhz);
    if (isNaN(num)) return String(freqKhz);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(1)} kHz`;
  }

  function formatMhz(freqMhz) {
    if (!freqMhz) return '—';
    const num = Number(freqMhz);
    if (isNaN(num)) return String(freqMhz);
    return `${num.toFixed(3)} MHz`;
  }

  function formatPercent(val) {
    if (val === undefined || val === null) return '0%';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    const rounded = num <= 1 ? Math.round(num * 100) : Math.round(num);
    return `${rounded}%`;
  }

  function formatScore(score) {
    if (score === undefined || score === null) return '0.0';
    return Number(score).toFixed(1);
  }

  function formatOrbitalElements(elem) {
    if (!elem) return 'Epoch: N/A · Inclination: N/A';
    return `Inc: ${elem.inclination || '—'}° · Alt: ${elem.altitude_km || '—'} km · Ecc: ${elem.eccentricity || '0.0001'}`;
  }

  return {
    escapeHtml: escapeHtml,
    formatUtc: formatUtc,
    formatTimeOnly: formatTimeOnly,
    formatDoppler: formatDoppler,
    formatMhz: formatMhz,
    formatPercent: formatPercent,
    formatScore: formatScore,
    formatOrbitalElements: formatOrbitalElements
  };
})();
