import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Workshop } from '../types.ts';
import { useAdmin } from '../contexts/AdminContext.tsx';
import { isDummyImage, DEFAULT_SITE_IMAGE } from '../categories.ts';

interface RelatedWorkshopsProps {
  currentWorkshop: Workshop;
  allWorkshops: Workshop[];
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  "תשרי": "from-orange-400 to-red-500",
  "שבת": "from-blue-400 to-indigo-600",
  "חנוכה": "from-yellow-400 to-orange-500",
  "שבט": "from-green-400 to-teal-600",
  "פורים": "from-purple-500 to-pink-500",
  "פסח": "from-amber-400 to-orange-500",
  "ל\"ג בעומר": "from-red-500 to-orange-600",
  "שבועות": "from-emerald-400 to-teal-600",
  "סוף שנה וקייטנות": "from-cyan-400 to-blue-500"
};

// Stopwords in Hebrew to ignore during semantic text matching
const STOP_WORDS = new Set([
  'של', 'את', 'על', 'עם', 'זה', 'זו', 'כל', 'מן', 'אל', 'גם', 'רק', 'בין', 'הוא', 'היא',
  'סדנה', 'סדנת', 'פעילות', 'חוויה', 'ילדים', 'חב"ד', 'ניידות', 'ישראל', 'סביב', 'לכל',
  'תכנית', 'גפן', '19053', 'מעגל', 'שנה'
]);

