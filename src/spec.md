# Specification

## Summary
**Goal:** Let users change the simulation speed at runtime by doubling/halving the generation tick interval, with a visible speed readout.

**Planned changes:**
- Add two new controls in the simulation controls panel: “Faster” (halve the current tick interval each press) and “Slower” (double the current tick interval each press).
- Update the simulation loop to use a runtime-adjustable tick interval while preserving existing Start/Pause/Reset behavior and correct generation counting.
- Display the current tick interval (or equivalent speed indicator) in English and update it immediately when speed changes.

**User-visible outcome:** Users can press “Faster” or “Slower” to immediately speed up or slow down generation updates (e.g., 500ms → 250ms → 125ms), and can see the current tick interval in the controls panel while the simulation is running or paused.
