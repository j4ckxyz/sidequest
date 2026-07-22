// ─────────────────────────────────────────────────────────────────────────────
// JèrriConnect — Mock dataset
// Realistic, Jersey-grounded sample content for the hackathon prototype.
// ─────────────────────────────────────────────────────────────────────────────

export type Field =
  | 'Digital & Tech'
  | 'Finance'
  | 'Law'
  | 'Creative'
  | 'Environment'

export interface Project {
  title: string
  kind: 'Dissertation' | 'Codebase' | 'Case Study' | 'Design' | 'Research'
  summary: string
  link?: string
  linkLabel?: string
  tags: string[]
}

export interface Student {
  id: string
  name: string
  initials: string
  avatarColor: string
  university: string
  ukCity: string
  degree: string
  field: Field
  graduationYear: number
  headline: string
  bio: string
  seeking: string
  availability: string
  skills: string[]
  projects: Project[]
  gpa: string
  featured?: boolean
}

export interface Bursary {
  id: string
  provider: string
  title: string
  amount: string
  field: Field | 'Open to all'
  degrees: string[]
  deadline: string
  commitment: string
  summary: string
  perks: string[]
  logoColor: string
}

export interface Internship {
  id: string
  company: string
  role: string
  type: '1-day Shadow' | '2-week Project' | 'Reading Week'
  field: Field
  location: string
  window: string
  paid: string
  spots: number
  summary: string
  logoColor: string
}

export interface Mentor {
  id: string
  name: string
  initials: string
  avatarColor: string
  role: string
  company: string
  field: Field
  expertise: string[]
  format: string
}

export interface Chapter {
  city: string
  students: number
  universities: string[]
  nextPopup: string
  lat: number
  lng: number
}

// ── Students ────────────────────────────────────────────────────────────────

