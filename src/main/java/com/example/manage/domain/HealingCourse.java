package com.example.manage.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
public class HealingCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long courseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id", nullable = false)
    private Site site;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    private Double centerLatitude;

    private Double centerLongitude;

    private Double radius;

    public HealingCourse(Site site, String code, String name, Double centerLatitude, Double centerLongitude, Double radius) {
        this.site = site;
        this.code = code;
        this.name = name;
        this.centerLatitude = centerLatitude;
        this.centerLongitude = centerLongitude;
        this.radius = radius;
    }
}
