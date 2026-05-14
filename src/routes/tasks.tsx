import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/tasks')({
  component: TasksPage,
});

function TasksPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchTasks(session?.user?.id || 'anonymous');
      setLoading(false);
    });
  }, []);

  const fetchTasks = async (userId: string) => {
    const { data } = await supabase
      .from('tarefas')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'Entrada')
      .eq('status_concluido', false)
      .order('created_at', { ascending: false });

    if (data) setTasks(data);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !session) return;

    const { data, error } = await supabase
      .from('tarefas')
      .insert([{ 
        titulo: newTitle, 
        user_id: session.user.id,
        status: 'Entrada'
      }])
      .select()
      .single();

    if (data) {
      setTasks([data, ...tasks]);
      setNewTitle('');
      toast.success('Tarefa na Entrada');
    }
  };

  const updateStatus = async (id: string, status: 'Hoje' | 'Amanha') => {
    const { error } = await supabase
      .from('tarefas')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setTasks(tasks.filter(t => t.id !== id));
      toast.success(status === 'Hoje' ? 'Movida para Hoje' : 'Movida para Amanhã');
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tarefas').delete().eq('id', id);
    if (!error) {
      setTasks(tasks.filter(t => t.id !== id));
      toast.success('Tarefa removida');
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pb-20">
      <header className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })} className="transition-none">
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-2xl font-black uppercase tracking-tighter">Entrada</h1>
      </header>

      <form onSubmit={addTask} className="flex gap-2 mb-8">
        <Input
          placeholder="O que precisa ser feito?"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="bg-zinc-900 border-none h-14 rounded-2xl px-6 font-medium focus-visible:ring-1 ring-zinc-700"
        />
        <Button type="submit" size="icon" className="h-14 w-14 rounded-2xl bg-white text-black hover:bg-zinc-200 transition-none shrink-0">
          <Plus size={24} />
        </Button>
      </form>

      <div className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <Card key={task.id} className="p-4 bg-zinc-900 border-zinc-800 rounded-2xl flex items-center justify-between transition-none">
              <div className="flex flex-col gap-1 pr-2 overflow-hidden">
                <span className="font-bold truncate">{task.titulo}</span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Pendente</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button 
                  size="sm" 
                  className="bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black uppercase tracking-tighter h-10 px-3 rounded-xl transition-none"
                  onClick={() => updateStatus(task.id, 'Hoje')}
                >
                  Hoje
                </Button>
                <Button 
                  size="sm" 
                  className="bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black uppercase tracking-tighter h-10 px-3 rounded-xl transition-none"
                  onClick={() => updateStatus(task.id, 'Amanha')}
                >
                  Amanhã
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-10 w-10 text-zinc-600 hover:text-red-400 transition-none"
                  onClick={() => deleteTask(task.id)}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-20">
            <p className="text-zinc-600 font-black uppercase tracking-widest text-sm">Entrada Vazia</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
