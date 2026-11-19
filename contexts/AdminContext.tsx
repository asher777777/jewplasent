import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase.ts';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface AdminContextType {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isEditMode: boolean;
  user: any;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  toggleEditMode: () => void;
  logout: () => void;
  updateContent: (keyOrMap: string | Record<string, any>, value?: any) => Promise<void>;
  getContent: (key: string, defaultValue: any) => any;
  loading: boolean;
  settings: Record<string, any>;
  updateSettings: (key: string, value: any) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const SUPER_ADMIN_PREFIX = (
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ADMIN_USER) || 
  'admin770'
).toLowerCase();

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const overridesRef = React.useRef<Record<string, any>>({});

  useEffect(() => {
    overridesRef.current = overrides;
  }, [overrides]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen to Auth changes
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const idTokenResult = await currentUser.getIdTokenResult();
          const forceLogoutTime = idTokenResult.claims.logoutAt as number | undefined;
          if (forceLogoutTime) {
            const authTime = new Date(currentUser.metadata.lastSignInTime || 0).getTime();
            if (authTime < forceLogoutTime * 1000) {
              await signOut(auth);
              setUser(null);
              setIsEditMode(false);
              return;
            }
          }
        } catch (e) {
          console.warn("Auth session check:", e);
        }
      }
      setUser(currentUser);
      if (!currentUser) setIsEditMode(false);
    });

    // 2. Listen to Site Content overrides in Firestore
    const unsubContent = onSnapshot(doc(db, "siteSettings", "overrides"), (snap) => {
      if (snap.exists()) {
        const data = snap.data().content || {};
        overridesRef.current = data;
        setOverrides(data);
      }
      setLoading(false);
    });

    // 3. Listen to Site Config in Firestore (logo, siteName, etc.)
    const unsubConfig = onSnapshot(doc(db, "siteSettings", "config"), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() || {});
      }
    });

    return () => {
      unsubAuth();
      unsubContent();
      unsubConfig();
    };
  }, []);

  const toggleEditMode = () => setIsEditMode(!isEditMode);
  const logout = () => signOut(auth);

  const updateContent = async (keyOrMap: string | Record<string, any>, value?: any) => {
    const updates: Record<string, any> = typeof keyOrMap === 'string' ? { [keyOrMap]: value } : keyOrMap;
    const merged = { ...overridesRef.current, ...updates };
    overridesRef.current = merged;
    setOverrides(merged);

    try {
      await setDoc(doc(db, "siteSettings", "overrides"), { content: merged }, { merge: true });
    } catch (e) {
      console.error("Error updating cloud settings:", e);
    }
  };

  const updateSettings = async (key: string, value: any) => {
    try {
      await setDoc(doc(db, "siteSettings", "config"), { [key]: value }, { merge: true });
    } catch (e) {
      console.error("Error updating config:", e);
      throw e;
    }
  };

  const getContent = (key: string, defaultValue: any) => {
    return overrides[key] ?? defaultValue;
  };

  const isSuperAdmin = Boolean(
    user && (
      user.email?.toLowerCase().startsWith(`${SUPER_ADMIN_PREFIX}@`) ||
      user.email?.toLowerCase() === SUPER_ADMIN_PREFIX ||
      user.displayName?.toLowerCase() === SUPER_ADMIN_PREFIX ||
      user.isSuperAdmin === true
    )
  );

  return (
    <AdminContext.Provider value={{ 
      isAdmin: !!user,
      isSuperAdmin,
      isEditMode, 
      user, 
      showLoginModal,
      setShowLoginModal,
      toggleEditMode, 
      logout,
      updateContent, 
      getContent, 
      loading,
      settings,
      updateSettings
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
