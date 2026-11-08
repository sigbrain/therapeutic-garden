-- New local DB only, after the generated accounts SQL. No concurrent writers.
-- Guard every INSERT with the same preflight; a second execution makes no changes.
START TRANSACTION;
SET @seed_ok =
 (SELECT COUNT(*) FROM admin) = 1 AND (SELECT COUNT(*) FROM admin WHERE admin_id=1 AND login_id='admin') = 1
 AND (SELECT COUNT(*) FROM member) = 12
 AND (SELECT COUNT(*) FROM member WHERE member_id BETWEEN 1 AND 11 AND participant_no=member_id AND login_id=CONCAT('p', LPAD(member_id, 3, '0')) AND test_account=b'0') = 11
 AND (SELECT COUNT(*) FROM member WHERE member_id=900004 AND participant_no=900004 AND login_id='test004' AND test_account=b'1' AND analysis_reference_member_id=4) = 1
 AND NOT EXISTS (SELECT 1 FROM site) AND NOT EXISTS (SELECT 1 FROM healing_course)
 AND NOT EXISTS (SELECT 1 FROM healing_spot) AND NOT EXISTS (SELECT 1 FROM site_image)
 AND NOT EXISTS (SELECT 1 FROM healing_spot_image) AND NOT EXISTS (SELECT 1 FROM site_image_spot_position)
 AND NOT EXISTS (SELECT 1 FROM schedule) AND NOT EXISTS (SELECT 1 FROM schedule_spot)
 AND NOT EXISTS (SELECT 1 FROM healing_spot_effect_summary) AND NOT EXISTS (SELECT 1 FROM member_healing_spot_effect_summary)
 AND NOT EXISTS (SELECT 1 FROM healing_effect_import_batch) AND NOT EXISTS (SELECT 1 FROM healing_measurement_import_batch)
 AND NOT EXISTS (SELECT 1 FROM healing_measurement_session) AND NOT EXISTS (SELECT 1 FROM healing_spot_measurement)
 AND NOT EXISTS (SELECT 1 FROM personal_eeg_analysis_batch) AND NOT EXISTS (SELECT 1 FROM personal_eeg_analysis_session)
 AND NOT EXISTS (SELECT 1 FROM personal_eeg_spot_result) AND NOT EXISTS (SELECT 1 FROM personal_eeg_active_version);
INSERT INTO site (site_id, name, address, latitude, longitude, map_level, spatial_revision)
 SELECT 1, 'Synthetic Garden', 'Fictional address', 37.5665, 126.9780, 5, 0 WHERE @seed_ok;
INSERT INTO healing_course (course_id, site_id, code, name, center_latitude, center_longitude, radius)
 SELECT 1, 1, 'DEMO-C1', 'Synthetic Course', 37.5665, 126.9780, 150 WHERE @seed_ok;
INSERT INTO healing_spot (spot_id, course_id, code, name, latitude, longitude)
 SELECT 1, 1, 'DEMO-S1', 'Synthetic Spot A', 37.5666, 126.9780 WHERE @seed_ok
 UNION ALL SELECT 2, 1, 'DEMO-S2', 'Synthetic Spot B', 37.5664, 126.9782 WHERE @seed_ok;
INSERT INTO schedule (schedule_id, member_id, schedule_date, weather, temperature, humidity)
 SELECT member_id, member_id, '2030-05-01', 'Synthetic', 20, 50 FROM member WHERE @seed_ok;
INSERT INTO schedule_spot (schedule_spot_id, schedule_id, spot_id, start_time, sequence)
 SELECT member_id * 2 - 1, member_id, 1, '10:00:00', 1 FROM member WHERE @seed_ok
 UNION ALL SELECT member_id * 2, member_id, 2, '10:30:00', 2 FROM member WHERE @seed_ok;
COMMIT;
SELECT IF(@seed_ok, 'Synthetic data inserted', 'No changes: preconditions not met') AS result;
