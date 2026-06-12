import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useLocation,
  useNavigate
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { GlobalAddTask } from "@/components/tasks/GlobalAddTask";
import { useTaskActions } from "@/hooks/useTaskActions";
import { hasUnsavedChanges, loadFromLocal, saveToLocal } from "@/lib/storage";
import {
  initSyncEngine,
  pullFromCloud,
  onSyncStatusChange,
  getSyncStatus,
  getPendingCount,
  getLastSyncTime,
  type SyncStatus,
} from "@/lib/syncEngine";
import { toast } from "sonner";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "Focus" },
      { name: "theme-color", content: "#000000" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/pwa-192x192.png" },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// ─── Indicador de status do sync ─────────────────────────────────────────────
function SyncStatusBadge() {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [pending, setPending] = useState(getPendingCount());
  const [lastSync, setLastSync] = useState(getLastSyncTime());

  useEffect(() => {
    const unsub = onSyncStatusChange((s) => {
      setStatus(s);
      setPending(getPendingCount());
      setLastSync(getLastSyncTime());
    });
    return unsub;
  }, []);

  const config: Record<SyncStatus, { label: string; dot: string; text: string }> = {
    idle:    { label: 'Nuvem OK',    dot: 'bg-green-500',  text: 'text-green-400' },
    syncing: { label: 'Sincronizando...', dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400' },
    synced:  { label: 'Sincronizado', dot: 'bg-green-500',  text: 'text-green-400' },
    offline: { label: `Offline${pending > 0 ? ` (${pending} pend.)` : ''}`, dot: 'bg-zinc-600', text: 'text-zinc-500' },
    error:   { label: 'Erro no sync', dot: 'bg-red-500',    text: 'text-red-400' },
  };

  const c = config[status];

  return (
    <div
      title={lastSync ? `Último sync: ${new Date(lastSync).toLocaleTimeString('pt-BR')}` : 'Nunca sincronizado'}
      className="fixed top-2 right-3 z-[90] flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur border border-zinc-800/60 rounded-full px-2.5 py-1 pointer-events-none select-none"
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.dot}`} />
      <span className={`text-[8px] font-black uppercase tracking-widest ${c.text}`}>{c.label}</span>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [hasSession, setHasSession] = useState(true);
  const { checkAndRouteRecurringTasks } = useTaskActions();
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      setHasSession(true);
      setIsAuthChecking(false);
      checkAndRouteRecurringTasks();

      // Inicializa o motor de sync offline-first
      await initSyncEngine();

      // Baixa dados da nuvem e faz merge com localStorage
      const synced = await pullFromCloud();
      if (synced) {
        // Dispara atualização da UI após merge
        window.dispatchEvent(new Event('storage'));
      }
    };

    checkAuth();

    const handleStorageUpdate = () => {
      setIsDirty(hasUnsavedChanges());
    };

    window.addEventListener('storage_update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    
    return () => {
      window.removeEventListener('storage_update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  // Notification Engine
  useEffect(() => {
    if (!hasSession) return;

    const TASKS_KEY = 'hardware_humano_data';

    const verificarELancarNotificacoes = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const tasks = loadFromLocal(TASKS_KEY) || [];
      const agora = new Date();
      const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
      const horaAtualMinutos = agora.getHours() * 60 + agora.getMinutes();

      let hasChanges = false;
      const updatedTasks = tasks.map((tarefa: any) => {
        if (tarefa.status_concluido || !tarefa.data_execucao || !tarefa.hora_vencimento) return tarefa;

        // Garante que a tarefa é de hoje
        const dataTarefaStr = tarefa.data_execucao.split('T')[0].replace(/\//g, '-');
        if (dataTarefaStr !== hojeStr) return tarefa;

        const [h, m] = tarefa.hora_vencimento.split(':').map(Number);
        const horaTarefaMinutos = h * 60 + m;

        // 1. Checa o Horário Fixo da Atividade (Notificação no exato momento)
        // Usamos uma flag para não disparar várias vezes no mesmo minuto
        if (horaAtualMinutos === horaTarefaMinutos && !tarefa.notificado_fixo) {
          new Notification(`🚨 Hora Fixa: ${tarefa.titulo}`, {
            body: `Sua atividade agendada para às ${tarefa.hora_vencimento} começou agora!`,
            icon: '/pwa-192x192.png'
          });
          hasChanges = true;
          return { ...tarefa, notificado_fixo: true };
        }

        // 2. Checa os Lembretes personalizados antecipados
        if (tarefa.lembretes && Array.isArray(tarefa.lembretes)) {
          let lembreteAlterado = false;
          const novosLembretes = tarefa.lembretes.map((lembrete: any) => {
            if (lembrete.disparado) return lembrete;

            const minutoDoDisparo = horaTarefaMinutos - lembrete.minutosAntecendia;

            if (horaAtualMinutos === minutoDoDisparo) {
              new Notification(`⏰ Lembrete: ${tarefa.titulo}`, {
                body: `Faltam ${lembrete.minutosAntecendia} minutos para o início do seu compromisso das ${tarefa.hora_vencimento}.`,
                icon: '/pwa-192x192.png'
              });
              lembreteAlterado = true;
              return { ...lembrete, disparado: true };
            }
            return lembrete;
          });

          if (lembreteAlterado) {
            hasChanges = true;
            return { ...tarefa, lembretes: novosLembretes };
          }
        }
        
        // Reset flags if minute passed (optional but safer for recurring)
        if (horaAtualMinutos !== horaTarefaMinutos && tarefa.notificado_fixo) {
           // We don't necessarily want to reset here if we want to avoid double triggers in same session
        }

        return tarefa;
      });

      if (hasChanges) {
        saveToLocal(TASKS_KEY, updatedTasks);
        window.dispatchEvent(new Event('storage'));
      }
    };

    // Solicita permissão inicial se o usuário interagir ou via toast
    const requestInitialPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast.success("Notificações ativadas!");
        }
      }
    };

    // Delay permission request to not annoy on load
    setTimeout(requestInitialPermission, 2000);

    const interval = setInterval(verificarELancarNotificacoes, 30000); // Checa a cada 30s
    return () => clearInterval(interval);
  }, [hasSession]);

  if (isAuthChecking) return null;

  return (
    <QueryClientProvider client={queryClient}>
      {hasSession && <AppSidebar />}
      <SyncStatusBadge />
      <div className="flex flex-col min-h-screen pb-16 md:pb-0">
        <Outlet />
      </div>
      {hasSession && <BottomNav />}
      <GlobalAddTask />

      <Toaster position="top-center" theme="dark" />
    </QueryClientProvider>
  );
}
