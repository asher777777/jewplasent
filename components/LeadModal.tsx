import React, { useState, useEffect } from 'react';
import { FirestoreService } from '../services/FirestoreService.ts';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
}

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, categoryName }) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    institution: '',
    message: ''
  });

  useEffect(() => {
    if (isOpen && categoryName) {
      setForm(prev => ({
        ...prev,
        message: `שלום, אשמח לקבל פרטים נוספים לגבי סדנאות ${categoryName}.`
      }));
    }
  }, [isOpen, categoryName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await FirestoreService.saveLead({
        ...form,
        source: `category_page_${categoryName}`,
        createdAt: new Date().toISOString()
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setForm({ name: '', phone: '', institution: '', message: '' });
      }, 2500);
    } catch (err) {
      console.error("Error saving lead:", err);
      alert("חלה שגיאה בשליחת הטופס. אנא נסו שוב.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl border-4 border-blue-200 relative overflow-hidden">
        <button 
          onClick={onClose} 
          className="absolute top-6 left-6 text-gray-400 hover:text-red-500 transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {submitted ? (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-3xl font-black text-blue-900 mb-2">תודה רבה!</h3>
            <p className="text-gray-600 font-bold">הפרטים התקבלו בהצלחה. נחזור אליכם בהקדם האפשרי.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h3 className="text-3xl font-black text-blue-900 font-creative">הזמנת פעילות</h3>
              <p className="text-gray-500 font-bold mt-1">סדנאות {categoryName}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">שם מלא *</label>
                <input 
                  required 
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-bold"
                  placeholder="שם המזמין/ה"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">טלפון ליצירת קשר *</label>
                <input 
                  required 
                  type="tel" 
                  value={form.phone} 
                  onChange={e => setForm({ ...form, phone: e.target.value })} 
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-bold text-right"
                  placeholder="050-0000000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">מוסד / יישוב</label>
                <input 
                  type="text" 
                  value={form.institution} 
                  onChange={e => setForm({ ...form, institution: e.target.value })} 
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-bold"
                  placeholder="בית ספר / מתנ״ס / פרטי"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">הערות ובקשות</label>
                <textarea 
                  rows={3} 
                  value={form.message} 
                  onChange={e => setForm({ ...form, message: e.target.value })} 
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-bold resize-none"
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-[#ff1b5a] hover:bg-[#e61750] text-white font-black py-4 rounded-xl text-lg shadow-lg shadow-pink-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>שלח פרטים ונחזור אליך</span>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default LeadModal;
