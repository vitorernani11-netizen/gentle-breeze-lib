import { createFileRoute, useNavigate, useLocation } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from 'react';
import { isBefore, parseISO, isToday, format as formatDate, startOfToday } from 'date-fns';
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
  Check
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
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [detailTask, setDetailTask] = useState<any | null>(null);
  
  

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
        const dateString = String(t.data_execucao || '');
        const isDateValid = dateString ? /^\d{4}-\d{2}-\d{2}$/.test(dateString) || !isNaN(new Date(dateString).getTime()) : true;
        if (!isDateValid) {
          console.warn('[Hardware:Tasks] Tarefa ignorada por data inválida:', t);
        }
        return isDateValid;
      });

      const active = validTasks.filter((t: any) => 
        t && t.status === 'Entrada' && !t.status_concluido
      ).sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      const completed = validTasks.filter((t: any) => 
        t && t.status === 'Entrada' && t.status_concluido
      ).sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      setActiveTasks(active);
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

  const onSmartAddTask = (taskData: {
    titulo: string;
    vencimento: string;
    recorrencia: string;
    prioridade: number;
    lembrete: string | null;
    reminders?: any[];
    descricao?: string;
    hora_vencimento?: string | null;
  }) => {
    const task = addTask({
      titulo: taskData.titulo,
      descricao: taskData.descricao || '',
      repeticao: taskData.recorrencia || 'none',
      data_execucao: taskData.vencimento,
      prioridade: taskData.prioridade || 4,
      status: 'Entrada',
      lembrete: taskData.lembrete,
      reminders: taskData.reminders || [],
      hora_vencimento: taskData.hora_vencimento
    });

    if (task) {
      toast.success('Tarefa capturada', {
        className: 'bg-black border-2 border-[#00ff41] text-[#00ff41] font-mono'
      });
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
    { num: 1, label: 'Classificação', desc: 'Onde/Quando', color: 'border-white' },
    { num: 2, label: 'Fracionar', desc: 'Quebrar', color: 'border-white' },
    { num: 3, label: 'Planejamento', desc: 'Agendar', color: 'border-white' },
    { num: 4, label: 'Execução', desc: 'Foco atual', color: 'border-[#00ff41] text-[#00ff41]' },
  ];

  const getPriorityColor = (p: number) => {
    switch (p) {
      case 1: return 'text-[#ff0055] border-[#ff0055]';
      case 2: return 'text-[#ffaa00] border-[#ffaa00]';
      case 3: return 'text-[#00ccff] border-[#00ccff]';
      default: return 'text-zinc-400 border-zinc-800';
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 sm:p-6 pt-12 pb-20 font-sans">
      <div className="fixed top-4 right-4 flex items-center gap-2 bg-zinc-900/30 px-3 py-1 rounded-full border border-zinc-800/50 z-50">
        <WifiOff size={10} className="text-zinc-600" />
        <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">Hardware Local</span>
      </div>

      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            aria-label="Voltar para Dashboard"
            variant="ghost" 
            size="icon" 
            onClick={() => navigate({ to: '/' })} 
            className="border border-zinc-800 rounded-xl hover:bg-zinc-900 transition-all w-10 h-10 shrink-0"
          >
            <ArrowLeft size={18} />
          </Button>
          <h1 className="text-2xl font-black uppercase tracking-tight italic">Entrada</h1>
        </div>
      </header>

      {/* Input removido conforme Fase 1 */}


      {/* Triagem Section */}
      <section className="mb-4">
        <div className="border border-zinc-900/50 p-2 bg-zinc-950/30 rounded-xl">
          <div className="flex flex-row overflow-x-auto gap-1.5 pb-0.5 scrollbar-none">
            {triagemStages.map((stage) => (
              <button 
                key={stage.num} 
                onClick={() => setSelectedStage(selectedStage === stage.num ? null : stage.num)}
                className={cn(
                  "border border-zinc-900/50 px-3 py-1.5 flex items-center gap-1.5 transition-all rounded-lg shrink-0", 
                  selectedStage === stage.num ? "bg-zinc-100 text-black border-white" : "hover:bg-zinc-900/30"
                )}
              >
                <span className={cn("text-[8px] font-black italic", selectedStage === stage.num ? "opacity-100" : "opacity-30")}>#{stage.num}</span>
                <span className="font-bold uppercase tracking-tight text-[8px] whitespace-nowrap">{stage.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-0 border-t border-white/10">
        {activeTasks.length > 0 ? (
          activeTasks
            .filter(task => !selectedStage || (task.triagem_stage || 1) === selectedStage)
            .map((task) => (
              <TaskCard 
                key={task.id}
                task={task}
                onComplete={completeTask}
                onMoveToToday={(id) => {
                  moveTask(id, 'Hoje');
                  navigate({ to: '/' });
                }}
                onDelete={deletePermanent}
                onClick={setDetailTask}
                onUpdateStage={updateTriagemStage}
              />
            ))
        ) : (
          <div className="border-2 border-dashed border-zinc-800 p-20 text-center">
            <p className="text-zinc-700 font-black uppercase tracking-[0.5em] text-xs">Pipeline Vazio</p>
          </div>
        )}

        {/* Completed Tasks Accordion */}
        {completedTasks.length > 0 && (
          <div className="mt-20">
            <button 
              aria-label={showCompleted ? "Recolher tarefas concluídas" : "Expandir tarefas concluídas"}
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full border-t-2 border-dashed border-zinc-800 py-6 flex items-center justify-between group"
            >
              <span className="text-zinc-600 font-black uppercase tracking-[0.2em] text-[10px]">
                Tarefas Concluídas ({completedTasks.length})
              </span>
              {showCompleted ? <ChevronUp size={16} className="text-zinc-700" /> : <ChevronDown size={16} className="text-zinc-700" />}
            </button>
            
            {showCompleted && (
              <div className="space-y-4 pt-4 animate-in slide-in-from-top-2 duration-300">
                {completedTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-900 opacity-40 group hover:opacity-100 transition-opacity"
                  >
                    <div className="flex flex-col gap-1 min-w-0 pr-4">
                      <span className="font-bold text-zinc-400 line-through uppercase tracking-tight truncate">
                        {task.titulo}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        aria-label="Restaurar tarefa"
                        size="icon"
                        variant="ghost"
                        className="w-10 h-10 border border-zinc-800 text-zinc-600 hover:text-[#00ff41] hover:border-[#00ff41] rounded-none transition-none"
                        onClick={() => restoreTask(task.id)}
                      >
                        <RefreshCw size={14} />
                      </Button>
                      <Button 
                        aria-label="Incinerar permanentemente"
                        size="icon"
                        variant="ghost"
                        className="w-10 h-10 border border-zinc-800 text-zinc-600 hover:text-red-500 hover:border-red-500 rounded-none transition-none"
                        onClick={() => deletePermanent(task.id)}
                      >
                        <Flame size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <TaskDetailModal
        task={detailTask}
        open={!!detailTask}
        onClose={() => setDetailTask(null)}
        onUpdate={updateTask}
      />

      <AddTaskOverlay
        open={isAddingTask}
        onClose={() => setIsAddingTask(false)}
        onAddTask={onSmartAddTask}
      />

    </div>
  );
}
