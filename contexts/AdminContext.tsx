
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase.ts';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface AdminContextType {
  isAdmin: boolean;
  isEditMode: boolean;
  user: any;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  toggleEditMode: () => void;
  logout: () => void;
  updateContent: (key: string, value: any) => void;
  getContent: (key: string, defaultValue: any) => any;
  loading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen to Auth changes
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setIsEditMode(false);
    });

    // 2. Listen to Site Content overrides in Firestore
    const unsubContent = onSnapshot(doc(db, "siteSettings", "overrides"), (doc) => {
      if (doc.exists()) {
        setOverrides(doc.data().content || {});
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      unsubContent();
    };
  }, []);

  const toggleEditMode = () => setIsEditMode(!isEditMode);
  const logout = () => signOut(auth);

  const updateContent = async (key: string, value: any) => {
    const newOverrides = { ...overrides, [key]: value };
    setOverrides(newOverrides);
    try {
      await setDoc(doc(db, "siteSettings", "overrides"), { content: newOverrides }, { merge: true });
    } catch (e) {
      console.error("Error updating cloud settings:", e);
    }
  };

  const getContent = (key: string, defaultValue: any) => {
    return overrides[key] ?? defaultValue;
  };

  return (
    <AdminContext.Provider value={{ 
      isAdmin: !!user, 
      isEditMode, 
      user, 
      showLoginModal,
      setShowLoginModal,
      toggleEditMode, 
      logout,
      updateContent, 
      getContent, 
      loading 
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within an AdminProvider');
  return context;
};
