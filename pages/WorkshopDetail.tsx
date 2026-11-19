import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Workshop, ExtraDetail } from '../types.ts';
import Editable from '../components/Editable.tsx';
import IconPicker, { ICONS } from '../components/IconPicker.tsx';
import { useAdmin } from '../contexts/AdminContext.tsx';
import { FirestoreService } from '../services/FirestoreService.ts';
import { storage } from '../firebase.ts';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { INITIAL_CATEGORIES, findCategory, cleanEnglishSlug, CategoryItem, isDummyImage, DEFAULT_SITE_IMAGE } from '../categories.ts';
import { generateWorkshopDescription } from '../services/GeminiCreator.ts';
import SeoHead from '../components/SeoHead.tsx';
import RelatedWorkshops from '../components/RelatedWorkshops.tsx';

interface WorkshopDetailProps {
  workshops: Workshop[];
}

const DetailPoint: React.FC<{ icon: React.ReactNode; label: string; value: string; id?: string; onSave?: (val: string) => Promise<void> }> = ({ icon, label, value, id, onSave }) => (
  <div className="flex items-center gap-4 text-gray-700">
    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm shrink-0">
      {icon}
    </div>
    <div className="text-right">
      <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">{label}</span>
      {id ? (
        <Editable id={id} onSave={onSave} className="text-base font-normal text-gray-700">{value}</Editable>
      ) : (
        <span className="text-base font-normal text-gray-700">{value}</span>
      )}
    </div>
  </div>
);

