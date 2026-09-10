package com.example.manage;

import com.example.manage.domain.*;
import com.example.manage.repository.*;
import com.example.manage.service.ScheduleService;
import com.example.manage.service.MemberService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ScheduleMigrationTests {

    @Autowired WebApplicationContext context;
    @Autowired ScheduleService service;
    @Autowired MemberService memberService;
    @Autowired MemberRepository members;
    @Autowired SiteRepository sites;
    @Autowired HealingCourseRepository courses;
    @Autowired HealingSpotRepository spots;
    @Autowired ScheduleRepository schedules;
    @Autowired ScheduleSpotRepository scheduleSpots;
    @Autowired EntityManager entityManager;

    private Member member;
    private Site site;
    private HealingCourse course;
    private HealingSpot first;
    private HealingSpot second;
    private final LocalDate date = LocalDate.of(2026, 9, 10);
    private final LocalTime time = LocalTime.of(9, 0);

    @BeforeEach
    void setUp() {
        member = members.save(new Member(100, 1, "test-member", "password"));
        site = sites.save(new Site("테스트 사이트", "주소", 37.0, 127.0, 3));
        course = courses.save(new HealingCourse(site, "COURSE-X", "새 코스", 37.0, 127.0, 50.0));
        first = spots.save(new HealingSpot(course, "SPOT-X", "첫 정원", 37.0, 127.0));
        second = spots.save(new HealingSpot(course, "SPOT-Y", "둘째 정원", 37.0, 127.0));
    }

    private Long create() {
        service.createSchedule(member.getMemberId(), date, site.getSiteId(), course.getCourseId(),
                first.getSpotId(), time, second.getSpotId(), time.plusMinutes(10), "맑음", 25.0, 50.0);
        entityManager.flush();
        return schedules.findAll().get(0).getScheduleId();
    }

    @Test
    void createReadUpdateAndDeleteKeepMasterData() {
        Long id = create();
        entityManager.clear();
        var response = service.findMemberScheduleDetail(id, member.getMemberId());
        assertThat(response.getCourseCode()).isEqualTo("COURSE-X");
        assertThat(response.getSiteName()).isEqualTo("테스트 사이트");
        assertThat(response.getSpots()).extracting("code").containsExactly("SPOT-X", "SPOT-Y");
        assertThat(service.findAllSchedules("date").get(0).getCourseId()).isEqualTo(course.getCourseId());
        assertThat(service.findScheduleByMemberId(member.getMemberId())).hasSize(1);
        assertThat(service.findMemberScheduleDetail(id, -1L)).isNull();

        HealingCourse otherCourse = courses.save(new HealingCourse(site, "OTHER", "다른 코스", 37.0, 127.0, 50.0));
        HealingSpot otherFirst = spots.save(new HealingSpot(otherCourse, "OTHER-1", "정원 1", 37.0, 127.0));
        HealingSpot otherSecond = spots.save(new HealingSpot(otherCourse, "OTHER-2", "정원 2", 37.0, 127.0));
        service.updateSchedule(id, member.getMemberId(), date.plusDays(1), site.getSiteId(), otherCourse.getCourseId(),
                otherSecond.getSpotId(), time, otherFirst.getSpotId(), time.plusMinutes(10), null, null, null);
        entityManager.flush();
        entityManager.clear();
        var updated = service.findScheduleResponse(id);
        assertThat(updated.getCourseCode()).isEqualTo("OTHER");
        assertThat(updated.getSpots()).extracting("code").containsExactly("OTHER-2", "OTHER-1");
        assertThat(updated.getScheduleDate()).isEqualTo(date.plusDays(1));
        service.deleteSchedule(id);
        entityManager.flush();
        assertThat(scheduleSpots.count()).isZero();
        assertThat(schedules.count()).isZero();
        assertThat(spots.count()).isEqualTo(4);
        assertThat(courses.count()).isEqualTo(2);
        assertThat(sites.count()).isEqualTo(1);
    }

    @Test
    void rejectsUnknownSpotAndMismatchedCourseOrSiteBeforeSaving() {
        assertThatThrownBy(() -> service.createSchedule(member.getMemberId(), date,
                site.getSiteId(), course.getCourseId(), -1L, time, second.getSpotId(), time, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.createSchedule(member.getMemberId(), date,
                site.getSiteId(), -1L, first.getSpotId(), time, second.getSpotId(), time, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.createSchedule(member.getMemberId(), date,
                -1L, course.getCourseId(), first.getSpotId(), time, second.getSpotId(), time, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(schedules.count()).isZero();
    }

    @Test
    void memberDeletionKeepsMasterData() {
        create();
        memberService.deleteMember(member.getMemberId());
        entityManager.flush();
        assertThat(scheduleSpots.count()).isZero();
        assertThat(schedules.count()).isZero();
        assertThat(spots.count()).isEqualTo(2);
        assertThat(courses.count()).isEqualTo(1);
        assertThat(sites.count()).isEqualTo(1);
    }
    @Test
    void rendersSchedulePagesAndRestoresInvalidForm() throws Exception {
        Long id = create();
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();
        for (String path : new String[]{"/admin/schedules", "/admin/schedules/new",
                "/admin/schedules/" + id, "/admin/schedules/" + id + "/edit"}) {
            mvc.perform(get(path).sessionAttr("loginAdminId", 1L)).andExpect(status().isOk());
        }
        mvc.perform(get("/member").sessionAttr("loginMemberId", member.getMemberId()))
                .andExpect(status().isOk());
        mvc.perform(get("/member/api/schedules/" + id).sessionAttr("loginMemberId", member.getMemberId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseCode").value("COURSE-X"))
                .andExpect(jsonPath("$.spots[0].code").value("SPOT-X"))
                .andExpect(jsonPath("$.course").doesNotExist())
                .andExpect(jsonPath("$.spots[0].spotNo").doesNotExist());
        mvc.perform(get("/api/sites/" + site.getSiteId() + "/spots"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].courseId").value(course.getCourseId()));
        for (String path : new String[]{"/admin/schedules/new", "/admin/schedules/" + id + "/edit"}) {
            mvc.perform(post(path).sessionAttr("loginAdminId", 1L)
                            .param("memberId", member.getMemberId().toString())
                            .param("scheduleDate", date.toString())
                            .param("siteId", site.getSiteId().toString())
                            .param("courseId", course.getCourseId().toString())
                            .param("firstSpotId", "-1")
                            .param("secondSpotId", second.getSpotId().toString())
                            .param("firstStartTime", "09:00").param("secondStartTime", "09:10"))
                    .andExpect(status().isOk())
                    .andExpect(model().attributeHasFieldErrors("scheduleForm", "firstSpotId"))
                    .andExpect(model().attributeExists("sites", "members"));
        }
    }

}
