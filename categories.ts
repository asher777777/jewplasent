export interface CategoryItem {
  id: string;         // Hebrew identifier matching existing Firestore data, e.g. "חנוכה"
  slug: string;       // Clean English slug for URLs, e.g. "hanukkah"
  title: string;      // Display title, e.g. "חנוכה"
  subtitle: string;   // Subtitle, e.g. "סדנאות אור וגבורה"
  image: string;      // Default verified image
  color: string;      // Tailwind gradient classes
}

export const DEFAULT_SITE_IMAGE = "https://firebasestorage.googleapis.com/v0/b/chabad-workshops-cms-files/o/site%2Flogo_1767863965088?alt=media&token=b45fef20-47ee-456e-b050-dd612571cd43";

export const isDummyImage = (url?: string | null): boolean => {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase().trim();
  if (!lower) return true;
  if (lower.includes('unsplash.com')) return true;
  if (lower.includes('via.placeholder.com')) return true;
  if (lower.includes('placeholder')) return true;
  if (lower.includes('example.com')) return true;
  return false;
};

export const sanitizeImage = (url?: string | null, fallback: string = DEFAULT_SITE_IMAGE): string => {
  return isDummyImage(url) ? fallback : (url || '').trim();
};

export const INITIAL_CATEGORIES: CategoryItem[] = [
  { 
    id: "תשרי", 
    slug: "tishrei", 
    title: "חגי תשרי", 
    subtitle: "ראש השנה, יום כיפור, סוכות", 
    image: DEFAULT_SITE_IMAGE, 
    color: "from-yellow-400 via-orange-500 to-red-500" 
  },
  { 
    id: "חנוכה", 
    slug: "hanukkah", 
    title: "חנוכה", 
    subtitle: "סדנאות אור וגבורה", 
    image: DEFAULT_SITE_IMAGE, 
    color: "from-blue-400 via-indigo-500 to-purple-500" 
  },
  { 
    id: "שבט", 
    slug: "shevat", 
    title: "טו בשבט", 
    subtitle: "נטיעות וצמיחה", 
    image: DEFAULT_SITE_IMAGE, 
    color: "from-green-400 via-emerald-500 to-teal-500" 
  },
  { 
    id: "פורים", 
    slug: "purim", 
    title: "פורים", 
    subtitle: "שמחה, מסכות ורעשנים", 
    image: DEFAULT_SITE_IMAGE, 
    color: "from-purple-400 via-pink-500 to-red-500" 
  },
  { 
    id: "פסח", 
    slug: "pesach", 
    title: "פסח", 
    subtitle: "חירות ואפיית מצות", 
    image: DEFAULT_SITE_IMAGE, 
    color: "from-amber-400 via-orange-500 to-red-500" 
  },
  { 
    id: 'ל"ג בעומר', 
    slug: "lag-baomer", 
    title: 'ל"ג בעומר', 
    subtitle: "ביחד סביב המדורה", 
    image: DEFAULT_SITE_IMAGE, 
    color: "from-orange-400 via-red-500 to-yellow-500" 
  },
  { 
    id: "שבועות", 
    slug: "shavuot", 
    title: "שבועות", 
    subtitle: "ביכורים ומתן תורה", 
    image: DEFAULT_SITE_IMAGE, 
    color: "from-green-300 via-yellow-400 to-green-500" 
  },
  { 
    id: "שבת", 
    slug: "shabbat", 
    title: "שבת", 
    subtitle: "חוויה של קדושה ומנוחה", 
    image: DEFAULT_SITE_IMAGE, 
    color: "from-blue-300 via-blue-500 to-indigo-600" 
  },
  { 
    id: "סוף שנה וקייטנות", 
    slug: "summer-camps", 
    title: "סוף שנה", 
    subtitle: "פעילויות לקייטנות וסיום", 
    image: DEFAULT_SITE_IMAGE, 
    color: "from-cyan-400 via-blue-500 to-purple-500" 
  }
];

/**
 * Finds a category by its slug, id, or Hebrew title with full case-insensitivity.
 */
export const findCategory = (
  param: string | undefined, 
  customCategories: CategoryItem[] = []
): CategoryItem | undefined => {
  if (!param) return undefined;
  const decoded = decodeURIComponent(param).trim().toLowerCase();
  const all = [...INITIAL_CATEGORIES, ...customCategories];
  return all.find(c => 
    c.slug.toLowerCase() === decoded || 
    c.id.toLowerCase() === decoded || 
    c.title.toLowerCase() === decoded
  );
};

/**
 * Ensures a slug only contains lowercase english letters, numbers and hyphens.
 */
export const cleanEnglishSlug = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

/**
 * Sorts category items according to a custom order array of IDs or slugs.
 */
export const getOrderedCategories = (
  categories: CategoryItem[], 
  order?: string[]
): CategoryItem[] => {
  if (!order || order.length === 0) return categories;
  const orderMap = new Map<string, number>();
  order.forEach((id, idx) => {
    orderMap.set(String(id).toLowerCase(), idx);
  });
  return [...categories].sort((a, b) => {
    const idxA = orderMap.has(a.id.toLowerCase()) 
      ? orderMap.get(a.id.toLowerCase())! 
      : (orderMap.has(a.slug.toLowerCase()) ? orderMap.get(a.slug.toLowerCase())! : 999);
    const idxB = orderMap.has(b.id.toLowerCase()) 
      ? orderMap.get(b.id.toLowerCase())! 
      : (orderMap.has(b.slug.toLowerCase()) ? orderMap.get(b.slug.toLowerCase())! : 999);
    return idxA - idxB;
  });
};
