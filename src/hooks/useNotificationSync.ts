/**
 * useNotificationSync
 * 
 * Responsável por:
 * 1. Solicitar permissão de notificação
 * 2. Registrar o Periodic Background Sync (Android Chrome instalado)
 * 3. Sincronizar os schedules de tarefas com o Service Worker via postMessage
 * 4. Escutar mensagens de volta do SW (ex: notificação disparada em background)
 */

import { useEffect, useCallback } from 'react';

const TASKS_KEY = 'hardware_humano_data';

interface Task {
  id: string;
  titulo: string;
  hora_vencimento?: string | null;
  data_execucao?: string | null;
  status_concluido?: boolean;
  lembretes?: { minutosAntecendia: number; disparado: boolean }[];
  notificado_fixo?: boolean;
}

/**
 * Envia as tarefas com horário para o Service Worker guardar no IndexedDB.
 * O SW usa esses dados para disparar notificações mesmo com o app fechado.
 */
export function syncSchedulesWithSW(tasks: Task[]) {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({
      type: 'SYNC_SCHEDULES',
      payload: tasks,
    });
  });
}

/**
 * Registra o Periodic Background Sync para Android Chrome (app instalado como PWA).
 * Isso permite que o SW verifique notificações a cada minuto mesmo com o app fechado.
 */
async function registerPeriodicSync() {
  if (!('serviceWorker' in navigator)) return;
  if (!('periodicSync' in ServiceWorkerRegistration.prototype)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const periodicSync = (registration as any).periodicSync;
    if (!periodicSync) return;

    const tags = await periodicSync.getTags();
    if (!tags.includes('focus-notification-check')) {
      await periodicSync.register('focus-notification-check', {
        minInterval: 60 * 1000, // 1 minuto (mínimo permitido)
      });
      console.log('[Notifications] Periodic Background Sync registrado.');
    }
  } catch (err) {
    // Não suportado ou permissão negada — silencioso
    console.warn('[Notifications] Periodic Sync não disponível:', err);
  }
}

export function useNotificationSync() {
  /**
   * Pede permissão e então sincroniza os schedules com o SW.
   */
  const initNotifications = useCallback(async () => {
    if (!('Notification' in window)) return;

    // Pede permissão se ainda não foi concedida
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') return;

    // Registra periodic sync
    await registerPeriodicSync();

    // Sincroniza tarefas com o SW imediatamente
    refreshSchedules();
  }, []);

  /**
   * Lê as tarefas do localStorage e envia ao SW.
   * Chame sempre que o usuário salvar/alterar uma tarefa.
   */
  const refreshSchedules = useCallback(() => {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      if (!raw) return;
      const tasks: Task[] = JSON.parse(raw);
      if (!Array.isArray(tasks)) return;

      // Filtra apenas tarefas não concluídas que têm horário definido
      const scheduled = tasks.filter(
        (t) => t.hora_vencimento && !t.status_concluido
      );

      syncSchedulesWithSW(scheduled);
      console.log(`[Notifications] ${scheduled.length} schedules sincronizados com SW.`);
    } catch (e) {
      console.error('[Notifications] Erro ao sincronizar schedules:', e);
    }
  }, []);

  useEffect(() => {
    // Ouve mensagens do SW (ex: notificação disparada em background)
    if (!('serviceWorker' in navigator)) return;

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_FIRED') {
        // SW disparou uma notificação — atualiza estado local para resetar flags
        window.dispatchEvent(new Event('storage'));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, []);

  useEffect(() => {
    // Sempre que o localStorage mudar, sincroniza os schedules
    const handleStorage = () => refreshSchedules();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('storage_update', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('storage_update', handleStorage);
    };
  }, [refreshSchedules]);

  return { initNotifications, refreshSchedules };
}
