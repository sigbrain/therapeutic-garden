package com.example.manage.service;

import com.example.manage.dto.HealingEffectView;
import com.example.manage.dto.MonitoringSpotEffectView;
import com.example.manage.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HealingEffectQueryService {
    private final HealingSpotEffectSummaryRepository overall;
    private final MemberHealingSpotEffectSummaryRepository participants;
    private final HealingSpotRepository spots;
    private final MemberRepository members;
    private final HealingEffectImportBatchRepository batches;

    /** The successful batch determines the dataset Site; no hardcoded Site or Member identity. */
    public List<HealingEffectView> findPublishedOverall() {
        return batches.findFirstByOrderByIdAsc().map(b -> findOverall(b.getTargetSiteId())).orElse(List.of());
    }

    public List<HealingEffectView> findAnonymousExample() {
        return batches.findFirstByOrderByIdAsc().map(b -> {
            var candidates = participants.findCompleteExampleMemberIds(b.getTargetSiteId());
            if (candidates.isEmpty()) return List.<HealingEffectView>of();
            var views = findMember(b.getTargetSiteId(), candidates.getFirst());
            // Do not publish a partial or ambiguous example after Spot edits/deletions.
            return views.size() == 6 && views.stream().allMatch(HealingEffectView::hasMeasurement)
                    ? views : List.<HealingEffectView>of();
        }).orElse(List.of());
    }

    /** Admin identity stays in the existing protected Member model, never in effect DTOs. */
    public List<HealingEffectView> findImportedMember(Long memberId) {
        return batches.findFirstByOrderByIdAsc().map(b -> findMember(b.getTargetSiteId(), memberId)).orElse(List.of());
    }

    public List<HealingEffectView> findOverall(Long siteId) {
        return overall.findByHealingSpotHealingCourseSiteSiteIdOrderByHealingSpotCodeAsc(siteId).stream()
                .map(s -> HealingEffectView.measured(s.getHealingSpot().getCode(), s.getHealingSpot().getName(),
                        s.getStressReductionRate(), s.getEmotionalIncreaseRate(),
                        s.getStressValidSessionCount(), s.getEmotionalValidSessionCount())).toList();
    }

    public List<HealingEffectView> findMember(Long siteId, Long memberId) {
        if (!members.existsById(memberId)) throw new IllegalArgumentException("존재하지 않는 Member입니다.");
        var measurements = participants
                .findByMemberMemberIdAndHealingSpotHealingCourseSiteSiteIdOrderByHealingSpotCodeAsc(memberId, siteId)
                .stream().collect(Collectors.toMap(s -> s.getHealingSpot().getSpotId(), Function.identity()));
        return spots.findByHealingCourseSiteSiteId(siteId).stream()
                .filter(s -> s.getCode().matches("HS[1-6]"))
                .sorted(Comparator.comparing(s -> s.getCode()))
                .map(spot -> {
                    var s = measurements.get(spot.getSpotId());
                    return s == null ? HealingEffectView.missing(spot.getCode(), spot.getName())
                            : HealingEffectView.measured(spot.getCode(), spot.getName(),
                                    s.getStressReductionRate(), s.getEmotionalIncreaseRate(),
                                    s.getStressValidSessionCount(), s.getEmotionalValidSessionCount());
                }).toList();
    }

    /** Builds the Site-wide Summary-only snapshot used by spatial Monitoring. */
    public List<MonitoringSpotEffectView> findMonitoringOverallForSite(Long siteId) {
        var siteSpots = spots.findByHealingCourseSiteSiteId(siteId).stream()
                .filter(spot -> spot.getCode().matches("HS[1-6]"))
                .sorted(Comparator.comparing(com.example.manage.domain.HealingSpot::getCode))
                .toList();

        var overallBySpot = overall.findByHealingSpotHealingCourseSiteSiteIdOrderByHealingSpotCodeAsc(siteId).stream()
                .collect(Collectors.toMap(s -> s.getHealingSpot().getSpotId(), Function.identity()));
        return siteSpots.stream().map(spot -> {
            var summary = overallBySpot.get(spot.getSpotId());
            return summary == null ? MonitoringSpotEffectView.missing(spot.getCode(), spot.getName())
                    : MonitoringSpotEffectView.overall(summary);
        }).toList();
    }
}
