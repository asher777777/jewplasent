
import React from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col selection:bg-pink-100 selection:text-pink-600">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <footer className="bg-blue-950 text-white py-16 relative overflow-hidden">
        {/* Artistic footer background pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
           <svg width="100%" height="100%">
             <pattern id="pattern-hex" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
               <path d="M20 0L37.32 10V30L20 40L2.68 30V10L20 0Z" fill="none" stroke="currentColor" strokeWidth="1"/>
             </pattern>
             <rect width="100%" height="100%" fill="url(#pattern-hex)" />
           </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <div className="flex justify-center mb-8">
            <div className="bg-white/10 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
              <svg className="w-12 h-12 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-black mb-4">חוויה יהודית יצירתית</h2>
          <p className="text-blue-200 font-medium mb-10 max-w-lg mx-auto">מפיצים את אור החג והמסורת בדרך חווייתית ויצירתית לכל ילדי ישראל מאז שנת 2006.</p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
              <span className="block text-blue-300 font-black mb-2">טלפון להזמנות:</span>
              <a href="tel:0584327701" className="text-xl font-black hover:text-[#ff1b5a] transition-colors">058-4327701</a>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
              <span className="block text-blue-300 font-black mb-2">מספר תכנית בגפ"ן:</span>
              <span className="text-xl font-black">2369</span>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
              <span className="block text-blue-300 font-black mb-2">כתובתנו:</span>
              <span className="text-xl font-black">פעילות בפריסה ארצית</span>
            </div>
          </div>

          <div className="flex justify-center gap-4 mb-10">
            {['Facebook', 'WhatsApp', 'Email'].map(social => (
              <button key={social} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#ff1b5a] transition-all">
                <span className="sr-only">{social}</span>
                <div className="w-5 h-5 bg-white rounded-sm opacity-20"></div>
              </button>
            ))}
          </div>

          <div className="pt-8 border-t border-white/10 text-sm text-blue-400">
            © {new Date().getFullYear()} כל הזכויות שמורות לחוויה יהודית - סדנאות חב"ד. מוגש באהבה גדולה.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
