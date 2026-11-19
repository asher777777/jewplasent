import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Workshop } from '../types.ts';
import Editable from '../components/Editable.tsx';
import { INITIAL_CATEGORIES, getOrderedCategories, CategoryItem, isDummyImage, DEFAULT_SITE_IMAGE } from '../categories.ts';
import MomentsGallery from '../components/MomentsGallery.tsx';
import SeoHead from '../components/SeoHead.tsx';
import { useAdmin } from '../contexts/AdminContext.tsx';

interface HomeProps {
  workshops: Workshop[];
}

const Features = [
  {
    title: "סדנאות מאושרות",
    desc: 'תכנית מאושרת במערכת גפ"ן (מס\' 19053) - איכות פדגוגית מובטחת',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "bg-[#7c3aed]"
  },
  {
    title: "מערך חינוכי שלם",
    desc: "תכנית חווייתית הפונה לכל החושים ומשלבת יצירה, תוכן ורגש",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    color: "bg-[#0ea5e9]"
  },
  {
    title: "פריסה ארצית",
    desc: 'מגיעים לכל מקום בארץ: קיבוצים, מושבים, ערים ומתנ"סים',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "bg-[#ff1b5a]"
  },
  {
    title: "לכל הגילאים",
    desc: "פעילות מודולרית המותאמת במיוחד לילדים, נוער ומבוגרים",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    color: "bg-[#fbbf24]"
  }
];

