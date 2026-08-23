#!/usr/bin/env bun
/**
 * scan-secrets.ts
 *
 * Scans tracked source files for accidentally committed secrets.
 * Runs fast, no external deps, read-only.
 *
 * Usage:
 *   bun run scripts/scan-secrets.ts          # scan all tracked files
 *   bun run scripts/scan-secrets.ts --staged  # scan only git-staged files
 */

import { $ } from "bun";

const STAGED = process.argv.includes("--staged");

// Patterns that look like accidentally committed secrets.
// Each entry: [regex, description]
const PATTERNS: [RegExp, string][] = [
    [/sk-[A-Za-z0-9]{20,}/g, "OpenAI/Anthropic-style API key"],
    [/AIza[A-Za-z0-9_-]{35}/g, "Google API key"],
    [/ghp_[A-Za-z0-9]{36}/g, "GitHub personal access token"],
    [/AKIA[0-9A-Z]{16}/g, "AWS access key ID"],
];

async function getFiles(): Promise<string[]> {
    if (STAGED) {
        const result = await $`git diff --cached --name-only --diff-filter=ACM`.text();
        return result.split("\n").filter(Boolean);
    }
    const result = await $`git ls-files`.text();
    return result.split("\n").filter(Boolean);
}

async function main() {
    const files = await getFiles();
    const skips = new Set([".git", "node_modules", "dist", "coverage", "__pycache__", "reports"]);
    const toScan = files.filter(
        (f) => !skips.has(f) && !f.split("/").some((p) => skips.has(p))
    );

    let found = 0;
    for (const file of toScan) {
        try {
            const content = await Bun.file(file).text();
            for (const [pattern, desc] of PATTERNS) {
                pattern.lastIndex = 0;
                const matches = content.match(pattern);
                if (matches) {
                    // Filter out .env.example and test fixtures
                    if (file.endsWith(".env.example") || file.includes(".test.")) continue;
                    for (const match of matches) {
                        // Skip obviously fake placeholder values
                        if (/your[-_]?key[-_]?here|placeholder|xxx+|example/i.test(match)) continue;
                        console.log(`  ${file}: ${desc} -> "${match.slice(0, 40)}${match.length > 40 ? "..." : ""}"`);
                        found++;
                    }
                }
            }
        } catch {
            // Skip binary or unreadable files
        }
    }

    if (found > 0) {
        console.error(`\nFound ${found} potential secret(s). Review before committing.\n`);
        process.exit(1);
    } else {
        console.log(`Scanned ${toScan.length} files. No secrets found.`);
    }
}

main();
