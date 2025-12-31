
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext.tsx';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAdmin, logout, setShowLoginModal } = useAdmin();

  return (
    <header className="w-full z-50">
      {/* Top Social & Info Bar */}
      <div className="bg-[#c2e4f7]/30 border-b border-blue-100 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 h-10 flex justify-between items-center text-sm">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <a href="#" className="text-blue-800 hover:text-blue-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
              </a>
              <a href="#" className="text-red-500 hover:text-red-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </a>
            </div>
            <span className="text-[#ff1b5a] font-black tracking-widest text-lg ml-4">058-4327701</span>
          </div>
          <div className="flex items-center gap-6 text-gray-700 font-bold">
            <Link to="/about" className="hover:text-blue-600 transition-colors">אודות</Link>
            <Link to="/contact" className="hover:text-blue-600 transition-colors">צור קשר</Link>
            {isAdmin ? (
              <button onClick={logout} className="text-[#ff1b5a] hover:text-red-700 transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                התנתק
              </button>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)} 
                className="text-blue-400 hover:text-blue-600 transition-colors text-xs opacity-50"
              >
                כניסת צוות
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Menu Bar */}
      <nav className="bg-[#c2e4f7] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex-shrink-0 flex items-center gap-3">
                <div className="relative">
                   <div className="bg-white p-2 rounded-full shadow-lg border-2 border-blue-200">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-blue-900 leading-none">חוויה יהודית</span>
                  <span className="text-sm font-bold text-blue-700">סדנאות להכרת חגי ישראל</span>
                </div>
              </Link>

              <div className="hidden md:flex items-center space-x-reverse space-x-8">
                <Link to="/" className="text-blue-900 font-black hover:text-[#ff1b5a] transition-colors">דף הבית</Link>
                <Link to="/about" className="text-blue-900 font-black hover:text-[#ff1b5a] transition-colors">מי אנחנו</Link>
                <Link to="/contact" className="text-blue-900 font-black hover:text-[#ff1b5a] transition-colors">הזמנת סדנה</Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 text-blue-900 hover:bg-white/20 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
              <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-blue-900 focus:outline-none">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        {isOpen && (
          <div className="md:hidden bg-[#c2e4f7] border-t border-blue-200 py-4 text-right">
            <div className="px-4 space-y-4 font-black text-blue-900">
              <Link to="/" onClick={() => setIsOpen(false)} className="block">דף הבית</Link>
              <Link to="/about" onClick={() => setIsOpen(false)} className="block">אודות</Link>
              <Link to="/contact" onClick={() => setIsOpen(false)} className="block">צור קשר</Link>
              {!isAdmin && (
                <button 
                  onClick={() => { setIsOpen(false); setShowLoginModal(true); }} 
                  className="block text-blue-400 text-sm w-full text-right"
                >
                  כניסת צוות
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
