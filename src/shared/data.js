/**
 * ============================================================================
 * Freshioz Enterprise Master Data Store (Static Schema & Clean Seed State)
 * ============================================================================
 * Clean database state for testing the complete end-to-end operational flow.
 * Only the Master Super Administrator account is retained.
 */

// ============================================================================
// 1. WAREHOUSES (Primary Regional Sorting & Crating Agri-Logistics Hubs)
// ============================================================================
export const INITIAL_WAREHOUSES = [];


// ============================================================================
// 3. EMPLOYEES & ROLE ASSIGNMENTS
// Retains ONLY Super Admin for clean authentication
// ============================================================================
export const INITIAL_EMPLOYEES = [
  {
    id: 'FRZ_EMP_101',
    uuid: 'e1010000-0000-4000-8000-000000000101',
    name: 'Super Admin',
    phone: '9999999999',
    email: 'superadmin@gmail.com',
    roles: ['SUPER_ADMIN'],
    assignedWarehouseId: 'ALL',
    assignedLocationType: 'HEADQUARTERS',
    assignedLocationName: 'Freshioz HQ Command Center',
    status: 'ACTIVE',
    dateJoined: '2026-01-01',
    authMethod: 'PASSWORD',
    password: '123456',
    notes: 'Platform Director & Master Operations Head'
  }
];

// ============================================================================
// 4. SOCIETIES & APARTMENT COMMUNITIES
// ============================================================================
export const INITIAL_SOCIETIES = [];

// ============================================================================
// 5. PRODUCE CATEGORIES (Master Taxonomies)
// ============================================================================
export const INITIAL_CATEGORIES = [
  { id: 'VEGETABLES', name: 'Fresh Vegetables', slug: 'vegetables', icon: '🥦', description: 'Daily farm-fresh kitchen essentials and root vegetables', status: 'ACTIVE' },
  { id: 'FRUITS', name: 'Fresh Fruits', slug: 'fresh-fruits', icon: '🍎', description: 'Sweet, tree-ripened orchard and citrus fruits', status: 'ACTIVE' }
];

// ============================================================================
// 6. PACKAGING UNITS (Simplified Master Units)
// ============================================================================
export const INITIAL_UNITS = [
  { id: 'u-kg', name: 'kg', label: 'Kilogram (kg)', description: 'Standard consumer produce weight', status: 'ACTIVE' },
  { id: 'u-tones', name: 'tones', label: 'Metric Ton (tones)', description: 'Mandi truckloads and warehouse handling', status: 'ACTIVE' },
  { id: 'u-crate', name: 'crate', label: 'Standard Crate (crate)', description: 'Standard 20kg APMC harvesting / shipping crate', status: 'ACTIVE' },
  { id: 'u-g', name: 'g', label: 'Grams (g)', description: 'Punnet packs & small quantities (e.g., 250g, 500g)', status: 'ACTIVE' },
  { id: 'u-pack', name: 'pack', label: 'Prepack Polybag (pack)', description: 'Pre-sorted combo vegetables & tray packs', status: 'ACTIVE' },
  { id: 'u-bunch', name: 'bunch', label: 'Harvest Bunch (bunch)', description: 'Fresh leafy greens and herbs tied bunch', status: 'ACTIVE' }
];

