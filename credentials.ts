
export const CREDENTIALS = {
    SUPABASE_URL: (window as any).process?.env?.VITE_SUPABASE_URL || '',
    SUPABASE_KEY: (window as any).process?.env?.VITE_SUPABASE_KEY || ''
};

export const isSupabaseConfigured = () => {
    const hasUrl = CREDENTIALS.SUPABASE_URL && CREDENTIALS.SUPABASE_URL.startsWith('http');
    const hasKey = CREDENTIALS.SUPABASE_KEY && CREDENTIALS.SUPABASE_KEY.length > 20;
    return !!(hasUrl && hasKey);
};
