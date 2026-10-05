import { ResponsibilityRole, DEFAULT_RESPONSIBILITY_ROLES } from '../types';

const ROLES_STORAGE_KEY = 'kabel_responsibility_roles_v1';

export const getStoredRoles = (): ResponsibilityRole[] => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_RESPONSIBILITY_ROLES;
  }
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(DEFAULT_RESPONSIBILITY_ROLES));
      return DEFAULT_RESPONSIBILITY_ROLES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_RESPONSIBILITY_ROLES;
  } catch {
    return DEFAULT_RESPONSIBILITY_ROLES;
  }
};

export const saveStoredRoles = (roles: ResponsibilityRole[]): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
  } catch {}
};
