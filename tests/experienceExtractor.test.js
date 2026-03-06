const { extractExperience, extractExperienceFromResume } = require('../src/extractors/experienceExtractor');

describe('extractExperience (JD)', () => {
  test('extracts "5+ years of experience" as 5', () => {
    expect(extractExperience('5+ years of experience in software development')).toBe(5);
  });

  test('extracts "Fresher" as 0', () => {
    expect(extractExperience('Fresher candidates are welcome')).toBe(0);
  });

  test('extracts "7 years of strong handson experience" as 7', () => {
    expect(extractExperience('7 years of strong handson experience')).toBe(7);
  });

  test('extracts "At least 2 years" as 2', () => {
    expect(extractExperience('At least 2 years of professional experience')).toBe(2);
  });

  test('returns null when no experience found', () => {
    expect(extractExperience('We are looking for a senior engineer to join our team')).toBeNull();
  });

  test('extracts lowest from "Bachelor\'s with 5+ years or Master\'s with 3+ years"', () => {
    const text = "Bachelor's with 5+ years of experience, or Master's with 3+ years of experience";
    expect(extractExperience(text)).toBe(3);
  });

  test('extracts "Minimum of 4 years" as 4', () => {
    expect(extractExperience('Minimum of 4 years of relevant experience')).toBe(4);
  });

  test('extracts range "5-7 years" as 5', () => {
    expect(extractExperience('5-7 + years of relevant experience')).toBe(5);
  });

  test('extracts word number "Four (4) years" as 4', () => {
    expect(extractExperience('Four (4) years of professional experience required')).toBe(4);
  });

  test('returns null for empty input', () => {
    expect(extractExperience('')).toBeNull();
    expect(extractExperience(null)).toBeNull();
  });

  // --- New patterns ---
  test('extracts "new graduate" as 0', () => {
    expect(extractExperience('Open to new graduates, no experience required')).toBe(0);
  });

  test('extracts "entry-level" as 0', () => {
    expect(extractExperience('This is an entry-level position')).toBe(0);
  });

  test('extracts months of experience as fractional years', () => {
    const result = extractExperience('6+ months of relevant experience');
    expect(result).toBe(0.5);
  });

  test('extracts "3 years 6 months" combined pattern', () => {
    const result = extractExperience('3 years 6 months of software development experience');
    expect(result).toBe(3.5);
  });

  test('extracts "not less than 5 years"', () => {
    expect(extractExperience('not less than 5 years of experience in backend')).toBe(5);
  });
});

describe('extractExperienceFromResume', () => {
  test('extracts explicit "8 years of experience"', () => {
    expect(extractExperienceFromResume('I have 8 years of experience in backend development.')).toBe(8);
  });

  test('calculates from date ranges', () => {
    const text = 'Experience\nSoftware Engineer\nJan 2018 - Dec 2022\nBuilt microservices.';
    const result = extractExperienceFromResume(text);
    expect(result).toBeGreaterThanOrEqual(4);
    expect(result).toBeLessThanOrEqual(5);
  });

  test('returns null when no experience info found', () => {
    expect(extractExperienceFromResume('Studied Computer Science at MIT.')).toBeNull();
  });
});
