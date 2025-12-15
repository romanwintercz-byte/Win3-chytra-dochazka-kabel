
// POUZE PRODUKČNÍ REŽIM
// Žádné přepínače, žádné demo.
// Aplikace spadne, pokud nejsou nastaveny ENV proměnné, což je v pořádku, protože chceme vědět, že to jede naostro.

const getEnv = (key: string) => {
    let val = (import.meta as any).env?.[key];
    if (typeof val === 'string') {
        val = val.trim();
        // Ošetření uvozovek, pokud by se tam omylem dostaly
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        return val;
    }
    return '';
};

export const CREDENTIALS = {
    // VŽDY FALSE - Vypínáme jakoukoliv logiku dema
    IS_DEMO_MODE: false,

    // Supabase Credentials
    SUPABASE_URL: getEnv('VITE_SUPABASE_URL'),
    SUPABASE_KEY: getEnv('VITE_SUPABASE_KEY'),

    // Gemini API Key
    GEMINI_API_KEY: getEnv('VITE_API_KEY')
};
