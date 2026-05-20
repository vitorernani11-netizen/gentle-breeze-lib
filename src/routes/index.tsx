import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Calendar, 
  Check, 
  Hash, 
  RotateCcw, 
  Clock, 
  ChevronRight,
  Filter,
  ArrowRight,
  GraduationCap,
  AlertCircle,
  Droplets,
  Dumbbell,
  Bell,
  PowerOff,
  Zap,
  Moon,
  Bed,
  Info,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useTaskActions } from '@/hooks/useTaskActions';
import { differenceInDays, parseISO, format, isWithinInterval, setHours, setMinutes, addDays, isAfter, subDays, isBefore } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { saveToLocal, loadFromLocal } from '@/lib/storage';
import { EisenhowerMatrix } from '@/components/dashboard/EisenhowerMatrix';

import { TaskCard } from '@/components/tasks/TaskCard';
import { AddTaskOverlay } from '@/components/tasks/AddTaskOverlay';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { TodayContextGroup } from '@/components/tasks/TodayContextGroup';
import { getTodayStr } from '@/utils/dateHelpers';



const TASKS_KEY = 'hardware_humano_data';
const PROJECTS_KEY = 'hardware_humano_projects';
const HYDRATION_KEY = 'hardware_humano_hydration';
const CHECKIN_KEY = 'hardware_humano_checkin';
const ANXIETY_KEY = 'hardware_humano_anxiety';
const SLEEP_EVENTS_KEY = 'hardware_humano_sleep_events';
const ACADEMIC_KEY = 'hardware_humano_academic';
const FINANCE_KEY = 'hardware_humano_finance';
const SOCIAL_KEY = 'hardware_humano_social';