const Home: React.FC<HomeProps> = ({ workshops }) => {
  const { getContent, settings } = useAdmin();
  const catalogPdfUrl = getContent(
    'catalog_pdf_url',
    'https://firebasestorage.googleapis.com/v0/b/chabad-workshops-cms-files/o/site-content%2Fcatalog_workshops_print.pdf?alt=media&token=7c0813ed-041b-4e7c-a334-4259f52a81a9'
  );
  const customCategories: CategoryItem[] = settings?.customCategories || [];
  const categoryOrder: string[] = settings?.categoryOrder || [];

  // Only active holidays that have non-deleted workshops (sorted by categoryOrder)
  const activeHolidays = useMemo(() => {
    const all = getOrderedCategories([...INITIAL_CATEGORIES, ...customCategories], categoryOrder);
    return all.filter(holiday => 
      workshops.some(w => w.category === holiday.id || w.category === holiday.slug)
    );
  }, [workshops, customCategories, categoryOrder]);

  return (
    <div className="min-h-screen bg-white">
      {/* Dynamic SEO & AIEO Meta + Structured Data for Homepage */}
      <SeoHead
        pageKey="home"
        title="חוויה של סדנה | סדנאות יצירה ותוכן לילדים ולנוער - ניידות חב&quot;ד"
        description={settings?.siteDescription || "סדנאות יצירה חווייתיות וערכיות לילדים ולנוער סביב לוח השנה היהודי - ניידות חב&quot;ד ישראל. תכנית מאושרת במערכת גפ&quot;ן 19053."}
        image={settings?.siteLogo || "https://firebasestorage.googleapis.com/v0/b/chabad-workshops-cms-files/o/site%2Flogo_1767863965088?alt=media&token=b45fef20-47ee-456e-b050-dd612571cd43"}
        url="https://chabad-workshops-cms.web.app"
        type="website"
        keywords={["סדנאות יצירה", "חב\"ד", "סדנאות לילדים", "גפ\"ן 19053", "ניידות חב\"ד", "מעגל השנה", "סדנאות חגים"]}
        schemaData={{
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          "name": 'חוויה של סדנה - ניידות חב"ד ישראל',
          "url": "https://chabad-workshops-cms.web.app",
          "logo": settings?.siteLogo || "https://firebasestorage.googleapis.com/v0/b/chabad-workshops-cms-files/o/site%2Flogo_1767863965088?alt=media&token=b45fef20-47ee-456e-b050-dd612571cd43",
          "description": "סדנאות יצירה חווייתיות וערכיות לילדים ולנוער סביב לוח השנה היהודי",
          "telephone": "058-4327701",
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "סדנאות יהודיות במעגל השנה",
            "itemListElement": activeHolidays.map(h => ({
              "@type": "OfferCatalog",
              "name": h.title,
              "url": `https://chabad-workshops-cms.web.app/category/${h.slug}`
            }))
          }
        }}
      />

      {/* 1. Hero Section */}
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
            <div className="text-xl md:text-2xl text-blue-800 font-bold mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              <Editable id="hero_subtitle">אתר סדנאות להכרת חגי ישראל - חוויה יצירתית!</Editable> <br />
              <span className="text-gray-500 font-medium">
                <Editable id="hero_tagline">חיפשת פעילות ערכית ומקצועית - מצאת מה שחיפשת!</Editable>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <button 
                onClick={() => document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" })}
                className="bg-[#ff1b5a] text-white px-12 py-4 rounded-xl text-xl font-black hover:bg-[#e61750] transition-all shadow-xl shadow-pink-200 cursor-pointer"
              >
                לצפייה בסדנאות
              </button>
              <a 
                href={catalogPdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                download="קטלוג_סדנאות_חוויה_של_סדנה.pdf"
                className="bg-white text-blue-900 border-2 border-blue-200 px-8 py-4 rounded-xl text-xl font-black hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer group"
                title="הורדת קטלוג הסדנאות המלא להדפסה"
              >
                <svg className="w-6 h-6 text-[#ff1b5a] group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                להורדת קטלוג הסדנאות שלנו
              </a>
            </div>
          </div>

          <div className="order-1 lg:order-2 flex justify-center">
             <div className="relative">
                <div className="absolute inset-0 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                <div className="relative z-10 w-full max-w-md md:max-w-lg aspect-square overflow-hidden blob-shape border-8 border-white shadow-2xl">
                  <Editable 
                    type="image" 
                    id="hero_main_image" 
                    className="w-full h-full object-cover"
                  >
                    https://firebasestorage.googleapis.com/v0/b/chabad-workshops-cms-files/o/site-content%2Fhero_main_image_1767863885675?alt=media&token=bf95e994-10ce-48be-b715-cf1908709e7e
                  </Editable>
                </div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#ff1b5a] blob-shape opacity-10 animate-float"></div>
                <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-blue-400 blob-shape opacity-20 animate-float" style={{animationDelay: '1s'}}></div>
             </div>
          </div>
        </div>
      </section>

      {/* 2. Features Section (Solid Vibrant Color Cards exactly like production) */}
      <section className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {Features.map((feat, idx) => (
              <div 
                key={idx} 
                className={`group ${feat.color} text-white p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col items-center text-center`}
              >
                <div className="mb-4 text-white/90">
                  {feat.icon}
                </div>
                <h4 className="font-black text-3xl mb-3 font-creative tracking-wide">
                  {feat.title}
                </h4>
                <p className="text-white/80 font-medium leading-relaxed max-w-xs">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. במעגל השנה - Circular Cards (Exactly the 4 Active Holidays in 1 Row) */}
      <section id="explore" className="py-24 bg-[#f8fbfe] relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-full h-64 bg-blue-100/50 -skew-y-3 -translate-y-1/2 pointer-events-none"></div>
        <div className="max-w-[1600px] mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-7xl font-black text-blue-900 mb-6 font-creative">מעגל השנה היהודי</h2>
            <p className="text-gray-600 text-xl font-medium max-w-2xl mx-auto">בחרו חג וצאו למסע של יצירה</p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-4 lg:gap-8">
            {activeHolidays.map((holiday, i) => {
              const siteLogo = settings?.siteLogo || DEFAULT_SITE_IMAGE;
              const rawBanner = getContent(`category_hero_banner_${holiday.id}`, getContent(`category_hero_banner_${holiday.slug}`, holiday.image));
              const rawThumb = getContent(`category_thumb_${holiday.id}`, getContent(`category_thumb_${holiday.slug}`, rawBanner));
              const effectiveImg = isDummyImage(rawThumb) ? siteLogo : rawThumb;

              return (
                <div key={holiday.id} className="flex items-center">
                  <Link
                    to={`/category/${holiday.slug}`}
                    className="group relative w-64 h-80 bg-white rounded-[4rem] shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 flex flex-col items-center justify-between p-2 pb-4 overflow-hidden"
                  >
                    <div className="text-center pt-8 px-4 z-10">
                      <h3 className="text-2xl font-black text-[#ff1b5a] font-creative mb-2 leading-none">{holiday.title}</h3>
                      <p className="text-sm font-bold text-gray-800 leading-tight">{holiday.subtitle}</p>
                    </div>

                    <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-inner group-hover:scale-110 transition-transform duration-500">
                      <Editable type="image" id={`category_thumb_${holiday.id}`} className="w-full h-full object-cover">
                        {effectiveImg}
                      </Editable>
                      <div className={`absolute inset-0 bg-gradient-to-t ${holiday.color || 'from-orange-400 to-red-500'} opacity-30 group-hover:opacity-0 transition-opacity pointer-events-none`}></div>
                    </div>

                    <div className="absolute bottom-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                      <span className="text-[#ff1b5a] font-black text-xs tracking-widest">לחץ לצפייה</span>
                    </div>
                  </Link>

                  {i < activeHolidays.length - 1 && (
                    <div className="hidden xl:block text-gray-200 mx-2">
                      <svg className="w-8 h-8 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. רגעים של יצירה (Photo Gallery - Exactly like Production) */}
      <MomentsGallery workshops={workshops} />
    </div>
  );
};

export default Home;
