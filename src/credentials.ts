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
const DIRECT_URL = "";
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

export const getKabelCredentials = () => {
  const customUrl = getStorageItem('kabel_supabase_url');
  const customKey = getStorageItem('kabel_supabase_key');

  const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
                 (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL : '') ||
                 (typeof window !== 'undefined' ? (window as any).VITE_SUPABASE_URL : '') || '';

  const envKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_KEY) ||
                 (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_KEY || process.env?.SUPABASE_KEY : '') ||
                 (typeof window !== 'undefined' ? (window as any).VITE_SUPABASE_KEY : '') || '';

  const url = customUrl || DIRECT_URL || envUrl;
  const key = customKey || DIRECT_KEY || envKey;

  return { url: url.trim(), key: key.trim() };
};

export const saveCustomCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('kabel_supabase_url', url.trim());
    localStorage.setItem('kabel_supabase_key', key.trim());
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
