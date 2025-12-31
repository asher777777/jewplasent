
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Workshop, Category } from '../types.ts';
import WorkshopCard from '../components/WorkshopCard.tsx';
import Editable from '../components/Editable.tsx';

interface HomeProps {
  workshops: Workshop[];
}

const CATEGORIES: Category[] = [
  "תשרי",
  "שבת",
  "חנוכה",
  "שבט",
  "פורים",
  "פסח",
  "ל\"ג בעומר",
  "שבועות",
  "סוף שנה וקייטנות"
];

const Features = [
  {
    title: "סדנאות מאושרות במשרד החינוך",
    desc: "תכנית הסדנאות מאושרת במערכת גפ\"ן של משרד החינוך, מס' תכנית 2369",
    icon: <svg className="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
  },
  {
    title: "מערך חינוכי שלם",
    desc: "אתר סדנאות שמספק תכנית חווייתית הפונה אל כל חושי המשתתפים ומקנה ערכים",
    icon: <svg className="w-12 h-12 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
  },
  {
    title: "פעילות בכל רחבי הארץ",
    desc: "מערך חינוכי המפעיל סדנאות יצירה בכל הארץ: בקיבוצים, מושבים וערים",
    icon: <svg className="w-12 h-12 text-orange-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM18 12h-5V6h5v6z"/></svg>
  },
  {
    title: "ילדים, נוער ומבוגרים",
    desc: "פעילות מותאמת לכל המגזרים ולכל הגילאים, בהתאם לאופיים הייחודי",
    icon: <svg className="w-12 h-12 text-pink-400" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 13c-1.2 0-2.25.47-3 1.23-.75-.76-1.8-1.23-3-1.23-2.25 0-4.13 1.62-4.43 3.75l-.04.25h15l-.04-.25c-.3-2.13-2.18-3.75-4.46-3.75zM12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/></svg>
  },
  {
    title: "עשרים שנות פעילות",
    desc: "עקביות, התמדה והתפתחות מקצועית במטרה ליצור דרכי חינוך חדשניות",
    icon: <svg className="w-12 h-12 text-blue-300" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.43V2H7v8.43c0 .35.13.68.35.93l2.65 3.14v3.13l-1.5 1.5V22h7v-2.87l-1.5-1.5v-3.13l2.65-3.14c.22-.25.35-.58.35-.93zM12 11L9.4 8H14.6L12 11z"/></svg>
  },
  {
    title: "מעל 95 סוגי פעילויות",
    desc: "באתר סדנאות תמצאו מגוון ענק של סדנאות יצירה ערכיות וחינוכיות",
    icon: <svg className="w-12 h-12 text-yellow-300" fill="currentColor" viewBox="0 0 24 24"><path d="M14.7 5.8l-1.4-1.4L4 13.7V17h3.3l9.3-9.3-1.4-1.4-1.1 1.1L12.9 8.7l1.8-2.9zM3 21h18v-2H3v2z"/></svg>
  }
];

