# OpenClawed CLI - Elite Local AI Setup
## Simple Instructions for Robert

### What This Setup Does

- **Connects OpenClaude CLI to your local Ollama server** — no data leaves your machine.
- **Configures 114 models at maximum potential** — every model gets its biggest possible context window without breaking.
- **Lets you pick any model instantly** — via `/model` command, `--model` flag, or double-click batch files.
- **Loads only skills/tools you need** — no automatic desktop scanning.

---

### Quick Start

1. **Start Ollama** (if not running):
   ```
   ollama serve
   ```

2. **Launch OpenClaude with your default model**:
   ```
   run.bat
   ```

3. **Pick a different model inside the app**:
   ```
   /model
   ```
   Then type the model name (e.g. `qwen3.6:27b`) or scroll the list.

---

### Three Ways to Select a Model

| Method | When to Use | How |
|--------|-------------|-----|
| **Interactive `/model`** | Already inside OpenClaude | Type `/model`, pick from list |
| ** `--model` flag** | One-shot headless runs | `node dist/cli.mjs -p "question" --model qwen3.6:27b --bare` |
| **Double-click `.bat`** | Fastest daily switching | `swap-qwen38.bat` or `swap-qwen36.bat` |

---

### Key Files & What They Do

- **`run.bat`** — Main launcher. Starts OpenClaude with `--bare` (no desktop scanning).
- **`elite-launcher.mjs`** — Smart launcher. Validates model, warms it up, sets bare mode.
- **`model-swap.mjs`** — Universal swapper. Changes model on the fly with validation.
- **`swap-qwen38.bat`** / **`swap-qwen36.bat`** — One-click launchers for your two main models.
- **`setup/apply-local-model-settings.mjs`** — The brain. Sets context windows, thinking, plugins, timeouts.
- **`~/.openclaude/settings.json`** — Settings file (auto-managed by the script above — do NOT edit manually).

---

### Model Categories

- **Local models** (102) — Run on your RTX 5090. Biggest contexts: 131k–163k tokens.
- **Cloud models** (12) — Forward to Ollama cloud. Context: 64k–163k tokens.

Cloud models have `:cloud` in the name (e.g. `glm-5.1:cloud`, `kimi-k3:cloud`).

---

### Important Settings (Auto-Applied)

- **Context windows** — Each model gets its honest max (no guessing, no waste).
- **Auto-compact** — Triggers at 131,072 tokens (safe for all models).
- **Max output** — 16,384 tokens per reply.
- **Query idle timeout** — 15 minutes (was 5 minutes — stops premature "timed out" errors).
- **Query hard max** — 2 hours (for big jobs).
- **Thinking** — Maximum effort on every model.

---

### Verification (Check It's Working)

After any update, run these in order:

1. **Build check**:
   ```
   bun run build
   ```

2. **Type check**:
   ```
   bun run typecheck
   ```

3. **Quick test**:
   ```
   node dist/cli.mjs -p "Reply MODEL OK" --model qwen3.6:27b --bare
   ```

4. **Full stack verify**:
   ```
   node setup/verify-local-stack.mjs
   ```
   Must print: `=== LOCAL STACK PASS ===`

---

### What Was Fixed (Summary)

- **`--model` flag ignored** — Fixed in 4 places. Now `--model qwen3.6:27b` actually runs that model.
- **BTS models removed** — No business-specific models in OpenClaude context map.
- **Cloud models added** — 12 cloud proxies configured with honest context limits.
- **Context map cleaned** — Removed stale entries, added missing models. Total: 114 models.
- **Auto-compact corrected** — Global threshold set to 131,072 (was broken).
- **Max output fixed** — Set to 16,384 tokens.
- **No desktop scanning** — `--bare` mode skips automatic file reads.
- **Skills-only loading** — Only loads skills/tools needed for the task you give.

---

### Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "Query timed out" | Model thinking too long | Already fixed — timeout raised to 15 min |
| `--model` ignored | Old bug | Fixed — update to current build |
| Model loads slowly | First load or GPU eviction | Normal — second request will be fast |
| 410 error | Cloud model retired | Switch to another `:cloud` model |
| Plugins missing | Old applier wiped them | Fixed — now preserves your enabled plugins |

---

### Robert's Rules (Standing)

- **No data leaves your machine** — all local, all Ollama.
- **Show proof after every edit** — build output, test results, live model response.
- **Edit scripts, not settings.json** — `setup/apply-local-model-settings.mjs` is the source of truth.
- **BTS models stay out** — they are for other LLM tools, not OpenClaude.
