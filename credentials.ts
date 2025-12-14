
// ZDE VLOŽTE SVÉ KLÍČE
// DŮLEŽITÉ: Hodnoty musí být vždy v jednoduchých uvozovkách ' '

// Helper to safely get string from env
const getEnv = (key: string, fallback: string) => {
    const val = (import.meta as any).env?.[key];
    return typeof val === 'string' ? val.trim() : fallback;
};

// Helper pro detekci URL parametru ?demo=true
const isUrlDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';

const envDemoVal = (import.meta as any).env?.VITE_IS_DEMO_MODE;
const isEnvDemo = envDemoVal === 'true' || envDemoVal === '1' || envDemoVal === true;

// Detection of placeholders
const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://afjsymtiupvcfccsrodi.supabase.co');
const supabaseKey = getEnv('VITE_SUPABASE_KEY', 'ZDE_VLOZTE_SUPABASE_ANON_KEY');

// Ensure placeholders trigger missing keys logic
const isMissingKeys = !supabaseUrl || supabaseUrl.includes('ZDE_VLOZTE') || !supabaseKey || supabaseKey.includes('ZDE_VLOZTE') || supabaseUrl === 'undefined';

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
