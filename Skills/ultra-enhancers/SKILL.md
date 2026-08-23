---
name: ultra-enhancers
description: Ultra Enhancers — agency-tier polish for UI, 3D product viz, Remotion MP4, camera/lighting, PBR materials, motion, typography. Use for Ultra Enhancers, top-quality product visuals, crystal-clear 3D animation, cinematic ads, or final enhancement before render/export.
version: 1.1.0
---

# Ultra Enhancers (top-quality product visuals)

Polish layer for Bobby’s Tech Services. Working is not enough — output must look **agency / product-film** quality: sharp, intentional, no AI slop.

## When this skill is on

- Final pass before MP4 / Remotion export
- 3D product shots, ads, intros, configurators
- “Make it stunning / crystal clear / top quality”
- Camera, lighting, materials, colour grade, motion craft

## Super abilities (load companions — do not invent weaker substitutes)

| Ability | Skill / agent |
|--------|----------------|
| Design polish pass | `impeccable` → `reference/polish.md` |
| Invisible UI craft | `emil-design-eng` |
| Taste / anti-slop UI | `design-taste-frontend`, `stitch-design-taste`, `ui-ux-pro-max`, `frontend-design` |
| Motion timing / easing | `improve-animations`, `animation-vocabulary`, `review-animations` |
| Remotion MP4 pipeline | `remotion-best-practices` (+ create / markup / render) |
| WebGL / R3F | `three-best-practices`, `r3f-best-practices` |
| Apparel / fabric 3D | `web-3d-apparel-shop` when clothing |
| Agency visual bar | `high-end-visual-design`, `premium-architecture-visual-3d` |
| Camera & light | agent `camera-and-lighting-director` |
| PBR materials | agent `pbr-materials-specialist` |
| Scene architecture | agents `r3f-scene-architect`, `threejs-specialist` |
| GPU / FPS | agent `webgl-performance-guardian` |
| Product 3D | agent `3d-product-visualizer` |
| Cinema / intro | agents `cinematic-intro-designer`, `animation-director`, `remotion-motion-specialist` |
| Finish gate | `verification-before-completion`, `full-output-enforcement` |
| Orchestrator | agent `ultra-enhancer` |

## Cinema / 3D product checklist (must run)

### Picture
1. **Subject clarity** — hero readable in first 1–2 seconds; no muddy mid-greys.
2. **Named aesthetic** — one look (e.g. “nocturnal workshop steel”, “clean clinic white”). Ban purple-indigo AI default and cream+terracotta brochure cliche unless brand asks.
3. **Real assets** — Robert’s logos, GLB, textures, brand art when present. No fake placeholder meshes as final.
4. **Contrast & grade** — intentional colour; highlights not clipped to mush; blacks not crushed to void unless cinematic choice.

### Camera & light
5. **Controlled camera** — purposeful path; no nauseating orbit spam; hold beats on the product.
6. **Story lighting** — key / fill / rim that sells form; avoid flat default Three.js ambient-only.
7. **Depth** — subtle DOF or atmospheric separation only when it earns cost; never soft blur as fake “quality”.

### Materials & 3D
8. **PBR honesty** — correct roughness/metalness for metal, glass, plastic, cloth; no unlit candy colours as final product.
9. **Performance** — Adaptive DPR, dispose geometries/materials/textures, no leak; target smooth playback on Robert’s 5090 PC.
10. **Shadows / reflections** — only when they earn their cost; contact shadows over full-scene soft soup when possible.

### Motion & edit
11. **2–3 intentional beats** — not particle spam; easing with purpose (`animation-vocabulary`).
12. **Hierarchy in time** — one idea per beat; text never fights the product.
13. **Export sharpness** — Remotion/ffmpeg at true 1080p or 4K; no accidental half-res; check the file before claiming done.

### Brand / type
14. **Wordmark integrity** — prefer full brand marks (`logo-full.png` style) over broken circle plates with black boxes.
15. **Type** — expressive pairing; no Inter/Roboto/Arial as display; optical sizes; safe margins on video.

### Anti-slop (instant fail)
- Emoji-as-icons, empty coloured boxes, card spam in hero, harsh drop shadows, floating badge clutter on hero media, default grey blob meshes, unlit flat product shots, illegible overlays.

## Finish gate
- Render/build command actually succeeds
- Open the output (image/MP4) and self-check against this list
- No TODOs / truncated files
- Plain English: what changed, where the file is, how to re-render

## Quick invoke

**Use skill ultra-enhancers** and agent **ultra-enhancer**.  
For a full cinema load: `node setup\restore-project-expert.mjs cinema`
