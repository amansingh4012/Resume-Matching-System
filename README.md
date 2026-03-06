# Resume Parsing and Job Matching System

A rule-based system that parses resumes and job descriptions to extract structured information and calculate matching scores. **No LLMs or AI APIs are used** — only regex, rule-based logic, and traditional NLP techniques.

---

## Features

- **Resume Parsing (PDF & Text)** — Extracts candidate name, skills, years of experience, and expected salary from resume PDFs or raw text.
- **Job Description Parsing** — Extracts role title, about/summary, salary, experience requirements, and required/optional skills from JD text.
- **Skill Extraction** — Dictionary-based + alias-aware skill detection with 100+ skills across 9 categories. Handles edge cases like single-letter skills ("C"), special characters ("C++", "C#", ".NET", "CI/CD"), and multi-word phrases ("Spring Boot", "Machine Learning").
- **Salary Extraction** — Supports USD ranges, Indian LPA/rupee formats, hourly-to-yearly mixed formats, bare numeric ranges with context detection, and more.
- **Experience Extraction** — Handles "5+ years", "Fresher", "Minimum of X years", "At least X years", word-to-number ("Four (4) years"), date range calculation from work history.
- **Name Extraction** — Rule-based name detection from the first few lines of a resume, with false-positive filtering for emails, phones, URLs, headers, and job titles.
- **Job Matching** — Compares resume skills against JD requirements with alias normalization, produces per-skill analysis and a 0–100 matching score.
- **REST API** — Express server with endpoints for resume parsing, JD parsing, and matching.
- **CLI Mode** — Command-line interface for batch processing.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js |
| PDF Parsing | pdf-parse |
| API Server | Express, cors, multer |
| Testing | Jest |
| IDs | uuid |

---

## Project Structure

```
hidani-assignment/
├── src/
│   ├── extractors/
│   │   ├── salaryExtractor.js      # Salary extraction (USD, LPA, ₹, etc.)
│   │   ├── experienceExtractor.js  # Years of experience extraction
│   │   ├── skillExtractor.js       # Skill extraction with alias resolution
│   │   └── nameExtractor.js        # Candidate name extraction
│   ├── parsers/
│   │   ├── resumeParser.js         # Resume PDF/text parsing orchestrator
│   │   └── jdParser.js             # Job description parsing orchestrator
│   ├── matcher/
│   │   └── jobMatcher.js           # Resume-to-JD matching engine
│   ├── data/
│   │   ├── skillsDictionary.json   # 100+ skills across 9 categories
│   │   └── skillAliases.json       # 46 alias-to-canonical skill mappings
│   ├── api/
│   │   └── routes.js               # Express API routes
│   └── index.js                    # Main entry point (CLI + server)
├── sample/
│   ├── jds/                        # 15 sample job descriptions (jd01–jd15.txt)
│   ├── resumes/                    # Sample resume text file
│   └── output.json                 # Sample matching output
├── tests/
│   ├── salaryExtractor.test.js
│   ├── experienceExtractor.test.js
│   ├── skillExtractor.test.js
│   └── jobMatcher.test.js
├── package.json
├── .gitignore
└── README.md
```

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repo-url>
cd hidani-assignment
```

### 2. Install dependencies

```bash
npm install
```

### 3. CLI Usage

Parse a resume PDF against JD text files:

```bash
node src/index.js --resume <path-to-resume.pdf> --jd <path-to-jd-folder-or-file>
```

**Examples:**

```bash
# Match a resume against a folder of JDs
node src/index.js --resume sample/resumes/resume.pdf --jd sample/jds/

# Match a resume against a single JD
node src/index.js --resume resume.pdf --jd sample/jds/jd01.txt
```

The output JSON is printed to stdout and saved to `sample/output.json`.

### 4. API Usage

Start the Express server:

```bash
node src/index.js --server
```

Or with a custom port:

```bash
node src/index.js --server --port 8080
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check — returns `{"status":"ok"}` |
| POST | `/api/parse-resume` | Upload a resume PDF (multipart, field: `resume`) → returns parsed resume data |
| POST | `/api/parse-jd` | Send `{"jdText":"...","jobId":"JD001"}` → returns parsed JD data |
| POST | `/api/match` | Match a resume against JDs (see below) |

