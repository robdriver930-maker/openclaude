# OpenClaude — Improvement Scan (WALLBREAKER)

Scope: full tree of `openclaude-main`. 2,434 non-test TS/TSX files, 563 test files.
Method: structural census + deep reads of the highest-risk/largest modules (bash security,
API shim, package manifest, docs, repo map). Findings ranked by leverage.

## Repo profile (what's already strong — don't break these)

- Near-zero runtime dependencies (3 prod deps); provider layer is a local
  OpenAI-compatible translation shim covering ~12 backends + smart routing.
- Bash permission security is *exceptionally* hardened: documented adversarial traces
  (HackerOne), parser-differential coverage (shell-quote vs bash vs tree-sitter),
  quote-desync, CR tokenization, IFS, zmodload, quoted-newline/comment attacks.
- Real hygiene rails: `scan-secrets`, `pr-intent-scan`, `verify-no-phone-home`, Knip
  dead-code gate, coverage heatmap, doctor script.

## Tier 1 — architecture debt (highest leverage)

### 1. Duplicate bash-security pipelines (maintenance-exploit risk)
`src/tools/BashTool/bashSecurity.ts` contains TWO near-identical validator drivers —
`bashCommandIsSafe_DEPRECATED` and `bashCommandIsSafeAsync_DEPRECATED` — each with its
own copy of the 20+ validator list, the early-validator list, the deferred-non-misparsing
ask logic. Comments state a THIRD gate exists (`parseForSecurity` in ast.ts) with this
file as fallback. Any future rule added to one list and not the other is a latent
bypass; this file's own SECURITY comments show ordering mistakes have broken it before.
**Fix:** one pipeline function `(ctx: ValidationContext, ts?: TreeSitterAnalysis)` —
build the validator chain exactly once; make sync/async thin adapters around it.
Delete or reduce the deprecated exports to re-exports after a deprecation window.

### 2. Runtime dependencies are invisible to production tooling
`axios`, `commander`, `zod`, `react`, `undici`, `sharp`, tree-sitter WASMs, etc. all
live in **devDependencies**; only @orama + ripgrep are prod deps. It works only because
`dist/cli.mjs` is shipped pre-bundled. Consequences broken for you:
- `npm audit --production` (your own `security:audit` script) mostly audits the wrong set;
- any downstream/CI consumer that builds from source on a clean prod install will fail;
- slim Docker layers can't be reasoned about.
**Fix:** move true runtime imports to `dependencies` (or add a CI gate proving
`npm i --production && bun run build` succeeds and document the bundle-only contract).

### 3. Feature-flag sprawl without a registry
Flags like `REPO_MAP`, `UNATTENDED_RETRY` are read ad hoc via env + `--feature=` CLI knob,
scattered across src with no single manifest of name/default/owner/docs.
**Fix:** `src/features.ts` — one declarative table (name, default, enabled-in-bare?,
docs link), consumed everywhere; CI fails on a flag literal not registered there. Knip is
already wired — this makes dead-flag cleanup mechanical.

## Tier 2 — confirmed product gaps

### 4. `openclaude attach` is unimplemented (README admits it)
Background sessions get `ps/logs/kill` but no reattach — your own flagship UX story
("long non-interactive prompts") is a half-pipe. Highest user-visible gap in the docs.
**Fix:** named pipe/socket per bg session for stdout + an input channel so `attach` gives
live tail AND key injection; fallback: `logs -f` with escape-key write support.

### 5. RepoMap: off by default, 3 languages, 20–30s cold build
It's the best structural-priming feature here, yet it only speaks TS/JS/Python and pays a
painful first build (WASM parsers).
**Fix:** (a) add C#, Go, Rust, Java grammars — that's real-world code; (b) warm the cache
in background at session start or on `openclaude --bg` launch so first turn never waits;
(c) auto-enable for repos > 1k files when cold build is already cached (<100ms per docs).

### 6. openaiShim.ts monolith (184KB, test file 311KB)
One file translates Anthropic SDK ↔ every OpenAI-compatible backend; the giant test
suggests snapshot-bloat rather than behavioral contracts.
**Fix:** split into per-provider strategy modules behind a capability table
(chat_completions/responses, streaming event map, header/auth quirks); replace mega-snapshot
tests with small per-feature contract tests per provider (auth mapping, SSE shapes,
function-call roundtrip).

## Tier 3 — quality & hygiene

7. **TODO debt:** 412 TODO/FIXME/HACK markers in src; top file carries 20. Triage into
   issues; add a lint rule requiring an issue ref on new TODOs (`fixme` npm package or
   custom rule).
8. **558 `console.*` calls in src** — route through the existing logEvent/analytics layer
   with levels; keep stderr reserved for user-facing output.
9. **265 `: any` annotations under TS strict** — cluster-first cleanup (utils/attachments,
   config, messages are heavy); enable `@typescript-eslint/no-explicit-any` as warn on
   `src/services`, `src/utils` first.
10. **dist ≈ 98 MB** — biggest onboarding friction for an npm CLI. Lazy-load the heavy
    optional pieces (sharp, tree-sitter grammars, ripgrep binary fetch) behind the features
    that use them; measure with bundle analyzer, target < 30 MB base install.

## Tier 4 — security (the part I'm actually paid for)

11. **Turn the bash-attack corpus into a CI fuzzer.** The SECURITY comments in
    bashSecurity.ts each document a real exploit family — that's a *fuzzing corpus* in
    prose form. Action: extract every documented payload into `bash-corpus.tsv`
    (payload, expected behavior, which check catches it), run it as a unit suite on every
    PR touching BashTool; add a differential fuzzer fuzzing shell-quote vs tree-sitter vs
    bash (via `bash -n` or real execution in the sandbox container) over random inputs and
    asserting no divergence that flips allow/ask. This is how a file like this survives —
    its history shows it's already been broken and patched repeatedly.
12. **Repo hygiene leaks:** AGENTS.md hardcodes personal-machine guidance ("Robert's PC",
    `%USERPROFILE%` profile paths) in shared repo files; `.mcp.json.parked`,
    `PROFILE-BATS-PARKED.txt`, `CLAUDE.local.md` are parked/personal artifacts in the tree.
    Keep machine-specific config in local-only files or out of the repo entirely — a
    published clone ships your profile layout.
13. **Published-tarball audit:** package `files` looks correct (bin/dist/sdk/vendor-shim),
    but 61 vendored Skills + `.agents/skills` live in-repo; add a CI check asserting the
    built tarball contains none of them (`npm pack --dry-run` + allowlist assertion).

## Suggested order of attack

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Dedupe bash-security pipeline (f/1 + f/11 regression suite first) | M | Kills the #1 exploit-regression vector |
| 2 | Deps relayout + prod-build CI proof (f/2) | S | Unlocks correct audit/packaging |
| 3 | bg-session attach (f/4) | L | Biggest visible UX gap |
| 4 | RepoMap languages + background warmup (f/5) | M | Core differentiator, currently gated off |
| 5 | Shim split + contract tests (f/6) | L | Maintains the multi-provider promise |
| 6 | Hygiene sweep: TODO/console/any/dist-size (f/7–10) | S each | Compounding codebase health |
