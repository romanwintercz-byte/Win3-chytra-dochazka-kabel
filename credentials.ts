
export const CREDENTIALS = {
    // Vercel a Vite mají různé způsoby předávání proměnných. Zkusíme všechny.
    SUPABASE_URL: 
        (window as any).process?.env?.VITE_SUPABASE_URL || 
        (import.meta as any).env?.VITE_SUPABASE_URL || 
        '',
    SUPABASE_KEY: 
        (window as any).process?.env?.VITE_SUPABASE_KEY || 
        (import.meta as any).env?.VITE_SUPABASE_KEY || 
        ''
};

export const isSupabaseConfigured = () => {
    const hasUrl = CREDENTIALS.SUPABASE_URL && CREDENTIALS.SUPABASE_URL.startsWith('http');
    const hasKey = CREDENTIALS.SUPABASE_KEY && CREDENTIALS.SUPABASE_KEY.length > 20;
    return !!(hasUrl && hasKey);
};

export const getDbDiagnostics = () => {
    return {
        hasUrl: !!CREDENTIALS.SUPABASE_URL,
        urlPrefix: CREDENTIALS.SUPABASE_URL ? CREDENTIALS.SUPABASE_URL.substring(0, 10) + '...' : 'none',
        hasKey: !!CREDENTIALS.SUPABASE_KEY,
        keyLength: CREDENTIALS.SUPABASE_KEY ? CREDENTIALS.SUPABASE_KEY.length : 0
    };
};
