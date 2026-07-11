export const stock = [
  { id: 1, itemName: "Rice", category: "Grains", unit: "KG", openingStock: 62, purchased: 30, consumed: 75, wastage: 5, minimumStock: 20 },
  { id: 2, itemName: "Dal", category: "Pulses", unit: "KG", openingStock: 70, purchased: 35, consumed: 42, wastage: 2, minimumStock: 20 },
  { id: 3, itemName: "Cooking Oil", category: "Essentials", unit: "Litres", openingStock: 32, purchased: 15, consumed: 32, wastage: 1, minimumStock: 18 },
  { id: 4, itemName: "Milk", category: "Dairy", unit: "Litres", openingStock: 45, purchased: 80, consumed: 108, wastage: 4, minimumStock: 20 },
  { id: 5, itemName: "Eggs", category: "Protein", unit: "Pieces", openingStock: 420, purchased: 300, consumed: 260, wastage: 10, minimumStock: 100 },
  { id: 6, itemName: "Tomato", category: "Vegetables", unit: "KG", openingStock: 30, purchased: 18, consumed: 35, wastage: 5, minimumStock: 15 },
  { id: 7, itemName: "Onion", category: "Vegetables", unit: "KG", openingStock: 75, purchased: 25, consumed: 36, wastage: 3, minimumStock: 20 },
  { id: 8, itemName: "Potato", category: "Vegetables", unit: "KG", openingStock: 90, purchased: 40, consumed: 48, wastage: 4, minimumStock: 25 },
  { id: 9, itemName: "Sugar", category: "Essentials", unit: "KG", openingStock: 31, purchased: 10, consumed: 24, wastage: 1, minimumStock: 20 },
  { id: 10, itemName: "Tea Powder", category: "Beverages", unit: "KG", openingStock: 20, purchased: 8, consumed: 9, wastage: 1, minimumStock: 8 },
];

export const purchaseHistory = [
  { id: 1, purchaseId: "PUR-2026-071", date: "11 Jul 2026", supplier: "Sri Lakshmi Traders", item: "Rice", quantity: 100, unit: "KG", amount: "₹5,000", institution: "BLR Stay " },
  { id: 2, purchaseId: "PUR-2026-070", date: "11 Jul 2026", supplier: "Nandini Dairy", item: "Milk", quantity: 80, unit: "Litres", amount: "₹4,480", institution: "BLR Stay " },
  { id: 3, purchaseId: "PUR-2026-069", date: "10 Jul 2026", supplier: "Fresh Farms", item: "Eggs", quantity: 300, unit: "Pieces", amount: "₹2,100", institution: "BLR Stay " },
  { id: 4, purchaseId: "PUR-2026-068", date: "10 Jul 2026", supplier: "Metro Wholesale", item: "Cooking Oil", quantity: 25, unit: "Litres", amount: "₹3,750", institution: "BLR Stay" },
];

export const consumption = [
  { id: 1, date: "11 Jul 2026", mealType: "Breakfast", item: "Milk", quantityUsed: 18, unit: "Litres", remarks: "Tea and breakfast service" },
  { id: 2, date: "11 Jul 2026", mealType: "Lunch", item: "Rice", quantityUsed: 28, unit: "KG", remarks: "Regular lunch service" },
  { id: 3, date: "11 Jul 2026", mealType: "Lunch", item: "Dal", quantityUsed: 12, unit: "KG", remarks: "Regular lunch service" },
  { id: 4, date: "11 Jul 2026", mealType: "Dinner", item: "Vegetables", quantityUsed: 20, unit: "KG", remarks: "Mixed vegetable curry" },
  { id: 5, date: "11 Jul 2026", mealType: "Dinner", item: "Cooking Oil", quantityUsed: 4, unit: "Litres", remarks: "Dinner preparation" },
];

export const wastage = [
  { id: 1, date: "11 Jul 2026", item: "Milk", quantity: "2 Litres", reason: "Expired", recordedBy: "Sudheer" },
  { id: 2, date: "11 Jul 2026", item: "Tomato", quantity: "3 KG", reason: "Spoiled", recordedBy: "Sudheer" },
  { id: 3, date: "10 Jul 2026", item: "Eggs", quantity: "10 Pieces", reason: "Damaged", recordedBy: "Sudheer" },
  { id: 4, date: "10 Jul 2026", item: "Rice", quantity: "2 KG", reason: "Over Cooked", recordedBy: "Sudheer" },
];

export const lowStock = [
  { id: 1, item: "Rice", available: 12, minimum: 20, unit: "KG" },
  { id: 2, item: "Milk", available: 13, minimum: 20, unit: "Litres" },
  { id: 3, item: "Cooking Oil", available: 14, minimum: 18, unit: "Litres" },
  { id: 4, item: "Sugar", available: 16, minimum: 20, unit: "KG" },
  { id: 5, item: "Tomato", available: 8, minimum: 15, unit: "KG" },
];
