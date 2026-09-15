
import { GoogleGenAI, Type } from "@google/genai";
import { TimeEntry, Job } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSmartHelpResponse = async (userQuestion: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Uživatel aplikace pro docházku se ptá: "${userQuestion}". Odpověz stručně a věcně v češtině jako nápověda.`,
    });
    return response.text || "Omlouvám se, nápověda není momentálně dostupná.";
};

export const analyzeTimesheet = async (entries: TimeEntry[]): Promise<string> => {
    const summary = entries.map(e => `${e.date}: ${e.project} - ${e.hours}h (${e.type})`).join("\n");
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Jsi zkušený manažer stavební firmy. Zkontroluj tento měsíční výkaz práce a napiš krátké shrnutí v češtině (max 3 věty) o efektivitě nebo chybách: \n${summary}`,
    });
    return response.text || "Nepodařilo se vygenerovat analýzu.";
};
