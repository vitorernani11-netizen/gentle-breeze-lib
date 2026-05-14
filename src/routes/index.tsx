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
import { differenceInDays, parseISO, format, isWithinInterval, setHours, setMinutes, addDays, isAfter, subDays } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { saveToLocal, loadFromLocal } from '@/lib/storage';

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

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
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

  const [newTask, setNewTask] = useState({
    titulo: '',
    projeto_id: '',
    data_execucao: new Date().toISOString().split('T')[0],
    repeticao: 'none',
    tags: '',
    lembrete_ead_48h: false
  });

  const { completeTask } = useTaskActions(() => {
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
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = subDays(new Date(), 7);
    
    // Helper para validação de data segura contra dados antigos/corrompidos
    const isValidDate = (d: any) => Boolean(safeParseDate(d));

    const allTasks = (loadFromLocal(TASKS_KEY) || []).filter((t: any) => isValidDate(t.created_at || t.data_execucao));
    const todayTasks = allTasks.filter((t: any) => !t.status_concluido);
    setTasks(todayTasks);

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
    const todayHydration = hydrationData.find((h: any) => h.data === today);
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
    
    const currentCheckin = checkinHistory.find((d: any) => d.data === today);
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
      return proj?.nome === 'Nabih' || proj?.nome === 'Faculdade' || t.tags?.includes('Nabih') || t.tags?.includes('Faculdade');
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
    const today = new Date().toISOString().split('T')[0];
    const history = loadFromLocal(CHECKIN_KEY) || [];
    const done = history.find((h: any) => h.data === today);
    if (!done) setShowCheckin(true);
  };

  const handleSaveCheckin = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
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

  const handleCreateTask = () => {
    if (!newTask.titulo) return;

    try {
      const tagsString = String(newTask.tags || '');
      const tagsArray = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t !== '') : [];
      const task = {
        id: crypto.randomUUID(),
        titulo: newTask.titulo,
        projeto_id: newTask.projeto_id !== 'none' ? newTask.projeto_id : null,
        data_execucao: newTask.data_execucao,
        repeticao: newTask.repeticao,
        tags: tagsArray,
        lembrete_ead_48h: newTask.lembrete_ead_48h,
        lembrete: null, // Initial support for manual tasks from main dashboard
        hora_vencimento: null,
        status: 'Entrada',
        status_concluido: false,
        created_at: new Date().toISOString()
      };

      const allTasks = loadFromLocal(TASKS_KEY) || [];
      saveToLocal(TASKS_KEY, [task, ...allTasks]);

      setShowAddTask(false);
      setNewTask({
        titulo: '',
        projeto_id: 'none',
        data_execucao: new Date().toISOString().split('T')[0],
        repeticao: 'none',
        tags: '',
        lembrete_ead_48h: false
      });
      toast.success('Tarefa enviada para Entrada');
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar no hardware');
    }
  };

  const handleAddHydration = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
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

      <section className="mb-8">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-zinc-900/20 border-zinc-800/50 rounded-2xl border-t-2 border-t-emerald-500/50">
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500/70 block mb-1">Impacto</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">{stats.positive}</span>
              <span className="text-[8px] font-bold text-zinc-600 uppercase">PTS</span>
            </div>
          </Card>
          
          <Card className="p-4 bg-zinc-900/20 border-zinc-800/50 rounded-2xl border-t-2 border-t-red-500/50">
            <span className="text-[9px] font-bold uppercase tracking-wider text-red-500/70 block mb-1">Vazamentos</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">{stats.negative}</span>
              <span className="text-[8px] font-bold text-zinc-600 uppercase">PTS</span>
            </div>
          </Card>
        </div>
      </section>

      <section className="mb-8">
        <Card className="p-5 bg-zinc-950 border-zinc-900 rounded-2xl overflow-hidden">
          <div className="flex justify-between items-end mb-3">
            <div>
              <h2 className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mb-0.5">Progresso Carreira</h2>
              <span className="text-sm font-bold tracking-tight text-zinc-300">Target R$ 7k</span>
            </div>
            <span className="text-lg font-black text-blue-500/80">{stats.careerSpeed.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-900/50 rounded-full overflow-hidden border border-zinc-800/30">
            <div 
              className="h-full bg-blue-600/80 rounded-full transition-all duration-1000" 
              style={{ width: `${stats.careerSpeed}%` }}
            />
          </div>
        </Card>
      </section>

      <section className="mb-8">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4 px-2">Hardware: Execução</h3>
        <div className="space-y-2">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <Card key={task.id} className="p-4 bg-zinc-900/20 border-zinc-800/50 rounded-2xl flex items-center justify-between group">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold uppercase tracking-tight text-zinc-200">{task.titulo}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-zinc-600 uppercase">P{task.prioridade || 4}</span>
                    {task.lembrete && (
                      <span className="text-[8px] font-black text-blue-500 uppercase flex items-center gap-1">
                        <Clock size={8} /> {task.lembrete}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  size="icon" 
                  className="h-8 w-8 rounded-full bg-zinc-100 text-black hover:bg-white transition-all active:scale-90"
                  onClick={() => completeTask(task)}
                >
                  <Check size={14} />
                </Button>
              </Card>
            ))
          ) : (
            <div className="py-8 text-center border-2 border-dashed border-zinc-900 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-800">Pipeline Vazio</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex justify-center">
           <Button onClick={() => setShowAddTask(true)} className="bg-zinc-100 text-black hover:bg-white rounded-full h-10 px-6 text-xs font-bold uppercase tracking-tight">
             <Plus size={14} className="mr-2" /> Capturar
           </Button>
        </div>
      </section>

      <Dialog open={showCheckin} onOpenChange={setShowCheckin}>
        <DialogContent className="w-[90%] rounded-[2.5rem] bg-zinc-950 border-zinc-900 p-8 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-center uppercase tracking-tighter">Check-in Matinal</DialogTitle>
          </DialogHeader>
          <div className="space-y-8 py-6">
            <div className="space-y-4 text-center">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Horas de Sono</Label>
              <Input
                type="number"
                placeholder="0.0"
                value={checkin.horas_sono}
                onChange={(e) => setCheckin({ ...checkin, horas_sono: e.target.value })}
                className="bg-zinc-900 border-none h-20 text-4xl font-black rounded-3xl text-center focus-visible:ring-0"
              />
            </div>
            <div className="flex flex-col gap-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">O treino das 05h foi realizado?</Label>
              <div className="flex gap-4">
                <Button 
                  variant={checkin.treino_madrugada_realizado ? 'default' : 'secondary'}
                  className={`flex-1 h-16 rounded-2xl font-black uppercase transition-none ${checkin.treino_madrugada_realizado ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}
                  onClick={() => setCheckin({ ...checkin, treino_madrugada_realizado: true })}
                >
                  <Dumbbell size={20} className="mr-2" /> Sim
                </Button>
                <Button 
                  variant={!checkin.treino_madrugada_realizado ? 'default' : 'secondary'}
                  className={`flex-1 h-16 rounded-2xl font-black uppercase transition-none ${!checkin.treino_madrugada_realizado ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-500'}`}
                  onClick={() => setCheckin({ ...checkin, treino_madrugada_realizado: false })}
                >
                  Não
                </Button>
              </div>
            </div>
            <Button onClick={handleSaveCheckin} className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-lg transition-none">
              Iniciar o Jogo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="bg-zinc-950 border-zinc-900 rounded-3xl p-8 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Nova Missão</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">O que fazer?</Label>
              <Input 
                placeholder="Título da tarefa" 
                value={newTask.titulo}
                onChange={(e) => setNewTask({ ...newTask, titulo: e.target.value })}
                className="bg-zinc-900 border-none h-14 rounded-2xl px-6 font-bold"
              />
            </div>
            <Button onClick={handleCreateTask} className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest">
              Agendar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
