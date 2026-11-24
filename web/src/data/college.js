/* The Brighton College of Science — real college data from the official prospectus.
   Programs, fees, faculty and houses are the college's own published facts. */

/* Real programs (Board: BISE Mardan) — 11th & 12th, boys + girls sections. */
export const PROGRAMS = [
  {
    slug: 'pre-medical',
    name: 'Pre-Medical',
    classes: ['11th', '12th'],
    sections: ['Boys', 'Girls'],
    desc: 'Your path to MBBS, BDS and allied health sciences. Master Biology with weekly tests, monthly results and guidance from experienced teachers.',
    subjects: ['Physics', 'Chemistry', 'Biology', 'English', 'Urdu', 'Islamiat / Pak Studies'],
  },
  {
    slug: 'pre-engineering',
    name: 'Pre-Engineering',
    classes: ['11th', '12th'],
    sections: ['Boys', 'Girls'],
    desc: 'Built for future engineers. A mathematics-heavy track with practical lab work and teachers who track your progress every week.',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'English', 'Urdu', 'Islamiat / Pak Studies'],
  },
  {
    slug: 'general-science',
    name: 'General Science',
    classes: ['11th', '12th'],
    sections: ['Boys', 'Girls'],
    desc: 'The smart combination of physics, computer science and mathematics — ideal if you are aiming for CS, IT, software engineering or any modern tech degree.',
    subjects: ['Physics', 'Computer Science', 'Mathematics', 'English', 'Urdu', 'Islamiat / Pak Studies'],
  },
];

/* Fee payment plan from the prospectus — 5 easy installments (percent of total fee). */
export const INSTALLMENTS = [
  { no: '1st', pct: '30%', when: 'During admission' },
  { no: '2nd', pct: '20%', when: '1st week of October' },
  { no: '3rd', pct: '20%', when: '1st week of December' },
  { no: '4th', pct: '20%', when: '1st week of February' },
  { no: '5th', pct: '10%', when: '1st week of April' },
];

/* Scholarship admission test pattern (50 MCQs) from the prospectus. */
export const SCHOLARSHIP_TEST = [
  { subject: 'Physics', mcqs: 10 },
  { subject: 'Chemistry', mcqs: 10 },
  { subject: 'English', mcqs: 10 },
  { subject: 'Bio / Math', mcqs: 10 },
  { subject: 'Urdu', mcqs: 5 },
  { subject: 'General Knowledge', mcqs: 5 },
];

export const STATS = [
  { value: '2023', label: 'Established' },
  { value: '3', label: 'Study Programs' },
  { value: '24', label: 'Faculty Members' },
  { value: '2', label: 'Sections — Boys & Girls' },
];

/* House system — every student belongs to one of four houses. */
export const HOUSES = [
  { name: 'Khalid House', color: 'Light Blue', motto: 'Sharpening Minds, Igniting Brilliance', namedAfter: 'Khalid Bin Waleed — "The Sword of Allah", the renowned Arab general.' },
  { name: 'Qasim House', color: 'Red', motto: 'Conquer with Wisdom, Illuminate Tomorrow', namedAfter: 'Muhammad Bin Qasim — the young commander who led the conquest of Sindh.' },
  { name: 'Tipu House', color: 'Yellow', motto: 'Roaring Minds, Sparking Excellence', namedAfter: 'Tipu Sultan — "The Tiger of Mysore", known for courage and resistance.' },
  { name: 'Iqbal House', color: 'Green', motto: 'Enlightening Minds, Evoking Self Recognition', namedAfter: 'Allama Iqbal — the Poet of the East, inspiration of the Pakistan Movement.' },
];

