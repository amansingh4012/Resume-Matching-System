# 📊 Visual Guide & Flowcharts

## Complete System Architecture (Visual)

```
═══════════════════════════════════════════════════════════════════════════════
                            RESUME MATCHING SYSTEM
═══════════════════════════════════════════════════════════════════════════════

                        ┌─── INPUT ────┐
                        │              │
                        ↓              ↓
                    ┌─────────┐    ┌──────────┐
                    │ Resume  │    │    JD    │
                    │  (PDF)  │    │  (TEXT)  │
                    └────┬────┘    └────┬─────┘
                         │             │
                         ↓             ↓
                    [Text Extract]  [Text Extract]
                         │             │
              ┌──────────┼─────────────┼──────────┐
              │          │             │          │
              ↓          ↓             ↓          ↓
         [Name]    [Skills]      [Role]     [Skills]
         Extract   Extract      Extract     Extract
              │          │             │          │
              └──────────┼─────────────┼──────────┘
                         │             │
              ┌──────────┼─────────────┼──────────┐
              │          │             │          │
              ↓          ↓             ↓          ↓
         [Exp]    [Salary]       [Exp]      [Salary]
         Extract  Extract        Extract    Extract
              │          │             │          │
              └──────────┴─────────────┴──────────┘
                         │
                         ↓
              ┌──────────────────────┐
              │  NORMALIZATION       │
              │  ───────────────     │
              │  Dictionary "js"→"JS"│
              │  Aliases mapping     │
              │  Validate against    │
              │  skill dictionary    │
              │  Remove false pos.   │
              └──────────┬───────────┘
                         │
                    ┌────┴────┐
                    ↓         ↓
             RESUME DATA   JD DATA
             {            {
               skills,      requiredSkills,
               exp,         optionalSkills,
               salary,      exp,
               name         salary,
             }            role
                          }
                         │
                         ↓
              ┌──────────────────────┐
              │  MATCHING ENGINE     │
              │  ───────────────     │
              │  For each JD:        │
              │  1. Score skills     │
              │  2. Exp proximity    │
              │  3. Salary align     │
              │  4. Calculate total  │
              └──────────┬───────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ↓                     ↓
            JD1                   JD2
         Score: 92             Score: 78
         Rank: 1               Rank: 2
              │                     │
              └──────────┬──────────┘
                         ↓
              ┌──────────────────────┐
              │  RANK & SORT         │
              │  Sort by score DESC  │
              └──────────┬───────────┘
                         │
                         ↓
              ┌──────────────────────┐
              │   JSON OUTPUT        │
              │   ───────────────    │
              │  {                   │
              │    name,             │
              │    salary,           │
              │    resumeSkills,     │
              │    matchingJobs: [   │
              │      {               │
              │        jobId,        │
              │        role,         │
              │        matchScore,   │
              │        ...           │
              │      }               │
              │    ]                 │
              │  }                   │
              └──────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```

---

## Skill Extraction Deep Dive (Flowchart)

