# Build, verify and deliver

## Architecture

Choose a maintainable stack that meets the rendering brief. Verify the dependency APIs and bundle dependencies for offline delivery. Use separate media files when embedding would make the output impractical.

Separate immutable configuration, runtime state and rendering. Define transitions as action + state → next state + effects; reject unavailable actions. Track discoveries, active scene, completion and any needed score/timer. Centralize audio and animation cleanup. Replay resets state, camera, locks, timers, captions and audio. If persistence is needed, version saved data and handle storage failure.

Give players the objective, controls, progress and routes back from detail views. Implement feedback and recovery before adding decorative effects.

## Paper scenes

- Attach each cut-out to a hinge at its base and parent it to the relevant paper panel.
- Check intermediate folds for collisions, occlusion and table penetration; use deliberate transition fades where needed.
- Match texture padding and pivots across states. Check transparent-plane order, back faces, labels and hit regions.
- Frame scene bounds at each target aspect ratio and reserve room for readable text.
- Distinguish taps from drags; provide labelled controls alongside canvas interaction.
- Preload essential media with progress and recoverable errors. Check memory use before adding costly prewarming.

## Accessibility and recovery

Provide visible focus, keyboard actions, labels, contrast, usable touch targets, zoom-safe text and progress that does not rely on color. Keep essential text in the DOM. Honor reduced motion with immediate or short transitions.

The accessible view should retain the objective, rules, progress, images and text clues. Detect unavailable/lost WebGL and offer this view with a reload option. Handle failed media with a labelled substitute and retry path. Clean up when navigating or hiding the page, and avoid duplicate animation loops on return.

## Validation report

Keep test coverage and outstanding checks together in the project's validation report. For each row record requirement, method, environment/viewport, observation, evidence, status (`passed`, `failed`, `not tested`) and next action.

Run state/build tests for reachable completion paths, wrong order, repeated taps, rapid navigation, restart during animation/audio, asset paths and private-file leakage. Label unit tests and simulated DOM/audio checks by method.

In a real browser check:
- Desktop and narrow framing, keyboard focus, touch targets and readable captions.
- Objective completion, errors, repeated input, backtracking and replay.
- Audio activation, listening, mute, navigation interruption and overlapping cues.
- Intermediate folds, cut-out visibility, reduced motion and accessible clue parity.
- Failed media, unsupported/lost WebGL and recovery.
- Performance under the intended device and media load.

Record actual hardware or viewport emulation, and distinguish screenshots, functional results, audio playback state and listening observations. Resolve failures; carry any remaining check forward with its next action.

## Deliver

Include the playable build, source, approved assets, dependency notices, controls, credits and validation report. Keep private source material and internal records out of public packages.

For authorized hosting, open the final URL and check paths, loading, controls and audio there. Otherwise deliver the local build/source. For a requested video, plan shots from the playable build, check capture and audio support, then inspect the exported recording. Keep payment infrastructure or additional distribution actions within separately authorized scope.
