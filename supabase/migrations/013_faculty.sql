-- 013_faculty.sql
-- Faculty & Staff table for the /faculty page.
-- RUN ONCE in the Supabase dashboard (SQL editor) — the anon key cannot
-- run DDL. Until this is run, the public /faculty page shows its empty
-- state and the admin Faculty tab shows "No entries yet" (both handle
-- the missing table gracefully); after it is run, the page shows the
-- staff below and the admin can add more, edit them, or upload their
-- photos. Re-running is safe: the seed inserts only names that are not
-- already there.
--
-- RLS follows the same pattern as the other admin-managed tables
-- (toppers, news_posts, gallery_media, ...): public read + anon write.
-- Like them, "anon write" means the admin password gates only the
-- panel UI, not the data itself.
--
-- Photos: ONLY the principal's photo is seeded — it is the one HD
-- portrait (480x485, /faculty/fayoun-khan.jpg). The other 23 staff
-- photos that used to ship with the site were 107x80 thumbnails
-- (~5KB each) — visibly blurry at any real size — and were removed
-- from the site on 2026-11-24 by the user's order. The admin uploads
-- clear portraits for them through the Faculty tab (R2, imageupload).
-- Rows without a photo show a large initial circle on the page.

create table if not exists faculty (
  id uuid primary key default gen_random_uuid(),
  college_id uuid,
  name text not null,
  role text not null default 'Lecturer',  -- e.g. 'Principal', 'Lecturer', 'Clerk'
  subject text,                           -- e.g. 'Physics' — the subject they teach
  field text,                             -- e.g. 'Pre-Medical' — the field they lecture in
  qualifications text,                    -- e.g. 'M.Phil Physics', 'PhD Research Scholar (Urdu)'
  bio text,                               -- short description, set from the admin panel
  photo_url text,                         -- R2 upload (/faculty/...) or /faculty/*.jpg
  display_order int not null default 0,   -- 1 = featured (the principal) on the page
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table faculty enable row level security;

drop policy if exists "public read" on faculty;
create policy "public read" on faculty for select using (true);

drop policy if exists "anon write" on faculty;
create policy "anon write" on faculty for all using (true) with check (true);

-- Seed: the real teaching + support staff, exactly as listed in the
-- college's own prospectus (previously hardcoded in web/src/data/college.js
-- as FACULTY). Names, roles and qualifications are the prospectus facts;
-- subject / field / bio are left NULL for the admin to fill in, and only
-- the principal carries a photo (see the note above).
insert into faculty (name, role, qualifications, photo_url, display_order, published)
select * from (values
  ('Mr. Fayoun Khan', 'Principal', 'PhD Research Scholar (Urdu)', '/faculty/fayoun-khan.jpg', 1, true),
  ('Mr. Imranullah', 'Academic Coordinator & Lecturer', 'M.Phil Physics', null, 2, true),
  ('Mr. M. Idrees', 'Controller of Examination & Lecturer', 'M.Phil Zoology', null, 3, true),
  ('Mr. Syed Akif Hussain', 'Lecturer', 'BS Physics', null, 4, true),
  ('Mr. Asad Ali', 'Lecturer', 'M.Phil Chemistry', null, 5, true),
  ('Mr. Umar Raheem', 'Lecturer', 'BS Physics', null, 6, true),
  ('Mr. Zakarya Akmal', 'Lecturer', 'M.Phil Chemistry', null, 7, true),
  ('Mr. Ihsan Ali', 'Lecturer', 'M.Phil English', null, 8, true),
  ('Mr. Mudassir Khan', 'Lecturer', 'BS English', null, 9, true),
  ('Mr. M. Uzair Khalid', 'Lecturer', 'M.Phil Mathematics', null, 10, true),
  ('Miss Nazia Hassan', 'Section In-Charge (Girls)', 'MA International Relations', null, 11, true),
  ('Mr. M. Ismail', 'Lecturer', 'MA Urdu / Pak Study', null, 12, true),
  ('Mr. Dastar Ali', 'Lecturer', 'MA Urdu', null, 13, true),
  ('Mr. Haroon Ur Rasheed', 'Lecturer', 'MA Urdu', null, 14, true),
  ('Mufti Sikandar Hayat', 'Lecturer', 'MA Islamiyat / Arabic', null, 15, true),
  ('Mufti Zain ul Abideen', 'Lecturer', 'MA Islamiyat / Arabic', null, 16, true),
  ('Mufti M. Sulaiman', 'Lecturer', 'MA Islamiyat & Arabic', null, 17, true),
  ('Mr. M. Aamir', 'Discipline In-Charge & Lecturer', 'M.Phil Mathematics', null, 18, true),
  ('Mr. Ihsanullah', 'Lecturer', 'BS Computer Science', null, 19, true),
  ('Mr. Aman Ali', 'President BLS & Lecturer', 'M.Phil English', null, 20, true),
  ('Mr. Saadi Hassan', 'Computer Operator', 'BS Computer Science', null, 21, true),
  ('Mr. M. Zahid', 'Clerk', 'MA Urdu', null, 22, true),
  ('Mr. Abdul Mustan', 'Care Taker', 'FA (Army Rtd.)', null, 23, true),
  ('Mr. Muhammad Fayaz', 'Physical Instructor', null, null, 24, true)
) as v(name, role, qualifications, photo_url, display_order, published)
where not exists (select 1 from faculty f where f.name = v.name);
