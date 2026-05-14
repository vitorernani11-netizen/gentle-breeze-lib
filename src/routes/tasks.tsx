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
  const [isAddingTask, setIsAddingTask] = useState(false);
  

  const { moveTask, updateTriagemStage, restoreTask, deletePermanent, completeTask, updateTask, rescheduleTask } = useTaskActions(() => {
    fetchTasks();
    if (location.pathname === '/tasks' && window.location.hash === '#redirect-to-today') {
       navigate({ to: '/' });
    }
  });

  useEffect(() => {
    fetchTasks();
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
    descricao?: string;
    hora_vencimento?: string | null;
  }) => {
    try {
      const task = {
        id: crypto.randomUUID(),
        titulo: taskData.titulo,
        descricao: taskData.descricao || '',
        repeticao: taskData.recorrencia || 'none',
        data_execucao: taskData.vencimento,
        hora_vencimento: taskData.hora_vencimento || null,
        prioridade: taskData.prioridade || 4,
        triagem_stage: 1,
        user_id: 'local-user',
        status: 'Entrada',
        status_concluido: false,
        created_at: new Date().toISOString(),
        tags: [],
        lembrete: taskData.lembrete
      };

      console.log('[Hardware:Entrada]', task);

      const allTasks = loadFromLocal(TASKS_KEY) || [];
      saveToLocal(TASKS_KEY, [task, ...allTasks]);
      
      setActiveTasks(prev => [task, ...prev]);
      toast.success('Tarefa capturada', {
        className: 'bg-black border-2 border-[#00ff41] text-[#00ff41] font-mono'
      });
    } catch (error: any) {
      console.error('Erro ao adicionar tarefa:', error);
      toast.error('O hardware rejeitou o novo registro.');
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
      <section className="mb-6">
        <div className="border border-zinc-900 p-3 bg-zinc-950/50 rounded-2xl">
          <h2 className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-700 mb-3 flex items-center gap-2">
            <AlertCircle size={10} className="text-zinc-800" />
            TRIAGEM
          </h2>
          <div className="flex flex-row overflow-x-auto gap-2 pb-1 scrollbar-none">
            {triagemStages.map((stage) => (
              <button 
                key={stage.num} 
                onClick={() => setSelectedStage(selectedStage === stage.num ? null : stage.num)}
                className={cn(
                  "border border-zinc-900 px-4 py-2 flex items-center gap-2 transition-all rounded-xl shrink-0", 
                  selectedStage === stage.num ? "bg-zinc-100 text-black border-white" : "hover:bg-zinc-900/50"
                )}
              >
                <span className={cn("text-[10px] font-black italic", selectedStage === stage.num ? "opacity-100" : "opacity-30")}>#{stage.num}</span>
                <span className="font-bold uppercase tracking-tight text-[10px] whitespace-nowrap">{stage.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-6">
        {activeTasks.length > 0 ? (
          activeTasks
            .filter(task => !selectedStage || (task.triagem_stage || 1) === selectedStage)
            .map((task) => {
              const taskDate = parseISO(task.data_execucao);
              const isOverdue = !task.status_concluido && (
                isBefore(taskDate, startOfToday()) || 
                (task.hora_vencimento ? isBefore(parseISO(task.hora_vencimento), new Date()) : 
                 (isToday(taskDate) && task.lembrete && (() => {
                    const [hours, minutes] = task.lembrete.split(':').map(Number);
                    const taskTime = new Date();
                    taskTime.setHours(hours, minutes, 0, 0);
                    return isBefore(taskTime, new Date());
                  })())
                )
              );

              return (
                <Card key={task.id} className={cn(
                  "bg-zinc-950/30 border p-3 rounded-xl flex flex-col justify-between group transition-all gap-2",
                  isOverdue ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.05)]" : "border-zinc-900/50 hover:border-zinc-800"
                )}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailTask(task)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setDetailTask(task); }}
                    className="flex flex-col gap-1.5 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[7px] font-black uppercase px-1 py-0.5 border rounded-sm", 
                          task.prioridade === 1 ? "text-red-500 border-red-500/20 bg-red-500/5" :
                          task.prioridade === 2 ? "text-orange-500 border-orange-500/20 bg-orange-500/5" :
                          task.prioridade === 3 ? "text-blue-500 border-blue-500/20 bg-blue-500/5" :
                          "text-zinc-600 border-zinc-900"
                        )}>
                          P{task.prioridade || 4}
                        </span>
                        
                        <div className="flex border border-zinc-900/30 bg-black/40 p-0.5 rounded-md">
                          {[1, 2, 3, 4].map((s) => (
                            <button
                              key={s}
                              aria-label={`Mover para estágio ${s}`}
                              onClick={(e) => { e.stopPropagation(); updateTriagemStage(task.id, s); }}
                              className={cn(
                                "w-4 h-4 text-[7px] font-black flex items-center justify-center rounded-sm transition-all",
                                (task.triagem_stage || 1) === s 
                                  ? "bg-zinc-100 text-black" 
                                  : "text-zinc-700 hover:text-zinc-400"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {isOverdue && (
                        <span className="text-[7px] font-black uppercase text-red-500 animate-pulse flex items-center gap-1 bg-red-500/10 px-1 py-0.5 rounded border border-red-500/20">
                          Atrasada
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-base uppercase tracking-tight truncate leading-none mb-1">
                        {task.titulo}
                      </h3>
                      
                      {task.descricao && (
                        <p className="text-zinc-600 text-[8px] font-medium uppercase leading-tight line-clamp-1 italic opacity-70">
                          {task.descricao}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[8px] font-black uppercase flex items-center gap-1 px-1.5 py-0.5 rounded-sm border",
                          isOverdue ? "text-red-500 border-red-500/20 bg-red-500/5" : "text-zinc-400 border-zinc-900 bg-zinc-900/30"
                        )}>
                          <Calendar size={8} /> 
                          {formatDate(taskDate, "d MMM", { locale: ptBR }).toUpperCase()}
                          {task.lembrete && ` • ${task.lembrete}`}
                        </span>

                        {task.repeticao && task.repeticao !== 'none' && (
                          <span className="text-[7px] font-black uppercase text-zinc-600 flex items-center gap-1 border border-zinc-900/50 px-1 py-0.5 rounded-sm">
                            <Clock size={8} /> {task.repeticao === 'daily' ? 'DIÁRIO' : 'SEMANAL'}
                          </span>
                        )}
                      </div>
                      
                      {isOverdue && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 px-1.5 text-[7px] font-black uppercase text-[#00ff41] hover:bg-[#00ff41]/10 border border-[#00ff41]/20 rounded-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            rescheduleTask(task, new Date().toISOString().split('T')[0]);
                          }}
                        >
                          Reagendar
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5 pt-2 border-t border-zinc-900/50">
                    <Button 
                      aria-label="Concluir tarefa"
                      size="sm"
                      className="bg-zinc-100 text-black hover:bg-white font-bold rounded-lg flex-1 h-8 transition-all active:scale-95"
                      onClick={() => completeTask(task)}
                    >
                      <Check size={14} className="mr-1" />
                      <span className="text-[8px] font-black uppercase">Concluir</span>
                    </Button>
                    <Button 
                      aria-label="Mover para Hoje"
                      size="sm"
                      className="bg-zinc-900 text-zinc-400 hover:text-zinc-100 text-[8px] font-bold uppercase rounded-lg border border-zinc-800 h-8 px-2 transition-all"
                      onClick={() => {
                        moveTask(task.id, 'Hoje');
                        navigate({ to: '/' });
                      }}
                    >
                      Hoje
                    </Button>
                    <Button 
                      aria-label="Deletar registro"
                      size="icon"
                      variant="ghost"
                      className="text-zinc-800 hover:text-red-500 h-8 w-8"
                      onClick={() => deletePermanent(task.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })
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

      <Button
        onClick={() => setIsAddingTask(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-black border-2 border-[#ff00ff] text-[#ff00ff] shadow-[0_0_20px_rgba(255,0,255,0.4)] hover:scale-110 hover:bg-[#ff00ff] hover:text-black transition-all z-50 flex items-center justify-center p-0"
        aria-label="Adicionar nova tarefa"
      >
        <Plus size={32} strokeWidth={3} />
      </Button>
    </div>
  );
}
