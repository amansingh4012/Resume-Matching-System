const { createApp } = require('../src/api/routes');
const path = require('path');
const express = require('express');

const app = createApp();

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Fallback: serve index.html for non-API routes (SPA support)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;
