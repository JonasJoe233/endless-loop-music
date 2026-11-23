# Repo rules

These rules apply to humans and AI coding agents working in this repo.

## Layout

| Path | What goes here |
|---|---|
| `index.html` | Landing page for GitHub Pages. Links to every demo. |
| `assets/site.css` | Shared site shell: theme tokens, background, top nav, step pager. The only shared file pages may link. |
| `demos/` | Single-file demos. No JS imports, no build step. They may link `../assets/site.css`. |
| `examples/` | Copy-paste starting points that use `src/`. |
| `src/endless-loop.js` | The reusable module. Zero dependencies, plain ES module. |
| `docs/` | Diagrams. Edit the `.svg`, then re-export the `.png` at 2x. |
| `README.md` / `README.zh-CN.md` | English is the source. The Chinese file mirrors it. |

## Rules

1. No build step and no npm dependencies. Every file must work when served as static files.
2. No game assets. Do not add Balatro audio, art, or decompiled code. Describe the mechanism and link to the source instead.
3. Mark what is verified. When a number comes from the game source, cite the file. When it is our own choice, say so.
4. Change both READMEs in the same commit.
5. Audio must start only after a user gesture, and every page needs a way to stop it.
6. Test in a browser before committing: start audio, switch states, check the console for errors.
7. File names are lowercase kebab-case.
8. Every page is part of one site. Link `assets/site.css`, use the same `.site-nav` markup with `aria-current` on the active item, and end subpages with a `.pager` to the previous and next step. Page order: Overview → 01 Balatro → 02 Mouse bend → 03 Starter → `index.html#use`.
9. Link to explicit files such as `../index.html`, never `../`. A bare directory link opens a file listing when the page is opened from disk.
10. Put theme colors in `assets/site.css`. Pages keep only their own layout. Design rules:
    - Five type sizes (56 / 30 / 19 / 17 / 14) and two weights (400, 600). No web fonts.
    - Hairlines instead of cards. At most one filled block per section.
    - `--act` red means only "this makes sound or opens a demo". One solid button per screen.
    - Game colors (red, blue, gold, felt green) appear only inside `.stage`.
