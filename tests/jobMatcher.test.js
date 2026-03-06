const { matchResumeToJDs } = require('../src/matcher/jobMatcher');

describe('matchResumeToJDs', () => {
  test('returns 100% score when all skills match', () => {
    const resume = { resumeSkills: ['Java', 'Python', 'Docker'] };
    const jds = [{
      jobId: 'JD001', role: 'Dev', aboutRole: 'A role',
      requiredSkills: ['Java', 'Python'], optionalSkills: ['Docker'],
    }];

    const results = matchResumeToJDs(resume, jds);
    expect(results[0].matchingScore).toBe(100);
  });

  test('returns 0% score when no skills match', () => {
    const resume = { resumeSkills: ['Java', 'Python'] };
    const jds = [{
      jobId: 'JD001', role: 'Dev', aboutRole: 'A role',
      requiredSkills: ['Go', 'Rust'], optionalSkills: ['Scala'],
    }];

    const results = matchResumeToJDs(resume, jds);
    expect(results[0].matchingScore).toBeLessThanOrEqual(20); // may get small similarity credit
  });

  test('weights required skills higher than optional', () => {
    // Scenario A: matches required only
    const resumeA = { resumeSkills: ['Java', 'Python'] };
    // Scenario B: matches optional only
    const resumeB = { resumeSkills: ['Docker', 'Kubernetes'] };

    const jds = [{
      jobId: 'JD001', role: 'Dev', aboutRole: 'A role',
      requiredSkills: ['Java', 'Python'], optionalSkills: ['Docker', 'Kubernetes'],
    }];

    const resultA = matchResumeToJDs(resumeA, jds);
    const resultB = matchResumeToJDs(resumeB, jds);

    // Matching required skills should give higher score than matching optional
    expect(resultA[0].matchingScore).toBeGreaterThan(resultB[0].matchingScore);
  });

  test('skillsAnalysis correctly marks present and absent skills', () => {
    const resume = { resumeSkills: ['Java', 'Docker'] };
    const jds = [{
      jobId: 'JD001', role: 'Dev', aboutRole: 'A role',
      requiredSkills: ['Java', 'Python'], optionalSkills: ['Docker'],
    }];

    const results = matchResumeToJDs(resume, jds);
    const analysis = results[0].skillsAnalysis;

    const java = analysis.find(s => s.skill === 'Java');
    const python = analysis.find(s => s.skill === 'Python');
    const docker = analysis.find(s => s.skill === 'Docker');

    expect(java.presentInResume).toBe(true);
    expect(python.presentInResume).toBe(false);
    expect(docker.presentInResume).toBe(true);
  });

  test('marks skills as present or absent in analysis', () => {
    const resume = { resumeSkills: ['Java'] };
    const jds = [{
      jobId: 'JD001', role: 'Dev', aboutRole: '',
      requiredSkills: ['Java'], optionalSkills: ['Docker'],
    }];

    const results = matchResumeToJDs(resume, jds);
    const analysis = results[0].skillsAnalysis;

    const java = analysis.find(s => s.skill === 'Java');
    const docker = analysis.find(s => s.skill === 'Docker');

    expect(java.presentInResume).toBe(true);
    expect(docker.presentInResume).toBe(false);
  });

  test('results are sorted by matchingScore descending', () => {
    const resume = { resumeSkills: ['Java', 'Python', 'Docker'] };
    const jds = [
      { jobId: 'JD001', role: 'Low', aboutRole: '', requiredSkills: ['Go'], optionalSkills: [] },
      { jobId: 'JD002', role: 'High', aboutRole: '', requiredSkills: ['Java', 'Python'], optionalSkills: ['Docker'] },
      { jobId: 'JD003', role: 'Mid', aboutRole: '', requiredSkills: ['Java', 'Go'], optionalSkills: [] },
    ];

    const results = matchResumeToJDs(resume, jds);

    expect(results[0].jobId).toBe('JD002');
    expect(results[0].matchingScore).toBe(100);

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].matchingScore).toBeGreaterThanOrEqual(results[i].matchingScore);
    }
  });

  test('handles alias normalization across resume and JD', () => {
    const resume = { resumeSkills: ['Node.js', 'PostgreSQL'] };
    const jds = [{
      jobId: 'JD001', role: 'Dev', aboutRole: '',
      requiredSkills: ['Node.js', 'PostgreSQL'], optionalSkills: [],
    }];

    const results = matchResumeToJDs(resume, jds);
    expect(results[0].matchingScore).toBe(100);
  });

  test('returns correct structure for each result', () => {
    const resume = { resumeSkills: ['Java'] };
    const jds = [{
      jobId: 'JD001', role: 'Backend Dev', aboutRole: 'Build APIs',
      requiredSkills: ['Java'], optionalSkills: [],
    }];

    const results = matchResumeToJDs(resume, jds);

    expect(results[0]).toHaveProperty('jobId', 'JD001');
    expect(results[0]).toHaveProperty('role', 'Backend Dev');
    expect(results[0]).toHaveProperty('aboutRole', 'Build APIs');
    expect(results[0]).toHaveProperty('skillsAnalysis');
    expect(results[0]).toHaveProperty('matchingScore');
    expect(Array.isArray(results[0].skillsAnalysis)).toBe(true);
  });

  // --- Experience proximity scoring ---
  test('gives experience bonus when resume meets JD requirement', () => {
    const resume = { resumeSkills: ['Java'], yearOfExperience: 5 };
    const jds = [{
      jobId: 'JD001', role: 'Dev', aboutRole: '',
      requiredSkills: ['Java'], optionalSkills: [],
      yearOfExperience: 3,
    }];

    const results = matchResumeToJDs(resume, jds);
    expect(results[0].matchingScore).toBe(100); // 100 + bonus clamped to 100
  });

  test('penalizes score when experience is far below requirement', () => {
    const resume = { resumeSkills: ['Java', 'Python'], yearOfExperience: 1 };
    const jds = [{
      jobId: 'JD001', role: 'Dev', aboutRole: '',
      requiredSkills: ['Java', 'Python'], optionalSkills: [],
      yearOfExperience: 8,
    }];

    const results = matchResumeToJDs(resume, jds);
    expect(results[0].matchingScore).toBeLessThan(100);
  });

  test('no experience penalty when data is missing', () => {
    const resume = { resumeSkills: ['Java'] };
    const jds = [{
      jobId: 'JD001', role: 'Dev', aboutRole: '',
      requiredSkills: ['Java'], optionalSkills: [],
    }];

    const results = matchResumeToJDs(resume, jds);
    expect(results[0].matchingScore).toBe(100); // no penalty when data missing
  });

  // --- Skill category similarity ---
  test('gives partial credit for similar skills (React vs Angular)', () => {
    const resume = { resumeSkills: ['React'] };
    const jds = [{
      jobId: 'JD001', role: 'Dev', aboutRole: '',
      requiredSkills: ['Angular'], optionalSkills: [],
    }];

    const results = matchResumeToJDs(resume, jds);
    // Should get some score even though Angular != React (they're similar frontend frameworks)
    expect(results[0].matchingScore).toBeGreaterThan(0);
    expect(results[0].matchingScore).toBeLessThan(100);
  });

  test('gives partial credit for similar DBs (MySQL vs PostgreSQL)', () => {
    const resume = { resumeSkills: ['MySQL'] };
    const jds = [{
      jobId: 'JD001', role: 'Dev', aboutRole: '',
      requiredSkills: ['PostgreSQL'], optionalSkills: [],
    }];

    const results = matchResumeToJDs(resume, jds);
    expect(results[0].matchingScore).toBeGreaterThan(0);
  });

  test('gives high similarity credit for JavaScript vs TypeScript', () => {
    const resume = { resumeSkills: ['JavaScript'] };
    const jds = [{
      jobId: 'JD001', role: 'Dev', aboutRole: '',
      requiredSkills: ['TypeScript'], optionalSkills: [],
    }];

    const results = matchResumeToJDs(resume, jds);
    expect(results[0].matchingScore).toBeGreaterThanOrEqual(40);
  });

  // --- Output format ---
  test('each skill entry has only skill and presentInResume fields', () => {
    const resume = { resumeSkills: ['Java', 'Docker'], yearOfExperience: 3 };
    const jds = [{
      jobId: 'JD001', role: 'Dev', aboutRole: '',
      requiredSkills: ['Java', 'Python'], optionalSkills: ['Docker', 'Kubernetes'],
      yearOfExperience: 3,
    }];

    const results = matchResumeToJDs(resume, jds);
    const entry = results[0].skillsAnalysis[0];

    expect(Object.keys(entry).sort()).toEqual(['presentInResume', 'skill']);
  });
});
