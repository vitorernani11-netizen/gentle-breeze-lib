/**
 * ╔══════════════════════════════════════════════════════╗
 * ║         SYNC ENGINE — Offline-First                  ║
 * ║  localStorage = primário (instantâneo, sempre rápido)║
 * ║  Supabase = nuvem (sincroniza em background)         ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Fluxo:
 *  1. Qualquer escrita vai PRIMEIRO ao localStorage (0ms, offline ok)
 *  2. Se online → sobe para Supabase imediatamente em background
 *  3. Se offline → registra na fila de pendentes (SYNC_QUEUE_KEY)
 *  4. Ao detectar conexão de volta → drena a fila automaticamente
 *  5. Na inicialização → tenta baixar dados da nuvem (merge por updated_at)
 */

import { supabase } from '@/integrations/supabase/client';
import { generateUUID } from '@/utils/uuid';


// ─── Constantes ───────────────────────────────────────────────────────────────
const SYNC_QUEUE_KEY = 'hw_sync_queue';
const LAST_CLOUD_SYNC_KEY = 'hw_last_cloud_sync';
const CLOUD_USER_ID = 'hw-local-user-001'; // ID fixo de usuário único

// ─── Tipos ────────────────────────────────────────────────────────────────────
type SyncOperation = 'upsert' | 'delete';

interface SyncQueueItem {
  id: string;
  table: string;
  operation: SyncOperation;
  payload: Record<string, any>;
  timestamp: string;
}

// Mapeamento: chave do localStorage → tabela no Supabase
// Formato: 'hardware_humano_COLLECTION' → 'TABLE_NAME'
const COLLECTION_TO_TABLE: Record<string, string> = {
  data:              'tarefas',          // hardware_humano_data
  checkin:           'checkin_diario',   // hardware_humano_checkin
  hydration:         'hidratacao',       // hardware_humano_hydration
  finance:           'financeiro',       // hardware_humano_finance
  academic:          'atividades_academicas', // hardware_humano_academic
  anxiety:           'anxiety_dumps',    // hardware_humano_anxiety
  sleep_events:      'sleep_events',     // hardware_humano_sleep_events
  social:            'uso_redes_sociais',// hardware_humano_social
  projects:          'projetos',         // hardware_humano_projects
};

// ─── Estado interno ───────────────────────────────────────────────────────────
let isOnline = navigator.onLine;
let isSyncing = false;
let syncListeners: Array<(status: SyncStatus) => void> = [];

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
let currentStatus: SyncStatus = isOnline ? 'idle' : 'offline';

// ─── Helpers de fila ─────────────────────────────────────────────────────────
function getQueue(): SyncQueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[SyncEngine] Erro ao salvar fila:', e);
  }
}

function enqueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): void {
  const queue = getQueue();
  // Substitui item existente da mesma tabela+payload.id para evitar duplicatas
  const idx = queue.findIndex(
    (q) => q.table === item.table && q.payload.id === item.payload.id
  );
  const entry: SyncQueueItem = {
    ...item,
    id: generateUUID(),
    timestamp: new Date().toISOString(),
  };
  if (idx > -1) queue[idx] = entry;
  else queue.push(entry);
  saveQueue(queue);
}

// ─── Notificação de status ─────────────────────────────────────────────────────
function setStatus(s: SyncStatus) {
  currentStatus = s;
  syncListeners.forEach((fn) => fn(s));
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function onSyncStatusChange(fn: (s: SyncStatus) => void): () => void {
  syncListeners.push(fn);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== fn);
  };
}

// ─── Drain da fila (executa pendentes) ────────────────────────────────────────
async function drainQueue(): Promise<void> {
  if (isSyncing || !isOnline) return;
  const queue = getQueue();
  if (queue.length === 0) return;

  isSyncing = true;
  setStatus('syncing');
  console.log(`[SyncEngine] Drenando ${queue.length} operação(ões) pendente(s)...`);

  const failed: SyncQueueItem[] = [];

  for (const item of queue) {
    try {
      if (item.operation === 'upsert') {
        const payload = { ...item.payload, user_id: CLOUD_USER_ID };
        const { error } = await supabase.from(item.table as any).upsert(payload, {
          onConflict: 'id',
        });
        if (error) throw error;
      } else if (item.operation === 'delete') {
        const { error } = await supabase
          .from(item.table as any)
          .delete()
          .eq('id', item.payload.id);
        if (error) throw error;
      }
    } catch (err) {
      console.warn(`[SyncEngine] Falha ao sincronizar item (${item.table}/${item.payload.id}):`, err);
      failed.push(item);
    }
  }

  saveQueue(failed);
  isSyncing = false;

  if (failed.length === 0) {
    localStorage.setItem(LAST_CLOUD_SYNC_KEY, new Date().toISOString());
    setStatus('synced');
    console.log('[SyncEngine] ✅ Sync completo.');
  } else {
    setStatus('error');
    console.warn(`[SyncEngine] ⚠️ ${failed.length} item(ns) não sincronizados.`);
  }
}