const WorkshopDetail: React.FC<WorkshopDetailProps> = ({ workshops }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, isEditMode, settings, updateSettings, getContent } = useAdmin();
  const [isUploading, setIsUploading] = useState(false);
  const [isChangingCategory, setIsChangingCategory] = useState(false);
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [activeIconPicker, setActiveIconPicker] = useState<number>(-1);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  
  const workshop = workshops.find(w => String(w.id) === String(id) || (w.slug && w.slug === id));
  const [currentCategory, setCurrentCategory] = useState(workshop?.category || '');

  useEffect(() => {
    if (workshop?.category) {
      setCurrentCategory(workshop.category);
    }
  }, [workshop?.category]);

  const customCategories: CategoryItem[] = settings?.customCategories || [];
  const allCategories: CategoryItem[] = [...INITIAL_CATEGORIES, ...customCategories];
  const catItem = findCategory(currentCategory, customCategories);

  // Helper: Ensure workshop exists in Firestore before editing
  const getEffectiveFirestoreId = async (): Promise<string | null> => {
    if (!workshop) return null;
    if (workshop.firestoreId) return workshop.firestoreId;

    try {
      const existingId = await FirestoreService.getWorkshopByNumericId(workshop.id);
      if (existingId) {
        workshop.firestoreId = existingId;
        return existingId;
      }
    } catch (e) {
      console.error("Error checking for existing workshop:", e);
    }

    try {
      const docRef = await FirestoreService.addWorkshop(workshop);
      workshop.firestoreId = docRef.id;
      return docRef.id;
    } catch (e) {
      console.error("Failed to ensure workshop in Firestore:", e);
      alert("שגיאה ביצירת עותק לעריכה בענן.");
      return null;
    }
  };

  const handleUpdateWorkshopField = async (field: keyof Workshop, value: any) => {
    const firestoreId = await getEffectiveFirestoreId();
    if (!firestoreId) return;

    try {
      await FirestoreService.updateWorkshop(firestoreId, { [field]: value });
      if (workshop) {
        (workshop as any)[field] = value;
      }
    } catch (err) {
      console.error("Update failed:", err);
      alert("שגיאה בעדכון השדה בענן.");
    }
  };

  const handleDeleteWorkshop = async () => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק את הסדנה הזו לצמיתות?")) return;

    const firestoreId = await getEffectiveFirestoreId();
    if (firestoreId) {
      try {
        await FirestoreService.deleteWorkshop(firestoreId);
        alert("הסדנה נמחקה בהצלחה");
        navigate("/");
      } catch (e) {
        console.error(e);
        alert("שגיאה במחיקת הסדנה");
      }
    }
  };

  // Strictly protected for isSuperAdmin (ADMIN770) only
  const handleGenerateDescription = async () => {
    if (!isSuperAdmin || !workshop) return;

    setIsGeneratingDesc(true);
    try {
      const generatedText = await generateWorkshopDescription(
        workshop.title,
        workshop.category,
        workshop.longDescription || workshop.description || "",
        settings?.geminiApiKey
      );
      if (generatedText) {
        await handleUpdateWorkshopField('longDescription', generatedText);
      }
    } catch (err) {
      console.error("AI Generation failed:", err);
      alert("שגיאה ביצירת תיאור באמצעות AI.");
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleCategorySelect = async (newCategoryVal: string) => {
    if (newCategoryVal === '__NEW__') {
      setShowNewCatModal(true);
      return;
    }
    if (!newCategoryVal || newCategoryVal === currentCategory) return;
    
    setIsChangingCategory(true);
    try {
      await handleUpdateWorkshopField('category', newCategoryVal);
      setCurrentCategory(newCategoryVal);
      alert(`עמוד הסדנה הועבר בהצלחה לקטגוריית "${newCategoryVal}"!`);
    } catch (err) {
      console.error(err);
      alert("שגיאה בעדכון הקטגוריה.");
    } finally {
      setIsChangingCategory(false);
    }
  };

  const handleCreateAndAssignCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    const slug = cleanEnglishSlug(newCatSlug);
    if (!name || !slug) {
      alert("נא למלא שם קטגוריה וסלאג באנגלית.");
      return;
    }

    setIsChangingCategory(true);
    try {
      const newCatItem: CategoryItem = {
        id: name,
        slug: slug,
        title: name,
        subtitle: `סדנאות ${name}`,
        image: DEFAULT_SITE_IMAGE,
        color: "from-blue-400 via-indigo-500 to-purple-500"
      };
      const updatedCategories = [...customCategories, newCatItem];
      await updateSettings('customCategories', updatedCategories);

      await handleUpdateWorkshopField('category', name);
      setCurrentCategory(name);
      setShowNewCatModal(false);
      setNewCatName('');
      setNewCatSlug('');
      alert(`נוצרה קטגוריה חדשה "${name}" והעמוד שויך אליה בהצלחה!`);
    } catch (err) {
      console.error(err);
      alert("שגיאה ביצירת הקטגוריה ושיוך העמוד.");
    } finally {
      setIsChangingCategory(false);
    }
  };

  const handleAddGalleryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workshop) return;

    const firestoreId = await getEffectiveFirestoreId();
    if (!firestoreId) return;

    setIsUploading(true);
    try {
      const safeId = String(workshop.id);
      const storageRef = ref(storage, `workshops/${safeId}/gallery_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      const currentImages = workshop.images || [];
      const updatedImages = [...currentImages, url];
      await FirestoreService.updateWorkshop(firestoreId, { images: updatedImages });
      workshop.images = updatedImages;
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("העלאה נכשלה");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    if (!window.confirm("להסיר את התמונה מהגלריה?")) return;
    
    const firestoreId = await getEffectiveFirestoreId();
    if (!firestoreId) return;

    try {
      const newImages = (workshop?.images || []).filter(img => img !== imageUrl);
      await FirestoreService.updateWorkshop(firestoreId, { images: newImages });
      if (workshop) {
        workshop.images = newImages;
      }
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    try {
      // YouTube
      const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([^&?]+)/);
      if (ytMatch && ytMatch[1]) {
        return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&controls=1&loop=1&playlist=${ytMatch[1]}`;
      }
      // Vimeo
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch && vimeoMatch[1]) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&autopause=0`;
      }
    } catch (e) {
      console.error("Error parsing video URL", e);
    }
    return null;
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
  const galleryImages = (workshop.images || []).filter(img => !isDummyImage(img));
  const categoryBanner = getContent(`category_hero_banner_${currentCategory}`, getContent(`category_thumb_${currentCategory}`, ''));
  const defaultWorkshopImage = !isDummyImage(categoryBanner) ? categoryBanner : (settings?.siteLogo || DEFAULT_SITE_IMAGE);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const pageKey = `workshop_${workshop.slug || workshop.id}`;
    const effectiveTitle = getContent(`seo_title_${pageKey}`, workshop.title);
    
    let rawDesc = getContent(`seo_desc_${pageKey}`, workshop.description || workshop.longDescription || '');
    if (rawDesc === 'ניידות חב"ד ישראל' || rawDesc === (settings?.siteDescription)) {
      rawDesc = workshop.description || workshop.longDescription || '';
    }
    const cleanDesc = (rawDesc || '')
      .replace(/<[^>]*>?/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

    const formattedShareMessage = `✨ *${effectiveTitle}* ✨\n${cleanDesc}\n\n🔗 *לפרטים נוספים ותמונות:* ${shareUrl}`;

    // 1. Mobile Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: effectiveTitle,
          text: formattedShareMessage,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // user dismissed
      }
    }

    // 2. Direct WhatsApp / Clipboard Fallback
    try {
      await navigator.clipboard.writeText(formattedShareMessage);
    } catch (e) {
      // fallback
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedShareMessage)}`;
    if (window.confirm("התוכן והקישור הועתקו ללוח בהצלחה!\n\nהאם לפתוח כעת את WhatsApp לשיתוף מהיר?")) {
      window.open(waUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fbfe] pb-20">
      {/* SEO & AIEO Automated Meta + Schema.org Injection */}
      <SeoHead
        pageKey={`workshop_${id || workshop.slug || workshop.id}`}
        title={workshop.title}
        description={workshop.description || workshop.longDescription}
        image={galleryImages[0] || (workshop as any).image || settings?.siteLogo}
        url={window.location.href}
        type="course"
        keywords={[workshop.title, workshop.category, "סדנאות יצירה", "חב\"ד", workshop.values || "", "גפ\"ן 19053"]}
        schemaData={{
          "@context": "https://schema.org",
          "@type": "Course",
          "name": workshop.title,
          "description": (workshop.description || workshop.longDescription || "").replace(/<[^>]*>?/gm, '').trim(),
          "provider": {
            "@type": "EducationalOrganization",
            "name": 'חוויה של סדנה - ניידות חב"ד ישראל',
            "sameAs": "https://chabad-workshops-cms.web.app"
          },
          "image": galleryImages[0] || (workshop as any).image,
          "timeRequired": workshop.duration,
          "educationalLevel": workshop.audience,
          "about": workshop.values,
          "offers": {
            "@type": "Offer",
            "category": workshop.category,
            "availability": "https://schema.org/InStock"
          }
        }}
      />

      {/* Hero Header */}
      <div className="bg-[#ff1b5a] text-white py-6 shadow-xl sticky top-20 z-40 md:static">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="hidden md:block text-right">
            <nav className="text-xs font-bold uppercase tracking-wider flex gap-2 items-center opacity-90 mb-1" dir="rtl">
              <Link to="/" className="hover:underline">דף הבית</Link>
              <span className="text-xs opacity-60">»</span>
              <Link to={`/category/${catItem?.slug || currentCategory}`} className="hover:underline">
                {catItem?.title || currentCategory}
              </Link>
              <span className="text-xs opacity-60">»</span>
              <span className="opacity-80 truncate max-w-xs">{workshop.title}</span>
            </nav>
            <h1 className="text-4xl lg:text-5xl font-black font-creative tracking-tight drop-shadow-md">
              <Editable id={`${prefix}title`} onSave={(val) => handleUpdateWorkshopField('title', val)}>{workshop.title}</Editable>
            </h1>
          </div>
          <div className="flex gap-2 items-center">
            {/* Share Button with Link Preview Support */}
            <button
              type="button"
              onClick={handleShare}
              className="bg-white/20 hover:bg-white text-white hover:text-blue-900 px-4 py-2 rounded-full font-black text-xs transition-all flex items-center gap-1.5 shadow-md backdrop-blur-sm cursor-pointer"
              title="שתף קישור לפעילות"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>שתף פעילות</span>
            </button>

            {isAdmin && isEditMode && (
              <button
                type="button"
                onClick={handleDeleteWorkshop}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-black text-xs transition-all flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                <span>מחק סדנה</span>
              </button>
            )}
            <Link to="/" className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full font-black text-sm transition-all flex items-center gap-2 border border-white/20 backdrop-blur-sm">
              חזרה לחיפוש
              <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Category Relocation Banner for Edit Mode */}
      {isEditMode && (
        <div className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 border-b-2 border-amber-400 shadow-md py-3 px-4 sticky top-20 z-30">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4" dir="rtl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-blue-950 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              </div>
              <div>
                <span className="text-xs font-black text-amber-900 block">מצב עריכה: שיוך עמוד לקטגוריה</span>
                <span className="text-sm font-black text-blue-950">העבר עמוד זה לקטגוריה אחרת:</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={currentCategory}
                onChange={(e) => handleCategorySelect(e.target.value)}
                disabled={isChangingCategory}
                className="bg-white text-blue-900 font-black text-sm px-4 py-2.5 rounded-xl border-2 border-amber-500 shadow-sm hover:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {allCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.title} ({cat.slug})
                  </option>
                ))}
                <option value="__NEW__" className="text-blue-600 font-bold">+ צור קטגוריה חדשה...</option>
              </select>

              {isChangingCategory && (
                <div className="flex items-center gap-2 text-xs font-black text-blue-900 bg-white/70 px-3 py-1.5 rounded-lg border border-amber-400 animate-pulse">
                  <div className="w-3.5 h-3.5 border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
                  מעביר עמוד קטגוריה בענן...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal for creating a new category on the fly */}
      {showNewCatModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-amber-300 space-y-5" dir="rtl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-black text-blue-900 font-creative">יצירת קטגוריה חדשה והעברת העמוד</h3>
              <button 
                type="button" 
                onClick={() => setShowNewCatModal(false)}
                className="text-gray-400 hover:text-gray-700 font-black text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAndAssignCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">שם הקטגוריה (בעברית):</label>
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="לדוגמה: יום ירושלים"
                  className="w-full p-3 rounded-xl border-2 border-gray-200 text-sm font-bold focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  סלאג לקטגוריה באנגלית בלבד (לכתובת ה-URL):
                </label>
                <input 
                  type="text" 
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(cleanEnglishSlug(e.target.value))}
                  placeholder="לדוגמה: jerusalem-day"
                  className="w-full p-3 rounded-xl border-2 border-gray-200 text-sm font-bold focus:border-blue-500 focus:outline-none font-mono"
                  dir="ltr"
                  required
                />
                <span className="text-[11px] text-gray-500 block mt-1">
                  כתובת העמוד תהיה: <code className="bg-gray-100 px-1 py-0.5 rounded text-blue-700">/category/{newCatSlug || 'slug'}</code>
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isChangingCategory}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow-lg transition-all text-sm cursor-pointer"
                >
                  {isChangingCategory ? "יוצר ומעביר..." : "צור קטגוריה והעבר עמוד"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCatModal(false)}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm cursor-pointer"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 mt-8 lg:mt-16">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Main Info Column */}
          <div className="lg:col-span-7 space-y-12">
            <div id="workshop-hero-image" className="relative group">
              <Editable 
                id={`${prefix}main_image`} 
                type="image" 
                className="relative overflow-hidden rounded-[3rem] shadow-2xl border-4 border-white aspect-video bg-gray-100 childish-border"
              >
                {galleryImages[0] || defaultWorkshopImage}
              </Editable>
            </div>

            {/* Description Section with isSuperAdmin AI Generator */}
            <div className="prose prose-lg max-w-none text-right">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-3xl md:text-4xl font-black text-blue-900 font-creative">
                  תיאור הפעילות
                </h3>
                {/* STRICT PERMISSION: Only ADMIN770 (isSuperAdmin) can see AI capabilities */}
                {isSuperAdmin && isEditMode && (
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDesc}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full font-black text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingDesc ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>כותב תיאור...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span>AI כתוב לי</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <Editable 
                id={`${prefix}longDescription`} 
                type="textarea" 
                onSave={(val) => handleUpdateWorkshopField('longDescription', val)}
                className="text-lg md:text-xl text-gray-700 leading-relaxed font-normal"
                allowHtml={true}
                tag="div"
              >
                {workshop.longDescription || workshop.description}
              </Editable>
            </div>

            {/* Details Card - Spacious Layout + Dynamic Extra Details */}
            <div className="w-full">
               <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border-2 border-blue-100 space-y-6">
                 <div className="flex items-center justify-between border-b border-blue-50 pb-4">
                   <h3 className="text-3xl md:text-4xl font-black text-[#ff1b5a] font-creative text-right">
                     פרטים על הסדנה
                   </h3>
                   <div className="w-10 h-10 rounded-2xl bg-pink-50 text-[#ff1b5a] flex items-center justify-center shadow-xs">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                   </div>
                 </div>

                 <div className="space-y-4">
                    {/* 3 Fixed Details */}
                    {[
                      { id: `${prefix}audience`, label: "גילאים", field: 'audience', val: workshop.audience, icon: ICONS.users },
                      { id: `${prefix}values`, label: "ערכים", field: 'values', val: workshop.values || "ערכי החג והמסורת", icon: ICONS.heart },
                      { id: `${prefix}duration`, label: "זמן משוער", field: 'duration', val: workshop.duration, icon: ICONS.clock },
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-3.5 border-b border-blue-50 last:border-0 rounded-xl px-3 hover:bg-blue-50/30 transition-colors">
                        <div className="flex items-center gap-3 shrink-0 min-w-[130px]">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 shadow-xs">
                            {item.icon}
                          </div>
                          <span className="font-bold text-gray-500 text-sm text-right">{item.label}:</span>
                        </div>
                        <div className="flex-1 min-w-0 text-right pr-2 sm:pr-0">
                          <Editable 
                            id={item.id} 
                            onSave={(val) => handleUpdateWorkshopField(item.field as keyof Workshop, val)}
                            className="font-normal text-gray-700 text-base md:text-lg leading-relaxed block"
                          >
                            {item.val}
                          </Editable>
                        </div>
                      </div>
                    ))}

                    {/* Dynamic Extra Details */}
                    {(workshop.extraDetails || []).map((detail, idx) => (
                      <div key={`extra_${idx}`} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-3.5 border-b border-blue-50 last:border-0 rounded-xl px-3 hover:bg-blue-50/30 transition-colors relative group">
                        {isAdmin && isEditMode && (
                          <button
                            type="button"
                            onClick={async () => {
                              const newDetails = [...(workshop.extraDetails || [])];
                              newDetails.splice(idx, 1);
                              await handleUpdateWorkshopField('extraDetails', newDetails);
                            }}
                            className="absolute left-2 top-3 text-red-400 hover:text-red-600 font-black text-xs cursor-pointer p-1 rounded-md hover:bg-red-50 z-10"
                            title="הסר פרט זה"
                          >
                            ✕
                          </button>
                        )}

                        <div className="flex items-center gap-3 shrink-0 min-w-[130px]">
                          <div className="relative">
                            <div
                              className={`w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 shadow-xs ${isAdmin && isEditMode ? 'cursor-pointer hover:bg-amber-100 hover:text-amber-800' : ''}`}
                              onClick={() => isAdmin && isEditMode && setActiveIconPicker(idx)}
                              title={isAdmin && isEditMode ? "לחץ להחלפת אייקון" : ""}
                            >
                              {ICONS[detail.icon] || ICONS.star}
                            </div>

                            <IconPicker
                              isOpen={activeIconPicker === idx}
                              onClose={() => setActiveIconPicker(-1)}
                              onSelect={async (newIcon) => {
                                const newDetails = [...(workshop.extraDetails || [])];
                                newDetails[idx] = { ...newDetails[idx], icon: newIcon };
                                await handleUpdateWorkshopField('extraDetails', newDetails);
                              }}
                            />
                          </div>

                          <Editable
                            id={`${prefix}extra_label_${idx}`}
                            onSave={async (val) => {
                              const newDetails = [...(workshop.extraDetails || [])];
                              newDetails[idx] = { ...newDetails[idx], label: val };
                              await handleUpdateWorkshopField('extraDetails', newDetails);
                            }}
                            className="font-bold text-gray-500 text-sm block"
                          >
                            {detail.label}
                          </Editable>
                        </div>

                        <div className="flex-1 min-w-0 text-right pr-2 sm:pr-0">
                          <Editable
                            id={`${prefix}extra_val_${idx}`}
                            onSave={async (val) => {
                              const newDetails = [...(workshop.extraDetails || [])];
                              newDetails[idx] = { ...newDetails[idx], value: val };
                              await handleUpdateWorkshopField('extraDetails', newDetails);
                            }}
                            className="font-normal text-gray-700 text-base md:text-lg leading-relaxed block"
                          >
                            {detail.value}
                          </Editable>
                        </div>
                      </div>
                    ))}
                 </div>

                 {/* Add New Detail Button */}
                 {isAdmin && isEditMode && (
                   <button
                     type="button"
                     onClick={async () => {
                       const newDetails = [...(workshop.extraDetails || [])];
                       newDetails.push({ icon: 'star', label: 'פרט חדש:', value: 'ערך או מידע נוסף' });
                       await handleUpdateWorkshopField('extraDetails', newDetails);
                     }}
                     className="w-full py-2.5 border-2 border-dashed border-blue-200 rounded-xl text-blue-500 font-black hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer mt-4"
                   >
                     <span>+</span>
                     <span>הוסף פרט נוסף לסדנה</span>
                   </button>
                 )}
               </div>
            </div>

            {/* Gallery Section */}
            <div className="space-y-6 pt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black text-blue-900 font-creative">גלריית תמונות</h3>
                {isAdmin && (
                  <label className="bg-blue-600 text-white px-4 py-2 rounded-full font-black text-xs cursor-pointer hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md">
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
                        type="button"
                        onClick={() => handleRemoveImage(img)}
                        className="absolute top-2 left-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="הסר תמונה מהגלריה"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {galleryImages.length === 0 && (
                <div className="w-full py-8 text-center text-gray-400 font-bold border-2 border-dashed border-blue-100 bg-blue-50/30 rounded-2xl text-sm">
                  אין עדיין תמונות נוספות בגלריה
                </div>
              )}
            </div>

            {/* Video Section - RESTORED! */}
            {(workshop.videoUrl || (isAdmin && isEditMode)) && (
              <div className="space-y-6 pt-4">
                <div className="text-right">
                  <h3 className="text-3xl md:text-4xl font-black text-blue-900 font-creative mb-2">
                    וידאו מהסדנה
                  </h3>
                  {isAdmin && isEditMode && (
                    <div className="my-4 relative">
                      <label className="block text-xs font-black text-gray-500 mb-1">קישור ליוטיוב / וימאו:</label>
                      <input
                        type="text"
                        placeholder="הדבק כאן קישור ליוטיוב או וימאו (לדוגמה: https://youtu.be/...)"
                        defaultValue={workshop.videoUrl || ''}
                        onBlur={(e) => handleUpdateWorkshopField('videoUrl', e.target.value.trim())}
                        className="w-full px-5 py-3 rounded-2xl border-2 border-blue-200 focus:border-[#ff1b5a] outline-none text-right font-bold text-gray-700 shadow-xs bg-white text-sm"
                        dir="ltr"
                      />
                    </div>
                  )}
                </div>

                {getEmbedUrl(workshop.videoUrl || '') && (
                  <div className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-black">
                    <iframe
                      src={getEmbedUrl(workshop.videoUrl || '') || ''}
                      title={workshop.title || "Video"}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}

                {!getEmbedUrl(workshop.videoUrl || '') && workshop.videoUrl && (
                  <div className="text-center p-6 bg-red-50 text-red-500 rounded-2xl border-2 border-red-100 font-bold text-sm">
                    הקישור אינו תקין. אנא הזן קישור תקין מ-YouTube או Vimeo.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column (CTA) */}
          <div className="lg:col-span-5 space-y-12">
            <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl border border-gray-100 flex flex-col items-center text-center childish-border">
              <h2 className="text-5xl md:text-6xl font-black text-[#ff1b5a] mb-6 leading-tight font-creative">
                <Editable id={`${prefix}title_big`} onSave={(val) => handleUpdateWorkshopField('title', val)}>{workshop.title}</Editable>
              </h2>
              
              <div className="space-y-10 mb-12 w-full text-right">
                 <div className="grid grid-cols-1 gap-6">
                    <DetailPoint id={`${prefix}result_2`} onSave={(val) => handleUpdateWorkshopField('result', val)} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} label="תוצר אישי" value={workshop.result} />
                 </div>
              </div>

              <div className="flex flex-col gap-4 w-full">
                 <button className="w-full bg-[#ff1b5a] text-white py-6 rounded-3xl font-black text-2xl shadow-xl hover:scale-105 transition-all font-creative cursor-pointer">
                    בקשת הצעה לפעילות
                 </button>
                 <a href="tel:0584327701" className="text-center font-black text-blue-900 hover:text-[#ff1b5a] transition-colors py-3 text-lg">
                   התקשרו: <span className="underline">058-4327701</span>
                 </a>
              </div>
            </div>
          </div>
        </div>

        {/* Related Workshops Listing (Semantic Default + Admin Configurable) */}
        <RelatedWorkshops currentWorkshop={workshop} allWorkshops={workshops} />
      </div>
    </div>
  );
};

export default WorkshopDetail;
