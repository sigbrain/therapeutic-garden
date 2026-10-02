/* Participant-only analysis. Data is supplied by the authenticated /member controller. */
(() => {
    'use strict';
    const survey = window.HomeSurvey;
    const effects = Array.isArray(window.memberHealingEffects) ? window.memberHealingEffects : [];
    const history = Array.isArray(window.memberMeasurementHistory) ? window.memberMeasurementHistory : [];
    const highlights = document.getElementById('memberAnalysisHighlights');

    survey.renderHighlights(highlights, effects);
    survey.renderSummary(document.getElementById('memberAnalysisSummary'), effects);
    window.MeasurementHistory.render(document.getElementById('memberAnalysisHistory'), history, {defaultSpotCode: 'HS1'});
})();