/* Faculty — from the official prospectus. Photos cropped from the prospectus. */
export const FACULTY = [
  { name: 'Mr. Fayoun Khan', title: 'PhD Research Scholar (Urdu)', role: 'Principal', photo: 'fayoun-khan.jpg' },
  { name: 'Mr. Imranullah', title: 'M.Phil Physics', role: 'Academic Coordinator & Lecturer', photo: 'imranullah.jpg' },
  { name: 'Mr. M. Idrees', title: 'M.Phil Zoology', role: 'Controller of Examination & Lecturer', photo: 'm-idrees.jpg' },
  { name: 'Mr. Syed Akif Hussain', title: 'BS Physics', role: 'Lecturer', photo: 'syed-akif-hussain.jpg' },
  { name: 'Mr. Asad Ali', title: 'M.Phil Chemistry', role: 'Lecturer', photo: 'asad-ali.jpg' },
  { name: 'Mr. Umar Raheem', title: 'BS Physics', role: 'Lecturer', photo: 'umar-raheem.jpg' },
  { name: 'Mr. Zakarya Akmal', title: 'M.Phil Chemistry', role: 'Lecturer', photo: 'zakarya-akmal.jpg' },
  { name: 'Mr. Ihsan Ali', title: 'M.Phil English', role: 'Lecturer', photo: 'ihsan-ali.jpg' },
  { name: 'Mr. Mudassir Khan', title: 'BS English', role: 'Lecturer', photo: 'mudassir-khan.jpg' },
  { name: 'Mr. M. Uzair Khalid', title: 'M.Phil Mathematics', role: 'Lecturer', photo: 'm-uzair-khalid.jpg' },
  { name: 'Miss Nazia Hassan', title: 'MA International Relations', role: 'Section In-Charge (Girls)', photo: 'nazia-hassan.jpg' },
  { name: 'Mr. M. Ismail', title: 'MA Urdu / Pak Study', role: 'Lecturer', photo: 'm-ismail.jpg' },
  { name: 'Mr. Dastar Ali', title: 'MA Urdu', role: 'Lecturer', photo: 'dastar-ali.jpg' },
  { name: 'Mr. Haroon Ur Rasheed', title: 'MA Urdu', role: 'Lecturer', photo: 'haroon-ur-rasheed.jpg' },
  { name: 'Mufti Sikandar Hayat', title: 'MA Islamiyat / Arabic', role: 'Lecturer', photo: 'sikandar-hayat.jpg' },
  { name: 'Mufti Zain ul Abideen', title: 'MA Islamiyat / Arabic', role: 'Lecturer', photo: 'zain-ul-abideen.jpg' },
  { name: 'Mufti M. Sulaiman', title: 'MA Islamiyat & Arabic', role: 'Lecturer', photo: 'm-sulaiman.jpg' },
  { name: 'Mr. M. Aamir', title: 'M.Phil Mathematics', role: 'Discipline In-Charge & Lecturer', photo: 'm-aamir.jpg' },
  { name: 'Mr. Ihsanullah', title: 'BS Computer Science', role: 'Lecturer', photo: 'ihsanullah.jpg' },
  { name: 'Mr. Aman Ali', title: 'M.Phil English', role: 'President BLS & Lecturer', photo: 'aman-ali.jpg' },
  { name: 'Mr. Saadi Hassan', title: 'BS Computer Science', role: 'Computer Operator', photo: 'saadi-hassan.jpg' },
  { name: 'Mr. M. Zahid', title: 'MA Urdu', role: 'Clerk', photo: 'm-zahid.jpg' },
  { name: 'Mr. Abdul Mustan', title: 'FA (Army Rtd.)', role: 'Care Taker', photo: 'abdul-mustan.jpg' },
  { name: 'Mr. Muhammad Fayaz', title: '', role: 'Physical Instructor', photo: 'muhammad-fayaz.jpg' },
];

/* Campus facilities — from the official prospectus. */
export const FACILITIES = [
  { t: 'Smart Classrooms', d: 'Bright, comfortable and well-equipped learning spaces. Multimedia devices are installed in every classroom to assist visual and swift learning.' },
  { t: 'Computer Lab', d: 'High-speed internet and the latest technology for digital learning. Every Computer Science student gets easy access to a computer system.' },
  { t: 'Science Laboratories', d: 'Modern labs designed to inspire young scientists — richly equipped with the latest apparatus for effective, hands-on experiments.' },
  { t: 'Library', d: 'A rich collection of books and magazines, from the full curriculum to fiction, history and philosophy. Students celebrate Annual Books Day here.' },
  { t: 'Cafeteria', d: 'A spacious sitting area serving healthy and hygienic food options for students. Quality and prices are regularly monitored by the administration.' },
  { t: 'Sports & Games', d: 'A yearly Sports Gala — cricket, football, hockey, badminton, athletics and more. The four houses compete all year for House of the Year.' },
  { t: 'Prayer Area & Counseling', d: 'A dedicated spacious area for prayers, plus academic and emotional counseling services for student wellbeing.' },
  { t: 'Safe & Secure Campus', d: 'Every classroom and every corner of the building is monitored through CCTV, with dedicated guards for a safe learning environment.' },
];

export const NEWS_CATEGORIES = ['Notice', 'Warning', 'Result', 'Event', 'Date Sheet', 'Admissions', 'General'];
export const TEST_TYPES = ['weekly', 'monthly', 'mcqs'];
export const CLASS_LEVELS = ['11th', '12th'];
export const FILE_TYPES = ['video', 'document', 'image'];
