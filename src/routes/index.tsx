import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ShoppingCart, Wallet, CreditCard, ChevronRight, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckin, setShowCheckin] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [checkin, setCheckin] = useState({
    horas_sono: '',
    marmitas_prontas: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const userId = session?.user?.id || 'anonymous';
      checkTodayCheckin(userId);
      fetchTodayTasks(userId);
      setLoading(false);
    });
  }, []);

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

  const fetchTodayTasks = async (userId: string) => {
    const { data } = await supabase
      .from('tarefas')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['Entrada', 'Hoje'])
      .order('created_at', { ascending: false });

    if (data) setTasks(data);
  };

  const handleSaveCheckin = async () => {
    if (!session) {
      setShowCheckin(false);
      return;
    }
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
      toast.success('Check-in realizado!');
    } else {
      toast.error('Erro ao salvar check-in');
    }
  };

  const updateTaskStatus = async (id: string, status: 'Hoje' | 'Amanha') => {
    const { error } = await supabase
      .from('tarefas')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setTasks(tasks.filter(t => t.id !== id || status === 'Hoje'));
      if (status === 'Hoje') {
        setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
      }
      toast.success(status === 'Hoje' ? 'Tarefa para hoje' : 'Tarefa para amanhã');
    }
  };

  const completeTask = async (id: string) => {
    const { error } = await supabase
      .from('tarefas')
      .update({ status_concluido: true })
      .eq('id', id);

    if (!error) {
      setTasks(tasks.filter(t => t.id !== id));
      toast.success('Tarefa concluída!');
    }
  };

  const quickAction = (action: string) => {
    toast.info(`Ação: ${action}`);
    // Here you would navigate to specific forms or open modals
    if (action === 'Nova Tarefa') navigate({ to: '/tasks' });
    if (action.includes('Gasto') || action.includes('Venda')) navigate({ to: '/finance' });
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pb-24">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-bold tracking-tighter">Focus</h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <Button 
          variant="secondary" 
          className="h-24 flex flex-col gap-2 rounded-2xl bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-none"
          onClick={() => quickAction('Nova Tarefa')}
        >
          <Plus size={24} />
          <span className="text-xs font-bold uppercase">Nova Tarefa</span>
        </Button>
        <Button 
          variant="secondary" 
          className="h-24 flex flex-col gap-2 rounded-2xl bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-none"
          onClick={() => quickAction('Venda Nabih')}
        >
          <ShoppingCart size={24} />
          <span className="text-xs font-bold uppercase">Venda Nabih</span>
        </Button>
        <Button 
          variant="secondary" 
          className="h-24 flex flex-col gap-2 rounded-2xl bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-none"
          onClick={() => quickAction('Gasto Pessoal')}
        >
          <Wallet size={24} />
          <span className="text-xs font-bold uppercase">Gasto Pessoal</span>
        </Button>
        <Button 
          variant="secondary" 
          className="h-24 flex flex-col gap-2 rounded-2xl bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-none"
          onClick={() => quickAction('Gasto Nabih')}
        >
          <CreditCard size={24} />
          <span className="text-xs font-bold uppercase">Gasto Nabih</span>
        </Button>
      </div>

      {/* Task Sections */}
      <div className="space-y-8">
        {/* Entrada Section */}
        {tasks.some(t => t.status === 'Entrada') && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-1">Entrada</h2>
            <div className="space-y-2">
              {tasks.filter(t => t.status === 'Entrada').map(task => (
                <Card key={task.id} className="p-4 bg-zinc-900 border-zinc-800 rounded-xl flex items-center justify-between transition-none">
                  <span className="font-medium truncate pr-4">{task.titulo}</span>
                  <div className="flex gap-2 shrink-0">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-[10px] font-bold uppercase h-8 px-2 border-zinc-700 transition-none"
                      onClick={() => updateTaskStatus(task.id, 'Hoje')}
                    >
                      Hoje
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-[10px] font-bold uppercase h-8 px-2 border-zinc-700 transition-none"
                      onClick={() => updateTaskStatus(task.id, 'Amanha')}
                    >
                      Amanhã
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Hoje Section */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-1">Tarefas de Hoje</h2>
          <div className="space-y-2">
            {tasks.filter(t => t.status === 'Hoje').length > 0 ? (
              tasks.filter(t => t.status === 'Hoje').map(task => (
                <Card key={task.id} className="p-4 bg-zinc-900 border-zinc-800 rounded-xl flex items-center justify-between transition-none">
                  <span className="font-medium">{task.titulo}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 rounded-full hover:bg-zinc-800 transition-none"
                    onClick={() => completeTask(task.id)}
                  >
                    <Check size={18} className="text-zinc-400" />
                  </Button>
                </Card>
              ))
            ) : (
              <p className="text-center py-8 text-zinc-600 text-sm italic font-medium">Nenhuma execução pendente.</p>
            )}
          </div>
        </section>
      </div>

      {/* Morning Check-in Modal */}
      <Dialog open={showCheckin} onOpenChange={setShowCheckin}>
        <DialogContent className="w-[90%] rounded-3xl bg-zinc-950 border-zinc-800 p-8 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-center uppercase tracking-tighter">Check-in Matinal</DialogTitle>
          </DialogHeader>
          <div className="space-y-8 py-6">
            <div className="space-y-4">
              <Label htmlFor="sono" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Horas de Sono</Label>
              <Input
                id="sono"
                type="number"
                placeholder="0.0"
                value={checkin.horas_sono}
                onChange={(e) => setCheckin({ ...checkin, horas_sono: e.target.value })}
                className="bg-zinc-900 border-none h-14 text-2xl font-bold rounded-2xl text-center focus-visible:ring-0"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="marmitas" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Marmitas Prontas?</Label>
              <div className="flex gap-4">
                <Button 
                  variant={checkin.marmitas_prontas ? 'default' : 'secondary'}
                  className={`h-12 w-16 rounded-xl font-bold uppercase transition-none ${checkin.marmitas_prontas ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}
                  onClick={() => setCheckin({ ...checkin, marmitas_prontas: true })}
                >
                  Sim
                </Button>
                <Button 
                  variant={!checkin.marmitas_prontas ? 'default' : 'secondary'}
                  className={`h-12 w-16 rounded-xl font-bold uppercase transition-none ${!checkin.marmitas_prontas ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}
                  onClick={() => setCheckin({ ...checkin, marmitas_prontas: false })}
                >
                  Não
                </Button>
              </div>
            </div>

            <Button onClick={handleSaveCheckin} className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-lg hover:bg-zinc-200 transition-none">
              Iniciar Dia
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
