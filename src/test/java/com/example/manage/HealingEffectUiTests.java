package com.example.manage;

import com.example.manage.domain.*;
import com.example.manage.dto.HealingEffectView;
import com.example.manage.dto.MonitoringSpotEffectView;
import com.example.manage.repository.*;
import com.example.manage.service.HealingEffectQueryService;
import com.example.manage.healingeffect.HealingEffectExcelParser;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class HealingEffectUiTests {
    @Autowired WebApplicationContext context;
    @Autowired SiteRepository sites;
    @Autowired HealingCourseRepository courses;
    @Autowired HealingSpotRepository spots;
    @Autowired MemberRepository members;
    @Autowired HealingSpotEffectSummaryRepository overall;
    @Autowired MemberHealingSpotEffectSummaryRepository personal;
    @Autowired HealingEffectImportBatchRepository batches;
    @Autowired HealingEffectQueryService service;
    MockMvc mvc;
    Member partial, firstComplete, laterComplete;

    @BeforeEach void setup() { mvc = MockMvcBuilders.webAppContextSetup(context).build(); }

    void fixture() {
        var site = sites.save(new Site("effect-ui-site", "synthetic", 37.0, 127.0, 3));
        partial = members.save(new Member(1, 1, "secret-login-one", "unused", "비공개이름하나", "[PHONE_REDACTED]"));
        // Insertion/PK order intentionally differs from participantNo order.
        laterComplete = members.save(new Member(4, 1, "secret-login-four", "unused", "비공개이름넷", "[PHONE_REDACTED]"));
        firstComplete = members.save(new Member(2, 1, "secret-login-two", "unused", "비공개이름둘", "[PHONE_REDACTED]"));
        var courseNames = List.of("회복 코스", "감각 코스", "힐링 코스");
        HealingCourse course = null;
        for (int i = 0; i < 6; i++) {
            if (i % 2 == 0) course = courses.save(new HealingCourse(site, "HC-"+(char)('A'+i/2), courseNames.get(i/2), null,null,null));
            var spot = spots.save(new HealingSpot(course, "HS"+(i+1), HealingEffectExcelParser.NAMES.get(i),37.0,127.0));
            BigDecimal stress = new BigDecimal(i == 0 ? "19.500108327673271" : i == 5 ? "21.213120597090558" : "10.25");
            BigDecimal emotional = new BigDecimal(i == 0 ? "54.267121115714403" : i == 5 ? "200.422124968168790" : "30.25");
            overall.save(new HealingSpotEffectSummary(spot, 3, 5, stress, 3, 5, emotional));
            BigDecimal personalStress = new BigDecimal(i == 1 ? "-38.6" : i == 2 ? "0" : "10.5");
            BigDecimal personalEmotional = new BigDecimal(i == 4 ? "-6.5" : i == 3 ? "0" : "100.4");
            personal.save(new MemberHealingSpotEffectSummary(firstComplete,spot,2,personalStress,2,personalEmotional));
            personal.save(new MemberHealingSpotEffectSummary(laterComplete,spot,2,new BigDecimal("33.33"),2,new BigDecimal("44.44")));
            if(i < 4) personal.save(new MemberHealingSpotEffectSummary(partial,spot,2,BigDecimal.ZERO,2,new BigDecimal("-4.25")));
        }
        batches.save(new HealingEffectImportBatch("a".repeat(64), "synthetic-ui.xlsx", LocalDateTime.now(), 6, 16, site.getSiteId()));
        batches.flush();
    }

    @Test void homePublishesSixOverallAndAnonymousDtosWithoutIdentity() throws Exception {
        fixture();
        var result = mvc.perform(get("/")).andExpect(status().isOk())
                .andExpect(model().attributeExists("healingEffects", "effectsBySpot", "anonymousEffects"))
                .andReturn();
        var model = result.getModelAndView().getModel();
        @SuppressWarnings("unchecked") var data = (List<HealingEffectView>) model.get("healingEffects");
        assertThat(data).extracting(HealingEffectView::spotCode).containsExactly("HS1","HS2","HS3","HS4","HS5","HS6");
        assertThat(data.getFirst().stressReductionDisplay()).isEqualTo("19.5%");
        assertThat(data.getFirst().emotionalIncreaseDisplay()).isEqualTo("54.3%");
        assertThat(data.getLast().stressReductionDisplay()).isEqualTo("21.2%");
        assertThat(data.getLast().emotionalIncreaseDisplay()).isEqualTo("200.4%");
        String html = result.getResponse().getContentAsString();
        assertThat(html).contains("데이터 변화", "data-stress=\"19.5% 감소\"", "data-emotional=\"200.4% 증가\"",
                        "data-stress=\"-38.6\"", "data-stress-display=\"38.6% 증가\"",
                        "data-emotional=\"-6.5\"", "data-emotional-display=\"6.5% 감소\"",
                        "평균 스트레스 증감률", "PERSON / HEALING SPOT")
                .doesNotContain("P001", "P002", "P004", "participantNo", "memberId", "participantCode", "loginId",
                        "secret-login-one", "secret-login-two", "secret-login-four", "비공개이름하나", "비공개이름둘", "비공개이름넷",
                        "[PHONE_REDACTED]", "[PHONE_REDACTED]", "[PHONE_REDACTED]", "[PHONE_REDACTED]", "[PHONE_REDACTED]", "[PHONE_REDACTED]",
                        "참가자 예시", "-38.6% 감소", "-6.5% 증가",
                        "Baseline", "BEFORE &amp; AFTER", "stress-baseline", "stress-followup", "66.7% 증가", "landing-chart-line");
        assertThat(Arrays.stream(HealingEffectView.class.getRecordComponents()).map(c->c.getName()))
                .containsExactly("spotCode","spotName","stressReductionRate","stressReductionDisplay","stressChangeDisplay",
                        "emotionalIncreaseRate","emotionalIncreaseDisplay","emotionalChangeDisplay",
                        "stressValidSessionCount","emotionalValidSessionCount","hasMeasurement");
    }

    @Test void anonymousSelectionIsCompleteStableAndOrderedByParticipantNumber() {
        fixture();
        var example = service.findAnonymousExample();
        assertThat(example).hasSize(6).allSatisfy(e -> {
            assertThat(e.hasMeasurement()).isTrue();
            assertThat(e.stressChangeDisplay()).matches("10.5% 감소|38.6% 증가|0.0% 변화 없음");
            assertThat(e.emotionalChangeDisplay()).matches("100.4% 증가|6.5% 감소|0.0% 변화 없음");
        });
        assertThat(service.findAnonymousExample()).isEqualTo(example);
        personal.deleteByMemberMemberId(firstComplete.getMemberId()); personal.flush();
        assertThat(service.findAnonymousExample()).hasSize(6).allSatisfy(e->assertThat(e.stressReductionDisplay()).isEqualTo("33.3%"));
        personal.deleteByMemberMemberId(laterComplete.getMemberId()); personal.flush();
        assertThat(service.findAnonymousExample()).isEmpty();
    }

    @Test void adminMonitoringUsesOnlyOverallSummariesAndSpotSelection() throws Exception {
        fixture();
        var result = mvc.perform(get("/admin/monitoring").sessionAttr("loginAdminId", 1L))
                .andExpect(status().isOk())
                .andExpect(model().attributeExists("monitoringEffects"))
                .andExpect(model().attributeDoesNotExist("monitoringParticipants", "monitoringHistory"))
                .andReturn();
        @SuppressWarnings("unchecked")
        var bySite = (Map<String, List<MonitoringSpotEffectView>>) result.getModelAndView().getModel().get("monitoringEffects");
        var data = bySite.values().iterator().next();
        assertThat(data).hasSize(6);
        assertThat(data.getFirst().stressChangeDisplay()).isEqualTo("19.5% 감소");
        assertThat(data.getFirst().emotionalChangeDisplay()).isEqualTo("54.3% 증가");
        assertThat(data.getLast().stressChangeDisplay()).isEqualTo("21.2% 감소");
        assertThat(data.getLast().emotionalChangeDisplay()).isEqualTo("200.4% 증가");

        String html = result.getResponse().getContentAsString();
        assertThat(html).contains("스팟 설정", "HS 선택", "19.5% 감소", "54.3% 증가", "200.4% 증가",
                        "스트레스: 낮아질수록 개선", "정서적 안정성: 높아질수록 개선", "상세 분석 보기", "측정 데이터")
                .doesNotContain("Demo 데이터", "시연용 데이터", "id=\"metricSelect\"", "id=\"hcStress\"", "id=\"hcEmotional\"", ">ISI<", ">PSS<",
                        "P001", "P002", "P004", "participantSelect", "분석 대상", "monitoringHistory", "analysisHistorySection",
                        "1차", "2차", "3차", "4차", "5차", "방문 횟수", "<details id=\"analysisHistorySection\"");
    }

    @Test void participantHomeUsesOnlyAuthenticatedMembersSummaryAndHistory() throws Exception {
        fixture();
        var result = mvc.perform(get("/member").sessionAttr("loginMemberId", partial.getMemberId()))
                .andExpect(status().isOk()).andExpect(view().name("member/home"))
                .andExpect(model().attributeExists("spotEffects", "measurementHistory", "schedules"))
                .andReturn();
        @SuppressWarnings("unchecked") var effects = (List<HealingEffectView>) result.getModelAndView().getModel().get("spotEffects");
        assertThat(effects).extracting(HealingEffectView::spotCode).containsExactly("HS1", "HS2", "HS3", "HS4", "HS5", "HS6");
        assertThat(effects.getFirst().stressChangeDisplay()).isEqualTo("0.0% 변화 없음");
        assertThat(effects.get(4).hasMeasurement()).isFalse();
        String html = result.getResponse().getContentAsString();
        assertThat(html).contains("나의 치유 분석", "나의 공간별 치유 효과와 측정 변화를 확인합니다.",
                        "memberHealingEffects", "memberMeasurementHistory", "member-healing-analysis.js", "나의 달력")
                .doesNotContain("P002", "P004", "secret-login-two", "secret-login-four");
        assertThat(html.indexOf("나의 치유 분석")).isLessThan(html.indexOf("나의 달력"));
    }

    @Test void emptyDatabaseRendersHonestEmptyStates() throws Exception {
        String html = mvc.perform(get("/")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(html).contains("데이터 준비 중", "데이터 변화")
                .doesNotContain("data-stress=", "data-personal-spot=", "35% 감소", "29.2% 감소", "66.7% 증가");
    }

    @Test void absentOverallRowDoesNotFallBackToSample() throws Exception {
        fixture();
        overall.deleteAll(); overall.flush();
        String html = mvc.perform(get("/")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(html).contains("데이터 준비 중").doesNotContain("data-stress=\"35\"", "35% 감소");
    }

    @Test void removesRequestedHeroCopyEvenAcrossMarkupAndWhitespace() throws Exception {
        String html = mvc.perform(get("/")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String normalized = html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ");
        assertThat(normalized).doesNotContain("공간별 평균 변화와 한 참가자의 측정 전후를 함께 살펴봅니다.",
                "생체신호와 공간별 반응을 함께 살피며 치유효과를 모니터링합니다.",
                "모니터링한 생체신호와 공간별 치유효과를 바탕으로 개인에게 맞는 힐링코스를 제안합니다.");
    }

    @Test void adminMemberDetailShowsBasicInformationAndDataLinkWithoutEffects() throws Exception {
        fixture();
        String html = mvc.perform(get("/admin/members/" + partial.getMemberId()).sessionAttr("loginAdminId", 1L))
                .andExpect(status().isOk())
                .andExpect(model().attributeExists("member", "formattedPhone"))
                .andExpect(model().attributeDoesNotExist("spotEffects"))
                .andReturn().getResponse().getContentAsString();

        assertThat(html).contains("P001", "secret-login-one", "비공개이름하나", "[PHONE_REDACTED]",
                        "href=\"/admin/members/" + partial.getMemberId() + "/data\"", "데이터 보기",
                        "참가자 정보 수정", "참가자 삭제", "참가자 목록으로")
                .doesNotContain("스팟별 치유 효과", "member-effect-spot", "HS1 ·");
    }

    @Test void adminMemberDataShowsActualMemberAndSixSpotsIncludingMissingAndZero() throws Exception {
        fixture();
        var result = mvc.perform(get("/admin/members/" + partial.getMemberId() + "/data")
                        .sessionAttr("loginAdminId", 1L))
                .andExpect(status().isOk())
                .andExpect(view().name("admin/member-data"))
                .andExpect(model().attributeExists("member", "spotEffects", "measurementHistory"))
                .andReturn();
        @SuppressWarnings("unchecked") var views=(List<HealingEffectView>)result.getModelAndView().getModel().get("spotEffects");
        assertThat(views).extracting(HealingEffectView::spotCode).containsExactly("HS1","HS2","HS3","HS4","HS5","HS6");
        assertThat(views.getFirst().stressReductionDisplay()).isEqualTo("0.0%");
        assertThat(views.get(4).hasMeasurement()).isFalse();
        assertThat(views.get(5).stressReductionDisplay()).isEqualTo("측정 없음");
        String html=result.getResponse().getContentAsString();
        assertThat(html).contains("P001", "비공개이름하나", "참가자 데이터", "스팟별 치유 효과",
                        "평균 스트레스 증감률", "평균 정서적 안정성 증감률",
                        "0.0% 변화 없음", "측정 없음", "4.3% 감소", "memberMeasurementHistory", "measurement-history.js",
                        "href=\"/admin/members/" + partial.getMemberId() + "\"", "← 참가자 상세로")
                .doesNotContain("secret-login-one", "[PHONE_REDACTED]", "-4.3% 증가");
        assertThat(html.indexOf("HS1 ·")).isLessThan(html.indexOf("HS6 ·"));
    }

    @Test void adminEffectDetailRemainsProtected() throws Exception {
        fixture();
        for (String path : List.of(
                "/admin/members/" + partial.getMemberId(),
                "/admin/members/" + partial.getMemberId() + "/data")) {
            mvc.perform(get(path)).andExpect(redirectedUrl("/admin/login"));
            mvc.perform(get(path).sessionAttr("loginMemberId", partial.getMemberId()))
                    .andExpect(redirectedUrl("/admin/login"));
        }
    }

    @Test void metricSpecificDisplayFormattingPreservesRawSigns() {
        var positive = HealingEffectView.measured("HS1", "Spot", new BigDecimal("10.5"),
                new BigDecimal("100.4"), 1, 1);
        var negative = HealingEffectView.measured("HS2", "Spot", new BigDecimal("-38.6"),
                new BigDecimal("-6.5"), 1, 1);
        var zero = HealingEffectView.measured("HS3", "Spot", BigDecimal.ZERO, BigDecimal.ZERO, 1, 1);
        var missing = HealingEffectView.missing("HS4", "Spot");
        assertThat(positive.stressChangeDisplay()).isEqualTo("10.5% 감소");
        assertThat(positive.emotionalChangeDisplay()).isEqualTo("100.4% 증가");
        assertThat(negative.stressReductionRate()).isEqualByComparingTo("-38.6");
        assertThat(negative.emotionalIncreaseRate()).isEqualByComparingTo("-6.5");
        assertThat(negative.stressChangeDisplay()).isEqualTo("38.6% 증가");
        assertThat(negative.emotionalChangeDisplay()).isEqualTo("6.5% 감소");
        assertThat(zero.stressChangeDisplay()).isEqualTo("0.0% 변화 없음");
        assertThat(zero.emotionalChangeDisplay()).isEqualTo("0.0% 변화 없음");
        assertThat(missing.stressChangeDisplay()).isEqualTo("측정 없음");
        assertThat(missing.emotionalChangeDisplay()).isEqualTo("측정 없음");
    }
}
