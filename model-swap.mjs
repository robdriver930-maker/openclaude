#!/usr/bin/env node
/**
 * OpenClaude Model Swapper — Instant model switching
 * Usage: node model-swap.mjs <model-name>
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function ollamaTags() {
  try {
    const resp = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.models || []).map(m => m.name);
  } catch { return []; }
}

function getContextFromSettings(model) {
  try {
    const raw = readFileSync(join(homedir(), '.openclaude', 'settings.json'), 'utf8');
    const j = JSON.parse(raw);
    const mapRaw = j.env?.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS;
    if (!mapRaw) return 163840;
    const map = JSON.parse(mapRaw);
    return map[model] || 163840;
  } catch { return 163840; }
}

async function main() {
  const args = process.argv.slice(2);
  const model = args[0];
  const extraArgs = args.slice(1);

  if (!model || model === '--help' || model === '-h') {
    console.log('OpenClaude Model Swapper');
    console.log('Usage: node model-swap.mjs <model-name>');
    console.log('');
    console.log('Quick swaps (top models):');
    console.log('  node model-swap.mjs qwen3.8-oc-code:27b');
    console.log('  node model-swap.mjs qwen3.6:27b');
    console.log('  node model-swap.mjs deepseek-coder-v2:16b');
    console.log('  node model-swap.mjs uncensored:latest');
    console.log('  node model-swap.mjs glm-4.7-flash:latest');
    console.log('');
    console.log('Fetching available models...');
    const available = await ollamaTags();
    if (!available.length) {
      console.log('  (Ollama not responding)');
    } else {
      available.sort().forEach(m => console.log(`  • ${m}`));
    }
    process.exit(0);
  }

  // Validate
  const available = await ollamaTags();
  if (!available.includes(model)) {
    console.error(`ERROR: "${model}" not found in Ollama.`);
    console.error('Run `node model-swap.mjs` to see available models.');
    process.exit(1);
  }

  const ctxSize = getContextFromSettings(model);
  const autoCompact = Math.floor(ctxSize * 0.80);
  const maxOutput = Math.min(16384, Math.floor(ctxSize * 0.10));

  console.log('');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  OpenClaude MODEL SWAP                        ║');
  console.log('╠═══════════════════════════════════════════════╣');
  console.log(`║  New model:  ${model.padEnd(34)}║`);
  console.log(`║  Context:    ${String(ctxSize).padEnd(34)}║`);
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');

  // Update the active model env and restart
  const env = {
    ...process.env,
    OPENAI_API_KEY: 'x',
    OPENAI_BASE_URL: 'http://127.0.0.1:11434/v1',
    CLAUDE_CODE_USE_OPENAI: '1',
    OPENAI_MODEL: model,
    CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS: `${model}=${ctxSize}`,
    CLAUDE_CODE_AUTO_COMPACT_WINDOW: String(autoCompact),
    CLAUDE_CODE_MAX_OUTPUT_TOKENS: String(maxOutput),
    CLAUDE_CODE_OLLAMA_ONLY: '1',
    CLAUDE_CODE_SIMPLE: '1',
  };

  const cliPath = join(process.cwd(), 'dist', 'cli.mjs');
  if (!existsSync(cliPath)) {
    console.error(`ERROR: ${cliPath} not found. Run: bun run build`);
    process.exit(1);
  }

  const nodeArgs = [
    '--max-old-space-size=32768',
    cliPath,
    '--model', model,
    '--bare',
    '--effort', 'max',
    '--dangerously-skip-permissions',
    '--permission-mode', 'bypassPermissions',
    ...extraArgs,
  ];

  console.log(`Launching ${model}...`);
  console.log('');

  const child = spawn('node', nodeArgs, {
    env,
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  child.on('exit', code => process.exit(code ?? 0));
}

main().catch(err => {
  console.error('Swap error:', err.message);
  process.exit(1);
});