```
                            INPUT: Text
                              │
                              ↓
         ┌────────────────────────────────────┐
         │ SPLIT INTO SENTENCES                │
         │ Find potential skill matches        │
         └────────────────┬───────────────────┘
                          │
                          ↓
         ┌────────────────────────────────────┐
         │ LAYER 1: SKIP PATTERNS?             │
         │ Email? Phone? URL?                  │
         │ Document headers?                   │
         └────────┬───────────────────────────┘
         ┌────────┴──────────────────┐
         │                           │
      YES ↓ (Skip)              NO ↓ (Continue)
         │                      [Save potential]
         │                           │
         │                           ↓
         │        ┌──────────────────────────────┐
         │        │ LAYER 2: DICTIONARY CHECK    │
         │        │ Is it in canonical list?     │
         │        │ → exact match?                │
         │        └──────────┬───────────────────┘
         │        ┌──────────┴──────────────┐
         │        │                         │
         │     YES ↓ (Match)            NO ↓ (Try next)
         │     [Great!]          ┌─────────────────────┐
         │        │              │ LAYER 3: ALIAS?     │
         │        │              │ Check alias mapping │
         │        │              └────────┬────────────┘
         │        │              ┌────────┴─────────┐
         │        │              │                  │
         │        │           YES ↓              NO ↓
         │        │         [Normalize]    Try Layer 4
         │        │              │
         │        │              ↓
         │        │   ┌─────────────────────────┐
         │        │   │ LAYER 4: FALSE POS?     │
         │        │   │ (For ambiguous skills)  │
         │        │   │ "C" → needs tech context│
         │        │   │ "R" → needs context     │
         │        │   └───────┬─────────────────┘
         │        │   ┌───────┴────────────┐
         │        │   │                    │
         │        │ YES ↓               NO ↓
         │        │ (Has              (No context)
         │        │  context)             │
         │        │   │    ┌──────────────┘
         │        │   │    │
         │        │   ↓    ↓ (Rejected)
         │        │  [Save] 
         │        │   │
         └────────┴───┤
                      ↓
         ┌────────────────────────────────────┐
         │ COLLECT MATCHED SKILLS             │
         │ Deduplicate                        │
         │ Apply SKILL_IMPLICATIONS           │
         │ Apply STACK_EXPANSIONS             │
         │ Return final list                  │
         └────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```

---

## Matching Score Calculation (Step-by-Step)

```
INPUT EXAMPLE:
─────────────
Resume: ["JavaScript", "React", "Node.js", "PostgreSQL"]
JD Required: ["JavaScript", "React", "Python"]
JD Optional: ["Docker", "AWS"]
Resume Exp: 6 years, JD Exp: 5 years

STEP 1: Required Skills Match (60 points max, 2x weight)
─────────────────────────────────────────────────────────

    JavaScript:
    ├─ Resume has it? YES ✓
    ├─ Weight multiplier: 2x
    └─ Points: 1.0 × 2 = 2.0

    React:
    ├─ Resume has it? YES ✓
    ├─ Weight multiplier: 2x
    └─ Points: 1.0 × 2 = 2.0

    Python:
    ├─ Resume has it? NO ✗
    ├─ Similar in resume? ["JavaScript", "Node.js"] → No similarity
    ├─ Weight multiplier: 2x
    └─ Points: 0.0 × 2 = 0.0

    Required Total: 4.0 / 6.0 = 67% matched
    Convert to 60-point scale: 0.67 × 60 = 40.2 points

STEP 2: Optional Skills Match (20 points max, 1x weight)
─────────────────────────────────────────────────────────

    Docker:
    ├─ Resume has it? NO ✗
    ├─ Similar skills? NO
    └─ Points: 0.0

    AWS:
    ├─ Resume has it? NO ✗
    ├─ Similar skills? NO
    └─ Points: 0.0

    Optional Total: 0.0 / 2.0 = 0% matched
    Convert to 20-point scale: 0.0 × 20 = 0.0 points

STEP 3: Experience Proximity (±10 points)
──────────────────────────────────────────

    Resume Experience: 6 years
    JD Requirement: 5 years
    Gap: 6 - 5 = +1

    Since gap ≥ 1 (exceeds requirement):
    └─ Bonus: +10 points (exceeds by at least 1 year)

STEP 4: Salary Alignment (±5 points)
────────────────────────────────────

    Resume Expected: $120,000
    JD Range: $110,000 - $150,000
    
    Is $120,000 within range?
    └─ YES ✓ → +3 points

STEP 5: Calculate Final Score
──────────────────────────────

    Total = Required + Optional + Exp_Bonus + Salary_Bonus
    Total = 40.2 + 0.0 + 10 + 3
    Total = 53.2 out of 100

STEP 6: Interpret Result
────────────────────────
    
    Score: 53.2/100 = "Fair Match"
    
    Reason: Meets 2/3 core tech skills but missing Python
            and has optional skills gaps


═══════════════════════════════════════════════════════════════════════════════
```

---

## Skill Normalization Examples (Visual)

