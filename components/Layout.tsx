import React, { useState, useEffect } from 'react';
import Navbar from './Navbar.tsx';

import { Workshop } from '../types.ts';

interface LayoutProps {
  children: React.ReactNode;
  workshops?: Workshop[];
}

const AccessibilityModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [largeFont, setLargeFont] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [highlightLinks, setHighlightLinks] = useState(false);

  useEffect(() => {
    if (largeFont) document.body.classList.add('acc-large-font');
    else document.body.classList.remove('acc-large-font');

    if (grayscale) document.body.classList.add('acc-grayscale');
    else document.body.classList.remove('acc-grayscale');

    if (contrast) document.body.classList.add('acc-contrast');
    else document.body.classList.remove('acc-contrast');

    if (highlightLinks) document.body.classList.add('acc-links');
    else document.body.classList.remove('acc-links');
  }, [largeFont, grayscale, contrast, highlightLinks]);

  const resetAll = () => {
    setLargeFont(false);
    setGrayscale(false);
    setContrast(false);
    setHighlightLinks(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative overflow-hidden" dir="rtl">
        <div className="p-6 bg-blue-900 text-white flex justify-between items-center">
          <h2 className="text-xl font-black">הגדרות נגישות</h2>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <button 
            onClick={() => setLargeFont(!largeFont)} 
            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 font-bold transition-all ${largeFont ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-100 hover:border-gray-200'}`}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">A+</span>
              הגדלת טקסט
            </span>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${largeFont ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>
              {largeFont && <span>✓</span>}
            </div>
          </button>

          <button 
            onClick={() => setGrayscale(!grayscale)} 
            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 font-bold transition-all ${grayscale ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-100 hover:border-gray-200'}`}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">🌓</span>
              גווני אפור
            </span>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${grayscale ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>
              {grayscale && <span>✓</span>}
            </div>
          </button>

          <button 
            onClick={() => setContrast(!contrast)} 
            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 font-bold transition-all ${contrast ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-100 hover:border-gray-200'}`}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">☀️</span>
              ניגודיות גבוהה
            </span>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${contrast ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>
              {contrast && <span>✓</span>}
            </div>
          </button>

          <button 
            onClick={() => setHighlightLinks(!highlightLinks)} 
            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 font-bold transition-all ${highlightLinks ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-100 hover:border-gray-200'}`}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">🔗</span>
              הדגשת קישורים
            </span>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${highlightLinks ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>
              {highlightLinks && <span>✓</span>}
            </div>
          </button>

          <button 
            onClick={resetAll} 
            className="w-full text-center py-2 text-sm text-gray-500 hover:text-red-500 font-bold transition-colors"
          >
            איפוס הגדרות
          </button>
        </div>
      </div>
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, workshops = [] }) => {
  const [isAccOpen, setIsAccOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col selection:bg-pink-100 selection:text-pink-600 overflow-x-hidden max-w-full relative">
      <Navbar workshops={workshops} />

      <main className="flex-grow">
        {children}
      </main>

      {/* Floating Side Action Buttons (WhatsApp + Accessibility) */}
      <div 
        className="fixed top-1/2 left-2 sm:left-3 -translate-y-1/2 z-50 flex flex-col gap-2.5 pointer-events-none select-none"
        dir="ltr"
      >
        {/* WhatsApp Button */}
        <a 
          href="https://wa.me/972584327701" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="w-11 h-11 sm:w-12 sm:h-12 bg-[#25D366] text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-transform flex items-center justify-center cursor-pointer hover:shadow-green-200 relative group pointer-events-auto"
          aria-label="Chat on WhatsApp"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.025 3.012l-.582 2.128 2.184-.573c.678.371 1.558.601 2.46.601 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.768-5.767-5.768zm3.01 7.712c-.124.349-.714.675-1.021.714-.287.037-.655.056-1.056-.082-.249-.086-.566-.201-.94-.365-1.587-.696-2.618-2.327-2.697-2.433-.079-.106-.669-.889-.669-1.696 0-.807.423-1.201.573-1.353.15-.151.328-.189.437-.189.109 0 .218.001.312.005.101.004.237-.038.37.281.137.33.468 1.141.509 1.226.041.085.068.184.01.299-.058.114-.087.185-.174.286-.087.102-.183.228-.262.307-.087.087-.179.182-.077.357.102.175.452.744.97 1.206.667.595 1.23.78 1.405.867.175.087.278.073.382-.047.104-.12.443-.516.562-.693.12-.177.239-.15.402-.09.164.06.1.48.513 1.258.134.251.01.463-.05.582z" />
          </svg>
          <span className="hidden md:block pointer-events-none absolute left-full ml-3 bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            צריכים עזרה?
          </span>
        </a>

        {/* Accessibility Button */}
        <button 
          onClick={() => setIsAccOpen(true)}
          className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-600 text-white p-2.5 sm:p-3 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-transform flex items-center justify-center cursor-pointer hover:shadow-blue-200 relative group pointer-events-auto"
          aria-label="Accessibility Settings"
          title="נגישות"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
          </svg>
          <span className="hidden md:block pointer-events-none absolute left-full ml-3 bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            נגישות
          </span>
        </button>
      </div>

      <AccessibilityModal isOpen={isAccOpen} onClose={() => setIsAccOpen(false)} />

      {/* Footer */}
      <footer className="bg-blue-950 text-white py-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <h2 className="text-3xl font-black mb-4">ניידות חב"ד בע"מ</h2>
          <p className="text-blue-200 font-medium mb-10 max-w-lg mx-auto">
            מפיצים את אור החג והמסורת בדרך חווייתית ויצירתית לכל ילדי ישראל מאז שנת 2006.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
              <span className="block text-blue-300 font-black mb-2">טלפון להזמנות (בצלאל):</span>
              <a href="tel:0584327701" className="text-xl font-black hover:text-[#ff1b5a] transition-colors" dir="ltr">058-4327701</a>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
              <span className="block text-blue-300 font-black mb-2">מספר תכנית בגפ"ן:</span>
              <span className="text-xl font-black">19053</span>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
              <span className="block text-blue-300 font-black mb-2">כתובתנו:</span>
              <span className="text-xl font-black">פעילות בפריסה ארצית</span>
            </div>
          </div>

          <div className="text-sm text-blue-400">
            © {new Date().getFullYear()} כל הזכויות שמורות לחוויה של סדנה - ניידות חב"ד ישראל.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