// ─── Função principal: registra uma mudança local e agenda o sync ─────────────
export function syncRecord(
  collection: string,
  operation: SyncOperation,
  record: Record<string, any>
): void {
  const table = COLLECTION_TO_TABLE[collection];
  if (!table) {
    // Coleção não mapeada — apenas localStorage, sem sync
    return;
  }

  // Garante que o record tem um ID
  if (!record.id) {
    console.warn(`[SyncEngine] Record sem ID na coleção '${collection}' — não sincronizado.`);
    return;
  }

  if (isOnline) {
    // Online: tenta imediatamente em background
    const payload = { ...record, user_id: CLOUD_USER_ID };
    (async () => {
      setStatus('syncing');
      try {
        if (operation === 'upsert') {
          const { error } = await supabase.from(table as any).upsert(payload, {
            onConflict: 'id',
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.from(table as any).delete().eq('id', record.id);
          if (error) throw error;
        }
        localStorage.setItem(LAST_CLOUD_SYNC_KEY, new Date().toISOString());
        setStatus('synced');
      } catch (err) {
        console.warn('[SyncEngine] Falha no sync imediato, adicionando à fila:', err);
        enqueue({ table, operation, payload: record });
        setStatus('error');
      }
    })();
  } else {
    // Offline: coloca na fila
    enqueue({ table, operation, payload: record });
    setStatus('offline');
    console.log(`[SyncEngine] Offline — operação enfileirada para ${table}`);
  }
}

// ─── Sincronização inicial: baixa dados da nuvem e faz merge ─────────────────
export async function pullFromCloud(): Promise<boolean> {
  if (!isOnline) {
    console.log('[SyncEngine] Offline — usando localStorage.');
    return false;
  }

  try {
    setStatus('syncing');
    console.log('[SyncEngine] Baixando dados da nuvem...');

    for (const [collection, table] of Object.entries(COLLECTION_TO_TABLE)) {
      try {
        const { data, error } = await supabase
          .from(table as any)
          .select('*')
          .eq('user_id', CLOUD_USER_ID);

        if (error) {
          console.warn(`[SyncEngine] Erro ao baixar '${table}':`, error.message);
          continue;
        }

        if (!data || data.length === 0) continue;

        // Merge: local items + cloud items, mais recente vence
        const localKey = `hardware_humano_${collection}`;
        let localItems: any[] = [];
        try {
          localItems = JSON.parse(localStorage.getItem(localKey) || '[]');
          if (!Array.isArray(localItems)) localItems = [];
        } catch {
          localItems = [];
        }

        const merged = mergeCollections(localItems, data);
        localStorage.setItem(localKey, JSON.stringify(merged));
        console.log(`[SyncEngine] ✅ '${table}': ${merged.length} registros sincronizados.`);
      } catch (tableErr) {
        console.warn(`[SyncEngine] Erro na tabela '${table}':`, tableErr);
      }
    }

    localStorage.setItem(LAST_CLOUD_SYNC_KEY, new Date().toISOString());
    setStatus('synced');
    return true;
  } catch (err) {
    console.error('[SyncEngine] Erro geral no pull:', err);
    setStatus('error');
    return false;
  }
}

// ─── Merge por updated_at (mais recente vence) ────────────────────────────────
function mergeCollections(local: any[], cloud: any[]): any[] {
  const map = new Map<string, any>();

  // Primeiro os locais
  for (const item of local) {
    if (item?.id) map.set(item.id, item);
  }

  // Depois os da nuvem — vence se mais recente
  for (const item of cloud) {
    if (!item?.id) continue;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      // Compara updated_at ou created_at
      const cloudTime = new Date(item.updated_at || item.created_at || 0).getTime();
      const localTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
      if (cloudTime > localTime) map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

// ─── Monitoramento de conexão ─────────────────────────────────────────────────
function setupConnectivityListeners(): void {
  window.addEventListener('online', async () => {
    console.log('[SyncEngine] 🌐 Conexão restaurada. Sincronizando...');
    isOnline = true;
    await drainQueue();
  });

  window.addEventListener('offline', () => {
    console.log('[SyncEngine] 📴 Sem conexão. Modo offline ativado.');
    isOnline = false;
    setStatus('offline');
  });
}

// ─── Inicialização ────────────────────────────────────────────────────────────
export async function initSyncEngine(): Promise<void> {
  setupConnectivityListeners();
  setStatus(isOnline ? 'idle' : 'offline');

  // Drena fila de itens que falharam antes (sessão anterior offline)
  if (isOnline && getQueue().length > 0) {
    console.log('[SyncEngine] Itens pendentes da sessão anterior encontrados. Sincronizando...');
    await drainQueue();
  }

  console.log('[SyncEngine] Inicializado. Online:', isOnline);
}

// ─── Utilitários exportados ───────────────────────────────────────────────────
export function getLastSyncTime(): string | null {
  return localStorage.getItem(LAST_CLOUD_SYNC_KEY);
}

export function getPendingCount(): number {
  return getQueue().length;
}
