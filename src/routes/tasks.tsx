import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
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
      if (!session) {
        navigate({ to: '/login' });
      } else {
        fetchTasks(session.user.id);
      }
      setLoading(false);
    });
  }, [navigate]);

  const fetchTasks = async (userId: string) => {
    const { data, error } = await supabase
      .from('tarefas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) setTasks(data);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !session) return;

    const { data, error } = await supabase
      .from('tarefas')
      .insert([{ titulo: newTitle, user_id: session.user.id }])
      .select()
      .single();

    if (data) {
      setTasks([data, ...tasks]);
      setNewTitle('');
      toast.success('Tarefa adicionada');
    }
  };

  const toggleTask = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('tarefas')
      .update({ status_concluido: !currentStatus })
      .eq('id', id);

    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { ...t, status_concluido: !currentStatus } : t));
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
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Minhas Tarefas</h1>
      </header>

      <form onSubmit={addTask} className="flex gap-2 mb-6">
        <Input
          placeholder="Nova tarefa..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="bg-secondary border-none"
        />
        <Button type="submit" size="icon">
          <Plus size={20} />
        </Button>
      </form>

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id} className="p-4 bg-card border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={task.status_concluido}
                onCheckedChange={() => toggleTask(task.id, task.status_concluido)}
              />
              <span className={task.status_concluido ? 'line-through text-muted-foreground' : ''}>
                {task.titulo}
              </span>
            </div>
            <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive transition-none">
              <Trash2 size={18} />
            </button>
          </Card>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
