package com.example.manage.controller;

import com.example.manage.domain.Admin;
import com.example.manage.domain.Member;
import com.example.manage.domain.Schedule;
import com.example.manage.domain.ScheduleSpot;
import com.example.manage.dto.MemberEditForm;
import com.example.manage.dto.ScheduleForm;
import com.example.manage.dto.WeatherResult;
import com.example.manage.service.AdminService;
import com.example.manage.service.MemberService;
import com.example.manage.service.ScheduleService;
import com.example.manage.service.WeatherService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin")
public class AdminController {

    private final AdminService adminService;
    private final MemberService memberService;
    private final ScheduleService scheduleService;
    private final WeatherService weatherService;


    @GetMapping("/login")
    public String adminLogin() {
        return "admin/login";
    }


    @PostMapping("/login")
    public String adminLogin(
            @RequestParam String loginId,
            @RequestParam String password,
            HttpSession session,
            Model model
    ) {

        Admin admin =
                adminService.login(loginId, password);

        if (admin == null) {

            model.addAttribute(
                    "errorMessage",
                    "아이디 또는 비밀번호가 올바르지 않습니다."
            );

            return "admin/login";
        }

        session.setAttribute(
                "loginAdminId",
                admin.getAdminId()
        );

        return "redirect:/admin";
    }


    @GetMapping
    public String adminHome(
            HttpSession session
    ) {
        return "admin/home";
    }


    @GetMapping("/logout")
    public String adminLogout(
            HttpSession session
    ) {

        session.invalidate();

        return "redirect:/";
    }


    /* ================================
       참가자 목록
    ================================= */

    @GetMapping("/members")
    public String memberList(
            Model model
    ) {

        List<Member> members =
                memberService.findAllMembers();

        model.addAttribute(
                "members",
                members
        );

        return "admin/member-list";
    }


    /* ================================
       참가자 상세
    ================================= */

    @GetMapping("/members/{memberId}")
    public String memberDetail(
            @PathVariable Long memberId,
            Model model
    ) {

        Member member =
                memberService.findMember(memberId);

        if (member == null) {
            return "redirect:/admin/members";
        }


        /*
         * DB에는
         * [PHONE_REDACTED]
         *
         * 형태로 저장되어 있는 전화번호를
         * 화면에서는
         * [PHONE_REDACTED]
         *
         * 형태로 보여준다.
         */
        String formattedPhone =
                member.getPhone();

        if (formattedPhone != null
                && formattedPhone.length() == 11) {

            formattedPhone =
                    formattedPhone.substring(0, 3)
                            + "-"
                            + formattedPhone.substring(3, 7)
                            + "-"
                            + formattedPhone.substring(7);
        }


        model.addAttribute(
                "member",
                member
        );

        model.addAttribute(
                "formattedPhone",
                formattedPhone
        );

        return "admin/member-detail";
    }


    /* ================================
       일정 등록 화면
    ================================= */

    @GetMapping("/schedules/new")
    public String scheduleForm(
            Model model
    ) {

        List<Member> members =
                memberService.findAllMembers();

        model.addAttribute(
                "members",
                members
        );

        model.addAttribute(
                "scheduleForm",
                new ScheduleForm()
        );

        return "admin/schedule-form";
    }


    /* ================================
       일정 등록
    ================================= */

    @PostMapping("/schedules/new")
    public String createSchedule(
            @Valid ScheduleForm form,
            BindingResult bindingResult,
            Model model
    ) {

        if (bindingResult.hasErrors()) {

            List<Member> members =
                    memberService.findAllMembers();

            model.addAttribute(
                    "members",
                    members
            );

            return "admin/schedule-form";
        }


        scheduleService.createSchedule(
                form.getMemberId(),
                form.getScheduleDate(),
                form.getCourse(),
                form.getFirstSpotNo(),
                form.getFirstStartTime(),
                form.getSecondSpotNo(),
                form.getSecondStartTime(),
                form.getWeather(),
                form.getTemperature(),
                form.getHumidity()
        );

        return "redirect:/admin";
    }


    /* ================================
       일정 목록
    ================================= */

