# Figma → Kiro intake

You're receiving a design exported from Figma by the Figma-to-Kiro plugin.
The export is delivered as `kiro-import.zip`.

## How to process this import

0. **Unzip.** Extract `kiro-import.zip` into a temporary folder (e.g.
   `kiro-import/`). All paths below are relative to that folder.
1. **Source of truth.** Treat `design-payload.json` as the single source of
   truth: it contains the node hierarchy, layout, design tokens (colors,
   typography, effects, components), and stable asset references.
   `preview.svg` is a visual reference only.
2. **Output format.** Output format: React function components. Generate idiomatic React (TSX) using CSS modules. One component file per top-level node; reuse component tokens for shared elements rather than duplicating markup.
3. **Design tokens.** For every entry in `payload.tokens`, reference the
   token by its `name` (e.g. `brand-primary`) instead of hardcoding the
   resolved value. Tokens whose `kind` is `color`, `typography`, or `effect`
   should map to your existing token system; create new tokens only when no
   match exists.
4. **Components.** Tokens with `kind: "component"` mark nodes that were
   instances of a Figma component. For each component token:
   - Maintain a dedicated **components page** in this project for visual
     reference. Create it if it does not exist; otherwise continue using it.
   - Look up an existing component with a **matching name**. If one exists,
     **merge this import as a variant** of that component (do not duplicate).
   - If no match exists, create a new component on the components page using
     the imported markup as the initial variant.
5. **Assets.** The `assets/` folder contains the exported SVGs and images.
   Copy them into your project's central asset directory (e.g. `src/assets/`
   or `public/assets/`). Before copying:
   - Check for existing files with the same name — skip duplicates.
   - Use `payload.assets` references to wire each asset into the generated
     code by its stable identifier.
   - Do not regenerate icons from scratch; use the exported files verbatim.
6. **Layout.** Translate `layout.mode === "flex"` to flexbox using the
   recorded `direction`, `justifyContent`, `alignItems`, and `gap`. For
   `layout.mode === "absolute"`, position with the recorded coordinates.
   Honor each node's `sizing` (fixed / hug-contents / fill-container).
7. **Text.** Use each TEXT node's `characters` verbatim and respect
   `textCase`, `textAlignHorizontal`, and `textAlignVertical`.
   - When `textTruncation` is `"ENDING"`, apply CSS text truncation:
     use `overflow: hidden; text-overflow: ellipsis;` on the element.
     If `maxLines` is 1 (or absent), also add `white-space: nowrap;`.
     If `maxLines` > 1, use multi-line clamp: `display: -webkit-box;
     -webkit-line-clamp: <maxLines>; -webkit-box-orient: vertical;
     overflow: hidden;`.
   - When `textAutoResize` is `"NONE"`, the text box has a fixed width
     and height — set explicit width/height from the node's measurements.
   - Respect `textDecoration` (`UNDERLINE` → `text-decoration: underline`,
     `STRIKETHROUGH` → `text-decoration: line-through`).
8. **Cleanup.** After processing is complete, delete the unzipped folder
   (`kiro-import/`) **and** the original `kiro-import.zip` file. All
   necessary data has been absorbed into the project.

Confirm in your response which existing components were matched and which
are new before generating final code.
