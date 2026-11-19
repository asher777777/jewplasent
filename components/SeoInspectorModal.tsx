import React, { useState, useEffect } from 'react';
import { useAdmin } from '../contexts/AdminContext.tsx';
import { generateSeoOptimization } from '../services/GeminiCreator.ts';
import { compressAndConvertToJpg } from '../services/imageCompressor.ts';
import { storage } from '../firebase.ts';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

interface SeoInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageKey?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultImage?: string;
  defaultKeywords?: string[];
  pageType?: string;
  schemaData?: Record<string, any>;
}

export const SeoInspectorModal: React.FC<SeoInspectorModalProps> = ({
  isOpen,
  onClose,
  pageKey = 'global',
  defaultTitle = '',
  defaultDescription = '',
  defaultImage = '',
  defaultKeywords = [],
  pageType = 'website',
  schemaData
}) => {
  const { isSuperAdmin, settings, getContent, updateContent, updateSettings } = useAdmin();

  const siteLogo = settings?.siteLogo || "https://firebasestorage.googleapis.com/v0/b/chabad-workshops-cms-files/o/site%2Flogo_1767863965088?alt=media&token=b45fef20-47ee-456e-b050-dd612571cd43";
  const siteDescription = settings?.siteDescription || "סדנאות יצירה חווייתיות וערכיות סביב מעגל השנה היהודי לכל הגילאים. תכנית מאושרת במערכת גפ\"ן (19053).";
  const siteName = settings?.siteName || "חוויה של סדנה";

  const [activeTab, setActiveTab] = useState<'preview' | 'edit' | 'aieo' | 'apiKey'>('preview');
  
  // State for form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // State for Gemini API Key tab
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState('');
  const [showKeyText, setShowKeyText] = useState(false);

  // Extracts actual visible text and meta tags from the underlying page
  const getPageActualDetails = () => {
    if (typeof document === 'undefined') return { title: '', desc: '', bodyText: '' };

    // 1. Main headline
    const h1 = document.querySelector('h1')?.textContent?.trim() || '';

    // 2. Specific workshop or category description container
    const specificDescEl = document.querySelector('[id*="longDescription"], [id*="description"], .prose');
    let extractedText = specificDescEl ? (specificDescEl.textContent?.trim() || '') : '';

    // 3. Fallback: extract rich paragraphs from main/article
    if (extractedText.length < 30) {
      const paragraphs = Array.from(document.querySelectorAll('main p, article p, .prose p, div p'))
        .map(p => p.textContent?.trim() || '')
        .filter(t => t.length > 25 && !t.includes('כל הזכויות שמורות') && !t.includes('ניידות חב"ד ישראל'));
      if (paragraphs.length > 0) {
        extractedText = paragraphs.slice(0, 4).join(' ');
      }
    }

    // 4. Check existing meta description tag
    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
    const isMetaGeneric = !metaDesc || metaDesc === 'ניידות חב"ד ישראל' || metaDesc === siteDescription;

    const chosenDesc = (!isMetaGeneric ? metaDesc : extractedText) || extractedText;
    const cleanDesc = chosenDesc.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

    // 5. Page's actual image (workshop main photo or banner)
    let pageImage = '';
    const candidateEl = document.querySelector(
      '#workshop-hero-image img, img#workshop-hero-image, [id*="main_image"] img, img[id*="main_image"], .aspect-video img, main img, article img'
    ) as HTMLImageElement;
    if (candidateEl && candidateEl.src && !candidateEl.src.includes('data:image')) {
      pageImage = candidateEl.src;
    }

    if (!pageImage) {
      // Find first prominent content image not in header/footer
      const allImgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
      const validContentImg = allImgs.find(img => {
        const s = img.src || '';
        if (!s || s.includes('data:image') || s.includes('logo_') || s.includes('icon') || s.includes('avatar')) return false;
        if (img.closest('header, nav, footer, [role="dialog"], .admin-toolbar')) return false;
        return true;
      });
      if (validContentImg) {
        pageImage = validContentImg.src;
      }
    }

    if (!pageImage) {
      const ogImgTag = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      if (ogImgTag && ogImgTag !== siteLogo) {
        pageImage = ogImgTag;
      }
    }

    return {
      title: h1 || document.title,
      desc: cleanDesc.slice(0, 160),
      bodyText: cleanDesc,
      pageImage
    };
  };

  // Read current live values from Firestore or fallbacks
  useEffect(() => {
    if (isOpen) {
      const pageDetails = getPageActualDetails();

      const savedTitle = getContent(`seo_title_${pageKey}`, '');
      const liveTitle = savedTitle || defaultTitle || pageDetails.title || document.title || siteName;

      const savedDesc = getContent(`seo_desc_${pageKey}`, '');
      const isSavedDescGeneric = !savedDesc || savedDesc.trim() === 'ניידות חב"ד ישראל' || savedDesc.trim() === siteDescription.trim();

      // Automatically take the real text of the page if generic or empty!
      const liveDesc = !isSavedDescGeneric 
        ? savedDesc 
        : (defaultDescription || pageDetails.desc || pageDetails.bodyText.slice(0, 160) || siteDescription);

      const defaultPageImage = pageDetails.pageImage || defaultImage || siteLogo;
      const savedImg = getContent(`seo_image_${pageKey}`, '');
      // If not customized, or if set to the generic logo, use the page's own workshop photo!
      const isSavedImgGenericLogo = !savedImg || savedImg === siteLogo || savedImg.includes('site%2Flogo_');
      const liveImg = (!isSavedImgGenericLogo ? savedImg : (pageDetails.pageImage || defaultImage || siteLogo)) || siteLogo;

      const liveKeywords = getContent(`seo_keywords_${pageKey}`, defaultKeywords.join(', ') || 'סדנאות יצירה, חב"ד, גפ"ן 19053');

      setTitle(liveTitle);
      setDescription(liveDesc);
      setImage(liveImg || siteLogo);
      setKeywords(Array.isArray(liveKeywords) ? liveKeywords.join(', ') : liveKeywords);
      setGeminiKeyInput(settings?.geminiApiKey || '');
      setKeyTestStatus('');
      setStatusMsg('');
    }
  }, [isOpen, pageKey, defaultTitle, defaultDescription, defaultImage, defaultKeywords, settings?.geminiApiKey]);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://chabad-workshops-cms.web.app';
  const effectiveDisplayImage = image || siteLogo;
  const effectiveDisplayTitle = title || defaultTitle || siteName;
  const effectiveDisplayDesc = description || siteDescription;

  // Save changes to Firestore
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setStatusMsg('');
    try {
      const finalImage = (image || siteLogo).trim();
      const updates: Record<string, any> = {
        [`seo_title_${pageKey}`]: title.trim(),
        [`seo_desc_${pageKey}`]: description.trim(),
        [`seo_image_${pageKey}`]: finalImage,
        [`seo_keywords_${pageKey}`]: keywords.split(',').map(s => s.trim()).filter(Boolean),
      };
      await updateContent(updates);
      setStatusMsg('✅ נתוני ה-SEO וה-AIEO נשמרו בהצלחה בענן!');
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setStatusMsg('❌ שגיאה בשמירה: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // AI-powered optimization (STRICTLY RESTRICTED TO ADMIN770 / isSuperAdmin)
  const handleAiOptimization = async () => {
    if (!isSuperAdmin) {
      alert("שגיאת הרשאה: יכולת AI זו זמינה אך ורק למנהל מערכת ראשי (admin770).");
      return;
    }

    setIsAiLoading(true);
    setStatusMsg('');
    try {
      const pageDetails = getPageActualDetails();
      const currentFullText = pageDetails.bodyText || description || pageDetails.desc;
      const currentHeading = title || pageDetails.title || siteName;
      
      const activeKey = settings?.geminiApiKey || geminiKeyInput || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY);

      const result = await generateSeoOptimization({
        title: currentHeading,
        pageType: pageType,
        currentDescription: description || pageDetails.desc,
        contentSnippet: currentFullText,
        customApiKey: activeKey
      });

      if (result) {
        if (result.seoTitle) setTitle(result.seoTitle);
        if (result.metaDescription) setDescription(result.metaDescription);
        if (result.keywords && result.keywords.length > 0) {
          setKeywords(result.keywords.join(', '));
        }
        setActiveTab('edit');
        setStatusMsg('✨ ה-AI ניתח את תוכן העמוד ויצר כותרת, תיאור ומילות מפתח ממוקדים! בדוק ולחץ "שמור שינויים".');
      }
    } catch (err: any) {
      console.error("AI SEO error:", err);
      alert("שגיאה ביצירת אופטימיזציה באמצעות AI: " + (err?.message || err));
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle direct image file upload with compression and conversion to JPG
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImg(true);
    setStatusMsg('');
    try {
      // 1. Compress dimensions (max 1200px) and file size, and convert to high-compatibility JPEG
      const compressedJpgBlob = await compressAndConvertToJpg(file, 1200, 1200, 0.85);

      // 2. Upload to Firebase Storage as clean, safe .jpg filename (NO underscores sequence or non-ASCII)
      const storageRef = ref(storage, `site-content/seo_${pageKey}_${Date.now()}.jpg`);
      const snapshot = await uploadBytes(storageRef, compressedJpgBlob, { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(snapshot.ref);

      setImage(downloadUrl);

      // 3. Auto-save immediately to Firestore so changes persist without manual save
      await updateContent({
        [`seo_image_${pageKey}`]: downloadUrl,
      });

      setStatusMsg('✅ התמונה הוחלפה, כווצה לקובץ JPG קל משקל ונשמרה בהצלחה בענן!');
      setTimeout(() => setStatusMsg(''), 5000);
    } catch (err: any) {
      console.error("Image upload failed:", err);
      alert("העלאת וכיווץ התמונה נכשלו: " + (err?.message || err));
    } finally {
      setIsUploadingImg(false);
      e.target.value = '';
    }
  };

  // Reset image to default (page's own workshop photo or site logo) and persist in Firestore
  const handleResetToLogo = async () => {
    const pageDetails = getPageActualDetails();
    const defaultImg = pageDetails.pageImage || defaultImage || siteLogo;
    setImage(defaultImg);
    try {
      await updateContent({
        [`seo_image_${pageKey}`]: defaultImg,
      });
      setStatusMsg('✅ תמונת השיתוף אופסה לברירת המחדל ונשמרה בהצלחה בענן!');
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setStatusMsg('❌ שגיאה באיפוס: ' + (err?.message || err));
    }
  };

  // Save Gemini Key to Firestore siteSettings/config
  const handleSaveGeminiKey = async () => {
    if (!geminiKeyInput.trim()) {
      alert("נא להזין מפתח API.");
      return;
    }
    setIsSavingKey(true);
    setKeyTestStatus('');
    try {
      await updateSettings('geminiApiKey', geminiKeyInput.trim());
      setKeyTestStatus('✅ המפתח נשמר בהצלחה בענן ב-Firebase ופעיל כעת בכל רחבי האתר!');
    } catch (err: any) {
      console.error(err);
      setKeyTestStatus('❌ שגיאה בשמירת המפתח בענן: ' + (err?.message || err));
    } finally {
      setIsSavingKey(false);
    }
  };

  // Test Gemini Key against Google Generative Language API
  const handleTestGeminiKey = async () => {
    if (!geminiKeyInput.trim()) {
      alert("נא להזין מפתח לבדיקה.");
      return;
    }
    setIsTestingKey(true);
    setKeyTestStatus('');
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKeyInput.trim() });
      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'שלום'
      });
      if (res.text) {
        setKeyTestStatus('✅ המפתח תקין ופעיל בהצלחה מול שרתי Google Gemini!');
      }
    } catch (err: any) {
      console.error("Key test error:", err);
      setKeyTestStatus('❌ שגיאה בבדיקת המפתח מול גוגל: ' + (err?.message || err));
    } finally {
      setIsTestingKey(false);
    }
  };

  // Schema data representation
  const activeSchema = schemaData || {
    "@context": "https://schema.org",
    "@type": pageType === 'course' ? 'Course' : (pageType === 'article' ? 'CollectionPage' : 'EducationalOrganization'),
    "name": effectiveDisplayTitle,
    "description": effectiveDisplayDesc,
    "image": effectiveDisplayImage,
    "url": currentUrl,
    "provider": {
      "@type": "EducationalOrganization",
      "name": `${siteName} - ניידות חב"ד ישראל`,
      "url": "https://chabad-workshops-cms.web.app",
      "logo": siteLogo
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 bg-blue-950/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl border-4 border-blue-200 overflow-hidden flex flex-col max-h-[92vh] my-auto"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4 border-b border-blue-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl border border-white/20 shadow-inner">
              🌐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black font-creative tracking-wide">
                  ניהול ותצוגת SEO & AIEO
                </h2>
                <span className="bg-blue-500/30 text-blue-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-400/30">
                  עמוד: {pageKey}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-200/90 font-medium mt-0.5">
                נראות במנועי חיפוש, ברשתות החברתיות (Open Graph) ובמנועי בינה מלאכותית (AIEO)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* STRICTLY GATED TO ADMIN770 */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleAiOptimization}
                disabled={isAiLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2.5 rounded-2xl font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-105 active:scale-95"
                title="מנוע Gemini ינתח את העמוד וייצר עבורך כותרת ותיאור אופטימליים (למנהל ראשי בלבד)"
              >
                {isAiLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Gemini מייצר SEO...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>שפר באמצעות AI</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-black text-lg transition-colors cursor-pointer"
              title="סגור חלונית"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 bg-gray-50/70 px-6 pt-3 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-5 py-3 rounded-t-2xl font-black text-sm transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
              activeTab === 'preview'
                ? 'bg-white border-blue-200 text-blue-900 shadow-xs -mb-[1px]'
                : 'border-transparent text-gray-500 hover:text-blue-900 hover:bg-white/50'
            }`}
          >
            <span>👁️</span>
            <span>תצוגה מקדימה חיה (WhatsApp & Google)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-5 py-3 rounded-t-2xl font-black text-sm transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
              activeTab === 'edit'
                ? 'bg-white border-blue-200 text-blue-900 shadow-xs -mb-[1px]'
                : 'border-transparent text-gray-500 hover:text-blue-900 hover:bg-white/50'
            }`}
          >
            <span>✏️</span>
            <span>עריכת שדות SEO</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('aieo')}
            className={`px-5 py-3 rounded-t-2xl font-black text-sm transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
              activeTab === 'aieo'
                ? 'bg-white border-blue-200 text-blue-900 shadow-xs -mb-[1px]'
                : 'border-transparent text-gray-500 hover:text-blue-900 hover:bg-white/50'
            }`}
          >
            <span>🤖</span>
            <span>מבנה AIEO & Schema.org</span>
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('apiKey')}
              className={`px-5 py-3 rounded-t-2xl font-black text-sm transition-all cursor-pointer flex items-center gap-2 border-t-2 border-x-2 ${
                activeTab === 'apiKey'
                  ? 'bg-white border-purple-300 text-purple-950 shadow-xs -mb-[1px]'
                  : 'border-transparent text-purple-700 hover:text-purple-900 hover:bg-purple-50/50'
              }`}
            >
              <span>🔑</span>
              <span>מפתח Gemini AI</span>
            </button>
          )}
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-sm font-bold px-6 py-2.5 text-right flex items-center justify-between">
            <span>{statusMsg}</span>
            <button type="button" onClick={() => setStatusMsg('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-white">

          {/* TAB 1: PREVIEWS */}
          {activeTab === 'preview' && (
            <div className="space-y-8">
              {/* WhatsApp / Telegram Preview */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-950 font-black text-base">
                  <span className="text-xl">💬</span>
                  <span>איך הקישור נראה בוואטסאפ / טלגרם / פייסבוק (Open Graph Preview):</span>
                </div>

                <div className="max-w-md bg-[#e5ddd5]/30 p-4 rounded-3xl border border-gray-200">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 max-w-sm">
                    <div className="aspect-[1.91/1] w-full bg-gray-100 overflow-hidden relative">
                      <img 
                        src={effectiveDisplayImage} 
                        alt="" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-xs" dir="ltr">
                        chabad-workshops-cms.web.app
                      </div>
                    </div>
                    <div className="p-4 space-y-1.5 text-right bg-[#f7f7f7]">
                      <h4 className="font-black text-gray-900 text-base leading-snug line-clamp-2">
                        {effectiveDisplayTitle}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                        {effectiveDisplayDesc}
                      </p>
                      <span className="text-[11px] text-gray-400 block pt-1 font-mono" dir="ltr">
                        https://chabad-workshops-cms.web.app
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Search SERP Preview */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-blue-950 font-black text-base">
                  <span className="text-xl">🔍</span>
                  <span>תצוגה מקדימה במנוע החיפוש Google (SERP Preview):</span>
                </div>

                <div className="max-w-2xl bg-white p-5 rounded-2xl border-2 border-gray-200 shadow-xs space-y-2 text-right">
                  <div className="flex items-center gap-2 text-xs text-gray-700" dir="rtl">
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-yellow-400 p-0.5 flex items-center justify-center">
                      <img src={siteLogo} alt="" className="w-full h-full object-contain rounded-full" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 text-xs">{siteName}</span>
                      <span className="text-[11px] text-gray-500 font-mono" dir="ltr">https://chabad-workshops-cms.web.app › {pageKey}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-[#1a0dab] hover:underline cursor-pointer leading-tight">
                    {effectiveDisplayTitle}
                  </h3>

                  <p className="text-sm text-gray-700 leading-relaxed">
                    {effectiveDisplayDesc}
                  </p>
                </div>
              </div>

              {/* Quick Action to Edit */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-2xl text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>✏️</span>
                  <span>ערוך נתונים אלו כעת</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT FIELDS */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSave} className="space-y-5">
              {/* Page Title */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-black text-gray-800">
                    כותרת העמוד (Page Title & og:title) *:
                  </label>
                  <span className={`text-[11px] font-mono ${title.length > 60 ? 'text-amber-600 font-bold' : 'text-gray-400'}`}>
                    {title.length}/60 תווים
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="לדוגמה: סדנאות חנוכה | חוויה של סדנה"
                  className="w-full p-3.5 rounded-2xl border-2 border-gray-200 font-bold text-gray-900 focus:border-blue-500 outline-none text-sm bg-gray-50/50 focus:bg-white transition-colors"
                />
              </div>

              {/* Meta Description */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-black text-gray-800">
                    תיאור העמוד (Meta Description & og:description) *:
                  </label>
                  <span className={`text-[11px] font-mono ${description.length >= 130 && description.length <= 160 ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                    {description.length}/160 תווים (אידיאלי: 130-160)
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="הזן תיאור שיווקי מתומצת שימשוך משתמשים להקליק כאשר ישלחו את הקישור..."
                  className="w-full p-3.5 rounded-2xl border-2 border-gray-200 font-medium text-gray-900 focus:border-blue-500 outline-none text-sm bg-gray-50/50 focus:bg-white transition-colors leading-relaxed"
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-xs font-black text-gray-800 mb-1">
                  מילות מפתח (מופרדות בפסיקים):
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  placeholder="סדנאות יצירה, חב&quot;ד, גפ&quot;ן 19053, סדנאות ילדים"
                  className="w-full p-3.5 rounded-2xl border-2 border-gray-200 font-bold text-gray-900 focus:border-blue-500 outline-none text-sm bg-gray-50/50 focus:bg-white transition-colors"
                />
              </div>

              {/* OG Image */}
              <div>
                <label className="block text-xs font-black text-gray-800 mb-1">
                  תמונת שיתוף נושא (og:image):
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <div className="w-20 h-20 rounded-2xl border-2 border-gray-200 overflow-hidden bg-gray-100 shrink-0 shadow-xs">
                    <img src={effectiveDisplayImage} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <input
                      type="text"
                      value={image}
                      onChange={e => setImage(e.target.value)}
                      placeholder="הדבק כאן כתובת תמונה ישירה (URL)..."
                      className="w-full p-3 rounded-xl border border-gray-200 font-mono text-xs text-left text-gray-800 focus:border-blue-500 outline-none"
                      dir="ltr"
                    />
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all">
                        {isUploadingImg ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>מכווץ ומעלה תמונה...</span>
                          </>
                        ) : (
                          <>
                            <span>📁</span>
                            <span>החלף תמונה (JPG מכווץ)</span>
                          </>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploadingImg}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleResetToLogo}
                        className="text-xs text-gray-600 hover:text-blue-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl font-bold transition-colors cursor-pointer"
                      >
                        🔄 איפוס לברירת מחדל (לוגו האתר)
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium">
                      ⚡ בעת בחירת תמונה: המערכת מכווצת את המידות ואת משקל הקובץ וממירה אותו אוטומטית לקובץ <strong className="font-bold">JPG</strong> אידיאלי לשיתוף בוואטסאפ וברשתות, ושומרת אותו ישירות בענן.
                    </p>
                  </div>
                </div>
              </div>

              {/* Canonical URL (Readonly Preview) */}
              <div>
                <label className="block text-xs font-black text-gray-400 mb-1">
                  כתובת קנונית (Canonical Link):
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 font-mono text-xs text-left outline-none cursor-not-allowed"
                  dir="ltr"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>שומר בענן...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>שמור שינויים לעמוד זה</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-sm cursor-pointer"
                >
                  צפה בתצוגה מקדימה
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: AIEO & SCHEMA.ORG */}
          {activeTab === 'aieo' && (
            <div className="space-y-6">
              {/* Explanation Banner */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-5 rounded-3xl border-2 border-purple-200 space-y-2 text-right">
                <div className="flex items-center gap-2 text-purple-900 font-black text-base">
                  <span className="text-xl">🤖</span>
                  <span>מה זה AIEO וכיצד מנועי AI (ChatGPT, Perplexity, Gemini) קוראים את האתר?</span>
                </div>
                <p className="text-xs text-purple-800 leading-relaxed font-medium">
                  <strong>AIEO (AI Engine Optimization)</strong> מבטיח שמנועי החיפוש החכמים של הדור החדש יבינו במדויק את טיב הסדנאות, קהל היעד, התכנים הערכיים, ואישור משרד החינוך (גפ&quot;ן 19053).
                  המידע מוגש ישירות באמצעות פורמט <strong>Schema.org JSON-LD</strong> התקני.
                </p>
              </div>

              {/* AIEO Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 font-bold">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0">✓</span>
                  <span>סכמת Schema.org מוגדרת ({String(activeSchema['@type'])})</span>
                </div>
                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 font-bold">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0">✓</span>
                  <span>תגיות Open Graph מוטמעות</span>
                </div>
                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 font-bold">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0">✓</span>
                  <span>תמונת שיתוף ולוגו מוגדרים</span>
                </div>
                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 font-bold">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0">✓</span>
                  <span>אישור גפ&quot;ן 19053 ומשוב פדגוגי</span>
                </div>
              </div>

              {/* JSON-LD Viewer */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-gray-700">קוד Schema.org JSON-LD הפעיל בעמוד זה:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(activeSchema, null, 2));
                      alert("קוד ה-JSON-LD הועתק ללוח!");
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>📋</span>
                    <span>העתק JSON</span>
                  </button>
                </div>
                <pre 
                  className="bg-gray-900 text-emerald-400 p-5 rounded-2xl text-xs font-mono overflow-x-auto max-h-64 border border-gray-800 text-left" 
                  dir="ltr"
                >
                  {JSON.stringify(activeSchema, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: GEMINI API KEY */}
          {activeTab === 'apiKey' && (
            <div className="space-y-6 text-right" dir="rtl">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-2xl shadow-md">
                    🔑
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-purple-950">
                      הגדרת וניהול מפתח Google Gemini API
                    </h3>
                    <p className="text-xs text-purple-800 font-medium">
                      המפתח נשמר ישירות ב-Firebase בענן ומשמש את כל פיצ&apos;רי ה-AI באתר (סריקת PDF, כתיבת מאמרים, אופטימיזציית SEO)
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-black text-gray-700">
                    מפתח API (Google AI Studio / Google Cloud Console):
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showKeyText ? "text" : "password"}
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="הדבק כאן את מפתח ה-API (לדוגמה: AIzaSy... או AQ...)"
                      className="w-full pl-24 pr-4 py-3 bg-white border-2 border-purple-200 rounded-2xl text-sm font-mono text-gray-900 focus:outline-hidden focus:border-purple-600 transition-colors shadow-inner"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyText(!showKeyText)}
                      className="absolute left-3 px-3 py-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 rounded-xl transition-colors cursor-pointer"
                    >
                      {showKeyText ? "הסתר" : "הצג"}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium">
                    המפתח הפעיל כרגע באתר: <span className="font-mono text-purple-900 font-bold" dir="ltr">{settings?.geminiApiKey ? `${settings.geminiApiKey.substring(0, 10)}...` : '(לא הוגדר עדיין)'}</span>
                  </p>
                </div>

                {/* Actions: Save & Test */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveGeminiKey}
                    disabled={isSavingKey || !geminiKeyInput.trim()}
                    className="flex-1 min-w-[160px] py-3 px-6 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-black rounded-2xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSavingKey ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>שומר בענן ב-Firebase...</span>
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        <span>שמור מפתח בענן</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestGeminiKey}
                    disabled={isTestingKey || !geminiKeyInput.trim()}
                    className="py-3 px-6 bg-white border-2 border-purple-300 hover:bg-purple-50 disabled:opacity-50 text-purple-950 font-black rounded-2xl text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isTestingKey ? (
                      <>
                        <div className="w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></div>
                        <span>בודק מול שרתי גוגל...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>בדוק תקינות מפתח</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Key Test Status Feedback */}
                {keyTestStatus && (
                  <div className={`p-4 rounded-2xl text-xs font-bold border transition-all ${
                    keyTestStatus.startsWith('✅') 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                      : 'bg-red-50 border-red-300 text-red-900'
                  }`}>
                    {keyTestStatus}
                  </div>
                )}
              </div>

              {/* Troubleshooting and Help Guide */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 space-y-3 text-xs text-amber-950">
                <div className="flex items-center gap-2 font-black text-sm text-amber-900">
                  <span>⚠️</span>
                  <span>נתקלת בשגיאה 401 או ACCESS_TOKEN_TYPE_UNSUPPORTED?</span>
                </div>
                <div className="space-y-2 leading-relaxed font-medium">
                  <p>
                    ב-Google Cloud Console, אם יצרת מפתח והגדרת לו <strong>הגבלות API (API Restrictions)</strong>:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pr-2">
                    <li>
                      וודא שסימנת <strong className="font-bold underline">Generative Language API</strong> (זהו השירות של Gemini למפתחים), ולא רק &quot;Gemini API&quot; (שהוא שירות ארגוני של Google Cloud).
                    </li>
                    <li>
                      או בחר באפשרות <strong>Don&apos;t restrict key</strong> (ללא הגבלת API) על מנת לאפשר גישה מיידית לכל מודלי Gemini.
                    </li>
                    <li>
                      להנפקת מפתח חדש בקליק אחד ללא צורך בהגדרות מורכבות: גש אל <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-bold" dir="ltr">Google AI Studio</a>.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-xs text-gray-500 font-medium">
            חוויה של סדנה • ניידות חב&quot;ד ישראל
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeoInspectorModal;
