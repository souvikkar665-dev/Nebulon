/**
 * NEBULON DATA FORMATTERS
 * Clean Scientific Formatting for UTC Timestamps, Doppler, Orbital Elements & Provenance
 */

window.NebulonFormatters = (function () {
  'use strict';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, function (tag) {
      const chars = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
      return chars[tag] || tag;
    });
  }

  function formatUtc(timestamp) {
    if (!timestamp) return '—';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return String(timestamp);
      return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    } catch (e) { return String(timestamp); }
  }

  function formatTimeOnly(timestamp) {
    if (!timestamp) return '—';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return String(timestamp);
      return date.toISOString().substring(11, 19) + ' UTC';
    } catch (e) { return String(timestamp); }
  }

  function formatDoppler(freqKhz) {
    if (freqKhz === undefined || freqKhz === null) return '—';
    const num = Number(freqKhz);
    if (isNaN(num)) return String(freqKhz);
    return `${num > 0 ? '+' : ''}${num.toFixed(1)} kHz`;
  }

  function formatMhz(freqMhz) {
    if (freqMhz === undefined || freqMhz === null || freqMhz === '') return '—';
    const num = Number(freqMhz);
    if (isNaN(num)) return String(freqMhz);
    return `${num.toFixed(3)} MHz`;
  }

  function formatPercent(val) {
    if (val === undefined || val === null) return '0%';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return `${num <= 1 ? Math.round(num * 100) : Math.round(num)}%`;
  }

  function formatScore(score) {
    if (score === undefined || score === null || isNaN(Number(score))) return '0.0';
    return Number(score).toFixed(1);
  }

  function formatOrbitalElements(elem) {
    if (!elem) return 'Epoch: N/A · Inclination: N/A';
    return `Inc: ${elem.inclination || '—'}° · Alt: ${elem.altitude_km || '—'} km · Ecc: ${elem.eccentricity || '0.0001'}`;
  }

  function formatNumber(value, decimals = 3) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(decimals) : '—';
  }

  function formatKm(value, decimals = 1) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return `${num.toLocaleString(undefined, { maximumFractionDigits: decimals })} km`;
  }

  function formatAu(value, decimals = 3) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return `${num.toFixed(decimals)} AU`;
  }

  function formatDegrees(value, decimals = 3) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return `${num.toFixed(decimals)}°`;
  }

  function formatMass(value) {
    if (value === undefined || value === null || value === '') return '—';
    return String(value).toUpperCase().includes('KG') ? String(value) : `${value} kg`;
  }

  function formatPlanetaryTelemetry(body) {
    if (!body) return { orbital: '—', physical: '—', spatial: '—', provenance: '—' };
    const au = Number.isFinite(Number(body.liveSemiMajorAu)) ? Number(body.liveSemiMajorAu) : null;
    const radius = Number.isFinite(Number(body.meanRadiusKm)) ? Number(body.meanRadiusKm) : null;
    const speed = Number.isFinite(Number(body.liveOrbitalSpeedKmS)) ? `${Number(body.liveOrbitalSpeedKmS).toFixed(2)} km/s` : '—';
    return {
      orbital: `a: ${au === null ? body.semiMajor || '—' : formatAu(au)} · e: ${body.ecc || '—'}`,
      physical: `Radius: ${radius === null ? '—' : formatKm(radius)} · Mass: ${formatMass(body.mass)}`,
      spatial: `${au === null ? (body.dist * 0.008).toFixed(2) : au.toFixed(3)} AU from Sun`,
      speed,
      provenance: `${body.dataSource || body.agency || 'Catalog'} · ${body.dataUpdatedAt ? formatUtc(body.dataUpdatedAt) : 'Catalog fallback'}`
    };
  }

  return {
    escapeHtml, formatUtc, formatTimeOnly, formatDoppler, formatMhz,
    formatPercent, formatScore, formatOrbitalElements, formatNumber,
    formatKm, formatAu, formatDegrees, formatMass, formatPlanetaryTelemetry
  };
})();
