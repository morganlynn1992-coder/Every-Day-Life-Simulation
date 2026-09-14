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
  assert.match(page, /Directions to other rooms/);
  assert.match(page, /Current room layout/);
  assert.match(page, /Visible furniture in this room/);
});

test("moves existing and purchased furniture across rooms and relative to other furniture", () => {
  assert.match(page, /<DialogTitle>Arrange/);
  assert.match(page, /id="arrangement-room"/);
  assert.match(page, /id="arrangement-position"/);
  assert.match(page, /Selecting a position immediately moves the furniture and closes this window/);
  assert.match(page, /furnitureRelationOptions/);
  assert.match(page, /relative\|\$\{relation\.id\}\|\$\{target\.id\}/);
  assert.match(page, /The new arrangement has been saved/);
});

test("uses beginner-friendly relative directions in the active interface", () => {
  assert.match(page, /against the left wall/);
  assert.match(page, /against the right wall/);
  assert.match(page, /back toward the front of the home/);
  assert.match(page, /straight ahead/);
});
