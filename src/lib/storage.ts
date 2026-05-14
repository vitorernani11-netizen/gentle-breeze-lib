// Unified storage manager for Hardware Humano
import { toast } from 'sonner';

const STORAGE_KEY = 'hardware_humano_data';

export const getStorageData = () => {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return {};
    
    try {
      return JSON.parse(data);
    } catch (parseError) {
      console.error('[Persistência:Local] Dados corrompidos no localStorage. Resetando...', parseError);
      // Opcional: toast.error('Falha crítica na leitura de dados. Tentando recuperar hardware...');
      return {};
    }
  } catch (e) {
    console.error('[Persistência:Local] Erro de acesso ao localStorage:', e);
    toast.error('O navegador impediu o acesso ao armazenamento local.');
    return {};
  }
};

export const setStorageData = (data: any) => {
  if (typeof window === 'undefined') return;
  try {
    const stringifiedData = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, stringifiedData);
    console.log('[Persistência:Local]', 'Dados sincronizados');
  } catch (e: any) {
    console.error('[Persistência:Local] Erro ao salvar dados:', e);
    if (e.name === 'QuotaExceededError') {
      toast.error('Hardware lotado! Limpe registros antigos para continuar salvando.');
    } else {
      toast.error('Erro de gravação no hardware. Verifique permissões do navegador.');
    }
  }
};

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
    const current = getStorageData();
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
  } else {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Erro ao salvar chave externa ${key}:`, e);
    }
  }
};

export const loadFromLocal = (key: string) => {
  if (key.startsWith('hardware_humano_')) {
    const collection = key.replace('hardware_humano_', '');
    return getLocalCollection(collection);
  }
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error(`Erro ao carregar chave externa ${key}:`, e);
    return null;
  }
};
