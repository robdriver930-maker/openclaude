#!/usr/bin/env node
/**
 * OpenClaude ELITE Launcher — Bobby's Tech Services
 * Handles: model validation, env setup, warmup, bare mode
 * Usage: node elite-launcher.mjs [model-name] [--bare]
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT = join(__dirname);
const OLLAMA_URL = 'http://127.0.0.1:11434';

async function ollamaTags() {
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.models || []).map(m => m.name);
  } catch {
    return [];
  }
}

async function ollamaPs() {
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/ps`, { signal: AbortSignal.timeout(3000) });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.models || []).map(m => m.name);
  } catch {
    return [];
  }
}

async function warmModel(model) {
  try {
    await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, keep_alive: '24h', prompt: '' }),
      signal: AbortSignal.timeout(120000),
    });
    return true;
  } catch {
    return false;
  }
}

function readSettingsRaw() {
  try {
    const settingsPath = join(homedir(), '.openclaude', 'settings.json');
    return JSON.parse(readFileSync(settingsPath, 'utf8'));
  } catch {
    return null;
  }
}

function getContextFromSettings(model) {
  const settings = readSettingsRaw();
  try {
    const mapRaw = settings?.env?.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS;
    if (!mapRaw) return 163840;
    const map = JSON.parse(mapRaw);
    return map[model] || 163840;
  } catch {
    return 163840;
  }
}

function printBanner(model, ctxSize, autoCompact, maxOutput, bare) {
  const k = Math.round(ctxSize / 1024);
  console.log('\n' + '='.repeat(60));
  console.log('  OpenClaude ELITE — Bobby\'s Tech Services');
  console.log('='.repeat(60));
  console.log(`  Model:      ${model}`);
  console.log(`  Context:    ${ctxSize} tokens (${k}k)`);
  console.log(`  Compact:    ${autoCompact}`);
  console.log(`  Max output: ${maxOutput} tokens`);
  if (bare) console.log('  Mode:       BARE (skills on-demand, no auto-scan)');
  console.log('='.repeat(60) + '\n');
}

async function main() {
  const args = process.argv.slice(2);
  const bare = args.includes('--bare');
  const help = args.includes('--help') || args.includes('-h');
  const debug = args.includes('--debug');
  
  // Filter out flags
  const posArgs = args.filter(a => !a.startsWith('-'));
  let model = posArgs[0] || 'qwen3.8-oc-code:27b';

  if (help) {
    console.log('OpenClaude ELITE Launcher');
    console.log('');
    console.log('Usage: node elite-launcher.mjs [model-name] [--bare] [--debug]');
    console.log('');
    console.log('Examples:');
    console.log('  node elite-launcher.mjs qwen3.6:27b');
    console.log('  node elite-launcher.mjs uncensored:latest --bare');
    console.log('  node elite-launcher.mjs --help');
    console.log('');
    console.log('Fetching available models...');
    const available = await ollamaTags();
    if (!available.length) {
      console.log('  (Ollama not responding — start Ollama first)');
    } else {
      available.sort().forEach(m => console.log(`  • ${m}`));
    }
    process.exit(0);
  }

  // Validate Ollama
  const available = await ollamaTags();
  if (!available.length) {
    console.error('ERROR: Ollama not responding at 127.0.0.1:11434');
    console.error('Start Ollama and try again.');
    process.exit(1);
  }

  if (!available.includes(model)) {
    console.error(`ERROR: Model "${model}" not found in Ollama.`);
    console.error('Available models:');
    available.sort().forEach(m => console.error(`  • ${m}`));
    process.exit(1);
  }

  // Get context and compute derived values
  const ctxSize = getContextFromSettings(model);
  const autoCompact = Math.floor(ctxSize * 0.80);
  const maxOutput = Math.min(16384, Math.floor(ctxSize * 0.10));

  printBanner(model, ctxSize, autoCompact, maxOutput, bare);

  // Warm model
  const loaded = await ollamaPs();
  if (!loaded.includes(model)) {
    process.stdout.write(`Warming model ${model}... `);
    const ok = await warmModel(model);
    console.log(ok ? 'READY' : 'skipped');
  } else {
    console.log(`Model ${model} already loaded.`);
  }

  // Build environment. Context map + auto-compact table are passed through
  // VERBATIM from settings.json (the applier is their single source of truth).
  // Previous versions wrote a malformed `${model}=${ctxSize}` string here and
  // a scalar auto-compact that fought the per-model cap table.
  const settingsRaw = readSettingsRaw();
  const env = {
    ...process.env,
    OPENAI_API_KEY: 'x',
    OPENAI_BASE_URL: 'http://127.0.0.1:11434/v1',
    CLAUDE_CODE_USE_OPENAI: '1',
    OPENAI_MODEL: model,
  };
  if (settingsRaw?.env?.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS) {
    env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS = settingsRaw.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS;
  }
  if (settingsRaw?.env?.CLAUDE_CODE_AUTO_COMPACT_WINDOW) {
    env.CLAUDE_CODE_AUTO_COMPACT_WINDOW = settingsRaw.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW;
  }
  if (settingsRaw?.env?.CLAUDE_CODE_MAX_OUTPUT_TOKENS) {
    env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = settingsRaw.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS;
  }
  if (bare) {
    env.CLAUDE_CODE_SIMPLE = '1';
  }

  // Build CLI args
  const cliPath = join(ROOT, 'dist', 'cli.mjs');
  if (!existsSync(cliPath)) {
    console.error(`ERROR: ${cliPath} not found. Build first: bun run build`);
    process.exit(1);
  }

  const nodeArgs = [
    '--max-old-space-size=32768',
    cliPath,
    '--model', model,
    '--effort', 'max',
    '--dangerously-skip-permissions',
    '--permission-mode', 'bypassPermissions',
  ];
  if (bare) nodeArgs.push('--bare');
  if (debug) nodeArgs.push('--debug');

  console.log('Launching OpenClaude...\n');

  const child = spawn('node', nodeArgs, {
    env,
    stdio: 'inherit',
    cwd: ROOT,
  });

  child.on('exit', (code) => {
    console.log('');
    if (code === 0) {
      console.log('OpenClaude closed normally.');
    } else {
      console.log(`OpenClaude exited with code ${code}.`);
    }
    process.exit(code ?? 0);
  });
}

main().catch(err => {
  console.error('Launcher error:', err.message);
  process.exit(1);
});