```
USER INPUT VARIATIONS          NORMALIZATION PROCESS        CANONICAL FORM
──────────────────────────────────────────────────────────────────────────

"js"                     →  [Dictionary?] NO
                            [Alias?] js→JavaScript ✓  →  "JavaScript"
                         
"javascript"             →  [Dictionary?] YES
                            [Lowercase match] ✓         →  "JavaScript"

"Javascript"             →  [Dictionary?] YES
                            [Case-insensitive match] ✓  →  "JavaScript"

"node.js"                →  [Dictionary?] YES
                            [Exact match when lowered] ✓ →  "Node.js"

"nodejs"                 →  [Dictionary?] NO
                            [Alias?] nodejs→Node.js ✓  →  "Node.js"

"Node JS" (with space)   →  [Dictionary?] NO
                            [Alias?] node js→Node.js ✓ →  "Node.js"

"react native"           →  [Dictionary?] YES
                            [Exact match] ✓             →  "React Native"

"RN"                     →  [Dictionary?] NO
                            [Alias?] rn→React Native ✓  →  "React Native"

"MERN stack"             →  [Dictionary?] NO
                            [Stack Expansion?]          →  ["MongoDB",
                            MERN→M,E,R,N ✓               "Express",
                                                          "React", 
                                                          "Node.js"]

"tensorflow"             →  [Dictionary?] YES
                            [Lowercase match] ✓         →  "TensorFlow"

"spring boot"            →  [Dictionary?] YES
                            [Exact match when lowered] ✓ →  "Spring Boot"

"springboot" (no space)  →  [Dictionary?] NO
                            [Alias?] springboot→
                            Spring Boot ✓               →  "Spring Boot"

"Docker"                 →  [Dictionary?] YES
                            [Exact with case] ✓        →  "Docker"

"docker"                 →  [Dictionary?] YES
                            [Lowercase match] ✓        →  "Docker"

"kubernetes"             →  [Dictionary?] NO
                            [Alias?] k8s→Kubernetes ✓  →  "Kubernetes"

"k8s"                    →  [Alias?] k8s→Kubernetes ✓  →  "Kubernetes"

"CI/CD"                  →  [Dictionary?] YES
                            [Exact match] ✓            →  "CI/CD"

"cicd" (no slash)        →  [Alias?] cicd→CI/CD ✓     →  "CI/CD"

REST API                 →  [Dictionary?] YES          →  "REST API"

"rest"                   →  [Alias?] rest→REST API ✓  →  "REST API"

"restful api"            →  [Alias?] restful api→
                            REST API ✓                 →  "REST API"

═══════════════════════════════════════════════════════════════════════════════
```

---

## Skill Similarity Matrix (Partial Credit System)

```
                 SIMILAR FRAMEWORK SKILLS (35% credit if matched)
                 ──────────────────────────────────────────────

    Required: React         vs    Resume: [Vue.js, Angular, Svelte]
    
    Match score:
    ├─ React directly: NO → 0%
    ├─ Vue.js (similar framework): YES → 35% partial
    ├─ Angular (similar framework): YES → 35% partial
    └─ Svelte (similar framework): YES → 35% partial
    
    Best match: Pick Vue.js (0.35 × 2 weight) = 0.7 points


    Required: MongoDB       vs    Resume: [PostgreSQL, MySQL]
    
    Match score:
    ├─ MongoDB directly: NO → 0%
    ├─ PostgreSQL (database, 25% credit): YES → 25% partial
    ├─ MySQL (database, 25% credit): YES → 25% partial
    └─ Pick PostgreSQL: 0.25 × 1 weight = 0.25 points


    Required: AWS           vs    Resume: [GCP, Azure]
    
    Match score:
    ├─ AWS directly: NO → 0%
    ├─ GCP (cloud provider, 40% credit): YES → 40% partial
    ├─ Azure (cloud provider, 40% credit): YES → 40% partial
    └─ Pick GCP: 0.40 × 1 weight = 0.40 points


    SIMILARITY GROUPS COVERAGE:
    ────────────────────────────
    
    Frameworks:
    └─ React, Angular, Vue.js, Svelte, Next.js... (0.35 credit)

    Databases (SQL):
    └─ MySQL, PostgreSQL, MariaDB, SQLite... (0.40 credit)

    Databases (NoSQL):
    └─ MongoDB, Cassandra, CouchDB, Firebase... (0.35 credit)

    Cloud Providers:
    └─ AWS, Azure, GCP (0.40 credit)

    Languages (similar):
    ├─ JavaScript ↔ TypeScript (0.50 credit)
    ├─ Java ↔ Kotlin (0.40 credit)
    └─ Python ↔ Ruby (0.30 credit)

    CI/CD Tools:
    └─ Jenkins, GitHub Actions, CircleCI, GitLab CI... (0.40 credit)

═══════════════════════════════════════════════════════════════════════════════
```

