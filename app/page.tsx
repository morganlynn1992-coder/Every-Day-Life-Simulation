"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GameAudio } from "@/lib/game-audio";

type Character = {
  gender: string;
  hairColor: string; hairStyle: string; eyeColor: string; skinTone: string;
  bodyType: string; clothing: string; shoes: string; handbag: string;
  jewelry: string; laptop: string; phone: string;
};
type RoomKey = "living" | "kitchen" | "dining" | "bedroom" | "bathroom";
type LocationKey = RoomKey | "entrance" | "outside" | "groceryStore" | "furnitureStore";
type DayPeriod = "morning" | "afternoon" | "evening" | "night";
type CarriedWaste = { type: "garbage" | "recycling"; items: string[] } | null;
type InventoryMenuKey = "dishCabinet" | "pantry" | "silverwareDrawer" | "cookwareCabinet" | "bookshelf";
type CartItem = { id: string; label: string; price: number; store: "grocery" | "furniture"; itemId?: string };
type FurniturePlacement = { room: RoomKey; position: string };
type OwnedFurniture = FurniturePlacement & { id: string; label: string };
type GroceryProduct = { id: string; label: string; price: number; department: string };
type FurnitureProduct = { id: string; label: string; material: string; price: number; category: string };
type Furniture = { label: string; kind: string; description: string; instanceId?: string };
type Home = {
  name: string; tagline: string; bedrooms: string; description: string;
  rooms: Partial<Record<RoomKey, { name: string; description: string; furniture: Furniture[] }>>;
};
type Action = { value: string; label: string; description: string; result: string; nextItem?: string | null; soundAction?: string };
const furniturePositionOptions = [
  { id: "north-wall", label: "against the north wall" },
  { id: "east-wall", label: "against the east wall" },
  { id: "south-wall", label: "against the south wall" },
  { id: "west-wall", label: "against the west wall" },
  { id: "center", label: "in the center of the room" },
  { id: "doorway", label: "near the doorway" },
  { id: "window", label: "near the window" },
] as const;
const layouts: Record<string, {
  entrance: string;
  positions: Partial<Record<RoomKey, { x: number; y: number; floor: number; location: string }>>;
}> = {
  bungalow: {
    entrance: "You are standing in the front entrance. The living room is through the open doorway to your left. The kitchen is through the opening to your right. A short hallway directly ahead leads to the bedroom, with the bathroom on the right side of that hallway.",
    positions: {
      living: { x: -1, y: 0, floor: 1, location: "You are in the living room, on the left side of the front entrance. The kitchen is east, across the entrance. The bedroom and bathroom are north, down the short hallway." },
      kitchen: { x: 1, y: 0, floor: 1, location: "You are in the kitchen, on the right side of the front entrance. The living room is west, across the entrance. The bedroom and bathroom are north, down the hall." },
      bedroom: { x: -1, y: 1, floor: 1, location: "You are in the bedroom at the back-left corner of the bungalow. The bathroom is directly east. The living room is south, toward the front of the house." },
      bathroom: { x: 1, y: 1, floor: 1, location: "You are in the bathroom at the back-right corner of the bungalow. The bedroom is directly west. The kitchen is south, toward the front of the house." },
    },
  },
  townhouse: {
    entrance: "You are standing in the townhouse foyer. The living room is to your left and the kitchen is to your right. The dining room is behind the living room. The staircase is directly ahead. Upstairs, the bedroom is on the left and the bathroom is on the right.",
    positions: {
      living: { x: -1, y: 0, floor: 1, location: "You are in the downstairs living room, left of the foyer. The dining room is directly north, through a wide doorway. The kitchen is east across the foyer. The bedroom and bathroom are upstairs." },
      kitchen: { x: 1, y: 0, floor: 1, location: "You are in the downstairs kitchen, right of the foyer. The living room is west across the foyer, and the separate dining room is northwest, behind the living room. The bedroom and bathroom are upstairs." },
      dining: { x: -1, y: 1, floor: 1, location: "You are in the separate dining room behind the living room. The living room is directly south, and the kitchen is southeast across the foyer." },
      bedroom: { x: -1, y: 0, floor: 2, location: "You are in the upstairs bedroom, left of the landing. The bathroom is east across the landing. The living room and kitchen are downstairs." },
      bathroom: { x: 1, y: 0, floor: 2, location: "You are in the upstairs bathroom, right of the landing. The bedroom is west across the landing. The living room and kitchen are downstairs." },
    },
  },
  apartmentOne: {
    entrance: "You are standing inside the apartment entrance. The living room is directly ahead. The kitchen is through a doorway to your right. A hallway on your left leads first to the bathroom and then to the bedroom.",
    positions: {
      living: { x: 0, y: 1, floor: 1, location: "You are in the living room directly ahead of the front entrance. The kitchen is east. The bathroom and bedroom are west, along the hall." },
      kitchen: { x: 1, y: 1, floor: 1, location: "You are in the kitchen on the right side of the apartment. The living room is directly west. The bedroom and bathroom are farther west across the hall." },
      bedroom: { x: -1, y: 2, floor: 1, location: "You are in the bedroom at the quiet back-left corner. The bathroom is south along the hallway. The living room is southeast." },
      bathroom: { x: -1, y: 1, floor: 1, location: "You are in the bathroom on the left side of the hallway. The bedroom is north. The living room is directly east." },
    },
  },
  apartmentTwo: {
    entrance: "You are standing in the apartment foyer. The living room is ahead and slightly left. The kitchen is through a wide opening to your right. A hallway beyond the living room leads to the bedroom on the left and bathroom on the right.",
    positions: {
      living: { x: -1, y: 1, floor: 1, location: "You are in the living room, ahead and left of the foyer. The kitchen is east. The bedroom is north, down the hall, and the bathroom is northeast." },
      kitchen: { x: 1, y: 1, floor: 1, location: "You are in the kitchen on the right side of the apartment. The living room is west. The bedroom and bathroom are north, beyond the living room." },
      bedroom: { x: -1, y: 2, floor: 1, location: "You are in the main bedroom at the back-left end of the hall. The bathroom is directly east. The living room is south." },
      bathroom: { x: 1, y: 2, floor: 1, location: "You are in the bathroom at the back-right end of the hall. The bedroom is directly west. The kitchen is south." },
    },
  },
};

const outdoorAreas: Record<string, { name: string; description: string }> = {
  bungalow: { name: "Front path", description: "You are outside on the bungalow’s front path. The outdoor garbage bin and recycling bin stand together at the end of the driveway." },
  townhouse: { name: "Townhouse walkway", description: "You are outside on the townhouse walkway. The outdoor garbage bin and recycling bin are at the end of the row beside the service lane." },
  apartmentOne: { name: "Apartment grounds", description: "You are outside the apartment building. The shared garbage bin and recycling bin are inside the marked enclosure at the end of the building." },
  apartmentTwo: { name: "Apartment grounds", description: "You are outside the apartment building. The shared garbage bin and recycling bin are inside the marked enclosure at the end of the building." },
};

