import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skull, ArrowLeft, Calendar, Check } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/purgatory')({
  component: Purgatory,
});

function Purgatory() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverdueTasks();
  }, []);

  const fetchOverdueTasks = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'anonymous';
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('tarefas')
      .select('*')
      .eq('user_id', userId)
      .eq('status_concluido', false)
      .lt('data_execucao', today)
      .order('data_execucao', { ascending: true });

    if (data) setTasks(data);
    setLoading(false);
  };

  const moveToToday = async (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('tarefas')
      .update({ data_execucao: today, status: 'Hoje' })
      .eq('id', id);

    if (!error) {
      setTasks(tasks.filter(t => t.id !== id));
      toast.success('Tarefa resgatada para hoje!');
    }
  };

  const completeTask = async (id: string) => {
    const { error } = await supabase
      .from('tarefas')
      .update({ status_concluido: true })
      .eq('id', id);

    if (!error) {
      setTasks(tasks.filter(t => t.id !== id));
      toast.success('Tarefa concluída do purgatório!');
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">
      <header className="mb-10">
        <div className="flex items-center gap-2 text-red-500 mb-2">
          <Skull size={20} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Purgatório</span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Atrasadas</h1>
        <p className="text-zinc-500 text-xs font-medium mt-2">Dívidas técnicas que precisam de pagamento.</p>
      </header>

      <div className="space-y-4">
        {tasks.length > 0 ? (
          tasks.map(task => (
            <Card key={task.id} className="p-5 bg-zinc-950 border-zinc-900 rounded-2xl flex flex-col gap-4 border-l-4 border-l-red-900 transition-none">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-lg leading-tight">{task.titulo}</span>
                  <span className="text-[10px] text-red-500/70 font-black uppercase">
                    Vencido em: {new Date(task.data_execucao).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-10 w-10 rounded-full bg-zinc-900 text-white hover:bg-white hover:text-black transition-none"
                    onClick={() => completeTask(task.id)}
                  >
                    <Check size={18} />
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2 border-t border-zinc-900">
                <Button 
                  className="flex-1 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-none"
                  onClick={() => moveToToday(task.id)}
                >
                  <Calendar size={14} className="mr-2" />
                  Fazer Hoje
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-24">
            <div className="h-16 w-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
              <Check className="text-zinc-700" size={32} />
            </div>
            <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">Nada no purgatório</p>
          </div>
        )}
      </div>
    </div>
  );
}
