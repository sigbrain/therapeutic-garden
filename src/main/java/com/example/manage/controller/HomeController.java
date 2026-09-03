package com.example.manage.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @Value("${kakao.maps.javascript-key}")
    private String kakaoMapsJavaScriptKey;

    @GetMapping("/")
    public String home(Model model) {

        model.addAttribute(
                "kakaoMapsJavaScriptKey",
                kakaoMapsJavaScriptKey
        );

        return "home";
    }
}
