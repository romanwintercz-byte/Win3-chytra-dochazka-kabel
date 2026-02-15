
/**
 * KONFIGURACE PŘIPOJENÍ
 * Pokud používáte prostředí, které nepodporuje proměnné prostředí (env variables),
 * můžete URL a KEY vložit přímo do uvozovek níže.
 */

const DIRECT_URL = ""; 
const DIRECT_KEY = "";

export const CREDENTIALS = {
    SUPABASE_URL: DIRECT_URL || 
                 (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL : '') || 
                 (window as any).process?.env?.VITE_SUPABASE_URL || 
                 (window as any).VITE_SUPABASE_URL || 
                 '',
    SUPABASE_KEY: DIRECT_KEY || 
                 (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_KEY || process.env?.SUPABASE_KEY : '') || 
                 (window as any).process?.env?.VITE_SUPABASE_KEY || 
                 (window as any).VITE_SUPABASE_KEY || 
                 ''
};

export const getConfigurationStatus = () => {
    const url = CREDENTIALS.SUPABASE_URL;
    const key = CREDENTIALS.SUPABASE_KEY;
    
    const hasUrl = !!url && url.startsWith('http');
    const hasKey = !!key && key.length > 20;
    
    if (!hasUrl && !hasKey) return { isOk: false, msg: "Aplikace nevidí URL ani KEY" };
    if (!hasUrl) return { isOk: false, msg: "Chybí URL adresa databáze" };
    if (!hasKey) return { isOk: false, msg: "Chybí API klíč" };
    
    return { isOk: true, msg: "Konfigurace načtena" };
};

export const isSupabaseConfigured = () => getConfigurationStatus().isOk;