export const students: Student[] = [
  {
    id: 'stu-1',
    name: 'Amélie Le Feuvre',
    initials: 'AL',
    avatarColor: 'from-sea-400 to-sea-700',
    university: 'University of Bristol',
    ukCity: 'Bristol',
    degree: 'BSc Environmental Science',
    field: 'Environment',
    graduationYear: 2026,
    headline: 'Coastal systems researcher mapping Jersey’s renewable future',
    bio: 'Third-year environmental scientist with a focus on marine renewables and tidal modelling. Grew up in St Ouen, spent three summers volunteering with the Jersey Marine Conservation team.',
    seeking: 'Graduate role in sustainability or marine renewables — ideally with a Jersey utility or the Government’s Climate team.',
    availability: 'Graduating June 2026 · open to summer 2025 placement',
    skills: ['GIS / QGIS', 'Python', 'Hydrology', 'Data viz', 'Field survey'],
    gpa: 'First Class (predicted)',
    featured: true,
    projects: [
      {
        title: 'An Analysis of Jersey’s Tidal Energy Potential',
        kind: 'Dissertation',
        summary:
          'Modelled tidal stream velocities around the Écréhous and Les Minquiers reefs using 12 months of Channel Islands hydrographic data, estimating a viable 40MW array capacity.',
        link: 'https://github.com/amelie-lf/jersey-tidal-model',
        linkLabel: 'View model & data',
        tags: ['Tidal energy', 'QGIS', 'Renewables'],
      },
      {
        title: 'St Aubin’s Bay Water Quality Dashboard',
        kind: 'Codebase',
        summary:
          'Built a live dashboard aggregating bathing-water sample data to flag pollution events for beach users.',
        link: 'https://github.com/amelie-lf/staubin-water',
        linkLabel: 'GitHub repo',
        tags: ['Python', 'Dashboard', 'Open data'],
      },
    ],
  },
  {
    id: 'stu-2',
    name: 'Tom Renouf',
    initials: 'TR',
    avatarColor: 'from-indigo-400 to-indigo-700',
    university: 'University of Manchester',
    ukCity: 'Manchester',
    degree: 'BSc Computer Science',
    field: 'Digital & Tech',
    graduationYear: 2025,
    headline: 'Full-stack engineer building for the Channel Islands',
    bio: 'Final-year CS student specialising in cloud and full-stack development. Hackathon regular, maintains two open-source libraries, and interned at a Manchester fintech last summer.',
    seeking: 'Graduate software engineering role with a Jersey fintech, digital agency, or the Government’s Digital service.',
    availability: 'Graduating July 2025 · available immediately after',
    skills: ['TypeScript', 'React', 'Node.js', 'AWS', 'Postgres', 'CI/CD'],
    gpa: 'First Class (predicted)',
    featured: true,
    projects: [
      {
        title: 'Parishr — a civic reporting app for Jersey parishes',
        kind: 'Codebase',
        summary:
          'React Native app letting residents report potholes, streetlight faults and fly-tipping directly to their Parish. 400+ TestFlight users during pilot.',
        link: 'https://github.com/tomrenouf/parishr',
        linkLabel: 'GitHub repo',
        tags: ['React Native', 'Node', 'Civic tech'],
      },
      {
        title: 'Low-latency order matching engine',
        kind: 'Codebase',
        summary:
          'Dissertation project: a matching engine in Rust processing 1.2M orders/sec, written up as a study in lock-free data structures.',
        link: 'https://github.com/tomrenouf/matchbook',
        linkLabel: 'GitHub repo',
        tags: ['Rust', 'Systems', 'Fintech'],
      },
    ],
  },
  {
    id: 'stu-3',
    name: 'Priya Gallichan',
    initials: 'PG',
    avatarColor: 'from-rose-400 to-fuchsia-700',
    university: 'University of Exeter',
    ukCity: 'Exeter',
    degree: 'LLB Law',
    field: 'Law',
    graduationYear: 2026,
    headline: 'Aspiring corporate lawyer with a fintech-regulation focus',
    bio: 'Second-year law student, Exeter Law Society committee member, and mooting finalist. Interested in trust, funds and the regulatory side of Jersey’s finance industry.',
    seeking: 'Training contract or vacation scheme with a Jersey law firm specialising in funds or corporate.',
    availability: 'Graduating 2026 · seeking summer vacation scheme',
    skills: ['Legal research', 'Contract drafting', 'Mooting', 'Trust law', 'French'],
    gpa: '2:1 (predicted)',
    featured: false,
    projects: [
      {
        title: 'Regulating Digital Assets under Jersey Trust Law',
        kind: 'Research',
        summary:
          'A comparative paper examining how the Trusts (Jersey) Law 1984 accommodates crypto-assets versus equivalent frameworks in Guernsey and the Cayman Islands.',
        link: 'https://drive.google.com/jersey-digital-trusts.pdf',
        linkLabel: 'Read PDF summary',
        tags: ['Trust law', 'Digital assets', 'Regulation'],
      },
      {
        title: 'National Mooting Competition — Regional Finalist',
        kind: 'Case Study',
        summary:
          'Led Exeter’s team to the regional final, arguing a commercial contract dispute before a Court of Appeal judge.',
        tags: ['Advocacy', 'Commercial law'],
      },
    ],
  },
  {
    id: 'stu-4',
    name: 'Ollie de la Haye',
    initials: 'OH',
    avatarColor: 'from-amber-400 to-orange-700',
    university: 'University of the Arts London',
    ukCity: 'London',
    degree: 'BA Graphic & Media Design',
    field: 'Creative',
    graduationYear: 2025,
    headline: 'Brand & product designer with a soft spot for island culture',
    bio: 'Final-year designer at UAL working across brand identity, motion and product UI. Freelances for two St Helier hospitality brands.',
    seeking: 'Junior product / brand design role with a Jersey creative studio or in-house team.',
    availability: 'Graduating June 2025 · open to freelance now',
    skills: ['Figma', 'Brand identity', 'Motion', 'Illustration', 'Webflow'],
    gpa: 'First Class (predicted)',
    featured: false,
    projects: [
      {
        title: 'Rebrand — Jersey Heritage Museums',
        kind: 'Design',
        summary:
          'A speculative identity system for Jersey Heritage: new wordmark, wayfinding and a responsive ticketing UI, presented as a full brand book.',
        link: 'https://behance.net/olliedlh/jersey-heritage',
        linkLabel: 'View on Behance',
        tags: ['Branding', 'Wayfinding', 'UI'],
      },
    ],
  },
  {
    id: 'stu-5',
    name: 'Hana Bisson',
    initials: 'HB',
    avatarColor: 'from-emerald-400 to-teal-700',
    university: 'London School of Economics',
    ukCity: 'London',
    degree: 'BSc Economics & Finance',
    field: 'Finance',
    graduationYear: 2026,
    headline: 'Economist drawn to funds, wealth and island prosperity',
    bio: 'Second-year at LSE, investment society analyst, and a Jersey Bursary recipient. Fascinated by how a small island sustains a global finance centre.',
    seeking: 'Spring week or summer analyst role with a Jersey fund administrator, bank, or wealth manager.',
    availability: 'Graduating 2026 · seeking summer 2025 analyst role',
    skills: ['Financial modelling', 'Excel / VBA', 'Python', 'Valuation', 'Bloomberg'],
    gpa: 'First Class (predicted)',
    featured: true,
    projects: [
      {
        title: 'The Economics of Jersey as a Fund Domicile',
        kind: 'Research',
        summary:
          'A modelling paper quantifying the island’s competitiveness against Luxembourg and Ireland for private-equity fund domiciliation post-2024.',
        link: 'https://github.com/hanabisson/jersey-funds-model',
        linkLabel: 'View analysis',
        tags: ['Funds', 'Modelling', 'Economics'],
      },
    ],
  },
  {
    id: 'stu-6',
    name: 'Marcus Ahier',
    initials: 'MA',
    avatarColor: 'from-slate-400 to-slate-700',
    university: 'University of Bristol',
    ukCity: 'Bristol',
    degree: 'MEng Software Engineering',
    field: 'Digital & Tech',
    graduationYear: 2025,
    headline: 'ML engineer keen to bring AI capability home to Jersey',
    bio: 'Master’s student focused on applied machine learning. Built a fraud-detection model during a placement year and wants to apply it to Jersey’s finance sector.',
    seeking: 'Graduate ML / data engineering role with a Jersey bank, insurer, or the Government.',
    availability: 'Graduating July 2025 · available immediately',
    skills: ['Python', 'PyTorch', 'MLOps', 'SQL', 'Data engineering'],
    gpa: 'First Class (predicted)',
    featured: false,
    projects: [
      {
        title: 'Real-time Fraud Detection for Card Payments',
        kind: 'Codebase',
        summary:
          'A gradient-boosted model flagging fraudulent transactions with 94% recall, deployed as a streaming pipeline during an industrial placement.',
        link: 'https://github.com/marcusahier/fraudstream',
        linkLabel: 'GitHub repo',
        tags: ['ML', 'Fraud', 'Streaming'],
      },
    ],
  },
]

