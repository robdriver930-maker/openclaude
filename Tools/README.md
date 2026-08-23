# Tools (edit here)

OpenClaude tools are **built-in** (Read, Write, Edit, Bash, Agent, Skill, …).  
You cannot install Cursor “tools” as separate packages.

This folder is the editable **permission config** for those built-ins.

## Files

- `permissions.json` — allow, deny, defaultMode, additionalDirectories

## Apply

```powershell
powershell -ExecutionPolicy Bypass -File setup\apply-stack.ps1
```

Merges into `%USERPROFILE%\.openclaude\settings.json` → `permissions`.

## Perfect set

**Allow:** Read, Write, Edit, Delete, Glob, Grep, Bash, PowerShell, WebSearch, WebFetch, NotebookEdit, Agent, Skill  

**Deny (freeze protection):** TaskCreate, TaskUpdate, TaskList, TaskGet, TaskStop, TaskOutput, TodoWrite  

Do **not** deny `Task` — that name is an alias for the **Agent** tool, so specialists can spawn.

**Mode:** bypassPermissions (Robert’s preferred everyday mode)

Desktop is allowed as an additional directory so named project folders on the Desktop keep their working directory. Loose dumps onto Desktop are still blocked in the model rules.

Edit `permissions.json` only, then re-run apply-stack. Restart OpenClaude after applying.
