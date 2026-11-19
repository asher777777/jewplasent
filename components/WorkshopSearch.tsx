import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Workshop } from '../types.ts';
import { useAdmin } from '../contexts/AdminContext.tsx';
import { INITIAL_CATEGORIES, CategoryItem, isDummyImage, DEFAULT_SITE_IMAGE } from '../categories.ts';

interface WorkshopSearchProps {
  workshops: Workshop[];
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
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

const POPULAR_SUGGESTIONS = ['פורים', 'שופר', 'אפיית מצות', 'זכוכית', 'חנוכיה', 'שבת', 'חול'];

// Hebrew normalization: strips Niqqud and punctuation
function normalizeHebrew(text?: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '')
    .replace(/[״"]/g, '"')
    .replace(/[׳']/g, "'")
    .replace(/[-\/\\^$*+?.()|[\]{}:;,!]/g, ' ')
    .trim();
}

// Token extraction with Hebrew prefix handling (אותיות השימוש: ה, ב, כ, ל, מ, ש, ו)
function getSearchTokens(query: string): string[] {
  const normalized = normalizeHebrew(query);
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  const tokens: string[] = [];

  for (const w of words) {
    tokens.push(w);
    // Strip common Hebrew prefixes if word is 4+ letters
    if (w.length >= 4) {
      if (['ה', 'ב', 'ל', 'כ', 'מ', 'ש', 'ו'].includes(w[0])) {
        tokens.push(w.slice(1));
      }
      if (w.startsWith('וה') || w.startsWith('וב') || w.startsWith('ול')) {
        tokens.push(w.slice(2));
      }
    }
    // Handle Hebrew plurals/variations (ים / ות)
    if (w.length >= 4 && (w.endsWith('ות') || w.endsWith('ים'))) {
      tokens.push(w.slice(0, -2));
    }
  }

  return Array.from(new Set(tokens.filter(t => t.length >= 2)));
}

interface ScoredWorkshop {
  workshop: Workshop;
  score: number;
  matchField: string;
  matchedSnippet: string;
}

export const WorkshopSearch: React.FC<WorkshopSearchProps> = ({ workshops, isMobile = false, onCloseMobile }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { settings, getContent } = useAdmin();

  const siteLogo = settings?.siteLogo || DEFAULT_SITE_IMAGE;
  const customCategories: CategoryItem[] = settings?.customCategories || [];
  const allCategories = useMemo(() => [...INITIAL_CATEGORIES, ...customCategories], [customCategories]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Matching Category detection (e.g. typing "פורים" suggests Category Purim)
  const matchingCategory = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return null;
    const norm = normalizeHebrew(trimmed);
    return allCategories.find(c => {
      const cNorm = normalizeHebrew(c.title);
      const sNorm = normalizeHebrew(c.subtitle || '');
      const idNorm = normalizeHebrew(c.id);
      return cNorm.includes(norm) || idNorm.includes(norm) || sNorm.includes(norm);
    }) || null;
  }, [query, allCategories]);

  // Filter and score workshops
  const searchResults: ScoredWorkshop[] = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const normQuery = normalizeHebrew(trimmed);
    const queryTokens = getSearchTokens(trimmed);

    const scored: ScoredWorkshop[] = [];

    for (const w of workshops) {
      if (w.isDeleted) continue;

      const titleNorm = normalizeHebrew(w.title);
      const catNorm = normalizeHebrew(w.category);
      const descNorm = normalizeHebrew(w.description || '');
      const longDescNorm = normalizeHebrew(w.longDescription || '');
      const resultNorm = normalizeHebrew(w.result || '');
      const audienceNorm = normalizeHebrew(w.audience || '');
      const valuesNorm = normalizeHebrew(w.values || '');
      const skillsNorm = normalizeHebrew(w.skills || '');

      let score = 0;
      let matchField = '';
      let matchedSnippet = '';

      // Direct exact query match
      if (titleNorm.includes(normQuery)) {
        score += 160;
        matchField = 'כותרת';
        matchedSnippet = w.title;
      } else if (catNorm.includes(normQuery)) {
        score += 120;
        matchField = 'קטגוריה';
        matchedSnippet = w.category;
      } else if (resultNorm.includes(normQuery)) {
        score += 90;
        matchField = 'תוצר';
        matchedSnippet = w.result;
      } else if (descNorm.includes(normQuery) || longDescNorm.includes(normQuery)) {
        score += 70;
        matchField = 'תיאור';
        matchedSnippet = w.description || w.longDescription || '';
      }

      // Token match
      let tokensMatched = 0;
      for (const token of queryTokens) {
        let hit = false;
        if (titleNorm.includes(token)) {
          score += 45;
          hit = true;
          if (!matchField) { matchField = 'כותרת'; matchedSnippet = w.title; }
        }
        if (catNorm.includes(token)) {
          score += 35;
          hit = true;
          if (!matchField) { matchField = 'קטגוריה'; matchedSnippet = w.category; }
        }
        if (resultNorm.includes(token)) {
          score += 30;
          hit = true;
          if (!matchField) { matchField = 'תוצר'; matchedSnippet = w.result; }
        }
        if (audienceNorm.includes(token)) {
          score += 20;
          hit = true;
        }
        if (valuesNorm.includes(token) || skillsNorm.includes(token)) {
          score += 15;
          hit = true;
        }
        if (descNorm.includes(token) || longDescNorm.includes(token)) {
          score += 20;
          hit = true;
          if (!matchField) { matchField = 'תיאור'; matchedSnippet = w.description || w.longDescription || ''; }
        }
        if (hit) tokensMatched++;
      }

      // Multi-word bonus
      if (queryTokens.length > 1 && tokensMatched >= queryTokens.length) {
        score += 80;
      }

      if (score > 0) {
        scored.push({
          workshop: w,
          score,
          matchField: matchField || 'סדנה',
          matchedSnippet: matchedSnippet || w.title
        });
      }
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8); // Top 8 best matches
  }, [workshops, query]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  const handleSelectWorkshop = (w: Workshop) => {
    setIsOpen(false);
    setQuery('');
    if (onCloseMobile) onCloseMobile();
    navigate(`/workshop/${w.slug || w.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (slug: string) => {
    setIsOpen(false);
    setQuery('');
    if (onCloseMobile) onCloseMobile();
    navigate(`/category/${slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0 && searchResults[selectedIndex]) {
        handleSelectWorkshop(searchResults[selectedIndex].workshop);
      } else if (matchingCategory) {
        handleSelectCategory(matchingCategory.slug || matchingCategory.id);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${isMobile ? 'w-full' : 'w-72 lg:w-84'}`} dir="rtl">
      {/* Search Bar Input Container */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="חפש סדנה, חג, תוצר או נושא..."
          className="w-full bg-white text-blue-950 placeholder-blue-900/60 font-bold px-4 py-2.5 pr-10 pl-9 rounded-full border-2 border-yellow-400 focus:border-blue-600 focus:outline-none shadow-sm transition-all text-sm"
        />

        {/* Right Magnifying Glass Icon */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-900 pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Left Clear Button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-black transition-colors cursor-pointer"
            title="נקה חיפוש"
          >
            ✕
          </button>
        )}
      </div>

      {/* Floating Live Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full mt-2 right-0 left-0 sm:min-w-[380px] md:min-w-[420px] bg-white rounded-3xl shadow-2xl border-2 border-yellow-400 overflow-hidden z-[150] transition-all animate-in fade-in slide-in-from-top-2 text-right">
          
          {/* Header Summary Bar */}
          <div className="bg-yellow-50 px-4 py-2.5 border-b border-yellow-100 flex items-center justify-between text-xs font-black text-blue-950">
            <span>
              {searchResults.length > 0 
                ? `נמצאו ${searchResults.length} סדנאות מתאימות` 
                : 'תוצאות חיפוש'}
            </span>
            <span className="text-[11px] text-gray-500 font-normal">
              הקש <kbd className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-700 font-mono text-[10px]">Enter</kbd> לבחירה
            </span>
          </div>

          {/* Quick Category Jump Banner */}
          {matchingCategory && (
            <div
              onClick={() => handleSelectCategory(matchingCategory.slug || matchingCategory.id)}
              className="bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 p-3 px-4 border-b border-pink-100 flex items-center justify-between cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-[#ff1b5a] text-white flex items-center justify-center text-xs font-black shadow-xs">
                  📁
                </span>
                <div>
                  <span className="text-xs font-black text-blue-950 block group-hover:text-[#ff1b5a] transition-colors">
                    צפה בכל סדנאות קטגוריית {matchingCategory.title}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">מעבר ישיר לקטלוג הקטגוריה</span>
                </div>
              </div>
              <span className="text-[#ff1b5a] font-black text-xs transform group-hover:-translate-x-1 transition-transform">
                מעבר ◀
              </span>
            </div>
          )}

          {/* Workshop Results List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
            {searchResults.map((item, index) => {
              const w = item.workshop;
              const isSelected = index === selectedIndex;
              const validImages = (w.images || []).filter(img => !isDummyImage(img));
              const categoryBanner = getContent(`category_hero_banner_${w.category}`, getContent(`category_thumb_${w.category}`, ''));
              const thumb = validImages[0] || (w as any).image || (!isDummyImage(categoryBanner) ? categoryBanner : siteLogo);
              const gradient = CATEGORY_COLORS[w.category] || "from-blue-500 to-indigo-600";

              return (
                <div
                  key={w.id}
                  onClick={() => handleSelectWorkshop(w)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 sm:p-3.5 flex items-center gap-3.5 cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-50/80' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Workshop Thumbnail */}
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border-2 border-white shadow-sm bg-gray-100">
                    <img src={thumb} alt={w.title} className="w-full h-full object-cover" />
                  </div>

                  {/* Workshop Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-black text-sm text-blue-950 truncate font-creative">
                        {w.title}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black text-white bg-gradient-to-r ${gradient} shrink-0`}>
                        {w.category}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 truncate font-normal">
                      {w.description || w.longDescription || 'סדנת יצירה וערכים'}
                    </p>

                    {/* Chips */}
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-gray-400">
                      {w.result && (
                        <span className="text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-md truncate max-w-[140px]">
                          🎨 {w.result}
                        </span>
                      )}
                      {w.duration && (
                        <span>⏱️ {w.duration}</span>
                      )}
                      {w.audience && (
                        <span>👥 {w.audience}</span>
                      )}
                    </div>
                  </div>

                  {/* Direct Arrow Indicator */}
                  <div className="text-gray-400 pl-1">
                    <span className={`text-sm font-black transition-transform ${isSelected ? 'text-[#ff1b5a] -translate-x-1 inline-block' : ''}`}>
                      ◀
                    </span>
                  </div>
                </div>
              );
            })}

            {/* No Results Fallback */}
            {searchResults.length === 0 && !matchingCategory && (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-xl mx-auto shadow-xs">
                  🔍
                </div>
                <div>
                  <span className="block font-black text-sm text-blue-950 mb-1">
                    לא נמצאו סדנאות התואמות לחיפוש
                  </span>
                  <span className="text-xs text-gray-500 font-medium block">
                    נסו לחפש לפי חג, שם סדנה, סוג חומר או פעילות
                  </span>
                </div>

                {/* Popular Quick Suggestions */}
                <div className="pt-2 flex flex-wrap justify-center gap-1.5">
                  <span className="text-[11px] font-bold text-gray-400 ml-1">חיפושים נפוצים:</span>
                  {POPULAR_SUGGESTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setQuery(tag);
                        inputRef.current?.focus();
                      }}
                      className="text-[11px] font-bold bg-yellow-100 hover:bg-yellow-200 text-blue-950 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="bg-gray-50 p-2.5 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/');
                setTimeout(() => {
                  document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-xs font-black text-blue-900 hover:text-[#ff1b5a] transition-colors"
            >
              לצפייה בכל הסדנאות במעגל השנה ⬅️
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default WorkshopSearch;