const Home: React.FC<HomeProps> = ({ workshops }) => {
  const groupedWorkshops = useMemo(() => {
    return CATEGORIES.reduce((acc, cat) => {
      acc[cat] = workshops.filter(w => w.category === cat);
      return acc;
    }, {} as Record<Category, Workshop[]>);
  }, [workshops]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center pt-10 pb-20 overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[#c2e4f7]/20 -skew-x-12 translate-x-1/4 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="order-2 lg:order-1 text-center lg:text-right">
            <h1 className="text-[#ff1b5a] font-creative text-6xl md:text-8xl lg:text-9xl font-black mb-4 drop-shadow-sm">
              <Editable id="hero_title_1">חינוך יצירתי</Editable> <br />
              <span className="text-blue-900">
                <Editable id="hero_title_2">זה כל ההבדל</Editable>
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-800 font-bold mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              <Editable id="hero_subtitle">אתר סדנאות להכרת חגי ישראל - חוויה יצירתית!</Editable> <br />
              <span className="text-gray-500 font-medium">
                <Editable id="hero_tagline">חיפשת פעילות ערכית ומקצועית - מצאת מה שחיפשת!</Editable>
              </span>
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <button className="bg-[#ff1b5a] text-white px-12 py-4 rounded-xl text-xl font-black hover:bg-[#e61750] transition-all shadow-xl shadow-pink-200">
                בקשת הצעה לפעילות
              </button>
              <button className="bg-white text-blue-900 border-2 border-blue-200 px-8 py-4 rounded-xl text-xl font-black hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                להורדת קטלוג הסדנאות שלנו
              </button>
            </div>
          </div>

          <div className="order-1 lg:order-2 flex justify-center">
             <div className="relative">
                <div className="absolute inset-0 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                <div className="relative z-10 w-full max-w-md md:max-w-lg aspect-square overflow-hidden blob-shape border-8 border-white shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=1000" 
                    alt="ילדים יוצרים" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#ff1b5a] blob-shape opacity-10 animate-float"></div>
                <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-blue-400 blob-shape opacity-20 animate-float" style={{animationDelay: '1s'}}></div>
             </div>
          </div>
        </div>
      </section>

      {/* Wave Separator */}
      <div className="w-full overflow-hidden leading-none rotate-180 bg-white">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-20 fill-gray-50">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
        </svg>
      </div>

      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-[#ff1b5a] font-creative text-5xl md:text-7xl font-black mb-4">
              אתר סדנאות חגי ישראל - <span className="text-blue-900">הפעילות שלנו</span>
            </h2>
            <div className="h-1.5 w-32 bg-yellow-400 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {Features.map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group text-center flex flex-col items-center">
                <div className="mb-6 transform group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-2xl font-black text-blue-900 mb-4">{f.title}</h3>
                <p className="text-gray-600 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workshop Catalog Sections */}
      <section id="explore" className="py-24 bg-white relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-50 rounded-full blur-3xl opacity-50 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50 translate-y-1/2"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
             <h2 className="text-5xl font-black text-blue-900 mb-6 font-creative">לוח שנה של סדנאות</h2>
             <p className="text-gray-600 text-xl font-medium max-w-xl mx-auto">בחרו את החג הרלוונטי וגלו עולם של יצירה יהודית חווייתית</p>
          </div>

          <div className="space-y-32">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="relative">
                <div className="flex items-center gap-6 mb-12">
                  <h3 className="text-4xl font-black text-blue-900 whitespace-nowrap bg-blue-50 px-6 py-2 rounded-2xl">{cat}</h3>
                  <div className="h-1 w-full bg-gradient-to-r from-blue-100 to-transparent"></div>
                  <span className="text-[#ff1b5a] font-black text-lg whitespace-nowrap">
                    {groupedWorkshops[cat]?.length || 0} סדנאות
                  </span>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {groupedWorkshops[cat]?.map(workshop => (
                    <WorkshopCard key={workshop.id} workshop={workshop} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WhatsApp Floating Button */}
      <a 
        href="https://wa.me/972584327701" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform animate-float flex items-center justify-center"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.025 3.012l-.582 2.128 2.184-.573c.678.371 1.558.601 2.46.601 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.768-5.767-5.768zm3.01 7.712c-.124.349-.714.675-1.021.714-.287.037-.655.056-1.056-.082-.249-.086-.566-.201-.94-.365-1.587-.696-2.618-2.327-2.697-2.433-.079-.106-.669-.889-.669-1.696 0-.807.423-1.201.573-1.353.15-.151.328-.189.437-.189.109 0 .218.001.312.005.101.004.237-.038.37.281.137.33.468 1.141.509 1.226.041.085.068.184.01.299-.058.114-.087.185-.174.286-.087.102-.183.228-.262.307-.087.087-.179.182-.077.357.102.175.452.744.97 1.206.667.595 1.23.78 1.405.867.175.087.278.073.382-.047.104-.12.443-.516.562-.693.12-.177.239-.15.402-.09.164.06.1.48.513 1.258.134.251.01.463-.05.582z"/></svg>
        <span className="absolute -top-12 right-0 bg-white text-gray-800 text-xs font-bold px-3 py-1 rounded-lg shadow-md whitespace-nowrap">צריכים עזרה?</span>
      </a>
    </div>
  );
};

export default Home;
