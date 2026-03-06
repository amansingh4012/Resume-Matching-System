const path = require('path');
const skillsDictionary = require(path.join(__dirname, '..', 'data', 'skillsDictionary.json'));
const skillAliases = require(path.join(__dirname, '..', 'data', 'skillAliases.json'));

// Flatten the dictionary into a single array of canonical skill names
const allSkills = Object.values(skillsDictionary).flat();

// Build a lowercase lookup map for fast canonical matching
const skillLowerMap = new Map();
for (const skill of allSkills) {
  skillLowerMap.set(skill.toLowerCase(), skill);
}

// ── Context-aware false-positive filters ──
// For short/ambiguous skill names, require surrounding tech context
const FALSE_POSITIVE_CONTEXTS = {
  'C': /\b(?:ctc|circa|cognizant|capgemini|company|client|computer|college|candidate|certificate|core|cross|cloud|cv|contact|current|city|copyright|chapter|class\s+\d|case|condition|call|count)\b/i,
  'R': /\b(?:r&d|rather|require[ds]?|responsible|result[s]?|role|relevant|report|review|requirement[s]?|resume|reference|rupee|revenue|rate|ratio)\b/i,
  'Go': /\b(?:go(?:ing|es|od|al[s]?|ne|vern|t|tta))\b/i,
  'Dart': /\b(?:dart\s*board|throwing\s+darts?)\b/i,
  'Rust': /\b(?:rust(?:y|ed|ing|proof))\b/i,
  'Swift': /\b(?:swift(?:ly|er|est|ness))\b/i,
  'Ruby': /\b(?:ruby\s+(?:gem|jewel|stone|red))\b/i,
  'Hack': /\b(?:hack(?:ed|er[s]?|ing|athon))\b/i,
  'Assembly': /\b(?:assembl(?:y\s+line|y\s+plant|ies|ed|ing))\b/i,
  'Scala': /\b(?:scala(?:ble|bility))\b/i,
  'Helm': /\b(?:helm\s+(?:of|the))\b/i,
  'Ionic': /\b(?:ionic\s+(?:bond|compound|liquid))\b/i,
  'Puppet': /\b(?:puppet\s+(?:show|master|eer))\b/i,
  'Vagrant': /\b(?:vagrant[s]?\b(?!\s*(?:file|box|up|init|ssh)))/i,
  'Maven': /\b(?:maven\s+(?:of|in))\b/i,
  'Fiber': /\b(?:(?:optical|dietary|muscle)\s+fiber)\b/i,
  'Echo': /\b(?:echo(?:ed|ing|es)?(?!\s*(?:framework|server|handler)))\b/i,
};

// Tech-adjacent words that confirm a "tech context" — used for ambiguous short skills
const TECH_CONTEXT_WORDS = /\b(?:programming|language|framework|library|developer|engineer|software|code|coding|stack|api|backend|frontend|fullstack|database|server|deploy|build|test|debug|compile|runtime|sdk|ide|version|git|npm|pip|module|package|import|function|class|method|variable|array|object|algorithm|data\s+structure)\b/i;

// ── Tech stack acronym → component skills ──
const STACK_EXPANSIONS = {
  'MERN': ['MongoDB', 'Express', 'React', 'Node.js'],
  'MEAN': ['MongoDB', 'Express', 'Angular', 'Node.js'],
  'MEVN': ['MongoDB', 'Express', 'Vue.js', 'Node.js'],
  'PERN': ['PostgreSQL', 'Express', 'React', 'Node.js'],
  'LAMP': ['Linux', 'Apache', 'MySQL', 'PHP'],
  'LEMP': ['Linux', 'Nginx', 'MySQL', 'PHP'],
  'JAMstack': ['JavaScript', 'REST API', 'Markdown'],
  'T3': ['TypeScript', 'Next.js', 'Prisma ORM'],
  'ELK': ['ElasticSearch', 'Logstash', 'Kibana'],
};

