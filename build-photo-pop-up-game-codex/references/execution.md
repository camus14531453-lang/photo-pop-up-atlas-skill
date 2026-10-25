# Execution and checkpoints

## Choose the working route

Inspect the active workspace, applicable instructions, input access, build and browser tools, image editing, audio processing, and delivery options. Record which capabilities are available. Use the user's chosen environment and current platform rules; use a child task or another executor when required or authorized. Verify transferred files before continuing there.

Keep one owner responsible for the full result. Handle supported file transfers and tool coordination directly so the user can stay focused on creative decisions. Use the current Sites workflow when that is the selected destination.

## Keep project checkpoints

Store these in the private project, separate from the reusable skill:
- `project.json`: brief, asset records, scenes, rendering choice, game rules and delivery scope.
- `status.json`: stage, result, evidence, pending inputs and next action.
- `sources/`: original approved inputs.
- `public/`: approved runtime files.
- `tests/`: reproducible checks and QA evidence.

Use stable IDs and relative project paths. A compact starting structure is:

```json
{
  "schemaVersion": 1,
  "brief": {},
  "rendering": {"primary": "", "fallback": ""},
  "assets": [],
  "scenes": [],
  "game": {"initialState": {}, "actions": [], "completionRule": "", "replayRule": ""},
  "delivery": {"requested": "", "authorized": "", "verifiedUrl": null}
}
```

For assets, record source, hash where useful, local path, rights/consent, transformations, derivatives, exact text/transcript and scene references. For scenes, record inputs, transitions, feedback, audio, completion effects and accessible equivalents. Keep credentials out of these files.

Use stage statuses `pending`, `running`, `blocked`, or `passed`, with artifact paths and evidence. Suggested stages: brief, inputs, design, assets, playable slice, full build, QA, delivery. Update after meaningful changes.

## Resume and resolve problems

On restart, read checkpoints, verify current files and authorization, then resume the first incomplete stage. Reuse completed media and builds. When moving environments, verify receipt and update local paths.

If a tool is unavailable, use an adequate supported alternative within the agreed design. For example, use authorized crops when they meet the visual brief, or keep original audio playback when transcription is unavailable. Record a blocking transformation or missing browser/device check in the validation report and continue independent work. Ask the user only for the missing input or action they must supply.
