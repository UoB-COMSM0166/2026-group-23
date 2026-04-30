# Quantum Drop — Visual Identity

> Single source of truth for colours, typography, badge styles, and Mermaid themes used across `README.md`, `REPORT.md`, the project site, and presentation slides. Anything visual in this repo should pull from this file.

---

## 1. Colour palette — Neon Violet × Cyan

The palette follows a deep-space cyberpunk aesthetic: a near-black slate base, a violet primary, an electric-cyan accent, and an emerald for positive signals. Warning and danger reds are reserved for HUD-style alerts.

| Role | Name | Hex | Use |
|---|---|---|---|
| **Background — primary** | Void Black | `#0F172A` | Page background, splash, hero overlay |
| **Background — surface** | Slate 800 | `#1E293B` | Cards, code blocks, Mermaid node fills |
| **Background — elevated** | Slate 700 | `#334155` | Hover, secondary surface |
| **Primary** | Neon Violet | `#7C3AED` | Buttons, primary borders, brand accent |
| **Primary — light** | Violet 400 | `#A78BFA` | Mermaid lines, links, hover violet |
| **Accent** | Electric Cyan | `#06B6D4` | Stats highlight, secondary CTA, lasers |
| **Accent — light** | Cyan 300 | `#67E8F9` | Soft accents, captions |
| **Success** | Emerald | `#10B981` | Tests passing, green badges |
| **Warning** | Amber | `#F59E0B` | Beta, perf-warning |
| **Danger** | Crimson | `#EF4444` | Errors, critical alerts |
| **Text — primary** | Indigo 50 | `#E0E7FF` | Body text on dark |
| **Text — muted** | Slate 400 | `#94A3B8` | Captions, footnote text |
| **Border — soft** | Violet 700 | `#6D28D9` | Image borders (3 px) |

### Quick swatches

