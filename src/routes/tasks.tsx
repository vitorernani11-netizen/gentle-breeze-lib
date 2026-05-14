import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, ArrowLeft, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { useTaskActions } from '@/hooks/useTaskActions';

export const Route = createFileRoute('/tasks')({
  component: TasksPage,
});

function TasksPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const { moveTask } = useTaskActions(() => {
    if (session?.user?.id) fetchTasks(session.user.id);
  });

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      const userId = currentSession?.user?.id || '00000000-0000-0000-0000-000000000000';
      await fetchTasks(userId);
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        fetchTasks(newSession.user.id);
      } else {
        setTasks([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTasks = async (userId: string) => {
    if (!userId) {
      console.log('Tentativa de busca ignorada: usuário nulo');
      return;
    }
    
    console.log('Buscando tarefas para usuário:', userId);
    const { data, error } = await supabase
      .from('tarefas')
      .select('*, projetos(nome, cor)')
      .eq('user_id', userId)
      .eq('status', 'Entrada')
      .eq('status_concluido', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro Supabase fetchTasks:', error);
      toast.error('Erro ao carregar tarefas');
      return;
    }

    console.log('Tarefas carregadas:', data?.length);
    if (data) setTasks(data);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
      const { data, error } = await supabase
        .from('tarefas')
        .insert([{ 
          titulo: newTitle, 
          user_id: userId,
          status: 'Entrada'
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setTasks(prev => [data, ...prev]);
        setNewTitle('');
        toast.success('Tarefa adicionada à Entrada');
      }
    } catch (error: any) {
      console.error('Erro ao adicionar tarefa:', error);
      toast.error('Falha ao salvar tarefa: ' + (error.message || 'Erro de conexão'), {
        style: { background: '#7f1d1d', color: '#fff', border: 'none' }
      });
    }
  };

  // Logic moved to useTaskActions hook

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tarefas').delete().eq('id', id);
    if (!error) {
      setTasks(tasks.filter(t => t.id !== id));
      toast.success('Tarefa removida');
    }
  };

  if (loading) return null;

  // Grouping tasks by primary tag (first tag) or project
  const groupedTasks = tasks.reduce((acc: any, task) => {
    const key = task.projetos?.nome || 'Sem Projeto';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">
      <header className="mb-10 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })} className="transition-none">
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Entrada</h1>
      </header>

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          addTask(e);
        }} 
        className="flex gap-2 mb-10"
      >
        <Input
          placeholder="O que está na mente?"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="bg-zinc-900 border-none h-14 rounded-2xl px-6 font-bold text-lg focus-visible:ring-1 ring-zinc-700"
        />
        <Button 
          type="submit" 
          size="icon" 
          className="h-14 w-14 rounded-2xl bg-white text-black hover:bg-zinc-200 transition-all shrink-0 active:scale-95"
        >
          <Plus size={24} />
        </Button>
      </form>

      <div className="space-y-8">
        {Object.keys(groupedTasks).length > 0 ? (
          Object.entries(groupedTasks).map(([group, groupTasks]: [string, any]) => (
            <div key={group} className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="h-1 w-4 rounded-full bg-zinc-800" />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{group}</h2>
              </div>
              <div className="space-y-3">
                {groupTasks.map((task: any) => (
                  <Card key={task.id} className="p-5 bg-zinc-950 border-zinc-900 rounded-[1.5rem] flex items-center justify-between transition-none group hover:bg-zinc-900/30">
                    <div className="flex flex-col gap-1 pr-2 overflow-hidden">
                      <span className="font-bold text-lg leading-tight truncate">{task.titulo}</span>
                      {task.tags?.length > 0 && (
                        <div className="flex gap-2">
                          {task.tags.map((tag: string) => (
                            <span key={tag} className="text-[9px] font-black text-zinc-600 uppercase flex items-center">
                              <Hash size={8} className="mr-0.5" />{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button 
                        size="sm" 
                        className="bg-zinc-900 border border-zinc-800 hover:bg-white hover:text-black text-[10px] font-black uppercase tracking-tighter h-10 px-4 rounded-xl transition-none"
                        onClick={() => moveTask(task.id, 'Hoje')}
                      >
                        Hoje
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-zinc-900 border border-zinc-800 hover:bg-white hover:text-black text-[10px] font-black uppercase tracking-tighter h-10 px-4 rounded-xl transition-none"
                        onClick={() => moveTask(task.id, 'Amanha')}
                      >
                        Amanhã
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-24 bg-zinc-950/30 rounded-[2.5rem] border border-dashed border-zinc-900">
            <p className="text-zinc-700 font-black uppercase tracking-widest text-xs">Mente limpa</p>
          </div>
        )}
      </div>
    </div>
  );
}
