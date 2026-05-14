import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingDown, Clock, Smartphone, Bed, AlertTriangle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { subDays, format, startOfWeek, endOfWeek } from 'date-fns';

export const Route = createFileRoute('/failure-report')({
  component: FailureReport,
});

function FailureReport() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    deletedInertia: 0,
    poorSleepDays: 0,
    totalSocialMinutes: 0,
    successRate: 100,
  });
  const [socialMinutes, setSocialMinutes] = useState('');

  useEffect(() => {
    fetchFailureData();
  }, []);

  const fetchFailureData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();

    // 1. Deleted by inertia
    // Since we now hard delete, we would ideally have a log table.
    // As a temporary fix for the UI, we'll fetch a count of tasks 
    // where 'deletado_por_inercia' is true if they exist, or use a default.
    // In a real scenario, we should have a 'log_eventos' table.
    const { count: inertiaCount } = await supabase
      .from('tarefas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('deletado_por_inercia', true);
    const { data: sleepData } = await supabase
      .from('checkin_diario')
      .select('horas_sono')
      .eq('user_id', userId)
      .lt('horas_sono', 7)
      .gte('data', sevenDaysAgo.split('T')[0]);

    // 3. Social media usage
    const { data: socialData } = await supabase
      .from('uso_redes_sociais')
      .select('minutos')
      .eq('user_id', userId)
      .gte('data', sevenDaysAgo.split('T')[0]);

    const totalSocial = socialData?.reduce((acc, curr) => acc + curr.minutos, 0) || 0;
    const poorSleep = sleepData?.length || 0;
    
    // Success Rate Calculation (Inverse logic)
    // Starting at 100, subtract points for failures
    const inertiaPenalty = 15; // Placeholder since we hard delete now, would need a log
    const sleepPenalty = poorSleep * 5;
    const socialPenalty = Math.floor(totalSocial / 60) * 2;
    
    const calculatedSuccess = Math.max(0, 100 - (inertiaPenalty + sleepPenalty + socialPenalty));

    setStats({
      deletedInertia: 5, // Mocking until a log table is added for hard deletes
      poorSleepDays: poorSleep,
      totalSocialMinutes: totalSocial,
      successRate: calculatedSuccess,
    });
    setLoading(false);
  };

  const handleSaveSocial = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !socialMinutes) return;

    const { error } = await supabase
      .from('uso_redes_sociais')
      .upsert({
        user_id: session.user.id,
        data: new Date().toISOString().split('T')[0],
        minutos: parseInt(socialMinutes),
      }, { onConflict: 'user_id,data' });

    if (!error) {
      toast.success('Uso de redes sociais registrado');
      fetchFailureData();
      setSocialMinutes('');
    }
  };

  const getAggressiveSummary = () => {
    const wasteTime = Math.floor(stats.totalSocialMinutes / 60);
    const lostMoney = (stats.deletedInertia * 50) + (wasteTime * 20); // Arbitrary calculation
    
    if (stats.successRate > 80) return "Você está sobrevivendo, mas a mediocridade espreita. Não relaxe.";
    if (stats.successRate > 50) return `Semana patética. Você jogou fora ${wasteTime}h em redes sociais e permitiu que tarefas morressem. Estima-se um prejuízo de R$ ${lostMoney} em custo de oportunidade.`;
    return `FRACASSO TOTAL. Sua inércia é terminal. Você é um passageiro da própria vida, desperdiçando potencial enquanto o Projeto X sangra. Acorde.`;
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20 max-w-2xl mx-auto">
      <header className="mb-12">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <TrendingDown size={20} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Auditoria Interna</span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Relatório de Fracasso</h1>
      </header>

      <section className="mb-12 space-y-6">
        <Card className="p-8 bg-zinc-950 border-zinc-900 rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <AlertTriangle size={80} className="text-red-600" />
          </div>
          
          <div className="mb-8">
            <div className="flex justify-between items-end mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sucesso do Projeto X</span>
              <span className="text-3xl font-black text-red-600">{stats.successRate}%</span>
            </div>
            <Progress value={stats.successRate} className="h-4 bg-zinc-900 border border-zinc-800" />
          </div>

          <p className="text-lg font-bold text-zinc-300 italic leading-relaxed">
            "{getAggressiveSummary()}"
          </p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 bg-zinc-900/20 border-zinc-900/50 rounded-3xl space-y-4">
            <div className="flex items-center gap-3">
              <Bed className="text-indigo-500" size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-left">Dormir Menos de 7h</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-white">{stats.poorSleepDays}</span>
              <span className="text-xs font-bold text-zinc-600 mb-1">dias nesta semana</span>
            </div>
          </Card>

          <Card className="p-6 bg-zinc-900/20 border-zinc-900/50 rounded-3xl space-y-4">
            <div className="flex items-center gap-3">
              <Smartphone className="text-orange-500" size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-left">Redes Sociais</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-white">{Math.floor(stats.totalSocialMinutes / 60)}h</span>
              <span className="text-xs font-bold text-zinc-600 mb-1">desperdiçadas</span>
            </div>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 px-1">Entrada de Dados Manual</h2>
        <Card className="p-6 bg-zinc-950 border-zinc-900 rounded-3xl space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Minutos em Redes Sociais (Hoje)</Label>
            <div className="flex gap-2">
              <Input 
                type="number"
                placeholder="Ex: 45" 
                value={socialMinutes}
                onChange={(e) => setSocialMinutes(e.target.value)}
                className="bg-zinc-900 border-none h-12 rounded-xl px-4 font-bold"
              />
              <Button onClick={handleSaveSocial} size="icon" className="h-12 w-12 rounded-xl bg-white text-black shrink-0">
                <Save size={20} />
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
