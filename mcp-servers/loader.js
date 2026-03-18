#!/usr/bin/env node
import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const envFile = '/home/aliz/mcp-servers/.env';
const serverPath = process.argv[2];

const env = { ...process.env };

try {
  const envContent = readFileSync(envFile, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
} catch (e) {
  console.error('Warning: Could not load .env file');
}

const server = spawn('node', [serverPath], {
  env,
  stdio: 'inherit'
});

server.on('exit', code => process.exit(code));
