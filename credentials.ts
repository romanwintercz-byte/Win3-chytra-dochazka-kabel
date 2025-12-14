
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

// Helper pro detekci URL parametru ?demo=true
const isUrlDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';

const envDemoVal = (import.meta as any).env?.VITE_IS_DEMO_MODE;
const isEnvDemo = envDemoVal === 'true' || envDemoVal === '1' || envDemoVal === true;

// Default Placeholder URL used in the project
const DEFAULT_PLACEHOLDER_URL = 'https://afjsymtiupvcfccsrodi.supabase.co';

// Detection of placeholders
const supabaseUrl = getEnv('VITE_SUPABASE_URL', DEFAULT_PLACEHOLDER_URL);
const supabaseKey = getEnv('VITE_SUPABASE_KEY', 'ZDE_VLOZTE_SUPABASE_ANON_KEY');

// Ensure placeholders trigger missing keys logic
// FIX: Explicitly check for the default placeholder URL to auto-enable demo mode
const isMissingKeys = 
    !supabaseUrl || 
    supabaseUrl.includes('ZDE_VLOZTE') || 
    supabaseUrl === DEFAULT_PLACEHOLDER_URL || // Check for the dummy URL
    !supabaseKey || 
    supabaseKey.includes('ZDE_VLOZTE') || 
    supabaseUrl === 'undefined';

export const CREDENTIALS = {
    // PŘEPÍNAČ DEMO REŽIMU
    // Pokud chybí klíče, vynutíme Demo režim automaticky.
    IS_DEMO_MODE: isEnvDemo || isUrlDemo || isMissingKeys || false,

    // 1. Supabase URL
    SUPABASE_URL: supabaseUrl,

    // 2. Supabase Anon/Public Key
    SUPABASE_KEY: supabaseKey,

    // 3. Gemini API Key
    GEMINI_API_KEY: getEnv('VITE_API_KEY', 'ZDE_VLOZTE_GEMINI_API_KEY')
};
