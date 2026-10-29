/**
 * Content for the island.
 * Sourced from resume.pdf and github.com/karlrapada21 — edit here, not in the UI.
 */

export const profile = {
  name: 'Karl Lynuz B. Rapada',
  shortName: 'Karl Rapada',
  role: 'Software Developer',
  location: 'Marikina City, Philippines',
  email: 'karlrapada@gmail.com',
  phone: '+63 921 746 8502',
  github: 'https://github.com/karlrapada21',
  linkedin: 'https://www.linkedin.com/in/karl-rapada-88310316a/',
  resume: 'resume.pdf',
  tagline: 'I build web things that people have to use every day, and I try to make them pleasant.',
  bio: [
    'I&rsquo;m an <strong>IT graduate from IETI College of Science and Technology</strong> in Marikina, and a software developer who likes the unglamorous part of the job: making a dispatch board that a real dispatcher can operate at 5am without being taught twice.',
    'My work so far leans on <strong>Laravel, React and Python</strong> &mdash; fleet dispatch software for a bus company, a computer-vision tool for skin-lesion screening, and a quiz platform for teachers. I care about clear data models, fast pages, and interfaces that feel calm.',
  ],
};

/** Menu → landmark on the island. `zone` keys are resolved in world.js. */
export const sections = [
  {
    id: 'projects',
    label: 'Projects',
    desc: 'Four things I actually built',
    caption: 'The floating shards. Drag them around, or pick one from the list.',
    badge: 'box',
    title: 'Projects',
    sub: 'Four builds from the last two years — a fleet dispatcher, a vision model, a quiz platform and an internship tracker.',
  },
  {
    id: 'about',
    label: 'About',
    desc: 'The developer behind the trees',
    caption: 'The cottage. Someone left the porch light on.',
    badge: 'house',
    title: 'About Karl',
    sub: 'Marikina City, Philippines — BSIT, June 2026, Dean&rsquo;s Lister.',
  },
  {
    id: 'skills',
    label: 'Skills',
    desc: 'Tools I reach for',
    caption: 'The windmill workshop. It never quite stops turning.',
    badge: 'gear',
    title: 'Skills',
    sub: 'What I write with, what I ship with, and what I am still learning.',
  },
  {
    id: 'experience',
    label: 'Journey',
    desc: 'Internships, clients, timelines',
    caption: 'The signpost grove — every sign points somewhere I&rsquo;ve been.',
    badge: 'sign',
    title: 'Journey',
    sub: 'An internship in Singapore, freelance clients at home, and a degree in progress.',
  },
  {
    id: 'contact',
    label: 'Contact',
    desc: 'Mailbox, email, résumé',
    caption: 'The mailbox. I answer faster than the flag suggests.',
    badge: 'mail',
    title: 'Say hello',
    sub: 'Open to junior developer roles, freelance builds and collaborations.',
  },
];

/**
 * accent / accent2 feed the 3D shard colours and the UI swatches.
 * emblem keys are handled by scene/grove.js.
 */
export const projects = [
  {
    id: 'bitsi',
    name: 'BITSI Dispatch',
    tagline: 'Real-time bus dispatch management for a regional transport company.',
    year: '2026',
    kind: 'Client / team',
    emblem: 'bus',
    accent: '#f2a65a',
    accent2: '#c4703a',
    featured: true,
    repo: 'https://github.com/karlrapada21/bitsi-dispatch',
    stack: ['Laravel 12', 'Livewire 3', 'Alpine.js', 'Tailwind CSS', 'MySQL', 'Spatie', 'Semaphore SMS', 'Vite'],
    highlights: [
      'Digitised the company&rsquo;s hand-written daily bus status report into a live dispatch board that auto-refreshes every 10 seconds over Livewire polling, so several dispatchers can work the same day without stepping on each other.',
      'Three-role access model (Admin, Operations Manager, Dispatcher) with role-shaped dashboards, plus a full audit trail that diffs every create, update, restore and delete.',
      'Fleet maintenance surfaced where it matters: PMS thresholds render as warning or overdue cards on the dashboard before a bus is pulled from service.',
      'SMS to drivers goes through a queued job with three retries and a 30-second backoff; failures are visible and retryable from an admin log.',
      'Reports export to Excel and PDF, and the daily summary table was normalised into child rows so a new destination needs no migration.',
    ],
  },
  {
    id: 'skinlesion',
    name: 'SkinLesionAI',
    tagline: 'A Flask platform that screens 8 skin-lesion types and shows you why.',
    year: '2025',
    kind: 'Capstone',
    emblem: 'scope',
    accent: '#7fb069',
    accent2: '#3f7a54',
    featured: true,
    repo: 'https://github.com/karlrapada21/skin-lesion-detection',
    stack: ['Flask', 'PyTorch', 'ResNeXt50', 'OpenCV', 'SQLite', 'Fernet', 'Grad-CAM++', 'Bootstrap'],
    highlights: [
      'Trained a ResNeXt50 classifier over 8 lesion classes, reaching roughly 85% accuracy on held-out data.',
      'Added a Grad-CAM++ pass that overlays the pixels the model actually reacted to — an unreadable score becomes something a person can argue with.',
      'Role-based clinical workflow (user, dermatologist, admin) with patient cases, multi-image uploads and an AI summary across a whole case.',
      'Encrypted every stored image at rest with Fernet, added rate limiting, OTP password resets and audit logging, and wrote the medical disclaimer that keeps it honest.',
    ],
  },
  {
    id: 'quiz',
    name: 'Quiz Platform',
    tagline: 'Teacher-authored quizzes, student attempts, scores that add up.',
    year: '2026',
    kind: 'Coursework',
    emblem: 'flag',
    accent: '#6fb3cf',
    accent2: '#3c6f92',
    repo: 'https://github.com/karlrapada21/quiz_app',
    stack: ['React', 'Vite', 'Express', 'MySQL', 'JWT', 'bcrypt', 'Tailwind CSS', 'Railway'],
    highlights: [
      'Split the app into a Vite/React client and an Express API with JWT sessions and bcrypt hashing, keeping quiz data and quiz-taking on separate routes.',
      'Separate teacher and student surfaces: teachers author and edit quizzes and review per-user scores, students take them and see their own history.',
      'Role middleware guards every write route, and the whole stack deploys from a Railway configuration.',
    ],
  },
  {
    id: 'interns',
    name: 'Intern Management System',
    tagline: 'Attendance, tasks and role-based access for an internship programme.',
    year: '2026',
    kind: 'Team of 4',
    emblem: 'clipboard',
    accent: '#d98f7e',
    accent2: '#a1553f',
    repo: 'https://github.com/bigbusbeluga/umonics-attendance-reporting-system',
    highlights: [
      'Built the React + Vite + Tailwind front end for a platform covering attendance tracking, task assignment and role-based access.',
      'Worked to a shared component system so attendance tables, task boards and reports stayed consistent as the feature set grew.',
    ],
    stack: ['React', 'Vite', 'Tailwind CSS', 'Node.js', 'REST'],
  },
];

