-- Explicitly reviewed, local-only schema preparation. Never executed at application startup.
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
