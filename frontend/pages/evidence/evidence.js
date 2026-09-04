/*
 * NEBULON EVIDENCE VAULT CONTROLLER
 * Adds operator-selectable Observation and Investigation records while
 * preserving the existing timeline and upstream provenance links.
 */
(function () {
  'use strict';

  let evidenceItems = [];
  let observationItems = [];
  let investigationItems = [];
  let selectedItem = null;
  let activeFilter = 'all';
  const SELECTION_KEY = 'nebulon_evidence_selection';

  const escapeHtml = (value) => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  function init() {
    loadEvidence();
    bindFilterButtons();
    bindSelectionSave();
  }

  async function loadEvidence() {
    if (!window.NebulonAPI) return;
    try {
      const [timeline, opportunities, workspace] = await Promise.all([
        window.NebulonAPI.getTimeline(),
        window.NebulonAPI.getObservationOpportunities(),
        window.NebulonAPI.getWorkspace()
      ]);
      evidenceItems = timeline || [];
      observationItems = opportunities || [];
      investigationItems = (workspace && workspace.hypotheses) || [];
      selectedItem = evidenceItems[0] || null;
      renderTimeline();
      renderProvenanceInspector();
      renderSelectionChoices();
    } catch (e) {
      console.error(e);
    }
  }

  function getSavedSelection() {
    try {
      const stored = JSON.parse(localStorage.getItem(SELECTION_KEY) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (e) { return []; }
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

  function bindSelectionSave() {
    const button = document.getElementById('evidence-save-selection');
    if (!button) return;
    button.addEventListener('click', () => {
      const selected = [...document.querySelectorAll('#evidence-selection-container input:checked')]
        .map(input => input.value);
      localStorage.setItem(SELECTION_KEY, JSON.stringify(selected));
      const status = document.getElementById('evidence-selection-status');
      if (status) status.textContent = `${selected.length} record${selected.length === 1 ? '' : 's'} saved for Review.`;
      if (window.NebulonApp) window.NebulonApp.showToast('Evidence Selection Saved', `${selected.length} records will be included in the review report.`, 'success');
    });
  }

  function renderSelectionChoices() {
    const list = document.getElementById('evidence-selection-container');
    if (!list) return;
    const saved = new Set(getSavedSelection());
    const choices = [
      ...observationItems.map(item => ({
        id: `observation:${item.id}`,
        group: 'Observation',
        title: item.station_id,
        detail: `${item.observation_type} · ${item.window}`
      })),
      ...investigationItems.map(item => ({
        id: `investigation:${item.id}`,
        group: 'Investigation',
        title: item.tracked_object || item.spacecraft_name,
        detail: `${item.spacecraft_name} · ${item.evidence_score}% evidence score`
      }))
    ];
    list.innerHTML = choices.length ? choices.map(choice => `
      <label class="evidence-selection-item">
        <input type="checkbox" value="${escapeHtml(choice.id)}" ${saved.has(choice.id) ? 'checked' : ''} />
        <span><strong>${escapeHtml(choice.group)}</strong><br>${escapeHtml(choice.title)}<br><span class="n-muted">${escapeHtml(choice.detail)}</span></span>
      </label>
    `).join('') : '<span class="n-muted">No Observation or Investigation records available.</span>';
  }

  function renderTimeline() {
    const list = document.getElementById('evidence-timeline-container');
    if (!list) return;
    const filtered = activeFilter === 'all' ? evidenceItems : evidenceItems.filter(item => {
      const badge = String(item.source_badge || '').toLowerCase();
      return activeFilter === 'satnogs' ? badge.includes('satnogs')
        : activeFilter === 'celestrak' ? badge.includes('celestrak')
        : activeFilter === 'spacetrack' ? badge.includes('space-track')
        : activeFilter === 'manifest' ? badge.includes('manifest') : true;
    });
    if (!filtered.length) {
      list.innerHTML = '<div class="n-muted" style="padding: 2rem; text-align: center;">No evidence records match the selected source filter.</div>';
      return;
    }
    list.innerHTML = filtered.map(item => `
      <div class="evidence-card ${item.kind === 'conflict' ? 'is-conflict' : ''} ${selectedItem && selectedItem.id === item.id ? 'is-selected' : ''}" data-evidence-id="${escapeHtml(item.id)}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span class="n-chip ${item.kind === 'conflict' ? 'n-chip--red' : 'n-chip--cyan'}">${escapeHtml(item.source_badge)}</span>
          <time class="n-mono" style="font-size: 0.72rem; color: var(--n-muted);">${escapeHtml(item.time)}</time>
        </div>
        <h4 style="font-size: 1.05rem; margin-bottom: 6px; color: var(--n-text);">${escapeHtml(item.title)}</h4>
        <p class="n-body" style="font-size: 0.825rem; color: var(--n-text-soft);">${escapeHtml(item.detail)}</p>
      </div>
    `).join('');
    list.querySelectorAll('[data-evidence-id]').forEach(el => el.addEventListener('click', function () {
      selectedItem = evidenceItems.find(i => i.id === this.dataset.evidenceId);
      renderTimeline();
      renderProvenanceInspector();
    }));
  }

  function renderProvenanceInspector() {
    const panel = document.getElementById('evidence-provenance-body');
    if (!panel || !selectedItem) return;
    const item = selectedItem;
    const ts = item.timestamps || {};
    const prov = item.provenance || {};
    panel.innerHTML = `
      <div><span class="n-label-micro">RECORD PROVENANCE</span><h3 style="font-size: 1.15rem; margin-top: 2px;">${escapeHtml(item.source)}</h3><span class="n-chip ${item.kind === 'conflict' ? 'n-chip--red' : 'n-chip--cyan'}" style="margin-top: 6px;">${escapeHtml(prov.record_id || 'ID-ARCHIVE')}</span></div>
      <div class="evidence-provenance-list">
        <div class="evidence-provenance-item"><span class="n-label-micro" style="color: var(--n-cyan);">1. PHYSICAL OBSERVATION TIME</span><div class="n-mono" style="font-size: 0.8rem; margin-top: 2px; color: var(--n-text);">${escapeHtml(ts.physical_observation_time || item.time)}</div></div>
        <div class="evidence-provenance-item"><span class="n-label-micro" style="color: var(--n-blue);">2. SOURCE RECORD UPDATED</span><div class="n-mono" style="font-size: 0.8rem; margin-top: 2px; color: var(--n-text);">${escapeHtml(ts.source_record_updated || '—')}</div></div>
        <div class="evidence-provenance-item"><span class="n-label-micro" style="color: var(--n-violet);">3. ORBITAL ELEMENT EPOCH</span><div class="n-mono" style="font-size: 0.8rem; margin-top: 2px; color: var(--n-text);">${escapeHtml(ts.orbital_element_epoch || '—')}</div></div>
        <div class="evidence-provenance-item"><span class="n-label-micro" style="color: var(--n-green);">4. NEBULON RETRIEVED</span><div class="n-mono" style="font-size: 0.8rem; margin-top: 2px; color: var(--n-text);">${escapeHtml(ts.nebulon_retrieved || '—')}</div></div>
      </div>
      <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--n-line); font-family: var(--n-font-mono); font-size: 0.72rem; color: var(--n-muted); display: flex; flex-direction: column; gap: 6px;">
        <div>Parser Version: <strong style="color: var(--n-text);">${escapeHtml(prov.parser_version || 'nebulon-core-v2')}</strong></div>
        <div>Freshness: <strong style="color: var(--n-cyan);">${escapeHtml(prov.freshness_seconds || 12)}s latency</strong></div>
        ${prov.source_url ? `<a href="${escapeHtml(prov.source_url)}" target="_blank" rel="noopener" class="n-btn n-btn--secondary n-btn--sm" style="margin-top: 10px; width: 100%;">Open Raw Upstream Record ↗</a>` : ''}
      </div>`;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
