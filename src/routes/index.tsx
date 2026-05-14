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
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useTaskActions } from '@/hooks/useTaskActions';
import { differenceInDays, parseISO, format, isWithinInterval, setHours, setMinutes, addDays, isAfter } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell } from 'recharts';
import { cn } from '@/lib/utils';

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchData(session.user.id);
    });
  });

  useEffect(() => {
    const checkLockStatus = () => {
      const now = new Date();
      const lockStart = setMinutes(setHours(now, 21), 30);
      const lockEnd = setHours(now, 6);
      
      // If we are between 21:30 and 23:59
      if (now >= lockStart) {
        setIsLocked(!showCheckin);
      } 
      // If we are between 00:00 and 06:00
      else if (now < lockEnd) {
        setIsLocked(!showCheckin);
      } else {
        setIsLocked(false);
      }
    };

    checkLockStatus();
    const interval = setInterval(checkLockStatus, 60000);
    return () => clearInterval(interval);
  }, [showCheckin]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const userId = session?.user?.id || 'anonymous';
      checkTodayCheckin(userId);
      fetchData(userId);
      setLoading(false);
    });
  }, []);

  const handleSaveAnxietyDump = async () => {
    if (!anxietyContent.trim() || !session) return;
    
    const { error } = await supabase
      .from('anxiety_dumps')
      .insert([{ user_id: session.user.id, conteudo: anxietyContent }]);

    if (!error) {
      setAnxietyContent('');
      toast.success('Descarregado. Agora descanse.');
    }
  };

  const fetchData = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch today's tasks
    const { data: tasksData } = await supabase
      .from('tarefas')
      .select('*, projetos(nome, cor)')
      .eq('user_id', userId)
      .eq('data_execucao', today)
      .eq('status', 'Hoje')
      .eq('status_concluido', false)
      .order('created_at', { ascending: false });

    // Fetch projects
    const { data: projectsData } = await supabase
      .from('projetos')
      .select('*')
      .eq('user_id', userId);

    // Fetch eliminated count
    const { count } = await supabase
      .from('tarefas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('deletado_por_inercia', true);

    // Fetch urgent academic activities (< 1 day remaining)
    const { data: academicData } = await supabase
      .from('atividades_academicas')
      .select('*')
      .eq('user_id', userId)
      .eq('concluido', false)
      .order('data_entrega', { ascending: true });

    const urgentAcademic = academicData?.filter(a => {
      const days = differenceInDays(parseISO(a.data_entrega), new Date());
      return days <= 1;
    }) || [];

    // Fetch hydration
    const { data: hydrationData } = await supabase
      .from('hidratacao')
      .select('quantidade_ml')
      .eq('user_id', userId)
      .eq('data', today)
      .single();

    // Fetch sleep history (last 7 days)
    const { data: sleepData } = await supabase
      .from('checkin_diario')
      .select('data, horas_sono')
      .eq('user_id', userId)
      .order('data', { ascending: false })
      .limit(7);

    // Fetch profile for silencing status
    const { data: profileData } = await supabase
      .from('profiles')
      .select('notificacoes_silenciadas_ate')
      .eq('id', userId)
      .single();

    if (tasksData) setTasks(tasksData);
    if (projectsData) setProjects(projectsData);
    setAcademicUrgent(urgentAcademic);
    if (count !== null) setEliminatedCount(count);
    if (hydrationData) setHydration(hydrationData.quantidade_ml);
    
    if (sleepData) {
      const history = sleepData.reverse().map(d => ({
        name: format(parseISO(d.data), 'dd/MM'),
        hours: d.horas_sono || 0
      }));
      setSleepHistory(history);
      
      const todaySleep = sleepData.find(d => d.data === today);
      if (todaySleep) setHoursSleptToday(todaySleep.horas_sono);
    }

    if (profileData?.notificacoes_silenciadas_ate) {
      const silentUntil = parseISO(profileData.notificacoes_silenciadas_ate);
      setIsSilenced(isAfter(silentUntil, new Date()));
    }
  };

  const handleSleepNow = async () => {
    if (!session) return;
    
    // Set silenced until 05:00 tomorrow
    let targetDate = setHours(setMinutes(new Date(), 0), 5);
    if (new Date().getHours() >= 5) {
      targetDate = addDays(targetDate, 1);
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        notificacoes_silenciadas_ate: targetDate.toISOString()
      });

    const { error: eventError } = await supabase
      .from('sleep_events')
      .insert([{
        user_id: session.user.id,
        inicio_sono: new Date().toISOString()
      }]);

    if (!profileError && !eventError) {
      setIsSilenced(true);
      toast.success('Modo Sono Ativado', {
        description: 'Notificações silenciadas até as 05:00.',
        icon: <Moon className="h-4 w-4" />
      });
    }
  };

  const checkTodayCheckin = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('checkin_diario')
      .select('*')
      .eq('user_id', userId)
      .eq('data', today)
      .single();

    if (!data && userId !== 'anonymous') {
      setShowCheckin(true);
    }
  };

  const handleSaveCheckin = async () => {
    if (!session) return setShowCheckin(false);
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('checkin_diario')
      .upsert({
        user_id: session.user.id,
        data: today,
        horas_sono: checkin.horas_sono ? parseFloat(checkin.horas_sono) : null,
        marmitas_prontas: checkin.marmitas_prontas,
        treino_madrugada_realizado: checkin.treino_madrugada_realizado,
      }, { onConflict: 'user_id,data' });

    if (!error) {
      setShowCheckin(false);
      toast.success('Dia iniciado!');
      if (!checkin.treino_madrugada_realizado) {
        toast('Compensação Necessária', {
          description: 'Sugestão: Realizar 15 min de alongamento hoje à noite.',
          duration: 6000,
        });
      }
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.titulo || !session) return;

    const tagsArray = newTask.tags.split(',').map(t => t.trim()).filter(t => t !== '');
    
    const { data, error } = await supabase
      .from('tarefas')
      .insert([{
        user_id: session.user.id,
        titulo: newTask.titulo,
        projeto_id: newTask.projeto_id || null,
        data_execucao: newTask.data_execucao,
        repeticao: newTask.repeticao,
        tags: tagsArray,
        lembrete_ead_48h: newTask.lembrete_ead_48h,
        status: 'Entrada' // Todas as novas tarefas caem na Entrada por padrão
      }])
      .select('*, projetos(nome, cor)')
      .single();

    if (data) {
      // Tarefas agora vão para Entrada, não aparecem imediatamente no Hoje
      // a menos que o usuário as mova deliberadamente
      setShowAddTask(false);
      setNewTask({
        titulo: '',
        projeto_id: '',
        data_execucao: new Date().toISOString().split('T')[0],
        repeticao: 'none',
        tags: '',
        lembrete_ead_48h: false
      });
      toast.success('Tarefa enviada para Entrada');
    }
  };

  const handleAddHydration = async () => {
    if (!session) return;
    const today = new Date().toISOString().split('T')[0];
    const newAmount = hydration + 500;
    
    const { error } = await supabase
      .from('hidratacao')
      .upsert({
        user_id: session.user.id,
        data: today,
        quantidade_ml: newAmount
      }, { onConflict: 'user_id,data' });

    if (!error) {
      setHydration(newAmount);
      toast.success('Hidratação registrada (+500ml)');
    }
  };

  // Logic moved to useTaskActions hook

  if (loading) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20 max-w-2xl mx-auto">
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

      <header className="mb-12">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase leading-none mb-2">Hoje</h1>
            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              size="icon" 
              onClick={handleSleepNow}
              className={`h-12 w-12 rounded-full border transition-none ${isSilenced ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-white'}`}
            >
              <Moon size={20} fill={isSilenced ? "currentColor" : "none"} />
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="icon" className="h-12 w-12 rounded-full bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:text-white transition-none">
                  <Zap size={20} />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] p-8 sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">Anxiety Dump</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Descarregue seus pensamentos</Label>
                    <Textarea 
                      placeholder="O que está te preocupando? Solte tudo aqui..." 
                      value={anxietyContent}
                      onChange={(e) => setAnxietyContent(e.target.value)}
                      className="bg-zinc-900 border-none min-h-[150px] rounded-2xl px-6 py-4 font-bold focus-visible:ring-1 ring-zinc-700 resize-none"
                    />
                  </div>
                  <Button onClick={handleSaveAnxietyDump} className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-lg transition-none">
                    Descarregar e Relaxar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5 bg-zinc-900/20 border-zinc-900/50 rounded-3xl flex flex-col gap-1">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Hidratação</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black">{(hydration / 1000).toFixed(1)}L</span>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:bg-blue-500/10" onClick={handleAddHydration}>
                <Plus size={16} />
              </Button>
            </div>
          </Card>
          <Card className="p-5 bg-zinc-900/20 border-zinc-900/50 rounded-3xl flex flex-col gap-1">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Eliminados</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-red-500">{eliminatedCount}</span>
              <AlertCircle size={16} className="text-zinc-800" />
            </div>
          </Card>
        </div>
      </header>

      {hoursSleptToday !== null && hoursSleptToday < 6 && (
        <Card className="p-5 bg-indigo-950/20 border-indigo-900/50 rounded-3xl mb-10 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-2 mb-1">
            <Info size={14} className="text-indigo-400" />
            <h4 className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Hardware em Débito</h4>
          </div>
          <p className="text-sm font-bold text-white leading-tight">
            Prioridade hoje: <span className="text-indigo-400">Manutenção e Descanso</span>.
          </p>
        </Card>
      )}

      <div className="space-y-12">
        {academicUrgent.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 px-1">Urgência Acadêmica</h2>
            <div className="space-y-1">
              {academicUrgent.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-zinc-900/30 rounded-2xl group transition-all">
                  <div 
                    className="h-6 w-6 rounded-lg border-2 border-red-900/50 bg-red-950/20 flex items-center justify-center cursor-pointer group-hover:border-red-500"
                    onClick={async () => {
                      const { error } = await supabase.from('atividades_academicas').update({ concluido: true }).eq('id', activity.id);
                      if (!error) {
                        setAcademicUrgent(academicUrgent.filter(a => a.id !== activity.id));
                        toast.success('Atividade concluída!');
                      }
                    }}
                  >
                    <Check size={14} className="text-red-500 opacity-0 group-hover:opacity-100" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-zinc-200 truncate">{activity.nome}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">
                        {differenceInDays(parseISO(activity.data_entrega), new Date()) <= 0 ? 'Entrega Hoje' : 'Entrega Amanhã'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Tarefas</h2>
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-[9px] font-black uppercase text-zinc-500 hover:text-white">
                  <Plus size={12} /> Adicionar
                </Button>
              </DialogTrigger>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Projeto</Label>
                      <Select value={newTask.projeto_id} onValueChange={(v) => setNewTask({ ...newTask, projeto_id: v })}>
                        <SelectTrigger className="bg-zinc-900 border-none h-12 rounded-xl">
                          <SelectValue placeholder="Geral" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="none">Geral</SelectItem>
                          {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Data</Label>
                      <Input 
                        type="date"
                        value={newTask.data_execucao}
                        onChange={(e) => setNewTask({ ...newTask, data_execucao: e.target.value })}
                        className="bg-zinc-900 border-none h-12 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tags</Label>
                    <Input 
                      placeholder="tag1, tag2" 
                      value={newTask.tags}
                      onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
                      className="bg-zinc-900 border-none h-12 rounded-xl"
                    />
                  </div>
                  <Button onClick={handleCreateTask} className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest">
                    Agendar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-1">
            {tasks.length > 0 ? (
              tasks.map((task) => {
                const isComplex = task.tags?.includes('Estudo Complexo');
                const isMitigated = hoursSleptToday !== null && hoursSleptToday < 6 && isComplex;

                return (
                  <div 
                    key={task.id} 
                    className={cn(
                      "flex items-center gap-4 p-4 hover:bg-zinc-900/30 rounded-2xl group transition-all",
                      isMitigated && "opacity-30 grayscale pointer-events-none"
                    )}
                  >
                    <div 
                      className="h-6 w-6 rounded-lg border-2 border-zinc-800 bg-zinc-950 flex items-center justify-center cursor-pointer group-hover:border-blue-500"
                      onClick={() => completeTask(task)}
                    >
                      <Check size={14} className="text-blue-500 opacity-0 group-hover:opacity-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-zinc-200 truncate">{task.titulo}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {task.projetos && (
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.projetos.cor }} />
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">{task.projetos.nome}</span>
                          </div>
                        )}
                        {task.tags?.map((tag: string) => (
                          <span key={tag} className={cn(
                            "text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded",
                            tag === 'Estudo Complexo' ? "bg-indigo-950/30 text-indigo-400" : "bg-zinc-900 text-zinc-600"
                          )}>
                            {tag}
                          </span>
                        ))}
                        {isMitigated && (
                          <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">Bloqueado</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Tudo limpo por aqui</p>
              </div>
            )}
          </div>
        </section>
      </div>

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
      
      {/* Quick Action Button Fixed */}
      <div className="fixed bottom-10 right-10">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="icon" className="h-16 w-16 rounded-full bg-white text-black shadow-[0_0_50px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95 transition-all">
              <Plus size={32} strokeWidth={3} />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-900 rounded-3xl p-8 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Ação Rápida</DialogTitle>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Projeto</Label>
                  <Select value={newTask.projeto_id} onValueChange={(v) => setNewTask({ ...newTask, projeto_id: v })}>
                    <SelectTrigger className="bg-zinc-900 border-none h-12 rounded-xl">
                      <SelectValue placeholder="Geral" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="none">Geral</SelectItem>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Data</Label>
                  <Input 
                    type="date"
                    value={newTask.data_execucao}
                    onChange={(e) => setNewTask({ ...newTask, data_execucao: e.target.value })}
                    className="bg-zinc-900 border-none h-12 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tags</Label>
                <Input 
                  placeholder="tag1, tag2" 
                  value={newTask.tags}
                  onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
                  className="bg-zinc-900 border-none h-12 rounded-xl"
                />
              </div>
              <Button onClick={handleCreateTask} className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest">
                Agendar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
