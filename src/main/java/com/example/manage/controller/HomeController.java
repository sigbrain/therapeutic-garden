package com.example.manage.controller;

import jakarta.servlet.http.HttpSession;
import com.example.manage.domain.Site;
import com.example.manage.service.SiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class HomeController {

    private final SiteService siteService;
    private final com.example.manage.service.SiteImageService siteImages;
    private final com.example.manage.service.HealingEffectQueryService healingEffects;
    private final com.example.manage.service.MeasurementHistoryQueryService measurementHistory;

    @Value("${kakao.maps.javascript-key}")
    private String kakaoMapsJavaScriptKey;

    @GetMapping("/")
    public String landing(HttpSession session, Model model) {
        if (session.getAttribute("loginAdminId") != null) {
            return "redirect:/admin/monitoring";
        }
        if (session.getAttribute("loginMemberId") != null) {
            return "redirect:/member";
        }
        var overall = healingEffects.findPublishedOverall();
        model.addAttribute("healingEffects", overall);
        model.addAttribute("effectsBySpot", overall.stream().collect(java.util.stream.Collectors.toMap(
                com.example.manage.dto.HealingEffectView::spotCode, java.util.function.Function.identity())));
        model.addAttribute("anonymousEffects", healingEffects.findAnonymousExample());
        return "landing";
    }

    @GetMapping("/admin/monitoring")
    public String home(Model model) {

        List<Site> sites = siteService.findAllSites();

        model.addAttribute(
                "kakaoMapsJavaScriptKey",
                kakaoMapsJavaScriptKey
        );
        model.addAttribute("sites", sites);
        var imageUrls = new java.util.HashMap<Long, String>();
        sites.forEach(site -> imageUrls.put(site.getSiteId(), siteImages.representativeReadUrl(site.getSiteId())));
        model.addAttribute("siteImageUrls", imageUrls);

        var participants = healingEffects.findMonitoringParticipants();
        var monitoringEffects = new java.util.LinkedHashMap<String, com.example.manage.dto.MonitoringSiteEffectView>();
        sites.forEach(site -> monitoringEffects.put(String.valueOf(site.getSiteId()),
                healingEffects.findMonitoringForSite(site.getSiteId(), participants)));
        model.addAttribute("monitoringParticipants", participants);
        model.addAttribute("monitoringEffects", monitoringEffects);
        var histories = new java.util.LinkedHashMap<String, java.util.Map<String, java.util.List<com.example.manage.dto.MeasurementHistoryView>>>();
        sites.forEach(site -> {
            var memberHistory = new java.util.LinkedHashMap<String, java.util.List<com.example.manage.dto.MeasurementHistoryView>>();
            participants.forEach(member -> memberHistory.put(member.memberId().toString(),
                    measurementHistory.findMemberForSite(member.memberId(), site.getSiteId())));
            histories.put(site.getSiteId().toString(), memberHistory);
        });
        model.addAttribute("monitoringHistory", histories);

        return "home";
    }
}
