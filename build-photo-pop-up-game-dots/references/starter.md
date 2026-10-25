# Runnable neutral starter

## Scope and dependency provenance

The starter provides a WebGL/Three.js paper book with hinged leaves, textured cut-out planes, stand-up pivots, a pure state core, and sequence/collection tasks. Use it for a playable slice and extend the mechanics for the brief. Atlas configuration adds linked spreads; see [atlas.md](atlas.md).

The neutral examples use procedural artwork and contain no source-project photos or recordings.

The only vendored runtime dependency is Three.js 0.128.0, downloaded from the official npm package `three@0.128.0`:
- Source: https://registry.npmjs.org/three/-/three-0.128.0.tgz
- Upstream: https://github.com/mrdoob/three.js/tree/r128
- Package SHA-256: `df6a5d06dcd9a361831669f1b6dd081b2a43f9933d7b16de532417cc8d7c6153`
- Vendored `three.min.js` SHA-256: `9274bbcec8d96168626c732b5d31c775aa8cfb7eaa0599bec0c175908a2c1ce2`
- License: MIT, preserved in `assets/starter/vendor/THREE-LICENSE.txt` and embedded in generated HTML.

The version is pinned to the starter API. Run browser regression tests when upgrading it. OrbitControls and external CDNs are not required. No package installation is needed to run the bundled builder; Node is only needed for state-core tests.

## Quick start

Resolve the installed skill directory to `SKILL_ROOT`; choose a separate task workspace as `PROJECT`. Do not write generated projects back into the skill.

```sh
python3 "$SKILL_ROOT/scripts/build_game.py" "$SKILL_ROOT/assets/starter/demo.json" --output "$PROJECT/paper-game.html"
python3 "$SKILL_ROOT/scripts/test_builder.py"
node "$SKILL_ROOT/scripts/test_state.cjs"
node "$SKILL_ROOT/scripts/test_ui.cjs"
```

Open the output using the approved browser route. The single file embeds code and referenced media and needs no network at runtime. Open the local file and run the project QA matrix on the intended device. Use the authorized hosting route when a public link is requested. Use the current Sites workflow if that destination is selected.

The neutral demo uses procedural triangle/square/pentagon artwork. It asks the player to raise shapes in ascending side-count order; a wrong choice resets progress, completion gives feedback, and replay resets the state. After completion, selecting pieces leaves the solved state intact while showing captions and playing any enabled recordings. Collection mode accepts any order and should be combined with a meaningful discovery goal for a finished project.

## Project configuration

Copy `assets/starter/demo.json` into the project as `game-config.json`; replace its content rather than editing the installed demo. This compact runtime config is separate from the richer `project.json`/`status.json` checkpoints in execution.md; reference it from those files.

Fields:
- `schemaVersion`: 1.
- `title`, `intro`: plain text, rendered with textContent, not interpreted as markup.
- `language`: language tag. It sets document language and selects built-in English or Chinese controls (Chinese for tags starting with zh). Other languages require the `ui` text overrides or project-level localization.
- Optional `ui`: plain-text overrides for open, replay, soundOff, soundOn, useAccessible, use3d, ready, sceneLabel, choicesLabel, help, audioHint, audioFailed, audioBlocked, no3d, imageFailed, lost3d, progress, and selectedSuffix. `progress` must retain `{count}` and `{total}` tokens.
- `game.mode`: `sequence` or `collect`.
- `game.targets`: every piece ID exactly once. In sequence mode this array is the answer order, independent of display order.
- `game.retryText`, `game.winText`: plain-text feedback.
- `pieces`: 1–16 objects, each with a unique lowercase/hyphenated `id`, exact `label`, `page` (`left`/`right`), `x`, `z`, and `height`.
- Optional piece `shape`: triangle/square/pentagon/circle and `color`: #rrggbb, for neutral/failed-image fallback. Use `image` for prepared photo-derived artwork.
- Optional `image`: project-relative PNG/JPEG/WebP file. Transparent PNG/WebP cut-outs preserve their transparency; a normal photograph remains rectangular. Prepare cut-outs and exact text through the asset workflow before building.
- Optional `audio`: project-relative MP3/WAV/OGG/M4A file, with required `caption` giving a usable text clue/equivalent. Prepare supported audio and its equivalent text through the asset workflow.

Use left-page x between -2.3 and -0.2, right-page x between 0.2 and 2.3; z is -1.3 to 1.3 and height is 0.2 to 1.4. Check texture aspect and overlap in the browser. Starter media is limited to 25 MiB/file, and output to 64 MiB to prevent accidental huge embeds. Optimize derivatives or adapt packaging intentionally for larger projects.

Example project-media substitution after the files are actually available:

```json
{
  "id": "clue-one",
  "label": "Exact verified object label",
  "page": "left",
  "x": -1.2,
  "z": 0.5,
  "height": 1.0,
  "image": "media/object-cutout.png",
  "audio": "media/object-recording.wav",
  "caption": "Verified transcript or equivalent non-audio clue"
}
```

Only referenced media is read/embedded. Paths escaping the config directory, missing files, signature/extension mismatches, duplicate IDs, invalid targets, non-finite geometry, and missing audio captions are rejected. Arbitrary project notes and unrecognized fields are not embedded. Review runtime content for the authorized destination before delivery.

Use `--check` for an in-memory validation/build, and `--force` only to intentionally replace the specified generated HTML. Preserve originals separately. Copy/adapt the starter files into a project when adding mechanics; do not change the reusable installed skill as a side effect of an individual game.

## Rendering choices and validation

The starter uses a fixed overview camera, flat cut-outs and rectangular hit areas. Atlas maps are prepared textures on page rectangles. For volumetric objects, alpha-aware picking, GIS coordinates or custom paper effects, extend the renderer to meet the brief. During page opening, cut-outs are hidden until the leaves are nearly open.

Run the listed tests and the browser matrix in implementation-qa.md. Record coverage and outstanding checks once in the project validation report. Package-level results are in [validation.md](validation.md).
