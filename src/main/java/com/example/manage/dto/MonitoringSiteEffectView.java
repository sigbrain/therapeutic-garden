package com.example.manage.dto;

import java.util.List;
import java.util.Map;

public record MonitoringSiteEffectView(
        List<MonitoringSpotEffectView> overall,
        Map<String, List<MonitoringSpotEffectView>> members) {
}
