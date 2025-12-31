
import React, { useState } from 'react';
import { db } from '../firebase.ts';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const Contact: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    institution: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "leads"), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Error saving lead:", err);
      alert("חלה שגיאה בשליחת הטופס. נסו שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-24 bg-[#f8fbfe] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-30 -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-100 rounded-full blur-[100px] opacity-30 translate-y-1/2 -translate-x-1/2"></div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-100/50 px-4 py-2 rounded-full border border-blue-200 mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="text-blue-700 text-sm font-black uppercase tracking-widest">דברו איתנו</span>
            </div>
            
            <h2 className="text-5xl md:text-7xl font-black text-blue-950 mb-8 leading-[1.1] font-creative">
              נשמח לעמוד לשירותכם <br />
              <span className="text-[#ff1b5a]">ולהביא את האור אליכם</span>
            </h2>
            
            <p className="text-xl text-gray-600 mb-12 max-w-lg font-medium leading-relaxed">
              הצוות שלנו זמין לכל שאלה, בקשה להצעת מחיר או התייעצות לגבי בניית תכנית שנתית מותאמת אישית למוסד שלכם.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-6 group">
                <div className="bg-white p-5 rounded-[2rem] shadow-xl text-blue-600 border-2 border-blue-50 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">טלפון ישיר - בצלאל</h4>
                  <a href="tel:0584327701" className="text-3xl text-blue-900 font-black hover:text-[#ff1b5a] transition-colors">058-4327701</a>
                </div>
              </div>

              <div className="flex items-start gap-6 group">
                <div className="bg-white p-5 rounded-[2rem] shadow-xl text-pink-500 border-2 border-pink-50 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">דוא"ל לתיאומים</h4>
                  <a href="mailto:office@sadnaot.com" className="text-3xl text-blue-900 font-black hover:text-[#ff1b5a] transition-colors">office@sadnaot.com</a>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white p-10 md:p-14 rounded-[4rem] shadow-2xl border-4 border-white childish-border relative z-10">
              {submitted ? (
                <div className="py-20 text-center animate-fade-in">
                  <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-4xl font-black text-blue-950 mb-4 font-creative">ההודעה נשלחה בהצלחה!</h3>
                  <p className="text-gray-500 text-lg font-bold">בצלאל יחזור אליכם בהקדם האפשרי.</p>
                  <button onClick={() => setSubmitted(false)} className="mt-10 text-blue-600 font-black underline">שלח הודעה נוספת</button>
                </div>
              ) : (
                <>
                  <h3 className="text-4xl font-black text-blue-950 mb-10 font-creative text-center">השאירו פרטים ונחזור אליכם</h3>
                  <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-4">שם מלא</label>
                        <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-blue-50/50 px-6 py-4 rounded-[1.5rem] border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none transition-all font-bold" placeholder="ישראל ישראלי" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-4">טלפון</label>
                        <input required type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-blue-50/50 px-6 py-4 rounded-[1.5rem] border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none transition-all font-bold" placeholder="050-0000000" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-4">שם המוסד</label>
                      <input required type="text" value={formData.institution} onChange={(e) => setFormData({...formData, institution: e.target.value})} className="w-full bg-blue-50/50 px-6 py-4 rounded-[1.5rem] border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none transition-all font-bold" placeholder="בית ספר / קהילה..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-4">הודעה</label>
                      <textarea rows={4} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} className="w-full bg-blue-50/50 px-6 py-4 rounded-[1.5rem] border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none transition-all font-bold resize-none" placeholder="איך נוכל לעזור לכם?"></textarea>
                    </div>
                    
                    <button 
                      disabled={isSubmitting}
                      type="submit" 
                      className="w-full bg-[#ff1b5a] text-white font-black py-6 rounded-[2rem] text-xl shadow-xl shadow-pink-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        "שלח פנייה לרכז"
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
