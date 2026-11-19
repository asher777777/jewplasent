import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext.tsx';
import Editable from './Editable.tsx';
import { INITIAL_CATEGORIES as HOLIDAYS, CategoryItem, getOrderedCategories, isDummyImage, DEFAULT_SITE_IMAGE } from '../categories.ts';
import WorkshopSearch from './WorkshopSearch.tsx';

export { HOLIDAYS };

interface NavbarProps {
  workshops?: any[];
}

const Navbar: React.FC<NavbarProps> = ({ workshops = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const { isAdmin, logout, setShowLoginModal, settings, getContent } = useAdmin();

  const customCategories: CategoryItem[] = settings?.customCategories || [];
  const categoryOrder: string[] = settings?.categoryOrder || [];
  const allOrderedCategories = getOrderedCategories([...HOLIDAYS, ...customCategories], categoryOrder);

  const activeCategories = workshops.length > 0 
    ? allOrderedCategories.filter(h => workshops.some(w => w.category === h.id || w.category === h.slug)).map(h => h.id)
    : allOrderedCategories.map(h => h.id);
  const categories = activeCategories.length > 0 ? activeCategories : allOrderedCategories.map(h => h.id);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const siteLogo = settings?.siteLogo || "https://firebasestorage.googleapis.com/v0/b/chabad-workshops-cms-files/o/site%2Flogo_1767863965088?alt=media&token=b45fef20-47ee-456e-b050-dd612571cd43";
  const siteName = settings?.siteName || "חוויה של סדנה";
  const siteDescription = settings?.siteDescription || "ניידות חב\"ד ישראל";

  return (
    <header className="w-full z-50 sticky top-0">
      <nav className="bg-[#fcb712] shadow-md relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center group">
                <div className="absolute top-0 right-4 md:right-8 z-50 transition-transform duration-300 hover:scale-105">
                  <div className="bg-white p-3 rounded-full shadow-xl border-4 border-yellow-400/50 overflow-hidden w-28 h-28 md:w-32 md:h-32 flex items-center justify-center">
                    <img 
                      src={siteLogo} 
                      alt="Logo" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                </div>

                <div className="flex flex-col mr-36 md:mr-44 transition-opacity md:opacity-100 opacity-0">
                  <span className="text-2xl font-black text-blue-900 leading-none drop-shadow-sm">
                    {siteName}
                  </span>
                  <span className="text-sm font-bold text-blue-800">
                    {siteDescription}
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <div className="hidden md:flex items-center space-x-reverse space-x-8 mr-8">
                <Link to="/" className="text-blue-900 font-black hover:text-white transition-colors">
                  דף הבית
                </Link>

                {/* במעגל השנה Dropdown */}
                <div 
                  className="relative group"
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <button 
                    className="flex items-center text-blue-900 font-black hover:text-white transition-colors focus:outline-none h-20"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <span>במעגל השנה</span>
                    <svg className={`w-4 h-4 mr-1 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <div className={`absolute top-16 right-0 w-[550px] bg-white rounded-[2.5rem] shadow-2xl p-6 transition-all duration-300 transform origin-top border-4 border-[#fcb712] ${isDropdownOpen ? 'opacity-100 scale-100 visible translate-y-0' : 'opacity-0 scale-95 invisible -translate-y-2'}`}>
                    <div className="absolute -top-3 right-8 w-6 h-6 bg-white border-t-4 border-l-4 border-[#fcb712] transform rotate-45"></div>
                    <div className="relative z-10 grid grid-cols-2 gap-3">
                      {categories.map((cat) => {
                        const holiday = allOrderedCategories.find(h => h.id === cat || h.slug === cat);
                        const siteLogo = settings?.siteLogo || DEFAULT_SITE_IMAGE;
                        const rawBanner = getContent(`category_hero_banner_${cat}`, getContent(`category_hero_banner_${holiday?.slug}`, holiday?.image || siteLogo));
                        const rawThumb = getContent(`category_thumb_${cat}`, getContent(`category_thumb_${holiday?.slug}`, rawBanner));
                        const effectiveImage = isDummyImage(rawThumb) ? siteLogo : rawThumb;

                        return (
                          <Link 
                            key={cat} 
                            to={`/category/${holiday?.slug || cat}`}
                            onClick={() => setIsDropdownOpen(false)}
                            className="group flex items-center gap-3 p-1.5 pr-2 rounded-[2rem] border-2 border-transparent hover:border-blue-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-gray-50 hover:bg-white"
                          >
                            <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border-2 border-white shadow-sm relative">
                              <Editable type="image" id={`category_thumb_${cat}`} className="w-full h-full object-cover">
                                {effectiveImage}
                              </Editable>
                            </div>
                            <span className="font-black text-blue-900 group-hover:text-[#ff1b5a] transition-colors text-right flex-grow px-2 truncate text-sm">
                              {holiday?.title || cat}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <Link to="/about" className="text-blue-900 font-black hover:text-white transition-colors">
                  מי אנחנו
                </Link>
                <Link to="/contact" className="text-blue-900 font-black hover:text-white transition-colors">
                  הזמנת סדנה
                </Link>
              </div>
            </div>

            {/* Left Controls (Search & Auth) */}
            <div className="flex items-center gap-3 relative">
              {/* Desktop Live Search Engine */}
              <div className="hidden md:block">
                <WorkshopSearch workshops={workshops} />
              </div>

              {/* Mobile Search Toggle Button */}
              <button 
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                className="md:hidden text-blue-900 hover:text-white p-2 rounded-full hover:bg-yellow-400/40 transition-colors cursor-pointer"
                aria-label="חיפוש סדנה"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* User / Login Button */}
              {isAdmin ? (
                <button 
                  onClick={logout}
                  className="flex items-center gap-2 text-blue-900 hover:text-white font-black text-sm bg-yellow-400/50 hover:bg-yellow-500/50 px-4 py-2 rounded-full transition-all cursor-pointer"
                >
                  <span>התנתק</span>
                  <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              ) : (
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-2 text-blue-900 hover:text-white font-black text-sm bg-yellow-400/50 hover:bg-yellow-500/50 px-4 py-2 rounded-full transition-all cursor-pointer"
                >
                  <span>כניסת צוות</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
              )}

              {/* Mobile Hamburger Button */}
              <div className="flex md:hidden">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="text-blue-900 hover:text-white focus:outline-none p-2 cursor-pointer"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Drawer (When search toggle is clicked on mobile) */}
        {isMobileSearchOpen && (
          <div className="md:hidden bg-yellow-400 p-3 px-4 border-t border-yellow-500 shadow-md">
            <WorkshopSearch 
              workshops={workshops} 
              isMobile={true} 
              onCloseMobile={() => setIsMobileSearchOpen(false)} 
            />
          </div>
        )}

        {/* Mobile menu dropdown */}
        {isOpen && (
          <div className="md:hidden bg-yellow-400 border-t border-yellow-500 px-4 pt-3 pb-6 space-y-3">
            {/* Quick search inside mobile menu */}
            <div className="pb-2">
              <WorkshopSearch 
                workshops={workshops} 
                isMobile={true} 
                onCloseMobile={() => setIsOpen(false)} 
              />
            </div>
            <Link 
              to="/" 
              onClick={() => setIsOpen(false)}
              className="block text-blue-950 font-black text-lg py-2"
            >
              דף הבית
            </Link>
            <div className="py-2">
              <span className="block text-blue-900 font-bold text-sm mb-2">במעגל השנה:</span>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const holiday = HOLIDAYS.find(h => h.id === cat || h.slug === cat);
                  return (
                    <Link
                      key={cat}
                      to={`/category/${holiday?.slug || cat}`}
                      onClick={() => setIsOpen(false)}
                      className="bg-white/40 p-2 rounded-xl text-blue-950 font-bold text-sm truncate"
                    >
                      {holiday?.title || cat}
                    </Link>
                  );
                })}
              </div>
            </div>
            <Link 
              to="/about" 
              onClick={() => setIsOpen(false)}
              className="block text-blue-950 font-black text-lg py-2"
            >
              מי אנחנו
            </Link>
            <Link 
              to="/contact" 
              onClick={() => setIsOpen(false)}
              className="block text-blue-950 font-black text-lg py-2"
            >
              הזמנת סדנה
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
