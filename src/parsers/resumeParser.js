/**
 * Resume Parser — extracts structured data from PDF or raw text resumes.
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { extractName } = require('../extractors/nameExtractor');
const { extractSkills } = require('../extractors/skillExtractor');
const { extractExperienceFromResume } = require('../extractors/experienceExtractor');
const { extractSalary } = require('../extractors/salaryExtractor');

/**
 * Parse a resume from raw text.
 * @param {string} text - raw resume text
 * @returns {object} structured resume data
 */
function parseResumeFromText(text) {
  return {
    name: extractName(text),
    salary: extractSalary(text),
    yearOfExperience: extractExperienceFromResume(text),
    resumeSkills: extractSkills(text),
  };
}

/**
 * Parse a resume from a PDF file.
 * @param {string} filePath - absolute or relative path to the PDF file
 * @returns {Promise<object>} structured resume data
 */
async function parseResume(filePath) {
  const resolved = path.resolve(filePath);
  const dataBuffer = fs.readFileSync(resolved);
  const pdfData = await pdfParse(dataBuffer);
  return parseResumeFromText(pdfData.text);
}

module.exports = { parseResume, parseResumeFromText };