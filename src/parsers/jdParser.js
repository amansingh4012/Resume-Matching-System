/**
 * JD Parser — orchestrates extractors to parse a job description.
 */

const { extractSalary } = require('../extractors/salaryExtractor');
const { extractExperience } = require('../extractors/experienceExtractor');
const { extractRequiredAndOptionalSkills } = require('../extractors/skillExtractor');

// ── Role / Title extraction ───────────────────────────────────────────────────

// Explicit label patterns (expanded)
const ROLE_LABEL_RE = /(?:position|role|job\s*title|title|designation|opening)\s*[:\-–—]\s*(.+)/i;

// Section headers that signal we've passed the title area
const SECTION_HEADERS_RE = /\b(responsibilities|requirements|qualifications|about\s+(?:the|this)|overview|description|what\s+you|who\s+you|key\s+duties|duties|what\s+we|your\s+role|the\s+role|job\s+summary|position\s+overview)\b/i;

// Lines to skip when hunting for a title
const TITLE_SKIP_RE = /^(about|overview|description|company|location|department|date|posted|apply|deadline|salary|compensation|remote|hybrid|on-?site|team|org|division|report(?:s|ing)\s+to|type|contract|employment|full[-\s]?time|part[-\s]?time|shift|benefits?|perks?|we\s+are|our\s+)/i;

// Common seniority prefixes that strongly indicate a job title
const SENIORITY_RE = /\b(?:senior|junior|lead|principal|staff|intern|entry[-\s]?level|mid[-\s]?level|associate|head\s+of|director|vp|manager)\b/i;

// Common role words
const ROLE_WORDS_RE = /\b(?:engineer|developer|architect|designer|analyst|scientist|administrator|devops|specialist|consultant|programmer|manager|coordinator|technician|intern)\b/i;

/**
 * Extract job role/title from the JD text.
 */
function extractRole(text) {
  // 1. Try explicit labels
  const labelMatch = text.match(ROLE_LABEL_RE);
  if (labelMatch) {
    let role = labelMatch[1].trim().replace(/[|].*/, '').trim();
    // Remove trailing keywords like "at Company"
    role = role.replace(/\s+(?:at|@|-)\s+.+$/i, '').trim();
    if (role.length >= 3 && role.length <= 100) return role;
  }

  // 2. Scan early lines for a title-like line
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const searchLimit = Math.min(lines.length, 15);

  let bestCandidate = null;
  let bestScore = 0;

  for (let i = 0; i < searchLimit; i++) {
    const line = lines[i];

    // Stop if we hit a section header
    if (SECTION_HEADERS_RE.test(line)) break;

    // Skip non-title lines
    if (TITLE_SKIP_RE.test(line)) continue;
    if (line.length < 5 || line.length > 100) continue;
    if (/[@.com]/.test(line) && /@/.test(line)) continue; // email
    if (/^\d{4}/.test(line)) continue; // starts with year
    if (/[:\-]{2,}/.test(line)) continue; // separator lines
    if (/^[-•*]/.test(line)) continue; // bullet points

    const words = line.split(/\s+/);
    if (words.length > 10) continue;

    // Score this candidate line
    let score = 0;

    // Position in document (earlier = better)
    score += Math.max(0, 5 - i);

    // Contains seniority indicator
    if (SENIORITY_RE.test(line)) score += 4;

    // Contains role-type word
    if (ROLE_WORDS_RE.test(line)) score += 5;

    // Proper capitalization: mostly capitalized words
    const capitalizedCount = words.filter((w) => /^[A-Z]/.test(w)).length;
    const isAllCaps = line === line.toUpperCase() && /[A-Z]/.test(line);
    if (isAllCaps) score += 3;
    else if (capitalizedCount >= Math.ceil(words.length / 2)) score += 2;

    // Short and punchy (typical of titles)
    if (words.length <= 5) score += 2;
    else if (words.length <= 8) score += 1;

    // Penalty for lines that look like company names or locations
    if (/,\s*[A-Z]{2}\b/.test(line)) score -= 3; // "City, ST" pattern
    if (/\b(?:inc|ltd|llc|corp|gmbh|pvt|private|limited)\b/i.test(line)) score -= 4;
    if (/\b(?:http|www|\.com|\.org|\.io)\b/i.test(line)) score -= 5;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = line;
    }
  }

  return bestCandidate;
}

// ── About Role / Summary extraction ──────────────────────────────────────────

