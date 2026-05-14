import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skull, Calendar as CalendarIcon, Check, Hash, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTaskActions } from '@/hooks/useTaskActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/purgatory')({
  component: Purgatory,
});

function Purgatory() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const { completeTask, rescheduleTask } = useTaskActions(() => {
    fetchOverdueTasks();
    setSelectedTask(null);
  });

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
      .neq('status', 'Entrada') 
      .lt('data_execucao', today) // Pega tudo que tem data_execucao anterior a hoje
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
                        onClick={() => completeTask(task)}
                      >
                        <Check size={20} />
                      </Button>
                    </div>
                    
                    <div className="pt-3 border-t border-zinc-900 flex gap-2">
                      <Dialog open={selectedTask?.id === task.id} onOpenChange={(open) => !open && setSelectedTask(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            className="flex-1 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-none"
                            onClick={() => setSelectedTask(task)}
                          >
                            <RefreshCw size={14} className="mr-2" />
                            Reativar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] p-8 sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">Nova Data de Execução</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6 py-6">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Escolha o dia</Label>
                              <Input 
                                type="date"
                                value={newDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="bg-zinc-900 border-none h-14 rounded-2xl px-6 font-bold focus-visible:ring-1 ring-zinc-700"
                              />
                            </div>
                            <Button 
                              onClick={() => rescheduleTask(task, newDate)} 
                              className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-lg transition-none"
                            >
                              Confirmar Reagendamento
                            </Button>
                            <p className="text-center text-[10px] text-zinc-500 font-bold uppercase">
                              Aviso: Esta tarefa tem {task.contagem_adiamentos}/3 adiamentos.
                            </p>
                          </div>
                        </DialogContent>
                      </Dialog>
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
