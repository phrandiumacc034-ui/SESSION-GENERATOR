// api/generate.js
// Vercel serverless function that runs the repo's pair.js script
// Expects: node pair.js <number> prints JSON or plain text to stdout
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  // Only POST allowed
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Method not allowed. Use POST' }));
  }

  let body = '';
  try {
    await new Promise((resolve, reject) => {
      req.on('data', (c) => (body += c));
      req.on('end', resolve);
      req.on('error', reject);
    });
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Failed to read body', detail: e.message }));
  }

  let json = null;
  try {
    json = JSON.parse(body || '{}');
  } catch (e) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Invalid JSON body' }));
  }

  const number = (json.number || '').toString().trim();
  if (!number) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'number required' }));
  }

  // Path to pair.js in repo root
  const scriptPath = path.join(process.cwd(), 'pair.js');
  if (!fs.existsSync(scriptPath)) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'pair.js not found in repo root' }));
  }

  try {
    const child = spawn(process.execPath, [scriptPath, number], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 45000 // 45s timeout to avoid runaway processes on Vercel
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const exitCode = await new Promise((resolve) => child.on('close', resolve));

    const result = {
      exitCode,
      stdout: stdout.trim(),
      stderr: stderr.trim()
    };

    // If stdout is JSON, parse and return as JSON
    try {
      const parsed = JSON.parse(result.stdout || '{}');
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: true, raw: result, parsed }));
    } catch (e) {
      // Not JSON: return raw output
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: true, raw: result }));
    }
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'spawn_failed', message: err.message }));
  }
};
