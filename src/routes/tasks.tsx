import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, ArrowLeft, Hash, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTaskActions } from '@/hooks/useTaskActions';
import { saveToLocal, loadFromLocal } from '@/lib/storage';

const TASKS_KEY = 'hardware_humano_tasks';

export const Route = createFileRoute('/tasks')({
  component: TasksPage,
});

function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const { moveTask } = useTaskActions(() => {
    fetchTasks();
  });

  useEffect(() => {
    fetchTasks();
    setLoading(false);
  }, []);

  const fetchTasks = () => {
    const allTasks = loadFromLocal(TASKS_KEY) || [];
    const filteredTasks = allTasks.filter((t: any) => 
      t.status === 'Entrada' && !t.status_concluido
    ).sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setTasks(filteredTasks);
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const newTask = {
        id: crypto.randomUUID(),
        titulo: newTitle,
        user_id: 'local-user',
        status: 'Entrada',
        status_concluido: false,
        created_at: new Date().toISOString(),
        tags: []
      };

      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const updatedTasks = [newTask, ...allTasks];
      saveToLocal(TASKS_KEY, updatedTasks);
      
      setTasks(prev => [newTask, ...prev]);
      setNewTitle('');
      toast.success('Tarefa adicionada à Entrada');
    } catch (error: any) {
      console.error('Erro ao adicionar tarefa:', error);
      toast.error('Falha ao salvar tarefa no hardware');
    }
  };

  const deleteTask = (id: string) => {
    const allTasks = loadFromLocal(TASKS_KEY) || [];
    const updatedTasks = allTasks.filter((t: any) => t.id !== id);
    saveToLocal(TASKS_KEY, updatedTasks);
    setTasks(tasks.filter(t => t.id !== id));
    toast.success('Tarefa removida');
  };

  if (loading) return null;

  const groupedTasks = tasks.reduce((acc: any, task) => {
    const key = task.projetos?.nome || 'Sem Projeto';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">
      <div className="fixed top-6 right-6 flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800">
        <WifiOff size={14} className="text-zinc-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Modo Offline: Local</span>
      </div>

      <header className="mb-10 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })} className="transition-none">
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Entrada</h1>
      </header>

      <form onSubmit={addTask} className="flex gap-2 mb-10">
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
