# FolderMate release notes

Newest first. Plugin settings do not show this list; it lives here (and on the USB) and on the plugin's details page.

## 1.0.2
- **Settings are searchable:** FolderMate's settings now show up when you search in Obsidian's Settings (for example "indent line"). Needs Obsidian 1.13 or later.
- **Works in pop-out windows:** explorer colors repaint correctly in Obsidian's pop-out windows too.
- **Cleaner styles:** the styles no longer force-override Obsidian's own (no `!important`, no slow `:has` selector). They set Obsidian's own style values instead, so themes have an easier time and the explorer redraws faster.
- **Signed releases:** each release is now built on GitHub and comes with a provenance attestation, which proves the files were built from this repository's code.
- **Up to date with Obsidian's API:** replaced deprecated calls flagged by the community directory review.

## 1.0.1
- **Ready for the community directory:** the plugin ID is now `foldermate` (was `tint-tree`), to match its name. If you installed an earlier build, rename `.obsidian/plugins/tint-tree` to `foldermate` and turn the plugin on again. Your colors and settings come along.
- **Support link:** the manifest now carries the Buy Me a Coffee link, so Obsidian shows a support button on the plugin's page.
- **New README with screenshots** and a short demo animation.

## 1.0.0
- **Coffee link set:** the Buy me a coffee button in settings now goes to buymeacoffee.com/droidstreamer.

## 0.11.8
- **Renamed to FolderMate:** the plugin's name, settings title and About text now say FolderMate. Saved settings carry over (the plugin id is unchanged).

## 0.11.7
- **Fix, color picker knobs:** Obsidian's own slider style pushed the picker's knobs up off the track (and thinned the track). The hue, saturation and lightness knobs now sit centred on their tracks, the same as in StyleMate v0.6.1. A new live check reads the knob's position from the screen pixels.

## 0.11.6
- **Coffee link made generic:** the button still shows, but it now points to the plain buymeacoffee.com site (no user). The real link gets set later in one place, `coffeeButton.ts`.
- **Tip line left-aligned:** "If you enjoy this plugin, please consider a small tip..." now sits flush left in the settings header (the coffee button stays right).

## 0.11.5
- **Indent lines join the folder band:** a colored folder's indent line now starts at the bottom of its band (no gap) and takes the band's own faded color, so line and band read as one piece.
- **Indent line thickness:** a slider is back in Explorer, 1 to 5 px. It is grayed out while Indent lines is off.
- **File text color:** new "Color file names" toggle with a color picker, to set the text color of every file in the explorer. The open note keeps its Active note colors.

## 0.11.4
- **Indent lines or contents background, not both:** while Indent lines is on, the Contents background opacity slider is grayed out and can't be dragged, and no contents blocks are drawn. Turn the lines off and the slider and blocks come back at the opacity you had.

## 0.11.3
- **Contents follow the folder's own color:** every open colored folder, including subfolders that inherit a color, now has its own contents block, and at 100% that block is exactly the color its folder band shows. With Fade background by depth on, a subfolder's notes sit on the subfolder's faded color, not its parent's full color. The opacity slider scales from there.
- **Subfolder bands keep their fade on top of a parent block:** bands are now solid (the fade is mixed with the explorer background), so a 70% subfolder band no longer looks full-strength when it sits on its parent's 100% block.

## 0.11.2
- **Folder coloring as in the mockup:** each colored folder now sits everything it contains on one rounded block of its color, starting at the folder's own left edge. A colored subfolder's block covers its parent's, so the parent shows as a column down the left, and every note sits on its nearest colored folder's color. This replaces the per-file blocks and the 0.11.1 rails.
- **Contents background opacity:** one slider sets how strong these backgrounds are, 0% to 100% (0% = off).
- **No indent lines by default:** the lines are hidden; the "Indent lines" toggle brings them back if wanted.
- **Active note in a colored folder:** shows exactly your Active background (it was tinted by the folder color).

