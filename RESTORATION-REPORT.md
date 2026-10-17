# Elite restoration — 17 October 2026

Entry point: elite-launch.bat in this folder. Original banner, source model picker and workflow retained. The restored application is @gitlawb/openclaude 0.29.1, built from this supplied copy; no replacement CLI package installed.

## Changed
- Bundled portable Node 22.23.3, pinned Bun 1.3.13 and Git Bash 2.56.0.2 under tools/runtime. No machine/user PATH changes. Node archive checksum and Git release asset checksum checked.
- Rebuilt dist/cli.mjs and SDK. Build guard passed.
- Made Elite locate its own folder and bundled runtimes; corrected --bare argument handling, model existence checks, bounded warmup and truthful warmup failures.
- Migrated old Windows paths in 17 active files. Original files saved under setup/restoration-backup. CLI wrapper also uses portable prerequisites.
- Created minimal user Ollama settings. No absent voice hooks or old cloud MCP connections enabled. Built-in PowerShell and bundled ripgrep enabled.
- Restored qwen3.8-oc-code:27b from supplied Modelfile and existing qwen3.8:27b layers. Added glm-5.3-flash:cloud manifest. Existing models preserved.
- Verified registered models: Qwen coding tag, Kimi K2.7 Code, GLM 5.3 and GLM 5.3 Flash. Cloud context maps taken from Ollama show metadata: 262144 for Kimi, 1048576 for both GLMs. Local custom tag retains 163840.
- Elite now defaults to medium effort instead of forcing max for every request. OPENCLAUDE_ELITE_EFFORT can override the launch default; original in-app effort controls remain.
- Added elite-health.bat / elite-health.ps1: read-only configuration/runtime/model registration check; no inference or system tuning.

## Verified
- Original Elite --help failed at GoldenBoy path before repair; now lists installed models successfully.
- Actual Elite interactive launch reached original first-run theme/security screens. Setup was stopped before completing onboarding; interactive model selection was not manually exercised.
- 16 focused model-picker, model-discovery and Ollama adapter tests passed (49 assertions).
- Full OpenClaude Kimi tool test used Read -> Edit -> Read and changed only reports/tool-smoke.txt from BEFORE to AFTER. Returned TOOL_TEST_OK in 17.0 seconds, including a 3-second stdin wait subsequently removed from the test harness.
- Full OpenClaude local Qwen tiny reply: 9.5 seconds, 22097 input tokens, low effort. This measures fresh process plus normal project context, not sustained coding throughput.
- Direct local Qwen at 163840 context: cold first visible output 7.38 seconds, total 7.47; warm first visible output 0.095 seconds, total 0.129. Tiny 2–3 token responses with thinking disabled; these numbers must not be extrapolated to long tasks.
- Ollama reported the local model entirely in VRAM (18433661991 bytes), context 163840. No CPU offload shown by size_vram comparison.
- Direct Kimi replied READY in 0.77 seconds. Both GLMs responded within 1 second, but the think:false/64-token probe emitted reasoning rather than the requested final READY; connection confirmed, full GLM answer correctness not certified.
- Portable Node version, Git Bash version, bundled ripgrep execution and final Elite health check passed.

## Hardware and pause
Windows reports RTX 5090 (32607 MiB VRAM), i9-14900KS and 64 GiB RAM. Memory configured speed reports 4800 MT/s, not 6000; no BIOS/driver changes made.
After the user reported unrelated whole-machine blackouts, all further inference/latency testing stopped. The test CLI was closed and the loaded Qwen test model unloaded. Ollama reported zero resident models. No Windows performance tuning or protection changes were made. PC stability is not certified; do not interpret successful CLI tests as a hardware diagnosis.

## Coverage and remaining limitations
Inventoried 46608 original files including hidden content; 40189 were dependency files, 3230 source files and 639 Git metadata files. Examined launch/config/provider/tool paths; did not audit every dependency or binary. Project retains 119 skill folders and 77 agent definitions. Their availability does not prove every helper dependency or automatic skill selection works.
No original user-profile backup was supplied. Missing voice helpers (speak-reply.ps1, tts-prompt-toggle.ps1, rules-loader.ps1 and the referenced personal rules file) cannot be faithfully restored from this folder. Existing parked external MCP services require their own account connections; they remain parked. Built-in browser automation is disabled in this source build; no browser MCP was silently added. Some older repair scripts are explicitly marked obsolete by setup/DO-NOT-RUN.txt; do not use them as generic restoration commands.
Existing run.bat is not the chosen entry point: its old settings-reset and Ollama-stop behavior remains separate. Use elite-launch.bat. Do not run hardware-tuning/install scripts merely because they are present.
Further real interactive model switching, medium-effort latency, GLM tool use, sustained local coding, every skill helper and optional voice/browser integration remain unverified. Resume performance testing only after addressing the reported machine stability issue.