// ── Bursaries & undergraduate schemes ─────────────────────────────────────────

export const bursaries: Bursary[] = [
  {
    id: 'bur-1',
    provider: 'Government of Jersey',
    title: 'Jersey Undergraduate Bursary',
    amount: 'Up to £2,500 / year',
    field: 'Open to all',
    degrees: ['Any degree'],
    deadline: '31 Aug 2026',
    commitment: 'No return obligation',
    summary:
      'Means-tested support for Jersey-ordinarily-resident students to help with the cost of studying at a UK university. Stackable with other schemes.',
    perks: ['Renewable each year', 'No repayment', 'Stacks with employer bursaries'],
    logoColor: 'from-sea-500 to-sea-700',
  },
  {
    id: 'bur-2',
    provider: 'Mourant',
    title: 'Mourant Legal Scholars Programme',
    amount: '£6,000 + guaranteed vac scheme',
    field: 'Law',
    degrees: ['LLB Law', 'Law with French', 'BA Jurisprudence'],
    deadline: '15 Jan 2026',
    commitment: 'Summer vacation scheme',
    summary:
      'For Jersey law undergraduates. Annual grant plus a guaranteed place on the firm’s summer vacation scheme and a paired trainee mentor.',
    perks: ['Guaranteed vac scheme', 'Trainee mentor', 'Priority training-contract review'],
    logoColor: 'from-rose-500 to-fuchsia-700',
  },
  {
    id: 'bur-3',
    provider: 'Digital Jersey',
    title: 'Tech Futures Undergraduate Scheme',
    amount: '£4,000 + paid summer project',
    field: 'Digital & Tech',
    degrees: ['Computer Science', 'Software Engineering', 'Data Science', 'Cyber Security'],
    deadline: '28 Feb 2026',
    commitment: '1 paid summer with a partner firm',
    summary:
      'Backed by Digital Jersey’s partner network. Funding plus a paid summer project placement with a local tech company each year of study.',
    perks: ['Paid summer placement', 'Digital Jersey membership', 'Demo-day showcase'],
    logoColor: 'from-indigo-500 to-violet-700',
  },
  {
    id: 'bur-4',
    provider: 'Jersey Finance',
    title: 'Future Finance Bursary',
    amount: '£3,500 / year',
    field: 'Finance',
    degrees: ['Economics', 'Finance', 'Accounting', 'Mathematics'],
    deadline: '30 Nov 2026',
    commitment: 'One insight week per year',
    summary:
      'For students heading toward Jersey’s finance industry. Includes an annual insight week rotating across banking, funds and wealth management.',
    perks: ['Rotating insight week', 'Industry mentor', 'Networking events'],
    logoColor: 'from-emerald-500 to-teal-700',
  },
  {
    id: 'bur-5',
    provider: 'Jersey Electricity',
    title: 'JE Engineering & Sustainability Grant',
    amount: '£3,000 + summer placement',
    field: 'Environment',
    degrees: ['Environmental Science', 'Engineering', 'Physics', 'Sustainability'],
    deadline: '01 Mar 2026',
    commitment: 'Paid summer placement',
    summary:
      'Supports students pursuing energy, engineering and sustainability, with a paid summer placement on live grid and renewables projects.',
    perks: ['Paid placement', 'Graduate scheme fast-track', 'Site visits'],
    logoColor: 'from-amber-500 to-orange-700',
  },
]

