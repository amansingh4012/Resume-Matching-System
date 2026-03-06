const { extractSkills, extractRequiredAndOptionalSkills } = require('../src/extractors/skillExtractor');

describe('extractSkills', () => {
  test('extracts "Java" from text', () => {
    const skills = extractSkills('Experience with Java programming');
    expect(skills).toContain('Java');
  });

  test('extracts "C++" correctly', () => {
    const skills = extractSkills('Proficient in C++ development');
    expect(skills).toContain('C++');
  });

  test('does NOT extract "C" from "CTC" or "Capgemini"', () => {
    const skills = extractSkills('CTC is 15 LPA at Capgemini');
    expect(skills).not.toContain('C');
  });

  test('extracts "C" when used as standalone language', () => {
    const skills = extractSkills('Strong C programming skills');
    expect(skills).toContain('C');
  });

  test('resolves alias "React.js" to "React"', () => {
    const skills = extractSkills('Built apps with React.js');
    expect(skills).toContain('React');
  });

  test('resolves alias "k8s" to "Kubernetes"', () => {
    const skills = extractSkills('Deployed using k8s clusters');
    expect(skills).toContain('Kubernetes');
  });

  test('resolves alias "nodejs" to "Node.js"', () => {
    const skills = extractSkills('Backend built with nodejs');
    expect(skills).toContain('Node.js');
  });

  test('extracts multi-word skills like "Spring Boot"', () => {
    const skills = extractSkills('Experience with Spring Boot and Machine Learning');
    expect(skills).toContain('Spring Boot');
    expect(skills).toContain('Machine Learning');
  });

  test('returns deduplicated results', () => {
    const skills = extractSkills('Java and Java programming. Also nodejs and Node.js');
    const javaCount = skills.filter(s => s === 'Java').length;
    const nodeCount = skills.filter(s => s === 'Node.js').length;
    expect(javaCount).toBe(1);
    expect(nodeCount).toBe(1);
  });

  test('returns empty array for empty input', () => {
    expect(extractSkills('')).toEqual([]);
    expect(extractSkills(null)).toEqual([]);
  });

  // --- Version-aware matching ---
  test('detects Python3 / Python 3.11 as Python', () => {
    const skills = extractSkills('Experience with Python3 and Python 3.11 development');
    expect(skills).toContain('Python');
  });

  test('detects ES6 as JavaScript', () => {
    const skills = extractSkills('Proficient in ES6 and modern JavaScript features');
    expect(skills).toContain('JavaScript');
  });

  test('detects HTML5 and CSS3', () => {
    const skills = extractSkills('Built responsive pages with HTML5 and CSS3');
    expect(skills).toContain('HTML');
    expect(skills).toContain('CSS');
  });

  test('detects Angular14 as Angular', () => {
    const skills = extractSkills('Migrated app from Angular14 to Angular16');
    expect(skills).toContain('Angular');
  });

  // --- Slash-separated skill splitting ---
  test('splits HTML/CSS/JS into individual skills', () => {
    const skills = extractSkills('Tech stack: HTML/CSS/JS for frontend development');
    expect(skills).toContain('HTML');
    expect(skills).toContain('CSS');
  });

  test('splits React/Redux into individual skills', () => {
    const skills = extractSkills('Built with React/Redux for state management');
    expect(skills).toContain('React');
    expect(skills).toContain('Redux');
  });

  test('does NOT split CI/CD into parts', () => {
    const skills = extractSkills('Implemented CI/CD pipelines');
    expect(skills).toContain('CI/CD');
  });

  // --- Tech stack acronym expansion ---
  test('expands MERN stack to component skills', () => {
    const skills = extractSkills('Full stack developer using MERN stack');
    expect(skills).toContain('MongoDB');
    expect(skills).toContain('Express');
    expect(skills).toContain('React');
    expect(skills).toContain('Node.js');
  });

  test('expands LAMP stack to component skills', () => {
    const skills = extractSkills('Experience with LAMP development');
    expect(skills).toContain('Linux');
    expect(skills).toContain('Apache');
    expect(skills).toContain('MySQL');
    expect(skills).toContain('PHP');
  });

  test('expands ELK stack', () => {
    const skills = extractSkills('Monitoring with ELK stack');
    expect(skills).toContain('ElasticSearch');
    expect(skills).toContain('Logstash');
    expect(skills).toContain('Kibana');
  });

  // --- Typo/misspelling correction ---
  test('corrects "kubernates" to Kubernetes', () => {
    const skills = extractSkills('Deployed on kubernates clusters');
    expect(skills).toContain('Kubernetes');
  });

  test('corrects "postgress" to PostgreSQL', () => {
    const skills = extractSkills('Database: postgress for backend storage');
    expect(skills).toContain('PostgreSQL');
  });

  test('corrects "docekr" to Docker', () => {
    const skills = extractSkills('Containerized using docekr');
    expect(skills).toContain('Docker');
  });

  test('corrects "selinium" to Selenium', () => {
    const skills = extractSkills('Testing with selinium');
    expect(skills).toContain('Selenium');
  });

  // --- Implicit skill inference ---
  test('infers JavaScript from React', () => {
    const skills = extractSkills('Built UI with React framework');
    expect(skills).toContain('React');
    expect(skills).toContain('JavaScript');
  });

  test('infers Python from Django', () => {
    const skills = extractSkills('Backend with Django framework');
    expect(skills).toContain('Django');
    expect(skills).toContain('Python');
  });

  test('infers Java and Spring from Spring Boot', () => {
    const skills = extractSkills('Microservices with Spring Boot');
    expect(skills).toContain('Spring Boot');
    expect(skills).toContain('Spring');
    expect(skills).toContain('Java');
  });

  test('infers Dart from Flutter', () => {
    const skills = extractSkills('Mobile app built with Flutter');
    expect(skills).toContain('Flutter');
    expect(skills).toContain('Dart');
  });

  test('infers MongoDB and JavaScript from Mongoose', () => {
    const skills = extractSkills('Used Mongoose for database ODM');
    expect(skills).toContain('Mongoose');
    expect(skills).toContain('MongoDB');
    expect(skills).toContain('JavaScript');
  });

  // --- Parenthetical extraction ---
  test('extracts skills from parenthetical lists', () => {
    const skills = extractSkills('Proficient in databases (MySQL, PostgreSQL, Redis)');
    expect(skills).toContain('MySQL');
    expect(skills).toContain('PostgreSQL');
    expect(skills).toContain('Redis');
  });

  // --- Enhanced false-positive filtering ---
  test('does NOT extract "Go" from "going" or "goal"', () => {
    const skills = extractSkills('We are going to achieve our goal');
    expect(skills).not.toContain('Go');
  });

  test('does NOT extract "Rust" from "rusty"', () => {
    const skills = extractSkills('My skills are a bit rusty');
    expect(skills).not.toContain('Rust');
  });

  test('does NOT extract "Swift" from "swiftly"', () => {
    const skills = extractSkills('We swiftly completed the project');
    expect(skills).not.toContain('Swift');
  });

  test('extracts "Go" when used as a programming language', () => {
    const skills = extractSkills('Backend services written in Go programming language');
    expect(skills).toContain('Go');
  });
});

