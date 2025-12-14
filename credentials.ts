
// ZDE VLOŽTE SVÉ KLÍČE
// DŮLEŽITÉ: Hodnoty musí být vždy v jednoduchých uvozovkách ' '

// Tato úprava se nejprve podívá, zda nejsou klíče nastavené na serveru (Vercel) s prefixem VITE_
// Pokud ne, použije hodnoty zadané níže.

export const CREDENTIALS = {
    // PŘEPÍNAČ DEMO REŽIMU
    // Nyní to funguje chytře:
    // 1. Pokud ve Vercelu nastavíš proměnnou VITE_IS_DEMO_MODE na "true", zapne se demo.
    // 2. Pokud ne, použije se hodnota za || (zde false = ostrá verze).
    IS_DEMO_MODE: (import.meta as any).env?.VITE_IS_DEMO_MODE === 'true' || false,

    // 1. Supabase URL
    SUPABASE_URL: (import.meta as any).env?.VITE_SUPABASE_URL || 'https://afjsymtiupvcfccsrodi.supabase.co',

    // 2. Supabase Anon/Public Key
    SUPABASE_KEY: (import.meta as any).env?.VITE_SUPABASE_KEY || 'ZDE_VLOZTE_SUPABASE_ANON_KEY',

    // 3. Gemini API Key
    GEMINI_API_KEY: (import.meta as any).env?.VITE_API_KEY || 'ZDE_VLOZTE_GEMINI_API_KEY'
};
