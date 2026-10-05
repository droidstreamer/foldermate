# M0 DOM spike: band geometry

Status: **selectors chosen from Obsidian's documented explorer markup; not yet screenshot-confirmed in the live app** (the running Obsidian holds a different vault). To confirm: open `test-vault/`, enable the snippet `tint-tree-spike`, expand `Fixtures/Projects` and check the four points at the bottom.

## Selector list (all in one place: `src/renderer.ts`)

- Folder row: `.nav-folder-title[data-path]` (path is vault-relative, no trailing slash; vault root has `data-path="/"`).
- Explorer container: leaf with view type `file-explorer`; rows live under `.nav-files-container`.
- Name: `.nav-folder-title-content`. Caret: `.collapse-icon` (SVG, strokes `currentColor`). Icon plugins add their own element inside the row and follow `color`.
- States: `.is-active` (selected), `:hover`, `.is-being-dragged-over` (drag target).

## Band geometry decision

Nested rows get their indent as `padding-inline-start` on `.nav-folder-title` (with a negative margin so the row still spans the pane). So:

- **Descendant rows:** paint a gradient layer with `background-clip: content-box`. The padding (indent) stays unpainted, so the band starts at the caret and runs to the right edge. Opacity is baked into the layer via `color-mix`, so the theme's own hover/active background underneath is unaffected.
- **Anchor rows:** `background-clip: border-box`, full row.
- **Fallback** if a version indents with margin instead: a `::before` pseudo-element offset by `--tt-indent`. Not built unless needed.
- **States:** hover = `filter: brightness(1.15)`; selected = inset 2px accent ring; drag-over = dashed accent ring. Text color is forced with a specific selector so hover doesn't override it.

## To verify in the live app

1. Child bands start at the caret, not the pane edge.
2. Anchor band spans the whole row.
3. Hover and selected remain visible on a colored row.
4. Collapsed folders render the same.