    @GetMapping("/schedules")
    public String scheduleList(
            @RequestParam(
                    defaultValue = "date"
            ) String sort,
            Model model
    ) {

        /*
         * 정렬 기준
         *
         * date  = 일정 날짜순
         * group = 그룹순
         *
         * sort 파라미터가 없으면
         * 기본값은 date이다.
         */
        List<Schedule> schedules =
                scheduleService.findAllSchedules(sort);


        model.addAttribute(
                "schedules",
                schedules
        );


        /*
         * 현재 선택한 정렬 기준을
         * HTML select에 다시 전달한다.
         */
        model.addAttribute(
                "sort",
                sort
        );


        return "admin/schedule-list";
    }


    /* ================================
       일정 상세
    ================================= */

    @GetMapping("/schedules/{scheduleId}")
    public String scheduleDetail(
            @PathVariable Long scheduleId,
            @RequestParam(required = false) String from,
            Model model
    ) {

        Schedule schedule =
                scheduleService.findSchedule(scheduleId);

        if (schedule == null) {
            return "redirect:/admin/schedules";
        }


        List<ScheduleSpot> scheduleSpots =
                scheduleService.findScheduleSpots(
                        scheduleId
                );


        model.addAttribute(
                "schedule",
                schedule
        );

        model.addAttribute(
                "scheduleSpots",
                scheduleSpots
        );


        /*
         * 상세 페이지에 어디에서 들어왔는지 전달
         *
         * 일정 목록에서 들어온 경우:
         * from = null
         *
         * 달력에서 들어온 경우:
         * from = "calendar"
         */
        model.addAttribute(
                "from",
                from
        );


        return "admin/schedule-detail";
    }


    /* ================================
       일정 수정 화면
    ================================= */

    @GetMapping("/schedules/{scheduleId}/edit")
    public String editScheduleForm(
            @PathVariable Long scheduleId,
            @RequestParam(required = false) String from,
            Model model
    ) {

        Schedule schedule =
                scheduleService.findSchedule(scheduleId);

        if (schedule == null) {
            return "redirect:/admin/schedules";
        }


        List<ScheduleSpot> scheduleSpots =
                scheduleService.findScheduleSpots(
                        scheduleId
                );


        ScheduleForm form =
                new ScheduleForm();


        form.setMemberId(
                schedule.getMember().getMemberId()
        );

        form.setScheduleDate(
                schedule.getScheduleDate()
        );

        form.setCourse(
                schedule.getCourse()
        );

        form.setWeather(
                schedule.getWeather()
        );

        form.setTemperature(
                schedule.getTemperature()
        );

        form.setHumidity(
                schedule.getHumidity()
        );


        /*
         * 첫 번째 스팟
         */
        if (scheduleSpots.size() >= 1) {

            ScheduleSpot firstSpot =
                    scheduleSpots.get(0);

            form.setFirstSpotNo(
                    firstSpot.getSpotNo()
            );

            form.setFirstStartTime(
                    firstSpot.getStartTime()
            );
        }


        /*
         * 두 번째 스팟
         */
        if (scheduleSpots.size() >= 2) {

            ScheduleSpot secondSpot =
                    scheduleSpots.get(1);

            form.setSecondSpotNo(
                    secondSpot.getSpotNo()
            );

            form.setSecondStartTime(
                    secondSpot.getStartTime()
            );
        }


        List<Member> members =
                memberService.findAllMembers();


        model.addAttribute(
                "scheduleId",
                scheduleId
        );

        model.addAttribute(
                "scheduleForm",
                form
        );

        model.addAttribute(
                "members",
                members
        );

        model.addAttribute(
                "from",
                from
        );


        return "admin/schedule-edit";
    }


    /* ================================
       일정 수정
    ================================= */

    @PostMapping("/schedules/{scheduleId}/edit")
    public String updateSchedule(
            @PathVariable Long scheduleId,
            @RequestParam(required = false) String from,
            @Valid ScheduleForm form,
            BindingResult bindingResult,
            Model model
    ) {

        if (bindingResult.hasErrors()) {

            List<Member> members =
                    memberService.findAllMembers();

            model.addAttribute(
                    "scheduleId",
                    scheduleId
            );

            model.addAttribute(
                    "members",
                    members
            );

            model.addAttribute(
                    "from",
                    from
            );

            return "admin/schedule-edit";
        }


        scheduleService.updateSchedule(
                scheduleId,
                form.getMemberId(),
                form.getScheduleDate(),
                form.getCourse(),
                form.getFirstSpotNo(),
                form.getFirstStartTime(),
                form.getSecondSpotNo(),
                form.getSecondStartTime(),
                form.getWeather(),
                form.getTemperature(),
                form.getHumidity()
        );


        /*
         * 달력에서 들어와서 수정한 경우
         * 다시 상세 페이지에서도
         * from=calendar를 유지한다.
         */
        if ("calendar".equals(from)) {

            return "redirect:/admin/schedules/"
                    + scheduleId
                    + "?from=calendar";
        }


        return "redirect:/admin/schedules/"
                + scheduleId;
    }


