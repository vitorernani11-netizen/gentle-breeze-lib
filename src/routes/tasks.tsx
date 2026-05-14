import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
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
import { SmartInput } from '@/components/tasks/SmartInput';

const TASKS_KEY = 'hardware_humano_data';

export const Route = createFileRoute('/tasks')({
  component: TasksPage,
});

function TasksPage() {
  const navigate = useNavigate();
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  

  const { moveTask, updateTriagemStage, restoreTask, deletePermanent, completeTask } = useTaskActions(() => {
    fetchTasks();
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
  }) => {
    try {
      const task = {
        id: crypto.randomUUID(),
        titulo: taskData.titulo,
        descricao: '',
        repeticao: taskData.recorrencia,
        data_execucao: taskData.vencimento,
        prioridade: taskData.prioridade,
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
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 sm:p-6 pt-24 pb-20 font-mono">
      <div className="fixed top-6 right-6 flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800 z-50">
        <WifiOff size={14} className="text-zinc-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Hardware Local</span>
      </div>

      <header className="mb-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            aria-label="Voltar para Dashboard"
            variant="ghost" 
            size="icon" 
            onClick={() => navigate({ to: '/' })} 
            className="border-2 border-white rounded-none hover:bg-white hover:text-black transition-none w-12 h-12 shrink-0"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic">Entrada</h1>
        </div>
      </header>

      <SmartInput onAddTask={onSmartAddTask} />


      {/* Triagem Section */}
      <section className="mb-12">
        <div className="border-4 border-white p-4 sm:p-6 bg-zinc-950">
          <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-white mb-6 flex items-center gap-2">
            <AlertCircle size={14} className="text-[#ff00ff]" />
            REGISTRAR: Triagem de Atividades
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {triagemStages.map((stage) => (
              <button 
                key={stage.num} 
                onClick={() => setSelectedStage(selectedStage === stage.num ? null : stage.num)}
                className={cn(
                  "border-2 p-3 sm:p-4 flex flex-col gap-1 transition-all text-left", 
                  stage.color,
                  selectedStage === stage.num ? "bg-white text-black scale-105 z-10" : "hover:border-[#00ff41] hover:bg-zinc-900"
                )}
              >
                <div className="flex justify-between items-center">
                  <span className={cn("text-xl sm:text-2xl font-black italic", selectedStage === stage.num ? "opacity-100" : "opacity-50")}>#{stage.num}</span>
                  {selectedStage === stage.num && <Check size={16} className="text-[#00ff41]" />}
                </div>
                <span className="font-black uppercase tracking-tighter text-[10px] sm:text-sm">{stage.label}</span>
                <span className={cn("text-[8px] sm:text-[9px] uppercase font-bold", selectedStage === stage.num ? "text-zinc-500" : "text-zinc-500")}>{stage.desc}</span>
              </button>
            ))}
          </div>
          {selectedStage && (
            <button 
              onClick={() => setSelectedStage(null)}
              className="mt-4 text-[10px] font-black uppercase text-[#00ff41] hover:underline"
            >
              [ Limpar Filtro de Triagem ]
            </button>
          )}
        </div>
      </section>

      <div className="space-y-6">
        {activeTasks.length > 0 ? (
          activeTasks
            .filter(task => !selectedStage || (task.triagem_stage || 1) === selectedStage)
            .map((task) => (
            <Card key={task.id} className="bg-zinc-950 border-2 border-white p-4 sm:p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between group hover:border-[#00ff41] transition-none relative overflow-hidden gap-6">
              {task.prioridade === 1 && (
                <div className="absolute top-0 left-0 w-1 sm:w-2 h-full bg-[#ff0055]" />
              )}
              
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 border", getPriorityColor(task.prioridade))}>
                    P{task.prioridade || 4}
                  </span>
                  
                  {/* Triagem Stage Selector */}
                  <div className="flex border border-zinc-800 bg-zinc-900 p-0.5 rounded-none">
                    {[1, 2, 3, 4].map((s) => (
                      <button
                        key={s}
                        aria-label={`Mover para estágio ${s}`}
                        onClick={() => updateTriagemStage(task.id, s)}
                        className={cn(
                          "w-5 h-5 text-[8px] font-black flex items-center justify-center transition-none",
                          (task.triagem_stage || 1) === s 
                            ? "bg-white text-black" 
                            : "text-zinc-600 hover:text-white"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {task.repeticao !== 'none' && (
                    <span className="text-[9px] font-black uppercase bg-zinc-900 text-zinc-400 px-2 py-0.5 border border-zinc-800 flex items-center gap-1">
                      <Clock size={10} /> {task.repeticao === 'daily' ? 'DIÁRIO' : 'SEMANAL'}
                    </span>
                  )}
                </div>
                
                <h3 className="font-black text-xl sm:text-2xl uppercase italic tracking-tighter truncate leading-none">
                  {task.titulo}
                </h3>
                
                {task.descricao && (
                  <p className="text-zinc-500 text-[10px] font-bold uppercase leading-tight line-clamp-2 italic">
                    {task.descricao}
                  </p>
                )}
                
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[9px] font-black text-zinc-600 uppercase flex items-center gap-1">
                    <Calendar size={10} /> {task.data_execucao}
                  </span>
                  {task.lembrete && (
                    <span className="text-[9px] font-black text-[#00ff41] uppercase flex items-center gap-1">
                      <Clock size={10} /> {task.lembrete}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 sm:shrink-0 h-12">
                <Button 
                  aria-label="Concluir tarefa"
                  size="icon"
                  className="bg-[#00ff41] text-black hover:bg-green-400 font-black rounded-none border-b-4 border-r-4 border-green-900 w-12 h-12 transition-none"
                  onClick={() => completeTask(task)}
                >
                  <Check size={20} />
                </Button>
                <Button 
                  aria-label="Mover para Hoje"
                  className="bg-white text-black hover:bg-[#ff00ff] hover:text-white text-[10px] font-black uppercase rounded-none border-b-4 border-r-4 border-zinc-400 h-12 px-4 transition-none"
                  onClick={() => moveTask(task.id, 'Hoje')}
                >
                  Hoje
                </Button>
                <Button 
                  aria-label="Deletar registro"
                  size="icon"
                  className="bg-zinc-900 text-zinc-500 hover:bg-[#ff0055] hover:text-white text-[10px] font-black uppercase rounded-none border-2 border-zinc-800 w-12 h-12 transition-none"
                  onClick={() => deletePermanent(task.id)}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </Card>
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
    </div>
  );
}
