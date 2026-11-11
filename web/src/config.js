/* The Brighton College — central configuration.
   Luffy: fill these in when your new Google account + Supabase project are ready.
   Public-safe values only. The admin password is set on first visit to
   /secure-admin/ (stored hashed in that browser's localStorage) — it is
   never committed anywhere. */

export const SUPABASE_URL = 'https://vhmqofxciisnrxrzbovq.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobXFvZnhjaWlzbnJ4cnpib3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1OTg5NjksImV4cCI6MjEwODE3NDk2OX0.gLm7UZmhrQ3dWS4id-jrjni9OFnBc3QshqlObB1w-2I';

/* Supabase Storage — result pictures, gallery photos and news cover images
   upload straight to the buckets (results / gallery / news) using the SAME
   anon key above. No new keys needed. Free plan = 1GB, plenty for these
   small pictures (admin panel rejects files over 5MB).
   SUPABASE_STORAGE_OK is just a reminder flag: set true after the storage
   section of supabase/schema.sql has been run. */
export const SUPABASE_STORAGE_OK = true;

/* Google Drive — study material library.
   1. Put all notes / past papers in ONE Drive folder and share it
      ("Anyone with the link can view").
   2. Create an API key: Google Cloud Console → APIs & Services →
      Credentials → Create API key → enable "Google Drive API".
   3. Paste the key + the folder ID (the long ID in the folder's URL). */
export const DRIVE_API_KEY = 'AIzaSyBNYgDGeVAaziLh1NpMu1s5nvx4wT4TrKk';
export const DRIVE_FOLDER_ID = '1RelBjy9voLLcGwv91Y-sK5bazdvx8tLv';

export const WHATSAPP_NUMBER = '923179609048'; // college office WhatsApp

/* Set to true only after SUPABASE_URL + SUPABASE_ANON_KEY are filled and
   supabase/schema.sql has been run — the site then reads live data.
   Until then every page shows its friendly offline/demo state. */
export const BACKEND_LIVE = true;

export const ADMIN_PANEL_PATH = '/adminsecuresex/';

/* Cloudflare R2 — gallery / news / result photos.
   The admin panel uploads images through the brighton-upload Worker
   (it checks the admin password hash and writes to the R2 bucket
   brighton-college-media); the browser never holds R2 credentials.
   R2_PUBLIC_URL is where uploaded photos are served from. */
export const R2_UPLOAD_URL = 'https://brighton-upload.syedarmanishaq.workers.dev/';
export const R2_PUBLIC_URL = 'https://pub-657f762b08ff455cb0cff1c7f48b2217.r2.dev';

/* Countdown to the next admission/event deadline (homepage + admissions).
   Set `date` to an ISO date like '2026-08-15T09:00:00+05:00' to show it;
   leave empty ('') and the countdown hides itself. Auto-hides after the date. */
export const COUNTDOWN = {
  label_en: 'Scholarship Test',
  label_ur: 'اسکالرشپ ٹیسٹ',
  date: '',
  link: '/admissions',
};

/* Public site URL — used for canonical URLs, hreflang, sitemap and OG tags.
   Update this after deploy if the final domain differs. */
export const SITE_URL = 'https://brighton-college-website.vercel.app';

export const SITE = {
  name: 'The Brighton College of Science',
  shortName: 'The Brighton College',
  tagline: 'Brighten Your Future in Brighton',
  motto: 'Realizing dreams through the light of knowledge',
  address: 'KKS Plaza, Main Mardan Swabi Road, Shewa Adda, Near Police Station, Kalu Khan, Razzar, Swabi',
  phone: '0317-9609048 / 0314-9649602',
  email: 'infothebrightoncollege@gmail.com',
  website: 'www.thebrightoncollege.org',
  founded: '1st May 2023',
  board: 'Board of Intermediate & Secondary Education, Mardan',
  principalName: 'Mr. Fayoun Khan',
  principalTitle: 'PhD Research Scholar (Urdu)',
  coordinatorName: 'Mr. Imranullah',
  coordinatorTitle: 'M.Phil Physics',
};
