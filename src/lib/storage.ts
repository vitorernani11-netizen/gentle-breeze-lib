// Unified storage manager for Hardware Humano
import { toast } from 'sonner';
import { isValid, parseISO } from 'date-fns';

const STORAGE_KEY = 'hardware_humano_data';

// In-memory cache to implement manual save
let memoryData: any = null;
let isDirty = false;

/**
 * Valida se uma string é uma data ISO válida.
 */
export const isValidDate = (dateStr: any): boolean => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  try {
    const date = parseISO(dateStr);
    return isValid(date);
  } catch (e) {
    return false;
  }
};

/**
 * Filtra registros com campos de data inválidos em uma coleção.
 * @param collection Nome da coleção para logs
 * @param items Array de objetos
 * @param dateFields Lista de campos que devem ser datas válidas
 */
export const validateCollectionDates = (collection: string, items: any[], dateFields: string[]): any[] => {
  if (!Array.isArray(items)) return [];
  
  return items.filter((item, index) => {
    for (const field of dateFields) {
      if (item[field] && !isValidDate(item[field])) {
        console.warn(`[Hardware:Validacao] Registro #${index} na coleção '${collection}' ignorado por data inválida no campo '${field}':`, item[field]);
        return false;
      }
    }
    return true;
  });
};

export const getStorageData = () => {
  if (typeof window === 'undefined') return {};
  
  // Return from memory if already loaded
  if (memoryData !== null) return memoryData;

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      memoryData = {};
      return memoryData;
    }
    
    try {
      memoryData = JSON.parse(data);
      return memoryData;
    } catch (parseError) {
      console.error('[Persistência:Local] Dados corrompidos no localStorage. Resetando...', parseError);
      memoryData = {};
      return memoryData;
    }
  } catch (e) {
    console.error('[Persistência:Local] Erro de acesso ao localStorage:', e);
    toast.error('O navegador impediu o acesso ao armazenamento local.');
    return {};
  }
};

export const setStorageData = (data: any) => {
  // Update memory only (Remove auto-save)
  memoryData = data;
  isDirty = true;
  
  // Notify listeners so UI updates immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage_update')); // Custom event for internal sync
    window.dispatchEvent(new Event('storage')); // Compatibility
  }
  
  console.log('[Persistência:Memória]', 'Dados atualizados em memória (não salvos)');
};

/**
 * Actually persists memory data to localStorage
 */
export const persistToHardware = () => {
  if (typeof window === 'undefined' || memoryData === null) return;
  
  try {
    const stringifiedData = JSON.stringify(memoryData);
    localStorage.setItem(STORAGE_KEY, stringifiedData);
    isDirty = false;
    console.log('[Persistência:Local]', 'Dados sincronizados com o hardware');
    toast.success('Alterações salvas no hardware.');
    
    // Also update external keys for compatibility if they were modified in memory
    // (This part is tricky because memoryData is a unified object)
  } catch (e: any) {
    console.error('[Persistência:Local] Erro ao salvar dados:', e);
    if (e.name === 'QuotaExceededError') {
      toast.error('Hardware lotado! Limpe registros antigos para continuar salvando.');
    } else {
      toast.error('Erro de gravação no hardware. Verifique permissões do navegador.');
    }
  }
};

export const hasUnsavedChanges = () => isDirty;

export const getLocalCollection = (collection: string) => {
  try {
    const data = getStorageData();
    return Array.isArray(data[collection]) ? data[collection] : [];
  } catch (e) {
    console.error(`[Persistência:Local] Erro ao carregar coleção ${collection}:`, e);
    return [];
  }
};

export const saveLocalCollection = (collection: string, data: any[]) => {
  try {
    const current = { ...getStorageData() };
    current[collection] = data;
    setStorageData(current);
  } catch (e) {
    console.error(`[Persistência:Local] Erro ao salvar coleção ${collection}:`, e);
  }
};

// Helpers de compatibilidade (Mapeiam chaves antigas para o armazenamento unificado)
export const saveToLocal = (key: string, data: any) => {
  if (key.startsWith('hardware_humano_')) {
    const collection = key.replace('hardware_humano_', '');
    saveLocalCollection(collection, data);
  } else if (key === STORAGE_KEY) {
    setStorageData(data);
  } else {
    // For other keys, we still use localStorage directly or we could also cache them.
    // Given the prompt "REMOVA O AUTO-SAVE", let's cache everything.
    const current = { ...getStorageData() };
    current[key] = data;
    setStorageData(current);
  }
};

export const loadFromLocal = (key: string) => {
  const data = getStorageData();
  
  if (key.startsWith('hardware_humano_')) {
    const collection = key.replace('hardware_humano_', '');
    return Array.isArray(data[collection]) ? data[collection] : [];
  }
  
  if (key === STORAGE_KEY) return data;
  
  return data[key] || null;
};
