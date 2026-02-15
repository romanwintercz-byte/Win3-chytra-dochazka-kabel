
export const CREDENTIALS = {
    // Zkusíme několik způsobů, jak se k proměnným dostat
    SUPABASE_URL: (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') || (window as any).process?.env?.VITE_SUPABASE_URL || '',
    SUPABASE_KEY: (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_KEY : '') || (window as any).process?.env?.VITE_SUPABASE_KEY || ''
};

export const getConfigurationStatus = () => {
    const hasUrl = !!CREDENTIALS.SUPABASE_URL && CREDENTIALS.SUPABASE_URL.startsWith('http');
    const hasKey = !!CREDENTIALS.SUPABASE_KEY && CREDENTIALS.SUPABASE_KEY.length > 20;
    
    if (!hasUrl && !hasKey) return { isOk: false, msg: "Chybí URL i KEY" };
    if (!hasUrl) return { isOk: false, msg: "Chybí VITE_SUPABASE_URL" };
    if (!hasKey) return { isOk: false, msg: "Chybí VITE_SUPABASE_KEY" };
    
    return { isOk: true, msg: "Konfigurace nalezena" };
};

export const isSupabaseConfigured = () => getConfigurationStatus().isOk;
