
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractWorkshopFromImage = async (base64Image: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: "Analyze this Hebrew PDF/Image page and extract workshop details. Format the output as JSON matching the workshop schema."
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
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
        required: ["title", "category", "description"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};