describe('extractRequiredAndOptionalSkills', () => {
  test('splits required and optional skills from JD sections', () => {
    const jd = [
      'Senior Backend Engineer',
      '',
      'Required Qualifications:',
      '- Java, Spring Boot',
      '- Microservices',
      '- AWS',
      '',
      'Preferred Qualifications:',
      '- Kubernetes',
      '- Terraform',
      '- Python',
    ].join('\n');

    const { requiredSkills, optionalSkills } = extractRequiredAndOptionalSkills(jd);

    expect(requiredSkills).toContain('Java');
    expect(requiredSkills).toContain('Spring Boot');
    expect(requiredSkills).toContain('AWS');
    expect(optionalSkills).toContain('Kubernetes');
    expect(optionalSkills).toContain('Python');
  });

  test('treats all skills as required when no section headers found', () => {
    const text = 'Looking for Java, Python, and Docker experience';
    const { requiredSkills, optionalSkills } = extractRequiredAndOptionalSkills(text);

    expect(requiredSkills.length).toBeGreaterThan(0);
    expect(optionalSkills).toEqual([]);
  });

  test('does not duplicate skills across required and optional', () => {
    const jd = [
      'Required Skills:',
      '- Java, AWS',
      '',
      'Nice to Have:',
      '- Java, Docker',
    ].join('\n');

    const { requiredSkills, optionalSkills } = extractRequiredAndOptionalSkills(jd);
    expect(requiredSkills).toContain('Java');
    expect(optionalSkills).not.toContain('Java');
  });
});
