/**
 * NEBULON VERIFICATION CHAMBER CONTROLLER
 */

(function () {
  'use strict';

  let currentHypothesis = null;
  let selectedDecision = 'Verified by source';

  function init() {
    loadHypothesis();
    bindDecisionOptions();
    bindSubmitButton();
  }

  async function loadHypothesis() {
    if (!window.NebulonAPI) return;
    try {
      const hypotheses = await window.NebulonAPI.getHypotheses();
      currentHypothesis = hypotheses[0]; // Leader candidate NORAD 56987

      renderTargetHeader();
      renderSupportingEvidence();
      renderContradictions();
    } catch (e) {
      console.error(e);
    }
  }

  function renderTargetHeader() {
    if (!currentHypothesis) return;
    const el = document.getElementById('review-target-header');
    if (!el) return;

    el.innerHTML = `
      <div>
        <div class="n-kicker">HUMAN VERIFICATION ARBITER</div>
        <h2 style="font-size: 1.6rem; color: #ffffff; margin-top: 2px;">
          ${currentHypothesis.spacecraft_name} ↔ ${currentHypothesis.tracked_object}
        </h2>
      </div>
      <div style="text-align: right;">
        <span class="n-chip n-chip--cyan">Physics Match Score: ${currentHypothesis.physics_score}%</span>
      </div>
    `;
  }

  function renderSupportingEvidence() {
    const col = document.getElementById('review-supporting-body');
    if (!col || !currentHypothesis) return;

    col.innerHTML = `
      <div class="investigate-detail-card" style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: var(--n-cyan);">SGP4 Ephemeris Consistency</strong>
          <span class="n-chip n-chip--green">✓ 38 Hz Residual</span>
        </div>
        <p class="n-body" style="font-size: 0.8rem; margin-top: 6px;">
          Predicted Keplerian trajectory aligns with SatNOGS Station 142 Doppler curve epoch 09:14 UTC.
        </p>
      </div>

      <div class="investigate-detail-card" style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: var(--n-cyan);">RF Beacon SNR Alignment</strong>
          <span class="n-chip n-chip--green">✓ +14.8 dB SNR</span>
        </div>
        <p class="n-body" style="font-size: 0.8rem; margin-top: 6px;">
          GFSK 9.6 kbps telemetry beacon detected on 437.450 MHz with nominal packet preamble.
        </p>
      </div>

      <div class="investigate-detail-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: var(--n-cyan);">Deployment Ejection Velocity</strong>
          <span class="n-chip n-chip--green">✓ Δv Match</span>
        </div>
        <p class="n-body" style="font-size: 0.8rem; margin-top: 6px;">
          Transporter-8 deployment spring impulse vector matches orbital plane separation rate.
        </p>
      </div>
    `;
  }

  function renderContradictions() {
    const col = document.getElementById('review-contradiction-body');
    if (!col || !currentHypothesis) return;

    col.innerHTML = `
      <div class="investigate-detail-card" style="border-color: rgba(255, 111, 142, 0.3); margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: var(--n-red);">Candidate A Frequency Split</strong>
          <span class="n-chip n-chip--red">⚠ Conflict</span>
        </div>
        <p class="n-body" style="font-size: 0.8rem; margin-top: 6px;">
          Object NORAD 56983 exhibited +4.8 kHz Doppler anomaly on Pass #4, ruling out Aurora-1 nominal oscillator.
        </p>
      </div>

      <div class="investigate-detail-card" style="border-color: rgba(255, 200, 107, 0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: var(--n-amber);">Candidate G Inactivity</strong>
          <span class="n-chip n-chip--amber">Low Confidence</span>
        </div>
        <p class="n-body" style="font-size: 0.8rem; margin-top: 6px;">
          Object NORAD 56991 produced zero RF detections over Svalbard and Hawaii ground passes.
        </p>
      </div>
    `;
  }

  function bindDecisionOptions() {
    document.querySelectorAll('.review-decision-option').forEach(opt => {
      opt.addEventListener('click', function () {
        document.querySelectorAll('.review-decision-option').forEach(o => o.classList.remove('is-selected'));
        this.classList.add('is-selected');
        selectedDecision = this.dataset.decision;
      });
    });
  }

  function bindSubmitButton() {
    const btn = document.getElementById('review-submit-btn');
    if (!btn) return;

    btn.addEventListener('click', async function () {
      if (!currentHypothesis) return;
      const notes = document.getElementById('review-notes').value;
      const reviewer = document.getElementById('review-operator').value || 'Ada Reyes · Senior Operator';

      btn.disabled = true;
      btn.textContent = 'Recording to Cryptographic Audit Stream...';

      try {
        const res = await window.NebulonAPI.recordReview(currentHypothesis.id, {
          decision: selectedDecision,
          notes: notes,
          reviewer: reviewer
        });

        // Trigger Verification Seal Animation
        showVerificationSeal(res);
        if (window.NebulonApp) {
          window.NebulonApp.showToast('Verification Recorded', res.message, 'success');
        }
      } catch (err) {
        console.error(err);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Commit Verification Seal';
      }
    });
  }

  function showVerificationSeal(res) {
    const seal = document.getElementById('review-seal');
    const sealMsg = document.getElementById('review-seal-msg');
    const sealMeta = document.getElementById('review-seal-meta');

    if (!seal) return;
    if (sealMsg) sealMsg.textContent = res.message || 'Verification Seal Committed';
    if (sealMeta) sealMeta.textContent = `Reviewer: ${res.reviewer} · Timestamp: ${res.timestamp} · Request ID: ${res.request_id}`;

    seal.classList.add('is-active');

    // Update Contradiction counter
    const countEl = document.getElementById('n-contradiction-count');
    if (countEl) countEl.textContent = '0';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
