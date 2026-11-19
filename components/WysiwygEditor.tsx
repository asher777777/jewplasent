import React, { useRef, useState, useEffect } from 'react';

interface WysiwygEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
}

const WysiwygEditor: React.FC<WysiwygEditorProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'כתוב כאן את תוכן המאמר...'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showCode, setShowCode] = useState(false);
  const [htmlContent, setHtmlContent] = useState(value);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
    setHtmlContent(value || '');
  }, [value]);

  const exec = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      const newHtml = editorRef.current.innerHTML;
      setHtmlContent(newHtml);
      onChange(newHtml);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const newHtml = editorRef.current.innerHTML;
      setHtmlContent(newHtml);
      onChange(newHtml);
    }
  };

  const handleFormatBlock = (tag: string) => {
    exec('formatBlock', `<${tag}>`);
  };

  const handleAddLink = () => {
    const url = prompt('הזן כתובת קישור (URL):', 'https://');
    if (url) {
      exec('createLink', url);
    }
  };

  return (
    <div className={`border-2 border-blue-400 rounded-2xl overflow-hidden bg-white shadow-md text-right ${className}`} dir="rtl">
      {/* WYSIWYG Toolbar */}
      <div className="bg-gray-100 border-b border-gray-200 p-2 flex flex-wrap items-center gap-1.5 text-gray-700 text-sm select-none">
        <button
          type="button"
          onClick={() => handleFormatBlock('p')}
          className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-gray-300 rounded font-bold text-xs"
          title="פסקה רגילה"
        >
          פסקה
        </button>
        <button
          type="button"
          onClick={() => handleFormatBlock('h2')}
          className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-gray-300 rounded font-black text-xs text-blue-900"
          title="כותרת ראשית (H2)"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => handleFormatBlock('h3')}
          className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-gray-300 rounded font-bold text-xs text-blue-700"
          title="כותרת משנה (H3)"
        >
          H3
        </button>

        <span className="w-px h-5 bg-gray-300 mx-1"></span>

        <button
          type="button"
          onClick={() => exec('bold')}
          className="w-8 h-8 flex items-center justify-center bg-white hover:bg-blue-50 border border-gray-300 rounded font-black text-sm"
          title="מודגש (Bold)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => exec('italic')}
          className="w-8 h-8 flex items-center justify-center bg-white hover:bg-blue-50 border border-gray-300 rounded italic font-serif text-sm"
          title="נטוי (Italic)"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => exec('underline')}
          className="w-8 h-8 flex items-center justify-center bg-white hover:bg-blue-50 border border-gray-300 rounded underline text-sm"
          title="קו תחתון"
        >
          U
        </button>

        <span className="w-px h-5 bg-gray-300 mx-1"></span>

        <button
          type="button"
          onClick={() => exec('insertUnorderedList')}
          className="px-2 py-1 bg-white hover:bg-blue-50 border border-gray-300 rounded text-xs font-bold flex items-center gap-1"
          title="רשימת תבליטים"
        >
          <span>•</span> רשימה
        </button>
        <button
          type="button"
          onClick={() => exec('insertOrderedList')}
          className="px-2 py-1 bg-white hover:bg-blue-50 border border-gray-300 rounded text-xs font-bold flex items-center gap-1"
          title="רשימה ממוספרת"
        >
          <span>1.</span> מספור
        </button>

        <span className="w-px h-5 bg-gray-300 mx-1"></span>

        <button
          type="button"
          onClick={handleAddLink}
          className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-gray-300 rounded text-xs font-bold flex items-center gap-1"
          title="הוסף קישור"
        >
          🔗 קישור
        </button>
        <button
          type="button"
          onClick={() => exec('removeFormat')}
          className="px-2 py-1 bg-white hover:bg-red-50 border border-gray-300 rounded text-xs font-bold text-gray-500"
          title="נקה עיצוב"
        >
          🧹 נקה
        </button>

        <div className="flex-grow"></div>

        <button
          type="button"
          onClick={() => setShowCode(!showCode)}
          className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${showCode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
        >
          {showCode ? 'חזרה לתצוגה חזותית' : 'ערוך כ-HTML'}
        </button>
      </div>

      {/* Editor Body */}
      {showCode ? (
        <textarea
          value={htmlContent}
          onChange={(e) => {
            setHtmlContent(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full min-h-[300px] p-4 font-mono text-xs text-left bg-gray-900 text-green-400 outline-none resize-y"
          dir="ltr"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          className="w-full min-h-[300px] p-6 outline-none prose prose-blue max-w-none text-right font-medium text-gray-700 leading-relaxed cursor-text [&>h2]:text-2xl [&>h2]:font-black [&>h2]:text-blue-900 [&>h2]:mt-6 [&>h2]:mb-3 [&>h2]:border-r-4 [&>h2]:border-[#ff1b5a] [&>h2]:pr-3 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-blue-800 [&>h3]:mt-4 [&>h3]:mb-2 [&>p]:mb-3 [&>ul]:list-disc [&>ul]:mr-6 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:mr-6 [&>ol]:mb-3 [&>li]:mb-1 [&>a]:text-blue-600 [&>a]:underline"
          placeholder={placeholder}
        />
      )}
    </div>
  );
};

export default WysiwygEditor;
