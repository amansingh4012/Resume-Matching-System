/**
 * Experience Extractor — rule-based, regex-only.
 * Extracts years-of-experience from JD text and resume text.
 */

// Word-to-number map (one–twenty)
const WORD_TO_NUM = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20,
};

const WORD_PATTERN = Object.keys(WORD_TO_NUM).join('|');

// Month name → 0-based index
const MONTHS = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
};

/**
 * Parse a number from a string that may be a digit or an English word.
 */
function parseNum(str) {
  const s = str.trim().toLowerCase();
  if (WORD_TO_NUM[s] !== undefined) return WORD_TO_NUM[s];
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ── JD experience patterns (ordered from most specific → broadest) ────────────

// Fresher / entry-level / 0+ years
const FRESHER_RE = /\b(?:fresher[s]?|entry[- ]?level|0\+?\s*years?|no\s+(?:prior\s+)?experience\s+(?:required|needed)|new\s+grad(?:uate)?s?)\b/i;

// "X+ years", "X-Y years", "X – Y years", "X to Y years" with experience context
const RANGE_YEARS_RE = new RegExp(
  '(?:' +
    '(\\d+(?:\\.\\d+)?|' + WORD_PATTERN + ')' +
    '\\s*(?:\\(\\d+\\)\\s*)?' +
    '\\s*[+]?\\s*' +
    '(?:[-–—]|to)\\s*' +
    '(?:\\d+(?:\\.\\d+)?|' + WORD_PATTERN + ')' +
    '\\s*[+]?' +
  ')' +
  '\\s*(?:years?|yrs?)\\b' +
  '(?:\\s+of\\s+\\w+)?\\s*(?:experience|exp\\.?)?',
  'gi'
);

// "X+ years of experience", "X years of experience"
const SINGLE_YEARS_RE = new RegExp(
  '(\\d+(?:\\.\\d+)?|' + WORD_PATTERN + ')' +
  '\\s*(?:\\(\\d+\\)\\s*)?' +
  '\\s*[+]?' +
  '\\s*(?:years?|yrs?)' +
  '(?:\\s+of\\s+)?(?:\\w+\\s+)*?' +
  '(?:experience|exp\\.?)',
  'gi'
);

// "Minimum of X years", "At least X years"
const MIN_YEARS_RE = new RegExp(
  '(?:minimum\\s+(?:of\\s+)?|at\\s+least\\s+|not\\s+less\\s+than\\s+)' +
  '(\\d+(?:\\.\\d+)?|' + WORD_PATTERN + ')' +
  '\\s*(?:\\(\\d+\\)\\s*)?' +
  '\\s*[+]?\\s*(?:years?|yrs?)',
  'gi'
);

// Word with parenthetical digit: "Four (4) years"
const WORD_PAREN_RE = new RegExp(
  '(?:' + WORD_PATTERN + ')\\s*\\((\\d+)\\)\\s*(?:years?|yrs?)',
  'gi'
);

// "X years Y months" or "X yrs Y months" combined pattern
const YEARS_MONTHS_RE = /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*(?:and\s+)?(\d+)\s*(?:months?|mos?)/gi;

// Standalone months pattern: "6+ months", "18 months of experience"
const MONTHS_EXP_RE = /(\d+)\s*[+]?\s*(?:months?|mos?)\s+(?:of\s+)?(?:\w+\s+)*?(?:experience|exp\.?)/gi;

/**
 * Extract all year-of-experience numbers mentioned in a JD-like text.
 */
function collectYearsFromJD(text) {
  const values = [];

  // Fresher check
  if (FRESHER_RE.test(text)) {
    values.push(0);
  }

  // "X years Y months" combined — strip matched portions to prevent double-counting
  let m;
  let remaining = text;
  while ((m = YEARS_MONTHS_RE.exec(text)) !== null) {
    const yrs = parseFloat(m[1]);
    const mos = parseInt(m[2], 10);
    if (!isNaN(yrs) && !isNaN(mos)) {
      values.push(yrs + mos / 12);
      // Remove matched region so other patterns won't double-count
      remaining = remaining.replace(m[0], ' ');
    }
  }

  // Word with parenthetical: "Four (4) years"
  while ((m = WORD_PAREN_RE.exec(remaining)) !== null) {
    const n = parseNum(m[1]);
    if (n !== null) values.push(n);
  }

  // "Minimum of X years" / "At least X years"
  while ((m = MIN_YEARS_RE.exec(remaining)) !== null) {
    const n = parseNum(m[1]);
    if (n !== null) values.push(n);
  }

  // Range: "5-7 years", "7–10 years"
  while ((m = RANGE_YEARS_RE.exec(remaining)) !== null) {
    const n = parseNum(m[1]);
    if (n !== null) values.push(n);
  }

  // Single: "5+ years of experience"
  while ((m = SINGLE_YEARS_RE.exec(remaining)) !== null) {
    const n = parseNum(m[1]);
    if (n !== null) values.push(n);
  }

  // Months of experience: "6+ months of experience" → convert to years
  while ((m = MONTHS_EXP_RE.exec(remaining)) !== null) {
    const months = parseInt(m[1], 10);
    if (!isNaN(months) && months > 0) {
      values.push(months / 12);
    }
  }

  return values;
}

/**
 * Extracts years of experience required from JD text.
 * Returns the minimum number mentioned (to capture the lowest requirement)
 * or null if nothing found.
 */
function extractExperience(text) {
  if (!text || typeof text !== 'string') return null;

  const values = collectYearsFromJD(text);
  if (values.length === 0) return null;

  return Math.min(...values);
}

// ── Resume experience extraction ──────────────────────────────────────────────

// Explicit statement: "X years of experience" in resume
const RESUME_EXPLICIT_RE = new RegExp(
  '(\\d+(?:\\.\\d+)?)\\s*[+]?\\s*(?:years?|yrs?)\\s+(?:of\\s+)?(?:\\w+\\s+)*?experience',
  'gi'
);

// Date range: "Jan 2020 - Present", "2018 - 2023", "March 2019 – Dec 2022"
const MONTH_NAMES = Object.keys(MONTHS).join('|');
const DATE_RANGE_RE = new RegExp(
  '(?:(' + MONTH_NAMES + ')\\s*[,.]?\\s*)?(\\d{4})' +
  '\\s*(?:-{1,3}|–|—|to)\\s*' +
  '(?:(' + MONTH_NAMES + ')\\s*[,.]?\\s*)?(\\d{4}|present|current|now|ongoing)',
  'gi'
);

// Month-to-month within same year: "June – Sept 2025", "Jan - Mar 2024"
const MONTH_RANGE_SAME_YEAR_RE = new RegExp(
  '(' + MONTH_NAMES + ')\\s*[,.]?\\s*' +
  '(?:-{1,3}|–|—|to)\\s*' +
  '(' + MONTH_NAMES + ')\\s*[,.]?\\s*' +
  '(\\d{4})',
  'gi'
);

// Single date implying ongoing: "Oct 2025" at the start of a line (company + date)
const SINGLE_DATE_RE = new RegExp(
  '(' + MONTH_NAMES + ')\\s*[,.]?\\s*(\\d{4})\\s*$',
  'gim'
);

/**
 * Compute the difference in years between two date endpoints.
 */
function dateDiffYears(startMonth, startYear, endMonth, endYear) {
  return (endYear - startYear) + (endMonth - startMonth) / 12;
}

// Section headers that indicate education (date ranges here are NOT work experience)
const EDUCATION_HEADERS = /\b(?:education|academic|qualification|degree|university|college|school|institute|bachelor|master|phd|diploma|b\.?tech|m\.?tech|b\.?e\b|m\.?e\b|b\.?sc|m\.?sc|b\.?a\b|m\.?a\b|cgpa|gpa)\b/i;
// Section headers that indicate work experience
const EXPERIENCE_HEADERS = /\b(?:experience|employment|work\s*history|professional|career|intern)\b/i;

/**
 * Split resume text into sections and identify which are education vs experience.
 * Returns only the lines that belong to experience/work sections.
 */
function getExperienceLines(text) {
  const lines = text.split(/\n/);
  let inEducation = false;
  let inExperience = false;
  const experienceLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect section transitions
    if (EXPERIENCE_HEADERS.test(trimmed) && trimmed.length < 80) {
      inExperience = true;
      inEducation = false;
      continue;
    }
    if (EDUCATION_HEADERS.test(trimmed) && trimmed.length < 80) {
      inEducation = true;
      inExperience = false;
      continue;
    }
    // Other section headers reset both
    if (/^(?:projects?|skills|technical|certif|achiev|award|hobby|hobbies|interest|summary|objective|references?)\b/i.test(trimmed) && trimmed.length < 80) {
      inExperience = false;
      inEducation = false;
      continue;
    }

    if (inExperience) {
      experienceLines.push(trimmed);
    }
  }

  return experienceLines;
}

