import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { 
  Trash2, 
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useTaskActions } from '@/hooks/useTaskActions';
import { loadFromLocal } from '@/lib/storage';
import { Button } from '@/components/ui/button';

const TASKS_KEY = 'hardware_humano_data';

export const Route = createFileRoute('/completed')({
  component: CompletedTasksPage,
});

function CompletedTasksPage() {
  const navigate = useNavigate();
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { restoreTask, deletePermanent } = useTaskActions(() => {
    fetchTasks();
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = () => {
    try {
      setLoading(true);
      const allTasks = loadFromLocal(TASKS_KEY);
      if (Array.isArray(allTasks)) {
        const completed = allTasks
          .filter((t: any) => t && t.status_concluido)
          .sort((a: any, b: any) => {
            const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
            const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
            return dateB - dateA;
          });
        setCompletedTasks(completed);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Falha ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-[#00ff41]">
        <span className="animate-pulse font-black uppercase tracking-[0.3em]">Acessando Histórico...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 sm:p-6 pt-12 pb-20 font-sans">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate({ to: '/tasks' })}
            className="text-zinc-500 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3">
            Histórico <span className="text-[10px] bg-[#00ff41] text-black px-1.5 py-0.5 rounded font-bold not-italic">Executado</span>
          </h1>
        </div>
      </header>

      <div className="space-y-2">
        {completedTasks.length > 0 ? (
          completedTasks.map((task) => (
            <div 
              key={task.id} 
              className="flex items-center justify-between p-4 bg-zinc-900/20 border-b border-zinc-900 group hover:bg-zinc-900/40 transition-all"
            >
              <div className="flex flex-col gap-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-[#00ff41] shrink-0" />
                  <span className="font-bold text-zinc-500 line-through uppercase tracking-tight truncate text-sm sm:text-base">
                    {task.titulo}
                  </span>
                </div>
                {task.data_execucao && (
                  <div className="flex items-center gap-1.5 ml-5">
                    <Clock size={10} className="text-zinc-700" />
                    <span className="text-[9px] font-black text-zinc-700 uppercase">{task.data_execucao}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 shrink-0">
                <Button 
                  aria-label="Restaurar"
                  size="icon"
                  variant="ghost"
                  className="w-10 h-10 border border-zinc-900 text-zinc-600 hover:text-[#00ff41] hover:border-[#00ff41]/20 hover:bg-[#00ff41]/5 rounded-lg transition-all"
                  onClick={() => restoreTask(task.id)}
                >
                  <RefreshCw size={14} />
                </Button>
                <Button 
                  aria-label="Deletar"
                  size="icon"
                  variant="ghost"
                  className="w-10 h-10 border border-zinc-900 text-zinc-600 hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/5 rounded-lg transition-all"
                  onClick={() => deletePermanent(task.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="border-2 border-dashed border-zinc-900 p-20 text-center rounded-3xl">
            <p className="text-zinc-800 font-black uppercase tracking-[0.5em] text-xs">Nenhum Registro</p>
          </div>
        )}
      </div>
    </div>
  );
}
