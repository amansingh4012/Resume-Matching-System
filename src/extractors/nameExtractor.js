/**
 * Name Extractor — rule-based, regex-only.
 * Extracts candidate name from the first few lines of resume text.
 */

// Lines that are clearly not names
const SKIP_PATTERNS = [
  /[@]/,                                        // email
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,         // phone (US-like)
  /\+\d{1,3}[-.\s]?\d/,                         // international phone
  /https?:\/\//i,                                // URL
  /www\./i,                                      // URL
  /linkedin\.com|github\.com|gitlab\.com/i,      // profile URLs
  /\b\d{5,}\b/,                                  // zip code / long numbers
  /resume|curriculum\s*vitae|\bcv\b/i,           // document title
  /\b(street|avenue|road|blvd|lane|apt|suite|city|state|zip)\b/i, // address
  /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/,     // dates
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d/i,
  /\b(objective|summary|experience|education|skills|projects|certifications?|references?|profile)\b/i,
  /\b(software|engineer|developer|manager|analyst|consultant|intern|architect)\b/i,
  /\b(b\.?tech|m\.?tech|b\.?e\b|m\.?e\b|b\.?sc|m\.?sc|bachelor|master|phd|diploma)\b/i,
  /\bgithub\b|\blinkedin\b|\bgitlab\b/i,
];

// Common short words allowed inside a name (connectors, particles)
const NAME_CONNECTORS = new Set([
  'de', 'del', 'van', 'von', 'la', 'le', 'al', 'el', 'bin', 'ibn', 'das', 'dos', 'du',
]);

/**
 * Check if a line looks like a skip line (email, phone, header, etc.).
 */
function shouldSkip(line) {
  return SKIP_PATTERNS.some((re) => re.test(line));
}

/**
 * Check if a line looks like a person's name:
 * - 2–4 words
 * - Each word starts with uppercase (or is a known connector)
 * - No digits
 * - No special chars except hyphens/apostrophes within words
 */
function looksLikeName(line) {
  const trimmed = line.trim();
  if (!trimmed || /\d/.test(trimmed)) return false;

  // Allow only letters, spaces, hyphens, apostrophes, periods (initials)
  if (!/^[A-Za-z\s\-'.]+$/.test(trimmed)) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;

  for (const word of words) {
    const clean = word.replace(/[.']/g, '');
    if (clean.length === 0) continue;
    // Allow lowercase connectors
    if (NAME_CONNECTORS.has(clean.toLowerCase())) continue;
    // First letter must be uppercase
    if (clean[0] !== clean[0].toUpperCase() || clean[0] === clean[0].toLowerCase()) return false;
    // Single-letter initials are fine (e.g. "J.")
    if (clean.length === 1) continue;
    // Rest should be mostly lowercase (allow all-caps like "KUMAR")
  }

  return true;
}

/**
 * Extract name from explicit "Name: ..." label.
 */
function extractFromLabel(text) {
  const match = text.match(/\bname\s*[:\-–—]\s*([A-Za-z\-'. ]{2,60})/i);
  if (match) {
    const candidate = match[1].trim();
    const words = candidate.split(/\s+/);
    // Take only the name-like part (stop at non-name words)
    const nameWords = [];
    for (const w of words) {
      if (/^[A-Za-z\-'.]+$/.test(w) && w[0] === w[0].toUpperCase()) {
        nameWords.push(w);
      } else if (NAME_CONNECTORS.has(w.toLowerCase())) {
        nameWords.push(w);
      } else {
        break;
      }
    }
    if (nameWords.length >= 2 && nameWords.length <= 4) {
      return nameWords.join(' ');
    }
  }
  return null;
}

/**
 * Strip phone numbers, emails, URLs, and common noise from a line,
 * returning only potential name text.
 */
function stripContactInfo(line) {
  return line
    .replace(/\+?\d[\d\s\-().]{7,}/g, '')       // phone numbers
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '') // emails
    .replace(/https?:\/\/\S+/gi, '')             // URLs
    .replace(/www\.\S+/gi, '')                   // www URLs
    .replace(/linkedin\.com\S*/gi, '')
    .replace(/github\.com\S*/gi, '')
    .replace(/[#ï§|]/g, '')                      // common PDF artifacts
    .replace(/[^\x20-\x7E]/g, ' ')              // remove non-ASCII / control chars
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Extracts the candidate name from resume text.
 * @param {string} text - raw resume text
 * @returns {string|null} the extracted name, or null
 */
function extractName(text) {
  if (!text || typeof text !== 'string') return null;

  // 1. Try explicit label first (anywhere in text)
  const labeled = extractFromLabel(text);
  if (labeled) return labeled;

  // 2. Scan the first ~15 non-empty lines for a name-like line
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const searchLimit = Math.min(lines.length, 15);

  for (let i = 0; i < searchLimit; i++) {
    const line = lines[i];
    // First try the raw line
    if (!shouldSkip(line) && looksLikeName(line)) return line;
    // If the line has contact info mixed in, strip it and check the remainder
    const cleaned = stripContactInfo(line);
    if (cleaned && cleaned !== line && !shouldSkip(cleaned) && looksLikeName(cleaned)) {
      return cleaned;
    }
  }

  return null;
}

module.exports = { extractName };