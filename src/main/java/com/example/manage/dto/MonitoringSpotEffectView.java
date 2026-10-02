package com.example.manage.dto;

import com.example.manage.domain.HealingSpotEffectSummary;
import java.math.BigDecimal;

/** Summary-only data used by the protected Monitoring screen. */
public record MonitoringSpotEffectView(
        String spotCode,
        String spotName,
        BigDecimal stressReductionRate,
        String stressChangeDisplay,
        BigDecimal emotionalIncreaseRate,
        String emotionalChangeDisplay,
        Integer stressParticipantCount,
        Integer emotionalParticipantCount,
        Integer stressValidSessionCount,
        Integer emotionalValidSessionCount,
        boolean hasMeasurement) {

    public static MonitoringSpotEffectView overall(HealingSpotEffectSummary summary) {
        return new MonitoringSpotEffectView(
                summary.getHealingSpot().getCode(), summary.getHealingSpot().getName(),
                summary.getStressReductionRate(), HealingEffectView.stressChangeDisplay(summary.getStressReductionRate()),
                summary.getEmotionalIncreaseRate(), HealingEffectView.emotionalChangeDisplay(summary.getEmotionalIncreaseRate()),
                summary.getStressParticipantCount(), summary.getEmotionalParticipantCount(),
                summary.getStressValidSessionCount(), summary.getEmotionalValidSessionCount(), true);
    }

    public static MonitoringSpotEffectView missing(String code, String name) {
        return new MonitoringSpotEffectView(code, name, null, "측정 없음", null, "측정 없음",
                null, null, null, null, false);
    }
}
