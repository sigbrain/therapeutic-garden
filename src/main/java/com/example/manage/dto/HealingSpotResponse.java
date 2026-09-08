package com.example.manage.dto;

import com.example.manage.domain.HealingSpot;
import lombok.Getter;

@Getter
public class HealingSpotResponse {

    private final Long spotId;
    private final String code;
    private final String name;
    private final Double latitude;
    private final Double longitude;

    private final Long courseId;
    private final String courseCode;
    private final String courseName;

    public HealingSpotResponse(HealingSpot healingSpot) {

        this.spotId = healingSpot.getSpotId();
        this.code = healingSpot.getCode();
        this.name = healingSpot.getName();
        this.latitude = healingSpot.getLatitude();
        this.longitude = healingSpot.getLongitude();

        this.courseId =
                healingSpot.getHealingCourse().getCourseId();

        this.courseCode =
                healingSpot.getHealingCourse().getCode();

        this.courseName =
                healingSpot.getHealingCourse().getName();
    }
}