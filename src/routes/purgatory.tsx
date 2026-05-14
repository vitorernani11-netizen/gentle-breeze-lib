import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skull, Calendar, Check, Hash, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTaskActions } from '@/hooks/useTaskActions';

export const Route = createFileRoute('/purgatory')({
  component: Purgatory,
});

function Purgatory() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { completeTask, rescheduleTask } = useTaskActions(() => fetchOverdueTasks());

  useEffect(() => {
    fetchOverdueTasks();
  }, []);

  const fetchOverdueTasks = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'anonymous';
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('tarefas')
      .select('*, projetos(nome, cor)')
      .eq('user_id', userId)
      .eq('status_concluido', false)
      .neq('status', 'Entrada') // Tarefas na Entrada não apodrecem no Purgatório, elas ainda não foram agendadas
      .lt('data_execucao', today)
      .order('data_execucao', { ascending: true });

    if (data) setTasks(data);
    setLoading(false);
  };

  // Logic moved to useTaskActions hook

  if (loading) return null;

  // Grouping tasks by project
  const groupedTasks = tasks.reduce((acc: any, task) => {
    const key = task.projetos?.nome || 'Sem Projeto';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">
      <header className="mb-10">
        <div className="flex items-center gap-2 text-red-500 mb-2">
          <Skull size={20} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Purgatório</span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Atrasadas</h1>
        <p className="text-zinc-500 text-xs font-medium mt-2">Falhas de execução que cobram juros.</p>
      </header>

      <div className="space-y-10">
        {Object.keys(groupedTasks).length > 0 ? (
          Object.entries(groupedTasks).map(([group, groupTasks]: [string, any]) => (
            <div key={group} className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="h-1 w-4 rounded-full bg-red-900/50" />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{group}</h2>
              </div>
              <div className="space-y-3">
                {groupTasks.map((task: any) => (
                  <Card key={task.id} className="p-5 bg-zinc-950 border-zinc-900 rounded-[1.5rem] flex flex-col gap-4 border-l-4 border-l-red-900 transition-none group hover:bg-zinc-900/10">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1.5 flex-1 pr-4 overflow-hidden">
                        <span className="font-bold text-lg leading-tight truncate">{task.titulo}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] text-red-500/70 font-black uppercase">
                            Vencido em: {new Date(task.data_execucao).toLocaleDateString('pt-BR')}
                          </span>
                          {task.contagem_adiamentos > 0 && (
                            <span className="text-[9px] text-zinc-600 font-black uppercase">
                              Adiamentos: {task.contagem_adiamentos}/3
                            </span>
                          )}
                        </div>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-12 w-12 rounded-2xl bg-zinc-900 text-white border border-zinc-800 hover:bg-white hover:text-black transition-none shrink-0"
                        onClick={() => completeTask(task.id)}
                      >
                        <Check size={20} />
                      </Button>
                    </div>
                    
                    <div className="pt-3 border-t border-zinc-900 flex gap-2">
                      <Button 
                        className="flex-1 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-none"
                        onClick={() => rescheduleTask(task)}
                      >
                        <RefreshCw size={14} className="mr-2" />
                        Reagendar
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
            <p className="text-zinc-700 font-black uppercase tracking-widest text-xs">Dívidas zeradas</p>
          </div>
        )}
      </div>
    </div>
  );
}
