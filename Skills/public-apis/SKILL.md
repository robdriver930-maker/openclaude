---
name: public-apis
description: Use whenever software needs a third-party HTTP API — weather, maps, news, finance, images, animals, geocoding, email, flights, stocks, crypto, books, movies, sports, government data. Look up a real public API from the local catalog. Never invent API URLs.
---

# Public APIs (premium local catalog)

Robert keeps the official [public-apis](https://github.com/public-apis/public-apis) list on disk. Use it **every time** a job needs an external API. Do not guess endpoints.

## Source of truth

- Catalog folder: `C:\Users\GoldenBoy\Desktop\public-apis-master`
- Searchable JSON: `catalog.json` (this skill folder, and the Desktop folder)
- Original list: `README.md` in that Desktop folder

Never Read the whole `catalog.json` or `README.md` into context. Search.

## How to pick an API

1. Load this skill.
2. Search:

```powershell
node "$env:USERPROFILE\.openclaude\skills\public-apis\lookup.mjs" weather
```

Or from the Desktop folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\GoldenBoy\Desktop\public-apis-master\lookup.ps1" weather
```

Grep is also fine: search `catalog.json` for the topic, then Read only the matching lines.

3. Prefer in this order:
   - HTTPS `Yes`
   - Auth `No` for prototypes (no invented keys)
   - CORS `Yes` if the client must call it from a browser
4. WebFetch the **docs URL** from the catalog before writing fetch code.
5. Put any real API key in env / settings — never invent keys, never commit secrets.

## When building

- One API per job unless the product needs more.
- If lookup returns nothing, say so. Do not fabricate a public API.
- After coding, verify with a real request (WebFetch or a shell HTTP call). No localhost unless Robert asked for it.

## Refresh the catalog

```powershell
node "C:\Users\GoldenBoy\Desktop\openclaude\openclaude-main\Skills\public-apis\build-catalog.mjs"
```