// ── Implicit skill inference: skill → implied parent skills ──
const SKILL_IMPLICATIONS = {
  'React': ['JavaScript'],
  'React Native': ['JavaScript', 'React'],
  'Angular': ['TypeScript', 'JavaScript'],
  'Vue.js': ['JavaScript'],
  'Next.js': ['React', 'JavaScript'],
  'Nuxt.js': ['Vue.js', 'JavaScript'],
  'Svelte': ['JavaScript'],
  'SvelteKit': ['Svelte', 'JavaScript'],
  'Gatsby': ['React', 'JavaScript'],
  'Remix': ['React', 'JavaScript'],
  'Node.js': ['JavaScript'],
  'Express': ['Node.js', 'JavaScript'],
  'Nest.js': ['Node.js', 'TypeScript'],
  'Django': ['Python'],
  'Flask': ['Python'],
  'FastAPI': ['Python'],
  'Spring Boot': ['Java', 'Spring'],
  'Spring MVC': ['Java', 'Spring'],
  'Spring Cloud': ['Java', 'Spring'],
  'Spring Security': ['Java', 'Spring'],
  'Hibernate': ['Java'],
  'Ruby on Rails': ['Ruby'],
  'Laravel': ['PHP'],
  'Symfony': ['PHP'],
  'CodeIgniter': ['PHP'],
  'Gin': ['Go'],
  'Fiber': ['Go'],
  'Flutter': ['Dart'],
  'Tailwind CSS': ['CSS'],
  'Bootstrap': ['CSS'],
  'Material UI': ['React', 'JavaScript'],
  'Chakra UI': ['React', 'JavaScript'],
  'Redux': ['JavaScript'],
  'Zustand': ['JavaScript'],
  'TypeORM': ['TypeScript'],
  'Prisma ORM': ['TypeScript'],
  'Sequelize': ['JavaScript'],
  'Mongoose': ['MongoDB', 'JavaScript'],
  'Pandas': ['Python'],
  'NumPy': ['Python'],
  'Scikit-learn': ['Python'],
  'TensorFlow': ['Python'],
  'PyTorch': ['Python'],
  'Keras': ['Python'],
  'Matplotlib': ['Python'],
  'OpenCV': ['Python'],
  'Cypress': ['JavaScript'],
  'Jest': ['JavaScript'],
  'Playwright': ['JavaScript'],
  'Pytest': ['Python'],
  'JUnit': ['Java'],
  'TestNG': ['Java'],
  'ASP.NET': ['.NET', 'C#'],
  'Electron': ['JavaScript'],
  'Three.js': ['JavaScript'],
  'D3.js': ['JavaScript'],
  'Socket.io': ['Node.js', 'JavaScript'],
  'Apollo': ['GraphQL', 'JavaScript'],
  'Hadoop': ['Java'],
  'Apache Spark': ['Java'],
};