---

## Handling Global Salary Formats (Decision Tree)

```
                    INPUT: Salary String
                            │
                            ↓
                ┌─────────────────────────┐
                │ TRY DOLLAR RANGE        │
                │ Regex: /\$...-\$...✓    │
                └────────┬────────────────┘
                ┌────────┴────────────┐
                │                     │
           MATCH ↓                NO ↓
        (Return)              ┌──────────────────────┐
           "$120k-$150k"      │ TRY DOLLAR SINGLE    │
                              │ Regex: /\$\d+...     │
                              └────────┬─────────────┘
                              ┌────────┴────────────┐
                              │                     │
                          MATCH ↓                NO ↓
                       (Return)          ┌────────────────────┐
                        "$139k"          │ TRY LPA (India)     │
                                         │ Regex: /\d+.*LPA/  │
                                         └────────┬───────────┘
                                         ┌────────┴────────────┐
                                         │                     │
                                     MATCH ↓                NO ↓
                                    (Return)        ┌───────────────┐
                                     "12 LPA"       │ TRY RUPEE (₹) │
                                                    │ Regex: /₹.*/  │
                                                    └────────┬──────┘
                                                    ┌────────┴─────────┐
                                                    │                  │
                                                MATCH ↓             NO ↓
                                               (Return)    ┌──────────────────┐
                                         "₹10,00,000"     │ TRY BARE RANGE   │
                                                          │ + Context check  │
                                                          │ /\d+\s*-\s*\d+/  │
                                                          └────────┬─────────┘
                                                          ┌────────┴────────┐
                                                          │                 │
                                                      MATCH ↓           NO ↓
                                                     (If context)      NULL
                                                    "80000-120000"


    CONTEXT KEYWORDS FOR BARE RANGES:
    ──────────────────────────────────
    salary | compensation | pay | ctc | annual | per year | lpa


═══════════════════════════════════════════════════════════════════════════════
```

---

## Ranking Pipeline (End-to-End Example)

