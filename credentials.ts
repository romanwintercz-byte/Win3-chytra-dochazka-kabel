
export const CREDENTIALS = {
    // Pokud jsou tyto klíče prázdné, aplikace nabídne Demo režim
    SUPABASE_URL: (import.meta as any).env?.VITE_SUPABASE_URL || (window as any).process?.env?.VITE_SUPABASE_URL || '',
    SUPABASE_KEY: (import.meta as any).env?.VITE_SUPABASE_KEY || (window as any).process?.env?.VITE_SUPABASE_KEY || ''
};

export const isSupabaseConfigured = () => {
    return CREDENTIALS.SUPABASE_URL.length > 0 && CREDENTIALS.SUPABASE_KEY.length > 0;
};
