import { GoogleGenAI } from "@google/genai";
import { TimeEntry } from "../types";

// Bezpečná inicializace klienta Gemini (pokud je nastaven klíč v prostředí)
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getSmartHelpResponse = async (history: ChatMessage[]): Promise<string> => {
  if (!ai) {
    return "AI asistent není momentálně nakonfigurován (chybí VITE_GEMINI_API_KEY v nastavení).";
  }

  try {
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "Jsi asistent aplikace pro evidenci docházky firmy Kabel (výroba kabelů a elektroinstalace). Odpovídej stručně, přátelsky a k věci v češtině."
      },
      contents
    });
    return response.text || "Nápověda není v tuto chvíli dostupná.";
  } catch (err: any) {
    console.warn('Gemini help error:', err);
    return "Omlouváme se, spojení s AI asistentem se nezdařilo.";
  }
};
