import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Workshop } from '../types.ts';

interface MomentsGalleryProps {
  workshops: Workshop[];
}

interface GalleryItem {
  id: number | string;
  image: string;
  title: string;
  category: string;
  uniqueKey?: number;
  isFading?: boolean;
}

const MomentsGallery: React.FC<MomentsGalleryProps> = ({ workshops }) => {
  const allImages = useMemo(() => {
    return workshops.flatMap(w => 
      (w.images || []).slice(0, 3).map(img => ({
        id: w.id,
        image: img,
        title: w.title,
        category: w.category
      }))
    );
  }, [workshops]);

  const count = Math.min(Math.max(allImages.length, 4), 12);
  const [items, setItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    if (allImages.length === 0) return;
    const shuffled = [...allImages].sort(() => 0.5 - Math.random());
    const initial: GalleryItem[] = [];
    for (let i = 0; i < count; i++) {
      initial.push(shuffled[i % shuffled.length]);
    }
    setItems(initial.map((item, idx) => ({ ...item, uniqueKey: Date.now() + idx, isFading: false })));
  }, [allImages, count]);

  if (allImages.length === 0) return null;

  return (
    <section className="py-24 bg-gradient-to-b from-[#f8fbfe] to-white relative overflow-hidden" dir="ltr">
      <div className="text-center mb-12 relative z-10 px-4" dir="rtl">
        <h2 className="text-4xl md:text-5xl font-black text-blue-900 font-creative mb-4">רגעים של יצירה</h2>
        <p className="text-xl text-blue-600/80 font-bold max-w-2xl mx-auto">
          הצצה קטנה מהסדנאות שלנו ברחבי הארץ
        </p>
      </div>

      <div className="max-w-[1800px] mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item, idx) => (
            <div key={item.uniqueKey || idx} className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-lg border-4 border-white group bg-gray-100">
              <Link to={`/workshop/${item.id}`} className="block w-full h-full">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110" 
                  loading="lazy" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white p-4 text-center" dir="rtl">
                  <span className="text-xs font-black text-yellow-300 uppercase tracking-widest mb-1">{item.category}</span>
                  <span className="text-sm font-bold line-clamp-2">{item.title}</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MomentsGallery;
