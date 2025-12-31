
import React from 'react';
import { Link } from 'react-router-dom';
import { Workshop } from '../types';

interface WorkshopCardProps {
  workshop: Workshop;
}

const WorkshopCard: React.FC<WorkshopCardProps> = ({ workshop }) => {
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

  const gradient = categoryColors[workshop.category] || "from-gray-400 to-gray-600";

  return (
    <Link to={`/workshop/${workshop.id}`} className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-gray-100 flex flex-col">
      <div className={`relative h-48 bg-gradient-to-br ${gradient} p-4 flex items-center justify-center overflow-hidden`}>
        {/* Artistic background overlay */}
        <div className="absolute inset-0 opacity-10 flex flex-wrap gap-4 p-4">
           {Array.from({length: 12}).map((_, i) => (
             <div key={i} className="w-8 h-8 rounded-full bg-white opacity-30 transform rotate-12"></div>
           ))}
        </div>
        <div className="relative z-10 bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 text-white text-center transform group-hover:scale-110 transition-transform duration-500 shadow-xl">
           <span className="text-4xl font-black drop-shadow-md">#{workshop.id}</span>
        </div>
        <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full shadow-sm text-[10px] font-black text-blue-600 uppercase tracking-widest translate-y-[-40px] group-hover:translate-y-0 transition-transform duration-300">
           {workshop.category}
        </div>
      </div>
      
      <div className="p-8 flex-grow flex flex-col">
        <h3 className="text-2xl font-black text-blue-900 mb-2 group-hover:text-[#ff1b5a] transition-colors line-clamp-1 font-creative leading-tight">
          {workshop.title}
        </h3>
        <p className="text-gray-500 text-sm font-medium line-clamp-2 mb-6 flex-grow leading-relaxed">
          {workshop.description}
        </p>
        <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-[#ff1b5a]">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
            <span className="text-[11px] font-black text-gray-700 truncate max-w-[140px]">תוצר: {workshop.result}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-[#ff1b5a] group-hover:text-white transition-all shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default WorkshopCard;