/**
 * Extracts total years of experience from resume text.
 * Tries explicit statements first, then sums date ranges from work experience sections only.
 * Returns a number (rounded to 1 decimal) or null.
 */
function extractExperienceFromResume(text) {
  if (!text || typeof text !== 'string') return null;

  // 1. Try explicit statements anywhere in the resume
  const explicitValues = [];
  let m;
  while ((m = RESUME_EXPLICIT_RE.exec(text)) !== null) {
    const n = parseFloat(m[1]);
    if (!isNaN(n)) explicitValues.push(n);
  }
  if (explicitValues.length > 0) {
    return Math.max(...explicitValues);
  }

  // 2. Calculate from date ranges — only in experience/work sections
  const experienceText = getExperienceLines(text).join('\n');
  if (!experienceText) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  const spans = [];
  const matchedRanges = []; // track character positions already matched

  // Helper: check if a match overlaps with an already-matched region
  function isOverlapping(start, end) {
    return matchedRanges.some(r => start < r.end && end > r.start);
  }

  // 2a. Standard date ranges: "Jan 2020 - Dec 2022", "2018 - Present"
  while ((m = DATE_RANGE_RE.exec(experienceText)) !== null) {
    const startMonthStr = m[1];
    const startYear = parseInt(m[2], 10);
    const endMonthStr = m[3];
    const endRaw = m[4].toLowerCase();

    const startMonth = startMonthStr ? (MONTHS[startMonthStr.toLowerCase()] || 0) : 0;

    let endYear, endMonth;
    if (['present', 'current', 'now', 'ongoing'].includes(endRaw)) {
      endYear = currentYear;
      endMonth = currentMonth;
    } else {
      endYear = parseInt(endRaw, 10);
      endMonth = endMonthStr ? (MONTHS[endMonthStr.toLowerCase()] || 0) : 11;
    }

    if (startYear < 1970 || startYear > currentYear) continue;
    if (endYear < startYear) continue;

    const diff = dateDiffYears(startMonth, startYear, endMonth, endYear);
    if (diff >= 0 && diff <= 60) {
      spans.push(diff);
      matchedRanges.push({ start: m.index, end: m.index + m[0].length });
    }
  }

  // 2b. Month-to-month within same year: "June – Sept 2025"
  while ((m = MONTH_RANGE_SAME_YEAR_RE.exec(experienceText)) !== null) {
    if (isOverlapping(m.index, m.index + m[0].length)) continue;

    const startMonth = MONTHS[m[1].toLowerCase()] || 0;
    const endMonth = MONTHS[m[2].toLowerCase()] || 0;
    const year = parseInt(m[3], 10);

    if (year < 1970 || year > currentYear) continue;
    if (endMonth < startMonth) continue;

    const diff = (endMonth - startMonth) / 12;
    if (diff >= 0 && diff <= 1) {
      spans.push(diff);
      matchedRanges.push({ start: m.index, end: m.index + m[0].length });
    }
  }

  // 2c. Single date implying ongoing: "Oct 2025" at end of line
  while ((m = SINGLE_DATE_RE.exec(experienceText)) !== null) {
    if (isOverlapping(m.index, m.index + m[0].length)) continue;

    const startMonth = MONTHS[m[1].toLowerCase()] || 0;
    const startYear = parseInt(m[2], 10);

    if (startYear < 1970 || startYear > currentYear) continue;

    const diff = dateDiffYears(startMonth, startYear, currentMonth, currentYear);
    if (diff >= 0 && diff <= 60) {
      spans.push(diff);
      matchedRanges.push({ start: m.index, end: m.index + m[0].length });
    }
  }

  if (spans.length === 0) return null;

  const total = spans.reduce((sum, s) => sum + s, 0);
  return Math.round(total * 10) / 10;
}

module.exports = { extractExperience, extractExperienceFromResume };