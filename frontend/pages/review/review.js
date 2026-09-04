/*
 * NEBULON VERIFICATION CHAMBER CONTROLLER
 * Review state and reports are scoped to the authenticated operator.
 */
(function () {
  'use strict';

  let currentHypothesis = null;
  let selectedDecision = 'Verified by source';
  let reportData = { timeline: [], observations: [], investigations: [] };
  const escapeHtml = (value) => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  function activeMember() {
    return window.NebulonAuth && window.NebulonAuth.getActiveMember
      ? window.NebulonAuth.getActiveMember()
      : { id: 'souvik', name: 'Souvik Kar', role: 'Mission Director' };
  }

  function init() {
    const member = activeMember();
    const operator = document.getElementById('review-operator');
    if (operator) operator.value = `${member.name} · ${member.role}`;
    setVerificationName();
    loadHypothesis();
    bindDecisionOptions();
    bindSubmitButton();
    bindReportExport();
  }

  async function loadHypothesis() {
    if (!window.NebulonAPI) return;
    try {
      const [hypotheses, timeline, opportunities, workspace] = await Promise.all([
        window.NebulonAPI.getHypotheses(), window.NebulonAPI.getTimeline(),
        window.NebulonAPI.getObservationOpportunities(), window.NebulonAPI.getWorkspace()
      ]);
      currentHypothesis = (hypotheses || (workspace && workspace.hypotheses) || [])[0] || null;
      const selectedIds = new Set(readEvidenceSelection());
      reportData.timeline = timeline || [];
      reportData.observations = (opportunities || []).filter(item => selectedIds.has(`observation:${item.id}`));
      reportData.investigations = ((workspace && workspace.hypotheses) || []).filter(item => selectedIds.has(`investigation:${item.id}`));
      renderTargetHeader(); renderSupportingEvidence(); renderContradictions(); renderReport();
    } catch (e) { console.error(e); }
  }

  function readEvidenceSelection() {
    try {
      const values = JSON.parse(localStorage.getItem('nebulon_evidence_selection') || '[]');
      return Array.isArray(values) ? values : [];
    } catch (e) { return []; }
  }

  function renderTargetHeader() {
    if (!currentHypothesis) return;
    const el = document.getElementById('review-target-header');
    if (el) el.innerHTML = `<div><div class="n-kicker">HUMAN VERIFICATION ARBITER</div><h2 style="font-size: 1.6rem; color: #ffffff; margin-top: 2px;">${escapeHtml(currentHypothesis.spacecraft_name)} ↔ ${escapeHtml(currentHypothesis.tracked_object)}</h2></div><div style="text-align: right;"><span class="n-chip n-chip--cyan">Physics Match Score: ${escapeHtml(currentHypothesis.physics_score)}%</span></div>`;
  }

  function renderSupportingEvidence() {
    const col = document.getElementById('review-supporting-body');
    if (!col || !currentHypothesis) return;
    const selected = reportData.observations.length + reportData.investigations.length;
    col.innerHTML = `
      <div class="investigate-detail-card" style="margin-bottom: 12px;"><strong style="color: var(--n-cyan);">SGP4 Ephemeris Consistency</strong><p class="n-body" style="font-size: 0.8rem; margin-top: 6px;">Predicted Keplerian trajectory aligns with SatNOGS Station 142 Doppler curve epoch 09:14 UTC.</p></div>
      <div class="investigate-detail-card" style="margin-bottom: 12px;"><strong style="color: var(--n-cyan);">RF Beacon SNR Alignment</strong><p class="n-body" style="font-size: 0.8rem; margin-top: 6px;">GFSK 9.6 kbps telemetry beacon detected on 437.450 MHz with nominal packet preamble.</p></div>
      <div class="investigate-detail-card"><strong style="color: var(--n-green);">Operator-selected records</strong><p class="n-body" style="font-size: 0.8rem; margin-top: 6px;">${selected} Observation/Investigation record${selected === 1 ? '' : 's'} attached from Evidence.</p></div>`;
  }

  function renderContradictions() {
    const col = document.getElementById('review-contradiction-body');
    if (col) col.innerHTML = `<div class="investigate-detail-card" style="border-color: rgba(255, 111, 142, 0.3); margin-bottom: 12px;"><strong style="color: var(--n-red);">Candidate A Frequency Split</strong><span class="n-chip n-chip--red" style="float: right;">⚠ Conflict</span><p class="n-body" style="font-size: 0.8rem; margin-top: 6px;">Object NORAD 56983 exhibited +4.8 kHz Doppler anomaly on Pass #4, ruling out Aurora-1 nominal oscillator.</p></div><div class="investigate-detail-card" style="border-color: rgba(255, 200, 107, 0.3);"><strong style="color: var(--n-amber);">Candidate G Inactivity</strong><p class="n-body" style="font-size: 0.8rem; margin-top: 6px;">Object NORAD 56991 produced zero RF detections over Svalbard and Hawaii ground passes.</p></div>`;
  }

  function bindDecisionOptions() {
    document.querySelectorAll('.review-decision-option').forEach(opt => opt.addEventListener('click', function () {
      document.querySelectorAll('.review-decision-option').forEach(o => o.classList.remove('is-selected'));
      this.classList.add('is-selected'); selectedDecision = this.dataset.decision; setVerificationName(); renderReport();
    }));
  }

  function setVerificationName() {
    const field = document.getElementById('review-verification-name');
    const member = activeMember();
    if (field && (!field.value || field.dataset.generated === 'true')) {
      field.value = `${selectedDecision} · ${member.id.toUpperCase()}`;
      field.dataset.generated = 'true';
    }
  }

  function bindSubmitButton() {
    const btn = document.getElementById('review-submit-btn');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      if (!currentHypothesis) return;
      const member = activeMember();
      const reviewer = `${member.name} · ${member.role}`;
      const notes = (document.getElementById('review-notes') || {}).value || '';
      const verificationName = (document.getElementById('review-verification-name') || {}).value || `${selectedDecision} · ${member.id.toUpperCase()}`;
      btn.disabled = true; btn.textContent = 'Recording to Cryptographic Audit Stream...';
      try {
        const res = await window.NebulonAPI.recordReview(currentHypothesis.id, { decision: selectedDecision, notes, reviewer });
        const review = { ...res, reviewer, verification_name: verificationName, notes, operator_id: member.id, selected_records: readEvidenceSelection() };
        localStorage.setItem(`nebulon_review_${member.id}`, JSON.stringify(review));
        showVerificationSeal(review); renderReport(review);
        if (window.NebulonApp) window.NebulonApp.showToast('Verification Recorded', res.message, 'success');
      } catch (err) { console.error(err); if (window.NebulonApp) window.NebulonApp.showToast('Review Error', 'The verification could not be recorded.', 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Commit Verification Seal'; }
    });
  }

  function showVerificationSeal(res) {
    const seal = document.getElementById('review-seal');
    const msg = document.getElementById('review-seal-msg');
    const meta = document.getElementById('review-seal-meta');
    if (msg) msg.textContent = res.message || 'Verification Seal Committed';
    if (meta) meta.textContent = `Verification: ${res.verification_name} · Operator: ${res.reviewer} · Timestamp: ${res.timestamp} · Request ID: ${res.request_id}`;
    if (seal) seal.classList.add('is-active');
  }

  function reviewRecord() {
    const member = activeMember();
    try { return JSON.parse(localStorage.getItem(`nebulon_review_${member.id}`) || 'null'); } catch (e) { return null; }
  }

  function renderReport(savedReview) {
    const body = document.getElementById('review-report-body');
    if (!body || !currentHypothesis) return;
    const review = savedReview || reviewRecord() || {};
    const member = activeMember();
    const selected = [...reportData.observations.map(i => `Observation · ${i.station_id} · ${i.observation_type}`), ...reportData.investigations.map(i => `Investigation · ${i.tracked_object} · ${i.evidence_score}% score`)];
    const records = selected.length ? `<ul class="review-report-records">${selected.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<span class="n-muted">No additional records selected in Evidence.</span>';
    body.innerHTML = `<dl class="review-report-block"><dt>Operator</dt><dd>${escapeHtml(review.reviewer || `${member.name} · ${member.role}`)}</dd></dl><dl class="review-report-block"><dt>Verification name</dt><dd>${escapeHtml(review.verification_name || `${selectedDecision} · ${member.id.toUpperCase()}`)}</dd></dl><dl class="review-report-block"><dt>Target</dt><dd>${escapeHtml(currentHypothesis.spacecraft_name)} ↔ ${escapeHtml(currentHypothesis.tracked_object)}</dd></dl><dl class="review-report-block"><dt>Decision</dt><dd>${escapeHtml(review.decision || selectedDecision)}</dd></dl><div class="review-report-block review-report-block--wide"><dt>Selected evidence</dt><dd>${records}</dd></div><div class="review-report-block review-report-block--wide"><dt>Audit notes</dt><dd>${escapeHtml(review.notes || (document.getElementById('review-notes') || {}).value || 'No audit notes recorded.')}</dd></div><div class="review-report-block review-report-block--wide"><dt>Report metadata</dt><dd>Generated ${escapeHtml(review.timestamp || new Date().toISOString())} · Hypothesis ${escapeHtml(currentHypothesis.id)} · Mission ${escapeHtml(window.NebulonAPI.getCurrentMissionId())}</dd></div>`;
  }

  function bindReportExport() {
    const button = document.getElementById('review-export-pdf');
    if (button) button.addEventListener('click', () => { renderReport(); window.print(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
