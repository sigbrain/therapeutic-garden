package com.example.manage.repository;

import com.example.manage.domain.HealingMeasurementRecord;
import com.example.manage.healingeffect.RawMeasurementDatabaseImporter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ConnectionCallback;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class HealingMeasurementRepository {
    private final JdbcTemplate jdbc;

    public List<HealingMeasurementRecord> findMemberForSite(Long memberId, Long siteId) {
        boolean ready = Boolean.TRUE.equals(jdbc.execute((ConnectionCallback<Boolean>) RawMeasurementDatabaseImporter::schemaReady));
        if (!ready) return List.of();
        return jdbc.query("""
                select s.member_id, p.spot_id, s.measurement_date, c.code,
                       s.baseline_stress, p.stress_post, s.baseline_emotional, p.emotional_post
                from healing_measurement_session s
                join healing_spot_measurement p on p.session_id=s.id
                join healing_course c on c.course_id=s.course_id
                join healing_spot hs on hs.spot_id=p.spot_id
                join healing_course sc on sc.course_id=hs.course_id
                where s.member_id=? and c.site_id=? and sc.site_id=?
                order by s.measurement_date, s.source_row, p.spot_id
                """, (r, i) -> new HealingMeasurementRecord(r.getLong(1), r.getLong(2), r.getDate(3).toLocalDate(),
                r.getString(4), r.getBigDecimal(5), r.getBigDecimal(6), r.getBigDecimal(7), r.getBigDecimal(8)), memberId, siteId, siteId);
    }
}
