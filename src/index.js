/**
 * Main entry point — Resume Parsing and Job Matching System.
 *
 * CLI mode:
 *   node src/index.js --resume <path-to-pdf> --jd <path-to-txt-or-folder>
 *
 * Server mode:
 *   node src/index.js --server [--port 3000]
 */

const fs = require('fs');
const path = require('path');
const { parseResume } = require('./parsers/resumeParser');
const { parseJD } = require('./parsers/jdParser');
const { matchResumeToJDs } = require('./matcher/jobMatcher');

// ── Argument parsing ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--resume' && argv[i + 1]) {
      args.resume = argv[++i];
    } else if (argv[i] === '--jd' && argv[i + 1]) {
      args.jd = argv[++i];
    } else if (argv[i] === '--server') {
      args.server = true;
    } else if (argv[i] === '--port' && argv[i + 1]) {
      args.port = parseInt(argv[++i], 10);
    }
  }
  return args;
}

// ── JD file loading ──────────────────────────────────────────────────────────

function loadJDTexts(jdPath) {
  const resolved = path.resolve(jdPath);

  if (!fs.existsSync(resolved)) {
    console.error(`Error: JD path not found: ${resolved}`);
    process.exit(1);
  }

  const stat = fs.statSync(resolved);

  if (stat.isFile()) {
    return [{ file: path.basename(resolved), text: fs.readFileSync(resolved, 'utf-8') }];
  }

  if (stat.isDirectory()) {
    const files = fs.readdirSync(resolved)
      .filter((f) => f.endsWith('.txt'))
      .sort();

    if (files.length === 0) {
      console.error(`Error: No .txt JD files found in ${resolved}`);
      process.exit(1);
    }

    return files.map((f) => ({
      file: f,
      text: fs.readFileSync(path.join(resolved, f), 'utf-8'),
    }));
  }

  console.error(`Error: JD path is neither a file nor directory: ${resolved}`);
  process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  // ── Server mode ──────────────────────────────────────────────────────────
  if (args.server) {
    const express = require('express');
    const { createApp } = require('./api/routes');
    const app = createApp();
    // Serve static frontend from public/ BEFORE API routes
    app.use(express.static(path.join(__dirname, '..', 'public')));
    const port = args.port || 3000;
    app.listen(port, () => {
      console.log(`Resume Matching API server running on http://localhost:${port}`);
      console.log('Endpoints:');
      console.log('  GET  /api/health');
      console.log('  POST /api/parse-resume');
      console.log('  POST /api/parse-jd');
      console.log('  POST /api/match');
    });
    return;
  }

  // ── CLI mode ─────────────────────────────────────────────────────────────
  if (!args.resume || !args.jd) {
    console.error('Usage:');
    console.error('  CLI:    node src/index.js --resume <path-to-pdf> --jd <path-to-folder-or-file>');
    console.error('  Server: node src/index.js --server [--port 3000]');
    process.exit(1);
  }

  // Validate resume path
  const resumePath = path.resolve(args.resume);
  if (!fs.existsSync(resumePath)) {
    console.error(`Error: Resume file not found: ${resumePath}`);
    process.exit(1);
  }

  // 1. Parse resume
  const resumeData = await parseResume(resumePath);

  // 2. Load and parse JDs
  const jdTexts = loadJDTexts(args.jd);
  const parsedJDs = jdTexts.map((jd, i) => {
    const jobId = `JD${String(i + 1).padStart(3, '0')}`;
    return parseJD(jd.text, jobId);
  });

  // 3. Match
  const matchingJobs = matchResumeToJDs(resumeData, parsedJDs);

  // 4. Build output
  const output = {
    name: resumeData.name,
    salary: resumeData.salary,
    yearOfExperience: resumeData.yearOfExperience,
    resumeSkills: resumeData.resumeSkills,
    matchingJobs,
  };

  // 5. Print and save
  const json = JSON.stringify(output, null, 2);
  console.log(json);

  const outputDir = path.resolve(__dirname, '..', 'sample');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outputDir, 'output.json'), json, 'utf-8');
  console.error('Output saved to sample/output.json');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});