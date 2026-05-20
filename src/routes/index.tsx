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
  
  const agora = new Date();
  const anoStr = String(agora.getFullYear());
  const mesStr = String(agora.getMonth() + 1).padStart(2, '0');
  const diaStr = String(agora.getDate()).padStart(2, '0');
  const hojeNum = parseInt(`${anoStr}${mesStr}${diaStr}`, 10); // Ex: 20260519

  // Normaliza a data da tarefa para YYYYMMDD
  let limpa = dueDateStr.split('T')[0].replace(/[-/]/g, '');
  if (limpa.length === 8 && dueDateStr.includes('/')) {
    // Se veio como DDMMYYYY, inverte para YYYYMMDD
    limpa = `${limpa.substring(4, 8)}${limpa.substring(2, 4)}${limpa.substring(0, 2)}`;
  }
  const tarefaNum = parseInt(limpa, 10);

  if (tarefaNum < hojeNum) return true;  // Passado histórico
  if (tarefaNum > hojeNum) return false; // Futuro

  // Se for exatamente o mesmo dia (hojeNum === tarefaNum)
  if (dueTimeStr) {
    const [h, m] = dueTimeStr.split(':').map(Number);
    const tempoTarefa = h * 100 + m;
    const tempoAtual = agora.getHours() * 100 + agora.getMinutes();
    return tempoAtual > tempoTarefa;
  }
  return false;
};

const isTaskFromToday = (dueDateStr: string) => {
  if (!dueDateStr) return false;
  const today = getTodayStr(); // 'YYYY-MM-DD'
  const dateOnly = dueDateStr.split('T')[0];
  
  // Normalizar para YYYY-MM-DD se estiver em outro formato (DD/MM/YYYY)
  let normalizedDate = dateOnly;
  if (dateOnly.includes('/')) {
    const parts = dateOnly.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else {
        normalizedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }
  
  return normalizedDate === today;
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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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
      <div className="fixed top-4 right-4 flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800/50 z-50 backdrop-blur-md">
        <WifiOff size={12} className="text-zinc-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Offline Local</span>
      </div>

      {isLocked && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <PowerOff size={48} className="text-zinc-900 mb-6 animate-pulse" />
          <h2 className="text-2xl font-black tracking-tighter uppercase mb-2">Hardware exausto</h2>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-xs leading-relaxed">
            PROJETO X: DESLIGAMENTO OBRIGATÓRIO PARA PRESERVAÇÃO.
          </p>
        </div>
      )}

      {/* Filtros de Janela de Tempo (Foco TDAH) */}
      <section className="mb-8 sticky top-0 z-40 bg-black/80 backdrop-blur-md pt-2 pb-4 border-b border-zinc-900/50">
        <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-none no-scrollbar">
          <Button
            onClick={() => setFilterMode('DELAYED')}
            className={cn(
              "h-12 px-6 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shrink-0 shadow-lg active:scale-95",
              filterMode === 'DELAYED' 
                ? "bg-[#ff0055] text-white border-none" 
                : "bg-zinc-900 text-[#ff0055] border border-[#ff0055]/20"
            )}
          >
            🔥 Atrasadas
          </Button>
          <Button
            onClick={() => setFilterMode('INTERVAL')}
            className={cn(
              "h-12 px-6 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shrink-0 shadow-lg active:scale-95",
              filterMode === 'INTERVAL' 
                ? "bg-[#00ff41] text-black border-none" 
                : "bg-zinc-900 text-[#00ff41] border border-[#00ff41]/20"
            )}
          >
            ⏱️ Intervalo
          </Button>
          <Button
            onClick={() => setFilterMode('POST18')}
            className={cn(
              "h-12 px-6 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shrink-0 shadow-lg active:scale-95",
              filterMode === 'POST18' 
                ? "bg-[#ff00ff] text-white border-none" 
                : "bg-zinc-900 text-[#ff00ff] border border-[#ff00ff]/20"
            )}
          >
            🌙 Pós-18h
          </Button>
          <Button
            onClick={() => setFilterMode('ALL')}
            className={cn(
              "h-12 px-6 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shrink-0 shadow-lg active:scale-95",
              filterMode === 'ALL' 
                ? "bg-white text-black border-none" 
                : "bg-zinc-900 text-white border border-white/20"
            )}
          >
            Ver Tudo
          </Button>
        </div>
      </section>

      <section className="mb-8">
        {(() => {
          // 1. Coleta tudo o que é de Hoje ou Atrasado Histórico
          const poolHoje = tasks.filter(t => {
            if (t.status_concluido) return false;
            const dataVenc = t.data_execucao || t.data_vencimento;
            if (!dataVenc) return false;
            
            const atrasada = isTaskOverdue(dataVenc, t.hora_vencimento || t.lembrete);
            
            // Checa se a data é hoje
            const now = new Date();
            const hojeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            let taskStr = dataVenc.split('T')[0].replace(/\//g, '-');
            if (taskStr.includes('-') && taskStr.split('-')[0].length !== 4) {
              const p = taskStr.split('-');
              taskStr = `${p[2]}-${p[1]}-${p[0]}`;
            }
            
            return taskStr === hojeStr || atrasada;
          });

          // 2. Separação Absoluta de Abas
          const executionTasks = poolHoje.filter(t => {
            const dataVenc = t.data_execucao || t.data_vencimento;
            const atrasada = isTaskOverdue(dataVenc, t.hora_vencimento || t.lembrete);
            
            let hora = -1;
            const dueTime = t.hora_vencimento || t.lembrete;
            if (dueTime) {
              hora = parseInt(dueTime.split(':')[0], 10);
            }

            if (filterMode === 'DELAYED') return atrasada === true;
            if (atrasada) return false; // Se está atrasada, some das abas de tempo real

            if (filterMode === 'INTERVAL') return hora >= 12 && hora < 14;
            if (filterMode === 'POST18') return hora >= 18;
            
            // VER TUDO
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
            const tags = (t.tags || []).map((tag: any) => String(tag).toLowerCase());

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

          // Apply Filter Mode (already filtered executionTasks)
          const finalGroups = groupedTasks;

          const hasAnyTasks = Object.values(finalGroups).some(g => g.tasks.length > 0);

          return hasAnyTasks ? (
            <div className="space-y-4">
              {Object.entries(finalGroups).map(([key, group]) => (
                <TodayContextGroup
                  key={key}
                  title={group.title}
                  color={group.color}
                  tasks={group.tasks}
                  onTaskClick={(t) => {
                    setDetailTask(t);
                    setIsDetailOpen(true);
                  }}
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
          open={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setDetailTask(null);
            fetchData();
          }}
          onUpdate={updateTask}
        />
      )}
    </div>
  );
}
