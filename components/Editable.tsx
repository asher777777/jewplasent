
import React, { useState } from 'react';
import { useAdmin } from '../contexts/AdminContext.tsx';
import { storage } from '../firebase.ts';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

interface EditableProps {
  id: string;
  type?: 'text' | 'textarea' | 'image';
  children: string;
  className?: string;
  tag?: React.ElementType;
}

const Editable: React.FC<EditableProps> = ({ id, type = 'text', children, className = '', tag: Tag = 'span' }) => {
  const { isEditMode, updateContent, getContent } = useAdmin();
  const [isUploading, setIsUploading] = useState(false);
  const value = getContent(id, children);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `site-content/${id}_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      updateContent(id, downloadURL);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("העלאת התמונה נכשלה. נסה שוב.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isEditMode) {
    if (type === 'image') {
      return <img src={value} className={className} alt="" />;
    }
    return <Tag className={className}>{value}</Tag>;
  }

  // Edit Mode Rendering
  if (type === 'image') {
    return (
      <div className={`relative group/img-edit ${className}`}>
        <img src={value} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover/img-edit:opacity-100 transition-all flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
              <span className="text-white text-xs font-black">מעלה...</span>
            </div>
          ) : (
            <>
              <label className="cursor-pointer bg-white text-blue-900 px-4 py-2 rounded-full font-black shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                החלף תמונה
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
              <span className="text-white text-[10px] font-bold opacity-80 uppercase tracking-widest">{id}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateContent(id, e.target.value);
  };

  return (
    <div className={`relative group/edit ${className}`}>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={handleChange}
          className="w-full bg-blue-50 border-2 border-blue-400 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-pink-400 text-inherit font-inherit resize-y text-right"
          rows={4}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={handleChange}
          className="w-full bg-blue-50 border-b-2 border-blue-400 focus:outline-none focus:border-pink-400 text-inherit font-inherit text-right"
        />
      )}
      <div className="absolute -top-6 -right-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover/edit:opacity-100 pointer-events-none z-10 font-bold">
        ערוך: {id}
      </div>
    </div>
  );
};

export default Editable;