// ── Common typos/misspellings → correct skill name ──
const TYPO_CORRECTIONS = {
  'javascrip': 'JavaScript',
  'javscript': 'JavaScript',
  'javasript': 'JavaScript',
  'javacript': 'JavaScript',
  'javacsript': 'JavaScript',
  'typescrip': 'TypeScript',
  'typscript': 'TypeScript',
  'typesript': 'TypeScript',
  'kubernates': 'Kubernetes',
  'kubernets': 'Kubernetes',
  'kubernetees': 'Kubernetes',
  'kubernetes': 'Kubernetes',
  'kubernettes': 'Kubernetes',
  'kubernets': 'Kubernetes',
  'kubenetes': 'Kubernetes',
  'postgress': 'PostgreSQL',
  'postgressql': 'PostgreSQL',
  'postgre': 'PostgreSQL',
  'postgreql': 'PostgreSQL',
  'posgresql': 'PostgreSQL',
  'mongdb': 'MongoDB',
  'mongo db': 'MongoDB',
  'mongobd': 'MongoDB',
  'mangodb': 'MongoDB',
  'elasicsearch': 'ElasticSearch',
  'elastisearch': 'ElasticSearch',
  'elasticserch': 'ElasticSearch',
  'terrafrm': 'Terraform',
  'terrafrom': 'Terraform',
  'terrafom': 'Terraform',
  'docekr': 'Docker',
  'dockr': 'Docker',
  'doker': 'Docker',
  'anguler': 'Angular',
  'angualr': 'Angular',
  'anuglar': 'Angular',
  'tensrflow': 'TensorFlow',
  'tensoflow': 'TensorFlow',
  'tensorflw': 'TensorFlow',
  'pytohn': 'Python',
  'pyhton': 'Python',
  'pythn': 'Python',
  'pyton': 'Python',
  'reddis': 'Redis',
  'readis': 'Redis',
  'rediss': 'Redis',
  'dynamdb': 'DynamoDB',
  'dynamdob': 'DynamoDB',
  'jenkin': 'Jenkins',
  'jenkinns': 'Jenkins',
  'jenknis': 'Jenkins',
  'expres': 'Express',
  'exress': 'Express',
  'expresss': 'Express',
  'tailwnd': 'Tailwind CSS',
  'tailwindcs': 'Tailwind CSS',
  'boostrap': 'Bootstrap',
  'bootsrap': 'Bootstrap',
  'bootrap': 'Bootstrap',
  'graqhql': 'GraphQL',
  'graphqll': 'GraphQL',
  'grapql': 'GraphQL',
  'promethues': 'Prometheus',
  'promethus': 'Prometheus',
  'prometeus': 'Prometheus',
  'rabbitmqq': 'RabbitMQ',
  'rabitMQ': 'RabbitMQ',
  'rabitmq': 'RabbitMQ',
  'selinium': 'Selenium',
  'selenum': 'Selenium',
  'seleniam': 'Selenium',
};

// ── Version patterns: match skills with version suffixes ──
// e.g., "Python3", "Python 3.11", "Java17", "ES6", "HTML5", "CSS3", "Angular14", "Vue3"
const VERSION_PATTERNS = [
  { pattern: /\b(python)\s*[23](?:\.\d+)*\b/gi, skill: 'Python' },
  { pattern: /\b(java)\s*(?:1[0-9]|[89]|2[0-1]|se)\b/gi, skill: 'Java' },
  { pattern: /\b(angular)\s*(?:1[0-9]|[2-9])\+?\b/gi, skill: 'Angular' },
  { pattern: /\b(vue)\s*(?:[23])\b/gi, skill: 'Vue.js' },
  { pattern: /\b(react)\s*(?:1[0-9]|[0-9])\b/gi, skill: 'React' },
  { pattern: /\b(node)\s*(?:1[0-9]|[0-9]|2[0-2])\b/gi, skill: 'Node.js' },
  { pattern: /\bes\s*(?:5|6|7|8|20[0-9]{2}|next)\b/gi, skill: 'JavaScript' },
  { pattern: /\becmascript\s*(?:5|6|7|8|20[0-9]{2})\b/gi, skill: 'JavaScript' },
  { pattern: /\bhtml\s*5\b/gi, skill: 'HTML' },
  { pattern: /\bcss\s*3\b/gi, skill: 'CSS' },
  { pattern: /\b(typescript)\s*[3-5](?:\.\d+)*\b/gi, skill: 'TypeScript' },
  { pattern: /\b(\.?net)\s*(?:[3-8]|core)\s*(?:\.\d+)*\b/gi, skill: '.NET' },
  { pattern: /\b(spring\s*boot)\s*[23](?:\.\d+)*\b/gi, skill: 'Spring Boot' },
  { pattern: /\b(django)\s*[2-5](?:\.\d+)*\b/gi, skill: 'Django' },
  { pattern: /\b(flask)\s*[1-3](?:\.\d+)*\b/gi, skill: 'Flask' },
  { pattern: /\b(ruby)\s*[23](?:\.\d+)*\b/gi, skill: 'Ruby' },
  { pattern: /\b(php)\s*[5-8](?:\.\d+)*\b/gi, skill: 'PHP' },
  { pattern: /\b(kotlin)\s*[12](?:\.\d+)*\b/gi, skill: 'Kotlin' },
  { pattern: /\b(swift)\s*[3-6](?:\.\d+)*\b/gi, skill: 'Swift' },
  { pattern: /\b(go)\s*(?:1\.(?:1[0-9]|2[0-3]))\b/gi, skill: 'Go' },
  { pattern: /\b(rust)\s*(?:1\.(?:[5-9][0-9]|[0-9]))\b/gi, skill: 'Rust' },
  { pattern: /\b(redis)\s*[5-7](?:\.\d+)*\b/gi, skill: 'Redis' },
  { pattern: /\b(mysql)\s*[5-8](?:\.\d+)*\b/gi, skill: 'MySQL' },
  { pattern: /\b(postgres(?:ql)?)\s*(?:1[0-7]|9)(?:\.\d+)*\b/gi, skill: 'PostgreSQL' },
  { pattern: /\b(webpack)\s*[3-5]\b/gi, skill: 'Webpack' },
  { pattern: /\b(docker)\s*(?:compose|desktop|engine)?\b/gi, skill: 'Docker' },
];

