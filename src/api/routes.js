/**
 * Express API routes for the Resume Parsing and Job Matching System.
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { parseResume, parseResumeFromText } = require('../parsers/resumeParser');
const { parseJD } = require('../parsers/jdParser');
const { matchResumeToJDs } = require('../matcher/jobMatcher');

// Multer: store uploads in memory (no disk persistence needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'));
    }
  },
});

/**
 * Create and configure the Express app.
 */
function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  // ── GET /api/health ────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // ── GET /api/sample-jds ────────────────────────────────────────────────────
  app.get('/api/sample-jds', (_req, res) => {
    try {
      const jdDir = path.join(__dirname, '..', '..', 'sample', 'jds');
      if (!fs.existsSync(jdDir)) {
        return res.status(404).json({ error: 'sample/jds directory not found.' });
      }
      const files = fs.readdirSync(jdDir)
        .filter((f) => f.endsWith('.txt'))
        .sort();
      const result = files.map((fileName, i) => ({
        jobId: 'JD' + String(i + 1).padStart(3, '0'),
        fileName,
        jdText: fs.readFileSync(path.join(jdDir, fileName), 'utf-8'),
      }));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load sample JDs: ' + err.message });
    }
  });

  // ── POST /api/parse-resume ─────────────────────────────────────────────────
  app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No resume PDF file provided. Use field name "resume".' });
      }

      const pdfData = await pdfParse(req.file.buffer);
      const result = parseResumeFromText(pdfData.text);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to parse resume: ' + err.message });
    }
  });

  // ── POST /api/parse-jd ────────────────────────────────────────────────────
  app.post('/api/parse-jd', (req, res) => {
    try {
      const { jdText, jobId } = req.body || {};

      if (!jdText || typeof jdText !== 'string') {
        return res.status(400).json({ error: 'Missing required field "jdText" (string).' });
      }

      const result = parseJD(jdText, jobId || undefined);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to parse JD: ' + err.message });
    }
  });

  // ── POST /api/match ────────────────────────────────────────────────────────
  // Accepts either:
  //   A) multipart: file field "resume" (PDF) + text field "jds" (JSON array)
  //   B) JSON body: { "resumeText": "...", "jds": [{ "jdText": "...", "jobId": "..." }] }
  app.post('/api/match', upload.single('resume'), async (req, res) => {
    try {
      let resumeData;
      let jdsInput;

      if (req.file) {
        // Multipart mode
        const pdfData = await pdfParse(req.file.buffer);
        resumeData = parseResumeFromText(pdfData.text);

        // jds comes as a string field in multipart
        const jdsRaw = req.body.jds;
        if (!jdsRaw) {
          return res.status(400).json({ error: 'Missing "jds" field with JD array.' });
        }
        try {
          jdsInput = typeof jdsRaw === 'string' ? JSON.parse(jdsRaw) : jdsRaw;
        } catch {
          return res.status(400).json({ error: '"jds" field must be valid JSON array.' });
        }
      } else {
        // JSON body mode
        const { resumeText, jds } = req.body || {};

        if (!resumeText || typeof resumeText !== 'string') {
          return res.status(400).json({ error: 'Provide either a resume PDF file or "resumeText" in JSON body.' });
        }
        resumeData = parseResumeFromText(resumeText);
        jdsInput = jds;
      }

      if (!Array.isArray(jdsInput) || jdsInput.length === 0) {
        return res.status(400).json({ error: '"jds" must be a non-empty array of JD objects with "jdText".' });
      }

      // Parse each JD
      const parsedJDs = jdsInput.map((jd, i) => {
        const text = jd.jdText || jd.text || '';
        const jobId = jd.jobId || `JD${String(i + 1).padStart(3, '0')}`;
        return parseJD(text, jobId);
      });

      // Match
      const matchingJobs = matchResumeToJDs(resumeData, parsedJDs);

      // Build output
      const output = {
        name: resumeData.name,
        salary: resumeData.salary,
        yearOfExperience: resumeData.yearOfExperience,
        resumeSkills: resumeData.resumeSkills,
        matchingJobs,
      };

      res.json(output);
    } catch (err) {
      res.status(500).json({ error: 'Matching failed: ' + err.message });
    }
  });

  // Multer error handler
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  return app;
}

module.exports = { createApp };