
import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Workshop } from '../types.ts';
import Editable from '../components/Editable.tsx';
import { useAdmin } from '../contexts/AdminContext.tsx';
import { FirestoreService } from '../services/FirestoreService.ts';
import { storage } from '../firebase.ts';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

interface WorkshopDetailProps {
  workshops: Workshop[];
}

const DetailPoint: React.FC<{ icon: React.ReactNode; label: string; value: string; id?: string }> = ({ icon, label, value, id }) => (
  <div className="flex items-center gap-4 text-gray-700">
    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm">
      {icon}
    </div>
    <div>
      <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">{label}</span>
      {id ? (
        <Editable id={id} className="text-base font-bold text-blue-900">{value}</Editable>
      ) : (
        <span className="text-base font-bold text-blue-900">{value}</span>
      )}
    </div>
  </div>
);

const WorkshopDetail: React.FC<WorkshopDetailProps> = ({ workshops }) => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, isEditMode } = useAdmin();
  const [isUploading, setIsUploading] = useState(false);
  
  const workshop = workshops.find(w => String(w.id) === String(id));

  const handleAddGalleryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workshop?.firestoreId) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `workshops/${workshop.id}/gallery_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      const currentImages = workshop.images || [];
      await FirestoreService.updateWorkshop(workshop.firestoreId, {
        images: [...currentImages, url]
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("העלאה נכשלה");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    if (!workshop?.firestoreId || !window.confirm("להסיר את התמונה מהגלריה?")) return;
    
    try {
      const newImages = (workshop.images || []).filter(img => img !== imageUrl);
      await FirestoreService.updateWorkshop(workshop.firestoreId, {
        images: newImages
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-black text-gray-800 mb-4">הסדנה לא נמצאה...</h2>
          <Link to="/" className="bg-[#ff1b5a] text-white px-8 py-3 rounded-xl font-black shadow-lg">חזרה לחיפוש</Link>
        </div>
      </div>
    );
  }

  const prefix = `workshop_${workshop.id}_`;
  const galleryImages = workshop.images || [];

  return (
    <div className="min-h-screen bg-[#f8fbfe] pb-20">
      {/* Hero Header */}
      <div className="bg-[#ff1b5a] text-white py-6 shadow-xl sticky top-20 z-40 md:static">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="hidden md:block text-right">
            <nav className="text-[10px] font-black uppercase tracking-widest flex gap-2 items-center opacity-80 mb-1" dir="rtl">
              <Link to="/">דף הבית</Link> <span className="text-xs">»</span>
              <span>{workshop.title}</span>
            </nav>
            <h1 className="text-4xl lg:text-5xl font-black font-creative tracking-tight drop-shadow-md">
              <Editable id={`${prefix}title`}>{workshop.title}</Editable>
            </h1>
          </div>
          <Link to="/" className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full font-black text-sm transition-all flex items-center gap-2 border border-white/20 backdrop-blur-sm">
            חזרה לחיפוש
            <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 lg:mt-16">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Main Info Column */}
          <div className="lg:col-span-7 space-y-12">
            <div className="relative group">
              <Editable 
                id={`${prefix}main_image`} 
                type="image" 
                className="relative overflow-hidden rounded-[3rem] shadow-2xl border-4 border-white aspect-video bg-gray-100 childish-border"
              >
                {galleryImages[0] || "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1200"}
              </Editable>
            </div>

            {/* Gallery Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black text-blue-900 font-creative">גלריית תמונות</h3>
                {isAdmin && (
                  <label className="bg-blue-600 text-white px-4 py-2 rounded-full font-black text-xs cursor-pointer hover:bg-blue-700 transition-colors flex items-center gap-2">
                    {isUploading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "+"}
                    הוסף תמונה לגלריה
                    <input type="file" className="hidden" onChange={handleAddGalleryImage} disabled={isUploading} />
                  </label>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {galleryImages.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden shadow-md border-2 border-white hover:scale-105 transition-transform bg-gray-100">
                    <img src={img} className="w-full h-full object-cover" alt="" />
                    {isAdmin && (
                      <button 
                        onClick={() => handleRemoveImage(img)}
                        className="absolute top-2 left-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border-2 border-blue-100 space-y-6">
                 <h3 className="text-3xl font-black text-[#ff1b5a] font-creative text-right">פרטים על הסדנה</h3>
                 <div className="space-y-4">
                    {[
                      { id: `${prefix}audience`, label: "גילאים", val: workshop.audience, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
                      { id: `${prefix}values`, label: "ערכים", val: workshop.values || "ערכי החג והמסורת", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
                      { id: `${prefix}duration`, label: "זמן משוער", val: workshop.duration, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 py-3 border-b border-blue-50 last:border-0 rounded-lg px-2">
                        <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-500">
                          {item.icon}
                        </div>
                        <span className="font-bold text-gray-400 text-sm min-w-[100px] text-right">{item.label}:</span>
                        <Editable id={item.id} className="font-black text-blue-900 text-right">{item.val}</Editable>
                      </div>
                    ))}
                 </div>
               </div>
            </div>
          </div>

          {/* Right Column (CTA) */}
          <div className="lg:col-span-5 space-y-12">
            <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl border border-gray-100 flex flex-col items-center text-center childish-border">
              <h2 className="text-5xl md:text-6xl font-black text-[#ff1b5a] mb-6 leading-tight font-creative">
                <Editable id={`${prefix}title_big`}>{workshop.title}</Editable>
              </h2>
              
              <div className="space-y-10 mb-12 w-full text-right">
                 <div className="grid grid-cols-1 gap-6">
                    <DetailPoint id={`${prefix}result_2`} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} label="תוצר אישי" value={workshop.result} />
                 </div>
              </div>

              <div className="flex flex-col gap-4 w-full">
                 <button className="w-full bg-[#ff1b5a] text-white py-6 rounded-3xl font-black text-2xl shadow-xl hover:scale-105 transition-all font-creative">
                    בקשת הצעה לפעילות
                 </button>
                 <a href="tel:0584327701" className="text-center font-black text-blue-900 hover:text-[#ff1b5a] transition-colors py-3 text-lg">
                   התקשרו: <span className="underline">058-4327701</span>
                 </a>
              </div>
            </div>

            <div className="prose prose-lg max-w-none text-right px-4">
              <h3 className="text-4xl font-black text-blue-900 font-creative mb-8">
                תיאור הפעילות
              </h3>
              <Editable id={`${prefix}longDescription`} type="textarea" className="text-xl text-gray-600 leading-relaxed font-medium">
                {workshop.longDescription || workshop.description}
              </Editable>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkshopDetail;
