import type { PantryItem } from "~/types/PantryItem";

const today = new Date();
const getDummyDate = (daysOffset: number) =>
  new Date(today.getTime() + daysOffset * 24 * 60 * 60 * 1000);

const createDummyItem = (
  id: string,
  name: string,
  quantity: number,
  unit: string,
  daysToExpiry: number,
  category: string,
  imageUrl: any,
  type: "fridge" | "cabinet" | "freezer",
  backgroundColor: string,
  stepsToStore: PantryItem["steps_to_store"] = []
): PantryItem => ({
  id,
  name,
  quantity,
  unit,
  expiry_date: getDummyDate(daysToExpiry),
  category,
  image_url: imageUrl,
  type,
  background_color: backgroundColor,
  x: 0,
  y: 0,
  scale: 1,
  created_at: getDummyDate(0),
  updated_at: getDummyDate(0),
  steps_to_store: stepsToStore,
});

export const dummyPantryItems: PantryItem[] = [
  createDummyItem(
    "1",
    "Tomatoes",
    5,
    "units",
    3,
    "Vegetables",
    require("~/assets/images/tomato.png"),
    "fridge",
    "#FF6347",
    [
      {
        id: "1",
        title: "Clean the tomatoes",
        description: "Wash the tomatoes with water and dry them with a towel.",
        sequence: 1,
      },
      {
        id: "2",
        title: "Wash the tomatoes",
        description: "Wash the tomatoes with water and dry them with a towel.",
        sequence: 2,
      },
      {
        id: "3",
        title: "Dry the tomatoes",
        description: "Dry the tomatoes with a towel.",
        sequence: 3,
      },
    ]
  ),
  createDummyItem(
    "2",
    "Chicken Breast",
    900,
    "g",
    1,
    "Meat",
    require("~/assets/images/chicken-breast.png"),
    "fridge",
    "#FF6347"
  ),

  createDummyItem(
    "3",
    "Pasta",
    500,
    "g",
    365,
    "Grains",
    require("~/assets/images/pasta.png"),
    "fridge",
    "#FF6347"
  ),
  createDummyItem(
    "4",
    "Potato",
    500,
    "g",
    365,
    "Vegetables",
    require("~/assets/images/potato.png"),
    "fridge",
    "#FF6347"
  ),
  createDummyItem(
    "5",
    "Onions",
    3,
    "units",
    10,
    "Vegetables",
    require("~/assets/images/onion.png"),
    "fridge",
    "#FF6347"
  ),
  createDummyItem(
    "6",
    "Garlic",
    1,
    "units",
    30,
    "Vegetables",
    require("~/assets/images/garlic.png"),
    "fridge",
    "#FF6347"
  ),
  createDummyItem(
    "7",
    "Milk",
    3.8,
    "L",
    -2,
    "Dairy",
    require("~/assets/images/milk.png"),
    "fridge",
    "#FF6347"
  ),
  createDummyItem(
    "8",
    "Flour",
    1,
    "kg",
    -2,
    "Baking",
    require("~/assets/images/cabinet/flour.png"),
    "cabinet",
    "#FF6347"
  ),
  createDummyItem(
    "9",
    "Sugar",
    500,
    "g",
    -2,
    "Baking",
    require("~/assets/images/cabinet/sugar.png"),
    "cabinet",
    "#FF6347"
  ),
  createDummyItem(
    "10",
    "Pasta",
    1,
    "box",
    -2,
    "Baking",
    require("~/assets/images/cabinet/pasta.png"),
    "cabinet",
    "#FF6347"
  ),
  createDummyItem(
    "11",
    "Rice",
    2,
    "lbs",
    -2,
    "Baking",
    require("~/assets/images/cabinet/rice.png"),
    "cabinet",
    "#FF6347"
  ),
  createDummyItem(
    "13",
    "Green crab",
    6,
    "pieces",
    2,
    "Seafood",
    require("~/assets/images/crab.png"),
    "fridge",
    "#4CAF50"
  ),
  createDummyItem(
    "14",
    "Coconut milk",
    400,
    "ml",
    7,
    "Dairy",
    require("~/assets/images/coconut-milk.png"),
    "cabinet",
    "#FFF8DC"
  ),
  createDummyItem(
    "15",
    "Black cod",
    750,
    "g",
    3,
    "Seafood",
    require("~/assets/images/fish.png"),
    "fridge",
    "#2C3E50"
  ),
  createDummyItem(
    "16",
    "Ginger",
    200,
    "g",
    14,
    "Vegetables",
    require("~/assets/images/cabinet/rice.png"),
    "fridge",
    "#DEB887"
  ),
  createDummyItem(
    "17",
    "Oysters",
    12,
    "pieces",
    2,
    "Seafood",
    require("~/assets/images/cabinet/rice.png"),
    "fridge",
    "#B8860B"
  ),
  createDummyItem(
    "18",
    "Avocado",
    4,
    "pieces",
    5,
    "Fruits",
    require("~/assets/images/cabinet/rice.png"),
    "fridge",
    "#228B22"
  ),
  createDummyItem(
    "19",
    "Bell pepper",
    3,
    "pieces",
    7,
    "Vegetables",
    require("~/assets/images/cabinet/rice.png"),
    "fridge",
    "#FF4500"
  ),
  createDummyItem(
    "20",
    "Curry block",
    2,
    "blocks",
    365,
    "Spices",
    require("~/assets/images/cabinet/rice.png"),
    "cabinet",
    "#DAA520"
  ),
  createDummyItem(
    "21",
    "Soy sauce",
    500,
    "ml",
    180,
    "Condiments",
    require("~/assets/images/cabinet/rice.png"),
    "cabinet",
    "#8B4513"
  ),
  createDummyItem(
    "22",
    "Olive oil",
    750,
    "ml",
    365,
    "Oils",
    require("~/assets/images/cabinet/rice.png"),
    "cabinet",
    "#556B2F"
  ),
  createDummyItem(
    "23",
    "Bacon",
    250,
    "g",
    5,
    "Meat",
    require("~/assets/images/cabinet/rice.png"),
    "fridge",
    "#D2691E"
  ),
  createDummyItem(
    "24",
    "Lemon",
    3,
    "pieces",
    10,
    "Fruits",
    require("~/assets/images/cabinet/rice.png"),
    "fridge",
    "#FFFF00"
  ),
];