// ── Skill section header patterns ──
const SKILL_SECTION_HEADERS = [
  /technical\s+skills?/i,
  /skills?\s*(?:&|and)\s*(?:tools?|technologies|expertise)/i,
  /core\s+(?:skills?|competenc(?:ies|e))/i,
  /(?:key|primary)\s+skills?/i,
  /technologies?\s+(?:used|known|stack)/i,
  /tech\s+stack/i,
  /tools?\s+(?:&|and)\s+technologies/i,
  /proficienc(?:y|ies)/i,
  /areas?\s+of\s+expertise/i,
  /^skills?\s*:?\s*$/i,
];

function escapeForRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSkillRegex(skill) {
  const escaped = escapeForRegex(skill);

  if (/^[A-Za-z]$/.test(skill)) {
    return new RegExp(`(?<![A-Za-z0-9_#+-])${escaped}(?![A-Za-z0-9_#+-])`, 'g');
  }
  if (/^[A-Za-z][+#]+$/.test(skill)) {
    return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, 'g');
  }
  if (skill.startsWith('.')) {
    return new RegExp(`(?<![A-Za-z0-9_])\\${escaped}(?![A-Za-z0-9_])`, 'g');
  }
  if (skill.includes('/')) {
    return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, 'gi');
  }
  return new RegExp(`\\b${escaped}\\b`, 'gi');
}

/**
 * Enhanced false-positive check: uses context windows + tech-context requirement for short skills.
 */