const SUMMARY_HEADERS = [
  /position\s+overview/i,
  /the\s+opportunity/i,
  /job\s+description/i,
  /about\s+(?:the\s+)?role/i,
  /about\s+(?:the\s+)?position/i,
  /about\s+(?:the\s+)?job/i,
  /role\s+summary/i,
  /role\s+overview/i,
  /job\s+summary/i,
  /what\s+you(?:'ll| will)\s+do/i,
  /your\s+(?:role|mission)/i,
  /the\s+role/i,
  /overview/i,
  /summary/i,
];

// Expanded section terminators
const SUMMARY_TERMINATORS_RE = /responsibilities|requirements|qualifications|required|preferred|what\s+you(?:'ll|\s+will)?\s+(?:bring|need|have)|who\s+you|key\s+duties|minimum|basic|must\s+have|nice\s+to\s+have|desired|bonus|tech(?:nical)?\s+(?:skills?|stack)|we(?:'re|\s+are)\s+looking/i;

/**
 * Extract a short "about role" summary (≤300 chars).
 */
function extractAboutRole(text) {
  // 1. Try to find a summary section by header
  for (const headerRe of SUMMARY_HEADERS) {
    const fullRe = new RegExp(
      '(?:^|\\n)\\s*(?:#{1,4}\\s*)?' + headerRe.source + '[:\\s-]*\\n([\\s\\S]*?)(?=\\n\\s*(?:#{1,4}\\s*)?' + SUMMARY_TERMINATORS_RE.source + ')',
      'im'
    );
    const match = text.match(fullRe);
    if (match && match[1]) {
      const summary = cleanSummary(match[1]);
      if (summary) return summary;
    }
  }

  // 2. Fallback: find text under a summary header until next blank-line block
  for (const headerRe of SUMMARY_HEADERS) {
    const simpleRe = new RegExp(
      '(?:^|\\n)\\s*(?:#{1,4}\\s*)?' + headerRe.source + '[:\\s-]*\\n([\\s\\S]*?)(?:\\n\\s*\\n)',
      'im'
    );
    const match = text.match(simpleRe);
    if (match && match[1]) {
      const summary = cleanSummary(match[1]);
      if (summary) return summary;
    }
  }

  // 3. Last fallback: first meaningful paragraph (after title-like lines)
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  for (const para of paragraphs) {
    // Skip very short blocks, headers, bullet lists
    if (para.length < 40) continue;
    if (/^[-•*#]/.test(para)) continue;
    if (SECTION_HEADERS_RE.test(para.split('\n')[0]) && para.split('\n').length === 1) continue;

    const summary = cleanSummary(para);
    if (summary) return summary;
  }

  return null;
}

/**
 * Clean and truncate a summary block to ≤300 characters at a sentence boundary.
 */
function cleanSummary(raw) {
  // Collapse whitespace, remove bullet prefixes
  let text = raw
    .replace(/^[\s•*\-]+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text || text.length < 20) return null;

  if (text.length <= 300) return text;

  // Truncate at last sentence boundary within 300 chars
  const truncated = text.substring(0, 300);
  const lastPeriod = truncated.lastIndexOf('. ');
  const lastExcl = truncated.lastIndexOf('! ');
  const boundary = Math.max(lastPeriod, lastExcl);

  if (boundary > 50) {
    return truncated.substring(0, boundary + 1).trim();
  }
  return truncated.trim() + '...';
}

// ── Main parser ──────────────────────────────────────────────────────────────

let jdCounter = 0;

/**
 * Parse a raw JD text into a structured object.
 * @param {string} jdText - the raw JD text
 * @param {string} [jobId] - optional job ID
 * @returns {object} parsed JD
 */
function parseJD(jdText, jobId) {
  if (!jdText || typeof jdText !== 'string') {
    return {
      jobId: jobId || `JD${String(++jdCounter).padStart(3, '0')}`,
      role: null,
      aboutRole: null,
      salary: null,
      yearOfExperience: null,
      requiredSkills: [],
      optionalSkills: [],
    };
  }

  const id = jobId || `JD${String(++jdCounter).padStart(3, '0')}`;
  const { requiredSkills, optionalSkills } = extractRequiredAndOptionalSkills(jdText);

  return {
    jobId: id,
    role: extractRole(jdText),
    aboutRole: extractAboutRole(jdText),
    salary: extractSalary(jdText),
    yearOfExperience: extractExperience(jdText),
    requiredSkills,
    optionalSkills,
  };
}

module.exports = { parseJD };