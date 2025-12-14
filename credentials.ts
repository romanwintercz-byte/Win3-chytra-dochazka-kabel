
// ZDE VLOŽTE SVÉ KLÍČE
// DŮLEŽITÉ: Hodnoty musí být vždy v jednoduchých uvozovkách ' '

// Helper to safely get string from env and STRIP ACCIDENTAL QUOTES
const getEnv = (key: string, fallback: string) => {
    let val = (import.meta as any).env?.[key];
    if (typeof val === 'string') {
        val = val.trim();
        // Remove quotes if they are part of the string (e.g. from bad env config)
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        return val;
    }
    return fallback;
};

// Default Placeholder URL used in the project
const DEFAULT_PLACEHOLDER_URL = 'https://afjsymtiupvcfccsrodi.supabase.co';

// Detection of placeholders
const supabaseUrl = getEnv('VITE_SUPABASE_URL', DEFAULT_PLACEHOLDER_URL);
const supabaseKey = getEnv('VITE_SUPABASE_KEY', 'ZDE_VLOZTE_SUPABASE_ANON_KEY');

export const CREDENTIALS = {
    // PŘEPÍNAČ DEMO REŽIMU - NATVRDO ZAPNUTO PRO ODSTRANĚNÍ BLOKACE
    // Tímto zajistíme, že aplikace nebude nikdy vyžadovat klíče
    IS_DEMO_MODE: true,

    // 1. Supabase URL
    SUPABASE_URL: supabaseUrl,

    // 2. Supabase Anon/Public Key
    SUPABASE_KEY: supabaseKey,

    // 3. Gemini API Key
    GEMINI_API_KEY: getEnv('VITE_API_KEY', 'ZDE_VLOZTE_GEMINI_API_KEY')
};
