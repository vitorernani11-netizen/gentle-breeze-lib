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
    
    const allTasks = loadFromLocal(TASKS_KEY) || [];
    const todayTasks = allTasks.filter((t: any) => t.data_execucao === today && !t.status_concluido);
    setTasks(todayTasks);

    const projectsData = loadFromLocal(PROJECTS_KEY) || [];
    setProjects(projectsData);

    const inertiaDeletions = allTasks.filter((t: any) => t.deletado_por_inercia).length;
    setEliminatedCount(inertiaDeletions);

    const academicData = loadFromLocal(ACADEMIC_KEY) || [];
    const urgentAcademic = academicData.filter((a: any) => {
      if (a.concluido) return false;
      const days = differenceInDays(parseISO(a.data_entrega), new Date());
      return days <= 1;
    });
    setAcademicUrgent(urgentAcademic);

    const hydrationData = loadFromLocal(HYDRATION_KEY) || [];
    const todayHydration = hydrationData.find((h: any) => h.data === today);
    setHydration(todayHydration ? todayHydration.quantidade_ml : 0);

    const checkinHistory = loadFromLocal(CHECKIN_KEY) || [];
    const sortedCheckins = [...checkinHistory]
      .filter((d: any) => d && d.data && typeof d.data === 'string')
      .sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 7);
    const history = [...sortedCheckins].reverse().map((d: any) => {
      let name = '??';
      try {
        if (d.data) {
          name = format(parseISO(d.data), 'dd/MM');
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

    const completedLast7 = allTasks.filter((t: any) => 
      t && t.status_concluido && 
      (t.updated_at || t.created_at) && 
      isAfter(parseISO(t.updated_at || t.created_at), sevenDaysAgo)
    );
    const positiveTasks = completedLast7.filter((t: any) => {
      const proj = projectsData.find((p: any) => p.id === t.projeto_id);
      return proj?.nome === 'Nabih' || proj?.nome === 'Faculdade' || t.tags?.includes('Nabih') || t.tags?.includes('Faculdade');
    }).length;
    
    const trainingCount = sortedCheckins.filter((s: any) => s.treino_madrugada_realizado).length;
    const goodSleepCount = sortedCheckins.filter((s: any) => s.horas_sono && s.horas_sono >= 7).length;
    
    const financeRecords = loadFromLocal(FINANCE_KEY) || [];
    const expenses7 = financeRecords.filter((f: any) => 
      f && f.tipo === 'Saida' && 
      f.data && 
      isAfter(parseISO(f.data), sevenDaysAgo)
    );
    const expenseTotal = expenses7.reduce((acc: number, curr: any) => acc + Number(curr.valor), 0);
    
    const socialUsage = loadFromLocal(SOCIAL_KEY) || [];
    const social7 = socialUsage.filter((s: any) => 
      s && s.data && 
      isAfter(parseISO(s.data), sevenDaysAgo)
    );
    const socialHours = social7.reduce((acc: number, curr: any) => acc + curr.minutos, 0) / 60;
    
    setStats({
      positive: positiveTasks + trainingCount + goodSleepCount,
      negative: inertiaDeletions + Math.floor(expenseTotal / 100) + Math.floor(socialHours),
      careerSpeed: Math.min(100, (((positiveTasks * 500)) / 7000) * 100)
    });

    const silentUntil = loadFromLocal('hardware_humano_silence');
    if (silentUntil) {
      setIsSilenced(isAfter(parseISO(silentUntil), new Date()));
    }
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
      const tagsArray = newTask.tags.split(',').map(t => t.trim()).filter(t => t !== '');
      const task = {
        id: crypto.randomUUID(),
        titulo: newTask.titulo,
        projeto_id: newTask.projeto_id !== 'none' ? newTask.projeto_id : null,
        data_execucao: newTask.data_execucao,
        repeticao: newTask.repeticao,
        tags: tagsArray,
        lembrete_ead_48h: newTask.lembrete_ead_48h,
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
      "min-h-screen p-6 pt-24 pb-20 max-w-2xl mx-auto transition-colors duration-1000",
      isRecoveryMode ? "bg-zinc-900 text-zinc-300 grayscale-[0.5]" : "bg-black text-white"
    )}>
      <div className="fixed top-6 right-6 flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800 z-50">
        <WifiOff size={14} className="text-zinc-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Modo Offline: Local</span>
      </div>

      {isLocked && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <PowerOff size={80} className="text-zinc-800 mb-8 animate-pulse" />
          <h2 className="text-3xl font-black tracking-tighter uppercase mb-4">Hardware exausto</h2>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm max-w-xs">
            PROJETO X: DESLIGAMENTO OBRIGATÓRIO.
          </p>
          <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em] mt-12">
            Acesso liberado às 06:00 após Check-in
          </p>
        </div>
      )}

      <section className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 bg-emerald-950/20 border-emerald-900/50 rounded-[2rem] border-t-4 border-t-emerald-500">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block mb-2">Impacto Positivo</span>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-white">{stats.positive}</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Pontos Gerados</span>
            </div>
            <p className="text-[9px] text-zinc-500 mt-2 uppercase font-medium">Nabih + Faculdade + Treino + Sono</p>
          </Card>
          
          <Card className="p-6 bg-red-950/20 border-red-900/50 rounded-[2rem] border-t-4 border-t-red-500">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-500 block mb-2">Vazamentos (Negativo)</span>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-white">{stats.negative}</span>
              <span className="text-[10px] font-bold text-red-600 uppercase mb-1">Pontos Perdidos</span>
            </div>
            <p className="text-[9px] text-zinc-500 mt-2 uppercase font-medium">Inércia + Gastos + Redes Sociais</p>
          </Card>
        </div>
      </section>

      <section className="mb-12">
        <Card className="p-6 bg-zinc-950 border-zinc-900 rounded-[2rem] overflow-hidden">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Velocidade de Carreira</h2>
              <span className="text-xl font-black uppercase tracking-tighter">Rumo aos R$ 7.000,00</span>
            </div>
            <span className="text-2xl font-black text-blue-500">{stats.careerSpeed.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.4)]" 
              style={{ width: `${stats.careerSpeed}%` }}
            />
          </div>
          <div className="flex justify-between mt-3">
            <span className="text-[8px] font-black text-zinc-600 uppercase">Hardware Ativo</span>
            <span className="text-[8px] font-black text-zinc-600 uppercase">Mercado Target: SR/PL</span>
          </div>
        </Card>
      </section>

      <section className="mt-12">
        <div className="flex justify-center">
           <Button onClick={() => setShowAddTask(true)} className="bg-white text-black hover:bg-zinc-200 rounded-full h-12 px-8 font-black uppercase tracking-tighter">
             <Plus className="mr-2" /> Adicionar Captura
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