export const experience = [
  {
    when: 'Jan 2026 — Apr 2026',
    role: 'IT Intern (Web Developer)',
    where: 'Knowles Training Institute · Singapore',
    now: false,
    points: [
      'Developed and maintained responsive web applications with HTML, CSS, JavaScript, SQL and REST APIs.',
      'Improved internal tooling by applying UI/UX practice to real workflows, cutting the number of steps to finish a task.',
      'Integrated a CNN image-classification feature into a web prototype for AI-assisted skin-lesion analysis.',
      'Shipped alongside the in-house team, keeping the code readable and the deadlines met.',
    ],
  },
  {
    when: '2024 — Present',
    role: 'Freelance Web Developer',
    where: 'Self-employed · Philippines',
    now: true,
    points: [
      'Designed and built responsive sites for small businesses and individual clients.',
      'Handled projects end to end: requirements, build, cross-browser and mobile checks, deployment, and after-launch support.',
    ],
  },
];

export const education = {
  school: 'IETI College of Science and Technology',
  place: 'Marikina',
  degree: 'Bachelor of Science in Information Technology',
  when: 'Graduated June 2026',
  honors: 'Dean&rsquo;s Lister',
  coursework: ['Web Development', 'Mobile Application Development', 'Database Systems', 'Software Engineering', 'UI/UX Design', 'Machine Learning'],
  capstone: 'Capstone — Skin Lesions Detection App using Artificial Intelligence and Convolutional Neural Networks.',
};

export const skillGroups = [
  {
    label: 'Languages',
    icon: 'code',
    items: ['JavaScript', 'TypeScript', 'Python', 'PHP', 'Java', 'C#', 'C++', 'SQL', 'HTML & CSS'],
  },
  {
    label: 'Frameworks & runtimes',
    icon: 'layers',
    items: ['React', 'Next.js', 'Node.js', 'Express', 'Laravel', 'Livewire', 'ASP.NET Core', 'Flask', 'Tailwind CSS'],
  },
  {
    label: 'Data & infrastructure',
    icon: 'db',
    items: ['MySQL', 'PostgreSQL', 'MongoDB', 'SQLite', 'Docker', 'AWS', 'Git', 'REST APIs'],
  },
  {
    label: 'AI & tooling',
    icon: 'spark',
    items: ['PyTorch', 'OpenCV', 'CNN / transfer learning', 'Grad-CAM++', 'Vite', 'Railway'],
  },
];

export const certificates = ['CCNA 1', 'CCNA 2', 'CCNA 3', 'TOPCIT Level 3', 'NCII CSS', 'NCII ICT', 'Python Essentials 1', 'Python Essentials 2', 'CompTIA A+'];

export const contactLinks = [
  { key: 'Email', label: 'karlrapada@gmail.com', href: 'mailto:karlrapada@gmail.com', icon: 'mail', copy: 'karlrapada@gmail.com' },
  { key: 'GitHub', label: 'github.com/karlrapada21', href: 'https://github.com/karlrapada21', icon: 'github' },
  { key: 'LinkedIn', label: 'in/karl-rapada', href: 'https://www.linkedin.com/in/karl-rapada-88310316a/', icon: 'linkedin' },
  { key: 'Phone', label: '+63 921 746 8502', href: 'tel:+639217468502', icon: 'phone', copy: '+63 921 746 8502' },
  { key: 'Résumé', label: 'Download the PDF', href: 'resume.pdf', icon: 'download', download: true },
];
