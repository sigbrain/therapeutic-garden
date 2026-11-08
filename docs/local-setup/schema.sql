-- New, empty MySQL database only. Do not combine with existing schema or migration SQL.
-- No database selection, account creation, data, or destructive statements.
CREATE TABLE admin (
 admin_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 login_id VARCHAR(255) NOT NULL UNIQUE,
 password VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE member (
 member_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 participant_no INT NOT NULL UNIQUE,
 group_no INT NOT NULL,
 login_id VARCHAR(255) NOT NULL UNIQUE,
 password VARCHAR(255) NOT NULL,
 name VARCHAR(255), phone VARCHAR(255),
 test_account BIT(1) NOT NULL DEFAULT b'0',
 analysis_reference_member_id BIGINT,
 INDEX idx_member_analysis_reference (analysis_reference_member_id),
 CONSTRAINT fk_member_analysis_reference FOREIGN KEY (analysis_reference_member_id) REFERENCES member(member_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE site (
 site_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(255) NOT NULL UNIQUE,
 address VARCHAR(255) NOT NULL,
 latitude DOUBLE NOT NULL, longitude DOUBLE NOT NULL,
 map_level INT NOT NULL, spatial_revision BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE healing_course (
 course_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 site_id BIGINT NOT NULL, code VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL,
 center_latitude DOUBLE, center_longitude DOUBLE, radius DOUBLE,
 CONSTRAINT fk_course_site FOREIGN KEY (site_id) REFERENCES site(site_id)
) ENGINE=InnoDB;

CREATE TABLE healing_spot (
 spot_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 course_id BIGINT NOT NULL, code VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL,
 latitude DOUBLE NOT NULL, longitude DOUBLE NOT NULL,
 CONSTRAINT fk_spot_course FOREIGN KEY (course_id) REFERENCES healing_course(course_id)
) ENGINE=InnoDB;

CREATE TABLE site_image (
 image_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 object_key VARCHAR(512) NOT NULL, original_file_name VARCHAR(255), content_type VARCHAR(255),
 display_order INT NOT NULL, representative BIT(1) NOT NULL,
 site_id BIGINT NOT NULL, spatial_image BIT(1),
 CONSTRAINT uk_site_image_spatial UNIQUE (site_id, spatial_image),
 CONSTRAINT fk_site_image_site FOREIGN KEY (site_id) REFERENCES site(site_id)
) ENGINE=InnoDB;

CREATE TABLE healing_spot_image (
 image_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 object_key VARCHAR(512) NOT NULL, original_file_name VARCHAR(255), content_type VARCHAR(255),
 display_order INT NOT NULL, representative BIT(1) NOT NULL,
 spot_id BIGINT NOT NULL,
 CONSTRAINT fk_spot_image_spot FOREIGN KEY (spot_id) REFERENCES healing_spot(spot_id)
) ENGINE=InnoDB;

CREATE TABLE site_image_spot_position (
 position_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 site_image_id BIGINT NOT NULL, spot_id BIGINT NOT NULL,
 x_percent DECIMAL(7,4) NOT NULL, y_percent DECIMAL(7,4) NOT NULL,
 CONSTRAINT uk_image_spot_position UNIQUE (site_image_id, spot_id),
 CONSTRAINT ck_image_spot_position CHECK (x_percent BETWEEN 0 AND 100 AND y_percent BETWEEN 0 AND 100),
 CONSTRAINT fk_position_image FOREIGN KEY (site_image_id) REFERENCES site_image(image_id),
 CONSTRAINT fk_position_spot FOREIGN KEY (spot_id) REFERENCES healing_spot(spot_id)
) ENGINE=InnoDB;

CREATE TABLE schedule (
 schedule_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 member_id BIGINT NOT NULL, schedule_date DATE NOT NULL,
 weather VARCHAR(255), temperature DOUBLE, humidity DOUBLE,
 CONSTRAINT fk_schedule_member FOREIGN KEY (member_id) REFERENCES member(member_id)
) ENGINE=InnoDB;

CREATE TABLE schedule_spot (
 schedule_spot_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 schedule_id BIGINT NOT NULL, spot_id BIGINT NOT NULL,
 start_time TIME(6) NOT NULL, sequence INT NOT NULL,
 CONSTRAINT fk_schedule_spot_schedule FOREIGN KEY (schedule_id) REFERENCES schedule(schedule_id),
 CONSTRAINT fk_schedule_spot_spot FOREIGN KEY (spot_id) REFERENCES healing_spot(spot_id)
) ENGINE=InnoDB;

-- The following three tables match the current effect entities and their SQL.
CREATE TABLE healing_spot_effect_summary (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    spot_id BIGINT NOT NULL,
    stress_participant_count INT NOT NULL,
    stress_valid_session_count INT NOT NULL,
    stress_reduction_rate DECIMAL(38,18) NOT NULL,
    emotional_participant_count INT NOT NULL,
    emotional_valid_session_count INT NOT NULL,
    emotional_increase_rate DECIMAL(38,18) NOT NULL,
    participant_count INT NULL,
    total_experience_count INT NULL,
    stress_improved_count INT NULL,
    emotional_improved_count INT NULL,
    CONSTRAINT uk_spot_effect UNIQUE (spot_id),
    CONSTRAINT fk_effect_spot FOREIGN KEY (spot_id) REFERENCES healing_spot (spot_id)
) ENGINE=InnoDB;

CREATE TABLE member_healing_spot_effect_summary (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    member_id BIGINT NOT NULL,
    spot_id BIGINT NOT NULL,
    stress_valid_session_count INT NOT NULL,
    stress_reduction_rate DECIMAL(38,18) NOT NULL,
    emotional_valid_session_count INT NOT NULL,
    emotional_increase_rate DECIMAL(38,18) NOT NULL,
    total_experience_count INT NULL,
    stress_improved_count INT NULL,
    emotional_improved_count INT NULL,
    CONSTRAINT uk_member_spot_effect UNIQUE (member_id, spot_id),
    CONSTRAINT fk_member_effect_member FOREIGN KEY (member_id) REFERENCES member (member_id),
    CONSTRAINT fk_member_effect_spot FOREIGN KEY (spot_id) REFERENCES healing_spot (spot_id)
) ENGINE=InnoDB;

CREATE TABLE healing_effect_import_batch (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    source_sha256 VARCHAR(64) NOT NULL,
    source_filename VARCHAR(255) NOT NULL,
    imported_at DATETIME(6) NOT NULL,
    overall_summary_count INT NOT NULL,
    participant_summary_count INT NOT NULL,
    target_site_id BIGINT NOT NULL,
    CONSTRAINT uk_effect_import_sha UNIQUE (source_sha256)
) ENGINE=InnoDB;
-- target_site_id deliberately has no FK: retain the import audit after deletions.
-- MySQL DDL implicitly commits; schema preparation is separate from data import.

-- JDBC measurement tables.
CREATE TABLE healing_measurement_import_batch (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 source_sha256 VARCHAR(64) NOT NULL UNIQUE,
 source_filename VARCHAR(255) NOT NULL,
 target_site_id BIGINT NOT NULL,
 imported_at TIMESTAMP NOT NULL,
 session_count INT NOT NULL,
 measurement_count INT NOT NULL
);
CREATE TABLE healing_measurement_session (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 batch_id BIGINT NOT NULL,
 source_row INT NOT NULL,
 member_id BIGINT NOT NULL,
 course_id BIGINT NOT NULL,
 measurement_date DATE NOT NULL,
 experience VARCHAR(255) NOT NULL,
 baseline_stress DECIMAL(38,18),
 baseline_emotional DECIMAL(38,18),
 UNIQUE (batch_id, source_row),
 UNIQUE (member_id, measurement_date, course_id),
 FOREIGN KEY (batch_id) REFERENCES healing_measurement_import_batch(id),
 FOREIGN KEY (member_id) REFERENCES member(member_id) ON DELETE CASCADE,
 FOREIGN KEY (course_id) REFERENCES healing_course(course_id) ON DELETE CASCADE
);
CREATE TABLE healing_spot_measurement (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 session_id BIGINT NOT NULL,
 spot_id BIGINT NOT NULL,
 stress_post DECIMAL(38,18),
 emotional_post DECIMAL(38,18),
 UNIQUE (session_id, spot_id),
 FOREIGN KEY (session_id) REFERENCES healing_measurement_session(id) ON DELETE CASCADE,
 FOREIGN KEY (spot_id) REFERENCES healing_spot(spot_id) ON DELETE CASCADE
);

-- JDBC personal EEG tables.
CREATE TABLE personal_eeg_analysis_batch (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    source_sha256 VARCHAR(64) NOT NULL,
    source_filename VARCHAR(255) NOT NULL,
    version_label VARCHAR(64) NOT NULL,
    target_site_id BIGINT NOT NULL,
    imported_at TIMESTAMP NOT NULL,
    session_count INT NOT NULL,
    result_count INT NOT NULL,
    complete_count INT NOT NULL,
    post_missing_count INT NOT NULL,
    CONSTRAINT uk_personal_eeg_source UNIQUE (source_sha256),
    CONSTRAINT uk_personal_eeg_version UNIQUE (version_label),
    CONSTRAINT fk_personal_eeg_site FOREIGN KEY (target_site_id) REFERENCES site(site_id)
) ENGINE=InnoDB;

CREATE TABLE personal_eeg_analysis_session (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    batch_id BIGINT NOT NULL,
    source_row INT NOT NULL,
    member_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    source_date DATE NOT NULL,
    confirmed_date DATE NOT NULL,
    CONSTRAINT uk_personal_eeg_source_row UNIQUE (batch_id, source_row),
    CONSTRAINT uk_personal_eeg_source_session UNIQUE (batch_id, member_id, source_date, course_id),
    CONSTRAINT uk_personal_eeg_display_session UNIQUE (batch_id, member_id, confirmed_date, course_id),
    CONSTRAINT fk_personal_eeg_session_batch FOREIGN KEY (batch_id) REFERENCES personal_eeg_analysis_batch(id),
    CONSTRAINT fk_personal_eeg_session_member FOREIGN KEY (member_id) REFERENCES member(member_id) ON DELETE RESTRICT,
    CONSTRAINT fk_personal_eeg_session_course FOREIGN KEY (course_id) REFERENCES healing_course(course_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE personal_eeg_spot_result (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    spot_id BIGINT NOT NULL,
    baseline_stress DECIMAL(38,18) NOT NULL,
    stress_post DECIMAL(38,18) NULL,
    baseline_emotional DECIMAL(38,18) NOT NULL,
    emotional_post DECIMAL(38,18) NULL,
    CONSTRAINT uk_personal_eeg_session_spot UNIQUE (session_id, spot_id),
    CONSTRAINT ck_personal_eeg_post_pair CHECK ((stress_post IS NULL AND emotional_post IS NULL) OR (stress_post IS NOT NULL AND emotional_post IS NOT NULL)),
    CONSTRAINT fk_personal_eeg_result_session FOREIGN KEY (session_id) REFERENCES personal_eeg_analysis_session(id) ON DELETE CASCADE,
    CONSTRAINT fk_personal_eeg_result_spot FOREIGN KEY (spot_id) REFERENCES healing_spot(spot_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Exactly one personal analysis version can be active; no batch is activated by import.
CREATE TABLE personal_eeg_active_version (
    id TINYINT NOT NULL PRIMARY KEY,
    batch_id BIGINT NULL,
    activated_at TIMESTAMP NOT NULL,
    CONSTRAINT ck_personal_eeg_active_singleton CHECK (id = 1),
    CONSTRAINT uk_personal_eeg_active_batch UNIQUE (batch_id),
    CONSTRAINT fk_personal_eeg_active_batch FOREIGN KEY (batch_id) REFERENCES personal_eeg_analysis_batch(id)
) ENGINE=InnoDB;
