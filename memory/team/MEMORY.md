# Memory index

- [OpenClaude Agent Organization](../../agents-library/AGENT_ORGANIZATION.md) — Accurate 76-agent roster, live paths, model fact-check rules
- [Agent Index](../../agents-library/AGENT_INDEX.md) — Quick slug list
- [Agent Ecosystem](../../agents-library/AGENT_ECOSYSTEM.md) — How agents/skills/tools layer
- [Agent Usage Guide](../../agents-library/AGENT_USAGE_GUIDE.md) — Correct invocation (kebab-case)
- [Skill and Tool Routing](../../agents-library/SKILL-TOOL-ROUTING.md) — When to use which skill/tool/agent
- [Capability Dispatcher](../../agents-library/capability-dispatcher.md) — Primary router so OpenClaude does not let Robert down
- [VS Code Chat Setup for New Users](vscode-chat-setup.md) — OpenClaude VS Code extension chat setup
- [Electron app setup process](electron-app-setup.md) — Electron desktop app process notes

## Critical live facts

- Active model: read `%USERPROFILE%\.openclaude\settings.json` (do not invent Claude/GPT as active)
- Live agents: `%USERPROFILE%\.openclaude\agents`
- When unsure what to load: use agent `capability-dispatcher`