```
SCENARIO:
─────────
1 Candidate Resume vs 5 Job Descriptions

STEP 1: PARSE ALL DATA
───────────────────────

Candidate:
  Name: John Doe
  Skills: [JavaScript, React, Node.js]
  Experience: 6 years
  Salary: $120,000

JD1: Senior React Developer
  Required: [JavaScript, React]
  Optional: [TypeScript, Next.js]
  Exp: 5 years
  Salary: $100,000-$130,000

JD2: Full Stack Developer
  Required: [JavaScript, Node.js, MongoDB]
  Optional: [Docker]
  Exp: 4 years
  Salary: $90,000-$120,000

JD3: Python Developer
  Required: [Python, Django]
  Optional: [PostgreSQL]
  Exp: 6 years
  Salary: $110,000-$140,000

JD4: DevOps Engineer
  Required: [Docker, Kubernetes, AWS]
  Optional: [Terraform]
  Exp: 7 years
  Salary: $140,000-$180,000

JD5: Junior Developer
  Required: [JavaScript]
  Optional: [React]
  Exp: 1 year
  Salary: $50,000-$70,000


STEP 2: SCORE EACH JD
──────────────────────

┌─ JD1: Senior React Developer ──┐
│ Required (JS, React): 2/2 = 100%  │
│ → 100% × 60 = 60 points           │
│ Optional (TS, Next.js): 0/2 = 0%  │
│ → 0% × 20 = 0 points              │
│ Experience (6 vs 5): +5 points    │
│ Salary ($120k in range): +3 points│
│ TOTAL: 60 + 0 + 5 + 3 = 68        │
└───────────────────────────────────┘

┌─ JD2: Full Stack Developer ────────┐
│ Required (JS, Node, Mongo): 2/3=67%│
│ → 67% × 60 = 40.2 points          │
│ Optional (Docker): 0/1 = 0%       │
│ → 0% × 20 = 0 points              │
│ Experience (6 vs 4): +10 points   │
│ Salary ($120k in range): +3 points│
│ TOTAL: 40.2 + 0 + 10 + 3 = 53.2  │
└───────────────────────────────────┘

┌─ JD3: Python Developer ────────────┐
│ Required (Python, Django): 0/2=0%  │
│ → 0% × 60 = 0 points              │
│ Optional (PostgreSQL): 0/1=0%     │
│ → 0% × 20 = 0 points              │
│ Experience (6 vs 6): +5 points    │
│ Salary ($120k in range): +3 points│
│ TOTAL: 0 + 0 + 5 + 3 = 8          │
└───────────────────────────────────┘

┌─ JD4: DevOps Engineer ─────────────┐
│ Required (Docker, K8s, AWS):0/3=0% │
│ → 0% × 60 = 0 points              │
│ Optional (Terraform): 0/1=0%      │
│ → 0% × 20 = 0 points              │
│ Experience (6 vs 7): 0 points     │
│ Salary ($120k below range): -5 pts│
│ TOTAL: 0 + 0 + 0 - 5 = -5         │
└───────────────────────────────────┘

┌─ JD5: Junior Developer ────────────┐
│ Required (JavaScript): 1/1=100%    │
│ → 100% × 60 = 60 points           │
│ Optional (React): 1/1=100%        │
│ → 100% × 20 = 20 points           │
│ Experience (6 vs 1): +10 points   │
│ Salary ($120k above range): -2 pts│
│ TOTAL: 60 + 20 + 10 - 2 = 88      │
└───────────────────────────────────┘


STEP 3: RANK BY SCORE
──────────────────────

    Rank    Job             Score    Interpretation
    ────    ──────          ─────    ───────────────
    1️⃣      JD5 Junior Dev   88/100   EXCELLENT MATCH
                                      (Over-qualified but fits)
    
    2️⃣      JD1 Sr React Dev 68/100   GOOD MATCH
                                      (Has core skills)
    
    3️⃣      JD2 Full Stack   53.2/100 FAIR MATCH
                                      (Missing MongoDB)
    
    4️⃣      JD3 Python Dev   8/100    POOR MATCH
                                      (Wrong tech stack)
    
    5️⃣      JD4 DevOps       -5/100   NOT QUALIFIED
                                      (Completely different field)


STEP 4: OUTPUT JSON
────────────────────

{
  name: "John Doe",
  salary: "$120,000",
  yearOfExperience: 6,
  resumeSkills: ["JavaScript", "React", "Node.js"],
  matchingJobs: [
    {
      jobId: "JD005",
      role: "Junior Developer",
      matchScore: 88.0,
      matchedRequiredSkills: ["JavaScript"],
      matchedOptionalSkills: ["React"],
      unmatchedRequiredSkills: [],
      salaryCompatibility: "Above range but acceptable"
    },
    {
      jobId: "JD001",
      role: "Senior React Developer",
      matchScore: 68.0,
      matchedRequiredSkills: ["JavaScript", "React"],
      matchedOptionalSkills: [],
      unmatchedRequiredSkills: [],
      salaryCompatibility: "Within range"
    },
    {
      jobId: "JD002",
      role: "Full Stack Developer",
      matchScore: 53.2,
      matchedRequiredSkills: ["JavaScript", "Node.js"],
      matchedOptionalSkills: [],
      unmatchedRequiredSkills: ["MongoDB"],
      salaryCompatibility: "Within range"
    },
    {
      jobId: "JD003",
      role: "Python Developer",
      matchScore: 8.0,
      matchedRequiredSkills: [],
      matchedOptionalSkills: [],
      unmatchedRequiredSkills: ["Python", "Django"],
      salaryCompatibility: "Within range"
    },
    {
      jobId: "JD004",
      role: "DevOps Engineer",
      matchScore: -5.0,
      matchedRequiredSkills: [],
      matchedOptionalSkills: [],
      unmatchedRequiredSkills: ["Docker", "Kubernetes", "AWS"],
      salaryCompatibility: "Below range"
    }
  ]
}

═══════════════════════════════════════════════════════════════════════════════
```

