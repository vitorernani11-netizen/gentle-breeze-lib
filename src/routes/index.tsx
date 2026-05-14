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
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTaskActions } from '@/hooks/useTaskActions';
import { differenceInDays, parseISO } from 'date-fns';

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
  
  const [checkin, setCheckin] = useState({
    horas_sono: '',
    marmitas_prontas: false,
  });

  const [newTask, setNewTask] = useState({
    titulo: '',
    projeto_id: '',
    data_execucao: new Date().toISOString().split('T')[0],
    repeticao: 'none',
    tags: ''
  });

  const { completeTask } = useTaskActions(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchData(session.user.id);
    });
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const userId = session?.user?.id || 'anonymous';
      checkTodayCheckin(userId);
      fetchData(userId);
      setLoading(false);
    });
  }, []);

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

    if (tasksData) setTasks(tasksData);
    if (projectsData) setProjects(projectsData);
    if (count !== null) setEliminatedCount(count);
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
      }, { onConflict: 'user_id,data' });

    if (!error) {
      setShowCheckin(false);
      toast.success('Dia iniciado!');
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
        tags: ''
      });
      toast.success('Tarefa enviada para Entrada');
    }
  };

  // Logic moved to useTaskActions hook

  if (loading) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">
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
