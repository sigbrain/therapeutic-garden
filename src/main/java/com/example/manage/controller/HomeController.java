package com.example.manage.controller;

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

    @Value("${kakao.maps.javascript-key}")
    private String kakaoMapsJavaScriptKey;

    @GetMapping("/")
    public String home(Model model) {

        List<Site> sites = siteService.findAllSites();

        model.addAttribute(
                "kakaoMapsJavaScriptKey",
                kakaoMapsJavaScriptKey
        );
        model.addAttribute("sites", sites);

        return "home";
    }
}
