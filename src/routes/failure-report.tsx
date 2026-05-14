import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingDown, Smartphone, Bed, AlertTriangle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { subDays } from 'date-fns';
import { saveToLocal, loadFromLocal } from '@/lib/storage';

const TASKS_KEY = 'hardware_humano_tasks';
const CHECKIN_KEY = 'hardware_humano_checkin';
const SOCIAL_KEY = 'hardware_humano_social';

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

  const fetchFailureData = () => {
    const sevenDaysAgo = subDays(new Date(), 7);

    // 1. Inertia Deletions
    const allTasks = loadFromLocal(TASKS_KEY) || [];
    const inertiaCount = allTasks.filter((t: any) => t.deletado_por_inercia).length;

    // 2. Poor Sleep
    const checkinHistory = loadFromLocal(CHECKIN_KEY) || [];
    const poorSleep = checkinHistory.filter((h: any) => {
      const date = new Date(h.data);
      return date >= sevenDaysAgo && h.horas_sono && h.horas_sono < 7;
    }).length;

    // 3. Social usage
    const socialData = loadFromLocal(SOCIAL_KEY) || [];
    const social7 = socialData.filter((s: any) => new Date(s.data) >= sevenDaysAgo);
    const totalSocial = social7.reduce((acc: number, curr: any) => acc + curr.minutos, 0);

    // Success Rate
    const inertiaPenalty = inertiaCount * 15;
    const sleepPenalty = poorSleep * 5;
    const socialPenalty = Math.floor(totalSocial / 60) * 2;
    const calculatedSuccess = Math.max(0, 100 - (inertiaPenalty + sleepPenalty + socialPenalty));

    setStats({
      deletedInertia: inertiaCount,
      poorSleepDays: poorSleep,
      totalSocialMinutes: totalSocial,
      successRate: calculatedSuccess,
    });
    setLoading(false);
  };

  const handleSaveSocial = () => {
    if (!socialMinutes) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const history = loadFromLocal(SOCIAL_KEY) || [];
      const index = history.findIndex((h: any) => h.data === today);

      const data = {
        data: today,
        minutos: parseInt(socialMinutes),
      };

      if (index > -1) history[index] = data;
      else history.push(data);

      saveToLocal(SOCIAL_KEY, history);
      toast.success('Uso de redes sociais registrado');
      fetchFailureData();
      setSocialMinutes('');
    } catch (error) {
      toast.error('Erro ao salvar no hardware');
    }
  };

  const getAggressiveSummary = () => {
    const wasteTime = Math.floor(stats.totalSocialMinutes / 60);
    const lostMoney = (stats.deletedInertia * 50) + (wasteTime * 20);
    
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
