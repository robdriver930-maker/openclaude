# Plugins (read this)

OpenClaude **plugins** are marketplace packages with a `plugin.json` manifest.  
They are **not** the same as Cursor IDE plugins.

## Perfect setup choice

Keep OpenClaude plugin marketplaces **empty**.

- Cursor marketplace plugins do not install 1:1 into OpenClaude.
- Forcing Cursor plugin folders causes “plugin not found” noise.
- Your perfect stack uses:
  - **Skills/** (playbooks)
  - **MCPs/** (HTTP servers)
  - **Tools/** (built-in permission allow/deny)
  - **agents-library/** + live agents (specialists)

## If you later want a real OpenClaude plugin

1. Install only from an OpenClaude-compatible marketplace (`/plugin` in OpenClaude).
2. Record it in `%USERPROFILE%\.openclaude\settings.json` → `enabledPlugins`.
3. Do not copy Cursor plugin cache folders into this repo.

No fake plugin installs live in this folder on purpose.
