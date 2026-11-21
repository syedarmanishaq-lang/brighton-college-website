-- 012_toppers.sql
-- Toppers / Hall of Fame table for the /toppers page.
-- RUN ONCE in the Supabase dashboard (SQL editor) — the anon key cannot
-- run DDL. Until this is run, the public /toppers page shows its empty
-- state and the admin Toppers tab shows "No entries yet" (both handle
-- the missing table gracefully); after it is run, the page shows the
-- toppers below and the admin can add more. Re-running is safe: the
-- seed row inserts only if it is not already there.
--
-- RLS follows the same pattern as the other admin-managed tables
-- (news_posts, gallery_media, ...): public read + anon write. Like
-- them, "anon write" means the admin password gates only the panel UI,
-- not the data itself.

create table if not exists toppers (
  id uuid primary key default gen_random_uuid(),
  college_id uuid,
  name text,                                -- NULL when the name is not confirmed yet
  category text not null default 'MDCAT', -- 'MDCAT' | 'Board'
  achievement text not null default '',   -- e.g. 'MDCAT 2026 Qualifier'
  marks text,                              -- e.g. '171' (shown exactly as typed)
  marks_label text,                        -- e.g. 'MDCAT'
  secondary_text text,                     -- e.g. 'F.Sc 1129' or 'Computer Science'
  position text,                           -- e.g. '3rd Position' — ONLY when verified
  year int,                                -- NULL when the year is not confirmed yet
  photo_url text,
  video_url text,
  display_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table toppers enable row level security;

drop policy if exists "public read" on toppers;
create policy "public read" on toppers for select using (true);

drop policy if exists "anon write" on toppers;
create policy "anon write" on toppers for all using (true) with check (true);

-- First verified topper. Source: the college's own public gallery video
-- "MDCAT Topper Celebration" (Drive file 17qy7ZK-Lf1aeTokWq-8hGJoiyJQpTO6n).
-- The badge burned into the video reads "MUNAZZA HAMID | MDCAT 171 |
-- F.Sc 1129", and the gallery caption reads "MDCAT 2026 Qualifier —
-- Munazza Hamid". No position is claimed: she is a qualifier, not a
-- position holder. The photo is a still from that same video, stored
-- on R2 (toppers/munazza-hamid.jpg).
insert into toppers
  (name, category, achievement, marks, marks_label, secondary_text, position, year, photo_url, video_url, display_order, published)
select
  'Munazza Hamid', 'MDCAT', 'MDCAT 2026 Qualifier', '171', 'MDCAT', 'F.Sc 1129', null, 2026,
  'https://pub-657f762b08ff455cb0cff1c7f48b2217.r2.dev/toppers/munazza-hamid.jpg',
  'https://drive.google.com/file/d/17qy7ZK-Lf1aeTokWq-8hGJoiyJQpTO6n/view',
  1, true
where not exists (select 1 from toppers where name = 'Munazza Hamid' and year = 2026);

-- Second verified topper, from the college itself (told by the user
-- 2026-11-21 21:58): 3rd Position, Mardan Board, Computer Science.
-- The NAME is verified from the college's own public gallery video
-- "Campus Life" (Drive file 1m9xrHNKOCL91BcuHblt_vo_FI_cPoLQb):
-- the banner burned into the video reads "Arooha Gul / Third
-- position in BISEM", seen in frames at t≈0s, 15s, 30s and 45s and
-- confirmed on a 2x enlarged crop of the banner. BISEM = Board of
-- Intermediate and Secondary Education, Mardan. The year is NOT
-- stated anywhere in the video, so it is left NULL — never guessed.
-- Her photo is a still from that same video, stored on R2
-- (toppers/arooha-gul.jpg).
insert into toppers
  (name, category, achievement, marks, marks_label, secondary_text, position, year, photo_url, video_url, display_order, published)
select
  'Arooha Gul', 'Board', '3rd Position — BISEM Mardan', null, null, 'Computer Science', '3rd Position', null,
  'https://pub-657f762b08ff455cb0cff1c7f48b2217.r2.dev/toppers/arooha-gul.jpg',
  'https://drive.google.com/file/d/1m9xrHNKOCL91BcuHblt_vo_FI_cPoLQb/view',
  2, true
where not exists (select 1 from toppers where category = 'Board' and position = '3rd Position' and secondary_text = 'Computer Science');
