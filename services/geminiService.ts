import { TimeEntry, Job, CalendarEvent } from "../types";

// Placeholder for removed AI functionality
export const isApiKeyConfigured = () => false;

export const testGeminiConnection = async () => ({ success: false, message: "AI funkce byly vypnuty." });

export const parseNaturalLanguageEntry = async (text: string, referenceDate: string, availableJobs: Job[]): Promise<Partial<TimeEntry>[]> => {
  return [];
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  return "";
};

export const analyzeTimesheet = async (entries: TimeEntry[]): Promise<string> => {
    return "AI analýza byla vypnuta.";
};

export const mapCalendarEventsToEntries = async (events: CalendarEvent[], existingProjects: string[]): Promise<Partial<TimeEntry>[]> => {
    return [];
};

export const getSmartHelpResponse = async (userQuestion: string): Promise<string> => {
    return "AI nápověda byla vypnuta.";
};