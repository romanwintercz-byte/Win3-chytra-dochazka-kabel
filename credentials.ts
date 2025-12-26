
export const CREDENTIALS = {
    IS_DEMO_MODE: false,
    // Preferujeme process.env, který je v tomto prostředí standardem pro injektované klíče
    SUPABASE_URL: process.env.VITE_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL || '',
    SUPABASE_KEY: process.env.VITE_SUPABASE_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY || ''
};
