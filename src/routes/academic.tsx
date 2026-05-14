import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, ArrowLeft, GraduationCap, Calendar, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Route = createFileRoute('/academic')({
  component: AcademicPage,
});

function AcademicPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newActivity, setNewActivity] = useState({
    nome: '',
    data_entrega: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchActivities(session.user.id);
      setLoading(false);
    });
  }, []);

  const fetchActivities = async (userId: string) => {
    const { data } = await supabase
      .from('atividades_academicas')
      .select('*')
      .eq('user_id', userId)
      .eq('concluido', false)
      .order('data_entrega', { ascending: true });

    if (data) setActivities(data);
  };

  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.nome.trim() || !session) return;

    const { data, error } = await supabase
      .from('atividades_academicas')
      .insert([{ 
        nome: newActivity.nome, 
        data_entrega: newActivity.data_entrega,
        user_id: session.user.id 
      }])
      .select()
      .single();

    if (data) {
      setActivities([...activities, data].sort((a, b) => new Date(a.data_entrega).getTime() - new Date(b.data_entrega).getTime()));
      setNewActivity({ nome: '', data_entrega: format(new Date(), 'yyyy-MM-dd') });
      toast.success('Atividade adicionada!');
    }
  };

  const completeActivity = async (id: string) => {
    const { error } = await supabase
      .from('atividades_academicas')
      .update({ concluido: true })
      .eq('id', id);

    if (!error) {
      setActivities(activities.filter(a => a.id !== id));
      toast.success('Atividade concluída!');
    }
  };

  const deleteActivity = async (id: string) => {
    const { error } = await supabase
      .from('atividades_academicas')
      .delete()
      .eq('id', id);

    if (!error) {
      setActivities(activities.filter(a => a.id !== id));
      toast.success('Removido');
    }
  };

  const getStatusColor = (date: string) => {
    const days = differenceInDays(parseISO(date), new Date());
    if (days <= 1) return 'border-l-red-600 bg-red-950/20';
    if (days <= 3) return 'border-l-yellow-500 bg-yellow-950/20';
    return 'border-l-zinc-800';
  };

  const getDayText = (date: string) => {
    const days = differenceInDays(parseISO(date), new Date());
    if (days === 0) return 'ENTREGA HOJE';
    if (days < 0) return 'ATRASADO';
    if (days === 1) return 'FALTA 1 DIA';
    return `FALTAM ${days} DIAS`;
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">
      <header className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })} className="transition-none -ml-3">
            <ArrowLeft size={24} />
          </Button>
          <div className="flex items-center gap-2 text-purple-500">
            <GraduationCap size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Acadêmico</span>
          </div>
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Minhas Atividades</h1>
      </header>

      <form onSubmit={addActivity} className="space-y-4 mb-12 bg-zinc-950 p-6 rounded-[2.5rem] border border-zinc-900">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Atividade</label>
          <Input
            placeholder="Ex: Trabalho de Cálculo II"
            value={newActivity.nome}
            onChange={(e) => setNewActivity({ ...newActivity, nome: e.target.value })}
            className="bg-zinc-900 border-none h-14 rounded-2xl px-6 font-bold text-lg focus-visible:ring-1 ring-zinc-700"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Data de Entrega</label>
          <Input
            type="date"
            value={newActivity.data_entrega}
            onChange={(e) => setNewActivity({ ...newActivity, data_entrega: e.target.value })}
            className="bg-zinc-900 border-none h-14 rounded-2xl px-6 font-bold focus-visible:ring-1 ring-zinc-700 [color-scheme:dark]"
          />
        </div>
        <Button type="submit" className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-lg hover:bg-zinc-200 transition-none">
          <Plus size={24} className="mr-2" /> Adicionar Atividade
        </Button>
      </form>

      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <Card key={activity.id} className={`p-6 bg-zinc-950 border-zinc-900 rounded-[2rem] border-l-4 flex items-center justify-between transition-none group hover:bg-zinc-900/30 ${getStatusColor(activity.data_entrega)}`}>
              <div className="flex flex-col gap-1 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    differenceInDays(parseISO(activity.data_entrega), new Date()) < 1 
                      ? 'bg-red-600 text-white' 
                      : differenceInDays(parseISO(activity.data_entrega), new Date()) < 3 
                        ? 'bg-yellow-500 text-black' 
                        : 'bg-zinc-900 text-zinc-500'
                  }`}>
                    {getDayText(activity.data_entrega)}
                  </span>
                  <span className="text-[9px] font-black text-zinc-600 uppercase flex items-center">
                    <Calendar size={10} className="mr-1" />
                    {format(parseISO(activity.data_entrega), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                <span className="font-bold text-xl leading-tight">{activity.nome}</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="icon" 
                  className="h-12 w-12 rounded-xl bg-zinc-900 text-zinc-500 border border-zinc-800 hover:bg-white hover:text-black transition-none"
                  onClick={() => completeActivity(activity.id)}
                >
                  <Check size={20} />
                </Button>
                <Button 
                  size="icon" 
                  className="h-12 w-12 rounded-xl bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-red-500 transition-none"
                  onClick={() => deleteActivity(activity.id)}
                >
                  <Trash2 size={20} />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-24 bg-zinc-950/30 rounded-[2.5rem] border border-dashed border-zinc-900">
            <GraduationCap className="mx-auto mb-4 text-zinc-800" size={40} />
            <p className="text-zinc-700 font-black uppercase tracking-widest text-[10px]">Sem entregas pendentes</p>
          </div>
        )}
      </div>
    </div>
  );
}
