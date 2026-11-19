import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../firebase.ts";
import { Workshop } from "../types.ts";
import { isDummyImage } from "../categories.ts";

const WORKSHOPS_COLLECTION = "workshops";
const LEADS_COLLECTION = "leads";

export const FirestoreService = {
  // Workshops
  async getAllWorkshops(): Promise<Workshop[]> {
    const q = query(collection(db, WORKSHOPS_COLLECTION), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(d => {
        const data = d.data();
        const images = (data.images || []).filter((img: string) => !isDummyImage(img));
        return {
          ...data,
          images,
          firestoreId: d.id
        };
      })
      .filter((w: any) => !w.isDeleted) as Workshop[];
  },

  async addWorkshop(workshop: Omit<Workshop, 'firestoreId'>) {
    return await addDoc(collection(db, WORKSHOPS_COLLECTION), {
      ...workshop,
      createdAt: serverTimestamp()
    });
  },

  async updateWorkshop(firestoreId: string, data: Partial<Workshop>) {
    const workshopRef = doc(db, WORKSHOPS_COLLECTION, firestoreId);
    return await updateDoc(workshopRef, data);
  },

  async deleteWorkshop(firestoreId: string) {
    const workshopRef = doc(db, WORKSHOPS_COLLECTION, firestoreId);
    return await updateDoc(workshopRef, { isDeleted: true });
  },

  async getWorkshopByNumericId(numericId: string | number): Promise<string | null> {
    const q = query(collection(db, WORKSHOPS_COLLECTION));
    const snapshot = await getDocs(q);
    const found = snapshot.docs.find(d => String(d.data().id) === String(numericId));
    return found ? found.id : null;
  },

  async addImageToWorkshop(firestoreId: string, imageUrl: string) {
    const workshopRef = doc(db, WORKSHOPS_COLLECTION, firestoreId);
    const docSnap = await getDocs(query(collection(db, WORKSHOPS_COLLECTION)));
    const currentDoc = docSnap.docs.find(d => d.id === firestoreId);
    const currentImages = currentDoc?.data()?.images || [];
    return await updateDoc(workshopRef, {
      images: [...currentImages, imageUrl]
    });
  },

  async removeImageFromWorkshop(firestoreId: string, imageUrl: string) {
    const workshopRef = doc(db, WORKSHOPS_COLLECTION, firestoreId);
    const docSnap = await getDocs(query(collection(db, WORKSHOPS_COLLECTION)));
    const currentDoc = docSnap.docs.find(d => d.id === firestoreId);
    const currentImages = currentDoc?.data()?.images || [];
    return await updateDoc(workshopRef, {
      images: currentImages.filter((img: string) => img !== imageUrl)
    });
  },

  // Leads
  async saveLead(leadData: any) {
    return await addDoc(collection(db, LEADS_COLLECTION), {
      ...leadData,
      createdAt: serverTimestamp()
    });
  }
};
