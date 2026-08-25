/**
 * NEBULON LIVE STREAM MANAGER — FLICKER-FREE NASA 2070 SSE ORCHESTRATOR
 */

window.NebulonStream = (function () {
  'use strict';

  let eventSource = null;
  let simulatedTimer = null;
  const processedEventIds = new Set();
  const listeners = new Map();

  function init() {
    if (window.EventSource) {
      try {
        eventSource = new EventSource('/api/v1/stream');

        eventSource.onopen = function () {
          dispatch('source_health_changed', { status: 'LIVE', connected: true });
        };

        eventSource.onmessage = function (event) {
          handleIncomingMessage(event.data);
        };

        eventSource.onerror = function () {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          startSimulationHeartbeat();
        };
      } catch (err) {
        startSimulationHeartbeat();
      }
    } else {
      startSimulationHeartbeat();
    }
  }

  function handleIncomingMessage(raw) {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!data) return;

      // Event deduplication check
      if (data.event_id) {
        if (processedEventIds.has(data.event_id)) return;
        processedEventIds.add(data.event_id);
        if (processedEventIds.size > 200) {
          const first = processedEventIds.values().next().value;
          processedEventIds.delete(first);
        }
      }

      dispatch(data.type || 'data_updated', data);
    } catch (e) {
      console.error('[NebulonStream] Failed to parse event:', e);
    }
  }

  function startSimulationHeartbeat() {
    if (simulatedTimer) return;
    dispatch('source_health_changed', { status: 'LIVE · SIMULATED', connected: false });

    // Quiet, non-intrusive background stream (zero disruptive DOM resets)
    simulatedTimer = setInterval(function () {
      const pingEvent = {
        event_id: 'sim-' + Date.now(),
        type: 'source_pulse',
        timestamp: new Date().toISOString(),
        latency_ms: 14 + Math.floor(Math.random() * 6)
      };
      dispatch('source_pulse', pingEvent);
    }, 6000);
  }

  function on(eventType, callback) {
    if (!listeners.has(eventType)) {
      listeners.set(eventType, []);
    }
    listeners.get(eventType).push(callback);
  }

  function off(eventType, callback) {
    if (!listeners.has(eventType)) return;
    const arr = listeners.get(eventType).filter(cb => cb !== callback);
    listeners.set(eventType, arr);
  }

  function dispatch(eventType, payload) {
    if (listeners.has(eventType)) {
      listeners.get(eventType).forEach(cb => {
        try { cb(payload); } catch (e) { console.error(e); }
      });
    }
    window.dispatchEvent(new CustomEvent('nebulon:' + eventType, { detail: payload }));
  }

  return {
    init: init,
    on: on,
    off: off,
    dispatch: dispatch
  };
})();
