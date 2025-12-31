
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

const WORKSHOPS_COLLECTION = "workshops";
const LEADS_COLLECTION = "leads";

export const FirestoreService = {
  // Workshops
  async getAllWorkshops(): Promise<Workshop[]> {
    const q = query(collection(db, WORKSHOPS_COLLECTION), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      firestoreId: doc.id
    })) as Workshop[];
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
    return await deleteDoc(workshopRef);
  },

  // Leads
  async saveLead(leadData: any) {
    return await addDoc(collection(db, LEADS_COLLECTION), {
      ...leadData,
      createdAt: serverTimestamp()
    });
  }
};
