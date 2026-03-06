/**
 * Job Matcher — compares resume skills against JD requirements.
 *
 * Scoring model (weighted, multi-factor):
 *   - Required skill match:  weighted 2x
 *   - Optional skill match:  weighted 1x
 *   - Experience proximity:  bonus/penalty up to ±10 points
 *   - Skill category similarity: partial credit for related skills
 */

const path = require('path');
const skillAliases = require(path.join(__dirname, '..', 'data', 'skillAliases.json'));
const skillsDictionary = require(path.join(__dirname, '..', 'data', 'skillsDictionary.json'));

// ── Build normalization maps ──────────────────────────────────────────────────

// Map: lowercase alias/name → canonical skill name (original casing)
const normalizeMap = new Map();

// Add all canonical skills from dictionary (lowercase → original)
for (const [, skills] of Object.entries(skillsDictionary)) {
  for (const skill of skills) {
    normalizeMap.set(skill.toLowerCase(), skill);
  }
}

// Add aliases (overwrites are fine since they point to canonical names)
for (const [alias, canonical] of Object.entries(skillAliases)) {
  normalizeMap.set(alias.toLowerCase(), canonical);
}

// ── Build category lookup for skill similarity ───────────────────────────────

// Map: canonical lowercase skill → category name
const skillCategoryMap = new Map();
for (const [category, skills] of Object.entries(skillsDictionary)) {
  for (const skill of skills) {
    skillCategoryMap.set(skill.toLowerCase(), category);
  }
}

// Category similarity groups — skills in the same group get partial credit
const SIMILAR_CATEGORIES = {
  'languages': 0.15,      // knowing one language gives small credit for another
  'frameworks': 0.2,      // knowing one framework gives some credit for another in same category
  'databases': 0.25,      // database skills are somewhat transferable
  'devops': 0.2,
  'cloud': 0.25,
  'tools': 0.15,
  'methodologies': 0.3,   // methodology skills are fairly transferable
  'concepts': 0.2,
  'os': 0.3,              // OS knowledge is fairly transferable
};

// More specific sub-group similarity: skills that are closely related get higher partial credit
const SKILL_SIMILARITY_GROUPS = [
  // Frontend frameworks — very similar skills
  { skills: ['react', 'angular', 'vue.js', 'svelte', 'next.js', 'nuxt.js', 'gatsby', 'remix', 'sveltekit'], credit: 0.35 },
  // Backend frameworks (JS)
  { skills: ['express', 'nest.js', 'koa', 'fastify', 'hapi', 'hono'], credit: 0.35 },
  // Backend frameworks (Python)
  { skills: ['django', 'flask', 'fastapi'], credit: 0.35 },
  // Backend frameworks (Java)
  { skills: ['spring boot', 'spring', 'spring mvc'], credit: 0.35 },
  // SQL databases
  { skills: ['mysql', 'postgresql', 'microsoft sql server', 'sqlite', 'mariadb', 'oracle'], credit: 0.4 },
  // NoSQL databases
  { skills: ['mongodb', 'cassandra', 'couchdb', 'dynamodb', 'firebase', 'firestore'], credit: 0.35 },
  // Cache/KV stores
  { skills: ['redis', 'memcached'], credit: 0.5 },
  // Container orchestration
  { skills: ['docker', 'kubernetes', 'docker swarm'], credit: 0.3 },
  // CI/CD tools
  { skills: ['jenkins', 'github actions', 'gitlab ci/cd', 'circleci', 'travis ci', 'argocd'], credit: 0.4 },
  // Cloud providers
  { skills: ['aws', 'azure', 'gcp'], credit: 0.4 },
  // Message queues
  { skills: ['kafka', 'apache kafka', 'rabbitmq', 'activemq', 'aws sqs'], credit: 0.4 },
  // Testing frameworks (JS)
  { skills: ['jest', 'mocha', 'vitest', 'cypress', 'playwright'], credit: 0.4 },
  // Testing frameworks (Java)
  { skills: ['junit', 'testng'], credit: 0.5 },
  // ORM tools
  { skills: ['hibernate', 'typeorm', 'prisma orm', 'sequelize', 'drizzle orm', 'mongoose', 'mybatis'], credit: 0.35 },
  // State management
  { skills: ['redux', 'zustand', 'recoil', 'mobx', 'vuex', 'pinia'], credit: 0.4 },
  // CSS frameworks
  { skills: ['tailwind css', 'bootstrap', 'material ui', 'chakra ui', 'daisyui', 'ant design'], credit: 0.4 },
  // Infrastructure as Code
  { skills: ['terraform', 'pulumi', 'cloudformation', 'ansible', 'chef', 'puppet'], credit: 0.35 },
  // Monitoring
  { skills: ['prometheus', 'grafana', 'datadog', 'new relic', 'splunk', 'kibana'], credit: 0.35 },
  // ML/DL frameworks
  { skills: ['tensorflow', 'pytorch', 'keras', 'scikit-learn'], credit: 0.35 },
  // Similar languages
  { skills: ['javascript', 'typescript'], credit: 0.5 },
  { skills: ['java', 'kotlin'], credit: 0.4 },
  { skills: ['c', 'c++'], credit: 0.4 },
  { skills: ['python', 'r'], credit: 0.3 },
  // Mobile
  { skills: ['react native', 'flutter', 'ionic'], credit: 0.3 },
  // Reverse proxy / load balancing
  { skills: ['nginx', 'apache', 'caddy', 'haproxy'], credit: 0.4 },
];

