# Skills (edit here)

This folder is your **editable source** for OpenClaude skills inside `openclaude-main` only.

## Start here for software work

Read **SOFTWARE-INDEX.md** — then use these five named skills in chat:

| Skill | Say in chat |
|-------|-------------|
| Software building | Use skill **software-building** |
| Software architecture | Use skill **software-architecture** |
| Software editing | Use skill **software-editing** |
| Software creator | Use skill **software-creator** |
| Software design | Use skill **software-design** |

This folder also contains dozens of specialist skills (architecture, React, debugging, design systems, etc.).

## Layout

```text
Skills\
  SOFTWARE-INDEX.md      category map (open this)
  manifest.json          must-have list
  software-building\     entry skill
  software-architecture\
  software-editing\
  software-creator\
  software-design\
  <other-skill>\
    SKILL.md
```

## How to add a skill

1. Create `Skills\<skill-name>\SKILL.md` with YAML frontmatter (`name`, `description`) and the playbook body.
2. Add `<skill-name>` to `manifest.json` → `mustHave` if it should always be present.
3. Run:

```powershell
powershell -ExecutionPolicy Bypass -File setup\apply-stack.ps1
```

4. Restart OpenClaude (`run.bat`, prefer **Local**).

## Bulk Cursor skills

The large Cursor pack still comes from:

```powershell
powershell -ExecutionPolicy Bypass -File setup\sync-from-cursor.ps1
```

That syncs Cursor → live profile, then `apply-stack` merges **this** folder on top so your software pack is never wiped.

## Live load paths

- `%USERPROFILE%\.openclaude\skills`
- `.openclaude\skills` (project mirror, gitignored)