---

## False Positive Prevention (Examples)

```
SCENARIO 1: C Language vs CTC
─────────────────────────────

Input Text:
  "I have 5 years of C programming experience"
  
Detected: "C" + "CTC" (from cost to company context)

┌─ Check: Is "C" ambiguous? YES
├─ Extract 100-char window around "C"
│  "I have 5 years of C programming experience"
├─ Check for tech context keywords
│  ✓ Found "programming"
├─ Decision: ACCEPT "C"
└─ Result: Extract skill "C"

─────────

Input Text:
  "My current CTC is ₹5 lpa"
  
Detected: "C"

┌─ Check: Is "C" ambiguous? YES  
├─ Extract 100-char window around "C"
│  "My current CTC is ₹5 lpa"
├─ Check for tech context keywords
│  ✗ No programming/developer/code keywords
├─ Decision: REJECT "C"
└─ Result: Don't extract

═══════════════════════════════════════════════════════════════════════════════

SCENARIO 2: Go Language vs "going to"
──────────────────────────────────────

Input Text:
  "I'm proficient in Go and Rust"

┌─ Check: Is "Go" ambiguous? YES
├─ Window: "I'm proficient in Go and Rust"
├─ Check for context: ✓ "proficient", "Rust" (another language)
├─ Decision: ACCEPT "Go"
└─ Result: Extract "Go"

─────────

Input Text:
  "I'm going to learn Python"

┌─ Check: Is "Go" ambiguous? YES
├─ Window: "I'm going to learn Python"
├─ Regex check: Does "going to" match /\bgo(?:ing|ing\s+to)\b/i?
│  ✓ YES - it's "going to", not "Go"
├─ Decision: REJECT
└─ Result: Don't extract "Go"

═══════════════════════════════════════════════════════════════════════════════

SCENARIO 3: Rust Language vs Oxidation
───────────────────────────────────────

Input Text:
  "Proficient in Rust and embedded systems"

┌─ Check: Is "Rust" ambiguous? YES
├─ Window: "Proficient in Rust and embedded systems"
├─ Tech context? ✓ "embedded systems" is tech keyword
├─ Decision: ACCEPT "Rust"
└─ Result: Extract "Rust"

─────────

Input Text:
  "Preventing rust on metal surfaces"

┌─ Check: Is "Rust" ambiguous? YES
├─ Window: "Preventing rust on metal surfaces"
├─ Regex check: Does "rust" match /\b(?:rusty|rusted|rust-proof|rust\s+on)\b/i?
│  ✓ YES - matches "rust on" (material, not language)
├─ Decision: REJECT
└─ Result: Don't extract

═════════════════════════════════════════════════════════════════════════════
```

---

## Decision Tree for Interview

**If asked: "What's the most important part?"**

```
                    CORE SYSTEM
                        │
                        ├─── If complexity matters
                        │     └─→ SKILL EXTRACTION
                        │        (Handles typos, aliases, false +)
                        │
                        ├─── If accuracy matters
                        │     └─→ NORMALIZATION
                        │        (Canonical mapping)
                        │
                        ├─── If scoring matters
                        │     └─→ MATCHING ALGORITHM
                        │        (Multi-factor weighted)
                        │
                        ├─── If scale matters
                        │     └─→ O(N×S) complexity
                        │        (Linear in jobs)
                        │
                        └─── If maintainability
                              └─→ MODULAR EXTRACTORS
                                 (SRP principle)
```

