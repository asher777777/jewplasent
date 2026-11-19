import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Workshop } from '../types.ts';
import { useAdmin } from '../contexts/AdminContext.tsx';
import Editable from './Editable.tsx';
import { FirestoreService } from '../services/FirestoreService.ts';
import { INITIAL_CATEGORIES, CategoryItem, isDummyImage, DEFAULT_SITE_IMAGE } from '../categories.ts';

interface WorkshopCardProps {
  workshop: Workshop;
}

const categoryColors: Record<string, string> = {
  "תשרי": "from-orange-400 to-red-500",
  "שבת": "from-blue-400 to-indigo-600",
  "חנוכה": "from-yellow-300 to-orange-500",
  "שבט": "from-green-400 to-teal-600",
  "פורים": "from-purple-400 to-pink-500",
  "פסח": "from-blue-200 to-blue-500",
  "ל\"ג בעומר": "from-red-400 to-orange-600",
  "שבועות": "from-green-200 to-emerald-500",
  "סוף שנה וקייטנות": "from-cyan-400 to-blue-500"
};

const WorkshopCard: React.FC<WorkshopCardProps> = ({ workshop }) => {
  const { isEditMode, settings, getContent } = useAdmin();
  const customCategories: CategoryItem[] = settings?.customCategories || [];
  const allCategories: CategoryItem[] = [...INITIAL_CATEGORIES, ...customCategories];
  const navigate = useNavigate();

  const siteLogo = settings?.siteLogo || DEFAULT_SITE_IMAGE;
  const gradient = categoryColors[workshop.category] || "from-gray-400 to-gray-600";

  // Filter out any unsplash/dummy images so they NEVER display!
  const validImages = (workshop.images || []).filter(img => !isDummyImage(img));
  const hasImages = validImages.length > 0;
  
  // Real category banner from Firestore if available
  const categoryBanner = getContent(`category_hero_banner_${workshop.category}`, getContent(`category_thumb_${workshop.category}`, ''));
  const fallbackImg = !isDummyImage(categoryBanner) ? categoryBanner : siteLogo;

  const rawFirstImage = validImages[0] || (!isDummyImage((workshop as any).image) ? (workshop as any).image : '');
  const firstImage = rawFirstImage || fallbackImg;

  const handleImageSave = async (newUrl: string) => {
    if (!workshop.firestoreId) return;
    const currentImages = [...(workshop.images || [])];
    if (currentImages.length > 0) {
      currentImages[0] = newUrl;
    } else {
      currentImages.push(newUrl);
    }
    await FirestoreService.updateWorkshop(workshop.firestoreId, { images: currentImages });
  };

  const handleFieldSave = async (field: keyof Workshop, val: string) => {
    if (workshop.firestoreId) {
      await FirestoreService.updateWorkshop(workshop.firestoreId, { [field]: val });
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea' || target.closest('label') || target.closest('button')) {
      return;
    }
    navigate(`/workshop/${workshop.slug || workshop.id}`);
  };

  return (
    <div 
      onClick={handleClick} 
      className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-gray-100 flex flex-col h-full cursor-pointer"
    >
      {/* Workshop Image Header */}
      <div className={`relative h-52 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        {hasImages || isEditMode || firstImage ? (
          <div className="absolute inset-0 z-0 bg-gray-100">
            <Editable 
              type="image" 
              id={`workshop_card_${workshop.id}`} 
              onSave={handleImageSave} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            >
              {firstImage}
            </Editable>
          </div>
        ) : (
          <div className="absolute inset-0 opacity-10 flex flex-wrap gap-4 p-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-white opacity-30 transform rotate-12"></div>
            ))}
          </div>
        )}

        {isEditMode ? (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="absolute top-3 right-3 z-20 bg-amber-400 text-blue-950 px-2.5 py-1 rounded-xl shadow-lg text-xs font-black flex items-center gap-1.5 border border-amber-500"
          >
            <span className="text-[10px] text-amber-950">העבר:</span>
            <select
              value={workshop.category}
              onChange={async (e) => {
                e.stopPropagation();
                const newCat = e.target.value;
                if (!newCat || newCat === workshop.category) return;
                try {
                  if (workshop.firestoreId) {
                    await FirestoreService.updateWorkshop(workshop.firestoreId, { category: newCat });
                  } else {
                    await FirestoreService.addWorkshop({ ...workshop, category: newCat });
                  }
                  workshop.category = newCat;
                  window.location.reload();
                } catch (err) {
                  console.error(err);
                  alert("שגיאה בעדכון קטגוריה");
                }
              }}
              className="bg-white text-blue-900 text-xs font-bold rounded-lg px-2 py-0.5 border border-amber-500 cursor-pointer focus:outline-none"
            >
              {allCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.title}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-md text-[11px] font-black text-blue-900 uppercase tracking-widest z-10">
            {workshop.category}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-8 flex-grow flex flex-col">
        <h3 className="text-2xl font-black text-blue-900 mb-2 group-hover:text-[#ff1b5a] transition-colors line-clamp-1 font-creative leading-tight">
          <Editable id={`card_title_${workshop.id}`} onSave={(val) => handleFieldSave('title', val)}>
            {workshop.title}
          </Editable>
        </h3>
        
        <p className="text-gray-500 text-sm font-medium line-clamp-2 mb-6 flex-grow leading-relaxed">
          <Editable id={`card_desc_${workshop.id}`} type="textarea" onSave={(val) => handleFieldSave('description', val)}>
            {workshop.description}
          </Editable>
        </p>

        <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-[#ff1b5a]">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <span className="text-[11px] font-black text-gray-700 truncate max-w-[140px]">
              תוצר: {workshop.result}
            </span>
          </div>

          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-[#ff1b5a] group-hover:text-white transition-all shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkshopCard;
