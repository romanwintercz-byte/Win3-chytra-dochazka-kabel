
// ZDE VLOŽTE SVÉ KLÍČE
// DŮLEŽITÉ: Hodnoty musí být vždy v jednoduchých uvozovkách ' '

// Tato úprava se nejprve podívá, zda nejsou klíče nastavené na serveru (Vercel) s prefixem VITE_
// Pokud ne, použije hodnoty zadané níže.

// Helper pro detekci URL parametru ?demo=true
const isUrlDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';

const envDemoVal = (import.meta as any).env?.VITE_IS_DEMO_MODE;
// Accept 'true', '1', true
const isEnvDemo = envDemoVal === 'true' || envDemoVal === '1' || envDemoVal === true;

export const CREDENTIALS = {
    // PŘEPÍNAČ DEMO REŽIMU
    // Nyní to funguje chytře:
    // 1. Env proměnná VITE_IS_DEMO_MODE (Vercel)
    // 2. URL parametr ?demo=true (Záchrana)
    // 3. Ruční hodnota (Fallback)
    IS_DEMO_MODE: isEnvDemo || isUrlDemo || false,

    // 1. Supabase URL
    SUPABASE_URL: (import.meta as any).env?.VITE_SUPABASE_URL || 'https://afjsymtiupvcfccsrodi.supabase.co',

    // 2. Supabase Anon/Public Key
    SUPABASE_KEY: (import.meta as any).env?.VITE_SUPABASE_KEY || 'ZDE_VLOZTE_SUPABASE_ANON_KEY',

    // 3. Gemini API Key
    GEMINI_API_KEY: (import.meta as any).env?.VITE_API_KEY || 'ZDE_VLOZTE_GEMINI_API_KEY'
};
