import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { isAfter, parseISO, startOfToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowLeft, WifiOff, Calendar } from 'lucide-react';
import { useTaskActions } from '@/hooks/useTaskActions';
import { loadFromLocal } from '@/lib/storage';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';

const TASKS_KEY = 'hardware_humano_data';

export const Route = createFileRoute('/upcoming')({
  component: UpcomingPage,
});

function UpcomingPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailTask, setDetailTask] = useState<any | null>(null);

  const { completeTask, deletePermanent, moveTask, updateTriagemStage, updateTask } = useTaskActions(() => {
    fetchTasks();
  });

  useEffect(() => {
    fetchTasks();
    const handleStorageChange = () => {
      fetchTasks();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchTasks = () => {
    try {
      setLoading(true);
      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const today = startOfToday();

      const upcoming = allTasks
        .filter((t: any) => {
          if (t.status_concluido || t.deletado_por_inercia) return false;
          if (!t.data_execucao) return false;
          
          try {
            const taskDate = parseISO(t.data_execucao);
            return isAfter(taskDate, today);
          } catch (e) {
            return false;
          }
        })
        .sort((a: any, b: any) => {
          const dateA = new Date(a.data_execucao).getTime();
          const dateB = new Date(b.data_execucao).getTime();
          return dateA - dateB;
        });

      setTasks(upcoming);
    } catch (error) {
      console.error('Erro ao carregar tarefas futuras:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-[#00ff41]">
        <span className="animate-pulse font-black uppercase tracking-[0.3em]">Carregando Futuro...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 sm:p-6 pt-12 pb-20 font-sans">
      <div className="fixed top-4 right-4 flex items-center gap-2 bg-zinc-900/30 px-3 py-1 rounded-full border border-zinc-800/50 z-50">
        <WifiOff size={10} className="text-zinc-600" />
        <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">Hardware Local</span>
      </div>

      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black uppercase tracking-tight italic">Em Breve</h1>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-0 border-t border-white/10">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard 
              key={task.id}
              task={task}
              onComplete={completeTask}
              onMoveToToday={(id) => {
                moveTask(id, 'Hoje');
                navigate({ to: '/' });
              }}
              onDelete={deletePermanent}
              onClick={setDetailTask}
              onUpdateStage={updateTriagemStage}
              onUpdatePriority={(id, p) => updateTask(id, { prioridade: p })}
            />
          ))
        ) : (
          <div className="border-2 border-dashed border-zinc-800 p-20 text-center">
            <p className="text-zinc-700 font-black uppercase tracking-[0.5em] text-xs">Sem tarefas futuras</p>
          </div>
        )}
      </div>

      <TaskDetailModal
        task={detailTask}
        open={!!detailTask}
        onClose={() => setDetailTask(null)}
        onUpdate={updateTask}
      />
    </div>
  );
}
