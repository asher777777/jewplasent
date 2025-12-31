
export interface Workshop {
  id: number | string; // Numeric ID from catalog or Firestore auto-ID
  firestoreId?: string; // The actual document ID in Firebase
  category: string;
  title: string;
  description: string;
  result: string;
  duration: string;
  audience: string;
  images?: string[];
  values?: string;
  skills?: string;
  staff?: string;
  longDescription?: string;
  createdAt?: any;
}

export type Category = 
  | "תשרי" 
  | "שבת" 
  | "חנוכה" 
  | "שבט" 
  | "פורים" 
  | "פסח" 
  | "ל\"ג בעומר" 
  | "שבועות" 
  | "סוף שנה וקייטנות";
