/**
 * NEBULON EVIDENCE VAULT CONTROLLER
 */

(function () {
  'use strict';

  let evidenceItems = [];
  let selectedItem = null;
  let activeFilter = 'all';

  function init() {
    loadEvidence();
    bindFilterButtons();
  }

  async function loadEvidence() {
    if (!window.NebulonAPI) return;
    try {
      const data = await window.NebulonAPI.getTimeline();
      evidenceItems = data;
      selectedItem = data[0];

      renderTimeline();
      renderProvenanceInspector();
    } catch (e) {
      console.error(e);
    }
  }

  function bindFilterButtons() {
    document.querySelectorAll('[data-source-filter]').forEach(btn => {
      btn.addEventListener('click', function () {
        activeFilter = this.dataset.sourceFilter;
        document.querySelectorAll('[data-source-filter]').forEach(b => b.classList.remove('is-active'));
        this.classList.add('is-active');
        renderTimeline();
      });
    });
  }

  function renderTimeline() {
    const list = document.getElementById('evidence-timeline-container');
    if (!list) return;

    const filtered = activeFilter === 'all'
      ? evidenceItems
      : evidenceItems.filter(item => {
          if (activeFilter === 'satnogs') return item.source_badge.toLowerCase().includes('satnogs');
          if (activeFilter === 'celestrak') return item.source_badge.toLowerCase().includes('celestrak');
          if (activeFilter === 'spacetrack') return item.source_badge.toLowerCase().includes('space-track');
          if (activeFilter === 'manifest') return item.source_badge.toLowerCase().includes('manifest');
          return true;
        });

    if (filtered.length === 0) {
      list.innerHTML = `<div class="n-muted" style="padding: 2rem; text-align: center;">No evidence records match the selected source filter.</div>`;
      return;
    }

    list.innerHTML = filtered.map(item => `
      <div class="evidence-card ${item.kind === 'conflict' ? 'is-conflict' : ''} ${selectedItem && selectedItem.id === item.id ? 'is-selected' : ''}" data-evidence-id="${item.id}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span class="n-chip ${item.kind === 'conflict' ? 'n-chip--red' : 'n-chip--cyan'}">${item.source_badge}</span>
          <time class="n-mono" style="font-size: 0.72rem; color: var(--n-muted);">${item.time}</time>
        </div>
        <h4 style="font-size: 1.05rem; margin-bottom: 6px; color: var(--n-text);">${item.title}</h4>
        <p class="n-body" style="font-size: 0.825rem; color: var(--n-text-soft);">${item.detail}</p>
      </div>
    `).join('');

    list.querySelectorAll('[data-evidence-id]').forEach(el => {
      el.addEventListener('click', function () {
        const id = this.dataset.evidenceId;
        selectedItem = evidenceItems.find(i => i.id === id);
        renderTimeline();
        renderProvenanceInspector();
      });
    });
  }

  function renderProvenanceInspector() {
    const panel = document.getElementById('evidence-provenance-body');
    if (!panel || !selectedItem) return;

    const item = selectedItem;
    const ts = item.timestamps || {};
    const prov = item.provenance || {};

    panel.innerHTML = `
      <div>
        <span class="n-label-micro">RECORD PROVENANCE</span>
        <h3 style="font-size: 1.15rem; margin-top: 2px;">${item.source}</h3>
        <span class="n-chip ${item.kind === 'conflict' ? 'n-chip--red' : 'n-chip--cyan'}" style="margin-top: 6px;">
          ${prov.record_id || 'ID-ARCHIVE'}
        </span>
      </div>

      <div class="evidence-provenance-list">
        <!-- 4 Distinct Provenance Timestamps -->
        <div class="evidence-provenance-item">
          <span class="n-label-micro" style="color: var(--n-cyan);">1. PHYSICAL OBSERVATION TIME</span>
          <div class="n-mono" style="font-size: 0.8rem; margin-top: 2px; color: var(--n-text);">
            ${ts.physical_observation_time || item.time}
          </div>
        </div>

        <div class="evidence-provenance-item">
          <span class="n-label-micro" style="color: var(--n-blue);">2. SOURCE RECORD UPDATED</span>
          <div class="n-mono" style="font-size: 0.8rem; margin-top: 2px; color: var(--n-text);">
            ${ts.source_record_updated || '—'}
          </div>
        </div>

        <div class="evidence-provenance-item">
          <span class="n-label-micro" style="color: var(--n-violet);">3. ORBITAL ELEMENT EPOCH</span>
          <div class="n-mono" style="font-size: 0.8rem; margin-top: 2px; color: var(--n-text);">
            ${ts.orbital_element_epoch || '—'}
          </div>
        </div>

        <div class="evidence-provenance-item">
          <span class="n-label-micro" style="color: var(--n-green);">4. NEBULON RETRIEVED</span>
          <div class="n-mono" style="font-size: 0.8rem; margin-top: 2px; color: var(--n-text);">
            ${ts.nebulon_retrieved || '—'}
          </div>
        </div>
      </div>

      <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--n-line); font-family: var(--n-font-mono); font-size: 0.72rem; color: var(--n-muted); display: flex; flex-direction: column; gap: 6px;">
        <div>Parser Version: <strong style="color: var(--n-text);">${prov.parser_version || 'nebulon-core-v2'}</strong></div>
        <div>Freshness: <strong style="color: var(--n-cyan);">${prov.freshness_seconds || 12}s latency</strong></div>
        ${prov.source_url ? `
          <a href="${prov.source_url}" target="_blank" rel="noopener" class="n-btn n-btn--secondary n-btn--sm" style="margin-top: 10px; width: 100%;">
            Open Raw Upstream Record ↗
          </a>
        ` : ''}
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
