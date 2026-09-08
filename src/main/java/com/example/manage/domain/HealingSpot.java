package com.example.manage.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
public class HealingSpot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long spotId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private HealingCourse healingCourse;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    public HealingSpot(HealingCourse healingCourse, String code, String name, Double latitude, Double longitude) {
        this.healingCourse = healingCourse;
        this.code = code;
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
    }
}