function currentDayPeriod(): DayPeriod {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

const outdoorSoundDescriptions: Record<DayPeriod, string> = {
  morning: "Morning birds call nearby while a light breeze moves through the trees.",
  afternoon: "Afternoon traffic hums in the distance and leaves rustle in the breeze.",
  evening: "Evening birds settle as crickets begin chirping around the homes.",
  night: "Night crickets chirp steadily beneath the quiet neighborhood sounds.",
};

const defaults: Character = {
  gender: "Female",
  hairColor: "Warm brown", hairStyle: "Long and wavy with straight bangs",
  eyeColor: "Deep brown", skinTone: "Medium warm", bodyType: "Petite",
  clothing: "Pink cardigan with blue jeans", shoes: "White high-top sneakers",
  handbag: "Blush pink crossbody bag", jewelry: "Silver heart necklace",
  laptop: "Sky blue laptop", phone: "Pink smartphone",
};

const femaleOutfits = [
  "Pink cardigan with blue jeans", "Powder blue sweater dress", "Hot pink blazer and matching trousers",
  "Blue denim overalls with pink tee", "Rose-print sundress", "Navy hoodie with sky blue joggers",
  "Pink satin party dress", "Blue button-down with black trousers", "Lavender top with pleated skirt",
  "Teal jumpsuit with pink belt", "Pink polo shirt with white shorts", "Blue blouse with dark-wash jeans",
  "Coral T-shirt with denim shorts", "Navy pantsuit with a pink shell top", "Soft pink pajamas",
];

const maleOutfits = [
  "Blue button-up shirt with black trousers", "Pink polo shirt with navy shorts", "White T-shirt with blue jeans",
  "Navy suit with a pale pink tie", "Denim jacket with charcoal pants", "Sky blue hoodie with black joggers",
  "Short-sleeve floral button-up with khaki shorts", "Burgundy sweater with dark jeans", "Black T-shirt with cargo pants",
  "Powder blue polo with tan chinos", "Athletic tank top with running shorts", "Plaid shirt with straight-leg jeans",
  "Pink dress shirt with gray trousers", "Navy cardigan with a white T-shirt", "Blue pajama set",
];

const wardrobeOptions: Record<string, string[]> = { Female: femaleOutfits, Male: maleOutfits };

const fields: { key: keyof Character; label: string; help: string; options: string[] }[] = [
  { key: "gender", label: "Gender", help: "Choose whether your character is female or male. This controls the outfits offered here and in the closet.", options: ["Female", "Male"] },
  { key: "hairColor", label: "Hair color", help: "Choose your character’s hair color.", options: ["Warm brown", "Dark chocolate brown", "Golden blonde", "Platinum blonde", "Soft black", "Auburn", "Copper red", "Pastel pink", "Ocean blue", "Silver gray"] },
  { key: "hairStyle", label: "Hair style", help: "Choose the cut and texture.", options: ["Long and wavy with straight bangs", "Long and wavy with side-swept bangs", "Long straight hair, center part", "Medium length, no bangs", "Shoulder-length curls", "High braided ponytail", "Box braids", "Two long braids", "Layered bob", "Curly pixie cut", "Buzz cut", "Shaved sides with textured top"] },
  { key: "eyeColor", label: "Eye color", help: "Choose your character’s eye color.", options: ["Deep brown", "Hazel", "Forest green", "Sky blue", "Dark blue", "Gray", "Amber", "Violet"] },
  { key: "skinTone", label: "Skin tone", help: "Choose your character’s skin tone.", options: ["Very fair cool", "Fair warm", "Light neutral", "Medium warm", "Medium deep neutral", "Deep warm", "Rich deep cool"] },
  { key: "bodyType", label: "Body type", help: "Choose the build that feels right for your character.", options: ["Petite", "Slim", "Athletic", "Average", "Curvy", "Plus size", "Tall and lean", "Broad and strong"] },
  { key: "clothing", label: "Outfit", help: "Choose your character’s starting outfit. The choices match the selected gender.", options: femaleOutfits },
  { key: "shoes", label: "Shoes", help: "Choose a pair of shoes.", options: ["White high-top sneakers", "Pink ballet flats", "Blue running shoes", "Black ankle boots", "Rose-gold sandals", "Navy loafers", "Hot pink heels"] },
  { key: "handbag", label: "Handbag", help: "Choose a bag, or choose none.", options: ["Blush pink crossbody bag", "Blue canvas backpack", "Hot pink mini handbag", "Navy messenger bag", "Silver evening clutch", "No handbag"] },
  { key: "jewelry", label: "Jewelry", help: "Choose jewelry, or choose none.", options: ["Silver heart necklace", "Gold hoop earrings", "Pink beaded bracelet", "Blue gemstone studs", "Layered gold necklaces", "Silver watch", "No jewelry"] },
  { key: "laptop", label: "Laptop", help: "A laptop can be used at home for work, games, and shopping.", options: ["Sky blue laptop", "Rose pink laptop", "Silver laptop", "Midnight blue laptop", "No laptop"] },
  { key: "phone", label: "Cell phone", help: "A smartphone can be used for calls, messages, travel, and shopping.", options: ["Pink smartphone", "Blue smartphone", "Black smartphone", "Silver smartphone", "Flip phone in lavender", "No smartphone"] },
];

const baseRooms = {
  bedroom: (extra: Furniture[] = []) => ({ name: "Bedroom", description: "Your private space for sleeping, dressing, and unwinding.", furniture: [
    { label: "Bed", kind: "bed", description: "A comfortable bed with fresh pillows and a soft blanket." },
    { label: "Closet", kind: "closet", description: "A roomy closet containing all of your available outfits." },
    { label: "Full-length mirror", kind: "mirror", description: "A tall mirror that shows your character from head to toe." },
    ...extra,
  ]}),
  bathroom: (extra: Furniture[] = []) => ({ name: "Bathroom", description: "A clean bathroom for your character’s daily routine.", furniture: [
    { label: "Shower", kind: "shower", description: "A shower with adjustable warm water." },
    { label: "Bathroom sink", kind: "bathSink", description: "A sink with personal-care supplies arranged beside the faucet." },
    { label: "Mirror over bathroom sink", kind: "mirror", description: "A well-lit mirror mounted directly above the bathroom sink." },
    { label: "Toilet", kind: "toilet", description: "A clean toilet with a roll of paper nearby." },
    ...extra,
  ]}),
};

const homes: Record<string, Home> = {
  bungalow: {
    name: "Sunny One-Story Bungalow", tagline: "Cozy, calm, and all on one level", bedrooms: "One bedroom",
    description: "A cheerful one-story home with warm wood floors, an open living area, and a small breakfast nook.",
    rooms: {
      living: { name: "Living room", description: "A sunny room with soft seating and a view of the front garden.", furniture: [
        { label: "Floral sofa", kind: "sofa", description: "A deep blue sofa patterned with small pink flowers." },
        { label: "Round coffee table", kind: "coffeeTable", description: "A round oak table holding magazines and a remote control." },
        { label: "Wall-mounted TV", kind: "tv", description: "A 50-inch smart TV mounted opposite the sofa." },
        { label: "Bookshelf", kind: "bookshelf", description: "A low bookshelf filled with novels, cookbooks, and photo albums." },
      ]},
      kitchen: { name: "Kitchen", description: "A bright blue-and-white kitchen with a cozy breakfast nook.", furniture: [
        { label: "Blue refrigerator", kind: "fridge", description: "A full-size blue refrigerator stocked with fresh food and drinks." },
        { label: "Gas stove", kind: "stove", description: "A four-burner gas stove with an oven underneath." },
        { label: "Farmhouse sink", kind: "kitchenSink", description: "A deep white sink beneath the kitchen window." },
        { label: "Breakfast table", kind: "diningTable", description: "A round table with two cushioned chairs." },
      ]},
      bedroom: baseRooms.bedroom([{ label: "Pink vanity", kind: "vanity", description: "A pink dressing table with a mirror and cosmetics." }]),
      bathroom: baseRooms.bathroom([{ label: "Claw-foot tub", kind: "tub", description: "A white soaking tub with silver taps." }]),
    },
  },
  townhouse: {
    name: "Two-Story City Townhouse", tagline: "Stylish rooms across two floors", bedrooms: "Two bedrooms",
    description: "A tall modern townhouse with the social rooms downstairs and bedrooms upstairs.",
    rooms: {
      living: { name: "Living room", description: "A modern downstairs lounge with bold pink and navy accents.", furniture: [
        { label: "Navy sectional sofa", kind: "sofa", description: "A large L-shaped sofa with bright pink cushions." },
        { label: "Glass coffee table", kind: "coffeeTable", description: "A clear glass table with a gold frame." },
        { label: "Large smart TV", kind: "tv", description: "A 65-inch smart TV on a sleek media console." },
        { label: "Game console", kind: "gameConsole", description: "A game console with two wireless controllers." },
      ]},
      kitchen: { name: "Kitchen", description: "A polished open kitchen with a long island.", furniture: [
        { label: "French-door refrigerator", kind: "fridge", description: "A stainless refrigerator with two upper doors and a freezer drawer." },
        { label: "Induction range", kind: "stove", description: "A smooth induction cooktop above a convection oven." },
        { label: "Island sink", kind: "kitchenSink", description: "A wide sink built into the kitchen island." },
        { label: "Kitchen island", kind: "island", description: "A marble preparation island in the center of the kitchen." },
      ]},
      dining: { name: "Dining room", description: "A separate formal dining room with navy walls, warm lighting, and enough room to serve a full meal.", furniture: [
        { label: "Dining table", kind: "diningTable", description: "A long walnut dining table with six cushioned blue chairs." },
        { label: "Dining room sideboard", kind: "sideboard", description: "A low walnut sideboard for table linens and serving pieces." },
      ]},
      bedroom: baseRooms.bedroom([{ label: "Desk", kind: "desk", description: "A walnut desk with a comfortable task chair." }]),
      bathroom: baseRooms.bathroom([{ label: "Double vanity", kind: "vanity", description: "A wide vanity with two sinks and a large mirror." }]),
    },
  },
  apartmentOne: {
    name: "One-Bedroom Garden Apartment", tagline: "Compact, peaceful, and practical", bedrooms: "One bedroom",
    description: "A comfortable apartment with a garden-facing living room and smart use of space.",
    rooms: {
      living: { name: "Living room", description: "A compact lounge with soft blue walls and garden views.", furniture: [
        { label: "Pink loveseat", kind: "sofa", description: "A cozy two-seat sofa upholstered in dusty pink fabric." },
        { label: "Storage ottoman", kind: "coffeeTable", description: "A blue ottoman that serves as a table and hidden storage." },
        { label: "TV on media stand", kind: "tv", description: "A 43-inch TV on a white storage stand." },
        { label: "Floor lamp", kind: "lamp", description: "A curved lamp that casts warm light over the loveseat." },
      ]},
      kitchen: { name: "Kitchen", description: "An efficient galley kitchen with everything within easy reach.", furniture: [
        { label: "Apartment refrigerator", kind: "fridge", description: "A white refrigerator with a top freezer." },
        { label: "Electric stove", kind: "stove", description: "A compact electric stove and oven." },
        { label: "Stainless kitchen sink", kind: "kitchenSink", description: "A single-bowl sink beside the counter." },
        { label: "Drop-leaf table", kind: "diningTable", description: "A space-saving table with two folding chairs." },
      ]},
      bedroom: baseRooms.bedroom([{ label: "Reading chair", kind: "chair", description: "A plush blue chair beside the window." }]),
      bathroom: baseRooms.bathroom(),
    },
  },
  apartmentTwo: {
    name: "Two-Bedroom Skyline Apartment", tagline: "Roomy, bright, and made for sharing", bedrooms: "Two bedrooms",
    description: "A spacious apartment with broad windows, a guest bedroom, and a view across the city.",
    rooms: {
      living: { name: "Living room", description: "An airy room with city views and separate lounging and media areas.", furniture: [
        { label: "Sky blue sofa", kind: "sofa", description: "A three-seat sofa with pink and silver cushions." },
        { label: "Nesting coffee tables", kind: "coffeeTable", description: "Two round tables that slide neatly together." },
        { label: "Entertainment-center TV", kind: "tv", description: "A 55-inch smart TV surrounded by shelves." },
        { label: "Bluetooth speaker", kind: "speaker", description: "A compact speaker for music and podcasts." },
      ]},
      kitchen: { name: "Kitchen", description: "A roomy kitchen with pale pink cabinets and a dining corner.", furniture: [
        { label: "Pink refrigerator", kind: "fridge", description: "A retro-style pink refrigerator with a lower freezer." },
        { label: "Ceramic cooktop", kind: "stove", description: "A flat cooktop with a wall oven beside it." },
        { label: "Double kitchen sink", kind: "kitchenSink", description: "A two-bowl sink with a pull-down faucet." },
        { label: "Dining table", kind: "diningTable", description: "A rectangular table with four blue chairs." },
      ]},
      bedroom: baseRooms.bedroom([{ label: "Second bedroom", kind: "guestBed", description: "A separate guest room with a daybed and small dresser." }]),
      bathroom: baseRooms.bathroom([{ label: "Linen cabinet", kind: "linen", description: "A tall cabinet stocked with towels and toiletries." }]),
    },
  },
};

const fridgeInventory = [
  { id: "milk", label: "milk" },
  { id: "water", label: "water" },
  { id: "juice", label: "juice" },
  { id: "soda", label: "soda" },
  { id: "eggs", label: "eggs" },
  { id: "butter", label: "butter" },
  { id: "yogurt", label: "yogurt" },
  { id: "strawberries", label: "strawberries" },
  { id: "apples", label: "apples" },
  { id: "cheese", label: "cheese" },
  { id: "bread", label: "bread" },
  { id: "vegetables", label: "vegetables" },
  { id: "leftovers", label: "breakfast leftovers" },
  { id: "deli-turkey", label: "deli turkey" },
  { id: "ham", label: "sliced ham" },
  { id: "bacon", label: "bacon" },
  { id: "lettuce", label: "lettuce" },
  { id: "tomatoes", label: "tomatoes" },
  { id: "carrots", label: "carrots" },
  { id: "broccoli", label: "broccoli" },
  { id: "grapes", label: "grapes" },
  { id: "blueberries", label: "blueberries" },
  { id: "cream", label: "fresh cream" },
  { id: "ketchup", label: "ketchup" },
  { id: "mayonnaise", label: "mayonnaise" },
] as const;

const freezerInventory = [
  { id: "ground-beef", label: "ground beef" },
  { id: "pork-chops", label: "pork chops" },
  { id: "chicken-breasts", label: "chicken breasts" },
  { id: "salmon", label: "salmon fillets" },
  { id: "frozen-vegetables", label: "frozen mixed vegetables" },
  { id: "frozen-berries", label: "frozen berries" },
  { id: "frozen-waffles", label: "frozen waffles" },
  { id: "ice-cream", label: "vanilla ice cream" },
] as const;

const dishCabinetInventory = [
  { id: "drinking-glass", label: "drinking glass" },
  { id: "plate", label: "dinner plate" },
  { id: "coffee-mug", label: "coffee mug" },
  { id: "bowl", label: "bowl" },
] as const;

const pantryInventory = [
  { id: "sugar", label: "sugar" },
  { id: "powdered-creamer", label: "powdered coffee creamer" },
  { id: "pasta", label: "dry pasta" },
  { id: "rice", label: "rice" },
  { id: "cereal", label: "breakfast cereal" },
  { id: "flour", label: "flour" },
  { id: "burger-buns", label: "burger buns" },
  { id: "taco-shells", label: "taco shells" },
  { id: "chocolate-chips", label: "chocolate chips" },
] as const;

const silverwareInventory = [
  { id: "fork", label: "fork" },
  { id: "spoon", label: "spoon" },
  { id: "table-knife", label: "table knife" },
  { id: "teaspoon", label: "teaspoon" },
] as const;

const cookwareInventory = [
  { id: "frying-pan", label: "frying pan" },
  { id: "saucepan", label: "saucepan" },
  { id: "stock-pot", label: "large stock pot" },
  { id: "baking-dish", label: "baking dish" },
  { id: "baking-tray", label: "baking tray" },
] as const;

const groceryProducts: GroceryProduct[] = [
  { id: "milk", label: "Milk", price: 4, department: "Dairy and eggs" },
  { id: "eggs", label: "Eggs", price: 5, department: "Dairy and eggs" },
  { id: "butter", label: "Butter", price: 4, department: "Dairy and eggs" },
  { id: "yogurt", label: "Yogurt", price: 2, department: "Dairy and eggs" },
  { id: "cheese", label: "Cheese", price: 5, department: "Dairy and eggs" },
  { id: "cream", label: "Fresh cream", price: 4, department: "Dairy and eggs" },
  { id: "strawberries", label: "Strawberries", price: 5, department: "Produce" },
  { id: "apples", label: "Apples", price: 4, department: "Produce" },
  { id: "grapes", label: "Grapes", price: 5, department: "Produce" },
  { id: "blueberries", label: "Blueberries", price: 5, department: "Produce" },
  { id: "lettuce", label: "Lettuce", price: 3, department: "Produce" },
  { id: "tomatoes", label: "Tomatoes", price: 4, department: "Produce" },
  { id: "carrots", label: "Carrots", price: 3, department: "Produce" },
  { id: "broccoli", label: "Broccoli", price: 4, department: "Produce" },
  { id: "ground-beef", label: "Ground beef", price: 8, department: "Meat and seafood" },
  { id: "pork-chops", label: "Pork chops", price: 10, department: "Meat and seafood" },
  { id: "chicken-breasts", label: "Chicken breasts", price: 9, department: "Meat and seafood" },
  { id: "salmon", label: "Salmon fillets", price: 13, department: "Meat and seafood" },
  { id: "deli-turkey", label: "Deli turkey", price: 7, department: "Meat and seafood" },
  { id: "ham", label: "Sliced ham", price: 7, department: "Meat and seafood" },
  { id: "bacon", label: "Bacon", price: 7, department: "Meat and seafood" },
  { id: "bread", label: "Bread", price: 4, department: "Bakery and pantry" },
  { id: "pasta", label: "Dry pasta", price: 3, department: "Bakery and pantry" },
  { id: "rice", label: "Rice", price: 4, department: "Bakery and pantry" },
  { id: "cereal", label: "Breakfast cereal", price: 5, department: "Bakery and pantry" },
  { id: "flour", label: "Flour", price: 4, department: "Bakery and pantry" },
  { id: "sugar", label: "Sugar", price: 4, department: "Bakery and pantry" },
  { id: "burger-buns", label: "Burger buns", price: 4, department: "Bakery and pantry" },
  { id: "taco-shells", label: "Taco shells", price: 4, department: "Bakery and pantry" },
  { id: "water", label: "Bottled water", price: 3, department: "Drinks" },
  { id: "juice", label: "Orange juice", price: 5, department: "Drinks" },
  { id: "soda", label: "Lemon-lime soda", price: 4, department: "Drinks" },
  { id: "frozen-vegetables", label: "Frozen mixed vegetables", price: 4, department: "Frozen foods" },
  { id: "frozen-berries", label: "Frozen berries", price: 5, department: "Frozen foods" },
  { id: "frozen-waffles", label: "Frozen waffles", price: 4, department: "Frozen foods" },
  { id: "ice-cream", label: "Vanilla ice cream", price: 6, department: "Frozen foods" },
];

const furnitureColors = ["Pink", "Blue", "Black", "White", "Gray", "Green", "Aqua", "Purple", "Dark green", "Beige"];
const furnitureProducts: FurnitureProduct[] = [
  { id: "classic-sofa", label: "Classic three-seat sofa", material: "genuine leather", price: 950, category: "Sofas and seating" },
  { id: "modern-sofa", label: "Modern low-back sofa", material: "faux leather", price: 700, category: "Sofas and seating" },
  { id: "cushion-sofa", label: "Deep-cushion sofa", material: "soft woven fabric", price: 620, category: "Sofas and seating" },
  { id: "velvet-loveseat", label: "Tufted loveseat", material: "plush velvet", price: 540, category: "Sofas and seating" },
  { id: "armchair", label: "Rounded armchair", material: "soft microfiber fabric", price: 280, category: "Sofas and seating" },
  { id: "rocking-chair", label: "High-back rocking chair", material: "genuine leather", price: 420, category: "Sofas and seating" },
  { id: "recliner", label: "Lever recliner", material: "faux leather", price: 390, category: "Sofas and seating" },
  { id: "platform-bed", label: "Upholstered platform bed", material: "padded fabric", price: 720, category: "Beds" },
  { id: "sleigh-bed", label: "Curved sleigh bed", material: "smooth finished wood", price: 840, category: "Beds" },
  { id: "canopy-bed", label: "Four-poster canopy bed", material: "powder-coated metal and fabric", price: 890, category: "Beds" },
  { id: "dining-table", label: "Six-seat dining table", material: "smooth finished wood", price: 650, category: "Tables" },
  { id: "coffee-table", label: "Rounded coffee table", material: "wood with a soft-edge finish", price: 260, category: "Tables" },
  { id: "side-table", label: "Two-drawer side table", material: "painted wood", price: 140, category: "Tables" },
  { id: "oled-tv", label: "55-inch OLED television", material: "ultra-thin flat screen", price: 1200, category: "Televisions" },
  { id: "qled-tv", label: "65-inch QLED television", material: "slim flat screen", price: 1400, category: "Televisions" },
  { id: "frame-tv", label: "50-inch frame-style television", material: "picture-frame bezel", price: 1000, category: "Televisions" },
  { id: "led-tv", label: "43-inch LED television", material: "compact flat screen", price: 480, category: "Televisions" },
];

const itemLabels: Record<string, string> = {
  ...Object.fromEntries(fridgeInventory.map(item => [item.id, item.label])),
  ...Object.fromEntries(freezerInventory.map(item => [item.id, item.label])),
  ...Object.fromEntries(dishCabinetInventory.map(item => [item.id, item.label])),
  ...Object.fromEntries(pantryInventory.map(item => [item.id, item.label])),
  ...Object.fromEntries(silverwareInventory.map(item => [item.id, item.label])),
  ...Object.fromEntries(cookwareInventory.map(item => [item.id, item.label])),
  water: "bottled water",
  juice: "orange juice",
  soda: "lemon-lime soda",
  "glass-milk": "glass of milk",
  "glass-water": "glass of water",
  "glass-juice": "glass of orange juice",
  "glass-soda": "glass of soda",
  "plate-breakfast": "plate of scrambled eggs",
  "buttered-toast": "piece of buttered toast",
  toast: "piece of toast",
  salad: "bowl of salad",
  "meal-grilled-cheese": "grilled-cheese sandwich",
  "meal-burgers": "burgers",
  "meal-pork-chops": "pork chops",
  "meal-pasta": "pasta dinner",
  "meal-omelet": "omelet",
  "meal-stir-fry": "chicken and vegetable stir-fry",
  "meal-tacos": "tacos",
  "meal-cookies": "chocolate-chip cookies",
  "meal-sandwich": "deli sandwich",
  "meal-salmon": "salmon dinner",
  "meal-waffles": "toasted waffles",
  "meal-ice-cream": "vanilla ice cream",
  "meal-cereal": "breakfast cereal",
  "meal-bacon": "crisp bacon",
  "meal-broccoli": "steamed broccoli",
  "meal-berries": "thawed berries",
  "cooked-ground-beef": "cooked ground beef",
  "mug-coffee-black": "mug of black coffee",
  "mug-coffee-sugar": "mug of coffee with sugar",
  "mug-coffee-creamer": "mug of coffee with creamer",
  "mug-coffee-both": "mug of coffee with sugar and creamer",
  "empty-mug": "empty coffee mug",
  "held-empty-mug": "empty coffee mug being carried",
  "empty-plate": "empty plate",
  "held-empty-plate": "empty plate being carried",
  "empty-bowl": "empty bowl",
  "held-empty-bowl": "empty bowl being carried",
  "empty-glass": "empty glass",
  "held-empty-glass": "empty glass being carried",
  "empty-milk-carton": "empty milk carton",
  "held-empty-milk-carton": "empty milk carton being carried",
  "empty-water-bottle": "empty water bottle",
  "held-empty-water-bottle": "empty water bottle being carried",
  "empty-juice-carton": "empty juice carton",
  "held-empty-juice-carton": "empty juice carton being carried",
  "empty-soda-can": "empty soda can",
  "held-empty-soda-can": "empty soda can being carried",
  "held-book-fantasy": "The Lantern Kingdom",
  "held-book-drama": "The House on Willow Street",
  "held-book-crime": "Midnight at Harbor Station",
  "held-book-romance": "Letters from the Blue Café",
  "held-book-biography": "Breaking the Sound Barrier",
  "held-book-nature": "Hidden Life of Forests",
};

function labelForItem(item: string): string {
  if (item.startsWith("plated:")) {
    const meal = item.slice("plated:".length);
    return `${preparedMeals[meal]?.dish || "plate"} of ${labelForItem(meal)}`;
  }
  if (item.startsWith("assembly-base:")) return `${assemblyPlans[item.slice("assembly-base:".length)]?.name || "meal"} being assembled on a plate`;
  if (itemLabels[item]) return itemLabels[item];
  if (item.startsWith("held-")) return `${labelForItem(item.slice(5))} being carried`;
  if (item.startsWith("table-")) return `${labelForItem(item.slice(6))} on the coffee table`;
  if (item.startsWith("coffee-empty-")) return `empty ${item.slice(13)} on the coffee table`;
  return item.replaceAll("-", " ");
}

function readableList(items: string[]) {
  if (items.length < 2) return items[0] || "nothing";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function inventoryActions(items: readonly { id: string; label: string }[], location: string): Action[] {
  return items.map(item => ({
    value: `get-${item.id}`,
    label: `Get ${item.label}`,
    description: `Take the ${item.label} from the ${location} and place it on the kitchen counter.`,
    result: `The ${item.label} is now on the kitchen counter.`,
    nextItem: item.id,
  }));
}

const actions: Record<string, Action[]> = {
  fridge: inventoryActions(fridgeInventory, "refrigerator"),
  freezer: inventoryActions(freezerInventory, "freezer"),
  dishCabinet: inventoryActions(dishCabinetInventory, "dish cabinet"),
  pantry: inventoryActions(pantryInventory, "pantry cabinet"),
  silverwareDrawer: inventoryActions(silverwareInventory, "silverware drawer"),
  coffeeMachine: [
    { value: "coffee-black", label: "Make black coffee", description: "Brew coffee and pour it into a clean mug.", result: "A mug of fresh black coffee is on the counter.", nextItem: "mug-coffee-black" },
    { value: "coffee-sugar", label: "Make coffee with sugar", description: "Brew coffee and stir in sugar from the pantry.", result: "A mug of coffee with sugar is on the counter.", nextItem: "mug-coffee-sugar" },
    { value: "coffee-creamer", label: "Make coffee with creamer", description: "Brew coffee and stir in powdered creamer from the pantry.", result: "A mug of coffee with creamer is on the counter.", nextItem: "mug-coffee-creamer" },
    { value: "coffee-both", label: "Make coffee with sugar and creamer", description: "Brew coffee, then stir in sugar and powdered creamer.", result: "A mug of coffee with sugar and creamer is on the counter.", nextItem: "mug-coffee-both" },
  ],
  tv: [
    { value: "watch", label: "Watch TV", description: "Turn on the TV and continue the last program.", result: "The TV turns on. A cheerful home-renovation show begins playing." },
    { value: "cartoons", label: "Browse cartoon channels", description: "Browse animated comedy, adventure, family, and classic-cartoon channels.", result: "You browse cartoon channels and stop on a lighthearted animated adventure." },
    { value: "drama", label: "Browse drama channels", description: "Browse mysteries, medical dramas, family dramas, and period series.", result: "You browse drama channels and find a character-driven mystery." },
    { value: "comedy", label: "Browse comedy channels", description: "Browse sitcoms, stand-up specials, and sketch-comedy programs.", result: "You browse comedy channels and choose a funny sitcom." },
    { value: "browse", label: "Browse a random channel", description: "Let the television choose any available channel at random.", result: "The television picks a random cooking competition with audio description." },
    { value: "off", label: "Turn off the TV", description: "Stop the current program and turn off the screen.", result: "The television powers off, and the room becomes quiet." },
  ],
  closet: [
    ...fields.find(field => field.key === "clothing")!.options.slice(0, 6).map(outfit => ({ value: outfit, label: `Change into ${outfit}`, description: `Put away the current clothes and wear ${outfit.toLowerCase()}.`, result: `You change into ${outfit.toLowerCase()}.` })),
  ],
  bed: [
    { value: "sleep", label: "Go to sleep", description: "Get under the covers and sleep until morning.", result: "You settle under the soft covers and sleep peacefully until morning." },
    { value: "nap", label: "Take a nap", description: "Rest for a short time without advancing to the next day.", result: "You take a comfortable afternoon nap and wake feeling refreshed." },
    { value: "make", label: "Make the bed", description: "Straighten the sheets, pillows, and blanket.", result: "You smooth the sheets, arrange the pillows, and neatly fold the blanket." },
  ],
  sofa: [
    { value: "sit", label: "Sit down", description: "Sit comfortably on the sofa.", result: "You settle into the sofa’s soft cushions." },
    { value: "relax", label: "Relax", description: "Stretch out and take a quiet break.", result: "You stretch out, breathe deeply, and feel your stress ease." },
    { value: "read", label: "Read a book", description: "Choose a nearby book and read for a while.", result: "You read a funny mystery novel for an hour." },
  ],
  bookshelf: [
    { value: "book-fantasy", label: "Take The Lantern Kingdom — fantasy", description: "A fantasy adventure about a hidden kingdom and a magical lantern.", result: "You take The Lantern Kingdom from the shelf.", nextItem: "held-book-fantasy" },
    { value: "book-drama", label: "Take The House on Willow Street — drama", description: "A family drama about three sisters returning to their childhood home.", result: "You take The House on Willow Street from the shelf.", nextItem: "held-book-drama" },
    { value: "book-crime", label: "Take Midnight at Harbor Station — crime", description: "A detective investigates a disappearance at a quiet railway station.", result: "You take Midnight at Harbor Station from the shelf.", nextItem: "held-book-crime" },
    { value: "book-romance", label: "Take Letters from the Blue Café — romance", description: "Two friends fall in love through notes left inside café books.", result: "You take Letters from the Blue Café from the shelf.", nextItem: "held-book-romance" },
    { value: "book-biography", label: "Take Breaking the Sound Barrier — biography", description: "The life story of a pioneering blind radio journalist.", result: "You take Breaking the Sound Barrier from the shelf.", nextItem: "held-book-biography" },
    { value: "book-nature", label: "Take Hidden Life of Forests — nature", description: "An accessible guide to forest animals, plants, weather, and seasonal changes.", result: "You take Hidden Life of Forests from the shelf.", nextItem: "held-book-nature" },
  ],
  stove: [
    { value: "lunch", label: "Make grilled cheese", description: "Cook a grilled-cheese sandwich on the stove.", result: "You cook a crisp grilled-cheese sandwich and place it on a plate." },
    { value: "dinner", label: "Cook pasta dinner", description: "Boil pasta and prepare a tomato-and-herb sauce.", result: "You cook pasta with tomato sauce. Dinner is warm and ready." },
    { value: "bake", label: "Bake cookies", description: "Mix and bake a tray of chocolate-chip cookies.", result: "The cookies bake until golden, filling the home with a sweet smell." },
  ],
  kitchenSink: [
    { value: "wash", label: "Wash dishes", description: "Wash, rinse, dry, and put away the used dishes.", result: "You wash and put away every dish. The sink is empty and clean." },
    { value: "hands", label: "Wash hands", description: "Wash your hands thoroughly with warm water and soap.", result: "You wash and dry your hands." },
    { value: "fill", label: "Fill a water bottle", description: "Fill a reusable bottle with fresh tap water.", result: "You fill your water bottle and tighten the lid." },
  ],
  shower: [
    { value: "shower", label: "Take a shower", description: "Take a warm shower and get clean.", result: "You take a warm shower, dry off, and feel fresh." },
    { value: "quick", label: "Take a quick shower", description: "Take a brief shower when your character is in a hurry.", result: "You finish a quick shower and are ready for the day." },
  ],
  bathSink: [
    { value: "teeth", label: "Brush teeth", description: "Brush your teeth for two minutes.", result: "You brush your teeth thoroughly and rinse the sink." },
    { value: "face", label: "Wash face", description: "Wash and dry your face.", result: "You wash your face with cool water and pat it dry." },
    { value: "mirror", label: "View self", description: "Hear a complete description of your appearance, including makeup.", result: "Your appearance is ready to be described." },
  ],
  toilet: [
    { value: "use", label: "Use the toilet", description: "Take care of your character’s bathroom need in privacy.", result: "Your character uses the toilet, flushes, and washes their hands." },
    { value: "clean", label: "Clean the toilet", description: "Clean and sanitize the toilet.", result: "You clean the toilet until it is fresh and spotless." },
  ],
  laptop: [
    { value: "work", label: "Work on the laptop", description: "Open your current work project and make progress for one hour.", result: "You finish an hour of focused work and save your progress." },
    { value: "shop", label: "Shop online", description: "Browse an accessible online store for clothing and home items.", result: "You browse new outfits and decorations, but do not purchase anything yet." },
    { value: "game", label: "Play a computer game", description: "Open an accessible adventure game and play for fun.", result: "You play an exciting adventure game and complete a challenging quest." },
    { value: "email", label: "Check email", description: "Open the inbox and read your latest messages.", result: "You check your inbox. There is a friendly message and one store newsletter." },
  ],
  phone: [
    { value: "call", label: "Call a friend", description: "Choose a friend and have a friendly phone conversation.", result: "You call a friend and enjoy catching up for a while." },
    { value: "message", label: "Check messages", description: "Open your conversations and read new text messages.", result: "You have one new message asking if you would like to meet for lunch." },
    { value: "travel", label: "Plan a trip", description: "Open the travel app and review destinations you can visit.", result: "You find options for the park, café, library, shopping center, and downtown." },
    { value: "shop", label: "Shop from the phone", description: "Browse an accessible mobile store for useful items.", result: "You browse clothing, groceries, electronics, and home decorations." },
    { value: "selfie", label: "Take a selfie", description: "Open the front camera, frame your face, and take a self-portrait.", result: "You open the front camera, center your face, and take a clear selfie." },
    { value: "room-photo", label: "Take a picture of the room", description: "Open the rear camera and photograph the room you are standing in.", result: "You open the camera, point it across the room, and take a picture." },
  ],
  vanity: [
    { value: "lipstick-pink", label: "Apply rose-pink lipstick", description: "Choose a creamy rose-pink lipstick and carefully apply it.", result: "You twist up the rose-pink lipstick, trace the shape of your lips, fill in the color, and blot it gently." },
    { value: "lipstick-red", label: "Apply classic red lipstick", description: "Choose a bold red lipstick and carefully apply it.", result: "You apply a smooth layer of classic red lipstick and check that the edges are even." },
    { value: "shadow-blue", label: "Apply blue eyeshadow", description: "Brush soft blue color across both eyelids.", result: "You blend sky-blue eyeshadow across both eyelids, adding a little deeper blue near the outer corners." },
    { value: "shadow-pink", label: "Apply pink eyeshadow", description: "Brush shimmering pink color across both eyelids.", result: "You sweep shimmering pink eyeshadow over both eyelids and blend the edges until they are soft." },
    { value: "blush", label: "Apply rosy blush", description: "Dust a natural rosy color over both cheeks.", result: "You smile into the mirror and lightly blend rosy blush over the apples of both cheeks." },
    { value: "full-look", label: "Create a complete makeup look", description: "Apply foundation, eyeshadow, mascara, blush, and lipstick.", result: "You apply light foundation, soft pink eyeshadow, mascara, rosy blush, and berry lipstick for a complete polished look." },
    { value: "remove", label: "Remove makeup", description: "Use a gentle cleanser to remove all makeup.", result: "You gently remove the makeup, rinse your face, and pat your skin dry with a clean towel." },
  ],
};

const genericActions: Action[] = [
  { value: "use", label: "Use this item", description: "Interact with this piece of furniture in the usual way.", result: "You use the item and return it neatly to its place." },
  { value: "inspect", label: "Inspect this item", description: "Hear a closer description and check its condition.", result: "You inspect the item. It is clean, working properly, and in excellent condition." },
  { value: "clean", label: "Clean this item", description: "Dust or wipe down this piece of furniture.", result: "You clean the item carefully. It looks fresh and tidy." },
];

type Recipe = { name: string; meal: string; required: string[]; assemblyRequired?: string[]; assemblyOptional?: string[]; optional: string[]; heatStep: string; cookStep: string; cookedLabel?: string };

const recipes: Record<string, Recipe> = {
  "ground-meat": { name: "plain ground beef", meal: "cooked-ground-beef", required: ["ground-beef"], optional: [], heatStep: "Heat the frying pan on the range", cookStep: "Break up and brown the ground beef thoroughly", cookedLabel: "cooked ground beef" },
  burgers: { name: "burgers", meal: "meal-burgers", required: ["ground-beef"], assemblyRequired: ["burger-buns"], assemblyOptional: ["cheese", "lettuce", "tomatoes", "ketchup", "mayonnaise"], optional: [], heatStep: "Heat the frying pan on the range", cookStep: "Shape and cook the burger patties thoroughly", cookedLabel: "cooked burger patties" },
  tacos: { name: "tacos", meal: "meal-tacos", required: ["ground-beef"], assemblyRequired: ["taco-shells"], assemblyOptional: ["cheese", "lettuce", "tomatoes"], optional: [], heatStep: "Heat the frying pan on the range", cookStep: "Brown and season the ground beef", cookedLabel: "cooked taco meat" },
  "pork-chops": { name: "pork chops", meal: "meal-pork-chops", required: ["pork-chops"], optional: ["butter", "broccoli", "carrots", "rice"], heatStep: "Heat the frying pan on the range", cookStep: "Season and cook the pork chops until done" },
  "grilled-cheese": { name: "grilled cheese", meal: "meal-grilled-cheese", required: ["bread", "butter", "cheese"], optional: ["tomatoes", "bacon", "deli-turkey"], heatStep: "Heat a frying pan on the range", cookStep: "Assemble the sandwich and grill both sides" },
  pasta: { name: "pasta dinner", meal: "meal-pasta", required: ["pasta", "tomatoes"], optional: ["cheese", "vegetables", "ground-beef"], heatStep: "Fill a pot with water and bring it to a boil", cookStep: "Add the pasta and cook it until tender" },
  omelet: { name: "omelet", meal: "meal-omelet", required: ["eggs", "butter"], optional: ["cheese", "ham", "tomatoes", "broccoli"], heatStep: "Heat a frying pan on the range", cookStep: "Crack and whisk the eggs, then pour them into the pan" },
  "stir-fry": { name: "chicken and vegetable stir-fry", meal: "meal-stir-fry", required: ["chicken-breasts", "frozen-vegetables", "rice"], optional: ["broccoli", "carrots"], heatStep: "Heat a large pan on the range", cookStep: "Prepare the ingredients and cook them thoroughly" },
  cookies: { name: "chocolate-chip cookies", meal: "meal-cookies", required: ["flour", "butter", "sugar", "chocolate-chips"], optional: [], heatStep: "Preheat the oven and prepare a baking tray", cookStep: "Mix the cookie dough and shape it on the tray" },
  "salmon-dinner": { name: "salmon dinner", meal: "meal-salmon", required: ["salmon", "broccoli"], optional: ["carrots", "rice", "butter"], heatStep: "Preheat the oven and prepare a baking dish", cookStep: "Season the salmon and place it in the baking dish" },
};

const assemblyPlans: Record<string, { name: string; meal: string; required: string[]; optional: string[] }> = {
  burgers: { name: "burgers", meal: "meal-burgers", required: ["burger-buns"], optional: ["cheese", "lettuce", "tomatoes", "ketchup", "mayonnaise"] },
  tacos: { name: "tacos", meal: "meal-tacos", required: ["taco-shells"], optional: ["cheese", "lettuce", "tomatoes"] },
  sandwich: { name: "deli sandwich", meal: "meal-sandwich", required: ["deli-turkey"], optional: ["cheese", "lettuce", "tomatoes", "mayonnaise"] },
};

const cookableItems = new Set([
  ...fridgeInventory.map(item => item.id),
  ...freezerInventory.map(item => item.id),
  ...pantryInventory.map(item => item.id),
]);

const preparedMeals: Record<string, { dish: "plate" | "bowl"; sound: string }> = {
  "cooked-ground-beef": { dish: "plate", sound: "eat-soft-food" },
  "meal-grilled-cheese": { dish: "plate", sound: "eat-crunchy-food" },
  "meal-burgers": { dish: "plate", sound: "eat-crunchy-food" },
  "meal-pork-chops": { dish: "plate", sound: "eat-soft-food" },
  "meal-pasta": { dish: "bowl", sound: "eat-soft-food" },
  "meal-omelet": { dish: "plate", sound: "eat-soft-food" },
  "meal-stir-fry": { dish: "bowl", sound: "eat-crunchy-food" },
  "meal-tacos": { dish: "plate", sound: "eat-crunchy-food" },
  "meal-cookies": { dish: "plate", sound: "eat-crunchy-food" },
  "meal-sandwich": { dish: "plate", sound: "eat-crunchy-food" },
  "meal-salmon": { dish: "plate", sound: "eat-soft-food" },
  "meal-waffles": { dish: "plate", sound: "eat-soft-food" },
  "meal-ice-cream": { dish: "bowl", sound: "eat-soft-food" },
  "meal-cereal": { dish: "bowl", sound: "eat-crunchy-food" },
  "meal-bacon": { dish: "plate", sound: "eat-crunchy-food" },
  "meal-broccoli": { dish: "bowl", sound: "eat-crunchy-food" },
  "meal-berries": { dish: "bowl", sound: "eat-soft-food" },
  "plate-breakfast": { dish: "plate", sound: "eat-soft-food" },
  salad: { dish: "bowl", sound: "eat-crunchy-food" },
};

const kitchenware = new Set(["drinking-glass", "plate", "coffee-mug", "bowl", "fork", "spoon", "table-knife", "teaspoon"]);

function storageForItem(item: string) {
  if (cookwareInventory.some(entry => entry.id === item)) return { label: "cookware cabinet", sound: "return-cabinet" };
  if (freezerInventory.some(entry => entry.id === item)) return { label: "freezer", sound: "return-fridge" };
  if (fridgeInventory.some(entry => entry.id === item)) return { label: "refrigerator", sound: "return-fridge" };
  if (pantryInventory.some(entry => entry.id === item)) return { label: "pantry cabinet", sound: "return-cabinet" };
  if (dishCabinetInventory.some(entry => entry.id === item)) return { label: "dish cabinet", sound: "return-cabinet" };
  if (silverwareInventory.some(entry => entry.id === item)) return { label: "silverware drawer", sound: "return-cabinet" };
  if (item.startsWith("plated:") || item.startsWith("meal-") || item.startsWith("glass-") || item.startsWith("mug-coffee-")) return { label: "refrigerator", sound: "return-fridge" };
  return { label: "storage", sound: "return-cabinet" };
}

function closetActionsFor(gender: string): Action[] {
  return (wardrobeOptions[gender] || femaleOutfits).map(outfit => ({
    value: outfit,
    label: `Change into ${outfit}`,
    description: `Put away the current clothes and wear ${outfit.toLowerCase()}.`,
    result: `You change into ${outfit.toLowerCase()}.`,
  }));
}

function appearanceDescription(character: Character, name: string, makeup: string) {
  const bag = character.handbag === "No handbag" ? "No handbag is being carried" : `${character.handbag} is carried with the outfit`;
  const jewelry = character.jewelry === "No jewelry" ? "No jewelry is being worn" : `${character.jewelry} completes the look`;
  return `${name} is ${character.gender.toLowerCase()} with a ${character.bodyType.toLowerCase()} build and ${character.skinTone.toLowerCase()} skin. ${name} has ${character.hairColor.toLowerCase()} hair styled as ${character.hairStyle.toLowerCase()}, with ${character.eyeColor.toLowerCase()} eyes. ${name} is wearing ${character.clothing.toLowerCase()} and ${character.shoes.toLowerCase()}. ${bag}. ${jewelry}. ${makeup}.`;
}

function stoveActionsFor(recipeKey: string | null, addedIngredients: string[], cookingStage: number, stoveOn: boolean): Action[] {
  if (!recipeKey) return [{
    value: "choose-ingredients-first",
    label: "Choose an ingredient first",
    description: "Get a cooking ingredient from the refrigerator, freezer, or pantry and use it at the kitchen counter to begin a recipe.",
    result: "Choose a cooking ingredient from storage and take it to the kitchen counter before using the range.",
  }];
  const recipe = recipes[recipeKey];
  const ingredientSummary = addedIngredients.length ? addedIngredients.map(item => itemLabels[item] || item).join(", ") : "no ingredients";
  const turnOn: Action = { value: "turn-on-range", label: "Turn on the range", description: `Turn on the burner beneath the cookware so ${recipe.name} can continue cooking.`, result: `The range turns on beneath the cookware.`, soundAction: "stove-on" };
  const turnOff: Action = { value: "turn-off-range", label: "Turn off the range", description: "Turn off the burner without changing the food or cooking progress.", result: "The range turns off. The food remains in the cookware.", soundAction: "stove-off" };
  const cancel: Action = { value: "cancel-cooking", label: `Cancel ${recipe.name} and return the ingredients`, description: "Keep the range off and remove every ingredient from the cookware.", result: `Cooking ${recipe.name} is canceled. Return each ingredient from the cookware to the counter.`, soundAction: "cancel-cooking" };
  if (!stoveOn) return [turnOn, cancel];
  if (cookingStage === 0) return [
    { value: "cooking-step-heat", label: `Heat the cookware: ${recipe.heatStep}`, description: `Heat the cookware for ${recipe.name}. Ingredients currently added: ${ingredientSummary}.`, result: `${recipe.heatStep}.`, soundAction: "heat-cookware" },
    turnOff,
  ];
  if (cookingStage === 1) return [
    { value: "cooking-step-cook", label: `Cook the meal: ${recipe.cookStep}`, description: `Continue preparing ${recipe.name}.`, result: `${recipe.cookStep}. You can now get optional ingredients from storage and add them at the counter.`, soundAction: "cook-food" },
    turnOff,
  ];
  return [
    { value: "finish-cooking", label: `Finish cooking ${recipe.name}`, description: `Finish the meal in the cookware. Ingredients used: ${ingredientSummary}.`, result: `The ${recipe.name} is finished with ${ingredientSummary} and remains in the cookware. Turn off the range, then assemble and plate it.`, nextItem: recipe.meal, soundAction: "finish-cooking" },
    turnOff,
  ];
}

function coffeeTableActionsFor(item: string | null, seatedOnSofa: boolean): Action[] {
  if (!item) return [
    { value: "look-at-table", label: "Look at the coffee table", description: "Check the table for anything that has been placed there.", result: "The coffee table is clear and ready for food, drinks, dishes, or a book." },
    { value: "read-magazine", label: "Read a magazine", description: "Pick up one of the magazines kept on the coffee table.", result: "You read a home-and-garden magazine and return it to the table." },
  ];
  if (item.startsWith("held-book-")) return [
    { value: "read-book-at-table", label: `Read ${labelForItem(item)} at the coffee table`, description: "Sit near the coffee table and read the selected book.", result: `You read several chapters of ${labelForItem(item)} and return it to the bookshelf.`, nextItem: null },
  ];
  if (item.startsWith("held-glass-")) {
    const drink = item.slice("held-glass-".length);
    const label = drink === "juice" ? "orange juice" : drink;
    return [{ value: `drink-${drink}-at-table`, label: `Drink the glass of ${label}`, description: `Drink the ${label} at the coffee table.`, result: `The ${label} is finished. The empty glass remains on the coffee table.`, nextItem: "coffee-empty-glass", soundAction: `drink-${drink}` }];
  }
  if (item.startsWith("held-mug-coffee-")) return [
    { value: "drink-coffee-at-table", label: `Drink the ${labelForItem(item).replace(" being carried", "")}`, description: "Drink the coffee while sitting by the coffee table.", result: "The coffee is finished. The empty mug remains on the coffee table.", nextItem: "coffee-empty-mug", soundAction: "drink-coffee" },
  ];
  if (item.startsWith("held-") && preparedMeals[item.slice(5)]) {
    const mealKey = item.slice(5);
    const meal = labelForItem(mealKey);
    return [{ value: `place-${mealKey}-on-table`, label: `Put the ${meal} on the coffee table`, description: `Set the ${meal} on the coffee table before sitting on the couch.`, result: `The ${meal} is on the coffee table, ready to eat from the couch.`, nextItem: `table-${mealKey}`, soundAction: "set-dish-down" }];
  }
  if (item.startsWith("table-") && preparedMeals[item.slice(6)]) {
    const mealKey = item.slice(6);
    const meal = labelForItem(mealKey);
    const dish = preparedMeals[mealKey].dish;
    if (!seatedOnSofa) return [{ value: "sit-before-eating", label: "Sit on the couch before eating", description: `Sit on the couch beside the coffee table before eating the ${meal}.`, result: `The ${meal} is waiting on the coffee table. Sit on the couch before eating it.` }];
    return [{ value: `eat-${mealKey}-at-table`, label: `Eat the ${meal} while sitting on the couch`, description: `Eat the ${meal} from the coffee table while sitting on the couch.`, result: `The ${meal} is eaten. The empty ${dish} remains on the coffee table.`, nextItem: `coffee-empty-${dish}`, soundAction: preparedMeals[mealKey].sound }];
  }
  if (item.startsWith("held-") && kitchenware.has(item.slice(5))) {
    const dish = item.slice(5);
    return [{ value: `place-${dish}-on-table`, label: `Put the ${labelForItem(dish)} on the coffee table`, description: `Set the ${labelForItem(dish)} down carefully.`, result: `The ${labelForItem(dish)} is now on the coffee table.`, nextItem: `table-${dish}`, soundAction: "set-dish-down" }];
  }
  if (item.startsWith("table-")) {
    const dish = item.slice(6);
    return [{ value: `pick-up-${dish}-from-table`, label: `Pick up the ${labelForItem(dish)}`, description: `Pick up the ${labelForItem(dish)} from the coffee table.`, result: `The ${labelForItem(dish)} is being carried.`, nextItem: `held-${dish}`, soundAction: "pick-up-glass" }];
  }
  if (item.startsWith("coffee-empty-")) {
    const dish = item.slice(13);
    return [{ value: `pick-up-empty-${dish}-from-table`, label: `Pick up the empty ${dish}`, description: `Pick up the empty ${dish} to carry it to the kitchen sink.`, result: `The empty ${dish} is being carried to the sink.`, nextItem: `held-empty-${dish}`, soundAction: "pick-up-glass" }];
  }
  return [{ value: "table-unavailable", label: "Nothing to use here right now", description: "Carry a meal, drink, dish, or book to the coffee table first.", result: "Nothing has been brought to the coffee table yet." }];
}

function surfaceActionsFor(item: string, seated: boolean, surface: "coffee table" | "dining table"): Action[] {
  const raw = item.startsWith("held-") ? item.slice(5) : item;
  const seat = surface === "coffee table" ? "couch" : "dining chair";
  if (raw.startsWith("plated:") && preparedMeals[raw.slice("plated:".length)]) {
    const mealKey = raw.slice("plated:".length);
    const meal = labelForItem(raw);
    const dish = preparedMeals[mealKey].dish;
    if (!seated) return [{ value: "sit-before-eating", label: "Sit at the " + surface + " before eating", description: "Sit on the " + seat + " before eating the " + meal + ".", result: "The " + meal + " is waiting on the " + surface + ". Sit down before eating it." }];
    return [{ value: "eat-surface-" + mealKey, label: "Eat the " + meal, description: "Eat the " + meal + " while sitting at the " + surface + ".", result: "The " + meal + " is eaten. The empty " + dish + " remains on the " + surface + ".", nextItem: "empty-" + dish, soundAction: preparedMeals[mealKey].sound }];
  }
  if (raw.startsWith("glass-")) {
    const drink = raw.slice(6);
    return [{ value: "drink-surface-" + drink, label: "Drink the " + labelForItem(raw), description: "Drink it while sitting at the " + surface + ".", result: "The drink is finished. The empty glass remains on the " + surface + ".", nextItem: "empty-glass", soundAction: "drink-" + drink }];
  }
  if (raw.startsWith("mug-coffee-")) return [{ value: "drink-surface-coffee", label: "Drink the " + labelForItem(raw), description: "Drink the coffee at the " + surface + ".", result: "The coffee is finished. The empty mug remains on the " + surface + ".", nextItem: "empty-mug", soundAction: "drink-coffee" }];
  if (raw.startsWith("empty-") || kitchenware.has(raw)) return [{ value: "pick-up-surface-" + raw, label: "Pick up the " + labelForItem(raw), description: "Pick up the item to carry it.", result: "The " + labelForItem(raw) + " is now being carried.", nextItem: "held-" + raw, soundAction: "pick-up-glass" }];
  return [{ value: "inspect-surface-item", label: "Check the " + labelForItem(raw), description: "Check this item on the " + surface + ".", result: "The " + labelForItem(raw) + " is on the " + surface + "." }];
}

function counterActionsFor(item: string | null, allCounterItems: string[] = []): Action[] {
  if (!item) return [{
    value: "check-empty-counter",
    label: "Check the counter",
    description: "Check whether anything has been placed on the kitchen counter.",
    result: "The kitchen counter is clear. Get an item from the refrigerator first.",
  }];

  const storage = storageForItem(item);
  const returnItem: Action = {
    value: "return-item",
    label: `Put ${itemLabels[item] || item} back in the ${storage.label}`,
    description: `Carry the ${itemLabels[item] || item} from the counter and return it to the ${storage.label}.`,
    result: `The ${itemLabels[item] || item} is back in the ${storage.label}.`,
    nextItem: null,
    soundAction: storage.sound,
  };

  const beverages: Record<string, { glass: string; empty: string; pour: string; drink: string }> = {
    milk: { glass: "glass-milk", empty: "empty-milk-carton", pour: "Pour a glass of milk", drink: "Drink the milk" },
    water: { glass: "glass-water", empty: "empty-water-bottle", pour: "Pour the bottled water into a glass", drink: "Drink the bottled water" },
    juice: { glass: "glass-juice", empty: "empty-juice-carton", pour: "Pour a glass of orange juice", drink: "Drink the orange juice" },
    soda: { glass: "glass-soda", empty: "empty-soda-can", pour: "Pour the soda over ice", drink: "Drink the soda" },
  };
  if (beverages[item]) {
    const beverage = beverages[item];
    return [
      { value: `pour-${item}`, label: beverage.pour, description: beverage.pour, result: `${beverage.pour}. The glass remains on the counter.`, nextItem: beverage.glass, soundAction: `pour-${item}` },
      { value: `drink-${item}`, label: beverage.drink, description: beverage.drink, result: `${beverage.drink}. The empty container remains on the counter.`, nextItem: beverage.empty, soundAction: `drink-${item}` },
      returnItem,
    ];
  }

  if (item.startsWith("glass-")) {
    const drink = item.replace("glass-", "");
    const label = drink === "juice" ? "orange juice" : drink;
    return [
      { value: `drink-${drink}`, label: `Drink the glass of ${label}`, description: `Drink the ${label}.`, result: `The ${label} is finished. The empty glass remains on the counter.`, nextItem: "empty-glass", soundAction: `drink-${drink}` },
      { value: `carry-glass-${drink}`, label: `Carry the glass of ${label} to the coffee table`, description: `Pick up the glass and carry it carefully into the living room.`, result: `The glass of ${label} is being carried to the coffee table.`, nextItem: `held-glass-${drink}`, soundAction: "set-dish-down" },
      { value: "set-glass-by-sink", label: "Put the glass by the sink", description: "Leave the glass beside the sink for later.", result: "The glass is now beside the kitchen sink.", nextItem: null, soundAction: "set-dish-down" },
    ];
  }

  if (item === "empty-glass") return [{
    value: "pick-up-empty-glass",
    label: "Pick up the empty glass",
    description: "Pick up the empty glass so it can be carried to the sink.",
    result: "The empty glass is now being carried to the sink.",
    nextItem: "held-empty-glass",
    soundAction: "pick-up-glass",
  }];

  if (item === "held-empty-glass") return [{
    value: "put-glass-back-on-counter",
    label: "Put the empty glass back on the counter",
    description: "Set the empty glass back on the kitchen counter.",
    result: "The empty glass is back on the counter.",
    nextItem: "empty-glass",
    soundAction: "set-dish-down",
  }];

  if (["empty-mug", "empty-plate", "empty-bowl"].includes(item)) return [{
    value: "pick-up-empty-dish",
    label: `Pick up the ${itemLabels[item]}`,
    description: `Pick up the ${itemLabels[item]} so it can be carried to the sink.`,
    result: `The ${itemLabels[item]} is now being carried to the sink.`,
    nextItem: `held-${item}`,
    soundAction: "pick-up-glass",
  }];

  if (["held-empty-mug", "held-empty-plate", "held-empty-bowl"].includes(item)) return [{
    value: "put-empty-dish-back-on-counter",
    label: `Put the ${itemLabels[item].replace(" being carried", "")} back on the counter`,
    description: "Set the empty dish back on the kitchen counter.",
    result: "The empty dish is back on the counter.",
    nextItem: item.replace("held-", ""),
    soundAction: "set-dish-down",
  }];

  if (["empty-milk-carton", "empty-water-bottle", "empty-juice-carton", "empty-soda-can"].includes(item)) return [{
    value: "pick-up-empty-container",
    label: `Pick up the ${itemLabels[item]}`,
    description: `Pick up the ${itemLabels[item]} so it can be carried to a bin.`,
    result: `The ${itemLabels[item]} is now being carried.`,
    nextItem: `held-${item}`,
  }];

  if (["held-empty-milk-carton", "held-empty-water-bottle", "held-empty-juice-carton", "held-empty-soda-can"].includes(item)) return [{
    value: "put-container-back-on-counter",
    label: `Put the ${itemLabels[item].replace(" being carried", "")} back on the counter`,
    description: "Set the empty container back on the kitchen counter.",
    result: "The empty container is back on the counter.",
    nextItem: item.replace("held-", ""),
    soundAction: "set-dish-down",
  }];

  if (preparedMeals[item]) {
    const dish = preparedMeals[item].dish;
    return allCounterItems.includes(dish) ? [returnItem] : [{
      value: "need-counter-serving-dish",
      label: "Get a clean " + labelForItem(dish) + " to plate the " + labelForItem(item),
      description: "Take the serving dish from the dish cabinet and place it on the counter.",
      result: "The " + labelForItem(item) + " still needs a clean " + labelForItem(dish) + " before it can be served.",
    }, returnItem];
  }

  if (item.startsWith("plated:") && preparedMeals[item.slice("plated:".length)]) {
    const mealKey = item.slice("plated:".length);
    const meal = labelForItem(item);
    const dish = preparedMeals[mealKey].dish;
    return [
      { value: `eat-${mealKey}`, label: `Eat the ${meal} at the kitchen counter`, description: `Sit at the counter and eat the ${meal}.`, result: `The ${meal} is eaten. The empty ${dish} remains on the counter.`, nextItem: `empty-${dish}`, soundAction: preparedMeals[mealKey].sound },
      { value: `carry-coffee-${item}`, label: `Take the ${meal} to the coffee table`, description: `Pick up the ${meal} and carry it into the living room.`, result: `The ${meal} is being carried. Go to the coffee table and put it down.`, nextItem: `held-${item}`, soundAction: "set-dish-down" },
      { value: `carry-dining-${item}`, label: `Take the ${meal} to the dining table`, description: `Pick up the ${meal} and carry it to the dining table.`, result: `The ${meal} is being carried. Go to the dining table and put it down.`, nextItem: `held-${item}`, soundAction: "set-dish-down" },
    ];
  }

  if (item.startsWith("mug-coffee-")) {
    const coffee = itemLabels[item];
    return [
      { value: "drink-coffee-counter", label: `Drink the ${coffee} at the kitchen counter`, description: `Drink the ${coffee}.`, result: `The coffee is finished. The empty mug remains on the counter.`, nextItem: "empty-mug", soundAction: "drink-coffee" },
      { value: "carry-coffee", label: `Carry the ${coffee} to the coffee table`, description: "Carry the mug carefully into the living room.", result: `The ${coffee} is being carried to the coffee table.`, nextItem: `held-${item}`, soundAction: "set-dish-down" },
    ];
  }

  if (kitchenware.has(item)) return [
    { value: `carry-${item}`, label: `Carry the ${itemLabels[item]} to the coffee table`, description: `Take the ${itemLabels[item]} into the living room.`, result: `The ${itemLabels[item]} is being carried to the coffee table.`, nextItem: `held-${item}`, soundAction: "set-dish-down" },
    returnItem,
  ];

  const foodActions: Record<string, Action[]> = {
    yogurt: [{ value: "eat-yogurt", label: "Eat the yogurt as a snack", description: "Open the yogurt and eat it with a spoon.", result: "The yogurt is finished.", nextItem: null, soundAction: "eat-soft-food" }, returnItem],
    strawberries: [{ value: "eat-strawberries", label: "Wash and eat the strawberries", description: "Rinse the strawberries and eat them.", result: "The strawberries are washed and eaten.", nextItem: null, soundAction: "eat-fruit" }, returnItem],
    apples: [{ value: "eat-apple", label: "Wash and eat an apple", description: "Rinse an apple and eat it.", result: "The crisp apple is washed and eaten.", nextItem: null, soundAction: "eat-crunchy-food" }, returnItem],
    grapes: [{ value: "eat-grapes", label: "Wash and eat the grapes", description: "Rinse the grapes and eat them.", result: "The grapes are washed and eaten.", nextItem: null, soundAction: "eat-fruit" }, returnItem],
    blueberries: [{ value: "eat-blueberries", label: "Wash and eat the blueberries", description: "Rinse the blueberries and eat them.", result: "The blueberries are washed and eaten.", nextItem: null, soundAction: "eat-fruit" }, returnItem],
    carrots: [{ value: "eat-carrots", label: "Wash and eat the carrots", description: "Rinse the carrots and eat them as a snack.", result: "The carrots are washed and eaten.", nextItem: null, soundAction: "eat-crunchy-food" }, returnItem],
    cheese: [{ value: "eat-cheese", label: "Eat a slice of cheese", description: "Cut and eat a slice of cheese.", result: "A slice of cheese is eaten.", nextItem: null, soundAction: "eat-soft-food" }, returnItem],
  };
  return foodActions[item] || [...genericActions, returnItem];
}

const putEmptyGlassInSink: Action = {
  value: "put-empty-glass-in-sink",
  label: "Put the empty glass in the sink",
  description: "Carry the empty glass to the kitchen sink and place it inside.",
  result: "The empty glass is now in the kitchen sink.",
  nextItem: null,
  soundAction: "set-dish-down",
};

function binActionsFor(item: string | null): Action[] {
  const disposableContainers = ["held-empty-milk-carton", "held-empty-water-bottle", "held-empty-juice-carton", "held-empty-soda-can"];
  if (!item || !disposableContainers.includes(item)) return [{
    value: "check-bins",
    label: "Check the bins",
    description: "Check the kitchen garbage and recycling bins.",
    result: "The garbage and recycling bins have room. Pick up an empty container from the counter before using them.",
  }];
  const container = itemLabels[item].replace(" being carried", "");
  return [
    { value: "recycle-container", label: `Put the ${container} in recycling`, description: `Place the ${container} in the recycling bin.`, result: `The ${container} is now in the recycling bin.`, nextItem: null },
    { value: "throw-away-container", label: `Put the ${container} in the garbage`, description: `Place the ${container} in the garbage bin.`, result: `The ${container} is now in the garbage bin.`, nextItem: null },
  ];
}

export default function Home() {
  const [screen, setScreen] = useState<"menu" | "create" | "house" | "home">("menu");
  const [character, setCharacter] = useState<Character>(defaults);
  const [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [houseChoice, setHouseChoice] = useState("bungalow");
  const [savedHouse, setSavedHouse] = useState("");
  const [room, setRoom] = useState<LocationKey>("entrance");
  const [movementAnnouncement, setMovementAnnouncement] = useState("");
  const [actionAnnouncement, setActionAnnouncement] = useState("");
  const [counterItems, setCounterItems] = useState<string[]>([]);
  const [prepCounterItems, setPrepCounterItems] = useState<string[]>([]);
  const [carriedItems, setCarriedItems] = useState<string[]>([]);
  const [coffeeTableItems, setCoffeeTableItems] = useState<string[]>([]);
  const [diningTableItems, setDiningTableItems] = useState<string[]>([]);
  const [dirtyDishes, setDirtyDishes] = useState<string[]>([]);
  const [cleanDishes, setCleanDishes] = useState<string[]>([]);
  const [indoorGarbage, setIndoorGarbage] = useState<string[]>([]);
  const [indoorRecycling, setIndoorRecycling] = useState<string[]>([]);
  const [carriedWaste, setCarriedWaste] = useState<CarriedWaste>(null);
  const [outsidePeriod, setOutsidePeriod] = useState<DayPeriod>(() => currentDayPeriod());
  const [fridgeSelections, setFridgeSelections] = useState<string[]>([]);
  const [inventorySelections, setInventorySelections] = useState<Partial<Record<InventoryMenuKey, string[]>>>({});
  const [counterSelections, setCounterSelections] = useState<number[]>([]);
  const [prepSelections, setPrepSelections] = useState<number[]>([]);
  const [dirtyDishSelections, setDirtyDishSelections] = useState<number[]>([]);
  const [cleanDishSelections, setCleanDishSelections] = useState<number[]>([]);
  const [fridgeMenuOpen, setFridgeMenuOpen] = useState(false);
  const [activeCookware, setActiveCookware] = useState<string | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<string | null>(null);
  const [cookingIngredients, setCookingIngredients] = useState<string[]>([]);
  const [cookingStage, setCookingStage] = useState(0);
  const [stoveOn, setStoveOn] = useState(false);
  const [finishedMeal, setFinishedMeal] = useState<string | null>(null);
  const [finishedRecipe, setFinishedRecipe] = useState<string | null>(null);
  const [assemblyRecipe, setAssemblyRecipe] = useState<string | null>(null);
  const [assemblyIngredients, setAssemblyIngredients] = useState<string[]>([]);
  const [seatedOnSofa, setSeatedOnSofa] = useState(false);
  const [seatedAtDiningTable, setSeatedAtDiningTable] = useState(false);
  const [makeup, setMakeup] = useState("No makeup is being worn");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [draftingNewGame, setDraftingNewGame] = useState(false);
  const [saveReady, setSaveReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading saved game…");
  const [householdFunds, setHouseholdFunds] = useState(10000);
  const [shoppingCart, setShoppingCart] = useState<CartItem[]>([]);
  const [groceryStoreSelections, setGroceryStoreSelections] = useState<string[]>([]);
  const [furnitureStoreSelections, setFurnitureStoreSelections] = useState<Record<string, string[]>>({});
  const [groceryBags, setGroceryBags] = useState<string[]>([]);
  const [ownedFurniture, setOwnedFurniture] = useState<OwnedFurniture[]>([]);
  const [furniturePlacements, setFurniturePlacements] = useState<Record<string, FurniturePlacement>>({});
  const audioRef = useRef<GameAudio | null>(null);
  const savedGameRef = useRef<any>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const counterItem = counterItems[0] || null;

  function setCounterItem(nextItem: string | null) {
    setCounterItems(current => nextItem === null ? current.slice(1) : [nextItem, ...current.slice(1)]);
  }

  function audio() {
    if (!audioRef.current) {
      audioRef.current = new GameAudio();
      audioRef.current.primeRecordings();
    }
    audioRef.current.setEnabled(soundEnabled);
    return audioRef.current;
  }

  function restoreSavedGame(data: any) {
    savedGameRef.current = data;
    setCharacter({ ...defaults, ...data.character }); setSavedName(data.name || ""); setName(data.name || "");
    setSavedHouse(data.house || ""); setHouseChoice(data.house || "bungalow");
    setMakeup(data.makeup || "No makeup is being worn");
    const household = data.household || {};
    setCounterItems(household.counterItems || []); setPrepCounterItems(household.prepCounterItems || []); setCarriedItems(household.carriedItems || []);
    setCoffeeTableItems(household.coffeeTableItems || []); setDiningTableItems(household.diningTableItems || []);
    setDirtyDishes(household.dirtyDishes || []); setCleanDishes(household.cleanDishes || []);
    setIndoorGarbage(household.indoorGarbage || []); setIndoorRecycling(household.indoorRecycling || []); setCarriedWaste(household.carriedWaste || null);
    setHouseholdFunds(typeof household.householdFunds === "number" ? household.householdFunds : 10000);
    setShoppingCart(household.shoppingCart || []); setGroceryBags(household.groceryBags || []);
    setOwnedFurniture((household.ownedFurniture || []).map((item: string | OwnedFurniture, index: number) => typeof item === "string"
      ? { id: `saved-furniture-${index}`, label: item, room: "living" as RoomKey, position: "center" }
      : { ...item, room: item.room || "living", position: item.position || "center" }));
    setFurniturePlacements(household.furniturePlacements || {});
    setActiveCookware(household.activeCookware || null); setCookingRecipe(household.cookingRecipe || null);
    setCookingIngredients(household.cookingIngredients || []); setCookingStage(household.cookingStage || 0);
    setStoveOn(Boolean(household.stoveOn)); setFinishedMeal(household.finishedMeal || null); setFinishedRecipe(household.finishedRecipe || null);
    setAssemblyRecipe(household.assemblyRecipe || null); setAssemblyIngredients(household.assemblyIngredients || []); setRoom(household.room || "entrance");
  }

  function savedGameData(house = savedHouse || houseChoice) {
    return {
      name: savedName, character, house, makeup,
      household: { room, counterItems, prepCounterItems, carriedItems, coffeeTableItems, diningTableItems, dirtyDishes, cleanDishes, indoorGarbage, indoorRecycling, carriedWaste, householdFunds, shoppingCart, groceryBags, ownedFurniture, furniturePlacements, activeCookware, cookingRecipe, cookingIngredients, cookingStage, stoveOn, finishedMeal, finishedRecipe, assemblyRecipe, assemblyIngredients },
    };
  }

  function queueAnnouncement(message: string) {
    setActionAnnouncement("");
    window.setTimeout(() => setActionAnnouncement(message), 160);
  }

  async function persistGame(data: any) {
    savedGameRef.current = data;
    localStorage.setItem("everyday-life-save", JSON.stringify(data));
    try {
      const response = await fetch("/api/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    const soundPreference = localStorage.getItem("everyday-life-sounds");
    if (soundPreference === "off") setSoundEnabled(false);
    void (async () => {
      let savedData: any = null;
      try {
        const response = await fetch("/api/save", { cache: "no-store" });
        if (response.ok) savedData = (await response.json()).save;
      } catch {}
      if (!savedData) {
        const localSave = localStorage.getItem("everyday-life-save");
        if (localSave) try { savedData = JSON.parse(localSave); } catch {}
      }
      if (cancelled) return;
      if (savedData) {
        restoreSavedGame(savedData);
        localStorage.setItem("everyday-life-save", JSON.stringify(savedData));
        setSaveStatus(`Saved game found for ${savedData.name}.`);
      } else setSaveStatus("No saved game yet.");
      setSaveReady(true);
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!saveReady || !savedName || draftingNewGame) return;
    const saveTimer = window.setTimeout(() => { void persistGame(savedGameData()); }, 500);
    return () => window.clearTimeout(saveTimer);
  }, [saveReady, savedName, savedHouse, houseChoice, character, makeup, room, counterItems, prepCounterItems, carriedItems, coffeeTableItems, diningTableItems, dirtyDishes, cleanDishes, indoorGarbage, indoorRecycling, carriedWaste, householdFunds, shoppingCart, groceryBags, ownedFurniture, furniturePlacements, activeCookware, cookingRecipe, cookingIngredients, cookingStage, stoveOn, finishedMeal, finishedRecipe, assemblyRecipe, assemblyIngredients, draftingNewGame]);
  useEffect(() => { if (!nameOpen) headingRef.current?.focus(); }, [screen, nameOpen]);

  function startNew() { setDraftingNewGame(true); setCharacter(defaults); setName(""); setSavedHouse(""); setHouseChoice("bungalow"); setCounterItems([]); setPrepCounterItems([]); setCarriedItems([]); setCoffeeTableItems([]); setDiningTableItems([]); setDirtyDishes([]); setCleanDishes([]); setIndoorGarbage([]); setIndoorRecycling([]); setCarriedWaste(null); setHouseholdFunds(10000); setShoppingCart([]); setGroceryBags([]); setOwnedFurniture([]); setFurniturePlacements({}); setActiveCookware(null); setCookingRecipe(null); setCookingIngredients([]); setCookingStage(0); setStoveOn(false); setFinishedMeal(null); setFinishedRecipe(null); setAssemblyRecipe(null); setAssemblyIngredients([]); setSeatedOnSofa(false); setSeatedAtDiningTable(false); setMakeup("No makeup is being worn"); setScreen("create"); }
  function continueGame() {
    const data = savedGameRef.current; if (!data) return;
    restoreSavedGame(data); setDraftingNewGame(false);
    if (data.house) {
      const savedRoom: LocationKey = data.household?.room || "entrance";
      const location = savedRoom === "entrance"
        ? layouts[data.house].entrance
        : savedRoom === "outside"
          ? `${outdoorAreas[data.house].description} ${outdoorSoundDescriptions[currentDayPeriod()]}`
          : savedRoom === "groceryStore"
            ? "You are inside the grocery store."
            : savedRoom === "furnitureStore"
              ? "You are inside the furniture store."
              : layouts[data.house].positions[savedRoom]?.location;
      setSavedHouse(data.house); setHouseChoice(data.house); setMovementAnnouncement(`Game loaded. ${location || layouts[data.house].entrance}`); setScreen("home");
    }
    else setScreen("house");
  }
  function saveName(event: FormEvent) {
    event.preventDefault(); const clean = name.trim(); if (!clean) return;
    setSavedName(clean); setNameOpen(false); setScreen("house");
  }
  function chooseHouse(event: FormEvent) {
    event.preventDefault(); setSavedHouse(houseChoice); setRoom("entrance"); setMovementAnnouncement(layouts[houseChoice].entrance);
    const data = savedGameData(houseChoice);
    data.household.room = "entrance";
    void persistGame(data); setDraftingNewGame(false);
    setScreen("home");
  }

  async function saveGame() {
    if (!savedName || !savedHouse) return;
    setSaveStatus("Saving game…");
    const saved = await persistGame(savedGameData(savedHouse));
    const message = saved
      ? `${savedName}: Game saved. Continue will restore this character, current room, inventory, cooking progress, and dishes.`
      : `${savedName}: Online saving is unavailable. A backup was saved on this device.`;
    setSaveStatus(message);
    queueAnnouncement(message);
  }

  function announceHousehold(kind: string, action: Action, alwaysNarrate = false, footsteps: false | "before" | "after" = false) {
    const narrate = () => queueAnnouncement(savedName + ": " + action.result);
    const played = audio().playActionSequence(kind, action.soundAction || action.value, alwaysNarrate ? undefined : narrate, footsteps);
    if (alwaysNarrate || !played) narrate();
  }

  function withoutIndex(items: string[], index: number) {
    return items.filter((_, itemIndex) => itemIndex !== index);
  }

  function rangeActions(): Action[] {
    if (!activeCookware) return [{
      value: "need-cookware",
      label: "Take out a pot or pan first",
      description: "Use the cookware cabinet before starting a recipe.",
      result: "Choose a pot, pan, or baking tray from the cookware cabinet first.",
    }];
    const putAway: Action = { value: "put-away-cookware", label: `Put away the ${labelForItem(activeCookware)}`, description: "Return the empty cookware to its cabinet.", result: `The ${labelForItem(activeCookware)} is back in the cookware cabinet.`, soundAction: "put-away-cookware" };
    if (finishedMeal) {
      const dish = preparedMeals[finishedMeal].dish;
      const prepDishIndex = prepCounterItems.findIndex(item => item === dish);
      const counterDishIndex = counterItems.findIndex(item => item === dish);
      const recipe = finishedRecipe ? recipes[finishedRecipe] : null;
      const cookedFood = recipe?.cookedLabel || labelForItem(finishedMeal);
      const dishSource = prepDishIndex >= 0 ? "prep" : counterDishIndex >= 0 ? "counter" : null;
      const dishIndex = prepDishIndex >= 0 ? prepDishIndex : counterDishIndex;
      const plateActions: Action[] = dishSource ? [{
        value: `plate-finished:${dishSource}:${dishIndex}`,
        label: "Put the " + cookedFood + " on the " + labelForItem(dish) + " at the range-side prep counter",
        description: "Move the cooked food out of the cookware and onto the clean serving dish beside the range.",
        result: "The " + cookedFood + " is on the " + labelForItem(dish) + " at the range-side prep counter.",
        soundAction: "serve-bowl",
      }] : [{
        value: "need-serving-dish",
        label: "Get a clean " + labelForItem(dish) + " for the cooked food",
        description: "The range can use a clean serving dish from either kitchen counter.",
        result: "The " + cookedFood + " is still in the " + labelForItem(activeCookware) + ". Get a clean " + labelForItem(dish) + " and place it on the kitchen counter or range-side prep counter.",
      }];
      return stoveOn ? [{
        value: "turn-off-range",
        label: "Turn off the range",
        description: "Turn off the burner now that cooking is finished.",
        result: "The range turns off. The finished meal remains safely in the cookware.",
        soundAction: "stove-off",
      }] : plateActions;
    }
    if (cookingStage === -1) return cookingIngredients.length ? cookingIngredients.map((ingredient, index) => {
      const storage = storageForItem(ingredient);
      return {
        value: "range-return:" + index + ":" + ingredient,
        label: "Return " + labelForItem(ingredient) + " to the counter",
        description: "Carry the ingredient out of the " + labelForItem(activeCookware) + " and place it back on the counter before storing it.",
        result: "The " + labelForItem(ingredient) + " is back on the counter. It can now be returned to the " + storage.label + ".",
        soundAction: "set-dish-down",
      };
    }) : [{
      value: "clear-stopped-recipe",
      label: "Finish clearing the cookware",
      description: "Confirm that every ingredient has been removed.",
      result: "The cookware is empty and ready to be put away.",
      soundAction: "set-dish-down",
    }];
    const recipeAllows = (ingredient: string) => !cookingRecipe || [...recipes[cookingRecipe].required, ...recipes[cookingRecipe].optional].includes(ingredient);
    const loadable = counterItems.flatMap((ingredient, index) => cookableItems.has(ingredient) && recipeAllows(ingredient) ? [{
      value: "range-load:" + index + ":" + ingredient,
      label: "Put " + labelForItem(ingredient) + " in the " + labelForItem(activeCookware),
      description: "Move this food from the counter into the cookware.",
      result: "The " + labelForItem(ingredient) + " is now in the " + labelForItem(activeCookware) + ".",
      soundAction: "add-ingredient",
    }] : []);
    const prepLoadable = prepCounterItems.flatMap((ingredient, index) => cookableItems.has(ingredient) && recipeAllows(ingredient) ? [{
      value: "range-load-prep:" + index + ":" + ingredient,
      label: "Put " + labelForItem(ingredient) + " in the " + labelForItem(activeCookware) + " from the range-side prep counter",
      description: "Move this food from the prep counter into the cookware.",
      result: "The " + labelForItem(ingredient) + " is now in the " + labelForItem(activeCookware) + ".",
      soundAction: "add-ingredient",
    }] : []);
    const stageDishes = counterItems.flatMap((dish, index) => ["plate", "bowl"].includes(dish) ? [{
      value: "stage-dish:" + index + ":" + dish,
      label: "Move the " + labelForItem(dish) + " to the range-side prep counter",
      description: "Place this clean serving dish beside the range so it is ready for cooked food.",
      result: "The " + labelForItem(dish) + " is ready on the range-side prep counter.",
      soundAction: "set-dish-down",
    }] : []);
    const allLoadable = [...stageDishes, ...loadable, ...prepLoadable];
    if (!cookingRecipe) {
      if (!cookingIngredients.length) return allLoadable.length ? [...allLoadable, putAway] : [{
        value: "need-food-in-cookware",
        label: "Put a food item in the cookware first",
        description: "Choose a food item on the counter and move it into the cookware.",
        result: "The " + labelForItem(activeCookware) + " is empty. Put any food item from the counter into it first.",
      }, putAway];
      const recipeChoices = Object.entries(recipes).filter(([, recipe]) => cookingIngredients.some(item => [...recipe.required, ...recipe.optional].includes(item))).map(([recipeKey, recipe]) => {
        const missing = recipe.required.filter(item => !cookingIngredients.includes(item));
        const assemblyNote = recipe.assemblyRequired?.length ? " After cooking, assemble it at the range-side prep counter with " + recipe.assemblyRequired.map(labelForItem).join(", ") + "." : "";
        return {
          value: "choose-recipe:" + recipeKey,
          label: "Cook " + recipe.name,
          description: "Choose this meal, then gather every required ingredient.",
          result: recipe.name + " selected. " + (missing.length ? "Still needed for cooking: " + missing.map(labelForItem).join(", ") + "." : "All cooking ingredients are ready.") + assemblyNote,
          soundAction: "select-recipe",
        };
      });
      return [...allLoadable, ...recipeChoices, {
        value: "return-loaded-food",
        label: "Return food from the cookware",
        description: "Turn off the range and return loaded food to the counter.",
        result: "The range is off. Return each ingredient to the counter.",
        soundAction: "stop-cooking",
      }];
    }
    const recipe = recipes[cookingRecipe];
    const missing = recipe.required.filter(item => !cookingIngredients.includes(item));
    const missingActions: Action[] = missing.map(item => ({
      value: "missing:" + item,
      label: "Still needed: " + labelForItem(item),
      description: "Get this ingredient from its storage location and place it on the counter.",
      result: "To cook " + recipe.name + ", get " + labelForItem(item) + " from the " + storageForItem(item).label + ", put it on the counter, then add it to the " + labelForItem(activeCookware) + ".",
    }));
    return missing.length ? [...allLoadable, ...missingActions, {
      value: "cancel-cooking",
      label: "Cancel this meal and return the ingredients",
      description: "Turn off the range without losing anything already loaded.",
      result: "The range is off. Return each ingredient to the counter.",
      soundAction: "stop-cooking",
    }] : [...allLoadable, ...stoveActionsFor(cookingRecipe, cookingIngredients, cookingStage, stoveOn)];
  }

  function counterCookingActions(index: number, ingredient: string): Action[] {
    const recipeAllows = !cookingRecipe || [...recipes[cookingRecipe].required, ...recipes[cookingRecipe].optional].includes(ingredient);
    if (!activeCookware || cookingStage === -1 || finishedMeal || !cookableItems.has(ingredient) || !recipeAllows) return [];
    return [{
      value: "range-load:" + index + ":" + ingredient,
      label: "Put " + labelForItem(ingredient) + " in the " + labelForItem(activeCookware) + " on the range",
      description: "Move this food into the cookware. Choose the meal afterward from the range menu.",
      result: "The " + labelForItem(ingredient) + " is now in the " + labelForItem(activeCookware) + " on the range.",
      soundAction: "add-ingredient",
    }];
  }

  function prepCookingActions(index: number, ingredient: string): Action[] {
    const recipeAllows = !cookingRecipe || [...recipes[cookingRecipe].required, ...recipes[cookingRecipe].optional].includes(ingredient);
    if (!activeCookware || cookingStage === -1 || finishedMeal || !cookableItems.has(ingredient) || !recipeAllows) return [];
    return [{
      value: "range-load-prep:" + index + ":" + ingredient,
      label: "Put " + labelForItem(ingredient) + " in the " + labelForItem(activeCookware) + " on the range",
      description: "Move this food from the prep counter into the cookware.",
      result: "The " + labelForItem(ingredient) + " is now in the " + labelForItem(activeCookware) + " on the range.",
      soundAction: "add-ingredient",
    }];
  }

  function moveCounterItemToPrep(index: number) {
    const item = counterItems[index];
    setCounterItems(current => withoutIndex(current, index));
    setPrepCounterItems(current => [...current, item]);
    announceHousehold("counter", {
      value: "move-to-prep-counter",
      label: "Move " + labelForItem(item) + " to the range-side prep counter",
      description: "Set this item beside the range for cooking or assembly.",
      result: "The " + labelForItem(item) + " is now on the range-side prep counter.",
      soundAction: "set-dish-down",
    });
  }

  function movePrepItemToCounter(index: number) {
    const item = prepCounterItems[index];
    setPrepCounterItems(current => withoutIndex(current, index));
    setCounterItems(current => [...current, item]);
    announceHousehold("counter", {
      value: "move-from-prep-counter",
      label: "Move " + labelForItem(item) + " to the kitchen counter",
      description: "Move this item away from the range-side work area.",
      result: "The " + labelForItem(item) + " is now on the kitchen counter.",
      soundAction: "set-dish-down",
    });
  }

  function startSandwichAssembly(plateIndex: number, breadIndex: number) {
    setPrepCounterItems(current => [...current.filter((_, index) => index !== plateIndex && index !== breadIndex), "assembly-base:sandwich"]);
    setAssemblyRecipe("sandwich");
    setAssemblyIngredients(["bread"]);
    announceHousehold("counter", {
      value: "start-sandwich-assembly",
      label: "Put the bread on the plate",
      description: "Begin building a deli sandwich on a clean plate.",
      result: "The bread is on the plate at the range-side prep counter. Add deli turkey next.",
      soundAction: "set-dish-down",
    }, true);
  }

  function addAssemblyIngredient(index: number, ingredient: string) {
    if (!assemblyRecipe) return;
    const plan = assemblyPlans[assemblyRecipe];
    setPrepCounterItems(current => withoutIndex(current, index));
    setAssemblyIngredients(current => [...current, ingredient]);
    announceHousehold("counter", {
      value: "add-assembly-ingredient",
      label: "Add " + labelForItem(ingredient),
      description: "Add this ingredient to the meal being assembled.",
      result: "The " + labelForItem(ingredient) + " has been added to the " + plan.name + ".",
      soundAction: "add-ingredient",
    }, true);
  }

  function finishAssembly() {
    if (!assemblyRecipe) return;
    const plan = assemblyPlans[assemblyRecipe];
    const base = `assembly-base:${assemblyRecipe}`;
    setPrepCounterItems(current => [...current.filter(item => item !== base), `plated:${plan.meal}`]);
    setAssemblyRecipe(null);
    setAssemblyIngredients([]);
    announceHousehold("counter", {
      value: "finish-assembly",
      label: "Finish assembling " + plan.name,
      description: "Complete the meal on its plate.",
      result: "The " + plan.name + " is fully assembled on a plate at the range-side prep counter.",
      soundAction: "serve-bowl",
    }, true);
  }

  function executePrepItemAction(index: number, action: Action) {
    if (action.nextItem === null) setPrepCounterItems(current => withoutIndex(current, index));
    else if (action.nextItem?.startsWith("held-")) {
      setPrepCounterItems(current => withoutIndex(current, index));
      setCarriedItems(current => [...current, action.nextItem!]);
    } else if (action.nextItem !== undefined) {
      setPrepCounterItems(current => current.map((value, itemIndex) => itemIndex === index ? action.nextItem! : value));
    }
    announceHousehold("counter", action);
  }

  function executeCounterAction(index: number, action: Action) {
    if (action.nextItem === null) setCounterItems(current => withoutIndex(current, index));
    else if (action.nextItem?.startsWith("held-")) {
      setCounterItems(current => withoutIndex(current, index));
      setCarriedItems(current => [...current, action.nextItem!]);
    } else if (action.nextItem !== undefined) {
      setCounterItems(current => current.map((value, itemIndex) => itemIndex === index ? action.nextItem! : value));
    }
    announceHousehold("counter", action, false, action.value === "return-item" ? "before" : false);
  }

  function plateCounterMeal(mealIndex: number, dishIndex: number) {
    const meal = counterItems[mealIndex];
    const dish = counterItems[dishIndex];
    setCounterItems(current => current.flatMap((value, index) => index === dishIndex ? [] : [index === mealIndex ? "plated:" + meal : value]));
    announceHousehold("counter", {
      value: "plate-counter-meal",
      label: "Plate " + labelForItem(meal),
      description: "Use the clean serving dish already on the counter.",
      result: "The " + labelForItem(meal) + " is now served on the " + labelForItem(dish) + " on the kitchen counter.",
      soundAction: "serve-bowl",
    });
  }

  function executeRangeAction(action: Action) {
    if (action.value.startsWith("range-load-prep:")) {
      const [, indexText, ingredient] = action.value.replace("range-load-prep:", "prep:").split(":");
      setPrepCounterItems(current => withoutIndex(current, Number(indexText)));
      setCookingIngredients(current => [...current, ingredient]);
    } else if (action.value.startsWith("range-load:")) {
      const [, indexText, ingredient] = action.value.split(":");
      setCounterItems(current => withoutIndex(current, Number(indexText)));
      setCookingIngredients(current => [...current, ingredient]);
    } else if (action.value.startsWith("choose-recipe:")) {
      setCookingRecipe(action.value.slice("choose-recipe:".length));
      setCookingStage(0);
    } else if (action.value.startsWith("range-return:")) {
      const [, indexText, ingredient] = action.value.split(":");
      const remainingIngredients = withoutIndex(cookingIngredients, Number(indexText));
      setCounterItems(current => [...current, ingredient]);
      setCookingIngredients(remainingIngredients);
      if (remainingIngredients.length === 0) {
        setCookingRecipe(null);
        setCookingStage(0);
      }
    } else if (action.value.startsWith("stage-dish:")) {
      const [, indexText, dish] = action.value.split(":");
      setCounterItems(current => withoutIndex(current, Number(indexText)));
      setPrepCounterItems(current => [...current, dish]);
    } else if (action.value === "turn-on-range") setStoveOn(true);
    else if (action.value === "turn-off-range") setStoveOn(false);
    else if (action.value === "cooking-step-heat") setCookingStage(1);
    else if (action.value === "cooking-step-cook") setCookingStage(2);
    else if (action.value === "finish-cooking") {
      if (action.nextItem) setFinishedMeal(action.nextItem);
      setFinishedRecipe(cookingRecipe);
      setCookingRecipe(null); setCookingIngredients([]); setCookingStage(0);
    } else if (action.value === "cancel-cooking" || action.value === "return-loaded-food") {
      setCookingStage(-1);
      setCookingRecipe(null);
    } else if (action.value.startsWith("plate-finished:")) {
      const [, source, indexText] = action.value.split(":");
      const dishIndex = Number(indexText);
      if (finishedMeal) {
        if (source === "prep") setPrepCounterItems(current => withoutIndex(current, dishIndex));
        else setCounterItems(current => withoutIndex(current, dishIndex));
        if (finishedRecipe && assemblyPlans[finishedRecipe]) {
          setPrepCounterItems(current => [...current, `assembly-base:${finishedRecipe}`]);
          setAssemblyRecipe(finishedRecipe);
          setAssemblyIngredients([]);
        } else setPrepCounterItems(current => [...current, "plated:" + finishedMeal]);
        setFinishedMeal(null);
        setFinishedRecipe(null);
      }
    } else if (action.value === "clear-stopped-recipe") {
      setCookingRecipe(null); setCookingIngredients([]); setCookingStage(0);
    } else if (action.value === "put-away-cookware") { setActiveCookware(null); setStoveOn(false); }
    const movingItem = action.value.startsWith("range-load:") || action.value.startsWith("range-load-prep:") || action.value.startsWith("range-return:") || action.value.startsWith("stage-dish:") || action.value.startsWith("plate-finished:") || action.value === "put-away-cookware";
    const needsExplanation = action.value.startsWith("choose-recipe:") || action.value.startsWith("missing:") || action.value.startsWith("need-");
    announceHousehold("stove", action, needsExplanation, movingItem ? "before" : false);
  }

  function executeSurfaceAction(surface: "coffee" | "dining", index: number, action: Action) {
    const update = surface === "coffee" ? setCoffeeTableItems : setDiningTableItems;
    if (action.nextItem?.startsWith("held-")) {
      update(current => withoutIndex(current, index));
      setCarriedItems(current => [...current, action.nextItem!]);
    } else if (action.nextItem !== undefined) {
      update(current => current.map((value, itemIndex) => itemIndex === index ? action.nextItem! : value));
    }
    announceHousehold(surface === "coffee" ? "coffeeTable" : "diningTable", action);
  }

  function placeCarriedItem(surface: "coffee" | "dining", index: number) {
    const item = carriedItems[index];
    const raw = item.startsWith("held-") ? item.slice(5) : item;
    setCarriedItems(current => withoutIndex(current, index));
    if (surface === "coffee") setCoffeeTableItems(current => [...current, raw]);
    else setDiningTableItems(current => [...current, raw]);
    announceHousehold(surface === "coffee" ? "coffeeTable" : "diningTable", {
      value: "place-carried-item",
      label: "Put down " + labelForItem(raw),
      description: "Place the carried item on the table.",
      result: "The " + labelForItem(raw) + " is now on the " + (surface === "coffee" ? "coffee table." : "dining table."),
      soundAction: "set-dish-down",
    });
  }

  function dishType(item: string) {
    const raw = item.replace(/^held-/, "").replace(/^clean-/, "").replace(/^empty-/, "");
    if (raw === "glass") return "drinking-glass";
    if (raw === "mug") return "coffee-mug";
    return raw;
  }

  function putCarriedDishInSink(index: number) {
    const item = carriedItems[index];
    const dish = dishType(item);
    setCarriedItems(current => withoutIndex(current, index));
    setDirtyDishes(current => [...current, dish]);
    announceHousehold("kitchenSink", {
      value: "put-dish-in-sink",
      label: "Put dish in sink",
      description: "Place the dirty dish in the kitchen sink.",
      result: "The dirty " + labelForItem(dish) + " is now in the sink.",
      soundAction: "set-dish-down",
    });
  }

  function washDish(index: number) {
    const dish = dirtyDishes[index];
    setDirtyDishes(current => withoutIndex(current, index));
    setCleanDishes(current => [...current, dish]);
    announceHousehold("kitchenSink", {
      value: "wash-one-dish",
      label: "Wash " + labelForItem(dish),
      description: "Wash and dry this dish.",
      result: "The " + labelForItem(dish) + " is clean and remains in the sink drying area, ready to be picked up.",
      soundAction: "wash",
    });
  }

  function pickUpCleanDish(index: number) {
    const dish = cleanDishes[index];
    setCleanDishes(current => withoutIndex(current, index));
    setCarriedItems(current => [...current, `held-clean-${dish}`]);
    announceHousehold("kitchenSink", {
      value: "pick-up-clean-dish",
      label: "Pick up clean " + labelForItem(dish),
      description: "Pick up the clean dish from the sink drying area.",
      result: "The clean " + labelForItem(dish) + " has been picked up and is being carried.",
      soundAction: "pick-up-glass",
    }, true);
  }

  function putCarriedCleanDishAway(index: number) {
    const carried = carriedItems[index];
    const dish = dishType(carried);
    const storage = storageForItem(dish);
    setCarriedItems(current => withoutIndex(current, index));
    announceHousehold(storage.label === "cookware cabinet" ? "cookwareCabinet" : storage.label === "silverware drawer" ? "silverwareDrawer" : "dishCabinet", {
      value: "put-clean-dish-away",
      label: "Put away " + labelForItem(dish),
      description: "Return the clean dish to its proper shelf.",
      result: "The clean " + labelForItem(dish) + " has been put back in the " + storage.label + ".",
    }, false, "before");
  }

  function setFridgeItemSelected(itemId: string, selected: boolean) {
    setFridgeSelections(current => selected
      ? (current.includes(itemId) ? current : [...current, itemId])
      : current.filter(value => value !== itemId));
  }

  function takeSelectedFridgeItems() {
    if (!fridgeSelections.length) return;
    const selectedItems = [...fridgeSelections];
    const selectedLabels = selectedItems.map(labelForItem);
    setCounterItems(current => [...current, ...selectedItems]);
    setFridgeSelections([]);
    setFridgeMenuOpen(false);
    announceHousehold("fridge", {
      value: "get-selected-items",
      label: "Get selected items",
      description: "Take all selected items from the refrigerator and freezer in one trip.",
      result: `${readableList(selectedLabels)} ${selectedItems.length === 1 ? "is" : "are"} now on the kitchen counter.`,
      soundAction: "get-selected-items",
    }, true, "after");
  }

  function inventoryForMenu(kind: InventoryMenuKey) {
    if (kind === "dishCabinet") return dishCabinetInventory;
    if (kind === "pantry") return pantryInventory;
    if (kind === "silverwareDrawer") return silverwareInventory;
    if (kind === "cookwareCabinet") return cookwareInventory;
    return actions.bookshelf.map(action => ({ id: action.nextItem!, label: action.label.replace(/^Take /, "") }));
  }

  function toggleInventorySelection(kind: InventoryMenuKey, itemId: string, selected: boolean) {
    setInventorySelections(current => {
      const selectedItems = current[kind] || [];
      return { ...current, [kind]: selected ? [...new Set([...selectedItems, itemId])] : selectedItems.filter(value => value !== itemId) };
    });
  }

  function takeSelectedInventoryItems(kind: InventoryMenuKey) {
    const selected = inventorySelections[kind] || [];
    if (!selected.length) return;
    if (kind === "bookshelf") setCarriedItems(current => [...current, ...selected]);
    else if (kind === "cookwareCabinet") {
      const [first, ...rest] = selected;
      if (!activeCookware) setActiveCookware(first);
      else rest.unshift(first);
      if (rest.length) setPrepCounterItems(current => [...current, ...rest]);
    } else setCounterItems(current => [...current, ...selected]);
    setInventorySelections(current => ({ ...current, [kind]: [] }));
    const labels = selected.map(labelForItem);
    announceHousehold(kind, {
      value: "get-selected-items",
      label: "Get selected items",
      description: "Take all selected items in one trip.",
      result: `${readableList(labels)} ${selected.length === 1 ? "has" : "have"} been taken out.`,
      soundAction: "return-cabinet",
    }, true, "after");
  }

  function toggleSurfaceSelection(surface: "counter" | "prep", index: number, selected: boolean) {
    const update = surface === "counter" ? setCounterSelections : setPrepSelections;
    update(current => selected ? [...new Set([...current, index])] : current.filter(value => value !== index));
  }

  function manageSelectedSurfaceItems(surface: "counter" | "prep", operation: "return" | "garbage" | "wash") {
    const items = surface === "counter" ? counterItems : prepCounterItems;
    const selectedIndexes = surface === "counter" ? counterSelections : prepSelections;
    const selectedItems = selectedIndexes.map(index => items[index]).filter(Boolean);
    if (!selectedItems.length) return;
    const selectedSet = new Set(selectedIndexes);
    const keepItems = items.filter((_, index) => !selectedSet.has(index));
    if (operation === "wash") {
      const dishes: string[] = [];
      const washedFood: string[] = [];
      selectedItems.forEach(item => {
        const raw = item.replace(/^held-/, "").replace(/^empty-/, "");
        if (item.startsWith("plated:")) dishes.push(preparedMeals[item.slice(7)]?.dish || "plate");
        else if (item.startsWith("glass-") || item.startsWith("mug-coffee-")) dishes.push(item.startsWith("glass-") ? "drinking-glass" : "coffee-mug");
        else if (item === "empty-glass") dishes.push("drinking-glass");
        else if (item === "empty-mug") dishes.push("coffee-mug");
        else if (kitchenware.has(raw) || cookwareInventory.some(entry => entry.id === raw)) dishes.push(raw);
        else washedFood.push(item);
      });
      const nextItems = [...keepItems, ...washedFood];
      if (surface === "counter") setCounterItems(nextItems); else setPrepCounterItems(nextItems);
      setCleanDishes(current => [...current, ...dishes]);
      announceHousehold("kitchenSink", { value: "wash-selected-items", label: "Wash selected items", description: "Wash the selected kitchen items.", result: `${readableList(selectedItems.map(labelForItem))} ${selectedItems.length === 1 ? "has" : "have"} been washed. Clean dishes remain in the sink drying area; washed food returns to the ${surface === "counter" ? "kitchen" : "range-side prep"} counter.`, soundAction: "wash" }, true);
    } else {
      if (surface === "counter") setCounterItems(keepItems); else setPrepCounterItems(keepItems);
      if (operation === "garbage") setIndoorGarbage(current => [...current, ...selectedItems]);
      announceHousehold(operation === "garbage" ? "bins" : "counter", { value: `${operation}-selected-items`, label: `${operation === "garbage" ? "Discard" : "Put back"} selected items`, description: "Handle all selected items in one trip.", result: operation === "garbage" ? `${readableList(selectedItems.map(labelForItem))} ${selectedItems.length === 1 ? "is" : "are"} now in the indoor garbage bin.` : `${readableList(selectedItems.map(labelForItem))} ${selectedItems.length === 1 ? "is" : "are"} back in the correct storage location.`, soundAction: operation === "garbage" ? "bag-waste" : "return-cabinet" }, true, "before");
    }
    if (surface === "counter") setCounterSelections([]); else setPrepSelections([]);
  }

  function putSelectedCarriedDishesInSink() {
    const selected = sinkCarrySelections.map(index => ({ index, item: carriedItems[index] })).filter(entry => entry.item);
    if (!selected.length) return;
    const indexes = new Set(selected.map(entry => entry.index));
    setCarriedItems(current => current.filter((_, index) => !indexes.has(index)));
    setDirtyDishes(current => [...current, ...selected.map(entry => dishType(entry.item))]);
    setSinkCarrySelections([]);
    announceHousehold("kitchenSink", { value: "put-selected-dishes-in-sink", label: "Put selected dishes in sink", description: "Place the selected dirty dishes in the sink.", result: `${selected.length} ${selected.length === 1 ? "dish is" : "dishes are"} now in the sink.`, soundAction: "set-dish-down" }, true);
  }

  function washSelectedDishes() {
    const indexes = new Set(dirtyDishSelections);
    const selected = dirtyDishes.filter((_, index) => indexes.has(index));
    if (!selected.length) return;
    setDirtyDishes(current => current.filter((_, index) => !indexes.has(index)));
    setCleanDishes(current => [...current, ...selected]);
    setDirtyDishSelections([]);
    announceHousehold("kitchenSink", { value: "wash-selected-dishes", label: "Wash selected dishes", description: "Wash and dry all selected dishes.", result: `${selected.length} ${selected.length === 1 ? "dish is" : "dishes are"} clean and waiting in the sink drying area.`, soundAction: "wash" }, true);
  }

  function pickUpSelectedCleanDishes() {
    const indexes = new Set(cleanDishSelections);
    const selected = cleanDishes.filter((_, index) => indexes.has(index));
    if (!selected.length) return;
    setCleanDishes(current => current.filter((_, index) => !indexes.has(index)));
    setCarriedItems(current => [...current, ...selected.map(dish => `held-clean-${dish}`)]);
    setCleanDishSelections([]);
    announceHousehold("kitchenSink", { value: "pick-up-selected-clean-dishes", label: "Pick up selected clean dishes", description: "Pick up all selected clean dishes.", result: `${selected.length} clean ${selected.length === 1 ? "dish is" : "dishes are"} now being carried.`, soundAction: "pick-up-glass" }, true);
  }

  function disposeSelectedContainers(recycling: boolean) {
    const indexes = new Set(binSelections);
    const selected = carriedItems.filter((_, index) => indexes.has(index));
    if (!selected.length) return;
    setCarriedItems(current => current.filter((_, index) => !indexes.has(index)));
    if (recycling) setIndoorRecycling(current => [...current, ...selected]); else setIndoorGarbage(current => [...current, ...selected]);
    setBinSelections([]);
    announceHousehold("bins", { value: recycling ? "recycle-selected" : "discard-selected", label: recycling ? "Recycle selected items" : "Discard selected items", description: "Put all selected containers in the chosen indoor bin.", result: `${selected.length} ${selected.length === 1 ? "container is" : "containers are"} now in the indoor ${recycling ? "recycling" : "garbage"} bin.`, soundAction: "bag-waste" }, true);
  }

  function washSelectedDishes() {
    const selectedSet = new Set(dirtyDishSelections);
    const selected = dirtyDishes.filter((_, index) => selectedSet.has(index));
    if (!selected.length) return;
    setDirtyDishes(current => current.filter((_, index) => !selectedSet.has(index)));
    setCleanDishes(current => [...current, ...selected]);
    setDirtyDishSelections([]);
    announceHousehold("kitchenSink", { value: "wash-selected-dishes", label: "Wash selected dishes", description: "Wash all selected dishes.", result: selected.length + (selected.length === 1 ? " dish is" : " dishes are") + " clean and remain in the sink drying area.", soundAction: "wash" }, true);
  }

  function pickUpSelectedCleanDishes() {
    const selectedSet = new Set(cleanDishSelections);
    const selected = cleanDishes.filter((_, index) => selectedSet.has(index));
    if (!selected.length) return;
    setCleanDishes(current => current.filter((_, index) => !selectedSet.has(index)));
    setCarriedItems(current => [...current, ...selected.map(dish => "held-clean-" + dish)]);
    setCleanDishSelections([]);
    announceHousehold("kitchenSink", { value: "pick-up-selected-clean-dishes", label: "Pick up selected clean dishes", description: "Pick up all selected clean dishes.", result: selected.length + " clean " + (selected.length === 1 ? "dish is" : "dishes are") + " now being carried.", soundAction: "pick-up-glass" }, true);
  }

  function disposeCarriedContainer(index: number, recycling: boolean) {
    const item = carriedItems[index];
    setCarriedItems(current => withoutIndex(current, index));
    if (recycling) setIndoorRecycling(current => [...current, item]);
    else setIndoorGarbage(current => [...current, item]);
    announceHousehold("bins", {
      value: recycling ? "recycle-container" : "throw-away-container",
      label: recycling ? "Recycle container" : "Throw away container",
      description: "Place the empty container in the correct bin.",
      result: "The " + labelForItem(item).replace(" being carried", "") + " is now in the " + (recycling ? "recycling bin." : "garbage bin."),
    });
  }

  function takeWasteOutside(type: "garbage" | "recycling") {
    if (carriedWaste) return;
    const items = type === "garbage" ? indoorGarbage : indoorRecycling;
    if (!items.length) return;
    setCarriedWaste({ type, items: [...items] });
    if (type === "garbage") setIndoorGarbage([]); else setIndoorRecycling([]);
    announceHousehold("bins", {
      value: `take-out-${type}`,
      label: `Take out ${type}`,
      description: `Tie up the indoor ${type} and carry it outside.`,
      result: `The ${type} has been collected and is ready to carry to the outdoor ${type} bin.`,
      soundAction: "bag-waste",
    }, false, "after");
  }

  function putWasteInOutdoorBin(type: "garbage" | "recycling") {
    if (!carriedWaste || carriedWaste.type !== type) return;
    const count = carriedWaste.items.length;
    setCarriedWaste(null);
    announceHousehold(type === "garbage" ? "outdoorGarbageBin" : "outdoorRecyclingBin", {
      value: `empty-${type}`,
      label: `Put ${type} in outdoor bin`,
      description: `Open the outdoor ${type} bin and put the collected items inside.`,
      result: `${count} ${count === 1 ? "item has" : "items have"} been emptied into the outdoor ${type} bin.`,
      soundAction: "empty-bin",
    }, false, "before");
  }
  function actionsForFurniture(item: Furniture) {
    if (item.kind === "frontDoor") return room === "outside"
      ? [{ value: "go-inside", label: "Go inside", description: "Open the front door and enter your home.", result: "You go back inside to the front entrance." }]
      : [{ value: "go-outside", label: "Go outside", description: "Open the front door and step outside.", result: "You step outside your home." }];
    if (item.kind === "counter") return counterActionsFor(counterItem, counterItems);
    if (item.kind === "bins") return binActionsFor(counterItem);
    if (item.kind === "stove") return rangeActions();
    if (item.kind === "fridge") return [...actions.fridge, ...actions.freezer];
    if (item.kind === "closet") return closetActionsFor(character.gender);
    if (item.kind === "coffeeTable" || item.kind === "diningTable") return [];
    if (item.kind === "sofa") return [{ ...actions.sofa[0], value: "sit-on-sofa", label: coffeeTableItems.some(value => value.startsWith("plated:") && preparedMeals[value.slice("plated:".length)]) ? "Sit on the couch to eat" : "Sit down" }, ...actions.sofa.slice(1)];
    if (item.kind === "cookwareCabinet") return activeCookware ? [{
      value: "cookware-already-out",
      label: labelForItem(activeCookware) + " is already on the range",
      description: "Only one piece of cookware can be in use at a time.",
      result: "The " + labelForItem(activeCookware) + " is tracked on the range. Put it away before taking out another item.",
    }] : cookwareInventory.map(cookware => ({ value: "take-cookware-" + cookware.id, label: "Take out " + cookware.label, description: "Take the " + cookware.label + " from the cabinet and place it on the range.", result: "The " + cookware.label + " is now on the range.", nextItem: cookware.id, soundAction: "take-cookware" }));
    if (item.kind === "mirror") return [{ value: "view-self", label: "View self", description: "Hear a complete description of the character’s body, coloring, hair, clothing, accessories, and makeup.", result: appearanceDescription(character, savedName, makeup) }];
    if (item.kind === "bathSink") return (actions.bathSink || []).filter(action => action.value !== "mirror");
    if (item.kind === "kitchenSink") return actions.kitchenSink || [];
    return actions[item.kind] || genericActions;
  }

  function moveFurniture(item: Furniture, destination: RoomKey, position: string) {
    if (!item.instanceId) return;
    const destinationName = currentHome.rooms[destination]?.name;
    const positionName = furniturePositionOptions.find(option => option.id === position)?.label;
    if (!destinationName || !positionName) return;
    setOwnedFurniture(current => current.map(furniture => furniture.id === item.instanceId ? { ...furniture, room: destination, position } : furniture));
    setFurniturePlacements(current => ({ ...current, [item.instanceId!]: { room: destination, position } }));
    announceHousehold("purchasedFurniture", {
      value: `place-furniture:${destination}:${position}`,
      label: `Place ${item.label} ${positionName} in ${destinationName}`,
      description: `Move the furniture into the room and position it exactly where requested.`,
      result: `The ${item.label} is now ${positionName} in the ${destinationName.toLowerCase()}.`,
      soundAction: "move-furniture",
    }, true, "before");
  }

  function executeAction(item: Furniture, actionValue: string) {
    if (!actionValue) return;
    if (item.kind === "frontDoor") {
      if (room === "outside") moveToEntrance(); else moveOutside();
      return;
    }
    const choices = actionsForFurniture(item);
    const chosen = choices.find(action => action.value === actionValue);
    if (!chosen) return;
    let narrationResult = chosen.result;
    if (item.kind === "closet") {
      const updated = { ...character, clothing: actionValue }; setCharacter(updated);
    }
    if (item.kind === "vanity") {
      const makeupChoices: Record<string, string> = {
        "lipstick-pink": "Rose-pink lipstick is being worn",
        "lipstick-red": "Classic-red lipstick is being worn",
        "shadow-blue": "Soft blue eyeshadow is being worn",
        "shadow-pink": "Shimmering pink eyeshadow is being worn",
        blush: "Rosy blush is being worn",
        "full-look": "A complete look of foundation, pink eyeshadow, mascara, rosy blush, and berry lipstick is being worn",
        remove: "No makeup is being worn",
      };
      const updatedMakeup = makeupChoices[actionValue] || makeup;
      setMakeup(updatedMakeup);
      narrationResult = `${chosen.result} ${appearanceDescription(character, savedName, updatedMakeup)}`;
    }
    if (item.kind === "sofa" && actionValue === "sit-on-sofa") setSeatedOnSofa(true);
    setActionAnnouncement("");
    const narrateAction = () => queueAnnouncement(`${savedName}: ${narrationResult}`);
    const movesAnItem = actionValue.startsWith("get-") || Boolean(chosen.nextItem && ["dishCabinet", "pantry", "silverwareDrawer", "cookwareCabinet"].includes(item.kind));
    const alwaysNarrate = movesAnItem || item.kind === "vanity" || item.kind === "mirror" || item.kind === "tv" || actionValue === "mirror" || actionValue === "view-self";
    const narrationFallback = alwaysNarrate ? undefined : narrateAction;
    let soundPlayed = false;
    if (item.kind === "fridge" && actionValue.startsWith("get-")) {
      if (chosen.nextItem) setCounterItems(current => [...current, chosen.nextItem!]);
      soundPlayed = soundEnabled && audio().playActionSequence("fridge", actionValue, narrationFallback, "after");
    } else {
      soundPlayed = audio().playActionSequence(item.kind, chosen.soundAction || actionValue, narrationFallback, movesAnItem ? "after" : false);
      if (chosen.nextItem && ["dishCabinet", "pantry", "silverwareDrawer", "coffeeMachine"].includes(item.kind)) setCounterItems(current => [...current, chosen.nextItem!]);
      else if (chosen.nextItem && item.kind === "bookshelf") setCarriedItems(current => [...current, chosen.nextItem!]);
      else if (chosen.nextItem && item.kind === "cookwareCabinet") setActiveCookware(chosen.nextItem);
      else if (chosen.nextItem !== undefined) setCounterItem(chosen.nextItem);
    }
    if (alwaysNarrate || !soundPlayed) narrateAction();
    if (item.kind !== "fridge" && ["closet", "linen", "laptop"].includes(item.kind)) audio().queueObjectClose(item.kind);
  }
  function moveTo(destination: RoomKey) {
    setSeatedOnSofa(false);
    const layout = layouts[savedHouse];
    const target = layout.positions[destination];
    const destinationRoom = currentHome.rooms[destination];
    if (!target || !destinationRoom) return;
    let direction = "";
    if (room === "outside") {
      direction = "through the front door and into the home, then toward the " + destinationRoom.name.toLowerCase();
      audio().queueObjectOpen("door");
    } else if (room === "entrance") {
      const entranceDirections: Record<string, Partial<Record<RoomKey, string>>> = {
        bungalow: { living: "left", kitchen: "right", bedroom: "straight ahead and down the hallway", bathroom: "straight ahead, then right down the hallway" },
        townhouse: { living: "left", kitchen: "right", dining: "left through the living room", bedroom: "straight ahead and upstairs, then left", bathroom: "straight ahead and upstairs, then right" },
        apartmentOne: { living: "straight ahead", kitchen: "right", bathroom: "left and down the hallway", bedroom: "left and to the end of the hallway" },
        apartmentTwo: { living: "ahead and slightly left", kitchen: "right", bedroom: "ahead, then left down the hallway", bathroom: "ahead, then right down the hallway" },
      };
      direction = entranceDirections[savedHouse][destination] || "away from the entrance";
    } else {
      const start = layout.positions[room];
      if (!start) return;
      if (target.floor > start.floor) direction = "upstairs";
      else if (target.floor < start.floor) direction = "downstairs";
      else {
        const horizontal = target.x > start.x ? "east" : target.x < start.x ? "west" : "";
        const vertical = target.y > start.y ? "north" : target.y < start.y ? "south" : "";
        direction = [vertical, horizontal].filter(Boolean).join(" and ") || "through the doorway";
      }
    }
    const currentFloor = room === "entrance" || room === "outside" ? 1 : layout.positions[room]?.floor ?? 1;
    audio().playMovement(target.floor !== currentFloor);
    setMovementAnnouncement(`You move ${direction} to the ${destinationRoom.name.toLowerCase()}. ${target.location}`);
    setRoom(destination);
  }
  function moveToEntrance() {
    if (room === "entrance") return;
    setSeatedOnSofa(false);
    if (room === "outside") {
      audio().playMovement(false);
      audio().queueObjectOpen("door");
      if (groceryBags.length) {
        setCounterItems(current => [...current, ...groceryBags]);
        setGroceryBags([]);
      }
      setRoom("entrance");
      setMovementAnnouncement(`You walk to the front door, open it, and enter the home. ${groceryBags.length ? "The grocery bags are unpacked onto the kitchen counter. " : ""}${layouts[savedHouse].entrance}`);
      return;
    }
    const start = layouts[savedHouse].positions[room];
    if (!start) return;
    let direction = "";
    if (start.floor > 1) direction = "downstairs and toward the front of the home";
    else {
      const horizontal = start.x > 0 ? "west" : start.x < 0 ? "east" : "";
      const vertical = start.y > 0 ? "south" : start.y < 0 ? "north" : "";
      direction = [vertical, horizontal].filter(Boolean).join(" and ") || "toward the front door";
    }
    audio().playMovement(start.floor > 1);
    setRoom("entrance");
    setMovementAnnouncement(`You move ${direction} to the front entrance. ${layouts[savedHouse].entrance}`);
  }
  function moveOutside() {
    if (room === "outside") return;
    const period = currentDayPeriod();
    setOutsidePeriod(period);
    setSeatedOnSofa(false);
    setSeatedAtDiningTable(false);
    const comingFromUpstairs = room !== "entrance" && (layouts[savedHouse].positions[room]?.floor ?? 1) > 1;
    audio().playMovement(comingFromUpstairs);
    audio().queueObjectOpen("door");
    audio().playOutdoorAmbience(period);
    setRoom("outside");
    setMovementAnnouncement(`You walk to the front door, open it, and go outside. ${outdoorAreas[savedHouse].description} It is ${period}. ${outdoorSoundDescriptions[period]}`);
  }
  function previewDestination(destination: string) {
    audio().playSelection();
    queueAnnouncement(`${savedName}: ${destination} is listed as a future destination. It will become playable in an upcoming update.`);
  }
  function travelToStore(store: "groceryStore" | "furnitureStore") {
    const storeName = store === "groceryStore" ? "Grocery store" : "Furniture store";
    audio().playMovement(false);
    setRoom(store);
    setMovementAnnouncement(`You travel from your neighborhood to the ${storeName.toLowerCase()}. You are standing just inside its main entrance.`);
  }
  function leaveStore() {
    const period = currentDayPeriod();
    setOutsidePeriod(period);
    audio().playMovement(false);
    audio().playOutdoorAmbience(period);
    setRoom("outside");
    setMovementAnnouncement(`You leave the store and return to the outdoor area near your home. ${outdoorAreas[savedHouse].description}`);
  }
  function toggleCartItem(item: CartItem) {
    setShoppingCart(current => current.some(entry => entry.id === item.id) ? current.filter(entry => entry.id !== item.id) : [...current, item]);
  }

  function toggleGroceryStoreSelection(itemId: string, selected: boolean) {
    setGroceryStoreSelections(current => selected
      ? [...new Set([...current, itemId])]
      : current.filter(value => value !== itemId));
  }

  function addSelectedGroceriesToCart(department: string) {
    const selected = groceryProducts.filter(product => product.department === department && groceryStoreSelections.includes(product.id));
    if (!selected.length) return;
    setShoppingCart(current => {
      const existing = new Set(current.map(item => item.id));
      return [...current, ...selected.filter(product => !existing.has("grocery:" + product.id)).map(product => ({
        id: "grocery:" + product.id,
        itemId: product.id,
        label: product.label,
        price: product.price,
        store: "grocery" as const,
      }))];
    });
    setGroceryStoreSelections(current => current.filter(itemId => !selected.some(product => product.id === itemId)));
    audio().playSelection();
    queueAnnouncement(`${savedName}: ${readableList(selected.map(product => product.label))} ${selected.length === 1 ? "has" : "have"} been added to the grocery cart.`);
  }

  function toggleFurnitureStoreSelection(productId: string, color: string, selected: boolean) {
    setFurnitureStoreSelections(current => {
      const productSelections = current[productId] || [];
      return { ...current, [productId]: selected ? [...new Set([...productSelections, color])] : productSelections.filter(value => value !== color) };
    });
  }

  function addSelectedFurnitureToCart(product: FurnitureProduct) {
    const selectedColors = furnitureStoreSelections[product.id] || [];
    if (!selectedColors.length) return;
    const selectedItems = selectedColors.map(color => {
      const id = "furniture:" + product.id + ":" + color.toLowerCase().replaceAll(" ", "-");
      return { id, label: color + " " + product.material + " " + product.label.toLowerCase(), price: product.price, store: "furniture" as const };
    });
    setShoppingCart(current => {
      const existing = new Set(current.map(item => item.id));
      return [...current, ...selectedItems.filter(item => !existing.has(item.id))];
    });
    setFurnitureStoreSelections(current => ({ ...current, [product.id]: [] }));
    audio().playSelection();
    queueAnnouncement(`${savedName}: ${readableList(selectedItems.map(item => item.label))} ${selectedItems.length === 1 ? "has" : "have"} been added to the furniture cart.`);
  }
  function checkout(store: "grocery" | "furniture") {
    const storeItems = shoppingCart.filter(item => item.store === store);
    const total = storeItems.reduce((sum, item) => sum + item.price, 0);
    if (!storeItems.length) {
      queueAnnouncement(`${savedName}: No items are selected for purchase.`);
      return;
    }
    if (total > householdFunds) {
      queueAnnouncement(`${savedName}: The cart costs $${total}, but the household account has only $${householdFunds}.`);
      return;
    }
    setHouseholdFunds(current => current - total);
    setShoppingCart(current => current.filter(item => item.store !== store));
    if (store === "grocery") setGroceryBags(current => [...current, ...storeItems.map(item => item.itemId!).filter(Boolean)]);
    else setOwnedFurniture(current => [...current, ...storeItems.map((item, index) => ({ id: `${item.id}:${Date.now()}:${index}`, label: item.label, room: "living" as RoomKey, position: "center" }))]);
    announceHousehold("counter", { value: "store-checkout", label: "Checkout", description: "Pay for the selected items.", result: `The purchase is complete. $${total} was paid from the household account. ${store === "grocery" ? "The groceries are bagged and will be unpacked on the kitchen counter when you go home." : "The furniture will be delivered to the living room."}`, soundAction: "return-cabinet" }, true);
  }
  const currentHome = homes[savedHouse || houseChoice];
  const currentRoom = room === "entrance" || room === "outside" || room === "groceryStore" || room === "furnitureStore" ? null : currentHome?.rooms[room];
  const baseFurnitureEntries = currentHome ? (() => {
    const entries = Object.entries(currentHome.rooms).flatMap(([originalRoom, roomData]) => (roomData?.furniture || []).map((item, index) => {
      const id = `${savedHouse || houseChoice}:existing:${originalRoom}:${index}`;
      const defaultPosition = furniturePositionOptions[index % furniturePositionOptions.length].id;
      const placement = furniturePlacements[id] || { room: originalRoom as RoomKey, position: defaultPosition };
      return { id, item, placement };
    }));
    if (!entries.some(entry => entry.item.kind === "bookshelf")) {
      const id = `${savedHouse || houseChoice}:existing:living:bookshelf`;
      entries.push({
        id,
        item: { label: "Bookshelf", kind: "bookshelf", description: "A bookshelf arranged with fantasy, drama, crime, romance, biography, and nature titles." },
        placement: furniturePlacements[id] || { room: "living", position: "east-wall" },
      });
    }
    return entries;
  })() : [];

  function toggleSounds(enabled: boolean) {
    setSoundEnabled(enabled);
    localStorage.setItem("everyday-life-sounds", enabled ? "on" : "off");
    if (enabled) {
      if (!audioRef.current) {
        audioRef.current = new GameAudio();
        audioRef.current.primeRecordings();
      }
      audioRef.current.setEnabled(true);
      audioRef.current.playSelection();
    } else audioRef.current?.setEnabled(false);
  }

  const soundControl = <label className="sound-control">
    <input type="checkbox" checked={soundEnabled} onChange={(event) => toggleSounds(event.target.checked)} />
    <span>Sound effects</span>
  </label>;

  function optionsForField(field: (typeof fields)[number]) {
    return field.key === "clothing" ? (wardrobeOptions[character.gender] || femaleOutfits) : field.options;
  }

  function updateCharacterChoice(field: (typeof fields)[number], value: string) {
    const updated = { ...character, [field.key]: value };
    if (field.key === "gender") updated.clothing = (wardrobeOptions[value] || femaleOutfits)[0];
    setCharacter(updated);
    audio().playSelection();
  }

  function groceryDepartmentMenu(department: string) {
    const products = groceryProducts.filter(product => product.department === department);
    const selectedCount = products.filter(product => groceryStoreSelections.includes(product.id)).length;
    return <div className="store-product-controls"><DropdownMenu onOpenChange={(open) => { if (open) audio().queueObjectOpen("pantry"); }}>
      <DropdownMenuTrigger asChild><button className="furniture-button">{department}</button></DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[70vh] min-w-64 overflow-y-auto" align="start" aria-label={department + " products"}>
        <DropdownMenuLabel>Select products, close this menu, then use the Add selected products to cart button</DropdownMenuLabel>
        {products.map(product => {
          const cartId = "grocery:" + product.id;
          const inCart = shoppingCart.some(item => item.id === cartId);
          const selected = groceryStoreSelections.includes(product.id);
          return <DropdownMenuCheckboxItem key={product.id} checked={selected || inCart} disabled={inCart} onSelect={(event) => { event.preventDefault(); toggleGroceryStoreSelection(product.id, !selected); }}>{product.label}, ${product.price}{inCart ? ", already in cart" : ""}</DropdownMenuCheckboxItem>;
        })}
        <DropdownMenuItem disabled={!selectedCount} onSelect={() => addSelectedGroceriesToCart(department)}>Add selected items to cart ({selectedCount})</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu><button type="button" className="secondary-button store-add-button" disabled={!selectedCount} onClick={() => addSelectedGroceriesToCart(department)}>Add selected products to cart ({selectedCount})</button></div>;
  }

  function furnitureProductMenu(product: FurnitureProduct) {
    const selectedColors = furnitureStoreSelections[product.id] || [];
    return <div className="store-product-controls"><DropdownMenu onOpenChange={(open) => { if (open) audio().queueObjectOpen("closet"); }}>
      <DropdownMenuTrigger asChild><button className="furniture-button">{product.label} — {product.material}</button></DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[70vh] min-w-72 overflow-y-auto" align="start" aria-label={product.label + " color choices"}>
        <DropdownMenuLabel>{product.label}. {product.material}. Select colors, close this menu, then use the Add selected colors to cart button.</DropdownMenuLabel>
        {furnitureColors.map(color => {
          const cartId = "furniture:" + product.id + ":" + color.toLowerCase().replaceAll(" ", "-");
          const inCart = shoppingCart.some(item => item.id === cartId);
          const selected = selectedColors.includes(color);
          const label = color + " " + product.material + " " + product.label.toLowerCase();
          return <DropdownMenuCheckboxItem key={color} checked={selected || inCart} disabled={inCart} onSelect={(event) => { event.preventDefault(); toggleFurnitureStoreSelection(product.id, color, !selected); }}>{color}, ${product.price}{inCart ? ", already in cart" : ""}</DropdownMenuCheckboxItem>;
        })}
        <DropdownMenuItem disabled={!selectedColors.length} onSelect={() => addSelectedFurnitureToCart(product)}>Add selected items to cart ({selectedColors.length})</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu><button type="button" className="secondary-button store-add-button" disabled={!selectedColors.length} onClick={() => addSelectedFurnitureToCart(product)}>Add selected colors to cart ({selectedColors.length})</button></div>;
  }

  function shoppingCartMenu(store: "grocery" | "furniture") {
    const items = shoppingCart.filter(item => item.store === store);
    const total = items.reduce((sum, item) => sum + item.price, 0);
    return <div className="store-cart-controls"><DropdownMenu>
      <DropdownMenuTrigger asChild><button className="primary-button">Shopping cart — {items.length} items, ${total}</button></DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[70vh] min-w-72 overflow-y-auto" align="start" aria-label={(store === "grocery" ? "Grocery" : "Furniture") + " shopping cart"}>
        <DropdownMenuLabel>Household account: ${householdFunds}. Cart total: ${total}.</DropdownMenuLabel>
        {items.map(item => <DropdownMenuCheckboxItem key={item.id} checked onSelect={(event) => { event.preventDefault(); toggleCartItem(item); }}>{item.label}, ${item.price}. Uncheck to remove</DropdownMenuCheckboxItem>)}
        {!items.length && <DropdownMenuItem disabled>The cart is empty</DropdownMenuItem>}
        {total > householdFunds && <DropdownMenuItem disabled>Not enough money in the household account</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu><button className="secondary-button" disabled={!items.length || total > householdFunds} onClick={() => checkout(store)}>Checkout {store === "grocery" ? "grocery" : "furniture"} cart — ${total}</button></div>;
  }

  function makeCereal() {
    const required = ["bowl", "cereal", "milk", "spoon"];
    if (!required.every(ingredient => counterItems.includes(ingredient))) return;
    setCounterItems(current => {
      const remaining = [...current];
      required.forEach(ingredient => {
        const index = remaining.indexOf(ingredient);
        if (index >= 0) remaining.splice(index, 1);
      });
      return [...remaining, "plated:meal-cereal"];
    });
    announceHousehold("counter", {
      value: "make-cereal",
      label: "Make a bowl of cereal with milk",
      description: "Pour cereal and milk into the bowl and add the spoon.",
      result: "A bowl of cereal with milk and a spoon is ready on the kitchen counter.",
      soundAction: "make-cereal",
    });
  }

  function objectMenu(item: Furniture) {
    const currentAssemblyPlan = assemblyRecipe ? assemblyPlans[assemblyRecipe] : null;
    const missingAssemblyIngredients = currentAssemblyPlan?.required.filter(ingredient => !assemblyIngredients.includes(ingredient)) || [];
    const sandwichPlateIndex = prepCounterItems.findIndex(value => value === "plate");
    const sandwichBreadIndex = prepCounterItems.findIndex(value => value === "bread");
    const inventoryKind = (["dishCabinet", "pantry", "silverwareDrawer", "cookwareCabinet", "bookshelf"] as string[]).includes(item.kind) ? item.kind as InventoryMenuKey : null;
    const selectedInventoryItems = inventoryKind ? inventorySelections[inventoryKind] || [] : [];
    const menuLabel = item.kind === "fridge"
      ? "Refrigerator and freezer. Select one or more items, then choose Get selected items"
      : item.kind === "freezer"
        ? "Freezer inventory"
      : item.kind === "dishCabinet"
        ? "Dish cabinet inventory"
      : item.kind === "pantry"
        ? "Pantry cabinet inventory"
      : item.kind === "silverwareDrawer"
        ? "Silverware drawer inventory"
      : item.kind === "stove" && finishedMeal
        ? `${labelForItem(finishedMeal)} is finished in the ${labelForItem(activeCookware || "cookware")} and must be plated`
      : item.kind === "stove" && cookingRecipe
        ? cookingStage === -1
          ? `Range is off. ${labelForItem(activeCookware || "cookware")} contains ${cookingIngredients.length} ingredients to return`
          : `${stoveOn ? "Range is on" : "Range is off"}. Cooking ${recipes[cookingRecipe].name}. Step ${Math.min(cookingStage + 1, 3)} of 3. ${cookingIngredients.length} ingredients added to the ${labelForItem(activeCookware || "cookware")}`
      : item.kind === "stove" && activeCookware
        ? `${labelForItem(activeCookware)} on the range. ${counterItems.length} items on the counter are available`
      : item.kind === "counter"
        ? (counterItems.length ? `${counterItems.length} items on the kitchen counter` : "Kitchen counter is clear")
      : item.kind === "prepCounter"
        ? `${prepCounterItems.length} items on the range-side prep counter${currentAssemblyPlan ? `. Assembling ${currentAssemblyPlan.name}` : ""}`
      : item.kind === "coffeeTable"
        ? `${coffeeTableItems.length} items on the coffee table. ${carriedItems.length} items being carried`
      : item.kind === "diningTable"
        ? `${diningTableItems.length} items on the dining table. ${carriedItems.length} items being carried`
      : item.kind === "kitchenSink"
        ? `${dirtyDishes.length} dirty dishes in the sink. ${cleanDishes.length} clean dishes in the drying area ready to pick up`
      : item.kind === "bins"
          ? `Indoor bins. ${indoorGarbage.length} garbage items and ${indoorRecycling.length} recycling items${carriedWaste ? `. Carrying ${carriedWaste.type} outside` : ""}`
      : item.kind === "outdoorGarbageBin"
        ? "Outdoor garbage bin"
      : item.kind === "outdoorRecyclingBin"
        ? "Outdoor recycling bin"
        : `${item.label} actions`;
    return <DropdownMenu open={item.kind === "fridge" ? fridgeMenuOpen : undefined} onOpenChange={(open) => { if (item.kind === "fridge") setFridgeMenuOpen(open); if (open && item.kind !== "kitchenSink" && item.kind !== "bathSink") audio().queueObjectOpen(item.kind); }}>
      <DropdownMenuTrigger asChild>
        <button className="furniture-button">{item.label}</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[70vh] min-w-64 overflow-y-auto" align="start" aria-label={menuLabel}>
        <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
        {item.instanceId && <>
          <DropdownMenuLabel>{item.description}</DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Move or arrange furniture</DropdownMenuSubTrigger>
            <DropdownMenuSubContent aria-label={`Choose a room for ${item.label}`}>
              {(Object.keys(currentHome.rooms) as RoomKey[]).map(destination => <DropdownMenuSub key={`furniture-room-${destination}`}>
                <DropdownMenuSubTrigger>{currentHome.rooms[destination]!.name}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent aria-label={`Choose a position in ${currentHome.rooms[destination]!.name}`}>
                  {furniturePositionOptions.map(position => <DropdownMenuItem key={position.id} onSelect={() => moveFurniture(item, destination, position.id)}>Place {position.label}</DropdownMenuItem>)}
                </DropdownMenuSubContent>
              </DropdownMenuSub>)}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </>}
        {item.kind === "fridge" ? <>
          <DropdownMenuLabel>Refrigerator items</DropdownMenuLabel>
          {actions.fridge.map(action => <DropdownMenuCheckboxItem key={action.value} checked={fridgeSelections.includes(action.nextItem!)} aria-label={`${action.label}. ${action.description}`} onSelect={(event) => { event.preventDefault(); setFridgeItemSelected(action.nextItem!, !fridgeSelections.includes(action.nextItem!)); }}>{action.label}</DropdownMenuCheckboxItem>)}
          <DropdownMenuLabel>Freezer items</DropdownMenuLabel>
          {actions.freezer.map(action => <DropdownMenuCheckboxItem key={action.value} checked={fridgeSelections.includes(action.nextItem!)} aria-label={`${action.label}. ${action.description}`} onSelect={(event) => { event.preventDefault(); setFridgeItemSelected(action.nextItem!, !fridgeSelections.includes(action.nextItem!)); }}>{action.label}</DropdownMenuCheckboxItem>)}
          <DropdownMenuItem disabled={!fridgeSelections.length} onSelect={takeSelectedFridgeItems}>Get selected items ({fridgeSelections.length})</DropdownMenuItem>
          {fridgeSelections.length > 0 && <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setFridgeSelections([]); }}>Clear selected items</DropdownMenuItem>}
        </> : item.kind === "counter" ? (counterItems.length ? <>
          {["bowl", "cereal", "milk", "spoon"].every(ingredient => counterItems.includes(ingredient)) && <DropdownMenuItem onSelect={makeCereal}>Make a bowl of cereal with milk</DropdownMenuItem>}
          <DropdownMenuLabel>Select one or more items for a batch action</DropdownMenuLabel>
          {counterItems.map((counterValue, index) => <DropdownMenuCheckboxItem key={`select-counter-${counterValue}-${index}`} checked={counterSelections.includes(index)} onSelect={(event) => { event.preventDefault(); toggleSurfaceSelection("counter", index, !counterSelections.includes(index)); }}>Select {labelForItem(counterValue)}</DropdownMenuCheckboxItem>)}
          {counterSelections.length > 0 && <>
            <DropdownMenuItem onSelect={() => manageSelectedSurfaceItems("counter", "return")}>Put selected items back ({counterSelections.length})</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => manageSelectedSurfaceItems("counter", "wash")}>Wash selected items ({counterSelections.length})</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => manageSelectedSurfaceItems("counter", "garbage")}>Put selected items in garbage ({counterSelections.length})</DropdownMenuItem>
          </>}
          <DropdownMenuLabel>Individual item actions</DropdownMenuLabel>
          {counterItems.map((counterValue, index) => <DropdownMenuSub key={`${counterValue}-${index}`}>
          <DropdownMenuSubTrigger>{labelForItem(counterValue)}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent aria-label={`${labelForItem(counterValue)} actions`}>
            <DropdownMenuLabel>{labelForItem(counterValue)}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => moveCounterItemToPrep(index)}>Move {labelForItem(counterValue)} to the range-side prep counter</DropdownMenuItem>
            {counterCookingActions(index, counterValue).map(action => <DropdownMenuItem key={action.value} aria-label={`${action.label}. ${action.description}`} onSelect={() => executeRangeAction(action)}>{action.label}</DropdownMenuItem>)}
            {preparedMeals[counterValue] && counterItems.some(value => value === preparedMeals[counterValue].dish) && <DropdownMenuItem onSelect={() => plateCounterMeal(index, counterItems.findIndex(value => value === preparedMeals[counterValue].dish))}>Put {labelForItem(counterValue)} on the {labelForItem(preparedMeals[counterValue].dish)}</DropdownMenuItem>}
            {counterActionsFor(counterValue, counterItems).map(action => <DropdownMenuItem key={action.value} aria-label={`${action.label}. ${action.description}`} onSelect={() => executeCounterAction(index, action)}>{action.label}</DropdownMenuItem>)}
          </DropdownMenuSubContent>
        </DropdownMenuSub>)}</> : <DropdownMenuItem disabled>The kitchen counter is empty</DropdownMenuItem>)
        : item.kind === "prepCounter" ? <>
          <DropdownMenuLabel>Move items here for cooking and step-by-step assembly</DropdownMenuLabel>
          {prepCounterItems.map((prepValue, index) => <DropdownMenuCheckboxItem key={`select-prep-${prepValue}-${index}`} checked={prepSelections.includes(index)} onSelect={(event) => { event.preventDefault(); toggleSurfaceSelection("prep", index, !prepSelections.includes(index)); }}>Select {labelForItem(prepValue)}</DropdownMenuCheckboxItem>)}
          {prepSelections.length > 0 && <>
            <DropdownMenuItem onSelect={() => manageSelectedSurfaceItems("prep", "return")}>Put selected items back ({prepSelections.length})</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => manageSelectedSurfaceItems("prep", "wash")}>Wash selected items ({prepSelections.length})</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => manageSelectedSurfaceItems("prep", "garbage")}>Put selected items in garbage ({prepSelections.length})</DropdownMenuItem>
          </>}
          {counterItems.map((counterValue, index) => <DropdownMenuItem key={`move-to-prep-${counterValue}-${index}`} onSelect={() => moveCounterItemToPrep(index)}>Move {labelForItem(counterValue)} here from the kitchen counter</DropdownMenuItem>)}
          {prepCounterItems.map((prepValue, index) => prepValue.startsWith("assembly-base:")
            ? <DropdownMenuItem key={`${prepValue}-${index}`} disabled>{labelForItem(prepValue)}</DropdownMenuItem>
            : <DropdownMenuSub key={`${prepValue}-${index}`}>
              <DropdownMenuSubTrigger>{labelForItem(prepValue)}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent aria-label={`${labelForItem(prepValue)} prep actions`}>
                {prepCookingActions(index, prepValue).map(action => <DropdownMenuItem key={action.value} onSelect={() => executeRangeAction(action)}>{action.label}</DropdownMenuItem>)}
                {currentAssemblyPlan && [...currentAssemblyPlan.required, ...currentAssemblyPlan.optional].includes(prepValue) && !assemblyIngredients.includes(prepValue) && <DropdownMenuItem onSelect={() => addAssemblyIngredient(index, prepValue)}>Add {labelForItem(prepValue)} to the {currentAssemblyPlan.name}</DropdownMenuItem>}
                {prepValue.startsWith("plated:") && counterActionsFor(prepValue, prepCounterItems).map(action => <DropdownMenuItem key={action.value} onSelect={() => executePrepItemAction(index, action)}>{action.label}</DropdownMenuItem>)}
                <DropdownMenuItem onSelect={() => movePrepItemToCounter(index)}>Move {labelForItem(prepValue)} back to the kitchen counter</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>)}
          {!assemblyRecipe && sandwichPlateIndex >= 0 && sandwichBreadIndex >= 0 && <DropdownMenuItem onSelect={() => startSandwichAssembly(sandwichPlateIndex, sandwichBreadIndex)}>Start a deli sandwich: put bread on the plate</DropdownMenuItem>}
          {currentAssemblyPlan && missingAssemblyIngredients.map(ingredient => <DropdownMenuItem key={`missing-assembly-${ingredient}`} disabled>Still needed for assembly: {labelForItem(ingredient)}</DropdownMenuItem>)}
          {currentAssemblyPlan && missingAssemblyIngredients.length === 0 && <DropdownMenuItem onSelect={finishAssembly}>Finish assembling {currentAssemblyPlan.name}</DropdownMenuItem>}
          {!prepCounterItems.length && !counterItems.length && <DropdownMenuItem disabled>The range-side prep counter is empty</DropdownMenuItem>}
        </>
        : item.kind === "stove" ? rangeActions().map(action => <DropdownMenuItem key={action.value} aria-label={`${action.label}. ${action.description}`} onSelect={() => executeRangeAction(action)}>{action.label}</DropdownMenuItem>)
        : item.kind === "coffeeTable" || item.kind === "diningTable" ? <>
          <DropdownMenuItem onSelect={() => { if (item.kind === "coffeeTable") setSeatedOnSofa(true); else setSeatedAtDiningTable(true); announceHousehold(item.kind, { value: "sit-at-table", label: "Sit down", description: "Sit down by the table.", result: item.kind === "coffeeTable" ? "You sit on the couch beside the coffee table." : "You sit on a dining chair at the dining table." }); }}>{item.kind === "coffeeTable" ? "Sit on the couch" : "Sit at the dining table"}</DropdownMenuItem>
          {carriedItems.map((carried, index) => <DropdownMenuItem key={`carried-${carried}-${index}`} onSelect={() => placeCarriedItem(item.kind === "coffeeTable" ? "coffee" : "dining", index)}>Put {labelForItem(carried).replace(" being carried", "")} on the {item.kind === "coffeeTable" ? "coffee table" : "dining table"}</DropdownMenuItem>)}
          {(item.kind === "coffeeTable" ? coffeeTableItems : diningTableItems).map((tableValue, index) => <DropdownMenuSub key={`table-${tableValue}-${index}`}>
            <DropdownMenuSubTrigger>{labelForItem(tableValue)}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent aria-label={`${labelForItem(tableValue)} actions`}>
              {surfaceActionsFor(tableValue, item.kind === "coffeeTable" ? seatedOnSofa : seatedAtDiningTable, item.kind === "coffeeTable" ? "coffee table" : "dining table").map(action => <DropdownMenuItem key={action.value} onSelect={() => executeSurfaceAction(item.kind === "coffeeTable" ? "coffee" : "dining", index, action)}>{action.label}</DropdownMenuItem>)}
            </DropdownMenuSubContent>
          </DropdownMenuSub>)}
        </>
        : item.kind === "kitchenSink" ? <>
          {carriedItems.map((carried, index) => ({ carried, index })).filter(({ carried }) => ["held-empty-glass", "held-empty-mug", "held-empty-plate", "held-empty-bowl"].includes(carried)).map(({ carried, index }) => <DropdownMenuItem key={`sink-${carried}-${index}`} onSelect={() => putCarriedDishInSink(index)}>Put {labelForItem(carried).replace(" being carried", "")} in the sink</DropdownMenuItem>)}
          {dirtyDishes.map((dish, index) => <DropdownMenuCheckboxItem key={`wash-${dish}-${index}`} checked={dirtyDishSelections.includes(index)} onSelect={(event) => { event.preventDefault(); setDirtyDishSelections(current => current.includes(index) ? current.filter(value => value !== index) : [...current, index]); }}>Select dirty {labelForItem(dish)}</DropdownMenuCheckboxItem>)}
          {dirtyDishSelections.length > 0 && <DropdownMenuItem onSelect={washSelectedDishes}>Wash selected dishes ({dirtyDishSelections.length})</DropdownMenuItem>}
          {cleanDishes.map((dish, index) => <DropdownMenuCheckboxItem key={`pick-up-clean-${dish}-${index}`} checked={cleanDishSelections.includes(index)} onSelect={(event) => { event.preventDefault(); setCleanDishSelections(current => current.includes(index) ? current.filter(value => value !== index) : [...current, index]); }}>Select clean {labelForItem(dish)}</DropdownMenuCheckboxItem>)}
          {cleanDishSelections.length > 0 && <DropdownMenuItem onSelect={pickUpSelectedCleanDishes}>Pick up selected clean dishes ({cleanDishSelections.length})</DropdownMenuItem>}
          {(actions.kitchenSink || []).filter(action => action.value !== "wash").map(action => <DropdownMenuItem key={action.value} onSelect={() => executeAction(item, action.value)}>{action.label}</DropdownMenuItem>)}
        </>
        : inventoryKind ? <>
          {carriedItems.map((carried, index) => ({ carried, index })).filter(({ carried }) => carried.startsWith("held-clean-") && (
            (inventoryKind === "dishCabinet" && storageForItem(dishType(carried)).label === "dish cabinet") ||
            (inventoryKind === "silverwareDrawer" && storageForItem(dishType(carried)).label === "silverware drawer") ||
            (inventoryKind === "cookwareCabinet" && storageForItem(dishType(carried)).label === "cookware cabinet")
          )).map(({ carried, index }) => <DropdownMenuItem key={`put-away-${carried}-${index}`} onSelect={() => putCarriedCleanDishAway(index)}>Put clean {labelForItem(dishType(carried))} back in the {storageForItem(dishType(carried)).label}</DropdownMenuItem>)}
          <DropdownMenuLabel>Select one or more items</DropdownMenuLabel>
          {inventoryForMenu(inventoryKind).map(entry => <DropdownMenuCheckboxItem key={entry.id} checked={selectedInventoryItems.includes(entry.id)} onSelect={(event) => { event.preventDefault(); toggleInventorySelection(inventoryKind, entry.id, !selectedInventoryItems.includes(entry.id)); }}>Get {entry.label}</DropdownMenuCheckboxItem>)}
          <DropdownMenuItem disabled={!selectedInventoryItems.length} onSelect={() => takeSelectedInventoryItems(inventoryKind)}>Get selected items ({selectedInventoryItems.length})</DropdownMenuItem>
          {selectedInventoryItems.length > 0 && <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setInventorySelections(current => ({ ...current, [inventoryKind]: [] })); }}>Clear selected items</DropdownMenuItem>}
        </>
        : item.kind === "bins" ? <>
          {carriedItems.map((carried, index) => ({ carried, index })).filter(({ carried }) => ["held-empty-milk-carton", "held-empty-water-bottle", "held-empty-juice-carton", "held-empty-soda-can"].includes(carried)).map(({ carried, index }) => <DropdownMenuSub key={`bin-${carried}-${index}`}>
            <DropdownMenuSubTrigger>{labelForItem(carried).replace(" being carried", "")}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent aria-label={`${labelForItem(carried)} disposal options`}>
              <DropdownMenuItem onSelect={() => disposeCarriedContainer(index, true)}>Put in recycling</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => disposeCarriedContainer(index, false)}>Put in garbage</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>)}
          {!carriedItems.some(value => value.startsWith("held-empty-") && ["milk-carton", "water-bottle", "juice-carton", "soda-can"].some(container => value.endsWith(container))) && <DropdownMenuItem disabled>No empty containers are being carried</DropdownMenuItem>}
          {indoorGarbage.length > 0 && !carriedWaste && <DropdownMenuItem onSelect={() => takeWasteOutside("garbage")}>Tie garbage bag and carry it outside ({indoorGarbage.length} items)</DropdownMenuItem>}
          {indoorRecycling.length > 0 && !carriedWaste && <DropdownMenuItem onSelect={() => takeWasteOutside("recycling")}>Collect recycling and carry it outside ({indoorRecycling.length} items)</DropdownMenuItem>}
          {carriedWaste && <DropdownMenuItem disabled>You are already carrying {carriedWaste.type} outside</DropdownMenuItem>}
        </>
        : item.kind === "outdoorGarbageBin" ? <>
          {carriedWaste?.type === "garbage" ? <DropdownMenuItem onSelect={() => putWasteInOutdoorBin("garbage")}>Put carried garbage in outdoor bin</DropdownMenuItem> : <DropdownMenuItem disabled>{carriedWaste ? "You are carrying recycling; use the outdoor recycling bin" : "No garbage bag is being carried"}</DropdownMenuItem>}
        </>
        : item.kind === "outdoorRecyclingBin" ? <>
          {carriedWaste?.type === "recycling" ? <DropdownMenuItem onSelect={() => putWasteInOutdoorBin("recycling")}>Put carried recycling in outdoor bin</DropdownMenuItem> : <DropdownMenuItem disabled>{carriedWaste ? "You are carrying garbage; use the outdoor garbage bin" : "No recycling is being carried"}</DropdownMenuItem>}
        </>
        : actionsForFurniture(item).map(action => <DropdownMenuItem key={action.value} aria-label={`${action.label}. ${action.description}`} onSelect={() => executeAction(item, action.value)}>
          {action.label}
        </DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>;
  }

  return (
    <main id="main-content" className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="ambient ambient-one" aria-hidden="true" /><div className="ambient ambient-two" aria-hidden="true" />

      {screen === "menu" && <section className="menu-panel" aria-labelledby="game-title">
        <p className="eyebrow">An accessible life simulation</p>
        <h1 id="game-title" ref={headingRef} tabIndex={-1}>Everyday Life</h1>
        <p className="intro">Create a character, choose a home, and build a life one choice at a time.</p>
        <nav className="menu-actions" aria-label="Main menu">
          <button className="primary-button" onClick={continueGame} disabled={!saveReady || !savedName}>{saveReady ? `Continue${savedName ? ` as ${savedName}` : ""}` : "Loading saved game…"}</button>
          <button className="secondary-button" onClick={startNew}>New game</button>
        </nav>
        <p className="menu-note" role="status" aria-live="polite">{saveReady && !savedName ? "Continue becomes available after you create and name your first character." : saveStatus}</p>
        <div className="menu-sound">{soundControl}</div>
      </section>}

      {screen === "create" && <section className="creator-panel" aria-labelledby="creator-title">
        <header className="creator-header"><div><p className="eyebrow">New game · Step 1 of 2</p><h1 id="creator-title" ref={headingRef} tabIndex={-1}>Create your character</h1></div><button className="quiet-button" onClick={() => setScreen("menu")}>Back to main menu</button></header>
        <p className="creator-intro">Use the drop-down menus below to decide how your character looks and what they carry. Every choice can be changed before you continue.</p>
        <form onSubmit={(e) => { e.preventDefault(); setNameOpen(true); }}>
          <div className="form-grid">{fields.map((field, index) => <div className="field" key={field.key}>
            <label htmlFor={field.key}><span className="field-number">{index + 1}</span>{field.label}</label>
            <select id={field.key} value={character[field.key]} aria-describedby={`${field.key}-help`} onChange={(e) => updateCharacterChoice(field, e.target.value)}>{optionsForField(field).map(option => <option key={option}>{option}</option>)}</select>
            <p id={`${field.key}-help`} className="field-help">{field.help}</p>
          </div>)}</div>
          <div className="finish-row"><p>All choices ready? The next step is naming your character.</p><button className="primary-button" type="submit">Finish character</button></div>
        </form>
      </section>}

      {screen === "house" && <section className="creator-panel house-panel" aria-labelledby="house-title">
        <header className="creator-header"><div><p className="eyebrow">New game · Step 2 of 2</p><h1 id="house-title" ref={headingRef} tabIndex={-1}>Choose your home</h1></div><button className="quiet-button" onClick={() => setScreen("create")}>Back to character</button></header>
        <p className="creator-intro">Every home includes a kitchen, living room, bedroom, bathroom, television, and fully interactive furniture.</p>
        <form onSubmit={chooseHouse}>
          <fieldset className="house-grid"><legend className="sr-only">Available homes</legend>
            {Object.entries(homes).map(([key, home]) => <label className={`house-card ${houseChoice === key ? "selected" : ""}`} key={key}>
              <input type="radio" name="home" value={key} checked={houseChoice === key} onChange={(e) => { setHouseChoice(e.target.value); audio().playSelection(); }} />
              <span className="house-copy"><strong>{home.name}</strong><span>{home.tagline}</span><span>{home.bedrooms}. {home.description}</span></span>
            </label>)}
          </fieldset>
          <div className="finish-row"><p>Your home choice is saved with your character.</p><button className="primary-button" type="submit">Move into this home</button></div>
        </form>
      </section>}

      {screen === "home" && currentHome && <section className="game-panel" aria-labelledby="room-title">
        <header className="game-header"><div><p className="eyebrow">{currentHome.name}</p><p className="player-name">Playing as {savedName} · Household account: ${householdFunds}</p></div><div className="game-controls">{soundControl}<button className="quiet-button" onClick={saveGame}>Save game</button><button className="quiet-button" onClick={() => setScreen("menu")}>Main menu</button></div></header>
        <div className="movement-status" role="status" aria-live="assertive" aria-atomic="true">{movementAnnouncement}</div>
        <div className="movement-status" role="alert" aria-live="assertive" aria-atomic="true">{actionAnnouncement}</div>
        {room === "groceryStore" ? <article id="room-grocery-store" className="room" aria-labelledby="room-title">
          <p className="eyebrow">Shopping location</p><h1 id="room-title" ref={headingRef} tabIndex={-1}>Everyday Market</h1>
          <p className="room-description layout-description">You are inside a neighborhood grocery store. Produce is immediately to the right, dairy and eggs line the coolers along the back wall, meat and seafood are at the back-left counter, bakery and pantry aisles fill the center, drinks are on the left wall, and frozen foods are in low freezer cases near checkout.</p>
          <p className="room-description">Open a department, check any number of products, then open the shopping cart to review and buy them. Purchased groceries stay in bags until the character returns home.</p>
          <div className="finish-row">{shoppingCartMenu("grocery")}</div>
          <h2>Grocery departments</h2>
          <div className="furniture-grid">{[...new Set(groceryProducts.map(product => product.department))].map(department => <div className="furniture-item" key={department}>{groceryDepartmentMenu(department)}</div>)}</div>
        </article> : room === "furnitureStore" ? <article id="room-furniture-store" className="room" aria-labelledby="room-title">
          <p className="eyebrow">Shopping location</p><h1 id="room-title" ref={headingRef} tabIndex={-1}>HomeStyle Furniture Store</h1>
          <p className="room-description layout-description">You are in a large furniture showroom. Sofas and chairs form comfortable conversation groups near the entrance. Beds are arranged in quiet displays along the right side. Dining, coffee, and side tables occupy the center. Televisions are demonstrated along the back wall.</p>
          <p className="room-description">Activate a product to hear its material and choose one or more colors. Every product is offered in pink, blue, black, white, gray, green, aqua, purple, dark green, and beige.</p>
          <div className="finish-row">{shoppingCartMenu("furniture")}</div>
          {[...new Set(furnitureProducts.map(product => product.category))].map(category => <section key={category} aria-labelledby={"category-" + category.replaceAll(" ", "-").toLowerCase()}>
            <h2 id={"category-" + category.replaceAll(" ", "-").toLowerCase()}>{category}</h2>
            <div className="furniture-grid">{furnitureProducts.filter(product => product.category === category).map(product => <div className="furniture-item" key={product.id}>{furnitureProductMenu(product)}</div>)}</div>
          </section>)}
        </article> : room === "outside" ? <article id="room-outside" className="room" aria-labelledby="room-title">
          <p className="eyebrow">Current location · {outsidePeriod}</p><h1 id="room-title" ref={headingRef} tabIndex={-1}>{outdoorAreas[savedHouse].name}</h1>
          <p className="room-description layout-description">{outdoorAreas[savedHouse].description}</p>
          <p className="room-description">{outdoorSoundDescriptions[outsidePeriod]}</p>
          {carriedWaste && <p className="room-description"><strong>Currently carrying:</strong> {carriedWaste.type} containing {carriedWaste.items.length} {carriedWaste.items.length === 1 ? "item" : "items"}.</p>}
          <h2>Outdoor objects</h2>
          <p className="instruction">Activate the correct bin to empty what your character carried outside.</p>
          <div className="furniture-grid">
            <div className="furniture-item">{objectMenu({ label: "Front door", kind: "frontDoor", description: "The front door leads back inside your home." })}</div>
            <div className="furniture-item">{objectMenu({ label: "Outdoor garbage bin", kind: "outdoorGarbageBin", description: "A sturdy lidded bin for household garbage." })}</div>
            <div className="furniture-item">{objectMenu({ label: "Outdoor recycling bin", kind: "outdoorRecyclingBin", description: "A clearly marked lidded bin for recyclable containers." })}</div>
          </div>
        </article> : room === "entrance" ? <article id="room-entrance" className="room" aria-labelledby="room-title">
          <p className="eyebrow">Current location</p><h1 id="room-title" ref={headingRef} tabIndex={-1}>Front entrance</h1>
          <p className="room-description layout-description">{layouts[savedHouse].entrance}</p>
          <h2>Furniture and objects</h2>
          <div className="furniture-grid">
            <div className="furniture-item">{objectMenu({ label: "Front door", kind: "frontDoor", description: "The front door leads outside." })}</div>
            <div className="furniture-item">{objectMenu({ label: "Entrance mirror", kind: "mirror", description: "A wall mirror beside the front door shows your complete appearance." })}</div>
          </div>
          <h2>Where would you like to go?</h2><p className="instruction">Use the room links below. Your direction and destination will be announced as you move.</p>
        </article> : currentRoom && <article id={`room-${room}`} className="room" aria-labelledby="room-title">
          <p className="eyebrow">Current room</p><h1 id="room-title" ref={headingRef} tabIndex={-1}>{currentRoom.name}</h1>
          <p className="room-description layout-description">{layouts[savedHouse].positions[room]?.location}</p>
          <p className="room-description">{currentRoom.description}</p>
          {room === "kitchen" && <p className="room-description"><strong>Kitchen item locations:</strong> Kitchen counter: {counterItems.length ? counterItems.map(labelForItem).join(", ") : "empty"}. Range-side prep counter: {prepCounterItems.length ? prepCounterItems.map(labelForItem).join(", ") : "empty"}. Range: {activeCookware ? `${stoveOn ? "on" : "off"}; ${labelForItem(activeCookware)}${finishedMeal ? ` containing finished ${recipes[finishedRecipe || ""]?.cookedLabel || labelForItem(finishedMeal)}` : cookingIngredients.length ? ` containing ${cookingIngredients.map(labelForItem).join(", ")}` : "; empty"}` : "off and empty"}.</p>}
          <h2>Furniture and objects</h2>
          <p className="instruction">Activate an object to open its action menu. Choosing an item performs it and closes the menu.</p>
          <div className="furniture-grid">
            {room === "kitchen" && <div className="furniture-item">{objectMenu({ label: "Kitchen counter", kind: "counter", description: counterItems.length ? `${counterItems.length} items are on the counter.` : "The counter is clear." })}</div>}
            {room === "kitchen" && <div className="furniture-item">{objectMenu({ label: "Range-side prep counter", kind: "prepCounter", description: prepCounterItems.length ? `${prepCounterItems.length} items are ready beside the range.` : "A small clear counter beside the range for plates, cooked food, and meal assembly." })}</div>}
            {room === "kitchen" && <div className="furniture-item">{objectMenu({ label: "Garbage and recycling bins", kind: "bins", description: "Separate bins for garbage and recyclable containers." })}</div>}
            {room === "kitchen" && <div className="furniture-item">{objectMenu({ label: "Dish cabinet", kind: "dishCabinet", description: "A cabinet containing drinking glasses, plates, coffee mugs, and bowls." })}</div>}
            {room === "kitchen" && <div className="furniture-item">{objectMenu({ label: "Cookware cabinet", kind: "cookwareCabinet", description: "A cabinet containing pots, pans, baking dishes, and trays." })}</div>}
            {room === "kitchen" && <div className="furniture-item">{objectMenu({ label: "Pantry cabinet", kind: "pantry", description: "A pantry containing sugar, powdered creamer, pasta, rice, cereal, and flour." })}</div>}
            {room === "kitchen" && <div className="furniture-item">{objectMenu({ label: "Silverware drawer", kind: "silverwareDrawer", description: "A drawer organized with forks, spoons, knives, and teaspoons." })}</div>}
            {room === "kitchen" && <div className="furniture-item">{objectMenu({ label: "Coffee machine", kind: "coffeeMachine", description: "A coffee machine beside clean mugs, sugar, and creamer." })}</div>}
            {baseFurnitureEntries.filter(entry => entry.placement.room === room).map(({ id, item, placement }) => {
              const positionName = furniturePositionOptions.find(option => option.id === placement.position)?.label || "in the room";
              const trackedItem = item.kind === "stove" && activeCookware ? { ...item, label: `${labelForItem(activeCookware)} on ${item.label}` } : item;
              return <div className="furniture-item" key={id}>{objectMenu({ ...trackedItem, instanceId: id, description: `${item.description} It is ${positionName}.` })}</div>;
            })}
            {room === "living" && character.laptop !== "No laptop" && <div className="furniture-item">{objectMenu({ label: character.laptop, kind: "laptop", description: "Your personal laptop is charged and ready to use." })}</div>}
            {room === "living" && character.phone !== "No smartphone" && <div className="furniture-item">{objectMenu({ label: character.phone, kind: "phone", description: "Your personal cell phone is charged and connected." })}</div>}
            {ownedFurniture.filter(furniture => furniture.room === room).map(furniture => {
              const positionName = furniturePositionOptions.find(option => option.id === furniture.position)?.label || "in the room";
              return <div className="furniture-item" key={furniture.id}>{objectMenu({ label: furniture.label, kind: furniture.label.includes("television") ? "tv" : "purchasedFurniture", description: `A furniture-store purchase ${positionName} in the ${currentRoom.name.toLowerCase()}.`, instanceId: furniture.id })}</div>;
            })}
          </div>
        </article>}
        {room === "outside" || room === "groceryStore" || room === "furnitureStore" ? <nav className="room-nav" aria-label="Places to go">
          {room !== "outside" && <a href="#room-outside" onClick={(event) => { event.preventDefault(); leaveStore(); }}>Return to neighborhood</a>}
          <a href="#room-grocery-store" aria-current={room === "groceryStore" ? "page" : undefined} onClick={(event) => { event.preventDefault(); travelToStore("groceryStore"); }}>Grocery store</a>
          <a href="#room-furniture-store" aria-current={room === "furnitureStore" ? "page" : undefined} onClick={(event) => { event.preventDefault(); travelToStore("furnitureStore"); }}>Furniture store</a>
          {["Job", "Electronics store"].map(destination => <a key={destination} href="#room-outside" onClick={(event) => { event.preventDefault(); previewDestination(destination); }}>{destination}</a>)}
        </nav> : <nav className="room-nav" aria-label="Move to another room">
          <a href="#room-entrance" aria-current={room === "entrance" ? "page" : undefined} onClick={(e) => { e.preventDefault(); moveToEntrance(); }}>Front entrance</a>
          {(Object.keys(currentHome.rooms) as RoomKey[]).map(key => {
            const destination = currentHome.rooms[key];
            return destination ? <a key={key} href={`#room-${key}`} aria-current={room === key ? "page" : undefined} onClick={(e) => { e.preventDefault(); moveTo(key); }}>{destination.name}</a> : null;
          })}
        </nav>}
      </section>}

      <Dialog open={nameOpen} onOpenChange={setNameOpen}><DialogContent aria-describedby="name-description"><form onSubmit={saveName}>
        <DialogHeader><DialogTitle>What should we call you?</DialogTitle><DialogDescription id="name-description">Enter your character’s name.</DialogDescription></DialogHeader>
        <label className="name-label" htmlFor="character-name">Character name</label><input id="character-name" className="name-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" autoFocus required />
        <DialogFooter><button type="button" className="quiet-button" onClick={() => setNameOpen(false)}>Cancel</button><button type="submit" className="primary-button">OK</button></DialogFooter>
      </form></DialogContent></Dialog>

    </main>
  );
}
