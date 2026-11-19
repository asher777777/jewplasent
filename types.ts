export interface ExtraDetail {
  icon: string;
  label: string;
  value: string;
}

export interface Workshop {
  id: number | string; // Numeric ID from catalog or Firestore auto-ID
  slug?: string; // English URL-friendly slug, e.g. "shofar-crafting"
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
  videoUrl?: string;
  extraDetails?: ExtraDetail[];
  isDeleted?: boolean;
  createdAt?: any;
}

export type Category = string;