// Pre-build a lookup: lowercase skill → list of { groupSkills, credit }
const similarityLookup = new Map();
for (const group of SKILL_SIMILARITY_GROUPS) {
  for (const skill of group.skills) {
    const lower = skill.toLowerCase();
    if (!similarityLookup.has(lower)) {
      similarityLookup.set(lower, []);
    }
    similarityLookup.get(lower).push({
      peers: new Set(group.skills.map(s => s.toLowerCase())),
      credit: group.credit,
    });
  }
}

/**
 * Normalize a skill name to its canonical form for comparison.
 */
function canonicalize(skill) {
  const lower = skill.toLowerCase().trim();
  const mapped = normalizeMap.get(lower);
  return mapped ? mapped.toLowerCase() : lower;
}

/**
 * Check if a resume skill set has a similar skill to `targetSkill`.
 * Returns the best partial credit (0 to 0.5), or 0 if no similarity found.
 */
function getSimilarityCredit(targetCanon, resumeSkillSet) {
  const groups = similarityLookup.get(targetCanon);
  if (!groups) return 0;

  let bestCredit = 0;
  for (const { peers, credit } of groups) {
    for (const peer of peers) {
      if (peer === targetCanon) continue; // skip self
      if (resumeSkillSet.has(peer)) {
        bestCredit = Math.max(bestCredit, credit);
      }
    }
  }
  return bestCredit;
}

/**
 * Calculate experience proximity score.
 * Returns a value between -10 and +10:
 *   - Exact match or above: +5 to +10
 *   - Close below (within 1 year): +2
 *   - Slightly below (within 2 years): 0
 *   - Far below: -5 to -10
 *   - If either value is null, returns 0 (no data, no penalty)
 */
function experienceProximityScore(resumeExp, jdExp) {
  if (resumeExp == null || jdExp == null) return 0;

  const diff = resumeExp - jdExp; // positive = resume has more

  if (diff >= 0) {
    // Meets or exceeds requirement
    return Math.min(10, 5 + diff);
  } else if (diff >= -1) {
    // Within 1 year — slight penalty
    return 2;
  } else if (diff >= -2) {
    // Within 2 years
    return 0;
  } else if (diff >= -4) {
    // 2-4 years short
    return -5;
  } else {
    // Very far below
    return -10;
  }
}