const safeParseDate = (value: unknown) => {
  try {
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value !== 'string' || !value.trim()) return null;
    const parsed = parseISO(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

const isTaskOverdue = (dueDateStr: string, dueTimeStr?: string | null) => {
  if (!dueDateStr) return false;

  try {
    const now = new Date();
    let dateOnly = dueDateStr.split('T')[0];
    let ano = now.getFullYear();
    let mes = now.getMonth() + 1;
    let dia = now.getDate();

    // Suporta DD/MM/YYYY e YYYY-MM-DD
    if (dateOnly.includes('/')) {
      const parts = dateOnly.split('/');
      if (parts[2].length === 4) {
        dia = parseInt(parts[0], 10); mes = parseInt(parts[1], 10); ano = parseInt(parts[2], 10);
      } else {
        ano = parseInt(parts[0], 10); mes = parseInt(parts[1], 10); dia = parseInt(parts[2], 10);
      }
    } else if (dateOnly.includes('-')) {
      const parts = dateOnly.split('-');
      ano = parseInt(parts[0], 10); mes = parseInt(parts[1], 10); dia = parseInt(parts[2], 10);
    }

    // Padrão para tarefas SEM horário: fim do dia (23:59:59) para não atrasar antes da hora
    let hora = 23; let minuto = 59; let segundo = 59;

    // Se tiver horário estrito (ex: 18:00)
    if (dueTimeStr && dueTimeStr.trim() !== '') {
      const timeParts = dueTimeStr.split(':');
      hora = parseInt(timeParts[0], 10);
      minuto = parseInt(timeParts[1], 10);
      segundo = 0;
    }

    // Cria o objeto de data EXATAMENTE no fuso horário local do aparelho
    const targetDateTime = new Date(ano, mes - 1, dia, hora, minuto, segundo);

    // Se o tempo da tarefa já passou em relação ao relógio do aparelho, TRUE (Atrasada)
    return targetDateTime.getTime() < now.getTime();
  } catch (e) {
    console.error("Erro no cálculo do timestamp:", e);
    return false;
  }
};


export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckin, setShowCheckin] = useState(false);
  
  const [detailTask, setDetailTask] = useState<any | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'INTERVAL' | 'POST18' | 'DELAYED'>('ALL');

  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [academicUrgent, setAcademicUrgent] = useState<any[]>([]);
  const [eliminatedCount, setEliminatedCount] = useState(0);
  const [hydration, setHydration] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [anxietyContent, setAnxietyContent] = useState('');
  const [sleepHistory, setSleepHistory] = useState<any[]>([]);
  const [hoursSleptToday, setHoursSleptToday] = useState<number | null>(null);
  const [isSilenced, setIsSilenced] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  
  const [stats, setStats] = useState({
    positive: 0,
    negative: 0,
    careerSpeed: 0
  });
  
  const [checkin, setCheckin] = useState({
    horas_sono: '',
    marmitas_prontas: false,
    treino_madrugada_realizado: false,
  });


  const { completeTask, deletePermanent, moveTask, updateTriagemStage, updateTask, addTask } = useTaskActions(() => {
    fetchData();
  });

  useEffect(() => {
    const checkLockStatus = () => {
      setIsLocked(false);
    };

    checkLockStatus();
    const interval = setInterval(checkLockStatus, 60000);
    return () => clearInterval(interval);
  }, [showCheckin]);

  useEffect(() => {
    checkTodayCheckin();
    fetchData();
    setLoading(false);

    const handleStorageChange = () => {
      console.log('[Hardware:Sync] Storage change detected on Dashboard');
      fetchData();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSaveAnxietyDump = () => {
    if (!anxietyContent.trim()) return;
    
    try {
      const dumps = loadFromLocal(ANXIETY_KEY) || [];
      dumps.push({ id: crypto.randomUUID(), conteudo: anxietyContent, created_at: new Date().toISOString() });
      saveToLocal(ANXIETY_KEY, dumps);
      
      setAnxietyContent('');
      toast.success('Descarregado. Agora descanse.');
    } catch (error) {
      console.error('Erro ao salvar anxiety dump:', error);
      toast.error('Erro ao salvar no hardware');
    }
  };

  const fetchData = () => {
    const today = getTodayStr();
    const sevenDaysAgo = subDays(new Date(), 7);
    
    // Helper para validação de data segura contra dados antigos/corrompidos
    const isValidDate = (d: any) => Boolean(safeParseDate(d));

    const allTasks = (loadFromLocal(TASKS_KEY) || []).filter((t: any) => isValidDate(t.created_at || t.data_execucao)).map((t: any) => {
      // Migration: ensure fase_pipeline and priority string
      if (t.fase_pipeline === undefined) {
        t.fase_pipeline = t.triagem_stage || (typeof t.prioridade === 'number' ? t.prioridade : 1);
      }
      if (typeof t.prioridade === 'number') {
        t.prioridade = `P${t.prioridade}`;
      }
      return t;
    });
    
    // Pegamos todas as tarefas não concluídas para que os filtros (especialmente o de Atrasadas) funcionem globalmente
    const activeTasks = allTasks.filter((t: any) => !t.status_concluido);
    setTasks(activeTasks);

    const projectsData = loadFromLocal(PROJECTS_KEY) || [];
    setProjects(projectsData);

    const inertiaDeletions = allTasks.filter((t: any) => t.deletado_por_inercia).length;
    setEliminatedCount(inertiaDeletions);

    const academicData = (loadFromLocal(ACADEMIC_KEY) || []).filter((a: any) => isValidDate(a.data_entrega));
    const urgentAcademic = academicData.filter((a: any) => {
      if (a.concluido) return false;
      try {
        const deliveryDate = safeParseDate(a.data_entrega);
        if (!deliveryDate) return false;
        const days = differenceInDays(deliveryDate, new Date());
        return days <= 1;
      } catch (e) { return false; }
    });
    setAcademicUrgent(urgentAcademic);

    const hydrationData = (loadFromLocal(HYDRATION_KEY) || []).filter((h: any) => isValidDate(h.data));
    const todayHydration = hydrationData.find((h: any) => h.data === getTodayStr());
    setHydration(todayHydration ? todayHydration.quantidade_ml : 0);

    const checkinHistory = (loadFromLocal(CHECKIN_KEY) || []).filter((c: any) => isValidDate(c.data));
    const sortedCheckins = [...checkinHistory]
      .filter((d: any) => d && d.data && typeof d.data === 'string')
      .sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 7);
    const history = [...sortedCheckins].reverse().map((d: any) => {
      let name = '??';
      try {
        if (d.data) {
          const parsedDate = safeParseDate(d.data);
          name = parsedDate ? format(parsedDate, 'dd/MM') : '??';
        }
      } catch (e) {
        console.error('Erro ao formatar data do checkin:', d.data);
      }
      return {
        name,
        hours: d.hours || d.horas_sono || 0
      };
    });
    setSleepHistory(history);
    
    const currentCheckin = checkinHistory.find((d: any) => d.data === getTodayStr());
    if (currentCheckin) {
      setHoursSleptToday(currentCheckin.horas_sono);
      setIsRecoveryMode(currentCheckin.horas_sono !== null && currentCheckin.horas_sono < 6);
    }

    const completedLast7 = allTasks.filter((t: any) => {
      const parsedDate = safeParseDate(t?.updated_at || t?.created_at);
      return t && t.status_concluido && parsedDate && isAfter(parsedDate, sevenDaysAgo);
    });
    const positiveTasks = completedLast7.filter((t: any) => {
      const proj = projectsData.find((p: any) => p.id === t.projeto_id);
      return proj?.nome === 'Vitor Ernani' || proj?.nome === 'Faculdade' || t.tags?.includes('Vitor Ernani') || t.tags?.includes('Faculdade');
    }).length;
    
    const trainingCount = sortedCheckins.filter((s: any) => s.treino_madrugada_realizado).length;
    const goodSleepCount = sortedCheckins.filter((s: any) => s.horas_sono && s.horas_sono >= 7).length;
    
    const financeRecords = (loadFromLocal(FINANCE_KEY) || []).filter((f: any) => isValidDate(f.data));
    const expenses7 = financeRecords.filter((f: any) => {
      const parsedDate = safeParseDate(f?.data);
      return f && f.tipo === 'Saida' && parsedDate && isAfter(parsedDate, sevenDaysAgo);
    });
    const expenseTotal = expenses7.reduce((acc: number, curr: any) => acc + Number(curr.valor), 0);
    
    const socialUsage = (loadFromLocal(SOCIAL_KEY) || []).filter((s: any) => isValidDate(s.data));
    const social7 = socialUsage.filter((s: any) => {
      const parsedDate = safeParseDate(s?.data);
      return s && parsedDate && isAfter(parsedDate, sevenDaysAgo);
    });
    const socialHours = social7.reduce((acc: number, curr: any) => acc + curr.minutos, 0) / 60;
    
    setStats({
      positive: positiveTasks + trainingCount + goodSleepCount,
      negative: inertiaDeletions + Math.floor(expenseTotal / 100) + Math.floor(socialHours),
      careerSpeed: Math.min(100, (((positiveTasks * 500)) / 7000) * 100)
    });

    const silentUntil = loadFromLocal('hardware_humano_silence');
    const silentDate = safeParseDate(silentUntil);
    setIsSilenced(Boolean(silentDate && isAfter(silentDate, new Date())));
  };

  const handleSleepNow = () => {
    try {
      let targetDate = setHours(setMinutes(new Date(), 0), 5);
      if (new Date().getHours() >= 5) targetDate = addDays(targetDate, 1);

      saveToLocal('hardware_humano_silence', targetDate.toISOString());
      
      const events = loadFromLocal(SLEEP_EVENTS_KEY) || [];
      events.push({ id: crypto.randomUUID(), inicio_sono: new Date().toISOString() });
      saveToLocal(SLEEP_EVENTS_KEY, events);

      setIsSilenced(true);
      toast.success('Modo Sono Ativado', {
        description: 'Notificações silenciadas até as 05:00.',
        icon: <Moon className="h-4 w-4" />
      });
    } catch (error) {
      toast.error('Erro ao salvar no hardware');
    }
  };

  const checkTodayCheckin = () => {
    const today = getTodayStr();
    const history = loadFromLocal(CHECKIN_KEY) || [];
    const done = history.find((h: any) => h.data === today);
    if (!done) setShowCheckin(true);
  };

  const handleSaveCheckin = () => {
    try {
      const today = getTodayStr();
      const history = loadFromLocal(CHECKIN_KEY) || [];
      const index = history.findIndex((h: any) => h.data === today);
      
      const data = {
        data: today,
        horas_sono: checkin.horas_sono ? parseFloat(checkin.horas_sono) : null,
        marmitas_prontas: checkin.marmitas_prontas,
        treino_madrugada_realizado: checkin.treino_madrugada_realizado,
      };

      if (index > -1) history[index] = data;
      else history.push(data);

      saveToLocal(CHECKIN_KEY, history);
      setShowCheckin(false);
      toast.success('Dia iniciado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar no hardware');
    }
  };


  const handleAddHydration = () => {
    try {
      const today = getTodayStr();
      const hydrationData = loadFromLocal(HYDRATION_KEY) || [];
      const index = hydrationData.findIndex((h: any) => h.data === today);
      
      const newTotal = hydration + 500;
      if (index > -1) hydrationData[index].quantidade_ml = newTotal;
      else hydrationData.push({ data: today, quantidade_ml: newTotal });

      saveToLocal(HYDRATION_KEY, hydrationData);
      setHydration(newTotal);
      toast.success('Hidratação registrada (+500ml)');
    } catch (error) {
      toast.error('Erro ao salvar no hardware');
    }
  };

  if (loading) return null;

  return (
    <div className={cn(
      "min-h-screen p-4 pt-12 pb-16 max-w-xl mx-auto transition-colors duration-1000",
      isRecoveryMode ? "bg-zinc-950 text-zinc-400 grayscale-[0.8]" : "bg-black text-zinc-100"
    )}>
      <div className="fixed top-4 right-4 flex items-center gap-2 bg-zinc-900/30 px-3 py-1 rounded-full border border-zinc-800/50 z-50">
        <WifiOff size={10} className="text-zinc-600" />
        <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">Local</span>
      </div>

      {isLocked && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <PowerOff size={48} className="text-zinc-900 mb-6 animate-pulse" />
          <h2 className="text-xl font-black tracking-tighter uppercase mb-2">Hardware exausto</h2>
          <p className="text-zinc-600 font-bold uppercase tracking-widest text-[10px] max-w-xs">
            PROJETO X: DESLIGAMENTO OBRIGATÓRIO.
          </p>
        </div>
      )}

      {/* Filtros de Janela de Tempo (Foco TDAH) */}
      <section className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Button
          onClick={() => setFilterMode('DELAYED')}
          className={cn(
            "h-10 px-4 rounded-none border-2 font-black uppercase text-[10px] tracking-widest transition-all",
            filterMode === 'DELAYED' 
              ? "bg-[#ff0055] text-black border-[#ff0055]" 
              : "bg-black text-[#ff0055] border-[#ff0055] hover:bg-[#ff0055]/10"
          )}
        >
          🔥 Atrasadas
        </Button>
        <Button
          onClick={() => setFilterMode('INTERVAL')}
          className={cn(
            "h-10 px-4 rounded-none border-2 font-black uppercase text-[10px] tracking-widest transition-all",
            filterMode === 'INTERVAL' 
              ? "bg-[#00ff41] text-black border-[#00ff41]" 
              : "bg-black text-[#00ff41] border-[#00ff41] hover:bg-[#00ff41]/10"
          )}
        >
          ⏱️ Intervalo
        </Button>
        <Button
          onClick={() => setFilterMode('POST18')}
          className={cn(
            "h-10 px-4 rounded-none border-2 font-black uppercase text-[10px] tracking-widest transition-all",
            filterMode === 'POST18' 
              ? "bg-[#ff00ff] text-black border-[#ff00ff]" 
              : "bg-black text-[#ff00ff] border-[#ff00ff] hover:bg-[#ff00ff]/10"
          )}
        >
          🌙 Pós-18h
        </Button>
        <Button
          onClick={() => setFilterMode('ALL')}
          className={cn(
            "h-10 px-4 rounded-none border-2 font-black uppercase text-[10px] tracking-widest transition-all",
            filterMode === 'ALL' 
              ? "bg-white text-black border-white" 
              : "bg-black text-white border-white hover:bg-white/10"
          )}
        >
          Ver Tudo
        </Button>
      </section>

      <section className="mb-8">
        {(() => {
          const today = getTodayStr();
          const now = new Date();

          // Filtering Reference and Non-execution items + Time filters
          const tarefasDeHoje = tasks.filter(t => {
            const isReference = t.tags?.some((tag: string) => 
              tag.toLowerCase().includes('referência') || 
              tag.toLowerCase().includes('referencia') || 
              tag.toLowerCase().includes('wishlist') ||
              tag.toLowerCase().includes('leitura') ||
              tag.toLowerCase().includes('ideia')
            ) || t.status === 'Referência';
            
            if (isReference) return false;

            const taskDateStr = (t.data_execucao || t.data_vencimento)?.split('T')[0];
            const isToday = taskDateStr === today;
            const atrasada = isTaskOverdue(t.data_execucao || t.data_vencimento, t.hora_vencimento || t.lembrete);
            
            // Se for atrasada (de hoje ou antes), incluímos para o filtro de atrasadas
            if (atrasada) return true;
            
            // Senão, incluímos apenas se for hoje
            return isToday;
          });

          const executionTasks = tarefasDeHoje.filter((tarefa) => {
            // 1. Calcula se a tarefa está estritamente atrasada (passou do horário atual)
            const atrasada = isTaskOverdue(tarefa.data_execucao || tarefa.data_vencimento, tarefa.hora_vencimento || tarefa.lembrete);
            
            // 2. Extrai a hora numérica de forma isolada e segura
            let horaTarefa = -1;
            const dueTime = tarefa.hora_vencimento || tarefa.lembrete;
            if (dueTime && typeof dueTime === 'string') {
              const [horaStr] = dueTime.split(':');
              horaTarefa = parseInt(horaStr, 10);
            }

            // REGRA DE OURO 1: Se o usuário clicou na aba "ATRASADAS", só entram tarefas vencidas
            if (filterMode === 'DELAYED') {
              return atrasada === true;
            }

            // REGRA DE OURO 2: Para as abas normais (INTERVALO, PÓS-18H), tarefas já atrasadas DEVEM SUMIR 
            // (elas migram automaticamente para a aba ATRASADAS para limpar o fluxo)
            if (atrasada) {
              return false;
            }

            // REGRA DE OURO 3: Roteamento por faixa de horário estrita (Tarefas no prazo)
            if (filterMode === 'INTERVAL') {
              // Entra estritamente se for 12:00 até 13:59 e NÃO estiver atrasada
              return horaTarefa >= 12 && horaTarefa < 14;
            }

            if (filterMode === 'POST18') {
              // Entra estritamente se for de 18:00 até 23:59 e NÃO estiver atrasada
              return horaTarefa >= 18 && horaTarefa <= 23;
            }

            if (filterMode === 'ALL') {
              // A aba global mostra todas as tarefas ativas do dia atual (no prazo ou atrasadas de hoje)
              return true;
            }

            return true;
          });

          // Grouping logic based on Projects
          const groupedTasks: Record<string, { title: string, color: string, tasks: any[] }> = {
            'faculdade': { title: '#FACULDADE / CURSOS', color: '#00ff41', tasks: [] },
            'esfiha': { title: '#ESFIHA', color: '#ffaa00', tasks: [] },
            'riolax': { title: '#RIOLAX', color: '#00ccff', tasks: [] },
            'youtube': { title: '#YOUTUBE DARK', color: '#ff0055', tasks: [] },
            'gestao': { title: '#VITOR ERNANI', color: '#ff00ff', tasks: [] },
            'outros': { title: '#OUTROS PROJETOS', color: '#a1a1aa', tasks: [] }
          };

          executionTasks.forEach(t => {
            const proj = projects.find(p => p.id === t.projeto_id);
            const projName = proj?.nome?.toLowerCase() || '';
            const tags = t.tags?.map((tag: string) => tag.toLowerCase()) || [];

            if (projName.includes('faculdade') || projName.includes('curso') || tags.includes('faculdade')) {
              groupedTasks.faculdade.tasks.push(t);
            } else if (projName.includes('esfiha')) {
              groupedTasks.esfiha.tasks.push(t);
            } else if (projName.includes('riolax')) {
              groupedTasks.riolax.tasks.push(t);
            } else if (projName.includes('youtube')) {
              groupedTasks.youtube.tasks.push(t);
            } else if (projName.includes('gestão') || projName.includes('pessoal') || projName.includes('casa') || projName.includes('vitor') || projName.includes('ernani')) {
              groupedTasks.gestao.tasks.push(t);
            } else {
              groupedTasks.outros.tasks.push(t);
            }
          });

          // Apply Filter Mode (already filtered executionTasks, but some modes have specific grouping)
          let finalGroups = { ...groupedTasks };

          if (filterMode === 'INTERVAL' || filterMode === 'POST18' || filterMode === 'DELAYED') {
            finalGroups = groupedTasks;
          }

          const hasAnyTasks = Object.values(finalGroups).some(g => g.tasks.length > 0);

          return hasAnyTasks ? (
            <div className="space-y-4">
              {Object.entries(finalGroups).map(([key, group]) => (
                <TodayContextGroup
                  key={key}
                  title={group.title}
                  color={group.color}
                  tasks={group.tasks}
                  onTaskClick={setDetailTask}
                  onComplete={completeTask}
                  onMoveToToday={(id) => moveTask(id, 'Hoje')}
                  onDelete={deletePermanent}
                  onUpdateStage={updateTriagemStage}
                  onUpdatePriority={(id, p) => updateTask(id, { prioridade: p })}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center border-4 border-dashed border-zinc-900">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-800">Pipeline Vazio para este filtro</p>
            </div>
          );
        })()}
      </section>



      {detailTask && (
        <TaskDetailModal 
          task={detailTask}
          open={!!detailTask}
          onClose={() => setDetailTask(null)}
          onUpdate={updateTask}
        />
      )}
    </div>
  );
}
