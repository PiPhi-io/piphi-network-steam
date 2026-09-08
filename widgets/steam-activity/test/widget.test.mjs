import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import manifest from "../widget.manifest.json" with { type: "json" };
import catalog from "../widget-capability-catalog.json" with { type: "json" };
import { validateWidgetManifest } from "piphi-network-widget-sdk/manifest";
import { formatMinutes, normalizeLifecycle, projectState } from "../src/view-model.js";

const integrationManifest = JSON.parse(readFileSync(new URL("../../../src/manifest.json", import.meta.url), "utf8"));

test("manifest, catalog, and integration contract agree", () => {
  assert.deepEqual(validateWidgetManifest(manifest).filter((item) => item.severity === "error"), []);
  const consumed = catalog.rows.filter((row) => row.status === "implemented").flatMap((row) => row.consumes);
  assert.deepEqual(new Set(manifest.capability_requirements), new Set(consumed));
  for (const id of manifest.capability_requirements) assert.ok(integrationManifest.capabilities[id], id);
  assert.deepEqual(manifest.binding_modes, ["read"]);
  assert.deepEqual(manifest.security.permissions, []);
  assert.deepEqual(manifest.security.csp.connect_src, []);
});

test("projection bounds untrusted values and formats duration", () => {
  const state = projectState({ primaryState: { currentGameName: "Portal\u0000", recentPlaytimeMinutes: 125 } }, manifest.capability_requirements);
  assert.equal(state.current_game_name, "Portal");
  assert.equal(formatMinutes(state.recent_playtime_minutes), "2h 5m");
  assert.equal(formatMinutes(null), "—");
});

test("covers lifecycle and accessible host handshake", () => {
  for (const state of manifest.conformance.states) assert.equal(normalizeLifecycle(state), state);
  assert.equal(normalizeLifecycle("snapshot"), "live");
  assert.equal(normalizeLifecycle("unexpected"), "error");
  const source = readFileSync(new URL("../src/widget.js", import.meta.url), "utf8");
  for (const token of ["getInjectedPiPhiWidgetHost", "subscribeState", "host.ready", "role=\"status\"", "aria-live=\"polite\"", "prefers-reduced-motion", "localization?.direction", "@media (max-width: 360px)"]) assert.ok(source.includes(token), token);
});