    /* ================================
       일정 삭제
    ================================= */

    @PostMapping("/schedules/{scheduleId}/delete")
    public String deleteSchedule(
            @PathVariable Long scheduleId
    ) {

        scheduleService.deleteSchedule(
                scheduleId
        );

        return "redirect:/admin/schedules";
    }


    /* ================================
       참가자 수정 화면
    ================================= */

    @GetMapping("/members/{memberId}/edit")
    public String editMemberForm(
            @PathVariable Long memberId,
            Model model
    ) {

        Member member =
                memberService.findMember(memberId);

        if (member == null) {
            return "redirect:/admin/members";
        }


        MemberEditForm form =
                new MemberEditForm();


        form.setParticipantNo(
                member.getParticipantNo()
        );

        form.setGroupNo(
                member.getGroupNo()
        );

        form.setLoginId(
                member.getLoginId()
        );

        form.setName(
                member.getName()
        );


        /*
         * 수정 화면에서도 전화번호를
         * [PHONE_REDACTED] 형태로 보여준다.
         */
        String phone =
                member.getPhone();

        if (phone != null
                && phone.length() == 11) {

            phone =
                    phone.substring(0, 3)
                            + "-"
                            + phone.substring(3, 7)
                            + "-"
                            + phone.substring(7);
        }

        form.setPhone(phone);


        model.addAttribute(
                "memberId",
                memberId
        );

        model.addAttribute(
                "memberEditForm",
                form
        );


        return "admin/member-edit";
    }


    /* ================================
       참가자 수정
    ================================= */

    @PostMapping("/members/{memberId}/edit")
    public String updateMember(
            @PathVariable Long memberId,
            @Valid MemberEditForm form,
            BindingResult bindingResult,
            Model model
    ) {

        /*
         * Validation 실패
         */
        if (bindingResult.hasErrors()) {

            model.addAttribute(
                    "memberId",
                    memberId
            );

            return "admin/member-edit";
        }


        String result =
                memberService.updateMember(
                        memberId,
                        form.getParticipantNo(),
                        form.getGroupNo(),
                        form.getLoginId(),
                        form.getName(),
                        form.getPhone()
                );


        /*
         * 참가자 번호 중복
         */
        if (result.equals(
                "PARTICIPANT_NO_DUPLICATE"
        )) {

            model.addAttribute(
                    "errorMessage",
                    "이미 사용 중인 참가자 번호입니다."
            );

            model.addAttribute(
                    "memberId",
                    memberId
            );

            return "admin/member-edit";
        }


        /*
         * 로그인 아이디 중복
         */
        if (result.equals(
                "LOGIN_ID_DUPLICATE"
        )) {

            model.addAttribute(
                    "errorMessage",
                    "이미 사용 중인 로그인 아이디입니다."
            );

            model.addAttribute(
                    "memberId",
                    memberId
            );

            return "admin/member-edit";
        }


        /*
         * 참가자를 찾을 수 없는 경우
         */
        if (result.equals(
                "MEMBER_NOT_FOUND"
        )) {

            return "redirect:/admin/members";
        }


        /*
         * 정상적으로 수정된 경우
         */
        return "redirect:/admin/members/"
                + memberId;
    }


    /* ================================
       참가자 삭제
    ================================= */

    @PostMapping("/members/{memberId}/delete")
    public String deleteMember(
            @PathVariable Long memberId
    ) {

        memberService.deleteMember(
                memberId
        );

        return "redirect:/admin/members";
    }


    /* ================================
       날씨 조회 API
    ================================= */

    @GetMapping("/weather")
    @ResponseBody
    public WeatherResult getWeather(
            @RequestParam LocalDate date,
            @RequestParam LocalTime time
    ) {

        return weatherService.getWeather(
                date,
                time
        );
    }


    /* ================================
       관리자 일정 달력
    ================================= */

    @GetMapping("/schedules/calendar")
    public String scheduleCalendar(
            Model model
    ) {

        List<Schedule> schedules =
                scheduleService.findAllSchedules();

        model.addAttribute(
                "schedules",
                schedules
        );

        return "admin/schedule-calendar";
    }
}