/**
 * Match a single resume against an array of parsed JDs.
 * @param {object} resumeData - { resumeSkills: [...], yearOfExperience, salary, name }
 * @param {object[]} jdDataArray - [{ jobId, role, aboutRole, requiredSkills, optionalSkills, yearOfExperience, salary }]
 * @returns {object[]} match results sorted by matchingScore descending
 */
function matchResumeToJDs(resumeData, jdDataArray) {
  // Build a Set of normalized resume skills for O(1) lookups
  const resumeSkillSet = new Set(
    (resumeData.resumeSkills || []).map(canonicalize)
  );

  const results = jdDataArray.map((jd) => {
    const required = (jd.requiredSkills || []);
    const optional = (jd.optionalSkills || []);

    // Deduplicate required skills
    const seenRequired = new Set();
    const uniqueRequired = [];
    for (const skill of required) {
      const canon = canonicalize(skill);
      if (!seenRequired.has(canon)) {
        seenRequired.add(canon);
        uniqueRequired.push(skill);
      }
    }

    // Deduplicate optional skills, excluding any already in required
    const seenOptional = new Set();
    const uniqueOptional = [];
    for (const skill of optional) {
      const canon = canonicalize(skill);
      if (!seenRequired.has(canon) && !seenOptional.has(canon)) {
        seenOptional.add(canon);
        uniqueOptional.push(skill);
      }
    }

    // Build skill analysis with weighted matching
    const requiredAnalysis = uniqueRequired.map((skill) => {
      const canon = canonicalize(skill);
      const exact = resumeSkillSet.has(canon);
      const similarity = exact ? 0 : getSimilarityCredit(canon, resumeSkillSet);
      return {
        skill,
        required: true,
        presentInResume: exact || similarity >= 0.3, // show as partial match
        exactMatch: exact,
        similarityCredit: exact ? 1 : similarity,
      };
    });

    const optionalAnalysis = uniqueOptional.map((skill) => {
      const canon = canonicalize(skill);
      const exact = resumeSkillSet.has(canon);
      const similarity = exact ? 0 : getSimilarityCredit(canon, resumeSkillSet);
      return {
        skill,
        required: false,
        presentInResume: exact || similarity >= 0.3,
        exactMatch: exact,
        similarityCredit: exact ? 1 : similarity,
      };
    });

    const allAnalysis = [...requiredAnalysis, ...optionalAnalysis];

    // ── Weighted score calculation ──
    const REQUIRED_WEIGHT = 2;
    const OPTIONAL_WEIGHT = 1;

    // Required skills scoring (with partial credit for similar skills)
    let requiredEarned = 0;
    let requiredTotal = 0;
    for (const s of requiredAnalysis) {
      requiredTotal += REQUIRED_WEIGHT;
      requiredEarned += s.similarityCredit * REQUIRED_WEIGHT;
    }

    // Optional skills scoring
    let optionalEarned = 0;
    let optionalTotal = 0;
    for (const s of optionalAnalysis) {
      optionalTotal += OPTIONAL_WEIGHT;
      optionalEarned += s.similarityCredit * OPTIONAL_WEIGHT;
    }

    const totalWeight = requiredTotal + optionalTotal;
    const earnedWeight = requiredEarned + optionalEarned;

    // Base skill score (0-100)
    let skillScore = totalWeight === 0 ? 0 : (earnedWeight / totalWeight) * 100;

    // Experience proximity adjustment (±10 points)
    const expBonus = experienceProximityScore(
      resumeData.yearOfExperience,
      jd.yearOfExperience
    );

    // Final score: clamp between 0-100
    const matchingScore = Math.max(0, Math.min(100, Math.round(skillScore + expBonus)));

    const skillsAnalysis = allAnalysis.map(s => ({
      skill: s.skill,
      presentInResume: s.presentInResume,
    }));

    return {
      jobId: jd.jobId,
      role: jd.role,
      aboutRole: jd.aboutRole,
      skillsAnalysis,
      matchingScore,
    };
  });

  // Sort by matchingScore descending
  results.sort((a, b) => b.matchingScore - a.matchingScore);

  return results;
}

module.exports = { matchResumeToJDs };