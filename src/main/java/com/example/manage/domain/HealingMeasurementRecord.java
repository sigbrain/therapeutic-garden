package com.example.manage.domain;

import java.math.BigDecimal;
import java.time.LocalDate;

/** JDBC read model; explicit schema management prevents startup DDL for raw records. */
public record HealingMeasurementRecord(Long memberId, Long spotId, LocalDate measurementDate,
        String courseCode, BigDecimal baselineStress, BigDecimal stressPost,
        BigDecimal baselineEmotional, BigDecimal emotionalPost) {}
