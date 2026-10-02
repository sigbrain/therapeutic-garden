/* Participant-only analysis. Data is supplied by the authenticated /member controller. */
(() => {
    'use strict';
    const survey = window.HomeSurvey;
    const effects = Array.isArray(window.memberHealingEffects) ? window.memberHealingEffects : [];
    const history = Array.isArray(window.memberMeasurementHistory) ? window.memberMeasurementHistory : [];
    const highlights = document.getElementById('memberAnalysisHighlights');
    const modal = document.getElementById('memberAnalysisModal');
    const dialog = modal.querySelector('[role="dialog"]');
    const openButton = document.getElementById('openMemberAnalysisButton');
    const closeButton = document.getElementById('closeAnalysisButton');
    let previousOverflow = '';

    survey.renderHighlights(highlights, effects);
    survey.renderModal(document.getElementById('memberAnalysisSummary'), effects);
    window.MeasurementHistory.render(document.getElementById('memberAnalysisHistory'), history);

    function close() {
        if (modal.hidden) return;
        modal.hidden = true;
        document.body.style.overflow = previousOverflow;
        openButton.focus();
    }
    openButton.addEventListener('click', () => {
        previousOverflow = document.body.style.overflow;
        modal.hidden = false;
        dialog.scrollTop = 0;
        document.body.style.overflow = 'hidden';
        closeButton.focus();
    });
    closeButton.addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    document.addEventListener('keydown', event => {
        if (modal.hidden) return;
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        if (event.key !== 'Tab') return;
        const controls = Array.from(dialog.querySelectorAll('button, select, [tabindex]'))
            .filter(control => control.tabIndex >= 0 && control.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
            event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first.focus();
        }
    });
})();
