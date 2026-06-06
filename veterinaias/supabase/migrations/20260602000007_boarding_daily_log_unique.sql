-- 20260602000007_boarding_daily_log_unique.sql
-- Bitácora de hotel: una entrada por día. Dedup previo (conserva la más reciente) y UNIQUE.

DELETE FROM boarding_daily_logs a
USING boarding_daily_logs b
WHERE a.visit_id = b.visit_id
  AND a.log_date = b.log_date
  AND a.created_at < b.created_at;

ALTER TABLE boarding_daily_logs
  ADD CONSTRAINT boarding_daily_logs_visit_day_unique UNIQUE (visit_id, log_date);
