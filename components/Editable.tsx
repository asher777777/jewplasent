import React, { useState, useEffect } from 'react';
import { useAdmin } from '../contexts/AdminContext.tsx';
import { storage } from '../firebase.ts';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

interface EditableProps {
  id: string;
  type?: 'text' | 'textarea' | 'image';
  children: string;
  className?: string;
  tag?: React.ElementType;
  onSave?: (value: string) => Promise<void> | void;
  allowHtml?: boolean;
}

const Editable: React.FC<EditableProps> = ({
  id,
  type = 'text',
  children,
  className = '',
  tag: Tag = 'span',
  onSave,
  allowHtml = false
}) => {
  const { isEditMode, updateContent, getContent } = useAdmin();
  const [isUploading, setIsUploading] = useState(false);
  const cloudValue = onSave ? children : getContent(id, children);
  const [localValue, setLocalValue] = useState(cloudValue);

  useEffect(() => {
    setLocalValue(cloudValue);
  }, [cloudValue]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `site-content/${id}_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      if (onSave) {
        await onSave(downloadURL);
      } else {
        await updateContent(id, downloadURL);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("העלאת התמונה נכשלה. נסה שוב.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBlur = async () => {
    if (localValue !== cloudValue) {
      if (onSave) {
        await onSave(localValue);
      } else {
        await updateContent(id, localValue);
      }
    }
  };

  if (!isEditMode) {
    if (type === 'image') {
      return <img id={id} src={cloudValue} className={className} alt="" />;
    }
    const hasHtmlTags = typeof cloudValue === 'string' && (cloudValue.includes('<p>') || cloudValue.includes('<h2>') || cloudValue.includes('<h3>') || cloudValue.includes('<ul>'));
    if (allowHtml || hasHtmlTags) {
      return (
        <div 
          id={id}
          className={className} 
          dangerouslySetInnerHTML={{ __html: cloudValue }} 
        />
      );
    }
    return <Tag id={id} className={className}>{cloudValue}</Tag>;
  }

  // Edit Mode Rendering
  if (type === 'image') {
    return (
      <div id={id} className={`relative group/img-edit ${className}`}>
        <img src={cloudValue} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover/img-edit:opacity-100 transition-all flex flex-col items-center justify-center gap-2 backdrop-blur-sm z-20">
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
              <span className="text-white text-xs font-black">מעלה...</span>
            </div>
          ) : (
            <>
              <label className="cursor-pointer bg-white text-blue-900 px-4 py-2 rounded-full font-black shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
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

  return (
    <div className={`relative group/edit ${className}`}>
      {type === 'textarea' ? (
        <textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          className="w-full bg-blue-50 border-2 border-blue-400 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-pink-400 text-inherit font-inherit resize-y text-right"
          rows={6}
        />
      ) : (
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          className="w-full bg-blue-50 border-b-2 border-blue-400 focus:outline-none focus:border-pink-400 text-inherit font-inherit text-right px-2 py-1"
        />
      )}
      <div className="absolute -top-6 -right-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover/edit:opacity-100 pointer-events-none z-30 font-bold">
        ערוך: {id}
      </div>
    </div>
  );
};

export default Editable;
