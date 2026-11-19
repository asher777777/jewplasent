import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext.tsx';
import { extractWorkshopFromImage } from '../services/GeminiCreator.ts';
import { auth, storage } from '../firebase.ts';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { FirestoreService } from '../services/FirestoreService.ts';
import { INITIAL_CATEGORIES, cleanEnglishSlug, CategoryItem, DEFAULT_SITE_IMAGE } from '../categories.ts';
import SeoInspectorModal from './SeoInspectorModal.tsx';

const SUPER_ADMIN_USER = (
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ADMIN_USER) || 
  'admin770'
).toLowerCase();

const SUPER_ADMIN_PASS = (
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ADMIN_PASS) || 
  '0526968008'
);

const AdminToolbar: React.FC = () => {
  const { 
    isAdmin, 
    isSuperAdmin, 
    isEditMode, 
    toggleEditMode, 
    logout, 
    showLoginModal, 
    setShowLoginModal,
    settings,
    updateSettings
  } = useAdmin();

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isNewWorkshopModal, setIsNewWorkshopModal] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyStatusMsg, setApiKeyStatusMsg] = useState('');

  const location = useLocation();
  let currentPageKey = 'home';
  if (location.pathname === '/') {
    currentPageKey = 'home';
  } else if (location.pathname.startsWith('/category/')) {
    const slug = location.pathname.replace('/category/', '').replace(/\/.*$/, '');
    currentPageKey = `category_${slug}`;
  } else if (location.pathname.startsWith('/workshop/')) {
    const slug = location.pathname.replace('/workshop/', '').replace(/\/.*$/, '');
    currentPageKey = `workshop_${slug}`;
  } else {
    currentPageKey = location.pathname.replace(/^\//, '').replace(/\//g, '_') || 'page';
  }

  // Categories list (Initial + any custom created by user)
  const customCategories: CategoryItem[] = settings?.customCategories || [];
  const allCategories: CategoryItem[] = [...INITIAL_CATEGORIES, ...customCategories];

  const [loginForm, setLoginForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  
  // New Workshop State
  const [newWorkshop, setNewWorkshop] = useState({
    title: '',
    slug: '',
    category: allCategories[0]?.id || "חנוכה",
    description: '',
    result: '',
    duration: '',
    audience: ''
  });

  // Custom Category creation in manual modal
  const [isCreatingNewCatManual, setIsCreatingNewCatManual] = useState(false);
  const [manualNewCatName, setManualNewCatName] = useState('');
  const [manualNewCatSlug, setManualNewCatSlug] = useState('');

  // AI Modal State
  const [aiWorkshop, setAiWorkshop] = useState({
    title: '',
    category: allCategories[0]?.id || "חנוכה",
    description: '',
  });
  const [isCreatingNewCatAi, setIsCreatingNewCatAi] = useState(false);
  const [aiNewCatName, setAiNewCatName] = useState('');
  const [aiNewCatSlug, setAiNewCatSlug] = useState('');

  const [aiFile, setAiFile] = useState<File | null>(null);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const rawUsername = loginForm.email.trim();
    const password = loginForm.password.trim();

    if (!rawUsername || !password) {
      setError('אנא מלא את כל השדות');
      return;
    }

    if (isRegisterMode && password !== loginForm.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    const email = rawUsername.includes('@') 
      ? rawUsername 
      : `${rawUsername.toLowerCase()}@jewplasent.com`;

    try {
      if (isRegisterMode) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          if (
            (rawUsername.toLowerCase() === SUPER_ADMIN_USER || email.toLowerCase() === `${SUPER_ADMIN_USER}@jewplasent.com`) &&
            password === SUPER_ADMIN_PASS
          ) {
            try {
              await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr) {
              console.error("Auto-provision error:", createErr);
            }
          } else {
            throw signInErr;
          }
        }
      }
      setShowLoginModal(false);
      setLoginForm({ email: '', password: '', confirmPassword: '' });
    } catch (err: any) {
      setError('אימייל/שם משתמש או סיסמה שגויים');
    }
  };

  const handleCreateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert("פעולה זו מורשית למנהל המערכת בלבד.");
      return;
    }

    let finalCategory = newWorkshop.category;

    // Handle new category creation
    if (isCreatingNewCatManual) {
      if (!manualNewCatName.trim() || !manualNewCatSlug.trim()) {
        alert("אנא מלא שם קטגוריה וסלאג באנגלית.");
        return;
      }
      const newCatItem: CategoryItem = {
        id: manualNewCatName.trim(),
        slug: cleanEnglishSlug(manualNewCatSlug),
        title: manualNewCatName.trim(),
        subtitle: `סדנאות ${manualNewCatName.trim()}`,
        image: DEFAULT_SITE_IMAGE,
        color: "from-blue-400 via-indigo-500 to-purple-500"
      };
      const updated = [...customCategories, newCatItem];
      await updateSettings('customCategories', updated);
      finalCategory = newCatItem.id;
    }

    try {
      const slug = cleanEnglishSlug(newWorkshop.slug || newWorkshop.title);
      await FirestoreService.addWorkshop({
        ...newWorkshop,
        category: finalCategory,
        slug: slug || `workshop-${Date.now()}`,
        id: Date.now(),
        images: []
      });
      setIsNewWorkshopModal(false);
      setIsCreatingNewCatManual(false);
      setManualNewCatName('');
      setManualNewCatSlug('');
      alert("הסדנה נוצרה בהצלחה!");
      window.location.reload();
    } catch (err) {
      alert("שגיאה ביצירת הסדנה");
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert("פעולה זו מורשית למנהל המערכת בלבד.");
      return;
    }

    if (!aiFile) {
      alert("אנא בחר קובץ PDF או תמונה לסריקה.");
      return;
    }

    let finalCategory = aiWorkshop.category;

    // Handle custom category in AI modal
    if (isCreatingNewCatAi) {
      if (!aiNewCatName.trim() || !aiNewCatSlug.trim()) {
        alert("אנא מלא שם קטגוריה וסלאג באנגלית.");
        return;
      }
      const newCatItem: CategoryItem = {
        id: aiNewCatName.trim(),
        slug: cleanEnglishSlug(aiNewCatSlug),
        title: aiNewCatName.trim(),
        subtitle: `סדנאות ${aiNewCatName.trim()}`,
        image: DEFAULT_SITE_IMAGE,
        color: "from-blue-400 via-indigo-500 to-purple-500"
      };
      const updated = [...customCategories, newCatItem];
      await updateSettings('customCategories', updated);
      finalCategory = newCatItem.id;
    }

    setIsAiLoading(true);
    try {
      // 1. Read document file as base64 for Gemini
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(aiFile);
      });

      // 2. Upload main image if provided, or use preview/fallback
      let mainImageUrl = DEFAULT_SITE_IMAGE;
      if (mainImageFile) {
        try {
          const storageRef = ref(storage, `workshops/${Date.now()}_${mainImageFile.name}`);
          const snapshot = await uploadBytes(storageRef, mainImageFile);
          mainImageUrl = await getDownloadURL(snapshot.ref);
        } catch (storageErr) {
          console.warn("Storage upload failed, falling back to data URL:", storageErr);
          if (mainImagePreview) {
            mainImageUrl = mainImagePreview;
          }
        }
      }

      // 3. Extract details with Gemini 3.8 Flash (including English slug!)
      const workshopData = await extractWorkshopFromImage(
        base64Data,
        aiFile.type || 'image/jpeg',
        {
          title: aiWorkshop.title.trim(),
          description: aiWorkshop.description.trim()
        },
        settings?.geminiApiKey
      );

      const generatedSlug = cleanEnglishSlug(workshopData.slug || workshopData.title || `workshop-${Date.now()}`);

      // 4. Save to Firestore
      await FirestoreService.addWorkshop({
        ...workshopData,
        title: aiWorkshop.title.trim() || workshopData.title || "סדנה חדשה",
        slug: generatedSlug,
        description: aiWorkshop.description.trim() || workshopData.description || "",
        category: finalCategory || workshopData.category || allCategories[0]?.id || "חנוכה",
        id: Date.now(),
        images: [mainImageUrl]
      });

      // 5. Automatically register initial SEO & AIEO metadata for the new workshop
      try {
        const newPageKey = `workshop_${generatedSlug}`;
        await updateContent({
          [`seo_title_${newPageKey}`]: `${aiWorkshop.title.trim() || "סדנה חדשה"} | חוויה של סדנה`,
          [`seo_desc_${newPageKey}`]: (aiWorkshop.description.trim() || workshopData.description || "").slice(0, 160),
          [`seo_image_${newPageKey}`]: mainImageUrl || settings?.siteLogo || '',
          [`seo_keywords_${newPageKey}`]: [aiWorkshop.title.trim(), finalCategory, "סדנאות יצירה", "חב\"ד"].filter(Boolean)
        });
      } catch (seoErr) {
        console.warn("Could not auto-save initial SEO metadata:", seoErr);
      }

      alert("הסדנה נסרקה ונוצרה בהצלחה באמצעות Gemini 3.8 Flash! סלאג: " + generatedSlug);
      setIsAiModalOpen(false);
      setAiFile(null);
      setMainImageFile(null);
      setMainImagePreview('');
      setIsCreatingNewCatAi(false);
      setAiNewCatName('');
      setAiNewCatSlug('');
      setAiWorkshop({
        title: '',
        category: allCategories[0]?.id || "חנוכה",
        description: '',
      });
      window.location.reload();
    } catch (err: any) {
      console.error("AI Scan Error:", err);
      alert(err?.message || "שגיאה בתהליך הסריקה.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleTestApiKey = async () => {
    if (!apiKeyInput.trim()) {
      alert("נא להזין מפתח לבדיקה.");
      return;
    }
    setIsTestingApiKey(true);
    setApiKeyStatusMsg('');
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: apiKeyInput.trim() });
      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'שלום'
      });
      if (res.text) {
        setApiKeyStatusMsg('✅ המפתח תקין ופעיל בהצלחה מול שרתי Google Gemini!');
      }
    } catch (err: any) {
      setApiKeyStatusMsg('❌ שגיאה: המפתח אינו תקין. הודעה: ' + (err?.message || err));
    } finally {
      setIsTestingApiKey(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      alert("נא להזין מפתח API.");
      return;
    }
    try {
      await updateSettings('geminiApiKey', apiKeyInput.trim());
      alert("מפתח ה-Gemini נשמר בהצלחה בענן ופעיל כעת בכל רחבי האתר!");
      setIsApiKeyModalOpen(false);
    } catch (err: any) {
      alert("שגיאה בשמירת המפתח: " + (err?.message || err));
    }
  };

  return (
    <>
      {/* Auth Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] p-8 max-w-md w-full shadow-2xl border-4 border-blue-200 text-right" dir="rtl">
            <h2 className="text-3xl font-black text-blue-950 mb-6 font-creative text-center">
              {isRegisterMode ? 'הרשמת משתמש' : 'כניסת משתמש'}
            </h2>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">אימייל או שם משתמש:</label>
                <input 
                  required 
                  type="text" 
                  placeholder="הזן אימייל או שם משתמש" 
                  className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right" 
                  value={loginForm.email} 
                  onChange={e => setLoginForm({...loginForm, email: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">סיסמה:</label>
                <input 
                  required 
                  type="password" 
                  placeholder="הזן סיסמה" 
                  className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right" 
                  value={loginForm.password} 
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                />
              </div>
              {isRegisterMode && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">אימות סיסמה:</label>
                  <input 
                    required 
                    type="password" 
                    placeholder="הזן שוב את הסיסמה" 
                    className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right" 
                    value={loginForm.confirmPassword} 
                    onChange={e => setLoginForm({...loginForm, confirmPassword: e.target.value})} 
                  />
                </div>
              )}
              {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg transition-all">
                {isRegisterMode ? 'הרשמה' : 'התחברות'}
              </button>
              <div className="flex justify-between items-center text-xs font-bold text-gray-400 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    setError('');
                  }}
                  className="hover:text-blue-600 transition-colors"
                >
                  {isRegisterMode ? 'כבר רשום? לחץ להתחברות' : 'משתמש חדש? לחץ להרשמה'}
                </button>
                <button type="button" onClick={() => setShowLoginModal(false)} className="hover:text-gray-600">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Workshop Modal (Only for SuperAdmin) */}
      {isNewWorkshopModal && isSuperAdmin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-8 max-w-2xl w-full shadow-2xl border-4 border-blue-200 my-8 text-right" dir="rtl">
            <h2 className="text-3xl font-black text-blue-950 mb-6 font-creative text-center">הוספת סדנה חדשה</h2>
            <form onSubmit={handleCreateWorkshop} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">שם הסדנה *:</label>
                <input required type="text" placeholder="שם הסדנה" className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right" value={newWorkshop.title} onChange={e => setNewWorkshop({...newWorkshop, title: e.target.value})} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">סלאג ייחודי באנגלית (Slug):</label>
                <input 
                  type="text" 
                  placeholder="e.g. olive-oil-workshop" 
                  className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-mono text-left font-bold text-sm" 
                  dir="ltr"
                  value={newWorkshop.slug} 
                  onChange={e => setNewWorkshop({...newWorkshop, slug: cleanEnglishSlug(e.target.value)})} 
                />
              </div>

              {/* קטגוריה עם אפשרות יצירת קטגוריה חדשה */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">קטגוריה:</label>
                <select 
                  className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right" 
                  value={isCreatingNewCatManual ? '__NEW__' : newWorkshop.category} 
                  onChange={e => {
                    if (e.target.value === '__NEW__') {
                      setIsCreatingNewCatManual(true);
                    } else {
                      setIsCreatingNewCatManual(false);
                      setNewWorkshop({...newWorkshop, category: e.target.value});
                    }
                  }}
                >
                  {allCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.title || c.id}</option>
                  ))}
                  <option value="__NEW__" className="text-pink-600 font-black bg-pink-50">
                    + צור קטגוריה חדשה...
                  </option>
                </select>
              </div>

              {/* טופס קטגוריה חדשה אם נבחר */}
              {isCreatingNewCatManual && (
                <div className="md:col-span-2 p-4 bg-pink-50/80 border-2 border-pink-200 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-pink-900 text-sm">הגדרת קטגוריה חדשה</span>
                    <button type="button" onClick={() => setIsCreatingNewCatManual(false)} className="text-xs text-gray-500 hover:text-red-500 font-bold">
                      ביטול
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">שם הקטגוריה (עברית) *:</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="לדוגמה: קיץ וקייטנות" 
                      value={manualNewCatName} 
                      onChange={e => setManualNewCatName(e.target.value)} 
                      className="w-full bg-white px-4 py-2.5 rounded-xl border border-pink-300 font-bold text-right outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">סלאג באנגלית בלבד (English URL Slug) *:</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. summer-camps" 
                      value={manualNewCatSlug} 
                      onChange={e => setManualNewCatSlug(cleanEnglishSlug(e.target.value))} 
                      className="w-full bg-white px-4 py-2.5 rounded-xl border border-pink-300 font-mono text-left font-bold outline-none text-sm" 
                      dir="ltr" 
                    />
                    <p className="text-[11px] text-gray-500 mt-1">אותיות אנגלית קטנות, מספרים ומקפים בלבד (ללא רווחים וללא עברית)</p>
                  </div>
                </div>
              )}

              <input placeholder="זמן פעילות" className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right" value={newWorkshop.duration} onChange={e => setNewWorkshop({...newWorkshop, duration: e.target.value})} />
              <input placeholder="קהל יעד" className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right" value={newWorkshop.audience} onChange={e => setNewWorkshop({...newWorkshop, audience: e.target.value})} />
              <input placeholder="תוצר סופי" className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right" value={newWorkshop.result} onChange={e => setNewWorkshop({...newWorkshop, result: e.target.value})} />
              <div className="md:col-span-2">
                <textarea placeholder="תיאור קצר" className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right" rows={3} value={newWorkshop.description} onChange={e => setNewWorkshop({...newWorkshop, description: e.target.value})} />
              </div>
              <div className="md:col-span-2 flex gap-4 pt-4">
                <button type="submit" className="flex-1 bg-pink-500 text-white font-black py-4 rounded-xl shadow-lg hover:bg-pink-600">צור סדנה</button>
                <button type="button" onClick={() => setIsNewWorkshopModal(false)} className="px-8 text-gray-400 font-bold">ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Smart Scan Modal (Only for SuperAdmin) */}
      {isAiModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-8 max-w-2xl w-full shadow-2xl border-4 border-blue-400 my-8 text-right" dir="rtl">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-blue-100">
              <h2 className="text-3xl font-black text-blue-950 font-creative flex items-center gap-2">
                <span>✨</span>
                <span>סריקה חכמה באמצעות AI</span>
              </h2>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full">
                Gemini 3.8 Flash
              </span>
            </div>

            <form onSubmit={handleAiSubmit} className="space-y-4">
              {/* שם הסדנה */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  שם הסדנה:
                </label>
                <input
                  type="text"
                  placeholder="הזן שם סדנה (או השאר ריק לחילוץ אוטומטי מהקובץ)"
                  className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right"
                  value={aiWorkshop.title}
                  onChange={e => setAiWorkshop({ ...aiWorkshop, title: e.target.value })}
                />
              </div>

              {/* קטגוריה עם אפשרות ליצירת קטגוריה חדשה */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  קטגוריה:
                </label>
                <select
                  className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right"
                  value={isCreatingNewCatAi ? '__NEW__' : aiWorkshop.category}
                  onChange={e => {
                    if (e.target.value === '__NEW__') {
                      setIsCreatingNewCatAi(true);
                    } else {
                      setIsCreatingNewCatAi(false);
                      setAiWorkshop({ ...aiWorkshop, category: e.target.value });
                    }
                  }}
                >
                  {allCategories.map(c => <option key={c.id} value={c.id}>{c.title || c.id}</option>)}
                  <option value="__NEW__" className="text-pink-600 font-black bg-pink-50">
                    + צור קטגוריה חדשה...
                  </option>
                </select>
              </div>

              {/* טופס קטגוריה חדשה ב-AI */}
              {isCreatingNewCatAi && (
                <div className="p-4 bg-pink-50/80 border-2 border-pink-200 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-pink-900 text-sm">הגדרת קטגוריה חדשה לסריקה</span>
                    <button type="button" onClick={() => setIsCreatingNewCatAi(false)} className="text-xs text-gray-500 hover:text-red-500 font-bold">
                      ביטול
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">שם הקטגוריה (עברית) *:</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="לדוגמה: ימי גיבוש" 
                      value={aiNewCatName} 
                      onChange={e => setAiNewCatName(e.target.value)} 
                      className="w-full bg-white px-4 py-2.5 rounded-xl border border-pink-300 font-bold text-right outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">סלאג באנגלית בלבד (English URL Slug) *:</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. team-building" 
                      value={aiNewCatSlug} 
                      onChange={e => setAiNewCatSlug(cleanEnglishSlug(e.target.value))} 
                      className="w-full bg-white px-4 py-2.5 rounded-xl border border-pink-300 font-mono text-left font-bold outline-none text-sm" 
                      dir="ltr" 
                    />
                    <p className="text-[11px] text-gray-500 mt-1">אותיות אנגלית קטנות, מספרים ומקפים בלבד (באנגלית בלבד)</p>
                  </div>
                </div>
              )}

              {/* שדה העלאת PDF או תמונה */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  קובץ PDF או תמונה לסריקה <span className="text-red-500">*</span>:
                </label>
                <div className="relative border-2 border-dashed border-blue-300 rounded-2xl p-5 text-center hover:bg-blue-50/50 transition-colors">
                  <input
                    type="file"
                    required
                    accept="image/*,application/pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setAiFile(file);
                    }}
                  />
                  {aiFile ? (
                    <div className="flex items-center justify-between gap-4 p-2 bg-blue-100/70 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📄</span>
                        <div className="text-right">
                          <p className="font-bold text-blue-950 text-sm">{aiFile.name}</p>
                          <p className="text-xs text-gray-500">{(aiFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAiFile(null);
                        }}
                        className="text-red-500 hover:text-red-700 font-bold text-xs bg-white px-3 py-1.5 rounded-lg border border-red-200 shadow-sm"
                      >
                        הסר
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-500 py-2">
                      <span className="text-2xl block mb-1">📁</span>
                      <p className="font-bold text-gray-700 text-sm">גרור לכאן או לחץ לבחירת קובץ PDF / תמונה</p>
                      <p className="text-xs text-gray-400 mt-0.5">Gemini 3.8 Flash יפענח את כל פרטי הסדנה אוטומטית ויפיק סלאג באנגלית</p>
                    </div>
                  )}
                </div>
              </div>

              {/* שדה תמונה ראשית */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  תמונה ראשית (אופציונלי):
                </label>
                <div className="relative border-2 border-dashed border-blue-300 rounded-2xl p-4 text-center hover:bg-blue-50/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setMainImageFile(file);
                      if (file) {
                        const imgReader = new FileReader();
                        imgReader.onload = () => setMainImagePreview(imgReader.result as string);
                        imgReader.readAsDataURL(file);
                      } else {
                        setMainImagePreview('');
                      }
                    }}
                  />
                  {mainImagePreview ? (
                    <div className="flex items-center justify-between gap-4 p-2 bg-blue-50/70 rounded-xl relative z-20">
                      <div className="flex items-center gap-3">
                        <img 
                          src={mainImagePreview} 
                          alt="תצוגה מקדימה" 
                          className="w-16 h-16 object-cover rounded-xl border-2 border-blue-200 shadow-sm" 
                        />
                        <div className="text-right">
                          <p className="font-bold text-blue-950 text-sm">{mainImageFile?.name}</p>
                          <p className="text-xs text-gray-500">{((mainImageFile?.size || 0) / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMainImageFile(null);
                          setMainImagePreview('');
                        }}
                        className="text-red-500 hover:text-red-700 font-bold text-xs bg-white px-3 py-1.5 rounded-lg border border-red-200 shadow-sm"
                      >
                        הסר תמונה
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-500 py-2">
                      <span className="text-2xl block mb-1">🖼️</span>
                      <p className="font-bold text-gray-700 text-sm">לחץ לבחירת תמונה ראשית מהמחשב</p>
                      <p className="text-xs text-gray-400 mt-0.5">תומך ב-JPG, PNG, WEBP (אם לא תועלה, תיבחר תמונת נושא)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* תיאור כללי */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  תיאור כללי / דגשים נוספים:
                </label>
                <textarea
                  placeholder="תיאור כללי או דגשים נוספים שיעזרו ל-Gemini לדייק את תוכן הסדנה..."
                  className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right"
                  rows={3}
                  value={aiWorkshop.description}
                  onChange={e => setAiWorkshop({ ...aiWorkshop, description: e.target.value })}
                />
              </div>

              {/* כפתור שליחה וביטול */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isAiLoading || !aiFile}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isAiLoading ? (
                    <>
                      <span className="animate-spin text-xl">⏳</span>
                      <span>Gemini 3.8 Flash מנתח, יוצר סלאג ומייצר סדנה...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>הפעל סריקה וצור סדנה</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isAiLoading}
                  onClick={() => {
                    setIsAiModalOpen(false);
                    setAiFile(null);
                    setMainImageFile(null);
                    setMainImagePreview('');
                    setIsCreatingNewCatAi(false);
                  }}
                  className="px-8 text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Toolbar */}
      {isAdmin && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-blue-900 text-white px-6 py-3 flex items-center justify-between shadow-2xl border-t-4 border-[#ff1b5a]">
          <div className="flex items-center gap-4">
            <button onClick={toggleEditMode} className={`px-4 py-1.5 rounded-full font-bold text-sm transition-all cursor-pointer ${isEditMode ? 'bg-[#ff1b5a] text-white' : 'bg-white/10'}`}>
              {isEditMode ? 'שמור שינויים' : 'עריכת תוכן'}
            </button>

            {isSuperAdmin && (
              <button onClick={() => setIsNewWorkshopModal(true)} className="bg-green-600 hover:bg-green-500 px-4 py-1.5 rounded-full text-sm font-bold shadow-md transition-all cursor-pointer">
                + סדנה חדשה
              </button>
            )}

            {isSuperAdmin && (
              <button 
                type="button" 
                onClick={() => setIsAiModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                ✨ סריקה חכמה (AI)
              </button>
            )}

            {isSuperAdmin && (
              <button 
                type="button" 
                onClick={() => {
                  setApiKeyInput(settings?.geminiApiKey || '');
                  setApiKeyStatusMsg('');
                  setIsApiKeyModalOpen(true);
                }}
                className="bg-purple-700 hover:bg-purple-600 px-3.5 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                title="הגדרת מפתח Gemini API של האתר"
              >
                <span>🔑</span>
                <span>מפתח Gemini</span>
              </button>
            )}

            {(isSuperAdmin || isEditMode) && (
              <button 
                type="button" 
                onClick={() => setIsSeoModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                title="צפה וערוך את נתוני ה-SEO, ה-AIEO ומפתח Gemini של האתר"
              >
                <span>🌐</span>
                <span>SEO & AIEO</span>
              </button>
            )}

            <button onClick={logout} className="text-white/40 hover:text-white text-xs font-bold cursor-pointer">התנתק</button>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs px-3 py-1 rounded-full font-bold ${isSuperAdmin ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-white/10 text-blue-200'}`}>
              {isSuperAdmin ? '👑 מנהל ראשי' : '✏️ עורך תוכן'}
            </span>
            {isEditMode && <div className="text-pink-200 text-xs font-bold animate-pulse">מצב עריכה חי - לחצו על טקסט או תמונה</div>}
          </div>
        </div>
      )}

      {/* Gemini API Key Modal */}
      {isApiKeyModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-7 max-w-lg w-full shadow-2xl border-4 border-purple-300 text-right space-y-4" dir="rtl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔑</span>
                <h3 className="text-xl font-black text-blue-950 font-creative">הגדרת מפתח Gemini API</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsApiKeyModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 font-bold text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              המפתח משמש את כל יכולות ה-AI באתר: סריקה ויצירת סדנאות מ-PDF, כתיבת תיאורים ומאמרים חכמים, ואופטימיזציית SEO & AIEO.
              המפתח נשמר ישירות בענן ב-Firebase ומשפיע מיידית על האתר.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">מפתח Google Gemini API (מתחיל ב-AIzaSy... או AQ...):</label>
              <input 
                type="password"
                placeholder="AIzaSy... או AQ..."
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                className="w-full bg-blue-50 px-4 py-3 rounded-xl border-2 border-transparent focus:border-purple-400 outline-none font-mono text-left text-xs font-bold"
                dir="ltr"
              />
            </div>

            {apiKeyStatusMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold ${apiKeyStatusMsg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {apiKeyStatusMsg}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button 
                type="button"
                onClick={handleTestApiKey}
                disabled={isTestingApiKey}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isTestingApiKey ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>בודק תקינות מפתח...</span>
                  </>
                ) : (
                  <>
                    <span>🧪</span>
                    <span>בדוק מפתח</span>
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 text-xs font-bold cursor-pointer"
                >
                  ביטול
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveApiKey}
                  className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  שמור מפתח בענן
                </button>
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium">
              💡 <strong>כיצד להוציא מפתח חדש?</strong><br />
              היכנס ל-<strong>Google AI Studio</strong> (קישור: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700">aistudio.google.com/apikey</a>), לחץ על Create API Key, והדבק את המפתח המתחיל ב-<code>AIzaSy</code> כאן.
            </div>
          </div>
        </div>
      )}

      {/* SEO & AIEO Inspector & Editor Modal */}
      <SeoInspectorModal
        isOpen={isSeoModalOpen}
        onClose={() => setIsSeoModalOpen(false)}
        pageKey={currentPageKey}
        pageType={location.pathname.startsWith('/workshop/') ? 'course' : (location.pathname.startsWith('/category/') ? 'article' : 'website')}
      />
    </>
  );
};

export default AdminToolbar;