function extractSemanticTokens(str?: string): string[] {
  if (!str) return [];
  return str
    .toLowerCase()
    .replace(/[^\u0590-\u05FFa-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 3 && !STOP_WORDS.has(s));
}

// Semantic score calculation between workshops
function calculateSemanticScore(current: Workshop, candidate: Workshop): number {
  let score = 0;

  // 1. Same category (strongest semantic bond)
  if (current.category && candidate.category && current.category.trim() === candidate.category.trim()) {
    score += 60;
  }

  // 2. Title words overlap
  const currentTitleTokens = extractSemanticTokens(current.title);
  const candidateTitleTokens = new Set(extractSemanticTokens(candidate.title));
  for (const token of currentTitleTokens) {
    if (candidateTitleTokens.has(token)) {
      score += 25;
    }
  }

  // 3. Description words overlap
  const currentDescTokens = extractSemanticTokens(current.description || current.longDescription);
  const candidateDescTokens = new Set(extractSemanticTokens(candidate.description || candidate.longDescription));
  for (const token of currentDescTokens) {
    if (candidateDescTokens.has(token)) {
      score += 6;
    }
  }

  // 4. Target audience overlap
  if (current.audience && candidate.audience) {
    const a1 = current.audience.trim();
    const a2 = candidate.audience.trim();
    if (a1 === a2 || a1.includes(a2) || a2.includes(a1)) {
      score += 20;
    }
  }

  // 5. Values / message overlap
  if (current.values && candidate.values) {
    const v1 = current.values.trim();
    const v2 = candidate.values.trim();
    if (v1 === v2 || v1.includes(v2) || v2.includes(v1)) {
      score += 15;
    }
  }

  return score;
}

export const RelatedWorkshops: React.FC<RelatedWorkshopsProps> = ({ currentWorkshop, allWorkshops }) => {
  const { isAdmin, isEditMode, getContent, updateContent, settings } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const siteLogo = settings?.siteLogo || DEFAULT_SITE_IMAGE;
  const pageKey = `workshop_${currentWorkshop.slug || currentWorkshop.id}`;
  const customRelatedKey = `related_workshops_${pageKey}`;

  // Get custom user-defined assignment from Firestore if exists
  const savedCustomIds: (string | number)[] | null = getContent(customRelatedKey, null);
  const isCustomMode = Array.isArray(savedCustomIds) && savedCustomIds.length > 0;

  // Local state for modal editing
  const [modalSelectedIds, setModalSelectedIds] = useState<(string | number)[]>([]);
  const [modalMode, setModalMode] = useState<'auto' | 'custom'>('auto');

  // Candidate pool: all workshops except the current one and not deleted
  const candidates = useMemo(() => {
    return allWorkshops.filter(w => {
      if (w.isDeleted) return false;
      if (String(w.id) === String(currentWorkshop.id)) return false;
      if (w.slug && currentWorkshop.slug && w.slug === currentWorkshop.slug) return false;
      return true;
    });
  }, [allWorkshops, currentWorkshop]);

  // Compute default semantic ranking
  const semanticRecommendations = useMemo(() => {
    const scored = candidates.map(w => ({
      workshop: w,
      score: calculateSemanticScore(currentWorkshop, w)
    }));

    // Sort by score descending, then by title
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.workshop.title.localeCompare(b.workshop.title, 'he');
    });

    return scored.map(item => item.workshop).slice(0, 3);
  }, [candidates, currentWorkshop]);

  // Displayed workshops: Custom user selection OR automatic semantic recommendation
  const displayedWorkshops = useMemo(() => {
    if (isCustomMode && savedCustomIds) {
      const customItems: Workshop[] = [];
      for (const idOrSlug of savedCustomIds) {
        const found = candidates.find(w => String(w.id) === String(idOrSlug) || (w.slug && w.slug === idOrSlug));
        if (found) customItems.push(found);
      }
      if (customItems.length > 0) return customItems;
    }
    return semanticRecommendations;
  }, [isCustomMode, savedCustomIds, candidates, semanticRecommendations]);

  // Open modal and initialize form state
  const handleOpenModal = () => {
    if (isCustomMode && savedCustomIds) {
      setModalMode('custom');
      setModalSelectedIds([...savedCustomIds]);
    } else {
      setModalMode('auto');
      setModalSelectedIds(semanticRecommendations.map(w => w.id));
    }
    setSearchTerm('');
    setStatusMsg('');
    setIsModalOpen(true);
  };

  const handleToggleSelectWorkshop = (id: string | number) => {
    setModalMode('custom');
    setModalSelectedIds(prev => {
      if (prev.some(x => String(x) === String(id))) {
        return prev.filter(x => String(x) !== String(id));
      } else {
        if (prev.length >= 6) {
          alert('ניתן לבחור עד 6 סדנאות קשורות לכל היותר.');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleSaveModal = async () => {
    setIsSaving(true);
    setStatusMsg('');
    try {
      if (modalMode === 'auto') {
        // Reset to automatic matching by clearing custom override
        await updateContent({ [customRelatedKey]: null });
        setStatusMsg('✅ ההמלצות עודכנו להתאמה חכמה אוטומטית בהצלחה!');
      } else {
        if (modalSelectedIds.length === 0) {
          alert('נא לבחור לפחות סדנה אחת, או להעביר למצב התאמה חכמה אוטומטית.');
          setIsSaving(false);
          return;
        }
        await updateContent({ [customRelatedKey]: modalSelectedIds });
        setStatusMsg('✅ רשימת הסדנאות המומלצות נשמרה בהצלחה בענן!');
      }
      setTimeout(() => {
        setIsModalOpen(false);
        setStatusMsg('');
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setStatusMsg('❌ שגיאה בשמירה: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToAuto = async () => {
    setIsSaving(true);
    try {
      await updateContent({ [customRelatedKey]: null });
      setModalMode('auto');
      setModalSelectedIds(semanticRecommendations.map(w => w.id));
      setStatusMsg('✅ אופס בהצלחה להתאמה חכמה אוטומטית!');
      setTimeout(() => {
        setIsModalOpen(false);
        setStatusMsg('');
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setStatusMsg('❌ שגיאה באיפוס: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  if (candidates.length === 0) return null;

  return (
    <section className="w-full mt-16 pt-8 border-t-2 border-blue-100" dir="rtl">
      {/* Container Card */}
      <div className="bg-gradient-to-b from-blue-50/60 via-white to-blue-50/30 rounded-[3rem] p-6 sm:p-10 md:p-12 border-2 border-blue-100 shadow-xl childish-border relative overflow-hidden">
        
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-100/50 rounded-full blur-3xl pointer-events-none -z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-0"></div>

        {/* Header Bar */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="w-10 h-10 rounded-2xl bg-[#ff1b5a] text-white flex items-center justify-center font-black text-xl shadow-md">
                ✨
              </span>
              <h3 className="text-3xl md:text-4xl font-black text-blue-950 font-creative">
                סדנאות נוספות שיכולות לעניין אותך
              </h3>
            </div>
            <p className="text-sm font-bold text-gray-500 mr-13">
              פעילויות חווייתיות וערכיות נוספות מעולם התוכן והיצירה
            </p>
          </div>

          {/* Marketing Badge for End Customer + Admin Quick Action */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {/* End-customer Marketing Badge */}
            <span className="bg-gradient-to-r from-pink-500 via-rose-500 to-[#ff1b5a] text-white font-black text-xs px-4 py-2 rounded-full shadow-md flex items-center gap-1.5 tracking-wide">
              <span>✨</span>
              <span>נבחר במיוחד עבורכם</span>
            </span>

            {/* Admin Management Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenModal}
                className="bg-white hover:bg-blue-50 text-blue-900 border-2 border-blue-200 hover:border-blue-400 font-black text-xs px-3.5 py-2 rounded-full shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="עריכת סדנאות מומלצות לעמוד זה"
              >
                <span>⚙️</span>
                <span>עריכת המלצות</span>
                {isCustomMode && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700">
                    בחירה ידנית
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Listing Grid */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {displayedWorkshops.map((w) => {
            const validImages = (w.images || []).filter(img => !isDummyImage(img));
            const categoryBanner = getContent(`category_hero_banner_${w.category}`, getContent(`category_thumb_${w.category}`, ''));
            const resolvedImg = validImages[0] || (w as any).image || (!isDummyImage(categoryBanner) ? categoryBanner : siteLogo);
            const gradient = CATEGORY_GRADIENTS[w.category] || "from-blue-500 to-indigo-600";
            const shortDesc = (w.description || w.longDescription || '').replace(/<[^>]*>?/gm, '').trim();

            return (
              <Link
                key={w.id}
                to={`/workshop/${w.slug || w.id}`}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="group bg-white rounded-[2.2rem] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 flex flex-col h-full cursor-pointer"
              >
                {/* Image Section */}
                <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
                  <img
                    src={resolvedImg}
                    alt={w.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`bg-gradient-to-r ${gradient} text-white font-black text-xs px-3.5 py-1.5 rounded-full shadow-md backdrop-blur-xs`}>
                      {w.category}
                    </span>
                  </div>

                  {/* Target Audience Badge */}
                  {w.audience && (
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-white/90 backdrop-blur-md text-blue-950 font-black text-[11px] px-2.5 py-1 rounded-xl shadow-xs">
                        👥 {w.audience}
                      </span>
                    </div>
                  )}

                  {/* Duration Badge */}
                  {w.duration && (
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-white/90 backdrop-blur-md text-blue-950 font-black text-[11px] px-2.5 py-1 rounded-xl shadow-xs">
                        ⏱️ {w.duration}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-6 flex-1 flex flex-col justify-between text-right">
                  <div>
                    <h4 className="text-xl sm:text-2xl font-black text-blue-950 font-creative mb-2.5 group-hover:text-[#ff1b5a] transition-colors line-clamp-1">
                      {w.title}
                    </h4>

                    <p className="text-gray-600 text-sm leading-relaxed font-normal line-clamp-2 mb-4">
                      {shortDesc || 'סדנת יצירה ערכית וחווייתית לילדים ולנוער סביב מעגל השנה היהודי.'}
                    </p>
                  </div>

                  {/* Result & CTA Footer */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-500 truncate max-w-[55%]">
                      {w.result ? `🎨 תוצר: ${w.result}` : '✨ חוויה מושלמת'}
                    </span>
                    
                    <span className="text-[#ff1b5a] group-hover:text-blue-900 font-black flex items-center gap-1 transition-colors">
                      <span>לפרטים והרשמה</span>
                      <span className="transform group-hover:-translate-x-1 transition-transform">◀</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Admin Settings Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full shadow-2xl border-4 border-blue-200 text-right max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-md">
                  ⚙️
                </span>
                <div>
                  <h3 className="text-2xl font-black text-blue-950 font-creative">
                    הגדרת סדנאות קשורות
                  </h3>
                  <p className="text-xs font-bold text-gray-500">
                    עבור: <span className="text-blue-600">{currentWorkshop.title}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-black transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 py-4 space-y-6">
              
              {/* Mode Selector */}
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 space-y-3">
                <span className="block text-xs font-black text-blue-950">בחר אופן התאמת הסדנאות המומלצות:</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`p-4 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${modalMode === 'auto' ? 'bg-white border-blue-600 shadow-sm' : 'bg-white/50 border-transparent hover:border-gray-200'}`}>
                    <input
                      type="radio"
                      name="relationMode"
                      checked={modalMode === 'auto'}
                      onChange={() => setModalMode('auto')}
                      className="mt-1"
                    />
                    <div>
                      <span className="block font-black text-sm text-blue-950">🤖 התאמה אוטומטית חכמה (ברירת מחדל)</span>
                      <span className="text-xs text-gray-500 font-medium">המערכת מנתחת את התוכן ובוחרת אוטומטית את הסדנאות המתאימות ביותר לפי קטגוריה וסגנון.</span>
                    </div>
                  </label>

                  <label className={`p-4 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${modalMode === 'custom' ? 'bg-white border-purple-600 shadow-sm' : 'bg-white/50 border-transparent hover:border-gray-200'}`}>
                    <input
                      type="radio"
                      name="relationMode"
                      checked={modalMode === 'custom'}
                      onChange={() => setModalMode('custom')}
                      className="mt-1"
                    />
                    <div>
                      <span className="block font-black text-sm text-blue-950">🎯 בחירה ידנית מותאמת אישית</span>
                      <span className="text-xs text-gray-500 font-medium">בחרו בעצמכם סדנאות נבחרות שיוצגו בראש סדרי העדיפויות עבור לקוחות הקצה בעמוד זה.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Status Message */}
              {statusMsg && (
                <div className="p-3 bg-blue-50 text-blue-900 rounded-xl font-bold text-xs text-center border border-blue-200">
                  {statusMsg}
                </div>
              )}

              {/* Manual Selection Interface */}
              {modalMode === 'custom' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-800">
                      בחר סדנאות מהרשימה ({modalSelectedIds.length} נבחרו):
                    </span>
                    <input
                      type="text"
                      placeholder="חיפוש סדנה לפי שם או קטגוריה..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="text-xs font-bold p-2 px-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none w-56"
                    />
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-100 rounded-2xl p-2 bg-gray-50">
                    {candidates
                      .filter(w => !searchTerm.trim() || w.title.includes(searchTerm) || w.category.includes(searchTerm))
                      .map(w => {
                        const isSelected = modalSelectedIds.some(x => String(x) === String(w.id));
                        return (
                          <div
                            key={w.id}
                            onClick={() => handleToggleSelectWorkshop(w.id)}
                            className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${isSelected ? 'bg-purple-50 border-2 border-purple-400' : 'bg-white hover:bg-gray-100 border border-transparent'}`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // Handled by parent div
                                className="w-4 h-4 text-purple-600 rounded"
                              />
                              <div>
                                <span className="block font-black text-sm text-gray-900">{w.title}</span>
                                <span className="text-[11px] text-gray-500 font-bold">קטגוריה: {w.category}</span>
                              </div>
                            </div>

                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isSelected ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                              {isSelected ? 'נבחר ✓' : '+ הוסף'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Auto Recommendation Preview */}
              {modalMode === 'auto' && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-gray-600 block">
                    סדנאות שנבחרו כהתאמה מושלמת עבור לקוחות הקצה:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {semanticRecommendations.map(w => (
                      <div key={w.id} className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-center">
                        <span className="block font-black text-xs text-blue-950 truncate">{w.title}</span>
                        <span className="text-[10px] text-blue-600 font-bold">{w.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetToAuto}
                disabled={isSaving}
                className="text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                🔄 איפוס להתאמה אוטומטית
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'שומר בענן...' : 'שמור שינויים בענן'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </section>
  );
};

export default RelatedWorkshops;
