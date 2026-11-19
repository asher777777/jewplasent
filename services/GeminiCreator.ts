import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = (): string => {
  const envKey = 
    (typeof process !== 'undefined' && (process.env?.API_KEY || (process.env as any)?.GEMINI_API_KEY)) ||
    (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY));
  return envKey || '';
};

export interface AdditionalAiContext {
  title?: string;
  description?: string;
}

export const extractWorkshopFromImage = async (
  base64Data: string,
  mimeType: string = 'image/jpeg',
  additionalContext?: AdditionalAiContext,
  customApiKey?: string
) => {
  const apiKey = customApiKey || getApiKey();
  if (!apiKey) {
    throw new Error("מפתח API של Gemini חסר. אנא הגדר את GEMINI_API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });

  let promptText = "Analyze this Hebrew PDF/Image page and extract workshop details. Format the output as JSON strictly matching the workshop schema. Ensure extracted text is clean Hebrew.";
  if (additionalContext?.title) {
    promptText += ` The user specified the workshop title as: "${additionalContext.title}". Use or align with this title.`;
  }
  if (additionalContext?.description) {
    promptText += ` User provided general context/description: "${additionalContext.description}".`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      {
        text: promptText
      }
    ],
    config: {
      systemInstruction: "You are an expert bilingual OCR and data extraction system specialized in Hebrew educational and cultural workshops. Extract accurate information from the provided document/image into structured JSON matching the provided schema. Always include a concise, URL-friendly English kebab-case slug for the workshop (e.g. 'shofar-crafting', 'olive-oil-press', 'matzah-bakery').",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          slug: { type: Type.STRING, description: "A concise English kebab-case URL slug representing the workshop topic" },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
          longDescription: { type: Type.STRING },
          result: { type: Type.STRING },
          duration: { type: Type.STRING },
          audience: { type: Type.STRING },
          values: { type: Type.STRING },
          skills: { type: Type.STRING },
          staff: { type: Type.STRING }
        },
        required: ["title", "category", "description", "slug"]
      }
    }
  });

  const responseText = response.text || "{}";
  const cleanedJson = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleanedJson || "{}");
};

export const generateWorkshopDescription = async (
  title: string,
  category: string,
  currentDescription: string,
  customApiKey?: string
): Promise<string> => {
  const apiKey = customApiKey || getApiKey();
  if (!apiKey) {
    throw new Error("מפתח API חסר");
  }
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `כתוב תיאור עשיר, מרתק, חינוכי ושיווקי בעברית עבור סדנת יצירה בנושא "${title}" (קטגוריה: ${category}).
תוכן קיים או בסיסי: "${currentDescription}".
עצב את התשובה כטקסט עשיר עם פסקאות ברורות, כותרות H2/H3 אם מתאים, והדגשות Strong. החזר טקסט HTML נקי ללא מרקדאון.`
  });
  let text = response.text || '';
  return text.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
};

export interface SeoOptimizationResult {
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  aiSummary: string;
}

export const generateSeoOptimization = async (params: {
  title: string;
  pageType: string;
  contentSnippet?: string;
  currentDescription?: string;
  customApiKey?: string;
}): Promise<SeoOptimizationResult> => {
  const apiKey = (params.customApiKey || getApiKey() || '').trim();
  if (!apiKey) {
    throw new Error("מפתח API חסר. אנא הגדר מפתח Gemini בהגדרות המערכת.");
  }

  const { GoogleGenAI, Type } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  const pageContent = (params.contentSnippet || params.currentDescription || params.title || '').trim();

  const prompt = `אתה מומחה בכיר ל-SEO (Search Engine Optimization) ול-AIEO (AI Engine Optimization עבור מנועי חיפוש מבוססי AI כגון Google Search, ChatGPT, Perplexity).
המשימה שלך היא לנתח את תוכן העמוד הבא מאתר "חוויה של סדנה - ניידות חב"ד ישראל" (סדנאות יצירה ותוכן לילדים, גנים ובתי ספר, מאושר גפ"ן 19053), ולייצר מטא-דאטה מנצח בעברית:

פרטי העמוד / הסדנה:
- כותרת: "${params.title}"
- סוג העמוד: "${params.pageType}"
- תוכן העמוד בפועל מהאתר:
"""
${pageContent}
"""

הנחיות מחייבות:
1. seoTitle: כותרת תמציתית, שיווקית וקולעת בעברית (עד 60 תווים), כוללת את נושא הסדנה/עמוד.
2. metaDescription: תיאור מטא מושך וממיר בעברית (בין 130 ל-160 תווים) המבוסס ישירות על תוכן הפעילות הנ"ל.
3. keywords: רשימה של 6-8 מילות מפתח ממוקדות בעברית ובאנגלית שקשורות ישירות לסדנה זו.
4. aiSummary: תמצית עובדתית מדויקת (1-2 משפטים) המגדירה את הפעילות, החומרים וקהל היעד.

החזר אך ורק אובייקט JSON תקין.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          seoTitle: { type: Type.STRING },
          metaDescription: { type: Type.STRING },
          keywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          aiSummary: { type: Type.STRING }
        },
        required: ["seoTitle", "metaDescription", "keywords", "aiSummary"]
      }
    }
  });

  let responseText = response.text || "{}";
  responseText = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  return JSON.parse(responseText || "{}");
};
