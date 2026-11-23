/* ============================================================
   Resume content — sourced verbatim from Karl-Rapada-Resume.pdf
   (assets/Karl-Rapada-Resume.pdf). Edit here to update the game.
   ============================================================ */

export const PROFILE = {
  name: 'Karl Lynuz B. Rapada',
  shortName: 'Karl',
  role: 'Software Developer',
  location: 'Marikina City, Philippines',
  email: 'karlrapada@gmail.com',
  phone: '+63 921 746 8502',
  linkedin: 'www.linkedin.com/in/karl-rapada-88310316a/',
  linkedinUrl: 'https://www.linkedin.com/in/karl-rapada-88310316a/',
  github: 'github.com/karlrapada21',
  githubUrl: 'https://github.com/karlrapada21',
  resumePdf: 'assets/Karl-Rapada-Resume.pdf',
  blurb:
    'Information Technology graduate and full-stack developer from Marikina City. I build web apps, ' +
    'train CNN models, and paint little islands like this one.',
};

export const EDUCATION = [
  {
    school: 'IETI College of Science and Technology, Marikina',
    degree: 'Bachelor of Science in Information Technology',
    date: 'Graduated June 2026',
    notes: [
      'Relevant Coursework: Web Development, Mobile Application Development, Database Systems, Software Engineering, UI/UX Design, Machine Learning',
      'Honors/Awards: Dean\u2019s Lister',
    ],
    capstone: {
      title: 'Skin Lesions Detection App Using Artificial Intelligence and Convolutional Neural Networks',
      body:
        'Developed a mobile app that classifies skin lesions from images using a trained CNN model.',
    },
  },
];

export const SKILL_GROUPS = [
  {
    label: 'Languages',
    kind: 'languages',
    items: ['JavaScript', 'TypeScript', 'Python', 'PHP', 'Java', 'C#', 'C++'],
  },
  {
    label: 'Frameworks',
    kind: 'frameworks',
    items: ['React', 'Next.js', 'Node.js', 'Express.js', 'Laravel', 'ASP.NET Core', 'Flask'],
  },
  {
    label: 'Data',
    kind: 'data',
    items: ['MySQL', 'PostgreSQL', 'MongoDB'],
  },
  {
    label: 'Tooling & AI',
    kind: 'tooling',
    items: ['Docker', 'AWS', 'Git', 'REST APIs', 'PyTorch', 'OpenCV'],
  },
];

export const EXPERIENCE = [
  {
    role: 'IT Intern (Web Developer)',
    company: 'Knowles Training Institute, Singapore',
    date: 'Jan. 13 \u2013 April 28, 2026',
    points: [
      'Developed and maintained responsive web applications using HTML, CSS, JavaScript, SQL, and REST APIs.',
      'Improved internal web tools by applying UI/UX best practices, streamlining user workflows.',
      'Integrated a CNN-based image classification feature into a web application prototype for AI-assisted skin lesion analysis.',
      'Collaborated with developers to deliver clean, maintainable code while consistently meeting project deadlines.',
    ],
  },
  {
    role: 'Freelance Web Developer',
    company: 'Self-Employed',
    date: '2024 \u2013 Present',
    points: [
      'Designed and developed responsive websites for small businesses and individual clients.',
      'Built custom web solutions using modern front-end technologies while ensuring cross-browser compatibility and mobile responsiveness.',
      'Managed projects from client requirements through deployment, maintenance, and post-launch support.',
    ],
  },
];

export const PROJECTS = [
  {
    title: 'SkinLesionAI',
    subtitle: 'AI-Powered Skin Lesion Analysis Platform',
    url: 'https://github.com/karlrapada21/skin-lesion-detection',
    stack: ['Flask', 'PyTorch', 'SQLite', 'Bootstrap', 'OpenCV', 'Grad-CAM++'],
    points: [
      'Developed an AI-powered web application that classifies 8 skin lesion types using a ResNeXt50 deep learning model achieving 85% classification accuracy.',
      'Integrated Grad-CAM++ visual explanations to improve prediction interpretability',
    ],
  },
  {
    title: 'BITSI Dispatch',
    subtitle: 'Real-Time Bus Dispatch Management System',
    url: 'https://github.com/IAmKhirvie/bitsi-dispatch',
    stack: ['Laravel 12', 'Livewire 3', 'Tailwind CSS', 'MySQL', 'Semaphore API'],
    points: [
      'Developed a real-time fleet dispatch management system with live vehicle monitoring.',
      'Implemented driver attendance tracking, preventive maintenance scheduling, and SMS notifications.',
    ],
  },
  {
    title: 'Intern Management System',
    subtitle: 'Web-based internship management platform',
    url: 'https://github.com/bigbusbeluga/umonics-attendance-reporting-system',
    stack: ['React', 'Vite', 'Tailwind CSS'],
    points: [
      'Developed a web-based internship management platform supporting attendance tracking, task management, and role-based access.',
    ],
  },
];

export const CERTIFICATES = [
  'CCNA 1 \u2013 3',
  'TOPCIT Level 3',
  'NCII CSS & ICT',
  'Python Essentials 1 \u2013 2',
  'Comptia A+',
];

/* Podium exhibits, in walking order after the bridge. */
export const PODIUMS = [
  { id: 'who', label: 'The Villager', hint: 'About Karl', icon: 'leaf' },
  { id: 'skills', label: 'Inventory', hint: 'Skills', icon: 'gem' },
  { id: 'experience', label: 'The Journal', hint: 'Experience', icon: 'book' },
  { id: 'projects', label: 'Project Stands', hint: 'Projects', icon: 'star' },
  { id: 'education', label: 'The Study', hint: 'Education', icon: 'cap' },
  { id: 'contact', label: 'Wish Board', hint: 'Contact & Certificates', icon: 'mail' },
];
