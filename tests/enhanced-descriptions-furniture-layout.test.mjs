import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("offers adjustable visual description detail", () => {
  assert.match(page, /Description detail/);
  assert.match(page, /value="brief">Brief/);
  assert.match(page, /value="standard">Standard/);
  assert.match(page, /value="detailed">Detailed/);
  assert.match(page, /Describe this room again/);
});

test("describes room links without replacing their destination names", () => {
  assert.match(page, /roomNavigationVisuals/);
  assert.match(page, /room-nav-description/);
  assert.match(page, /roomNavigationDescription\(key\)/);
});

test("moves existing and purchased furniture across rooms and relative to other furniture", () => {
  assert.match(page, /Place relative to another item/);
  assert.match(page, /furnitureRelationOptions/);
  assert.match(page, /relative\|\$\{relation\.id\}\|\$\{target\.id\}/);
  assert.match(page, /The new arrangement has been saved/);
});