function isFalsePositive(skill, text, matchIndex) {
  const contextPattern = FALSE_POSITIVE_CONTEXTS[skill];
  if (!contextPattern) {
    // For very short skills (2-3 chars) without explicit filter, require nearby tech context
    if (skill.length <= 3 && !/[+#.]/.test(skill)) {
      const wideStart = Math.max(0, matchIndex - 80);
      const wideEnd = Math.min(text.length, matchIndex + 80);
      const wideWindow = text.substring(wideStart, wideEnd);
      if (!TECH_CONTEXT_WORDS.test(wideWindow)) {
        // Check if this match is inside a skills section (high confidence)
        const lineStart = text.lastIndexOf('\n', matchIndex);
        const prevLines = text.substring(Math.max(0, lineStart - 200), lineStart);
        const inSkillSection = SKILL_SECTION_HEADERS.some(h => h.test(prevLines));
        if (!inSkillSection) return true;
      }
    }
    return false;
  }

  const start = Math.max(0, matchIndex - 30);
  const end = Math.min(text.length, matchIndex + 30);
  const window = text.substring(start, end);
  return contextPattern.test(window);
}

/**
 * Extract text from "Skills" sections for higher-confidence matching.
 */
function extractSkillSections(text) {
  const lines = text.split('\n');
  let inSkillSection = false;
  const skillLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (SKILL_SECTION_HEADERS.some(h => h.test(line))) {
      inSkillSection = true;
      continue;
    }
    // End skill section when hitting another major header
    if (inSkillSection && /^(?:#{1,4}\s+)?(?:experience|education|projects?|work|employment|certif|summary|objective|about|profile|interest|activit|achiev|award|honor|publication|reference)/i.test(line)) {
      inSkillSection = false;
    }
    if (inSkillSection) {
      skillLines.push(line);
    }
  }
  return skillLines.join('\n');
}

/**
 * Detect slash-separated skill lists and resolve each part.
 * e.g., "HTML/CSS/JS" → ["HTML", "CSS", "JavaScript"]
 * e.g., "React/Redux" → ["React", "Redux"]
 */
function extractSlashSeparatedSkills(text) {
  const found = new Set();
  // Match patterns like "word/word" or "word/word/word" (2-5 parts)
  const slashPattern = /\b([A-Za-z#+.][A-Za-z0-9#+.]*(?:\/[A-Za-z#+.][A-Za-z0-9#+.]*){1,4})\b/g;
  let match;
  while ((match = slashPattern.exec(text)) !== null) {
    const fullMatch = match[1];
    // Skip known composite skills like CI/CD, UI/UX
    if (/^(?:CI\/CD|UI\/UX|AI\/ML|I\/O|TCP\/IP)$/i.test(fullMatch)) continue;

    const parts = fullMatch.split('/');
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      // Check against dictionary (case-insensitive)
      const canonical = skillLowerMap.get(trimmed.toLowerCase());
      if (canonical) {
        found.add(canonical);
        continue;
      }
      // Check against aliases
      const aliasCanon = skillAliases[trimmed.toLowerCase()];
      if (aliasCanon) {
        found.add(aliasCanon);
      }
    }
  }
  return found;
}

/**
 * Detect tech stack acronyms and expand them to component skills.
 * Also detects parenthetical expansions like "MERN (MongoDB, Express, React, Node.js)"
 */
function extractStackAcronyms(text) {
  const found = new Set();
  for (const [acronym, components] of Object.entries(STACK_EXPANSIONS)) {
    const acroRegex = new RegExp(`\\b${escapeForRegex(acronym)}\\b`, 'gi');
    if (acroRegex.test(text)) {
      for (const skill of components) {
        found.add(skill);
      }
    }
  }
  return found;
}

/**
 * Match skills with version numbers stripped.
 */
function extractVersionedSkills(text) {
  const found = new Set();
  for (const { pattern, skill } of VERSION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      found.add(skill);
    }
  }
  return found;
}

/**
 * Detect common typos/misspellings and resolve to canonical skills.
 */
function extractFromTypos(text) {
  const found = new Set();
  const textLower = text.toLowerCase();
  for (const [typo, canonical] of Object.entries(TYPO_CORRECTIONS)) {
    const typoRegex = new RegExp(`\\b${escapeForRegex(typo)}\\b`, 'gi');
    if (typoRegex.test(textLower)) {
      found.add(canonical);
    }
  }
  return found;
}

/**
 * Infer implied parent skills from detected skills.
 * e.g., React detected → JavaScript also added.
 */
function inferImpliedSkills(foundSkills) {
  const implied = new Set();
  for (const skill of foundSkills) {
    const parents = SKILL_IMPLICATIONS[skill];
    if (parents) {
      for (const parent of parents) {
        implied.add(parent);
      }
    }
  }
  return implied;
}

/**
 * Extract skills from parenthetical expressions.
 * e.g., "MERN stack (MongoDB, Express, React, Node.js)" → each skill inside parens
 * e.g., "Proficient in databases (MySQL, PostgreSQL, Redis)"
 */
function extractParenthetical(text) {
  const found = new Set();
  const parenPattern = /\(([^)]{3,200})\)/g;
  let match;
  while ((match = parenPattern.exec(text)) !== null) {
    const inner = match[1];
    // Split by comma, semicolon, or " and "
    const parts = inner.split(/[,;]|\band\b/i);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const canonical = skillLowerMap.get(trimmed.toLowerCase());
      if (canonical) {
        found.add(canonical);
        continue;
      }
      const aliasCanon = skillAliases[trimmed.toLowerCase()];
      if (aliasCanon) {
        found.add(aliasCanon);
      }
    }
  }
  return found;
}

