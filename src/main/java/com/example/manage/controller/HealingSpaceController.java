package com.example.manage.controller;

import com.example.manage.dto.HealingCourseResponse;
import com.example.manage.dto.HealingSpotResponse;
import com.example.manage.service.HealingCourseService;
import com.example.manage.service.HealingSpotService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/sites")
public class HealingSpaceController {

    private final HealingCourseService healingCourseService;
    private final HealingSpotService healingSpotService;


    /*
     * 특정 Site에 속한 HealingCourse 조회
     *
     * 예:
     * GET /api/sites/1/courses
     *
     * Entity를 그대로 반환하지 않고
     * 화면에 필요한 정보만 HealingCourseResponse DTO로 변환해서 반환한다.
     */
    @GetMapping("/{siteId}/courses")
    public List<HealingCourseResponse> getHealingCourses(
            @PathVariable Long siteId
    ) {

        return healingCourseService
                .findBySiteId(siteId)
                .stream()
                .map(HealingCourseResponse::new)
                .toList();
    }


    /*
     * 특정 Site에 속한 HealingSpot 조회
     *
     * 예:
     * GET /api/sites/1/spots
     */
    @GetMapping("/{siteId}/spots")
    public List<HealingSpotResponse> getHealingSpots(
            @PathVariable Long siteId
    ) {

        return healingSpotService
                .findBySiteId(siteId)
                .stream()
                .map(HealingSpotResponse::new)
                .toList();
    }
}