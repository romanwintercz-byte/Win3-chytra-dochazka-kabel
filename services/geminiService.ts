import { GoogleGenAI, Type } from "@google/genai";
import { TimeEntry, Job, CalendarEvent, WorkType } from "../types";

// Lazy inicializace - nevolat new hned při importu, aby Safari nespadlo
let _ai: any = null;
const getAI = () => {
    if (!_ai) {
        const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;
        if (!apiKey) return null;
        _ai = new GoogleGenAI({ apiKey });
    }
    return _ai;
};

export const isApiKeyConfigured = () => {
    return !!(process.env.API_KEY || (window as any).process?.env?.API_KEY);
};

export const parseNaturalLanguageEntry = async (text: string, referenceDate: string, availableJobs: Job[]): Promise<Partial<TimeEntry>[]> => {
    const ai = getAI();
    if (!ai) throw new Error("API klíč není k dispozici.");
    
    const jobList = availableJobs.map(j => `${j.name} (${j.code})`).join(", ");
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Reference date: ${referenceDate}. Available projects: ${jobList}. 
                  Parse this worker's report into JSON: "${text}". 
                  Output must be an array of objects with fields: project, description, hours, type (use enum values like 'Běžná práce', 'Přesčas' etc).`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        project: { type: Type.STRING },
                        description: { type: Type.STRING },
                        hours: { type: Type.NUMBER },
                        type: { type: Type.STRING }
                    },
                    required: ["project", "hours", "type"]
                }
            }
        }
    });
    return JSON.parse(response.text || "[]");
};

export const analyzeTimesheet = async (entries: TimeEntry[]): Promise<string> => {
    const ai = getAI();
    if (!ai) return "AI analýza není dostupná.";
    
    const summary = entries.map(e => `${e.date}: ${e.project} - ${e.hours}h (${e.type})`).join("\n");
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Jsi zkušený manažer stavební firmy. Zkontroluj tento měsíční výkaz práce a napiš krátké shrnutí (max 3 věty) o efektivitě, přesčasech nebo chybách: \n${summary}`,
    });
    return response.text || "Nepodařilo se vygenerovat analýzu.";
};

export const mapCalendarEventsToEntries = async (events: CalendarEvent[], existingProjects: string[]): Promise<Partial<TimeEntry>[]> => {
    const ai = getAI();
    if (!ai) return [];
    
    const eventSummary = events.map(e => `${e.title} (${e.start} - ${e.end})`).join("\n");
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Map these calendar events to work entries. Known projects: ${existingProjects.join(", ")}. 
                  Events: \n${eventSummary} 
                  Return JSON array with date, project, description, hours, type.`,
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        date: { type: Type.STRING },
                        project: { type: Type.STRING },
                        description: { type: Type.STRING },
                        hours: { type: Type.NUMBER },
                        type: { type: Type.STRING }
                    },
                    required: ["date", "project", "hours", "type"]
                }
            }
        }
    });
    return JSON.parse(response.text || "[]");
};

export const getSmartHelpResponse = async (userQuestion: string): Promise<string> => {
    const ai = getAI();
    if (!ai) return "Nápověda není dostupná.";
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Uživatel aplikace pro docházku se ptá: "${userQuestion}". Odpověz stručně a věcně v češtině jako nápověda.`,
    });
    return response.text || "Omlouvám se, nápověda není momentálně dostupná.";
};