package com.example.manage.repository;

import com.example.manage.domain.Schedule;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    // memberId가 일치하는 참가자의 Schedule들을 scheduleDate 오름차순으로 조회한다.
    @EntityGraph(attributePaths = "member")
    List<Schedule> findByMemberMemberIdOrderByScheduleDateAsc(Long memberId);
    @Override
    @EntityGraph(attributePaths = "member")
    List<Schedule> findAll(Sort sort);
}