/**
 * Core extraction: dictionary + alias matching (original logic, improved).
 */
function extractSkillsCore(text) {
  const found = new Set();

  // Match canonical skills from dictionary
  for (const skill of allSkills) {
    const regex = buildSkillRegex(skill);
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (skill.length <= 3 && isFalsePositive(skill, text, match.index)) {
        continue;
      }
      found.add(skill);
      break;
    }
  }

  // Match aliases
  for (const [alias, canonical] of Object.entries(skillAliases)) {
    if (found.has(canonical)) continue;

    const escapedAlias = escapeForRegex(alias);
    let aliasRegex;
    if (alias.includes('/') || alias.startsWith('.')) {
      aliasRegex = new RegExp(`(?<![A-Za-z0-9_])${escapedAlias}(?![A-Za-z0-9_])`, 'gi');
    } else {
      aliasRegex = new RegExp(`\\b${escapedAlias}\\b`, 'gi');
    }
    if (aliasRegex.test(text)) {
      found.add(canonical);
    }
  }

  return found;
}

/**
 * Advanced skill extraction — combines all detection phases:
 * 1. Core dictionary + alias matching
 * 2. Version-aware matching (Python3, ES6, HTML5, etc.)
 * 3. Slash-separated skill splitting (HTML/CSS/JS)
 * 4. Tech stack acronym expansion (MERN, MEAN, LAMP)
 * 5. Parenthetical skill extraction
 * 6. Typo/misspelling correction
 * 7. Skill section focused re-scan
 * 8. Implicit skill inference
 */
function extractSkills(text) {
  if (!text || typeof text !== 'string') return [];

  const found = new Set();

  // Phase 1: Core dictionary + alias matching
  for (const s of extractSkillsCore(text)) found.add(s);

  // Phase 2: Version-aware matching
  for (const s of extractVersionedSkills(text)) found.add(s);

  // Phase 3: Slash-separated skill lists
  for (const s of extractSlashSeparatedSkills(text)) found.add(s);

  // Phase 4: Stack acronym expansion
  for (const s of extractStackAcronyms(text)) found.add(s);

  // Phase 5: Parenthetical skill extraction
  for (const s of extractParenthetical(text)) found.add(s);

  // Phase 6: Typo/misspelling correction
  for (const s of extractFromTypos(text)) found.add(s);

  // Phase 7: Focused re-scan of "Skills" sections with relaxed thresholds
  const skillSectionText = extractSkillSections(text);
  if (skillSectionText) {
    for (const s of extractSkillsCore(skillSectionText)) found.add(s);
  }

  // Phase 8: Implicit skill inference (React → JavaScript, Django → Python, etc.)
  const inferred = inferImpliedSkills(found);
  for (const s of inferred) found.add(s);

  return Array.from(found);
}

