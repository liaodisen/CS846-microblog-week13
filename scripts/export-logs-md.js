#!/usr/bin/env node

/**
 * Log export script - exports logs in Markdown table format.
 * Reads logs/app.log and converts JSON Lines to formatted Markdown.
 * Run: npm run logs:export-md
 */

const fs = require('fs');
const path = require('path');

const logFile = path.join(process.cwd(), 'logs', 'app.log');
const outputFile = path.join(process.cwd(), 'logs', 'app.log.md');

if (!fs.existsSync(logFile)) {
  console.log('ℹ No logs found. Run the app first to generate logs.');
  process.exit(0);
}

try {
  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.trim().split('\n');

  // Parse JSON Lines
  const logs = lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);

  // Generate Markdown table
  let markdown = '# Application Logs\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `Total Entries: ${logs.length}\n\n`;

  markdown += '| Timestamp | Level | Event | Message | Details |\n';
  markdown += '|-----------|-------|-------|---------|----------|\n';

  for (const log of logs) {
    const timestamp = log.timestamp || '';
    const level = log.level ? log.level.toUpperCase() : '';
    const event = log.event || '';
    const message = log.message || '';
    const details = log.error ? `Error: ${log.error}` : '';

    markdown += `| ${timestamp} | ${level} | ${event} | ${message} | ${details} |\n`;
  }

  fs.writeFileSync(outputFile, markdown, 'utf-8');
  console.log(`✓ Logs exported to ${outputFile}`);
  console.log(`✓ Total entries: ${logs.length}`);
} catch (error) {
  console.error('✗ Failed to export logs:', error.message);
  process.exit(1);
}
