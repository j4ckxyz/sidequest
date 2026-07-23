// Offline search-ranking harness. Run: `bun scripts/search-test.ts [query...]`
// With no args it runs the built-in query set and prints ranked lexical matches, so search
// accuracy can be checked without the DB or the embedding model.
import { jobRelevance, RELEVANCE_THRESHOLD } from '../src/lib/fuzzy';

interface Job { title: string; category: string; description: string }

const JOBS: Job[] = [
  { title: 'Maths tutoring for GCSE student', category: 'tutoring tutoring', description: 'Need a patient tutor to help my younger brother prep for his upcoming GCSE maths exams.' },
  { title: 'Fix squeaking garden gate', category: 'handyman handyman', description: "The wooden gate is sagging and won't latch properly anymore. Needs a quick hinge fix." },
  { title: 'Walk golden retriever on cliff paths', category: 'pet-care pet care', description: 'Barnaby needs a solid hour-long walk along the North Coast paths while I am on a long shift.' },
  { title: 'Weekly grocery run from Waitrose', category: 'shopping-errands shopping errands', description: 'Looking for someone to pick up our pre-ordered groceries and drop them off at our St Saviour home.' },
  { title: 'Assemble flat-pack nursery dresser', category: 'handyman handyman', description: 'Just bought a new changing table that needs putting together before the baby arrives.' },
  { title: 'Clear old timber from courtyard', category: 'moving-help moving help', description: 'Need help hauling some weathered floorboards and old crates out of my St Helier courtyard.' },
  { title: 'Set up new wifi router and mesh', category: 'tech-help tech help', description: 'Just switched broadband provider and need help getting the new wifi router and mesh points online.' },
  { title: 'Help set up new tablet', category: 'tech-help tech help', description: 'Grandkids bought me an iPad and I need help getting online, email, and FaceTime working.' },
  { title: 'Dog walking for two spaniels', category: 'pet-care pet care', description: 'Two energetic spaniels need a midday walk three times a week near St Brelade.' },
  { title: 'Mow the front and back lawn', category: 'gardening gardening', description: 'Grass is getting long — after a mow and a quick edge trim before the weekend.' },
  { title: 'Move a piano to the music studio', category: 'moving-help moving help', description: 'Carefully move an upright piano from the living room to the studio across the house.' },
  { title: 'Childcare for two toddlers', category: 'childcare childcare', description: 'Look after two energetic toddlers in the garden while I finish client admin.' },
];

const QUERIES = process.argv.slice(2).length
  ? [process.argv.slice(2).join(' ')]
  : ['wifi', 'wifi router', 'dog', 'dogs', 'dog walking', 'gardner', 'garden gate', 'laptop', 'tutor', 'maths', 'grocery', 'piano', 'move', 'xyzzy'];

for (const q of QUERIES) {
  const ranked = JOBS.map((j) => ({ j, score: jobRelevance(q, j) }))
    .filter((r) => r.score >= RELEVANCE_THRESHOLD)
    .sort((a, b) => b.score - a.score);
  console.log(`\n=== "${q}" — ${ranked.length} match(es) ===`);
  for (const { j, score } of ranked) console.log(`  ${score.toFixed(2)}  ${j.title}`);
  if (ranked.length === 0) console.log('  (no lexical matches)');
}
