// Unified storage manager for Hardware Humano
const STORAGE_KEY = 'hardware_humano_data';

export const getStorageData = () => {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('[Persistência:Local] Erro ao ler dados:', e);
    return {};
  }
};

export const setStorageData = (data: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('[Persistência:Local]', 'Dados sincronizados com LocalStorage');
  } catch (e) {
    console.error('[Persistência:Local] Erro ao salvar dados:', e);
  }
};

// Helper for specific keys within the unified object
export const getLocalCollection = (collection: string) => {
  return getStorageData()[collection] || [];
};

export const saveLocalCollection = (collection: string, data: any[]) => {
  const current = getStorageData();
  current[collection] = data;
  setStorageData(current);
};

// Backward compatibility or direct access helpers
export const saveToLocal = (key: string, data: any) => {
  // Map old individual keys to the unified storage if they start with the prefix
  if (key.startsWith('hardware_humano_')) {
    const collection = key.replace('hardware_humano_', '');
    saveLocalCollection(collection, data);
  } else {
    // For any other keys, keep them separate
    localStorage.setItem(key, JSON.stringify(data));
  }
};

export const loadFromLocal = (key: string) => {
  if (key.startsWith('hardware_humano_')) {
    const collection = key.replace('hardware_humano_', '');
    return getLocalCollection(collection);
  }
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};