**POST /api/match** accepts two modes:

1. **Multipart form**: Upload a resume PDF (field: `resume`) + a JSON string field `jds` containing an array of JD objects.
2. **JSON body**:
   ```json
   {
     "resumeText": "raw resume text...",
     "jds": [
       { "jdText": "raw JD text...", "jobId": "JD001" },
       { "jdText": "another JD...", "jobId": "JD002" }
     ]
   }
   ```

---

## Sample Output

The system was run with a sample software engineer resume (3 years experience, Java/Python/Spring Boot/React/Docker/AWS stack) against 15 real-world job descriptions:

```json
{
  "name": "Aman Kumar Singh",
  "salary": "8 LPA",
  "yearOfExperience": 3,
  "resumeSkills": [
    "Java", "Python", "JavaScript", "SQL", "HTML", "CSS",
    "Spring Boot", "React", "Node.js", "Express", "REST API",
    "MySQL", "PostgreSQL", "MongoDB", "Oracle",
    "Docker", "Kubernetes", "Jenkins", "CI/CD", "DevOps",
    "AWS", "Git", "JIRA", "Agile", "Scrum",
    "Microservices", "REST", "Full Stack", "Linux"
  ],
  "matchingJobs": [
    {
      "jobId": "JD002",
      "role": "Java/Angular Full Stack Developer",
      "aboutRole": "You will be responsible for designing and developing scalable web applications...",
      "skillsAnalysis": [
        { "skill": "Java", "presentInResume": true },
        { "skill": "Spring Boot", "presentInResume": true },
        { "skill": "Angular", "presentInResume": false },
        { "skill": "Docker", "presentInResume": true },
        ...
      ],
      "matchingScore": 88
    },
    ...
  ]
}
```

### Matching Scores Summary

| Rank | Job ID | Company / Role | Score |
|------|--------|---------------|-------|
| 1 | JD002 | Capgemini — Java/Angular Full Stack Developer | 88% |
| 2 | JD010 | Bcore — Software Engineer | 83% |
| 3 | JD014 | ForenTech — Software Engineer Mid | 83% |
| 4 | JD009 | SpaceX — Full Stack Build Reliability | 78% |
| 5 | JD005 | Lockheed Martin — MUOS SLE | 77% |
| 6 | JD008 | Accenture Federal Services — Software Developer | 74% |
| 7 | JD003 | Adobe — Software Engineer | 71% |
| 8 | JD012 | Lockheed Martin — Command & Control | 69% |
| 9 | JD006 | Applied Materials — Software Engineer | 65% |
| 10 | JD015 | Altamira Technologies — Software Engineer | 62% |
| 11 | JD013 | BigBear.ai — Software Engineer | 61% |
| 12 | JD007 | Meta — Software Engineer Infrastructure | 45% |
| 13 | JD011 | FishEye Software — C++ Engineer | 43% |
| 14 | JD004 | Astra — Software Engineer (Embedded) | 40% |
| 15 | JD001 | Riverside Research — Scientific Programmer | 19% |

Full output: [`sample/output.json`](sample/output.json)

---

## Testing

Run the full test suite:

```bash
npm test
```

Tests cover:
- **Salary Extractor** — 10 tests (USD ranges, LPA, rupee, mixed formats, edge cases)
- **Experience Extractor** — 13 tests (JD formats + resume date calculation)
- **Skill Extractor** — 13 tests (dictionary matching, aliases, edge cases, section splitting)
- **Job Matcher** — 7 tests (scoring, analysis, sorting, structure)

```
Test Suites: 4 passed, 4 total
Tests:       43 passed, 43 total
```

---

## Design Decisions

- **No LLMs / AI APIs** — All extraction is done through regex patterns, dictionary lookups, and rule-based heuristics.
- **Alias-aware matching** — Skills are normalized through a canonical alias map before comparison, so "reactjs" in a resume matches "React" in a JD.
- **Section-aware JD parsing** — Required vs. optional skills are split based on detected section headers (e.g., "Required Qualifications" vs. "Preferred").
- **False-positive guards** — Single-letter skills like "C" and "R" use narrow context windows to avoid matching inside words like "CTC" or "Required".
- **Modular architecture** — Each extractor is independent and testable. Parsers orchestrate extractors. The matcher is a pure function.