// ============================================================================
// 7. PRODUCE CATALOG & PRODUCTS
// ============================================================================
export const INITIAL_PRODUCTS = [
  // ================= 10 VEGETABLES =================
  {
    id: 'PRD_VEG_TOMATO_DESI',
    name: 'Desi Country Tomato (Nati Tomato)',
    kannadaName: 'ನಾಟಿ ಟೊಮೆಟೊ (నాటి టొమేటో)',
    categoryId: 'VEGETABLES',
    retailUnit: '1 kg',
    retailPrice: 32.0,
    retailMarketPrice: 45.0,
    bulkMinQty: 5.0,
    bulkDiscountPercent: 12.0,
    origin: 'Kolar APMC Mandi',
    shelfLife: '4-5 Days',
    desc: 'Sun-ripened, tangy country tomatoes harvested at dawn. Ideal for rasam, curries, and dal.',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600',
    badge: 'Harvested Today at Dawn',
    tags: ['Daily Essential', 'Farm Fresh', 'Bestseller'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_VEG_TOMATO_HYBRID',
    name: 'Hybrid Cooking Tomato (Firm Grade-A)',
    kannadaName: 'ಹೈಬ್ರಿಡ್ ಟೊಮೆಟೊ (హైబ్రిడ్ టొమేటో)',
    categoryId: 'VEGETABLES',
    retailUnit: '1 kg',
    retailPrice: 28.0,
    retailMarketPrice: 40.0,
    bulkMinQty: 5.0,
    bulkDiscountPercent: 10.0,
    origin: 'Madanapalle Mandi Yard',
    shelfLife: '5-7 Days',
    desc: 'Firm, fleshy hybrid tomatoes with thick skins and longer shelf life. Perfect for slicing and gravies.',
    image: 'https://images.unsplash.com/photo-1582284540020-8acbe03f4924?w=600',
    badge: 'Kitchen Staple',
    tags: ['Gravy Special', 'Long Shelf Life'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_VEG_ONION_NASHIK',
    name: 'Fresh Red Onion (Nashik Quality)',
    kannadaName: 'ನಾಶಿಕ್ ಕೆಂಪು ಈರುಳ್ಳಿ (ఎర్ర ఉల్లిపాయ)',
    categoryId: 'VEGETABLES',
    retailUnit: '1 kg',
    retailPrice: 38.0,
    retailMarketPrice: 50.0,
    bulkMinQty: 5.0,
    bulkDiscountPercent: 10.0,
    origin: 'Lasalgaon Mandi, Nashik',
    shelfLife: '10-14 Days',
    desc: 'Pungent, dry-skinned medium red onions with tight layers. A must-have base for Indian cuisine.',
    image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600',
    badge: 'Grade-A Medium',
    tags: ['Daily Essential', 'Storable'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_VEG_POTATO_JYOTI',
    name: 'New Crop Jyoti Potato (Mud-Free)',
    kannadaName: 'ಜ್ಯೋತಿ ಆಲೂಗಡ್ಡೆ (బంగాళాదుంప)',
    categoryId: 'VEGETABLES',
    retailUnit: '1 kg',
    retailPrice: 30.0,
    retailMarketPrice: 42.0,
    bulkMinQty: 5.0,
    bulkDiscountPercent: 10.0,
    origin: 'Hassan APMC Mandi',
    shelfLife: '12-15 Days',
    desc: 'Clean, thin-skinned golden potatoes. Great for boiling, curries, roasting, and shallow frying.',
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600',
    badge: 'Mud-Free & Clean',
    tags: ['Daily Essential', 'Kid Favorite'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_VEG_CAPSICUM_GREEN',
    name: 'Crisp Green Capsicum (Bell Pepper)',
    kannadaName: 'ಹಸಿರು ಕ್ಯಾಪ್ಸಿಕಂ (బెంగళూరు మిరప)',
    categoryId: 'VEGETABLES',
    retailUnit: '500 g',
    retailPrice: 34.0,
    retailMarketPrice: 45.0,
    bulkMinQty: 2.0,
    bulkDiscountPercent: 10.0,
    origin: 'Hosur Polyhouse Farms',
    shelfLife: '4-6 Days',
    desc: 'Thick-walled, crunchy green bell peppers with a sweet herbaceous flavor. Perfect for stir-fries and noodles.',
    image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600',
    badge: 'Polyhouse Fresh',
    tags: ['Crunchy', 'Salad & Stir Fry'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_VEG_BHINDI_OKRA',
    name: "Tender Green Lady's Finger (Bhindi / Okra)",
    kannadaName: 'ಎಳೆ ಬೆಂಡೆಕಾಯಿ (లేత బెండకాయ)',
    categoryId: 'VEGETABLES',
    retailUnit: '500 g',
    retailPrice: 26.0,
    retailMarketPrice: 38.0,
    bulkMinQty: 2.0,
    bulkDiscountPercent: 12.0,
    origin: 'Chikkaballapur Farms',
    shelfLife: '3-4 Days',
    desc: 'Super tender, easy-to-snap small green bhendi without seeds hardening. Ideal for crispy bhindi fry.',
    image: 'https://images.unsplash.com/photo-1425543103986-22abb7d7e8d2?w=600',
    badge: 'Tender & Snap-Fresh',
    tags: ['Fiber Rich', 'Fry Special'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_VEG_CARROT_OOTY',
    name: 'Ooty Tender Carrot (English Orange)',
    kannadaName: 'ಊಟಿ ಕ್ಯಾರೆಟ್ (ఊటీ క్యారెట్)',
    categoryId: 'VEGETABLES',
    retailUnit: '500 g',
    retailPrice: 36.0,
    retailMarketPrice: 50.0,
    bulkMinQty: 2.0,
    bulkDiscountPercent: 10.0,
    origin: 'Ooty Hill Farms',
    shelfLife: '6-8 Days',
    desc: 'Freshly pulled hill carrots with sweet crunch and bright orange hue. Excellent for salads, juicing and halwa.',
    image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600',
    badge: 'Crunchy & Sweet',
    tags: ['Salad Essential', 'Juicing Special'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_VEG_CAULIFLOWER_WHOLE',
    name: 'Farm Cauliflower (Tight White Curd)',
    kannadaName: 'ಹೂಕೋಸು (కాలీఫ్లవర్)',
    categoryId: 'VEGETABLES',
    retailUnit: '1 pc',
    retailPrice: 35.0,
    retailMarketPrice: 48.0,
    bulkMinQty: 3.0,
    bulkDiscountPercent: 15.0,
    origin: 'Malur APMC Yard',
    shelfLife: '4-5 Days',
    desc: 'Compact, snow-white cauliflower head enveloped with fresh protective leaves. Zero pesticide odor.',
    image: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600',
    badge: 'Tight White Curd',
    tags: ['Curry Special', 'Farm Harvest'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_VEG_BOTTLE_GOURD',
    name: 'Tender Bottle Gourd (Sorakaya / Lauki)',
    kannadaName: 'ಸೋರೆಕಾಯಿ (సొరకాయ / ఆనపకాయ)',
    categoryId: 'VEGETABLES',
    retailUnit: '1 pc',
    retailPrice: 28.0,
    retailMarketPrice: 40.0,
    bulkMinQty: 3.0,
    bulkDiscountPercent: 10.0,
    origin: 'Local Mandi Belts',
    shelfLife: '5-7 Days',
    desc: 'Light green, seedless tender bottle gourd with high water content. Perfect for cooling curries and juices.',
    image: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=600',
    badge: 'Cooling & Hydrating',
    tags: ['Juicing Essential', 'Weight Care'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_VEG_GREEN_PEAS',
    name: 'Fresh Green Peas (Ooty Sweet Matar)',
    kannadaName: 'ಸಿಹಿ ಹಸಿರು ಬಟಾಣಿ (పచ్చి బఠానీ)',
    categoryId: 'VEGETABLES',
    retailUnit: '500 g',
    retailPrice: 48.0,
    retailMarketPrice: 65.0,
    bulkMinQty: 2.0,
    bulkDiscountPercent: 12.0,
    origin: 'Ooty Hill Valleys',
    shelfLife: '4-5 Days',
    desc: 'Plump, naturally sweet green pea pods harvested fresh from mountain soil. Ideal for pulav and curries.',
    image: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=600',
    badge: 'Sweet Mountain Pods',
    tags: ['Protein Rich', 'Pulav Special'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },

  // ================= 10 FRUITS =================
  {
    id: 'PRD_FRT_BANANA_ROBUSTA',
    name: 'Robusta Golden Banana (Premium Table Grade)',
    kannadaName: 'ಪಚ್ಚ ಬಾಳೆಹಣ್ಣು (ರೋಬಸ್ಟಾ అరటి పండు)',
    categoryId: 'FRUITS',
    retailUnit: '1 kg',
    retailPrice: 38.0,
    retailMarketPrice: 55.0,
    bulkMinQty: 3.0,
    bulkDiscountPercent: 10.0,
    origin: 'Andhra Cauvery Basin',
    shelfLife: '3-5 Days',
    desc: 'Naturally ripened, sweet, nutrient-rich golden bananas without carbide treatment.',
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600',
    badge: 'Naturally Ripened',
    tags: ['Energy Booster', 'Daily Breakfast'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_FRT_APPLE_SHIMLA',
    name: 'Royal Delicious Shimla Apple',
    kannadaName: 'ಶಿಮ್ಲಾ ಸೇಬು (రాయల్ షిమ్లా ఆపిల్)',
    categoryId: 'FRUITS',
    retailUnit: '1 kg',
    retailPrice: 145.0,
    retailMarketPrice: 180.0,
    bulkMinQty: 3.0,
    bulkDiscountPercent: 12.0,
    origin: 'Kinnaur & Shimla Orchards',
    shelfLife: '10-14 Days',
    desc: 'Crisp, aromatic red apples directly harvested from Himachal high-altitude orchards.',
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600',
    badge: 'Sweet & Crunchy',
    tags: ['Antioxidant Rich', 'Premium Quality'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_FRT_ORANGE_NAGPUR',
    name: 'Nagpur Sweet Orange (Mosambi / Mandarin)',
    kannadaName: 'ನಾಗಪುರ ಕಿತ್ತಳೆ (నాగ్‌పూర్ ಬత్తాయి)',
    categoryId: 'FRUITS',
    retailUnit: '1 kg',
    retailPrice: 58.0,
    retailMarketPrice: 80.0,
    bulkMinQty: 3.0,
    bulkDiscountPercent: 12.0,
    origin: 'Nagpur Citrus Belt',
    shelfLife: '7-9 Days',
    desc: 'Juicy, thin-skinned citrus packed with immunity-boosting Vitamin C. Perfect for fresh breakfast juice.',
    image: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600',
    badge: 'High Vitamin C',
    tags: ['Juicing Special', 'Immunity Boost'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_FRT_POMEGRANATE_RUBY',
    name: 'Ruby Red Pomegranate (Bhagawa Anaar)',
    kannadaName: 'ದಾಳಿಂಬೆ (భగవా దానిమ్మ)',
    categoryId: 'FRUITS',
    retailUnit: '1 kg',
    retailPrice: 148.0,
    retailMarketPrice: 190.0,
    bulkMinQty: 3.0,
    bulkDiscountPercent: 10.0,
    origin: 'Solapur Orchards',
    shelfLife: '10-12 Days',
    desc: 'Plump deep ruby-red pearls bursting with sweet juice. Rich in iron and dietary antioxidants.',
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600',
    badge: 'Deep Red Pearls',
    tags: ['Iron Rich', 'Heart Health'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_FRT_GUAVA_PINK',
    name: 'Taiwan Pink Guava (Seeded & Crisp)',
    kannadaName: 'ಗುಲಾಬಿ ಸೀಬೆಹಣ್ಣು (పింక్ జామకాయ)',
    categoryId: 'FRUITS',
    retailUnit: '1 kg',
    retailPrice: 65.0,
    retailMarketPrice: 90.0,
    bulkMinQty: 3.0,
    bulkDiscountPercent: 10.0,
    origin: 'Ananthapur Orchards',
    shelfLife: '4-6 Days',
    desc: 'Fragrant guava with a delightful blush pink interior and crunchy, mildly sweet flesh.',
    image: 'https://images.unsplash.com/photo-1536511135899-7c87c2bf2ff5?w=600',
    badge: 'Pink Flesh',
    tags: ['Vitamin C Rich', 'Digestive Health'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_FRT_PAPAYA_RED_LADY',
    name: 'Sweet Papaya (Honey Drop / Red Lady)',
    kannadaName: 'ರೆಡ್ ಲೇಡಿ ಪಪ್ಪಾಯಿ (మధుర బొప్పాయి)',
    categoryId: 'FRUITS',
    retailUnit: '1 pc',
    retailPrice: 45.0,
    retailMarketPrice: 65.0,
    bulkMinQty: 3.0,
    bulkDiscountPercent: 15.0,
    origin: 'Chittoor Riverbed Farms',
    shelfLife: '3-5 Days',
    desc: 'Vibrant salmon-orange flesh, luscious and sweet with velvety texture. Excellent for digestive wellness.',
    image: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=600',
    badge: 'Tree Ripened',
    tags: ['Gut Friendly', 'Dessert Special'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_FRT_GRAPES_GREEN',
    name: 'Kashmir Seedless Green Grapes (Sonaka)',
    kannadaName: 'ಬೀಜವಿಲ್ಲದ ದ್ರಾಕ್ಷಿ (విత్తనాలు లేని ద్రాక్ష)',
    categoryId: 'FRUITS',
    retailUnit: '500 g',
    retailPrice: 68.0,
    retailMarketPrice: 90.0,
    bulkMinQty: 2.0,
    bulkDiscountPercent: 10.0,
    origin: 'Nashik Vineyard Valley',
    shelfLife: '5-7 Days',
    desc: 'Long, crisp green seedless grapes with an exquisite sweet-tart balance. Washed and packed carefully.',
    image: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=600',
    badge: 'Crisp & Juicy',
    tags: ['Kid Friendly', 'Snack Special'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_FRT_PINEAPPLE_QUEEN',
    name: 'Queen Pineapple (Whole Golden Sweet)',
    kannadaName: 'ಅನಾನಸ್ (తీపి అనాస పండు)',
    categoryId: 'FRUITS',
    retailUnit: '1 pc',
    retailPrice: 52.0,
    retailMarketPrice: 75.0,
    bulkMinQty: 3.0,
    bulkDiscountPercent: 12.0,
    origin: 'Vazhakulam, Kerala',
    shelfLife: '5-7 Days',
    desc: 'Golden-yellow aromatic Queen pineapple with a deep honey aroma and tender edible core.',
    image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600',
    badge: 'Honey Aroma',
    tags: ['Tropical Delight', 'Refreshing'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_FRT_TENDER_COCONUT',
    name: 'Pollachi Tender Coconut (Elaneer / Kobbari)',
    kannadaName: 'ಪೊಲ್ಲಾಚಿ ಎಳನೀರು (లేత కొబ్బరి బొండం)',
    categoryId: 'FRUITS',
    retailUnit: '1 pc',
    retailPrice: 46.0,
    retailMarketPrice: 60.0,
    bulkMinQty: 5.0,
    bulkDiscountPercent: 10.0,
    origin: 'Pollachi Coconut Groves',
    shelfLife: '6-8 Days',
    desc: 'Heavy green tender coconut packed with over 400ml of sweet, natural electrolyte-rich water.',
    image: 'https://images.unsplash.com/photo-1544376798-89aa6b82c6cd?w=600',
    badge: '400ml+ Water',
    tags: ['Natural Electrolytes', 'Cooling'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  },
  {
    id: 'PRD_FRT_WATERMELON_KIRAN',
    name: 'Sweet Striped Watermelon (Kiran Quality)',
    kannadaName: 'ಕಲ್ಲಂಗಡಿ (తీపి పుచ్చకాయ)',
    categoryId: 'FRUITS',
    retailUnit: '1 pc',
    retailPrice: 68.0,
    retailMarketPrice: 95.0,
    bulkMinQty: 2.0,
    bulkDiscountPercent: 10.0,
    origin: 'Bellary Riverbed Farms',
    shelfLife: '7-10 Days',
    desc: 'Dark striped green watermelon (approx 2.5-3kg) with sweet deep red flesh and high hydration value.',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600',
    badge: 'Deep Red & Sweet',
    tags: ['Summer Hydration', 'Party Favorite'],
    gstPercent: 0.0,
    status: 'ACTIVE',
    inStock: true
  }
];

// ============================================================================
// 8. ORDERS & BATCHED FULFILLMENT RUNS
// ============================================================================
export const INITIAL_ORDERS = [];

// ============================================================================
// 9. SOCIETY WALLET WITHDRAWAL REQUESTS
// ============================================================================
export const INITIAL_WITHDRAWALS = [];

// ============================================================================
// 10. PROCUREMENT MANDI LOGS
// ============================================================================
export const INITIAL_PROCUREMENT_LOGS = [];

// ============================================================================
// 11. INBOUND SOCIETY LEADS / REQUESTS
// ============================================================================
export const INITIAL_SOCIETY_REQUESTS = [];

// ============================================================================
// 12. VENDORS & FARMERS MASTER (APMC Commission Agents, FPOs & Direct Growers)
// ============================================================================
export const INITIAL_VENDORS = [];

// ============================================================================
// 13. WAREHOUSE IN-STOCK INVENTORY
// ============================================================================
export const INITIAL_WAREHOUSE_INVENTORY = {};

// ============================================================================
// 14. DELIVERY FEE & SURCHARGE CONFIGURATION
// ============================================================================
export const INITIAL_DELIVERY_CONFIG = {
  baseFee: 25,
  freeDeliveryThreshold: 199,
  enableFreeDelivery: true
};

// ============================================================================
// 15. CONSOLIDATED DEFAULT INITIAL STORE OBJECT
// ============================================================================
export const DEFAULT_STORE = {
  warehouses: INITIAL_WAREHOUSES,
  employees: INITIAL_EMPLOYEES,
  societies: INITIAL_SOCIETIES,
  categories: INITIAL_CATEGORIES,
  units: INITIAL_UNITS,
  products: INITIAL_PRODUCTS,
  orders: INITIAL_ORDERS,
  withdrawals: INITIAL_WITHDRAWALS,
  procurementLogs: INITIAL_PROCUREMENT_LOGS,
  societyRequests: INITIAL_SOCIETY_REQUESTS,
  vendors: INITIAL_VENDORS,
  warehouseInventory: INITIAL_WAREHOUSE_INVENTORY,
  deliveryConfig: INITIAL_DELIVERY_CONFIG
};

export default DEFAULT_STORE;
