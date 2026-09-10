package com.example.manage.repository;

import com.example.manage.domain.ScheduleSpot;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduleSpotRepository extends JpaRepository<ScheduleSpot, Long> {

    // 해당 scheduleId에 속한 스팟을 sequence가 작은 순서대로 조회한다.
    @EntityGraph(attributePaths = {"healingSpot.healingCourse.site"})
    List<ScheduleSpot> findByScheduleScheduleIdOrderBySequenceAsc(Long scheduleId);

    @EntityGraph(attributePaths = {"healingSpot.healingCourse.site"})
    List<ScheduleSpot> findByScheduleScheduleIdInOrderBySequenceAsc(List<Long> scheduleIds);

    void deleteByScheduleScheduleId(Long scheduleId);
}
