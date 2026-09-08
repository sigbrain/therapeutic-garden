package com.example.manage.service;

import com.example.manage.domain.HealingCourse;
import com.example.manage.domain.Site;
import com.example.manage.repository.HealingCourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HealingCourseService {

    private final HealingCourseRepository healingCourseRepository;

    public HealingCourse createHealingCourse(
            Site site,
            String code,
            String name,
            Double centerLatitude,
            Double centerLongitude,
            Double radius
    ) {
        HealingCourse healingCourse = new HealingCourse(
                site,
                code,
                name,
                centerLatitude,
                centerLongitude,
                radius
        );

        return healingCourseRepository.save(healingCourse);
    }

    public List<HealingCourse> findBySiteId(Long siteId) {
        return healingCourseRepository.findBySiteSiteId(siteId);
    }
}
