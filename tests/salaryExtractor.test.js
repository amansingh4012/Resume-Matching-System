const { extractSalary } = require('../src/extractors/salaryExtractor');

describe('extractSalary', () => {
  test('extracts dollar range "$180,000 - $220,000"', () => {
    const result = extractSalary('The salary range is $180,000 - $220,000 per year.');
    expect(result).toContain('$180,000');
    expect(result).toContain('$220,000');
  });

  test('extracts dollar range with decimals and per year', () => {
    const result = extractSalary('Compensation: $120,000.00 - $145,000.00/per year plus bonus.');
    expect(result).toContain('$120,000.00');
    expect(result).toContain('$145,000.00');
  });

  test('extracts Indian LPA format', () => {
    const result = extractSalary('The CTC offered is 12 LPA for this role.');
    expect(result).toBe('12 LPA');
  });

  test('extracts dollar range with em-dash and USD suffix', () => {
    const result = extractSalary('Pay range: $75,500\u2014$131,200 USD for this role.');
    expect(result).toContain('$75,500');
    expect(result).toContain('$131,200');
  });

  test('returns null when no salary is present', () => {
    const result = extractSalary('We are looking for a software engineer with 5 years experience.');
    expect(result).toBeNull();
  });

  test('extracts hourly-to-yearly mixed format', () => {
    const result = extractSalary('Compensation: $58.65/hour to $181,000/year for the position.');
    expect(result).toContain('$58.65');
    expect(result).toContain('$181,000');
  });

  test('extracts bare numeric range near salary context', () => {
    const result = extractSalary('Annual salary range 61087 - 104364 based on qualifications.');
    expect(result).toContain('61087');
    expect(result).toContain('104364');
  });

  test('extracts single dollar value', () => {
    const result = extractSalary('Salary: $150,000 for this role.');
    expect(result).toContain('$150,000');
  });

  test('extracts rupee format', () => {
    const result = extractSalary('CTC: \u20B910,00,000 per annum plus benefits.');
    expect(result).toContain('\u20B910,00,000');
  });

  test('returns null for empty input', () => {
    expect(extractSalary('')).toBeNull();
    expect(extractSalary(null)).toBeNull();
  });
});
