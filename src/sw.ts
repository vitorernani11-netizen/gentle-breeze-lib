/// <reference lib="WebWorker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// ─── Precache todos os assets gerados pelo Vite ───────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── Estratégia: Navegação (SSR pages) — NetworkFirst com fallback ─────────────
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'focus-pages-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  }),
  { denylist: [new RegExp('^/~oauth'), new RegExp('^/api/')] }
);
registerRoute(navigationRoute);

// ─── Estratégia: Assets estáticos (JS/CSS/fonts) — CacheFirst ─────────────────
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'focus-assets-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// ─── Estratégia: Supabase API — NetworkFirst (quando offline retorna cache) ────
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'focus-supabase-cache',
    networkTimeoutSeconds: 8,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
);

// ─── IndexedDB helper para schedules de notificação ──────────────────────────
const DB_NAME = 'FocusNotificationsDB';
const STORE_NAME = 'schedules';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveSchedules(schedules: NotificationSchedule[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  for (const s of schedules) {
    store.put(s);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadSchedules(): Promise<NotificationSchedule[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface NotificationSchedule {
  id: string;
  titulo: string;
  hora_vencimento: string; // "HH:MM"
  data_execucao: string;   // "YYYY-MM-DD"
  lembretes?: { minutosAntecendia: number; disparado: boolean }[];
  notificado_fixo?: boolean;
}

// ─── Verificação de notificações (roda a cada 30s via alarm interno) ───────────
async function checkNotifications(): Promise<void> {
  if (Notification.permission !== 'granted') return;

  const schedules = await loadSchedules();
  if (!schedules.length) return;

  const agora = new Date();
  const hojeStr = agora.toISOString().split('T')[0];
  const horaAtualMinutos = agora.getHours() * 60 + agora.getMinutes();

  const updated: NotificationSchedule[] = [];
  let hasChanges = false;

  for (const tarefa of schedules) {
    // Só processa tarefas de hoje
    const dataTarefa = tarefa.data_execucao?.split('T')[0]?.replace(/\//g, '-');
    if (dataTarefa !== hojeStr) {
      updated.push(tarefa);
      continue;
    }

    if (!tarefa.hora_vencimento) {
      updated.push(tarefa);
      continue;
    }

    const [h, m] = tarefa.hora_vencimento.split(':').map(Number);
    const horaTarefaMinutos = h * 60 + m;

    let tarefaAtualizada = { ...tarefa };

    // 1. Notificação no horário exato
    if (horaAtualMinutos === horaTarefaMinutos && !tarefa.notificado_fixo) {
      await self.registration.showNotification(`🚨 Hora Fixa: ${tarefa.titulo}`, {
        body: `Sua atividade agendada para às ${tarefa.hora_vencimento} começou agora!`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `task-fixed-${tarefa.id}`,
        requireInteraction: true,
        data: { url: '/' },
      } as any);
      tarefaAtualizada = { ...tarefaAtualizada, notificado_fixo: true };
      hasChanges = true;
    }

    // 2. Lembretes antecipados
    if (tarefa.lembretes?.length) {
      const novosLembretes = await Promise.all(
        tarefa.lembretes.map(async (lembrete) => {
          if (lembrete.disparado) return lembrete;
          const minutoDoDisparo = horaTarefaMinutos - lembrete.minutosAntecendia;
          if (horaAtualMinutos === minutoDoDisparo) {
            await self.registration.showNotification(`⏰ Lembrete: ${tarefa.titulo}`, {
              body: `Faltam ${lembrete.minutosAntecendia} min para o início das ${tarefa.hora_vencimento}.`,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: `task-reminder-${tarefa.id}-${lembrete.minutosAntecendia}`,
              data: { url: '/' },
            } as any);
            hasChanges = true;
            return { ...lembrete, disparado: true };
          }
          return lembrete;
        })
      );
      tarefaAtualizada = { ...tarefaAtualizada, lembretes: novosLembretes };
    }

    updated.push(tarefaAtualizada);
  }

  if (hasChanges) {
    await saveSchedules(updated);
    // Notifica o app para atualizar o estado no localStorage
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'NOTIFICATION_FIRED' });
    }
  }
}

// ─── Loop de verificação com alarme interno ───────────────────────────────────
let checkInterval: ReturnType<typeof setInterval> | null = null;

function startNotificationLoop() {
  if (checkInterval) return;
  checkInterval = setInterval(() => {
    checkNotifications().catch(console.error);
  }, 30_000); // Checa a cada 30 segundos
  // Checa imediatamente ao iniciar
  checkNotifications().catch(console.error);
}

// ─── Eventos do Service Worker ────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  (event as any).waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  (event as any).waitUntil(
    Promise.all([
      self.clients.claim(),
    ])
  );
  startNotificationLoop();
});

// ─── Mensagens vindas do app ──────────────────────────────────────────────────
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data || {};

  if (type === 'SYNC_SCHEDULES') {
    // App envia lista de tarefas com hora agendada
    const schedules: NotificationSchedule[] = (payload || []).filter(
      (t: any) => t.hora_vencimento && !t.status_concluido
    );
    await saveSchedules(schedules);
    startNotificationLoop();
    event.source?.postMessage({ type: 'SCHEDULES_SAVED', count: schedules.length });
  }

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'CHECK_NOW') {
    await checkNotifications();
  }
});

// ─── Clique em notificação: abre/foca o app ───────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  (event as any).waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      const focusedClient = clientsList.find((c) => c.url.includes(self.location.origin));
      if (focusedClient) {
        return focusedClient.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─── Periodic Background Sync (Android Chrome instalado) ─────────────────────
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'focus-notification-check') {
    event.waitUntil(checkNotifications());
  }
});
