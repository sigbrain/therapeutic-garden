package com.example.manage.repository;

import com.example.manage.domain.HealingSpot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HealingSpotRepository
        extends JpaRepository<HealingSpot, Long> {

    /*
     * 특정 Site에 속한 HealingSpot들을 조회한다.
     *
     * HealingSpot은 Site를 직접 가지고 있지 않다.
     *
     * 관계가:
     *
     * HealingSpot
     *     ↓
     * HealingCourse
     *     ↓
     * Site
     *
     * 로 연결되어 있기 때문에
     * HealingCourse를 거쳐서 Site까지 찾아가야 한다.
     *
     *
     * 메서드 이름 해석:
     *
     * findByHealingCourseSiteSiteId
     *
     * findBy
     *   → 조건에 맞는 데이터를 조회한다.
     *
     * HealingCourse
     *   → HealingSpot 엔티티 안의
     *     private HealingCourse healingCourse;
     *     필드를 의미한다.
     *
     * Site
     *   → HealingCourse 엔티티 안의
     *     private Site site;
     *     필드를 의미한다.
     *
     * SiteId
     *   → Site 엔티티 안의
     *     private Long siteId;
     *     필드를 의미한다.
     *
     * 즉,
     *
     * HealingSpot
     *     .healingCourse
     *     .site
     *     .siteId
     *
     * 가 전달받은 siteId와 같은
     * HealingSpot들을 모두 조회한다.
     *
     * 예:
     *
     * findByHealingCourseSiteSiteId(1L)
     *
     * → Site ID가 1인 Site에 속한
     *   모든 HealingSpot 조회
     *
     * DB에서는 HealingSpot 테이블에 site_id가 직접 없으므로
     * HealingCourse와 JOIN해서 조회하는 형태가 된다.
     *
     * SQL 느낌:
     *
     * SELECT hs.*
     * FROM healing_spot hs
     * JOIN healing_course hc
     *     ON hs.course_id = hc.course_id
     * WHERE hc.site_id = 1;
     */
    List<HealingSpot> findByHealingCourseSiteSiteId(Long siteId);
}