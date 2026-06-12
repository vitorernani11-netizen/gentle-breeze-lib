// Unified storage manager — Offline-First Sync
// Lê/escreve sempre no localStorage (instantâneo, offline OK)
// Em background sincroniza com Supabase via syncEngine
import { toast } from 'sonner';
import { isValid, parseISO } from 'date-fns';
import { syncRecord } from '@/lib/syncEngine';

const STORAGE_KEY = 'hardware_humano_data';

// In-memory cache
let memoryData: any = null;
let isDirty = false;

// ─── Validação de data ────────────────────────────────────────────────────────
export const isValidDate = (dateStr: any): boolean => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  try {
    const date = parseISO(dateStr);
    return isValid(date);
  } catch (e) {
    return false;
  }
};

export const validateCollectionDates = (collection: string, items: any[], dateFields: string[]): any[] => {
  if (!Array.isArray(items)) return [];
  return items.filter((item, index) => {
    for (const field of dateFields) {
      if (item[field] && !isValidDate(item[field])) {
        console.warn(`[Storage:Validacao] Registro #${index} em '${collection}' ignorado — data inválida em '${field}':`, item[field]);
        return false;
      }
    }
    return true;
  });
};

// ─── Read ─────────────────────────────────────────────────────────────────────
export const getStorageData = () => {
  if (typeof window === 'undefined') return {};
  if (memoryData !== null) return memoryData;

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) { memoryData = {}; return memoryData; }
    try {
      memoryData = JSON.parse(data);
      return memoryData;
    } catch (parseError) {
      console.error('[Storage] Dados corrompidos — resetando.', parseError);
      memoryData = {};
      return memoryData;
    }
  } catch (e) {
    console.error('[Storage] Erro de acesso ao localStorage:', e);
    toast.error('O navegador impediu o acesso ao armazenamento local.');
    return {};
  }
};

// ─── Write (memória apenas, sem persistir ainda) ──────────────────────────────
export const setStorageData = (data: any) => {
  memoryData = data;
  isDirty = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage_update'));
    window.dispatchEvent(new Event('storage'));
  }
};

// ─── Persist to localStorage ──────────────────────────────────────────────────
export const persistToHardware = () => {
  if (typeof window === 'undefined' || memoryData === null) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryData));
    isDirty = false;
    console.log('[Storage] Dados gravados no localStorage.');
    toast.success('Alterações salvas no hardware.');
    window.dispatchEvent(new Event('storage'));
  } catch (e: any) {
    console.error('[Storage] Erro ao gravar:', e);
    if (e.name === 'QuotaExceededError') {
      toast.error('Armazenamento lotado! Limpe registros antigos.');
    } else {
      toast.error('Erro de gravação. Verifique permissões do navegador.');
    }
  }
};

export const hasUnsavedChanges = () => isDirty;

// ─── Coleções unificadas ──────────────────────────────────────────────────────
export const getLocalCollection = (collection: string) => {
  try {
    const data = getStorageData();
    return Array.isArray(data[collection]) ? data[collection] : [];
  } catch (e) {
    console.error(`[Storage] Erro ao carregar '${collection}':`, e);
    return [];
  }
};

export const saveLocalCollection = (collection: string, data: any[]) => {
  try {
    const current = { ...getStorageData() };
    current[collection] = data;
    setStorageData(current);
  } catch (e) {
    console.error(`[Storage] Erro ao salvar '${collection}':`, e);
  }
};

// ─── Helpers de compatibilidade ───────────────────────────────────────────────

/**
 * Salva dados no localStorage E agenda sync para a nuvem.
 * Identifica automaticamente qual coleção está sendo atualizada
 * e dispara syncRecord para cada item novo/modificado.
 */
export const saveToLocal = (key: string, data: any) => {
  // 1. Salva local primeiro (instantâneo)
  if (key.startsWith('hardware_humano_')) {
    const collection = key.replace('hardware_humano_', '');

    // Persiste diretamente no localStorage para cada coleção separada
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`[Storage] Erro ao persistir '${key}':`, e);
    }

    // Também salva no objeto unificado em memória
    saveLocalCollection(collection, data);

    // 2. Dispara sync em background para cada item do array
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item?.id) {
          syncRecord(collection, 'upsert', item);
        }
      }
    }
  } else if (key === STORAGE_KEY) {
    setStorageData(data);
  } else {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
    const current = { ...getStorageData() };
    current[key] = data;
    setStorageData(current);
  }
};

export const loadFromLocal = (key: string): any => {
  // Tenta primeiro no localStorage direto (mais atualizado após pullFromCloud)
  if (key.startsWith('hardware_humano_')) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    // Fallback para o objeto unificado em memória
    const collection = key.replace('hardware_humano_', '');
    const data = getStorageData();
    return Array.isArray(data[collection]) ? data[collection] : [];
  }

  if (key === STORAGE_KEY) return getStorageData();

  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  const data = getStorageData();
  return data[key] || null;
};
