/**
 * Salary Extractor — rule-based, regex-only.
 * Extracts salary / compensation information from free-form text.
 */

// Context keywords that indicate a nearby number is salary-related
const CONTEXT_RE = /salary|compensation|pay\s*range|base\s*salary|pay|ctc|annual|per\s*year|per\s*annum|\blpa\b/i;

// ── Individual salary patterns (ordered from most specific → broadest) ────────

// Pattern 1: Dollar range — "$180,000 - $220,000" / "$120,000.00 - $145,000.00/per year" / "$75,500—$131,200 USD"
//            Supports optional decimals, optional currency suffix, optional per-period suffix
const DOLLAR_RANGE = /\$\s?[\d,]+(?:\.\d{1,2})?(?:\/\w+)?\s*(?:-{1,3}|–|—|to)\s*\$?\s?[\d,]+(?:\.\d{1,2})?(?:\s*\/?\s*(?:per\s*)?(?:year|annum|hr|hour|month|week))?\s*(?:USD|CAD|AUD)?/gi;

// Pattern 2: Dollar single value — "Salary: $139,000"
const DOLLAR_SINGLE = /\$\s?[\d,]+(?:\.\d{1,2})?(?:\s*\/?\s*(?:per\s*)?(?:year|annum|hr|hour|month|week))?(?:\s*(?:USD|CAD|AUD))?/gi;

// Pattern 3: Indian LPA — "12 LPA", "12.5 LPA", "10-15 LPA"
const LPA_RE = /[\d]+(?:\.\d+)?\s*(?:-|to)\s*[\d]+(?:\.\d+)?\s*LPA|[\d]+(?:\.\d+)?\s*LPA/gi;

// Pattern 4: Indian rupee — "₹10,00,000 per annum", "CTC: ₹10,00,000"
const RUPEE_RE = /₹\s?[\d,]+(?:\.\d{1,2})?\s*(?:(?:per\s*)?(?:annum|year|month))?/gi;

// Pattern 5: Bare numeric range near context keywords — "61087 - 104364"
const BARE_RANGE = /[\d,]{4,}(?:\.\d{1,2})?\s*(?:-{1,3}|–|—|to)\s*[\d,]{4,}(?:\.\d{1,2})?(?:\s*\/?\s*(?:per\s*)?(?:year|annum|hr|hour|month|week))?/gi;

/**
 * Try to match a pattern against the full text.
 * If multiple matches, prefer the one closest to a salary context keyword.
 * Returns the matched string or null.
 */
function bestMatch(regex, text) {
  const matches = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    matches.push({ value: m[0].trim(), index: m.index });
  }
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0].value;

  // Score each match by proximity to a context keyword
  for (const match of matches) {
    const window = text.substring(
      Math.max(0, match.index - 80),
      Math.min(text.length, match.index + match.value.length + 80)
    );
    match.hasContext = CONTEXT_RE.test(window);
  }

  const contextual = matches.filter((m) => m.hasContext);
  return contextual.length > 0 ? contextual[0].value : matches[0].value;
}

/**
 * Checks whether a candidate match sits near a salary context keyword.
 */
function hasNearbyContext(text, matchIndex, matchLength) {
  const window = text.substring(
    Math.max(0, matchIndex - 100),
    Math.min(text.length, matchIndex + matchLength + 100)
  );
  return CONTEXT_RE.test(window);
}

/**
 * For bare numeric ranges, we require nearby context to avoid false positives
 * (e.g. phone numbers, zip codes). Returns the best contextual match or null.
 */
function bestBareMatch(regex, text) {
  const matches = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (hasNearbyContext(text, m.index, m[0].length)) {
      matches.push({ value: m[0].trim(), index: m.index });
    }
  }
  return matches.length > 0 ? matches[0].value : null;
}

/**
 * Extracts salary information from text.
 * @param {string} text - raw text (resume or JD)
 * @returns {string|null} extracted salary string, or null
 */
function extractSalary(text) {
  if (!text || typeof text !== 'string') return null;

  // Try patterns in order of specificity

  // 1. Dollar range (most explicit)
  const dollarRange = bestMatch(DOLLAR_RANGE, text);
  if (dollarRange) return dollarRange;

  // 2. Indian LPA
  const lpa = bestMatch(LPA_RE, text);
  if (lpa) return lpa;

  // 3. Indian rupee notation
  const rupee = bestMatch(RUPEE_RE, text);
  if (rupee) return rupee;

  // 4. Single dollar value
  const dollarSingle = bestMatch(DOLLAR_SINGLE, text);
  if (dollarSingle) return dollarSingle;

  // 5. Bare numeric range — only when near salary context words
  const bare = bestBareMatch(BARE_RANGE, text);
  if (bare) return bare;

  return null;
}

module.exports = { extractSalary };