-- 014_result_sections.sql
-- Section (category) column on test_results.
-- The college has exactly TWO classes (11th, 12th) — never more. The
-- categories the admin creates (e.g. Al Baatani, Al Hitam) are SECTIONS
-- inside a class, not classes themselves: each class has many named
-- sections, and a result is published for one class + one section.
-- Sections are managed per class in the `result_sections` site setting
-- (JSON object {"11th": [...], "12th": [...]}); this column stores the
-- section a result belongs to.
-- The earlier flat `result_classes` setting stored categories at the
-- class level — that was the wrong place; no code reads it any more
-- (its orphan row in site_settings is harmless and can be deleted).
-- RUN ONCE in the Supabase dashboard (SQL editor), together with
-- migration 013 if that has not run yet. Until it runs, the admin
-- Results form and the public Results page simply hide the section
-- picker (results save and list without a section).
alter table test_results add column if not exists section text default '';
create index if not exists results_section_idx on test_results (class_level, section);