## 0.11.1
- **Folder rails:** a colored folder now has a thick rail in its own color down the left of everything it contains, so it is clear which notes and subfolders belong to it. Notes still sit on a block of their folder's color.
- **Indent lines:** the thickness and opacity sliders are gone, replaced by one on/off toggle ("Folder rails and indent lines"). Off hides every indent line in the explorer. These lines are now FolderMate's alone (LevelMate no longer controls the explorer's).
- **Active note fix:** clicking a note, or opening one from the explorer, now shows your Active background straight away. Before, Obsidian's yellow reveal flash showed first.
- **Palette in one box:** every color row and the Add color button share one background, so Add color no longer looks detached.
- **Folder color toggle:** "Folder text color" and "Fade background by depth" now appear, indented under the toggle, only while "Color folders with a background" is on (they were grayed out before).
- **File background opacity** slider confirmed to reach 0% (no background).

## 0.10.2
- **Settings header:** now matches MindmapMate and LevelMate exactly: name, version and author, description, the tip line, then "Made with care" right beside the Buy me a coffee button. The button image is built in, so nothing loads from the internet; the link opens in your browser.

## 0.10.1
- **File backgrounds:** notes take their folder's color as one joined, rounded block that starts where the sibling folder bands start. Default 20%; "File background opacity" sets it, 0% turns it off.
- **Indent lines:** new sliders for thickness (1 to 4 px) and opacity (10 to 100%).
- **Bold folder names:** a toggle in the new Explorer section.
- **Reveal the open note:** on by default. Opening a note expands its folders in the explorer and scrolls it into view (Obsidian's own reveal, so the row flashes briefly).
- **Preferences header:** name, version, "by Droid" and a short description, the same layout as LevelMate.
- **Palette in two columns**, and every swatch is round, like MindmapMate's.

## 0.9.5
- **Eyedropper removed:** it crashed Obsidian (no permission to read the screen). In its place, a Reset button in the picker returns the color to what it was when the picker opened.
- **Active note toggle:** "Color the active note" turns the highlight on or off. Off (the default for new installs) keeps the theme's highlight; on shows the Active background and Active text color rows, pre-filled so it works at once. Existing users who had chosen a color stay on.

## 0.9.4
- **Carets follow the folder color:** found by the acceptance run. In text mode the caret stayed grey (Obsidian colors it with its own variable); it now takes the folder's color.
- **Acceptance run:** `npm run obsidian:acceptance` checks every PRD section 11 item in a real Obsidian, including light and dark, the Minimal community theme, restart restore and no network.

## 0.9.3
- **Same color picker as MindmapMate:** every color is a swatch; click it for a popover with Hue, Saturation and Lightness sliders, a hex field and an eyedropper. Changes apply at once; Escape or a click outside closes it. This replaces the HSL window.
- **Exact colors:** opening the picker no longer nudges a color; typed and eyedropped colors are kept exactly.

## 0.9.2
- **Band start fixed:** found by a live check in Obsidian. Folders nested inside another colored folder could get a band starting at the row's left edge (over the indent line); bands now start just before the caret, right of the parent's indent line, at every depth.
- **Live check script:** `npm run obsidian:check` drives a real Obsidian and checks band geometry, guide lines, active colors, grayed options and the HSL window.

## 0.9.1
- **Active note colors:** settings let you set the background and text color of the open note's highlighted row; Reset returns to the theme.
- **HSL color picker:** every color (palette, folder text, active) opens an HSL window with sliders and an eyedropper.
- **Options stay visible:** Folder text color and Fade background by depth are always shown, grayed out while Color folders with a background is off.
- **No What's new in settings:** removed; the notes live here.

## 0.8.1
- **Same band at every depth:** levels 2, 3, 4 and deeper get the level 1 look: rounded, starting at the caret, flush right, indent lines left outside.
- **Gap:** at least 2 px between neighbouring bands.
- **Guide lines:** each folder's indent line takes that folder's color (text and background mode).
- **Fade steps:** 100 / 70 / 50 / 35 %; level 3 and deeper stay at 35 %.

## 0.7.1
- Hardening pass: security checks, README.

## 0.6.1
- Renaming, moving or deleting a folder keeps its colors correct.
- Colors on folders that no longer exist are cleaned up on start.

## 0.5.1
- Settings tab: color mode toggle, palette editor, text color, fade toggle.
- Deleting a palette color in use asks first and unassigns its folders.

## 0.4.1
- Text mode colors folder names; Background mode paints fading bands from the caret.
- Changes show immediately; disabling the plugin removes all styling.

## 0.3.1
- Right-click a folder: Set folder color / Remove folder color.
- Colors are saved and restored on restart.
