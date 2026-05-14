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
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useTaskActions } from '@/hooks/useTaskActions';
import { differenceInDays, parseISO, format, isWithinInterval, setHours, setMinutes } from 'date-fns';

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
      return days <= 1; // "Faltar 1 dia" included
    }) || [];

    // Fetch hydration
    const { data: hydrationData } = await supabase
      .from('hidratacao')
      .select('quantidade_ml')
      .eq('user_id', userId)
      .eq('data', today)
      .single();

    if (tasksData) setTasks(tasksData);
    if (projectsData) setProjects(projectsData);
    setAcademicUrgent(urgentAcademic);
    if (count !== null) setEliminatedCount(count);
    if (hydrationData) setHydration(hydrationData.quantidade_ml);
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
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">
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
      <header className="mb-10">
        <div className="flex items-center gap-2 text-blue-500 mb-2">
          <Calendar size={20} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Execução</span>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Hoje</h1>
            <p className="text-zinc-500 text-xs font-medium mt-2">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">Itens Eliminados por Inércia</span>
              <span className="text-xl font-black text-red-500">{eliminatedCount}</span>
            </div>
            
            <div className="flex flex-col items-center gap-1 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800/50">
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Água</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAddHydration}
                className="h-8 gap-2 px-2 hover:bg-blue-500/10 hover:text-blue-400 transition-none"
              >
                <Droplets size={14} className="text-blue-500" />
                <span className="text-sm font-black">{(hydration / 1000).toFixed(1)}L</span>
              </Button>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="icon" className="h-14 w-14 rounded-2xl bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 transition-none">
                  <Zap size={24} />
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

            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
            <DialogTrigger asChild>
              <Button size="icon" className="h-14 w-14 rounded-2xl bg-white text-black hover:bg-zinc-200 transition-none shadow-2xl shadow-white/10">
                <Plus size={28} />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] p-8 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">Nova Missão</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">O que fazer?</Label>
                  <Input 
                    placeholder="Ex: Treino de pernas" 
                    value={newTask.titulo}
                    onChange={(e) => setNewTask({ ...newTask, titulo: e.target.value })}
                    className="bg-zinc-900 border-none h-14 rounded-2xl px-6 font-bold focus-visible:ring-1 ring-zinc-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Projeto</Label>
                    <Select value={newTask.projeto_id} onValueChange={(v) => setNewTask({ ...newTask, projeto_id: v })}>
                      <SelectTrigger className="bg-zinc-900 border-none h-12 rounded-xl px-4 font-bold">
                        <SelectValue placeholder="Geral" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="none">Nenhum</SelectItem>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Repetição</Label>
                    <Select value={newTask.repeticao} onValueChange={(v) => setNewTask({ ...newTask, repeticao: v })}>
                      <SelectTrigger className="bg-zinc-900 border-none h-12 rounded-xl px-4 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="none">Única</SelectItem>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Tags (separadas por vírgula)</Label>
                  <Input 
                    placeholder="foco, urgente" 
                    value={newTask.tags}
                    onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
                    className="bg-zinc-900 border-none h-12 rounded-xl px-4 font-bold"
                  />
                </div>

                <div className="flex items-center space-x-2 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                  <Checkbox 
                    id="ead_reminder" 
                    checked={newTask.lembrete_ead_48h}
                    onCheckedChange={(checked) => setNewTask({ ...newTask, lembrete_ead_48h: !!checked })}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="ead_reminder"
                      className="text-[10px] font-black uppercase tracking-widest text-zinc-400 cursor-pointer flex items-center gap-1.5"
                    >
                      <Bell size={10} className="text-yellow-500" />
                      Lembrete Prazo EAD (48h antes)
                    </label>
                  </div>
                </div>

                <Button onClick={handleCreateTask} className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-lg transition-none">
                  Agendar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>

      {/* Task List grouped by Project */}
      <div className="space-y-10">
        {/* Urgent Academic Activities */}
        {academicUrgent.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="h-1 w-4 rounded-full bg-red-600" />
              <h2 className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1">
                <AlertCircle size={10} /> Emergência Acadêmica
              </h2>
            </div>
            <div className="space-y-4">
              {academicUrgent.map((activity) => (
                <Card key={activity.id} className="p-6 bg-red-950/20 border-red-900/50 rounded-[2rem] border-l-4 border-l-red-600 flex flex-col gap-3 transition-none">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1.5 flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] h-4 bg-red-600 border-none text-white font-black uppercase py-0 px-1.5">
                          {differenceInDays(parseISO(activity.data_entrega), new Date()) <= 0 ? 'ENTREGA HOJE' : 'ENTREGA AMANHÃ'}
                        </Badge>
                        <span className="text-[9px] font-black text-red-400 uppercase flex items-center">
                          <GraduationCap size={10} className="mr-1" /> Acadêmico
                        </span>
                      </div>
                      <span className="font-bold text-xl leading-tight text-white">{activity.nome}</span>
                    </div>
                    
                    <Button 
                      size="icon" 
                      className="h-14 w-14 rounded-2xl bg-red-600 text-white hover:bg-red-700 transition-none shrink-0 border-none"
                      onClick={async () => {
                        const { error } = await supabase.from('atividades_academicas').update({ concluido: true }).eq('id', activity.id);
                        if (!error) {
                          setAcademicUrgent(academicUrgent.filter(a => a.id !== activity.id));
                          toast.success('Atividade concluída!');
                        }
                      }}
                    >
                      <Check size={24} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {tasks.length > 0 ? (
          Object.entries(
            tasks.reduce((acc: any, task) => {
              const key = task.projetos?.nome || 'Geral';
              if (!acc[key]) acc[key] = [];
              acc[key].push(task);
              return acc;
            }, {})
          ).map(([group, groupTasks]: [string, any]) => (
            <div key={group} className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="h-1 w-4 rounded-full bg-blue-900/50" />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{group}</h2>
              </div>
              <div className="space-y-4">
                {groupTasks.map((task: any) => (
                  <Card key={task.id} className="p-6 bg-zinc-950 border-zinc-900 rounded-[2rem] border-l-4 border-l-blue-900/30 flex flex-col gap-3 transition-none group hover:bg-zinc-900/30">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1.5 flex-1 pr-4">
                        <div className="flex items-center gap-2">
                          {task.repeticao !== 'none' && (
                            <Badge variant="outline" className="text-[8px] h-4 bg-zinc-900 border-zinc-800 text-zinc-400 font-black uppercase py-0 px-1.5">
                              <RotateCcw size={8} className="mr-1" /> {task.repeticao}
                            </Badge>
                          )}
                        </div>
                        <span className="font-bold text-xl leading-tight group-hover:text-blue-400 transition-colors">{task.titulo}</span>
                        
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {task.tags.map((tag: string) => (
                              <span key={tag} className="text-[9px] font-black text-zinc-600 uppercase flex items-center bg-zinc-900/50 px-2 py-1 rounded-md">
                                <Hash size={8} className="mr-0.5" />{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        size="icon" 
                        className="h-14 w-14 rounded-2xl bg-zinc-900 text-white border border-zinc-800 hover:bg-white hover:text-black transition-none shrink-0"
                        onClick={() => completeTask(task)}
                      >
                        <Check size={24} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-24 bg-zinc-950/30 rounded-[2.5rem] border border-dashed border-zinc-900">
            <Check className="mx-auto mb-4 text-zinc-800" size={40} />
            <p className="text-zinc-700 font-black uppercase tracking-widest text-[10px]">Território conquistado</p>
          </div>
        )}
      </div>

      {/* Morning Check-in Modal */}
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

            <div className="flex flex-col gap-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">Marmitas Prontas?</Label>
              <div className="flex gap-4">
                <Button 
                  variant={checkin.marmitas_prontas ? 'default' : 'secondary'}
                  className={`flex-1 h-16 rounded-2xl font-black uppercase transition-none ${checkin.marmitas_prontas ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500'}`}
                  onClick={() => setCheckin({ ...checkin, marmitas_prontas: true })}
                >
                  Sim
                </Button>
                <Button 
                  variant={!checkin.marmitas_prontas ? 'default' : 'secondary'}
                  className={`flex-1 h-16 rounded-2xl font-black uppercase transition-none ${!checkin.marmitas_prontas ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500'}`}
                  onClick={() => setCheckin({ ...checkin, marmitas_prontas: false })}
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
    </div>
  );
}
