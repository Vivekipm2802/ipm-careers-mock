-- Nov 2026 exam-style mock screen
-- tab switches counted during a mock attempt (shown on the result page)
alter table public.mock_plays add column if not exists tab_switches integer;
-- exam-screen picture (female / male) on the student profile
alter table public.student_profiles add column if not exists gender text;