// ── Holiday Hub — micro-internships & shadowing ──────────────────────────────

export const internships: Internship[] = [
  {
    id: 'int-1',
    company: 'Ogier',
    role: 'Corporate Law — Trainee Shadow Day',
    type: '1-day Shadow',
    field: 'Law',
    location: 'St Helier',
    window: 'Christmas break · 18 Dec 2025',
    paid: 'Expenses covered',
    spots: 4,
    summary:
      'Spend a day shadowing a trainee in the corporate team — sit in on client calls, see how a fund is structured, and finish with a Q&A over lunch.',
    logoColor: 'from-rose-500 to-fuchsia-700',
  },
  {
    id: 'int-2',
    company: 'Prosperity 24/7',
    role: 'Cloud Engineering — 2-week Agile Sprint',
    type: '2-week Project',
    field: 'Digital & Tech',
    location: 'St Helier · hybrid',
    window: 'Christmas break · 22 Dec – 5 Jan',
    paid: '£450 / week',
    spots: 2,
    summary:
      'Join a real sprint team building an internal tool. Daily stand-ups, a mentor, and a demo to the leadership team at the end. Ship something real.',
    logoColor: 'from-indigo-500 to-violet-700',
  },
  {
    id: 'int-3',
    company: 'Jersey Electricity',
    role: 'Sustainability Team — Reading Week Insight',
    type: 'Reading Week',
    field: 'Environment',
    location: 'Queens Road',
    window: 'Feb reading week · 16–20 Feb',
    paid: 'Paid day rate',
    spots: 3,
    summary:
      'A three-day insight with the sustainability team covering grid decarbonisation, EV rollout and a tour of the La Collette power station.',
    logoColor: 'from-amber-500 to-orange-700',
  },
  {
    id: 'int-4',
    company: 'Rossborough',
    role: 'Finance & Actuarial — Shadow Morning',
    type: '1-day Shadow',
    field: 'Finance',
    location: 'St Helier',
    window: 'Easter break · 08 Apr 2026',
    paid: 'Expenses covered',
    spots: 6,
    summary:
      'A half-day shadowing the analytics team, seeing how risk is priced, followed by a session with the graduate recruitment lead.',
    logoColor: 'from-emerald-500 to-teal-700',
  },
]

