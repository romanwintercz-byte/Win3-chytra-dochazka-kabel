import { GoogleGenAI } from "@google/genai";
import { TimeEntry } from "../types";

// Bezpečná inicializace klienta Gemini (pokud je nastaven klíč v prostředí)
const apiKey = (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY || process.env?.API_KEY : '') || '';

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getSmartHelpResponse = async (userQuestion: string): Promise<string> => {
  if (!ai) {
    return "AI asistent není momentálně nakonfigurován (chybí GEMINI_API_KEY). Pro docházku použijte standardní formulář nebo rychlé akce.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Jsi asistent aplikace pro evidenci docházky firmy Kabel (výroba kabelů a elektroinstalace). Uživatel se ptá: "${userQuestion}". Odpověz stručně, přátelsky a k věci v češtině.`,
    });
    return response.text || "Nápověda není v tuto chvíli dostupná.";
  } catch (err: any) {
    console.warn('Gemini help error:', err);
    return "Omlouváme se, spojení s AI asistentem se nezdařilo.";
  }
};

export const analyzeTimesheet = async (entries: TimeEntry[]): Promise<string> => {
  if (!ai) {
    return "Analýza výkazu pomocí AI vyžaduje nastavený klíč GEMINI_API_KEY.";
  }

  try {
    const summary = entries.map(e => `${e.date}: ${e.project || 'Bez projektu'} - ${e.hours}h (${e.type})`).join("\n");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Jsi vedoucí výroby ve firmě Kabel. Zkontroluj tento měsíční výkaz práce a napiš krátké manažerské zhodnocení v češtině (max 3 věty) o efektivitě, přesčasech a kontinuitě směn: \n${summary}`,
    });
    return response.text || "Analýzu se nepodařilo vygenerovat.";
  } catch (err: any) {
    console.warn('Gemini analyze error:', err);
    return "Analýza docházky není momentálně dostupná.";
  }
};
