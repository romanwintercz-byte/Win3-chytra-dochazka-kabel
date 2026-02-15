export const CREDENTIALS = {
    // Vercel u statických webů bez buildu někdy process.env nevidí, zkusíme i alternativy
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
    return !!(CREDENTIALS.SUPABASE_URL && CREDENTIALS.SUPABASE_KEY && CREDENTIALS.SUPABASE_URL.includes('supabase.co'));
};

export const getDbDiagnostics = () => {
    return {
        urlPresent: !!CREDENTIALS.SUPABASE_URL,
        urlValid: CREDENTIALS.SUPABASE_URL?.startsWith('http'),
        keyPresent: !!CREDENTIALS.SUPABASE_KEY,
        keyLength: CREDENTIALS.SUPABASE_KEY?.length || 0,
        envMethod: (window as any).process?.env?.VITE_SUPABASE_URL ? 'process.env' : 'import.meta'
    };
};