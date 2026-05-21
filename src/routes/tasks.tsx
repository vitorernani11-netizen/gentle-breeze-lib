import { createFileRoute, useNavigate, useLocation } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from 'react';
import { isBefore, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

import { Card } from '@/components/ui/card';
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Hash, 
  WifiOff, 
  Clock, 
  Calendar, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Flame,
  Check,
  Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { useTaskActions } from '@/hooks/useTaskActions';
import { saveToLocal, loadFromLocal } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { AddTaskOverlay } from '@/components/tasks/AddTaskOverlay';
import { TaskCard } from '@/components/tasks/TaskCard';

const TASKS_KEY = 'hardware_humano_data';

export const Route = createFileRoute('/tasks')({
  component: TasksPage,
});

function TasksPage() {
  const normalizarParaObjetoDate = (dataStr: string, horaStr?: string | null): Date | null => {
    // Parser Universal forçado para 2026
    if (!dataStr) return null;
    try {
      const agora = new Date();
      const anoAtual = 2026; 
      let dia = agora.getDate();
      let mes = agora.getMonth(); 
      let ano = anoAtual;

      const str = dataStr.toUpperCase().trim();

      if (str !== 'HOJE' && str !== '') {
        // Remove resíduos de ISO timestamp (T00:00...)
        const apenasData = dataStr.split('T')[0].trim();

        if (apenasData.includes('/')) {
          const parts = apenasData.split('/');
          dia = parseInt(parts[0], 10);
          mes = parseInt(parts[1], 10) - 1;
          ano = parts[2] ? parseInt(parts[2], 10) : anoAtual;
        } else if (apenasData.includes('-')) {
          const parts = apenasData.split('-');
          if (parts[0].length === 4) {
            ano = parseInt(parts[0], 10);
            mes = parseInt(parts[1], 10) - 1;
            dia = parseInt(parts[2], 10);
          } else {
            dia = parseInt(parts[0], 10);
            mes = parseInt(parts[1], 10) - 1;
            ano = parts[2] ? parseInt(parts[2], 10) : anoAtual;
          }
        }
      }

      // Configuração do Horário Fixo (Se vazio, assume 23:59)
      let hora = 23;
      let minuto = 59;
      if (horaStr && horaStr.trim() !== '' && horaStr.includes(':')) {
        const timeParts = horaStr.split(':');
        const h = parseInt(timeParts[0], 10);
        const m = parseInt(timeParts[1], 10);
        if (!isNaN(h)) hora = h;
        if (!isNaN(m)) minuto = m;
      }

      return new Date(ano, mes, dia, hora, minuto, 0, 0);
    } catch (e) {
      return null;
    }
  };

  // Nova função unificada de atraso baseada no normalizador acima
  const isTaskOverdue = (dueDateStr: string, dueTimeStr?: string | null): boolean => {
    const dataTarefa = normalizarParaObjetoDate(dueDateStr, dueTimeStr);
    if (!dataTarefa) return false;
    return new Date().getTime() > dataTarefa.getTime();
  };

  const navigate = useNavigate();
  const location = useLocation();
  const [tarefasOrdenadasDaEntrada, setTarefasOrdenadasDaEntrada] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [detailTask, setDetailTask] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  

  const { moveTask, updateTriagemStage, restoreTask, deletePermanent, completeTask, updateTask, rescheduleTask, addTask } = useTaskActions(() => {
    fetchTasks();
    if (location.pathname === '/tasks' && window.location.hash === '#redirect-to-today') {
       navigate({ to: '/' });
    }
  });

  useEffect(() => {
    fetchTasks();
    // Add event listener for local storage changes from other components/pages
    const handleStorageChange = () => {
      console.log('[Hardware:Sync] Storage change detected');
      fetchTasks();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchTasks = () => {
    try {
      setLoading(true);
      let allTasks = loadFromLocal(TASKS_KEY);
      
      if (!Array.isArray(allTasks)) {
        throw new Error('Formato de dados inválido no hardware.');
      }

      // Validação extra de datas
      const validTasks = allTasks.filter((t: any) => {
        const dataVenc = t.data_execucao || t.data_vencimento;
        if (!dataVenc) return true;
        
        const obj = normalizarParaObjetoDate(dataVenc, t.hora_vencimento || t.lembrete);
        const isDateValid = !!obj || dataVenc.toUpperCase().trim() === 'HOJE';
        
        if (!isDateValid) {
          console.warn('[Hardware:Tasks] Tarefa ignorada por data inválida:', t);
        }
        return isDateValid;
      });

      const mappedTasks = validTasks.map((t: any) => {
        // Migration: ensure fase_pipeline and priority string
        if (t.fase_pipeline === undefined) {
          t.fase_pipeline = t.triagem_stage || (typeof t.prioridade === 'number' ? t.prioridade : 1);
        }
        if (typeof t.prioridade === 'number') {
          t.prioridade = `P${t.prioridade}`;
        }
        return t;
      });

      const tarefasOrdenadasDaEntrada = mappedTasks.filter((t: any) => 
        t && !t.status_concluido
      ).sort((a: any, b: any) => {
        const dataA = a.data_execucao || a.data_vencimento;
        const dataB = b.data_execucao || b.data_vencimento;

        if (!dataA && !dataB) return 0;
        if (!dataA) return 1;
        if (!dataB) return -1;

        const paraTimestampNumerico = (dataStr: string, horaStr?: string | null) => {
          const obj = normalizarParaObjetoDate(dataStr, horaStr);
          return obj ? obj.getTime() : 0;
        };

        const tempoA = paraTimestampNumerico(dataA, a.hora_vencimento || a.lembrete);
        const tempoB = paraTimestampNumerico(dataB, b.hora_vencimento || b.lembrete);

        return tempoA - tempoB;
      });

      const completed = mappedTasks.filter((t: any) => 
        t && t.status_concluido
      ).sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      setTarefasOrdenadasDaEntrada(tarefasOrdenadasDaEntrada);
      setCompletedTasks(completed);
      setErrorState(null);
    } catch (error: any) {
      console.error('Erro ao carregar tarefas:', error);
      setErrorState('Falha ao acessar banco de dados local.');
      toast.error('O hardware falhou ao carregar a Entrada.');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-mono text-[#00ff41]">
        <span className="animate-pulse font-black uppercase tracking-[0.3em]">Carregando Pipeline...</span>
      </div>
    );
  }

  const triagemStages = [
    { num: 1, label: 'CLASSIFICAÇÃO', desc: 'Onde/Quando', color: 'border-white' },
    { num: 2, label: 'FRACIONAR', desc: 'Quebrar', color: 'border-white' },
    { num: 3, label: 'PLANEJAMENTO', desc: 'Agendar', color: 'border-white' },
    { num: 4, label: 'EXECUÇÃO', desc: 'Foco atual', color: 'border-[#00ff41] text-[#00ff41]' },
  ];

  const getPriorityColor = (p: string | number) => {
    switch (p) {
      case 'P1':
      case 1: return 'text-[#ff0055] border-[#ff0055]';
      case 'P2':
      case 2: return 'text-[#ffaa00] border-[#ffaa00]';
      case 'P3':
      case 3: return 'text-[#00ccff] border-[#00ccff]';
      default: return 'text-zinc-400 border-zinc-800';
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 sm:p-6 pt-12 pb-20 font-sans">
      <div className="fixed top-4 right-4 flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800/50 z-50 backdrop-blur-md">
        <WifiOff size={12} className="text-zinc-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Offline Local</span>
      </div>

      <header className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">Entrada</h1>
        </div>
      </header>

      {/* Input removido conforme Fase 1 */}


      <div className="grid grid-cols-2 gap-3 w-full p-4 border-b border-zinc-800 shrink-0">
        {[
          { id: 1, label: "01. Classificação" },
          { id: 2, label: "02. Fracionar" },
          { id: 3, label: "03. Planejamento" },
          { id: 4, label: "04. Execução" }
        ].map((stage) => {
          const isActive = selectedStage === stage.id; 
          
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(isActive ? null : stage.id)}
              className={`flex items-center justify-center p-3 rounded-md border transition-all active:scale-95 ${
                isActive 
                  ? "border-[#00ff41]/40 bg-[#00ff41]/5 text-[#00ff41]" 
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
              }`}
            >
              <span className="font-bold text-[10px] sm:text-xs uppercase tracking-wider">
                {stage.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-0 border-t border-white/10">
        {tarefasOrdenadasDaEntrada.length > 0 ? (
          tarefasOrdenadasDaEntrada
            .filter((task: any) => {
              if (!selectedStage) return true;
              if (selectedStage === 1) {
                return task.fase_pipeline === 1 || task.fase_pipeline === null || task.fase_pipeline === undefined;
              }
              return task.fase_pipeline === selectedStage;
            })
            .map((task: any) => (
              <TaskCard 
                key={task.id}
                task={task}
                onComplete={completeTask}
                onMoveToToday={(id) => {
                  moveTask(id, 'Hoje');
                  navigate({ to: '/' });
                }}
                onDelete={deletePermanent}
                onClick={(t) => {
                  setDetailTask(t);
                  setIsDetailOpen(true);
                }}
                onUpdateStage={updateTriagemStage}
                onUpdatePriority={(id, p) => updateTask(id, { prioridade: p })}
              />
            ))
        ) : (
          <div className="border-2 border-dashed border-zinc-800 p-20 text-center">
            <p className="text-zinc-700 font-black uppercase tracking-[0.5em] text-xs">Pipeline Vazio</p>
          </div>
        )}

        {/* Botão de Histórico */}
        {completedTasks.length > 0 && (
          <div className="mt-20 px-4">
            <button 
              onClick={() => navigate({ to: '/completed' })}
              className="w-full border-2 border-dashed border-zinc-900 rounded-3xl py-10 flex flex-col items-center justify-center gap-3 group hover:border-zinc-700 transition-all"
            >
              <div className="p-3 bg-zinc-900 rounded-2xl text-zinc-600 group-hover:text-zinc-400">
                <Archive size={20} />
              </div>
              <span className="text-zinc-600 font-black uppercase tracking-[0.2em] text-[10px] group-hover:text-zinc-400">
                Ver Histórico de Concluídas ({completedTasks.length})
              </span>
            </button>
          </div>
        )}
      </div>

      <TaskDetailModal
        task={detailTask}
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailTask(null);
          fetchTasks();
        }}
        onUpdate={updateTask}
      />


    </div>
  );
}
