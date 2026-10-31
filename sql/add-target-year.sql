-- 2026-10-31: target IPMAT year on the student profile (drives the study plan)
alter table public.student_profiles add column if not exists target_year integer;
