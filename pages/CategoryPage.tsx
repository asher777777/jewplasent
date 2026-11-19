import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Workshop } from '../types.ts';
import { findCategory, INITIAL_CATEGORIES, cleanEnglishSlug, getOrderedCategories, CategoryItem, isDummyImage, DEFAULT_SITE_IMAGE } from '../categories.ts';
import WorkshopCard from '../components/WorkshopCard.tsx';
import Editable from '../components/Editable.tsx';
import LeadModal from '../components/LeadModal.tsx';
import MomentsGallery from '../components/MomentsGallery.tsx';
import WysiwygEditor from '../components/WysiwygEditor.tsx';
import SeoHead from '../components/SeoHead.tsx';
import { useAdmin } from '../contexts/AdminContext.tsx';
import { storage } from '../firebase.ts';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

interface CategoryPageProps {
  workshops: Workshop[];
}

const CategoryPage: React.FC<CategoryPageProps> = ({ workshops }) => {
  const { category: categoryParam } = useParams<{ category: string }>();
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const { isEditMode, isSuperAdmin, updateContent, getContent, settings, updateSettings } = useAdmin();
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [localBannerUrl, setLocalBannerUrl] = useState<string>('');
  
  // Dedicated Image Change Modal states & refs
  const [isChangeBannerModalOpen, setIsChangeBannerModalOpen] = useState(false);
  const [modalBannerPreview, setModalBannerPreview] = useState<string>('');
  const [modalBannerInputUrl, setModalBannerInputUrl] = useState<string>('');
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const directBannerInputRef = React.useRef<HTMLInputElement>(null);
  const modalBannerInputRef = React.useRef<HTMLInputElement>(null);
  
  // Modals for display ordering
  const [isReorderWorkshopsModalOpen, setIsReorderWorkshopsModalOpen] = useState(false);
  const [isReorderCatsModalOpen, setIsReorderCatsModalOpen] = useState(false);

  // Categories & custom ordering from settings
  const customCategories: CategoryItem[] = settings?.customCategories || [];
  const categoryOrder: string[] = settings?.categoryOrder || [];
  
  const allCategories = useMemo(() => {
    return getOrderedCategories([...INITIAL_CATEGORIES, ...customCategories], categoryOrder);
  }, [customCategories, categoryOrder]);

  // Find category by slug (e.g. "shevat") or Hebrew name (e.g. "שבט")
  const currentCategory = findCategory(categoryParam, customCategories);
  const categoryId = currentCategory ? currentCategory.id : (categoryParam ? decodeURIComponent(categoryParam) : '');
  const categorySlug = currentCategory ? currentCategory.slug : categoryId;
  const categoryTitle = currentCategory ? currentCategory.title : categoryId;

  // Active categories that have actual content (in sorted order)
  const activeHolidays = useMemo(() => {
    return allCategories.filter(h => 
      workshops.some(w => w.category === h.id || w.category === h.slug)
    );
  }, [allCategories, workshops]);

  // Filter workshops belonging to this category
  const categoryWorkshops = useMemo(() => {
    return workshops.filter(w => 
      w.category === categoryId || 
      w.category === categorySlug ||
      (currentCategory && w.category === currentCategory.title)
    );
  }, [workshops, categoryId, categorySlug, currentCategory]);

  // Workshops custom display order from Firestore overrides
  const workshopsOrder: (string | number)[] = getContent(
    `category_workshops_order_${categoryId}`,
    getContent(`category_workshops_order_${categorySlug}`, [])
  );

  const sortedCategoryWorkshops = useMemo(() => {
    if (!workshopsOrder || workshopsOrder.length === 0) return categoryWorkshops;
    const orderMap = new Map<string, number>();
    workshopsOrder.forEach((id, idx) => {
      orderMap.set(String(id), idx);
    });
    return [...categoryWorkshops].sort((a, b) => {
      const idxA = orderMap.has(String(a.id)) ? orderMap.get(String(a.id))! : 9999;
      const idxB = orderMap.has(String(b.id)) ? orderMap.get(String(b.id))! : 9999;
      return idxA - idxB;
    });
  }, [categoryWorkshops, workshopsOrder]);

  // Workshop reordering handlers
  const moveWorkshop = async (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= sortedCategoryWorkshops.length) return;
    const reordered = [...sortedCategoryWorkshops];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const newIds = reordered.map(w => w.id);
    await updateContent({
      [`category_workshops_order_${categoryId}`]: newIds,
      [`category_workshops_order_${categorySlug}`]: newIds,
    });
  };

  const moveWorkshopToTop = async (idx: number) => {
    if (idx === 0) return;
    await moveWorkshop(idx, 0);
  };

  // Category page pill strip reordering handler
  const moveCategoryPill = async (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= activeHolidays.length) return;
    const reordered = [...activeHolidays];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const newOrderKeys = reordered.map(c => c.slug || c.id);
    await updateSettings('categoryOrder', newOrderKeys);
  };

  // Banner image resolution: check Hebrew key, English key, thumbnail overrides, and default
  const siteLogo = settings?.siteLogo || DEFAULT_SITE_IMAGE;
  const rawCatImg = currentCategory?.image;
  const defaultBanner = (!isDummyImage(rawCatImg) ? rawCatImg : '') || siteLogo;
  const rawBannerUrl = getContent(
    `category_hero_banner_${categoryId}`,
    getContent(
      `category_hero_banner_${categorySlug}`,
      getContent(
        `category_thumb_${categoryId}`,
        getContent(`category_thumb_${categorySlug}`, defaultBanner)
      )
    )
  );
  const bannerImageUrl = isDummyImage(rawBannerUrl) ? siteLogo : rawBannerUrl;
  const effectiveBanner = localBannerUrl || bannerImageUrl;

  // Open Dedicated Change Banner Modal
  const openBannerModal = () => {
    setModalBannerPreview(effectiveBanner);
    setModalBannerInputUrl(effectiveBanner.startsWith('data:') || effectiveBanner.startsWith('blob:') ? '' : effectiveBanner);
    setSelectedBannerFile(null);
    setIsChangeBannerModalOpen(true);
  };

  // Helper to persist banner across all category identifiers and custom settings
  const persistBannerUrl = async (newUrl: string) => {
    const syncUpdates: Record<string, any> = {
      [`category_hero_banner_${categoryId}`]: newUrl,
      [`category_thumb_${categoryId}`]: newUrl,
    };
    if (categorySlug && categorySlug !== categoryId) {
      syncUpdates[`category_hero_banner_${categorySlug}`] = newUrl;
      syncUpdates[`category_thumb_${categorySlug}`] = newUrl;
    }
    await updateContent(syncUpdates);

    // Also sync customCategories in settings if applicable
    const customCatIdx = customCategories.findIndex(c => c.id === categoryId || c.slug === categorySlug);
    if (customCatIdx !== -1) {
      const updatedCustomCats = [...customCategories];
      updatedCustomCats[customCatIdx] = { ...updatedCustomCats[customCatIdx], image: newUrl };
      await updateSettings('customCategories', updatedCustomCats);
    }

    setLocalBannerUrl(newUrl);
  };

  // Quick Direct Upload Handler
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setLocalBannerUrl(previewUrl);
    setIsUploadingBanner(true);

    try {
      const safeSlug = categorySlug ? cleanEnglishSlug(categorySlug) : 'banner';
      const storageRef = ref(storage, `site-content/banner_${safeSlug}_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      await persistBannerUrl(downloadUrl);
      alert("תמונת הנושא הוחלפה ועודכנה בהצלחה בענן!");
    } catch (err: any) {
      console.error("Banner upload error:", err);
      alert("שגיאה בהעלאת תמונת הנושא: " + (err?.message || err));
      setLocalBannerUrl('');
    } finally {
      setIsUploadingBanner(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Save from Modal (handles both uploaded file and URL)
  const handleSaveModalBanner = async () => {
    setIsUploadingBanner(true);
    try {
      let finalUrl = modalBannerPreview;

      if (selectedBannerFile) {
        const safeSlug = categorySlug ? cleanEnglishSlug(categorySlug) : 'banner';
        const storageRef = ref(storage, `site-content/banner_${safeSlug}_${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, selectedBannerFile);
        finalUrl = await getDownloadURL(snapshot.ref);
      } else if (modalBannerInputUrl && modalBannerInputUrl.trim()) {
        finalUrl = modalBannerInputUrl.trim();
      }

      if (!finalUrl) {
        alert("נא לבחור קובץ תמונה או להדביק כתובת URL.");
        setIsUploadingBanner(false);
        return;
      }

      await persistBannerUrl(finalUrl);
      setIsChangeBannerModalOpen(false);
      alert("תמונת הנושא של הקטגוריה עודכנה בהצלחה!");
    } catch (err: any) {
      console.error("Save banner error:", err);
      alert("שגיאה בשמירת תמונת הנושא: " + (err?.message || err));
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Reset to Site Default Logo/Image
  const handleResetBanner = async () => {
    if (!window.confirm("האם ברצונך לאפס את תמונת הנושא לברירת המחדל של האתר?")) return;
    setIsUploadingBanner(true);
    try {
      await persistBannerUrl(siteLogo);
      setIsChangeBannerModalOpen(false);
      alert("תמונת הנושא אופסה בהצלחה לברירת המחדל!");
    } catch (err: any) {
      console.error(err);
      alert("שגיאה באיפוס התמונה.");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const pageKey = `category_${categorySlug}`;
    const effectiveTitle = getContent(`seo_title_${pageKey}`, `סדנאות ${categoryTitle} | חוויה של סדנה`);
    const rawDesc = getContent(`seo_desc_${pageKey}`, currentCategory?.subtitle || `מבחר סדנאות יצירה ותוכן חווייתיות לכבוד ${categoryTitle} - ניידות חב"ד ישראל`);
    const cleanDesc = (rawDesc || '').replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

    const formattedShareMessage = `✨ *${effectiveTitle}* ✨\n${cleanDesc}\n\n🔗 *לפרטים וצפייה בכל הסדנאות:* ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: effectiveTitle,
          text: formattedShareMessage,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // dismissed
      }
    }

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

  // SEO Article HTML
  const defaultArticleHtml = `<h2>סדנאות יצירה ל${categoryTitle}: חוויה חינוכית וערכית</h2><p>מגוון סדנאות חווייתיות בהתאמה מיוחדת לגילאי יסודי, גנים ומתנ"סים המשלבות יצירה, תוכן וערכים.</p>`;
  const articleHtml = getContent(
    `category_seo_text_${categoryId}`,
    getContent(`category_seo_text_${categorySlug}`, defaultArticleHtml)
  );

  const handleGenerateArticle = async () => {
    if (!isSuperAdmin) return;
    setIsGeneratingArticle(true);
    try {
      const prompt = `כתוב מאמר שיווקי עשיר, מרגש ומקצועי (בפורמט HTML נקי עם תגיות h2, p, strong, ul, li) אודות סדנאות ופעילויות חינוכיות לחג ${categoryTitle} עבור בתי ספר, מתנ"סים וגנים. תאר את הערכים החינוכיים ואת החוויה המיוחדת.`;
      const apiKey = settings?.geminiApiKey || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') || (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert("לא נמצא מפתח API פעיל.");
        return;
      }
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt
      });
      let html = response.text || '';
      html = html.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      if (html) {
        await updateContent({
          [`category_seo_text_${categoryId}`]: html,
          [`category_seo_text_${categorySlug}`]: html
        });
      }
    } catch (err) {
      console.error("AI Article error:", err);
      alert("שגיאה ביצירת מאמר באמצעות AI.");
    } finally {
      setIsGeneratingArticle(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fbfe] pb-20">
      {/* Dynamic SEO & AIEO Meta + Structured Data */}
      <SeoHead
        pageKey={`category_${categorySlug}`}
        title={`סדנאות ${categoryTitle} | פעילויות ויצירה - ניידות חב"ד`}
        description={currentCategory?.subtitle || `מגוון סדנאות יצירה חווייתיות וערכיות לכבוד ${categoryTitle} - ניידות חב"ד ישראל`}
        image={effectiveBanner}
        url={window.location.href}
        type="article"
        keywords={[categoryTitle, `סדנאות ${categoryTitle}`, "סדנאות יצירה", "חב\"ד", "גפ\"ן 19053"]}
        schemaData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": `סדנאות ${categoryTitle}`,
          "description": currentCategory?.subtitle || `סדנאות יצירה וערכים ל${categoryTitle}`,
          "image": effectiveBanner,
          "provider": {
            "@type": "EducationalOrganization",
            "name": 'חוויה של סדנה - ניידות חב"ד ישראל',
            "sameAs": "https://chabad-workshops-cms.web.app"
          },
          "mainEntity": {
            "@type": "ItemList",
            "itemListElement": sortedCategoryWorkshops.map((w, i) => ({
              "@type": "ListItem",
              "position": i + 1,
              "item": {
                "@type": "Course",
                "name": w.title,
                "description": (w.description || "").replace(/<[^>]*>?/gm, '').trim(),
                "image": (w.images && w.images[0]) || (w as any).image || effectiveBanner
              }
            }))
          }
        }}
      />

      {/* Top Holiday Pill Strip (English URLs without #) */}
      <div className="bg-white border-b border-gray-100 py-3 overflow-x-auto shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col gap-2">
          {isEditMode && (
            <div className="flex flex-wrap items-center justify-between py-1 px-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-black text-amber-900 gap-2" dir="rtl">
              <span className="flex items-center gap-1.5">
                <span>🔄 סדר עמודי הקטגוריות ברחבי האתר:</span>
                <span className="font-normal opacity-80">(השתמש בחצים על כל כרטיסייה להזזה, או לחץ לסידור מלא בחלונית)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsReorderCatsModalOpen(true)}
                className="bg-amber-400 hover:bg-amber-500 text-blue-950 px-3 py-1 rounded-lg text-xs font-bold border border-amber-500 cursor-pointer shadow-xs flex items-center gap-1.5 transition-all"
              >
                <span>⚙️</span>
                <span>סדר קטגוריות בחלונית</span>
              </button>
            </div>
          )}

          <div className="flex gap-4 min-w-max py-1 items-center">
            {activeHolidays.map((holiday, idx) => {
              const rawBanner = getContent(`category_hero_banner_${holiday.id}`, getContent(`category_hero_banner_${holiday.slug}`, holiday.image));
              const rawThumb = getContent(`category_thumb_${holiday.id}`, getContent(`category_thumb_${holiday.slug}`, rawBanner));
              const thumbImg = isDummyImage(rawThumb) ? siteLogo : rawThumb;
              const isActive = holiday.id === categoryId || holiday.slug === categorySlug;

              return (
                <div key={holiday.id} className="flex items-center gap-1 group/pill">
                  <Link
                    to={`/category/${holiday.slug}`}
                    className={`
                      flex items-center gap-3 p-2 pr-4 rounded-[2rem] border transition-all duration-300
                      ${isActive ? "bg-blue-50 border-blue-200 shadow-inner" : "bg-white border-gray-100 hover:border-blue-200 hover:shadow-lg hover:-translate-y-1"}
                    `}
                  >
                    <div className="text-right">
                      <div className={`font-black text-sm leading-tight ${isActive ? "text-[#ff1b5a]" : "text-gray-800"}`}>
                        {holiday.title}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                      <img src={thumbImg} className="w-full h-full object-cover" alt="" />
                    </div>
                  </Link>

                  {isEditMode && (
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          moveCategoryPill(idx, idx - 1);
                        }}
                        disabled={idx === 0}
                        className="w-5 h-5 bg-gray-100 hover:bg-amber-300 disabled:opacity-20 rounded text-[10px] font-black flex items-center justify-center cursor-pointer shadow-xs text-gray-700 hover:text-blue-950 transition-colors"
                        title="הזז ימינה"
                      >
                        ›
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          moveCategoryPill(idx, idx + 1);
                        }}
                        disabled={idx === activeHolidays.length - 1}
                        className="w-5 h-5 bg-gray-100 hover:bg-amber-300 disabled:opacity-20 rounded text-[10px] font-black flex items-center justify-center cursor-pointer shadow-xs text-gray-700 hover:text-blue-950 transition-colors"
                        title="הזז שמאלה"
                      >
                        ‹
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Hero Banner with Dedicated High Z-Index Edit Overlay */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="relative min-h-[400px] md:min-h-[500px] rounded-[3rem] overflow-hidden shadow-2xl border-[10px] md:border-[16px] border-white transform hover:scale-[1.01] transition-transform duration-500 group">
          
          {/* Background Image - Sharp and Vivid without Blurring */}
          <div className="absolute inset-0 z-0">
            <img 
              src={effectiveBanner} 
              alt={categoryTitle} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-950/40 to-blue-950/20 pointer-events-none"></div>
          </div>

          {/* High Z-Index Banner Controls for Edit Mode */}
          {isEditMode && (
            <div className="absolute top-6 left-6 z-[60] flex flex-wrap items-center gap-2">
              <button 
                type="button"
                onClick={openBannerModal}
                className="bg-white/95 hover:bg-white text-blue-950 font-black px-5 py-3 rounded-2xl shadow-2xl border-2 border-blue-300 flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 text-sm backdrop-blur-md cursor-pointer"
                title="לחץ להחלפת תמונת הנושא של הקטגוריה (העלאת קובץ או הדבקת URL)"
              >
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>החלף תמונת נושא</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (directBannerInputRef.current) {
                    directBannerInputRef.current.value = '';
                    directBannerInputRef.current.click();
                  }
                }}
                disabled={isUploadingBanner}
                className="bg-blue-600/90 hover:bg-blue-600 text-white font-bold px-4 py-3 rounded-2xl shadow-xl border-2 border-blue-400 flex items-center gap-2 text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
                title="העלאה מהירה מקובץ תמונה במחשב"
              >
                {isUploadingBanner ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>מעלה תמונה...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>העלאה מהירה</span>
                  </>
                )}
              </button>
              <input 
                ref={directBannerInputRef}
                type="file" 
                style={{ display: 'none' }}
                accept="image/*" 
                onChange={handleBannerUpload} 
              />
            </div>
          )}

          {/* Share Category Button in Top Right */}
          <div className="absolute top-6 right-6 z-[60]">
            <button
              type="button"
              onClick={handleShare}
              className="bg-white/20 hover:bg-white text-white hover:text-blue-950 px-4 py-2.5 rounded-full font-black text-xs transition-all flex items-center gap-2 shadow-lg backdrop-blur-md border border-white/30 cursor-pointer"
              title="שתף קישור לקטגוריה זו"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>שתף קטגוריה</span>
            </button>
          </div>

          {/* Artistic Glows */}
          <div className="absolute top-10 right-10 w-32 h-32 bg-yellow-400 rounded-full mix-blend-overlay opacity-30 animate-pulse blur-2xl pointer-events-none z-10"></div>
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-pink-500 rounded-full mix-blend-overlay opacity-30 animate-pulse animation-delay-2000 blur-3xl pointer-events-none z-10"></div>

          {/* Banner Content */}
          <div className="relative z-20 flex flex-col items-center justify-center text-center py-20 px-6 text-white min-h-[400px] md:min-h-[500px]">
            <nav className="text-xs font-black uppercase tracking-widest opacity-80 mb-8 flex items-center gap-3 bg-white/10 px-6 py-2 rounded-full backdrop-blur-md border border-white/20 shadow-lg" dir="rtl">
              <Link to="/" className="hover:text-yellow-300 transition-colors">
                דף הבית
              </Link>
              <span>/</span>
              <span>{categoryTitle}</span>
            </nav>

            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black font-creative mb-6 drop-shadow-xl filter">
              {categoryTitle}
            </h1>

            <p className="text-xl md:text-3xl font-medium text-blue-50 max-w-3xl mb-12 leading-relaxed drop-shadow-md">
              {currentCategory?.subtitle || `מגוון סדנאות יצירה חווייתיות וערכיות לכבוד ${categoryTitle}`}
            </p>

            <button
              onClick={() => setIsLeadModalOpen(true)}
              className="bg-[#ff1b5a] hover:bg-[#ff306e] text-white text-lg md:text-xl font-black px-12 py-5 rounded-[2rem] shadow-[0_10px_40px_-10px_rgba(255,27,90,0.5)] hover:shadow-[0_20px_50px_-10px_rgba(255,27,90,0.6)] transition-all transform hover:-translate-y-1 hover:scale-105 flex items-center gap-3 border-4 border-white/10 backdrop-blur-sm cursor-pointer"
            >
              <span>לפרטים והזמנת פעילות לחצו כאן</span>
              <svg className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        categoryName={categoryTitle}
      />

      {/* Workshops Grid Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-blue-50 pb-4" dir="rtl">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-blue-900 font-creative">
              סדנאות {categoryTitle}
            </h2>
            <span className="text-sm font-bold text-gray-500">
              נמצאו {sortedCategoryWorkshops.length} סדנאות ופעילויות
            </span>
          </div>

          {isEditMode && sortedCategoryWorkshops.length > 1 && (
            <button
              type="button"
              onClick={() => setIsReorderWorkshopsModalOpen(true)}
              className="bg-amber-400 hover:bg-amber-500 text-blue-950 px-5 py-2.5 rounded-2xl font-black text-xs shadow-md border-2 border-amber-500 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span>סדר את כל הסדנאות בחלונית</span>
            </button>
          )}
        </div>

        {sortedCategoryWorkshops.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {sortedCategoryWorkshops.map((workshop, index) => (
              <div key={workshop.id} className="relative flex flex-col h-full group/card-order">
                {isEditMode && (
                  <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white px-3.5 py-1.5 rounded-t-2xl shadow-md flex items-center justify-between text-xs font-black z-20 border-b-2 border-amber-400">
                    <span className="text-amber-300 font-mono text-sm tracking-wide">#{index + 1}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveWorkshop(index, index - 1);
                        }}
                        disabled={index === 0}
                        className="w-6 h-6 bg-white/20 hover:bg-amber-400 hover:text-blue-950 disabled:opacity-20 disabled:hover:bg-white/20 disabled:hover:text-white rounded-md flex items-center justify-center font-bold text-white transition-all cursor-pointer"
                        title="הזז קדימה"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveWorkshop(index, index + 1);
                        }}
                        disabled={index === sortedCategoryWorkshops.length - 1}
                        className="w-6 h-6 bg-white/20 hover:bg-amber-400 hover:text-blue-950 disabled:opacity-20 disabled:hover:bg-white/20 disabled:hover:text-white rounded-md flex items-center justify-center font-bold text-white transition-all cursor-pointer"
                        title="הזז אחורה"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <WorkshopCard workshop={workshop} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[3rem] shadow-sm border border-blue-50">
            <div className="text-6xl mb-4 grayscale opacity-50">🎨</div>
            <h3 className="text-2xl font-black text-blue-900 mb-2">טרם נוספו סדנאות בקטגוריה זו</h3>
            <p className="text-gray-500 font-bold">חזרו בקרוב להתעדכן בפעילויות חדשות!</p>
            <Link to="/" className="inline-block mt-8 bg-blue-600 text-white px-8 py-3 rounded-full font-black hover:bg-blue-700 transition-colors">
              חזרה לדף הבית
            </Link>
          </div>
        )}
      </div>

      {/* Category SEO Article Section with WYSIWYG Editor */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white to-blue-50/50 -z-10"></div>
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-white rounded-[3rem] shadow-xl border border-blue-100 p-8 md:p-12 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-400 via-[#ff1b5a] to-blue-400 opacity-80"></div>
            
            <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 transform -rotate-6 group-hover:rotate-0 transition-transform duration-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl font-black text-blue-900 font-creative leading-none">
                    עולם של תוכן: {categoryTitle}
                  </h2>
                  <p className="text-gray-400 font-bold text-sm mt-1">
                    כל המידע, הטיפים והרעיונות לפעילות מושלמת
                  </p>
                </div>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={handleGenerateArticle}
                  disabled={isGeneratingArticle}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg shadow-purple-200 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 z-10 cursor-pointer"
                >
                  {isGeneratingArticle ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>ה-AI כותב עבורך...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>צור מאמר עם AI</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* WYSIWYG Visual Editor in Edit Mode / Clean HTML in View Mode */}
            {isEditMode ? (
              <div className="relative z-20">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-blue-900">
                  <span>עריכת מאמר חזותית (WYSIWYG) - שינויים נשמרים ישירות לענן:</span>
                </div>
                <WysiwygEditor
                  value={articleHtml}
                  onChange={(newHtml) => {
                    updateContent({
                      [`category_seo_text_${categoryId}`]: newHtml,
                      [`category_seo_text_${categorySlug}`]: newHtml
                    });
                  }}
                />
              </div>
            ) : (
              <div 
                className="prose prose-lg prose-blue max-w-none font-medium text-gray-600 leading-relaxed text-right relative z-10 [&>h2]:text-2xl [&>h2]:font-black [&>h2]:text-blue-900 [&>h2]:mt-8 [&>h2]:mb-4 [&>h2]:border-r-4 [&>h2]:border-[#ff1b5a] [&>h2]:pr-4 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-blue-800 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:mb-4 [&>p]:text-gray-600"
                dangerouslySetInnerHTML={{ __html: articleHtml }}
              />
            )}
          </div>
        </div>
      </section>

      {/* Moments Gallery */}
      <div className="mt-20 border-t border-gray-100 pt-10">
        <MomentsGallery workshops={workshops} />
      </div>

      {/* Modal: Reorder Workshops in this Category */}
      {isReorderWorkshopsModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border-4 border-amber-400 overflow-hidden flex flex-col max-h-[85vh]" dir="rtl">
            <div className="bg-gradient-to-r from-blue-950 to-indigo-900 text-white p-5 flex items-center justify-between border-b-2 border-amber-400">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📋</span>
                <div>
                  <h3 className="text-xl font-black font-creative">קביעת סדר הסדנאות - {categoryTitle}</h3>
                  <p className="text-xs text-blue-200">שנה את מיקום הסדנאות באמצעות החצים; השינוי נשמר מיידית בענן</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsReorderWorkshopsModalOpen(false)}
                className="text-gray-300 hover:text-white font-black text-2xl w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 bg-gray-50">
              {sortedCategoryWorkshops.map((w, idx) => (
                <div 
                  key={w.id} 
                  className="bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-sm flex items-center justify-between gap-3 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 font-mono font-black text-sm flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                      <img 
                        src={(w.images && w.images[0]) || (w as any).image || defaultBanner} 
                        className="w-full h-full object-cover" 
                        alt="" 
                      />
                    </div>
                    <div className="min-w-0 text-right">
                      <h4 className="font-black text-sm text-blue-900 truncate">{w.title}</h4>
                      <p className="text-xs text-gray-500 truncate">{w.description || "ללא תיאור"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveWorkshopToTop(idx)}
                      disabled={idx === 0}
                      className="px-2 py-1.5 bg-gray-100 hover:bg-amber-100 text-amber-900 disabled:opacity-20 rounded-lg text-xs font-bold border border-gray-200 cursor-pointer transition-colors"
                      title="העבר לראש הרשימה"
                    >
                      🔝 ראש
                    </button>
                    <button
                      type="button"
                      onClick={() => moveWorkshop(idx, idx - 1)}
                      disabled={idx === 0}
                      className="w-8 h-8 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-900 disabled:opacity-20 rounded-lg font-black text-sm flex items-center justify-center transition-colors cursor-pointer border border-blue-200"
                      title="הזז למעלה"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveWorkshop(idx, idx + 1)}
                      disabled={idx === sortedCategoryWorkshops.length - 1}
                      className="w-8 h-8 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-900 disabled:opacity-20 rounded-lg font-black text-sm flex items-center justify-center transition-colors cursor-pointer border border-blue-200"
                      title="הזז למטה"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsReorderWorkshopsModalOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-2.5 rounded-xl text-sm shadow-md transition-all cursor-pointer"
              >
                סגור וסיים
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reorder Category Pages Across Site */}
      {isReorderCatsModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-4 border-amber-400 overflow-hidden flex flex-col max-h-[85vh]" dir="rtl">
            <div className="bg-gradient-to-r from-blue-950 to-indigo-900 text-white p-5 flex items-center justify-between border-b-2 border-amber-400">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚙️</span>
                <div>
                  <h3 className="text-xl font-black font-creative">קביעת סדר עמודי הקטגוריות</h3>
                  <p className="text-xs text-blue-200">הסדר שנקבע כאן משפיע על כל תפריטי האתר ועמודי הקטגוריות</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsReorderCatsModalOpen(false)}
                className="text-gray-300 hover:text-white font-black text-2xl w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 bg-gray-50">
              {allCategories.map((c, idx) => (
                <div 
                  key={c.id} 
                  className="bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-sm flex items-center justify-between gap-3 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 font-mono font-black text-sm flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                      <img src={c.image} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="min-w-0 text-right">
                      <h4 className="font-black text-sm text-blue-900">{c.title}</h4>
                      <p className="text-xs text-gray-500 font-mono" dir="ltr">{c.slug}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (idx === 0) return;
                        const reordered = [...allCategories];
                        const [moved] = reordered.splice(idx, 1);
                        reordered.splice(idx - 1, 0, moved);
                        updateSettings('categoryOrder', reordered.map(item => item.slug || item.id));
                      }}
                      disabled={idx === 0}
                      className="w-8 h-8 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-900 disabled:opacity-20 rounded-lg font-black text-sm flex items-center justify-center transition-colors cursor-pointer border border-blue-200"
                      title="הזז למעלה"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (idx === allCategories.length - 1) return;
                        const reordered = [...allCategories];
                        const [moved] = reordered.splice(idx, 1);
                        reordered.splice(idx + 1, 0, moved);
                        updateSettings('categoryOrder', reordered.map(item => item.slug || item.id));
                      }}
                      disabled={idx === allCategories.length - 1}
                      className="w-8 h-8 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-900 disabled:opacity-20 rounded-lg font-black text-sm flex items-center justify-center transition-colors cursor-pointer border border-blue-200"
                      title="הזז למטה"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsReorderCatsModalOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-2.5 rounded-xl text-sm shadow-md transition-all cursor-pointer"
              >
                סגור וסיים
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change Category Banner Image */}
      {isChangeBannerModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border-4 border-blue-400 overflow-hidden flex flex-col max-h-[90vh]" dir="rtl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white p-5 flex items-center justify-between border-b-2 border-amber-400">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🖼️</span>
                <div>
                  <h3 className="text-xl font-black font-creative">החלפת תמונת נושא - {categoryTitle}</h3>
                  <p className="text-xs text-blue-200">העלה תמונה חדשה מהמחשב או הדבק קישור ישיר; השינוי מסתנכרן לענן</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsChangeBannerModalOpen(false)}
                className="text-gray-300 hover:text-white font-black text-2xl w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-gray-50">
              {/* Live Preview Box */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-2">
                  תצוגה מקדימה של התמונה:
                </label>
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-200 border-2 border-gray-300 shadow-inner group">
                  <img 
                    src={modalBannerPreview || siteLogo} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = siteLogo;
                    }}
                  />
                  <div className="absolute bottom-2 right-2 bg-blue-950/80 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-xs">
                    {selectedBannerFile ? `קובץ: ${selectedBannerFile.name}` : (modalBannerInputUrl ? 'קישור חיצוני' : 'תמונה נוכחית')}
                  </div>
                </div>
              </div>

              {/* Option 1: Upload from computer */}
              <div className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-blue-950 flex items-center gap-1.5">
                    <span>📁</span>
                    <span>אפשרות 1: העלאת תמונה מקובץ במחשב</span>
                  </span>
                  {selectedBannerFile && (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      ✓ קובץ נבחר
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (modalBannerInputRef.current) {
                      modalBannerInputRef.current.value = '';
                      modalBannerInputRef.current.click();
                    }
                  }}
                  className="w-full py-4 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-xl bg-blue-50/50 hover:bg-blue-50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-xs font-black text-blue-900">
                    {selectedBannerFile ? `החלף קובץ: ${selectedBannerFile.name}` : 'לחץ כאן לבחירת קובץ תמונה (JPG, PNG, WebP)'}
                  </span>
                  <span className="text-[10px] text-gray-500 font-bold">מומלץ גודל רוחב 1600-1920 פיקסלים</span>
                </button>
                <input 
                  ref={modalBannerInputRef}
                  type="file" 
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedBannerFile(file);
                      setModalBannerPreview(URL.createObjectURL(file));
                      setModalBannerInputUrl('');
                    }
                  }}
                />
              </div>

              {/* Option 2: Paste direct URL */}
              <div className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-xs space-y-2">
                <span className="text-sm font-black text-blue-950 flex items-center gap-1.5">
                  <span>🔗</span>
                  <span>אפשרות 2: הדבקת קישור ישיר לתמונה (URL)</span>
                </span>
                <input 
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={modalBannerInputUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setModalBannerInputUrl(val);
                    if (val.trim()) {
                      setSelectedBannerFile(null);
                      setModalBannerPreview(val.trim());
                    }
                  }}
                  className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-medium text-left focus:outline-none transition-colors"
                  dir="ltr"
                />
              </div>

              {/* Option 3: Reset to Default */}
              <div className="pt-2 flex justify-start">
                <button
                  type="button"
                  onClick={handleResetBanner}
                  className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>🔄</span>
                  <span>איפוס לברירת המחדל של האתר</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsChangeBannerModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-bold text-xs cursor-pointer transition-colors"
              >
                ביטול
              </button>

              <button
                type="button"
                onClick={handleSaveModalBanner}
                disabled={isUploadingBanner}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-7 py-2.5 rounded-xl text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {isUploadingBanner ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>שומר ומעדכן בענן...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>שמור תמונת נושא</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
