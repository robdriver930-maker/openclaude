# MCPs (edit here)

Editable source for OpenClaude MCP servers. Edit `servers.json`, then apply.

## Apply

```powershell
powershell -ExecutionPolicy Bypass -File setup\apply-stack.ps1
```

This writes the same servers to:

1. Repo `.mcp.json` (project scope — OpenClaude reads this)
2. `%USERPROFILE%\.openclaude.json` top-level `mcpServers` (user scope)
3. `%USERPROFILE%\.openclaude\settings.json` `mcpServers` (kept in sync for consistency)

## Sign-in

HTTP MCPs often need OAuth the first time you use them inside OpenClaude. Sign in when prompted. Cursor OAuth tokens do not carry over.

## Perfect set (nine)

| Name | Use |
|------|-----|
| notion | Docs / notes |
| figma | Design |
| linear | Issues / projects |
| neon | Postgres |
| atlan | Data catalog |
| vantage | Cost |
| paradedb | Search docs |
| twilio-docs | Twilio docs |
| cockroachdb-cloud | CockroachDB Cloud |

Add or remove entries only in `servers.json`, then re-run apply-stack.
