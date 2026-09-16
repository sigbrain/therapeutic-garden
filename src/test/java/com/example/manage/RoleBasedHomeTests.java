package com.example.manage;

import com.example.manage.domain.Admin;
import com.example.manage.domain.Member;
import com.example.manage.repository.AdminRepository;
import com.example.manage.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RoleBasedHomeTests {
    @Autowired WebApplicationContext context;
    @Autowired AdminRepository admins;
    @Autowired MemberRepository members;
    @Autowired PasswordEncoder encoder;
    @Value("${kakao.maps.javascript-key}") String kakaoKey;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    @Test
    void anonymousLandingAndRoleHomeRedirects() throws Exception {
        String html = mvc.perform(get("/"))
                .andExpect(status().isOk()).andExpect(view().name("landing"))
                .andReturn().getResponse().getContentAsString();
        assertThat(html).contains("href=\"/admin/login\"", "href=\"/member/login\"", "href=\"/\"")
                .doesNotContain("home-map.js", "sdk.js", "id=\"map\"");
        mvc.perform(get("/").sessionAttr("loginAdminId", 1L))
                .andExpect(redirectedUrl("/admin/monitoring"));
        mvc.perform(get("/").sessionAttr("loginMemberId", 1L))
                .andExpect(redirectedUrl("/member"));
    }

    @Test
    void adminLoginReplacesMemberSessionAndOpensMonitoring() throws Exception {
        Admin admin = admins.save(new Admin("role-home-admin", encoder.encode("password")));
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("loginMemberId", 10L);
        mvc.perform(post("/admin/login").session(session)
                        .param("loginId", admin.getLoginId()).param("password", "password"))
                .andExpect(redirectedUrl("/admin/monitoring"));
        assertThat(session.getAttribute("loginAdminId")).isEqualTo(admin.getAdminId());
        assertThat(session.getAttribute("loginMemberId")).isNull();
        mvc.perform(get("/member").session(session)).andExpect(redirectedUrl("/member/login"));
    }

    @Test
    void memberLoginReplacesAdminSessionAndKeepsMemberHome() throws Exception {
        Member member = members.save(new Member(987654, 1, "role-home-member", encoder.encode("password")));
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("loginAdminId", 10L);
        mvc.perform(post("/member/login").session(session)
                        .param("loginId", member.getLoginId()).param("password", "password"))
                .andExpect(redirectedUrl("/member"));
        assertThat(session.getAttribute("loginMemberId")).isEqualTo(member.getMemberId());
        assertThat(session.getAttribute("loginAdminId")).isNull();
        String html = mvc.perform(get("/member").session(session)).andExpect(status().isOk())
                .andExpect(view().name("member/home")).andReturn().getResponse().getContentAsString();
        assertThat(html).contains("id=\"calendar\"", "id=\"schedule-data\"", "id=\"schedule-detail\"",
                "MY CALENDAR", "나의 달력", "SELECTED SCHEDULE", "일정을 선택해 주세요.")
                .doesNotContain("PARTICIPANT", "나의 일정", "참가자님의 일정을 확인해 주세요.", "landing.js");
        String header = html.substring(html.indexOf("<header"), html.indexOf("</header>"));
        assertThat(header).contains("href=\"/member\"", "href=\"/member/logout\"")
                .doesNotContain("/admin", "/member/login");
        mvc.perform(get("/admin").session(session)).andExpect(redirectedUrl("/admin/login"));
        mvc.perform(get("/admin/monitoring").session(session)).andExpect(redirectedUrl("/admin/login"));
        mvc.perform(get("/member/logout").session(session)).andExpect(redirectedUrl("/"));
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    void monitoringRequiresAdminAndRetainsModelAndScripts() throws Exception {
        mvc.perform(get("/admin/monitoring")).andExpect(redirectedUrl("/admin/login"));
        String html = mvc.perform(get("/admin/monitoring").sessionAttr("loginAdminId", 1L))
                .andExpect(status().isOk()).andExpect(view().name("home"))
                .andExpect(model().attributeExists("sites"))
                .andExpect(model().attribute("kakaoMapsJavaScriptKey", kakaoKey))
                .andReturn().getResponse().getContentAsString();
        assertThat(html).contains("id=\"siteSelect\"", "id=\"map\"", "id=\"analysisModal\"",
                "id=\"spotInformationPanel\"", "href=\"/admin/monitoring\"");
        String header = html.substring(html.indexOf("<header"), html.indexOf("</header>"));
        assertThat(header).contains("href=\"/admin/monitoring\"", "href=\"/admin\"", "href=\"/admin/logout\"")
                .doesNotContain("/member", "/admin/login");
        assertThat(html).doesNotContain("landing.js");
        assertThat(html).contains("sdk.js", "home-survey-analysis.js", "home-map.js");
        assertThat(html.indexOf("sdk.js")).isLessThan(html.indexOf("home-survey-analysis.js"));
        assertThat(html.indexOf("home-survey-analysis.js")).isLessThan(html.indexOf("home-map.js"));
    }

    @Test
    void loginPagesRenderAnonymousHeaderAndMemberFailureMessage() throws Exception {
        for (String path : new String[]{"/admin/login", "/member/login"}) {
            String html = mvc.perform(get(path)).andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            String header = html.substring(html.indexOf("<header"), html.indexOf("</header>"));
            assertThat(header).contains("href=\"/\"", "href=\"/admin/login\"", "href=\"/member/login\"")
                    .doesNotContain("/logout");
            assertThat(html).doesNotContain("home-map.js", "home-survey-analysis.js", "sdk.js", "landing.js");
        }
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("loginAdminId", 1L);
        String html = mvc.perform(post("/member/login").session(session)
                        .param("loginId", "missing-role-home-member").param("password", "wrong"))
                .andExpect(status().isOk()).andExpect(view().name("member/login"))
                .andExpect(model().attributeExists("errorMessage"))
                .andReturn().getResponse().getContentAsString();
        assertThat(html).contains("아이디 또는 비밀번호가 일치하지 않습니다.", "role=\"alert\"");
        assertThat(session.getAttribute("loginAdminId")).isEqualTo(1L);
        assertThat(session.getAttribute("loginMemberId")).isNull();
    }

    @Test
    void everyServiceTemplateIncludesHeaderAndFragmentContainsNoMapScripts() throws Exception {
        Path templates = Path.of("src/main/resources/templates");
        assertThat(Files.readString(templates.resolve("fragments/header.html")))
                .contains("th:fragment=\"header\"")
                .doesNotContain("<script", "sdk.js", "home-map.js", "home-survey-analysis.js");
        try (var paths = Files.walk(templates)) {
            for (Path path : paths.filter(p -> p.toString().endsWith(".html"))
                    .filter(p -> !p.startsWith(templates.resolve("fragments"))).toList()) {
                assertThat(Files.readString(path)).as(path.toString())
                        .contains("th:replace=\"~{fragments/header :: header}\"");
            }
        }
    }
    @Test
    void landingStoryUsesHeaderLoginAndPhotoOnlyClosingSection() throws Exception {
        String html = mvc.perform(get("/")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String header = html.substring(html.indexOf("<header"), html.indexOf("</header>"));
        String hero = html.substring(html.indexOf("<section"), html.indexOf("</section>"));
        String cta = html.substring(html.indexOf("<section class=\"landing-section landing-final-cta"), html.indexOf("</main>"));
        assertThat(header).contains("href=\"/admin/login\"", "href=\"/member/login\"", "href=\"/\"");
        assertThat(hero).contains("THERAPEUTIC GARDEN", "공간이", "SCROLL TO EXPLORE")
                .doesNotContain("/admin/login", "/member/login");
        assertThat(cta).contains("/images/landing/HS3_1.png", "치유 공간의", "경험을 확인하세요.")
                .doesNotContain("<a ", "<button", "<nav", "/admin/login", "/member/login");
        String experience = html.substring(html.indexOf("<section class=\"landing-section landing-connection"),
                html.indexOf("<section class=\"landing-section landing-final-cta"));
        assertThat(experience).contains("/images/landing/HS4_2.jpg")
                .doesNotContain("/images/landing/HS2_4.png", "/images/landing/HS4_3.jpg", "/images/landing/HS4_4.png");
        assertThat(html).contains("THERAPEUTIC SPACE", "MONITORING", "SPACE STRUCTURE",
                "EXPERIENCE &amp; DATA", "THERAPEUTIC GARDEN MONITORING", "src=\"/js/landing.js\"")
                .doesNotContain("<video", "<iframe", "<footer", "SIGBRAIN");
        assertThat(hero).contains("/images/landing/HS2_3.jpeg")
                .doesNotContain("HC-A", "HC-B", "HS1", "HS2</span>", "공간 구조 개념도");
        var images = java.util.regex.Pattern.compile("<img[^>]+src=\"([^\"]+)\"").matcher(html);
        int spacePhotos = 0;
        while (images.find()) {
            String source = images.group(1);
            assertThat(source).startsWith("/images/");
            assertThat(Files.isRegularFile(Path.of("src/main/resources/static" + source))).isTrue();
            if (source.startsWith("/images/landing/")) spacePhotos++;
        }
        assertThat(spacePhotos).isBetween(3, 5);
        var ids = java.util.regex.Pattern.compile("\\bid=\"([^\"]+)\"").matcher(html);
        var uniqueIds = new java.util.HashSet<String>();
        while (ids.find()) assertThat(uniqueIds.add(ids.group(1))).as("unique id: " + ids.group(1)).isTrue();
        mvc.perform(get("/js/landing.js")).andExpect(status().isOk());
    }

    @Test
    void landingEnhancementIsIsolatedAndHasAccessibleFallbacks() throws Exception {
        Path resources = Path.of("src/main/resources");
        String js = Files.readString(resources.resolve("static/js/landing.js"));
        assertThat(js).contains("'IntersectionObserver' in window", "motion.matches", "showAll",
                "observer.disconnect()", "prefers-reduced-motion: reduce", "focusin");
        assertThat(Files.readString(resources.resolve("static/css/style.css")))
                .contains("@media (prefers-reduced-motion: reduce)", ".landing-reveal-enabled .landing-page");
        try (var paths = Files.walk(resources.resolve("templates"))) {
            for (Path path : paths.filter(p -> p.toString().endsWith(".html"))
                    .filter(p -> !p.getFileName().toString().equals("landing.html")).toList()) {
                assertThat(Files.readString(path)).as(path.toString()).doesNotContain("landing.js");
            }
        }
    }

}
