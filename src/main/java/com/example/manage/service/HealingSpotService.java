package com.example.manage.service;

import com.example.manage.domain.HealingCourse;
import com.example.manage.domain.HealingSpot;
import com.example.manage.repository.HealingSpotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HealingSpotService {

    private final HealingSpotRepository healingSpotRepository;

    public HealingSpot createHealingSpot(
            HealingCourse healingCourse,
            String code,
            String name,
            Double latitude,
            Double longitude
    ) {
        HealingSpot healingSpot = new HealingSpot(
                healingCourse,
                code,
                name,
                latitude,
                longitude
        );

        return healingSpotRepository.save(healingSpot);
    }

    public List<HealingSpot> findBySiteId(Long siteId) {
        return healingSpotRepository.findByHealingCourseSiteSiteId(siteId);
    }
}
