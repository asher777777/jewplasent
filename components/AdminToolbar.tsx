
import React, { useState } from 'react';
import { useAdmin } from '../contexts/AdminContext.tsx';
import { extractWorkshopFromImage } from '../services/GeminiCreator.ts';
import { auth } from '../firebase.ts';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { FirestoreService } from '../services/FirestoreService.ts';
import { Category } from '../types.ts';

const CATEGORIES: Category[] = ["תשרי", "שבת", "חנוכה", "שבט", "פורים", "פסח", "ל\"ג בעומר", "שבועות", "סוף שנה וקייטנות"];

const AdminToolbar: React.FC = () => {
  const { isAdmin, isEditMode, toggleEditMode, logout, showLoginModal, setShowLoginModal } = useAdmin();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isNewWorkshopModal, setIsNewWorkshopModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  
  const [newWorkshop, setNewWorkshop] = useState({
    title: '',
    category: CATEGORIES[0],
    description: '',
    result: '',
    duration: '',
    audience: ''
  });

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isRegisterMode && loginForm.password !== loginForm.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    try {
      if (isRegisterMode) await createUserWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      else await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setShowLoginModal(false);
    } catch (err: any) {
      setError('שגיאה בתהליך ההתחברות');
    }
  };

  const handleCreateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await FirestoreService.addWorkshop({
        ...newWorkshop,
        id: Date.now(),
        images: ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1200"]
      });
      setIsNewWorkshopModal(false);
      alert("הסדנה נוצרה בהצלחה!");
      window.location.reload();
    } catch (err) {
      alert("שגיאה ביצירת הסדנה");
    }
  };

  const handleAiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAiLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const workshopData = await extractWorkshopFromImage(base64);
        await FirestoreService.addWorkshop({
          ...workshopData,
          id: Date.now(),
          images: ["https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=1000"]
        });
        alert("הסדנה חולצה בהצלחה על ידי ה-AI!");
        window.location.reload();
      } catch (err) {
        alert("שגיאה בחילוץ נתונים.");
      } finally {
        setIsAiLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {/* Auth Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] p-8 max-w-md w-full shadow-2xl border-4 border-blue-200">
            <h2 className="text-3xl font-black text-blue-950 mb-6 font-creative text-center">כניסת מנהל</h2>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <input required type="email" placeholder="אימייל" className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
              <input required type="password" placeholder="סיסמה" className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
              {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg">התחברות</button>
              <button type="button" onClick={() => setShowLoginModal(false)} className="w-full text-gray-400 font-bold">ביטול</button>
            </form>
          </div>
        </div>
      )}

      {/* New Workshop Modal */}
      {isNewWorkshopModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-8 max-w-2xl w-full shadow-2xl border-4 border-blue-200 my-8">
            <h2 className="text-3xl font-black text-blue-950 mb-6 font-creative text-center">הוספת סדנה חדשה</h2>
            <form onSubmit={handleCreateWorkshop} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <input required type="text" placeholder="שם הסדנה" className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right" value={newWorkshop.title} onChange={e => setNewWorkshop({...newWorkshop, title: e.target.value})} />
              </div>
              <select className="w-full bg-blue-50 px-6 py-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-right" value={newWorkshop.category} onChange={e => setNewWorkshop({...newWorkshop, category: e.target.value as Category})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
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

      {/* Admin Toolbar */}
      {isAdmin && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-blue-900 text-white px-6 py-3 flex items-center justify-between shadow-2xl border-t-4 border-[#ff1b5a]">
          <div className="flex items-center gap-4">
            <button onClick={toggleEditMode} className={`px-4 py-1.5 rounded-full font-bold text-sm transition-all ${isEditMode ? 'bg-[#ff1b5a] text-white' : 'bg-white/10'}`}>
              {isEditMode ? 'שמור שינויים' : 'עריכת תוכן'}
            </button>
            <button onClick={() => setIsNewWorkshopModal(true)} className="bg-green-600 hover:bg-green-500 px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
              + סדנה חדשה
            </button>
            <label className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-full cursor-pointer text-sm font-bold flex items-center gap-2 shadow-md">
              {isAiLoading ? 'Gemini מנתח...' : 'סריקה חכמה (AI)'}
              <input type="file" className="hidden" accept="image/*" onChange={handleAiUpload} disabled={isAiLoading} />
            </label>
            <button onClick={logout} className="text-white/40 hover:text-white text-xs font-bold">התנתק</button>
          </div>
          {isEditMode && <div className="text-pink-200 text-xs font-bold animate-pulse">מצב עריכה חי - לחצו על טקסט או תמונה</div>}
        </div>
      )}
    </>
  );
};

export default AdminToolbar;