// --- Section header patterns for JD parsing (expanded) ---
const REQUIRED_HEADERS = [
  /required\s+qualifications?/i,
  /must\s+have/i,
  /must[-\s]have\s+skills?/i,
  /basic\s+qualifications?/i,
  /minimum\s+qualifications?/i,
  /required\s+skills?/i,
  /what\s+you\s+need/i,
  /what\s+you(?:'ll|\s+will)\s+(?:need|bring)/i,
  /what\s+we(?:'re|\s+are)\s+looking\s+for/i,
  /key\s+requirements?/i,
  /core\s+requirements?/i,
  /essential\s+(?:skills?|qualifications?|requirements?)/i,
  /mandatory\s+(?:skills?|requirements?)/i,
  /technical\s+requirements?/i,
  /you\s+(?:should|must)\s+have/i,
  /who\s+you\s+are/i,
  /your\s+(?:skills?|experience|profile)/i,
  /we(?:'re|\s+are)\s+looking\s+for/i,
  /requirements?/i,
  /responsibilities\s+(?:&|and)\s+requirements?/i,
];

const OPTIONAL_HEADERS = [
  /desired\s+qualifications?/i,
  /desired\s+skills?/i,
  /desired\s+multipliers?/i,
  /preferred\s+qualifications?/i,
  /preferred\s+skills?/i,
  /nice\s+to\s+have/i,
  /good\s+to\s+have/i,
  /bonus\s+(?:points?|skills?|qualifications?)/i,
  /plus\s+(?:points?|skills?)/i,
  /additional\s+(?:skills?|qualifications?)/i,
  /it(?:'s|\s+is)\s+a\s+(?:plus|bonus)/i,
  /what\s+we(?:'d| would)\s+like\s+you\s+to\s+have/i,
  /extra\s+credit/i,
  /brownie\s+points?/i,
  /added\s+advantage/i,
  /not\s+required\s+but/i,
  /optional\s+(?:skills?|qualifications?)/i,
  /desired/i,
  /preferred/i,
];

/**
 * Finds all section boundaries in the text, tagged as 'required' or 'optional'.
 */
function findSectionBoundaries(text) {
  const sections = [];

  const allPatterns = [
    ...REQUIRED_HEADERS.map((p) => ({ pattern: p, type: 'required' })),
    ...OPTIONAL_HEADERS.map((p) => ({ pattern: p, type: 'optional' })),
  ];

  for (const { pattern, type } of allPatterns) {
    // Look for the header at the start of a line or after a newline
    const headerRegex = new RegExp(`(?:^|\\n)\\s*(?:#{1,4}\\s*)?${pattern.source}[:\\s-]*`, 'gim');
    let match;
    while ((match = headerRegex.exec(text)) !== null) {
      sections.push({ index: match.index + match[0].length, type });
    }
  }

  // Sort by position in text
  sections.sort((a, b) => a.index - b.index);
  return sections;
}

/**
 * Splits JD text into required and optional sections, then extracts skills from each.
 * Returns { requiredSkills: [...], optionalSkills: [...] }.
 */
function extractRequiredAndOptionalSkills(text) {
  if (!text || typeof text !== 'string') {
    return { requiredSkills: [], optionalSkills: [] };
  }

  const boundaries = findSectionBoundaries(text);

  if (boundaries.length === 0) {
    // No clear section headers found — treat everything as required
    return { requiredSkills: extractSkills(text), optionalSkills: [] };
  }

  let requiredText = '';
  let optionalText = '';

  // Text before any section header is treated as required context
  if (boundaries.length > 0 && boundaries[0].index > 0) {
    requiredText += text.substring(0, boundaries[0].index) + '\n';
  }

  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i].index;
    const end = i + 1 < boundaries.length ? boundaries[i + 1].index : text.length;
    const sectionText = text.substring(start, end);

    if (boundaries[i].type === 'required') {
      requiredText += sectionText + '\n';
    } else {
      optionalText += sectionText + '\n';
    }
  }

  const requiredSkills = extractSkills(requiredText);
  const optionalSkills = extractSkills(optionalText).filter(
    (skill) => !requiredSkills.includes(skill)
  );

  return { requiredSkills, optionalSkills };
}

module.exports = { extractSkills, extractRequiredAndOptionalSkills };