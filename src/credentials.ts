/**
 * KONFIGURACE PŘIPOJENÍ SUPABASE PRO FIRMU KABEL
 * 
 * Všechny původní vazby na projekt K+P byly odstraněny.
 * Nové připojení pro firmu Kabel lze nastavit:
 * 1) Přímo v aplikaci v sekci "Nastavení -> Supabase pro firmu Kabel" (uloží se do prohlížeče)
 * 2) Pomocí proměnných prostředí VITE_SUPABASE_URL a VITE_SUPABASE_KEY
 * 3) Vyplněním DIRECT_URL a DIRECT_KEY níže
 */

// Zde můžete zadat přímé URL a klíč pro nový projekt Kabel (nebo nechat prázdné pro konfiguraci z UI)
const DIRECT_URL = "https://syemokaizvliszurgskw.supabase.co";
const DIRECT_KEY = "";

const getStorageItem = (key: string): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return localStorage.getItem(key) || '';
    } catch {
      return '';
    }
  }
  return '';
};

export const normalizeSupabaseUrl = (raw: string): string => {
  if (!raw) return '';
  let cleaned = raw.trim().replace(/^["']|["']$/g, '');

  // 1. Pokud uživatel vložil URL z adresního řádku administrace Supabase:
  // např. https://supabase.com/dashboard/project/abcdefghijklmn/...
  const dashboardMatch = cleaned.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // 2. Pokud obsahuje .supabase.co kdekoli v řetězci (např. https://xyz.supabase.co/rest/v1 nebo db.xyz.supabase.co):
  const supabaseCoMatch = cleaned.match(/(?:https?:\/\/)?(?:db\.)?([a-z0-9_-]+)\.supabase\.co/i);
  if (supabaseCoMatch && supabaseCoMatch[1]) {
    const ref = supabaseCoMatch[1];
    // Vyfiltrovat obecné subdomény, pokud by náhodou někdo zadal www/api
    if (ref !== 'api' && ref !== 'app' && ref !== 'www') {
      return `https://${ref}.supabase.co`;
    }
  }

  // 3. Pokud vložil pouze project reference ID (15 až 35 alfanumerických znaků)
  if (/^[a-z0-9_-]{15,35}$/i.test(cleaned)) {
    return `https://${cleaned}.supabase.co`;
  }

  // 4. Pokud je to jiná URL, odstranit /rest/v1, /auth/v1, /storage/v1 a koncová lomítka
  cleaned = cleaned
    .replace(/\/rest\/v1\/?.*$/i, '')
    .replace(/\/auth\/v1\/?.*$/i, '')
    .replace(/\/storage\/v1\/?.*$/i, '')
    .replace(/\/+$/, '');

  // 5. Pokud chybí http/https protokol
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://') && cleaned.length > 5) {
    cleaned = `https://${cleaned}`;
  }

  return cleaned;
};

export const normalizeSupabaseKey = (raw: string): string => {
  if (!raw) return '';
  return raw.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
};

export const getKabelCredentials = () => {
  const customUrl = getStorageItem('kabel_supabase_url');
  const customKey = getStorageItem('kabel_supabase_key');

  const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
                 (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL : '') ||
                 (typeof window !== 'undefined' ? (window as any).VITE_SUPABASE_URL : '') || '';

  const envKey = (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY)) ||
                 (typeof process !== 'undefined' ? (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_KEY || process.env?.SUPABASE_KEY) : '') ||
                 (typeof window !== 'undefined' ? ((window as any).VITE_SUPABASE_ANON_KEY || (window as any).VITE_SUPABASE_KEY) : '') || '';

  const rawUrl = customUrl || DIRECT_URL || envUrl;
  const rawKey = customKey || DIRECT_KEY || envKey;

  const url = normalizeSupabaseUrl(rawUrl);
  const key = normalizeSupabaseKey(rawKey);

  // Auto-heal: Pokud bylo v localStorage uloženo URL se špatnou cestou (např. s /rest/v1), automaticky ho opravíme
  if (customUrl && url && customUrl !== url && typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('kabel_supabase_url', url);
    } catch {}
  }
  if (customKey && key && customKey !== key && typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('kabel_supabase_key', key);
    } catch {}
  }

  return { url, key };
};

export const saveCustomCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('kabel_supabase_url', normalizeSupabaseUrl(url));
    localStorage.setItem('kabel_supabase_key', normalizeSupabaseKey(key));
  }
};

export const clearCustomCredentials = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('kabel_supabase_url');
    localStorage.removeItem('kabel_supabase_key');
  }
};

export const getConfigurationStatus = () => {
  const { url, key } = getKabelCredentials();
  
  const hasUrl = !!url && url.startsWith('http');
  const hasKey = !!key && key.length > 20;
  
  if (!hasUrl && !hasKey) {
    return { 
      isOk: false, 
      msg: "Není nakonfigurováno Supabase pro firmu Kabel (aplikace běží v lokálním / demo režimu)" 
    };
  }
  if (!hasUrl) return { isOk: false, msg: "Chybí URL adresa Supabase pro firmu Kabel" };
  if (!hasKey) return { isOk: false, msg: "Chybí API klíč Supabase pro firmu Kabel" };
  
  return { isOk: true, msg: "Nové Supabase pro firmu Kabel je nakonfigurováno" };
};

export const isSupabaseConfigured = () => getConfigurationStatus().isOk;