// ── Jersey Chapters — mentorship network ─────────────────────────────────────

export const mentors: Mentor[] = [
  {
    id: 'men-1',
    name: 'Sarah Perchard',
    initials: 'SP',
    avatarColor: 'from-sea-400 to-sea-700',
    role: 'Partner',
    company: 'Carey Olsen',
    field: 'Law',
    expertise: ['Funds', 'Training contracts', 'Work–life on-island'],
    format: '30-min digital coffee',
  },
  {
    id: 'men-2',
    name: 'David Le Cornu',
    initials: 'DL',
    avatarColor: 'from-indigo-400 to-indigo-700',
    role: 'Head of Engineering',
    company: 'Prosperity 24/7',
    field: 'Digital & Tech',
    expertise: ['Cloud careers', 'Portfolio reviews', 'Interview prep'],
    format: 'Monthly mentorship pairing',
  },
  {
    id: 'men-3',
    name: 'Rachel Syvret',
    initials: 'RS',
    avatarColor: 'from-emerald-400 to-teal-700',
    role: 'Sustainability Lead',
    company: 'Jersey Electricity',
    field: 'Environment',
    expertise: ['Green careers', 'Placements', 'Grad schemes'],
    format: '30-min digital coffee',
  },
  {
    id: 'men-4',
    name: 'James Falla',
    initials: 'JF',
    avatarColor: 'from-emerald-500 to-teal-800',
    role: 'Associate Director',
    company: 'JTC Group',
    field: 'Finance',
    expertise: ['Fund administration', 'CV clinics', 'Networking'],
    format: 'Monthly mentorship pairing',
  },
]

export const chapters: Chapter[] = [
  {
    city: 'Bristol',
    students: 15,
    universities: ['Bristol', 'UWE', 'Bath'],
    nextPopup: 'Christmas social · 20 Dec',
    lat: 51.4545,
    lng: -2.5879,
  },
  {
    city: 'London',
    students: 23,
    universities: ['UCL', 'LSE', 'KCL', 'UAL', 'Imperial'],
    nextPopup: 'Finance careers pop-up · 14 Jan',
    lat: 51.5072,
    lng: -0.1276,
  },
  {
    city: 'Manchester',
    students: 11,
    universities: ['Manchester', 'MMU'],
    nextPopup: 'Tech meetup · 08 Feb',
    lat: 53.4808,
    lng: -2.2426,
  },
  {
    city: 'Exeter',
    students: 9,
    universities: ['Exeter'],
    nextPopup: 'Law society mixer · 22 Jan',
    lat: 50.7184,
    lng: -3.5339,
  },
  {
    city: 'Nottingham',
    students: 7,
    universities: ['Nottingham', 'NTU'],
    nextPopup: 'TBC · spring',
    lat: 52.9548,
    lng: -1.1581,
  },
  {
    city: 'Cardiff',
    students: 6,
    universities: ['Cardiff'],
    nextPopup: 'TBC · spring',
    lat: 51.4816,
    lng: -3.1791,
  },
]

export const fields: Field[] = [
  'Digital & Tech',
  'Finance',
  'Law',
  'Creative',
  'Environment',
]

// Handy aggregate stats for hero / dashboards
export const stats = {
  students: 78,
  employers: 34,
  bursaries: bursaries.length,
  placements: 19,
  ukCities: chapters.length,
}
