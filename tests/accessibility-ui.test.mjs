import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path) => readFile(join(root, path), "utf8");

test("mobile agent controls keep a programmatic name", async () => {
  const component = await source("src/components/AgentControlCenter.vue");
  assert.match(component, /class="agent-tools-cta"[^>]*:aria-label="ctaLabel"/);
});

test("replay and Explorer use stable controls and announce outcomes", async () => {
  const replay = await source("src/components/ProgrammaticReplayPanel.vue");
  const explorer = await source("src/components/WebMcpExplorer.vue");

  assert.match(replay, /function handlePrimaryReplayAction/);
  assert.match(replay, /@click="handlePrimaryReplayAction"/);
  assert.doesNotMatch(replay, /v-if="store\.replay\.status !== 'running'"[^>]*button/);
  assert.match(replay, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(explorer, /const invokeButton = ref\(null\)/);
  assert.match(explorer, /invokeButton\.value\?\.focus/);
  assert.match(explorer, /completed in \$\{result\.elapsedMs/);
  assert.match(explorer, /class="console-receipt" role="region"/);
});

test("route and checkout focus targets remain visible and described", async () => {
  const app = await source("src/App.vue");
  const checkout = await source("src/views/CheckoutView.vue");
  const styles = await source("src/styles/main.css");

  assert.match(app, /function focusRouteContent/);
  assert.match(app, /@click\.prevent="skipToRouteContent"/);
  assert.match(app, /heading\.setAttribute\("tabindex", "-1"\)/);
  assert.match(styles, /#main-content h1\[tabindex="-1"\]:focus/);
  assert.doesNotMatch(styles, /#main-content:focus\s*\{\s*outline:\s*none/);
  assert.match(checkout, /function reportValidationError/);
  assert.match(checkout, /stepHeading\.value\?\.focus/);
  assert.match(checkout, /:aria-current="step === item\.id \? 'step' : undefined"/);
  assert.match(checkout, /:aria-invalid="isInvalid\('line1'\)"/);
  assert.match(checkout, /id="checkout-error"[^>]*role="alert"/);
  assert.match(checkout, /role="status" aria-live="polite" aria-atomic="true"/);
});

test("Explorer jump controls preserve the hash route and focus the tool heading", async () => {
  const demo = await source("src/views/DemoView.vue");

  assert.match(demo, /function focusExplorer/);
  assert.match(demo, /heading\.focus\(\{ preventScroll: true \}\)/);
  assert.equal(demo.match(/@click="focusExplorer"/g)?.length, 2);
  assert.doesNotMatch(demo, /href="#explorer"/);
});

test("home search implements active-descendant keyboard navigation", async () => {
  const home = await source("src/views/HomeView.vue");

  assert.match(home, /function handleSearchKeydown/);
  assert.match(home, /\["ArrowDown", "ArrowUp"\]/);
  assert.match(home, /:aria-activedescendant="activeSuggestionId"/);
  assert.match(home, /role="option" :aria-selected="activeSuggestionIndex === index"/);
  assert.match(home, /router\.push\(`\/medications\/\$\{selected\.slug\}`\)/);
});

test("cart feedback is a persistent live status contract", async () => {
  const detail = await source("src/views/MedicationDetailView.vue");

  assert.match(detail, /const cartAnnouncement = ref\(""\)/);
  assert.match(detail, /role="status" aria-live="polite" aria-atomic="true">\{\{ cartAnnouncement \}\}/);
});

test("Studio does not nest a main landmark", async () => {
  const studio = await source("src/views/CapabilityStudioView.vue");

  assert.doesNotMatch(studio, /<main\s+class="studio-shell"/);
  assert.match(studio, /<div class="studio-shell">/);
});

test("home metrics use the store summary and expose the judge demo", async () => {
  const home = await source("src/views/HomeView.vue");

  assert.match(home, /store\.state\.drugIndexSummary\?\.drugCount/);
  assert.match(home, /store\.state\.drugIndexSummary\?\.demoLocationCount/);
  assert.match(home, /seeded medication concepts/);
  assert.match(home, /deterministic demo locations/);
  assert.match(home, /class="hero-judge-link" to="\/demo">Run the judge demo/);
  assert.doesNotMatch(home, /services\/api/);
});

test("doctor handoff copy never directs users to send sandbox routing data", async () => {
  const doctor = await source("src/views/ContactDoctorView.vue");

  assert.doesNotMatch(doctor, /Share the pharmacy name and sample NCPDP/i);
  assert.doesNotMatch(doctor, /Please send an electronic prescription to/i);
  assert.match(doctor, /Do not share or send them/);
  assert.match(doctor, /NEVER SHARE OR SEND THESE DETAILS/);
});

test("memory packet fields repeat the visible fictional-data warning", async () => {
  const shortcuts = await source("src/views/HackathonShortcutsView.vue");

  assert.match(shortcuts, /id="memory-data-warning" class="memory-data-warning"/);
  assert.match(shortcuts, /Use fictional demo details only\. Do not enter real health, identity, contact, or prescription information\./);
  assert.match(shortcuts, /stores only counts and workflow metadata/);
  assert.equal(shortcuts.match(/aria-describedby="memory-data-warning"/g)?.length, 6);
});

test("the page does not force a width wider than a narrow viewport", async () => {
  const styles = await source("src/styles/main.css");

  assert.match(styles, /body\s*\{[^}]*min-width:\s*0/);
  assert.doesNotMatch(styles, /body\s*\{[^}]*min-width:\s*320px/);
});