| Swatch | Hex |
|---|---|
| ![#0F172A](https://placehold.co/40x20/0F172A/0F172A.png) | `#0F172A` |
| ![#1E293B](https://placehold.co/40x20/1E293B/1E293B.png) | `#1E293B` |
| ![#7C3AED](https://placehold.co/40x20/7C3AED/7C3AED.png) | `#7C3AED` |
| ![#A78BFA](https://placehold.co/40x20/A78BFA/A78BFA.png) | `#A78BFA` |
| ![#06B6D4](https://placehold.co/40x20/06B6D4/06B6D4.png) | `#06B6D4` |
| ![#10B981](https://placehold.co/40x20/10B981/10B981.png) | `#10B981` |
| ![#F59E0B](https://placehold.co/40x20/F59E0B/F59E0B.png) | `#F59E0B` |
| ![#EF4444](https://placehold.co/40x20/EF4444/EF4444.png) | `#EF4444` |
| ![#E0E7FF](https://placehold.co/40x20/E0E7FF/E0E7FF.png) | `#E0E7FF` |

---

## 2. Typography

GitHub's renderer ignores most font CSS, so typography is controlled mainly via Markdown semantics and Mermaid `fontFamily`. We standardise on:

| Surface | Family | Notes |
|---|---|---|
| Body (Markdown) | GitHub default (`-apple-system, …, sans-serif`) | Don't fight it |
| Code blocks | `ui-monospace, SFMono-Regular, …` | GitHub default |
| Mermaid diagrams | `ui-monospace` | Reinforces "engineering" feel |
| Image captions | Markdown `*italics*` + `<sub>` for size | Universal |

---

## 3. Shields.io badges

Use only these six badge palettes for visual consistency:

| Purpose | Hex | shields.io URL fragment |
|---|---|---|
| **Brand / primary CTA** | `7c3aed` | `style=for-the-badge&logoColor=white` |
| **Tech / info** | `06b6d4` | `style=for-the-badge&logoColor=white` |
| **Success / passing** | `10b981` | `style=for-the-badge&logoColor=white` |
| **Beta / preview** | `f59e0b` | `style=for-the-badge&logoColor=white` |
| **Danger / open issue** | `ef4444` | `style=for-the-badge&logoColor=white` |
| **Neutral / structure** | `1e293b` | `style=for-the-badge&logoColor=white` |

### Canonical badge set (top-of-README)

```markdown
![JavaScript](https://img.shields.io/badge/Language-JavaScript-7c3aed?style=for-the-badge&logo=javascript&logoColor=white)
![p5.js](https://img.shields.io/badge/Engine-p5.js-06b6d4?style=for-the-badge&logo=p5dotjs&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-48_passing-10b981?style=for-the-badge&logo=node.js&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub_Pages-1e293b?style=for-the-badge&logo=github&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-94a3b8?style=for-the-badge)
```

### CTA buttons

```markdown
[![Play Game](https://img.shields.io/badge/▶_Play_Game-7c3aed?style=for-the-badge)](https://uob-comsm0166.github.io/2026-group-23/Game_v2.1/)
[![Watch Video](https://img.shields.io/badge/▶_Watch_Demo-EF4444?style=for-the-badge&logo=youtube&logoColor=white)](https://youtube.com/...)
[![Open Repo](https://img.shields.io/badge/⌘_View_Code-1e293b?style=for-the-badge&logo=github&logoColor=white)](https://github.com/uob-comsm0166/2026-group-23)
```

---

## 4. Image styling — border + radius

Every screenshot in `README.md` and `REPORT.md` must use this style block:

```html
<img src="..." width="..." 
     style="border-radius: 12px; border: 2px solid #6D28D9;" 
     alt="..." />
```

For hero / splash images use a thicker border:

```html
<img src="..." width="860" 
     style="border-radius: 16px; border: 3px solid #7C3AED; box-shadow: 0 0 40px rgba(124,58,237,0.4);" 
     alt="Game hero" />
```

> **GitHub Markdown limitation:** `box-shadow` is stripped by GitHub's sanitiser. Use it only for the project site (`docs/index.html`) where it actually renders. `border-radius` and `border` are kept by GitHub.

---

## 5. Mermaid neon-violet theme

Paste this `%%{init}%%` block at the **top of every Mermaid diagram** in `REPORT.md`. It makes every chart inherit the same dark cyberpunk look.

```text
%%{init: {
  "theme": "base",
  "themeVariables": {
    "background": "#0F172A",
    "primaryColor": "#1E293B",
    "primaryBorderColor": "#7C3AED",
    "primaryTextColor": "#E0E7FF",
    "secondaryColor": "#334155",
    "secondaryBorderColor": "#A78BFA",
    "tertiaryColor": "#1E293B",
    "tertiaryBorderColor": "#06B6D4",
    "lineColor": "#A78BFA",
    "textColor": "#E0E7FF",
    "fontFamily": "ui-monospace, SFMono-Regular, monospace",
    "mainBkg": "#1E293B",
    "errorBkgColor": "#EF4444",
    "noteBkgColor": "#334155",
    "noteTextColor": "#E0E7FF"
  }
}}%%
```

Example usage:

````markdown
```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#0F172A", "primaryColor": "#1E293B", ...}}}%%
flowchart TD
  ...
```
````

---

## 6. Class-diagram colour zones

When colour-coding the class diagram by module, use these per-zone fills (light tint of the brand colour) plus a darker stroke from the same family:

| Zone | Fill | Stroke | Modules |
|---|---|---|---|
| Engine | `#1E293B` | `#7C3AED` | `sketch.js`, `state.js`, `audio.js` |
| Towers | `#2A1A4A` | `#A78BFA` | `Tower`, `TOWER_DEFS`, 8 variants |
| Monsters | `#0E2A3A` | `#06B6D4` | `Monster`, mobs, bosses, manager |
| Mini-game | `#0E3A2A` | `#10B981` | `minigame.js`, gates, balls |
| UI | `#3A2A0E` | `#F59E0B` | `hud`, `pause`, `build-menu`, `tower-panel` |
| Data | `#3A1A1A` | `#EF4444` | `data/towers`, `data/waves`, `data/levels` |

Color-block legend (paste before the class diagram in `REPORT.md`):

```markdown
| Zone | Module | Classes |
|---|---|---|
| ![#7C3AED](https://placehold.co/14x14/7C3AED/7C3AED.png) Violet | **Engine** | `sketch.js`, `state.js`, `audio.js` |
| ![#A78BFA](https://placehold.co/14x14/A78BFA/A78BFA.png) Light violet | **Towers** | `Tower`, `TOWER_DEFS`, 8 variants |
| ![#06B6D4](https://placehold.co/14x14/06B6D4/06B6D4.png) Cyan | **Monsters** | `Monster`, mobs, bosses |
| ![#10B981](https://placehold.co/14x14/10B981/10B981.png) Emerald | **Mini-game** | `minigame.js`, gates, balls |
| ![#F59E0B](https://placehold.co/14x14/F59E0B/F59E0B.png) Amber | **UI** | HUD, pause, build menu |
| ![#EF4444](https://placehold.co/14x14/EF4444/EF4444.png) Crimson | **Data** | `data/towers`, `data/waves`, `data/levels` |
```

---

## 7. Decorative divider

`ArtAsset/ReadMe/divider.png` — 1920 × 40 px, transparent background, neon-violet→cyan gradient with a subtle data-line texture. Generated via `scripts/generate-divider.py`. Used between every top-level README section.

```markdown
<img src="ArtAsset/ReadMe/divider.png" width="100%" alt="" />
```

---

## 8. Quick reference — copy/paste blocks

### Section header (centred, with dividers)

```markdown
<img src="ArtAsset/ReadMe/divider.png" width="100%" alt="" />

<a name="introduction"></a>
<h2 align="center">Introduction</h2>
```

### Centred paragraph

```markdown
<div align="center">

Body text goes here. Tables placed inside this `div align="center"` will be horizontally centred.

</div>
```

### Caption under image

```markdown
<p align="center">
  <img src="docs/screenshots/foo.png" width="600" 
       style="border-radius: 12px; border: 2px solid #6D28D9;" />
  <br>
  <sub><i>Figure 3 — A short caption in muted italic.</i></sub>
</p>
```
