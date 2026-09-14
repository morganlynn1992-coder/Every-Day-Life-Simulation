import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("provides sound controls, realistic recordings, and immediate action dismissal", async () => {
  const page = await readFile(`${root}/app/page.tsx`, "utf8");
  const audio = await readFile(`${root}/lib/game-audio.ts`, "utf8");

  assert.match(page, /Sound effects/);
  for (const item of ["milk", "water", "juice", "soda", "eggs", "butter", "yogurt", "strawberries", "apples", "cheese", "bread", "vegetables", "leftovers"]) {
    assert.match(page, new RegExp(`id: "${item}"`));
  }
  assert.match(page, /label: `Get \$\{item\.label\}`/);
  assert.match(page, /Kitchen counter/);
  assert.match(page, /counterActionsFor/);
  assert.match(audio, /assets\.mixkit\.co\/active_storage\/sfx/);
  for (const sound of ["fridgeOpen", "fridgeClose", "footsteps", "stairFootsteps", "pourWater", "pourSoda", "sinkWater", "shower", "toilet", "laptopTyping", "phoneTyping", "phoneRingtone", "remote", "tvProgram", "eat", "swallow", "pillow"]) {
    assert.match(audio, new RegExp(`${sound}:`));
  }
  assert.match(audio, /playMovement/);
  assert.match(audio, /stairs \? "stairFootsteps" : "footsteps"/);
  assert.match(audio, /playRunningWater/);
  assert.match(audio, /playFridgeLatch/);
  assert.match(audio, /playObjectOpen/);
  assert.match(audio, /kind === "fridge".*playRecording\("fridgeOpen"/);
  assert.match(page, /DropdownMenuTrigger asChild/);
  assert.match(page, /DropdownMenuItem key=\{action\.value\} aria-label=.*onSelect=/);
  assert.match(page, /Choosing an item performs it and closes the menu/);
  assert.doesNotMatch(page, /id="object-action"/);
  assert.doesNotMatch(page, />Select an action</);
  assert.doesNotMatch(page, />Close<\/button>/);
  assert.match(page, /The empty glass remains on the counter/);
  assert.match(page, /Pick up the empty glass/);
  assert.match(page, /Put the empty glass in the sink/);
  assert.match(page, /const \[counterItems, setCounterItems\]/);
  assert.match(page, /const \[carriedItems, setCarriedItems\]/);
  assert.match(page, /putCarriedDishInSink/);
  assert.match(page, /setDirtyDishes/);
  assert.match(page, /setCleanDishes/);
  assert.match(page, /pickUpCleanDish/);
  assert.match(page, /putCarriedCleanDishAway/);
  for (const emptyItem of ["empty-milk-carton", "empty-water-bottle", "empty-juice-carton", "empty-soda-can"]) {
    assert.match(page, new RegExp(emptyItem));
  }
  assert.match(page, /The empty container remains on the counter/);
  assert.match(page, /pick-up-empty-container/);
  assert.match(page, /Garbage and recycling bins/);
  assert.match(page, /recycle-container/);
  assert.match(page, /throw-away-container/);
  assert.match(page, /const alwaysNarrate = movesAnItem \|\|/);
  assert.match(page, /if \(alwaysNarrate \|\| !soundPlayed\) narrateAction\(\)/);
  assert.match(audio, /playHousehold\(kind: string, action: string, onUnavailable\?: \(\) => void\): boolean/);
  assert.match(audio, /kind === "counter"/);
  assert.match(audio, /primeRecordings\(\)/);
  assert.match(audio, /const startTimer = window\.setTimeout\(reportUnavailable, 2500\)/);
  assert.match(audio, /sound\.addEventListener\("playing", confirmPlayback/);
  assert.match(audio, /sound\.addEventListener\("error", reportUnavailable/);
  assert.match(audio, /onUnavailable\?\.\(\)/);
  assert.match(page, /playActionSequence\(item\.kind, chosen\.soundAction \|\| actionValue, narrationFallback, movesAnItem \? "after" : false\)/);
  assert.match(page, /playActionSequence\("fridge", actionValue, narrationFallback, "after"\)/);
  assert.doesNotMatch(audio, /fallbackTimer|useFallback/);
  for (const recording of [
    "mixkit-bowl-placed-on-table-1799.mp3",
    "mixkit-reel-to-reel-rewind-1095.mp3",
    "mixkit-smartphone-typing-1393.mp3",
    "mixkit-gas-stove-hum-1831.mp3",
    "mixkit-hard-toilet-flush-1872.mp3",
    "mixkit-electric-switch-1808.mp3",
    "mixkit-kettle-boiling-1817.mp3",
    "mixkit-coffee-pour-2826.mp3",
    "mixkit-stirring-cup-2835.mp3",
  ]) {
    await access(`${root}/public/sounds/${recording}`);
    assert.match(audio, new RegExp(recording.replaceAll(".", "\\.")));
  }
  assert.match(audio, /kind === "toilet" && action === "use".*recorded\("toilet"/);
  assert.match(audio, /kind === "tv"[\s\S]*recorded\("tvReel"/);
  assert.match(audio, /kind === "phone"[\s\S]*recorded\("phoneTyping"/);
  assert.match(audio, /action === "stove-on"[\s\S]*recorded\("stoveSwitch"/);
  assert.match(audio, /action === "stove-off"[\s\S]*recorded\("stoveSwitch"/);
  assert.match(audio, /kind === "coffeeMachine"[\s\S]*recorded\("coffeeKettle"/);
  assert.match(audio, /action === "cook-eggs" \|\| action === "reheat-food"[\s\S]*recorded\("stove"/);
  assert.match(page, /soundAction: "serve-bowl"/);
  assert.match(audio, /action === "pick-up-glass"/);
  assert.match(audio, /kind === "kitchenSink"/);
  assert.match(audio, /return false/);
  assert.doesNotMatch(page, /follow-up-action/);
  assert.doesNotMatch(page, /JAWS or NVDA will announce what/);
});

test("expands kitchen, entertainment, wardrobe, mirror, and phone interactions", async () => {
  const page = await readFile(`${root}/app/page.tsx`, "utf8");
  const audio = await readFile(`${root}/lib/game-audio.ts`, "utf8");

  for (const control of ["Freezer", "Dish cabinet", "Pantry cabinet", "Silverware drawer", "Coffee machine"]) assert.match(page, new RegExp(control));
  for (const food of ["ground-beef", "chicken-breasts", "salmon", "frozen-vegetables", "cheese", "grapes", "broccoli"]) assert.match(page, new RegExp(food));
  assert.match(page, /stoveActionsFor/);
  assert.match(page, /range-load:/);
  assert.match(page, /choose-recipe:/);
  assert.match(page, /Still needed:/);
  assert.match(page, /cooking-step-heat/);
  assert.match(page, /cooking-step-cook/);
  assert.match(page, /finish-cooking/);
  assert.match(page, /is now on the kitchen counter/);
  assert.match(page, /coffeeTableActionsFor/);
  assert.match(page, /coffee-empty-/);
  assert.match(audio, /kind === "coffeeTable"/);
  for (const channel of ["Browse cartoon channels", "Browse drama channels", "Browse comedy channels", "Browse a random channel"]) assert.match(page, new RegExp(channel));
  for (const genre of ["fantasy", "drama", "crime", "romance", "biography", "nature"]) assert.match(page, new RegExp(`— ${genre}`));
  assert.match(page, /const maleOutfits/);
  assert.match(page, /const femaleOutfits/);
  assert.match(page, /label: "Gender"/);
  assert.match(page, /closetActionsFor\(character\.gender\)/);
  assert.match(page, /View self/);
  assert.match(page, /appearanceDescription/);
  assert.match(page, /DropdownMenuLabel>Refrigerator items/);
  assert.match(page, /DropdownMenuLabel>Freezer items/);
  assert.match(page, /Sit on the couch before eating/);
  assert.match(page, /alwaysNarrate = movesAnItem \|\| item\.kind === "vanity"/);
  assert.match(page, /Entrance mirror/);
  assert.match(page, /Take a selfie/);
  assert.match(page, /Take a picture of the room/);
  assert.match(page, /aria-label=\{`\$\{action\.label\}\. \$\{action\.description\}`\}/);
});

test("provides explicit store cart controls, checkout, and cereal preparation", async () => {
  const page = await readFile(`${root}/app/page.tsx`, "utf8");
  const audio = await readFile(`${root}/lib/game-audio.ts`, "utf8");

  assert.match(page, /Add selected products to cart/);
  assert.match(page, /Add selected colors to cart/);
  assert.match(page, /className="secondary-button store-add-button"/);
  assert.match(page, /Add selected items to cart \(\{selectedCount\}\)/);
  assert.match(page, /Add selected items to cart \(\{selectedColors\.length\}\)/);
  assert.match(page, /Checkout \{store === "grocery" \? "grocery" : "furniture"\} cart/);
  assert.match(page, /function addSelectedGroceriesToCart/);
  assert.match(page, /function addSelectedFurnitureToCart/);
  assert.match(page, /function makeCereal\(\)/);
  assert.match(page, /Make a bowl of cereal with milk/);
  for (const ingredient of ["bowl", "cereal", "milk", "spoon"]) assert.match(page, new RegExp(`"${ingredient}"`));
  assert.match(page, /"plated:meal-cereal"/);
  assert.match(audio, /action === "make-cereal"/);
});

test("tracks multi-item cooking, manual dish storage, and house-specific dining rooms", async () => {
  const page = await readFile(`${root}/app/page.tsx`, "utf8");

  assert.match(page, /setCounterItems\(current => \[\.\.\.current, chosen\.nextItem!\]\)/);
  assert.match(page, /function rangeActions\(\)/);
  assert.match(page, /range-load:/);
  assert.match(page, /Cookware cabinet/);
  for (const cookware of ["frying-pan", "saucepan", "stock-pot", "baking-dish", "baking-tray"]) assert.match(page, new RegExp(cookware));
  assert.match(page, /const \[diningTableItems, setDiningTableItems\]/);
  assert.match(page, /"dining table\."/);
  assert.match(page, /pickUpCleanDish/);
  assert.match(page, /held-clean-/);
  assert.match(page, /putCarriedCleanDishAway/);
  assert.match(page, /dining: \{ name: "Dining room"/);
  assert.match(page, /townhouse:[\s\S]*dining: \{ x: -1, y: 1/);
  assert.match(page, /Breakfast table.*kind: "diningTable"/);
  assert.match(page, /Drop-leaf table.*kind: "diningTable"/);
  assert.match(page, /label: "Dining table", kind: "diningTable"/);
  assert.doesNotMatch(page, /room === "living" && <div className="furniture-item">\{objectMenu\(\{ label: "Dining table"/);
  assert.match(page, /item\.kind === "tv"/);
});

test("keeps washed dishes at the sink and supports batch refrigerator retrieval", async () => {
  const page = await readFile(`${root}/app/page.tsx`, "utf8");

  assert.match(page, /remains in the sink drying area, ready to be picked up/);
  assert.match(page, /setCleanDishes\(current => \[\.\.\.current, dish\]\)/);
  assert.match(page, /function pickUpCleanDish\(index: number\)/);
  assert.match(page, /setCarriedItems\(current => \[\.\.\.current, `held-clean-\$\{dish\}`\]\)/);
  assert.match(page, /carried\.startsWith\("held-clean-"\)/);
  assert.match(page, /function putCarriedCleanDishAway\(index: number\)/);
  assert.match(page, /DropdownMenuCheckboxItem/);
  assert.match(page, /const \[fridgeSelections, setFridgeSelections\]/);
  assert.match(page, /function takeSelectedFridgeItems\(\)/);
  assert.match(page, /setCounterItems\(current => \[\.\.\.current, \.\.\.selectedItems\]\)/);
  assert.match(page, /Get selected items \(\{fridgeSelections\.length\}\)/);
  assert.match(page, /setFridgeMenuOpen\(false\)/);
  assert.match(page, /event\.preventDefault\(\); setFridgeItemSelected/);
  assert.doesNotMatch(page, /if \(item\.kind === "fridge"\) setFridgeSelections\(\[\]\)/);
});

test("adds quiet sink retrieval, bathroom mirrors, and tracked outdoor waste", async () => {
  const page = await readFile(`${root}/app/page.tsx`, "utf8");
  const audio = await readFile(`${root}/lib/game-audio.ts`, "utf8");

  assert.match(page, /Mirror over bathroom sink/);
  assert.match(page, /item\.kind !== "kitchenSink" && item\.kind !== "bathSink"/);
  assert.match(audio, /action === "set-dish-down" \|\| action === "pick-up-glass"/);
  assert.match(page, /type LocationKey = RoomKey \| "entrance" \| "outside"/);
  assert.match(page, /function currentDayPeriod\(\)/);
  for (const period of ["morning", "afternoon", "evening", "night"]) assert.match(page, new RegExp(`${period}:`));
  assert.match(audio, /playOutdoorAmbience\(period:/);
  assert.match(page, /function moveOutside\(\)/);
  assert.match(page, /label: "Go outside"/);
  assert.match(page, /Outdoor garbage bin/);
  assert.match(page, /Outdoor recycling bin/);
  assert.match(page, /const \[indoorGarbage, setIndoorGarbage\]/);
  assert.match(page, /const \[indoorRecycling, setIndoorRecycling\]/);
  assert.match(page, /const \[carriedWaste, setCarriedWaste\]/);
  assert.match(page, /function takeWasteOutside/);
  assert.match(page, /function putWasteInOutdoorBin/);
  assert.match(page, /indoorGarbage, indoorRecycling, carriedWaste/);
  assert.match(audio, /kind === "outdoorGarbageBin"/);
  assert.match(audio, /kind === "outdoorRecyclingBin"/);
});

test("supports batch inventory, complete kitchen-item handling, and front-door travel", async () => {
  const page = await readFile(`${root}/app/page.tsx`, "utf8");

  assert.match(page, /type InventoryMenuKey/);
  assert.match(page, /const \[inventorySelections, setInventorySelections\]/);
  assert.match(page, /function takeSelectedInventoryItems/);
  for (const inventory of ["dishCabinet", "pantry", "silverwareDrawer", "cookwareCabinet", "bookshelf"]) {
    assert.match(page, new RegExp(`"${inventory}"`));
  }
  assert.match(page, /Select one or more items/);
  assert.match(page, /Get selected items \(\{selectedInventoryItems\.length\}\)/);
  assert.match(page, /const \[counterSelections, setCounterSelections\]/);
  assert.match(page, /const \[prepSelections, setPrepSelections\]/);
  assert.match(page, /function manageSelectedSurfaceItems/);
  assert.match(page, /Put selected items back/);
  assert.match(page, /Wash selected items/);
  assert.match(page, /Put selected items in garbage/);
  assert.match(page, /const \[dirtyDishSelections, setDirtyDishSelections\]/);
  assert.match(page, /const \[cleanDishSelections, setCleanDishSelections\]/);
  assert.match(page, /function washSelectedDishes/);
  assert.match(page, /function pickUpSelectedCleanDishes/);
  assert.match(page, /kind: "frontDoor"/);
  assert.match(page, /label: "Go outside"/);
  assert.match(page, /label: "Go inside"/);
  assert.doesNotMatch(page, />Outside<\/a>/);
  assert.match(page, /aria-label="Places to go"/);
  for (const destination of ["Job", "Grocery store", "Furniture store", "Electronics store"]) assert.match(page, new RegExp(destination));
});

test("adds playable grocery and furniture stores with saved purchases", async () => {
  const page = await readFile(`${root}/app/page.tsx`, "utf8");

  assert.match(page, /"groceryStore" \| "furnitureStore"/);
  assert.match(page, /Everyday Market/);
  assert.match(page, /HomeStyle Furniture Store/);
  assert.match(page, /const groceryProducts/);
  for (const department of ["Dairy and eggs", "Produce", "Meat and seafood", "Bakery and pantry", "Drinks", "Frozen foods"]) assert.match(page, new RegExp(department));
  assert.match(page, /const furnitureProducts/);
  for (const category of ["Sofas and seating", "Beds", "Tables", "Televisions"]) assert.match(page, new RegExp(category));
  for (const material of ["genuine leather", "faux leather", "soft woven fabric", "plush velvet", "microfiber fabric"]) assert.match(page, new RegExp(material));
  for (const color of ["Pink", "Blue", "Black", "White", "Gray", "Green", "Aqua", "Purple", "Dark green", "Beige"]) assert.match(page, new RegExp(color));
  assert.match(page, /const \[householdFunds, setHouseholdFunds\] = useState\(10000\)/);
  assert.match(page, /function shoppingCartMenu/);
  assert.match(page, /function checkout/);
  assert.match(page, /setGroceryBags/);
  assert.match(page, /setOwnedFurniture/);
  assert.match(page, /householdFunds, shoppingCart, groceryBags, ownedFurniture/);
  assert.match(page, /The grocery bags are unpacked onto the kitchen counter/);
  assert.match(page, /ownedFurniture\.filter\(furniture => furniture\.room === room\)\.map/);
});

test("lets players place purchased and existing furniture by room and position", async () => {
  const page = await readFile(`${root}/app/page.tsx`, "utf8");

  assert.match(page, /type FurniturePlacement = \{ room: RoomKey; position: string \}/);
  assert.match(page, /const furniturePositionOptions/);
  for (const position of ["back wall", "right wall", "front of the room", "left wall", "center of the room", "near the doorway", "near the window"]) assert.match(page, new RegExp(position));
  assert.match(page, /function moveFurniture\(item: Furniture, destination: RoomKey, position: string\)/);
  assert.match(page, /setOwnedFurniture\(current => current\.map/);
  assert.match(page, /setFurniturePlacements\(current =>/);
  assert.match(page, /Move or arrange furniture/);
  assert.match(page, /id="arrangement-room"/);
  assert.match(page, /id="arrangement-position"/);
  assert.match(page, /baseFurnitureEntries\.filter\(entry => entry\.placement\.room === room\)/);
  assert.match(page, /ownedFurniture\.filter\(furniture => furniture\.room === room\)/);
  assert.match(page, /furniturePlacements, activeCookware/);
});

test("moves tracked ingredients into cookware and serializes action audio", async () => {
  const page = await readFile(`${root}/app/page.tsx`, "utf8");
  const audio = await readFile(`${root}/lib/game-audio.ts`, "utf8");

  assert.match(page, /function counterCookingActions\(index: number, ingredient: string\)/);
  assert.match(page, /label: "Put " \+ labelForItem\(ingredient\) \+ " in the " \+ labelForItem\(activeCookware\)/);
  assert.match(page, /counterCookingActions\(index, counterValue\)/);
  assert.match(page, /value: "choose-recipe:" \+ recipeKey/);
  for (const recipe of ["burgers", "tacos", "pork chops", "grilled cheese"]) assert.match(page, new RegExp(`name: "${recipe}"`));
  for (const ingredient of ["burger-buns", "taco-shells", "pork-chops", "chocolate-chips"]) assert.match(page, new RegExp(ingredient));
  assert.match(page, /const missing = recipe\.required\.filter/);
  assert.match(page, /const needsExplanation = action\.value\.startsWith\("choose-recipe:"\)/);
  assert.match(page, /const \[finishedMeal, setFinishedMeal\]/);
  assert.match(page, /const \[stoveOn, setStoveOn\]/);
  assert.match(page, /value: "turn-on-range"/);
  assert.match(page, /value: "turn-off-range"/);
  assert.match(page, /stoveActionsFor\(cookingRecipe, cookingIngredients, cookingStage, stoveOn\)/);
  assert.match(page, /Put the " \+ cookedFood \+ " on the/);
  assert.match(page, /plate-finished:/);
  assert.match(page, /function plateCounterMeal\(mealIndex: number, dishIndex: number\)/);
  assert.match(page, /Put \{labelForItem\(counterValue\)\} on the/);
  assert.match(page, /range-return:/);
  assert.match(page, /setCookingStage\(-1\)/);
  assert.match(page, /Kitchen item locations:/);
  assert.match(page, /containing \$\{cookingIngredients\.map\(labelForItem\)\.join\(", "\)\}/);
  assert.match(page, /announceHousehold\("stove", action, needsExplanation, movingItem \? "before" : false\)/);
  assert.match(page, /announceHousehold\("counter", action, false, action\.value === "return-item" \? "before" : false\)/);
  assert.match(audio, /private queuedActions: Array<\(\) => void>/);
  assert.match(audio, /playActionSequence\(kind: string, action: string/);
  assert.match(audio, /footsteps: false \| "before" \| "after"/);
  assert.match(audio, /footsteps === "before"/);
  assert.match(audio, /footsteps === "after"/);
  assert.match(page, /audio\(\)\.queueObjectOpen\(item\.kind\)/);
  assert.match(audio, /queueObjectOpen\(kind: string\)/);
  assert.match(audio, /queueObjectClose\(kind: string\)/);
  assert.match(audio, /private busyUntil = 0/);
  assert.match(audio, /const remaining = this\.busyUntil - Date\.now\(\)/);
  assert.match(audio, /kind === "fridge"/);
  assert.match(audio, /"cookwareCabinet", "dishCabinet", "pantry", "silverwareDrawer"/);
  assert.match(audio, /action === "serve-bowl"/);
});

test("supports range-side prep and step-by-step meal assembly", async () => {
  const page = await readFile(`${root}/app/page.tsx`, "utf8");

  assert.match(page, /Range-side prep counter/);
  assert.match(page, /const \[prepCounterItems, setPrepCounterItems\]/);
  assert.match(page, /function moveCounterItemToPrep\(index: number\)/);
  assert.match(page, /function prepCookingActions\(index: number, ingredient: string\)/);
  assert.match(page, /range-load-prep:/);
  assert.match(page, /plate-finished:\$\{dishSource\}:\$\{dishIndex\}/);
  assert.match(page, /const \[finishedRecipe, setFinishedRecipe\]/);
  assert.match(page, /const assemblyPlans/);
  assert.match(page, /function addAssemblyIngredient/);
  assert.match(page, /function finishAssembly/);
  assert.match(page, /Start a deli sandwich: put bread on the plate/);
  assert.match(page, /Still needed for assembly:/);
  assert.match(page, /name: "plain ground beef"/);
  assert.match(page, /"cooked-ground-beef": \{ dish: "plate"/);
  assert.match(page, /Kitchen counter:.*Range-side prep counter:/);
  assert.match(page, /prepCounterItems, carriedItems/);
});

test("restores and explicitly saves complete game progress", async () => {
  const page = await readFile(`${root}/app/page.tsx`, "utf8");
  const route = await readFile(`${root}/app/api/save/route.ts`, "utf8");
  const database = await readFile(`${root}/db/game-saves.ts`, "utf8");
  const schema = await readFile(`${root}/db/schema.ts`, "utf8");

  assert.match(page, /function restoreSavedGame\(data: any\)/);
  assert.match(page, /function savedGameData\(house = savedHouse \|\| houseChoice\)/);
  assert.match(page, /household: \{ room, counterItems/);
  assert.match(page, /setStoveOn\(Boolean\(household\.stoveOn\)\)/);
  assert.match(page, /async function saveGame\(\)/);
  assert.match(page, />Save game<\/button>/);
  assert.match(page, /Game saved\. Continue will restore/);
  assert.match(page, /async function persistGame\(data: any\)/);
  assert.match(page, /fetch\("\/api\/save"/);
  assert.match(page, /const savedGameRef = useRef/);
  assert.match(page, /if \(!saveReady \|\| !savedName \|\| draftingNewGame\) return/);
  assert.doesNotMatch(page, /JSON\.stringify\(\{ name: savedName, character: updated/);
  assert.match(route, /export async function GET\(\)/);
  assert.match(route, /export async function POST\(request: Request\)/);
  assert.match(database, /ON CONFLICT\(player_key\) DO UPDATE/);
  assert.match(schema, /sqliteTable\("game_saves"/);
  assert.match(page, /setDraftingNewGame\(true\)/);
  assert.match(page, /role="alert" aria-live="assertive"/);
  assert.match(page, /window\.setTimeout\(\(\) => setActionAnnouncement\(message\), 160\)/);
});
