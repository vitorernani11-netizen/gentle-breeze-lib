import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Plus, Wallet, Building2 } from 'lucide-react';
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell, XAxis, YAxis } from 'recharts';

export const Route = createFileRoute('/finance')({
  component: FinancePage,
});

function FinancePage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchRecords(session?.user?.id || 'anonymous');
    });
  }, []);

  const fetchRecords = async (userId: string) => {
    const { data } = await supabase
      .from('financeiro')
      .select('*')
      .eq('user_id', userId)
      .order('data', { ascending: false });

    if (data) setRecords(data);
    setLoading(false);
  };

  const calculateBalance = (conta: 'Pessoal' | 'Nabih') => {
    return records
      .filter(r => r.conta === conta)
      .reduce((acc, curr) => {
        const val = parseFloat(curr.valor);
        return curr.tipo === 'Entrada' ? acc + val : acc - val;
      }, 0);
  };

  const personalBalance = calculateBalance('Pessoal');
  const nabihBalance = calculateBalance('Nabih');

  const getChartData = () => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayRecords = records.filter(r => 
        r.conta === 'Nabih' && 
        new Date(r.data).toISOString().split('T')[0] === dateStr
      );

      const profit = dayRecords.reduce((acc, curr) => {
        const val = parseFloat(curr.valor);
        return curr.tipo === 'Entrada' ? acc + val : acc - val;
      }, 0);

      data.push({
        name: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        lucro: profit,
      });
    }
    return data;
  };

  const chartData = getChartData();

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pb-24">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Financeiro</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 mb-8">
        <Card className="p-6 bg-zinc-900 border-zinc-800 rounded-3xl">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Conta Pessoal</span>
            <Wallet className="text-zinc-500" size={16} />
          </div>
          <p className={`text-3xl font-black tracking-tighter ${personalBalance >= 0 ? 'text-white' : 'text-red-500'}`}>
            R$ {personalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-6 bg-white border-none rounded-3xl">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Caixa Nabih</span>
            <Building2 className="text-zinc-400" size={16} />
          </div>
          <p className={`text-3xl font-black tracking-tighter ${nabihBalance >= 0 ? 'text-black' : 'text-red-600'}`}>
            R$ {nabihBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      <section className="mb-10">
        <div className="flex justify-between items-end mb-4 px-1">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Meta Semanal (Nabih)</h2>
          <span className="text-[10px] font-black text-zinc-400 uppercase">Últimos 7 dias</span>
        </div>
        <Card className="p-4 bg-zinc-900 border-zinc-800 rounded-3xl h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="lucro" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.lucro >= 0 ? '#fff' : '#ef4444'} />
                ))}
              </Bar>
              <XAxis dataKey="name" hide />
              <YAxis hide />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Histórico</h2>
          <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase transition-none h-auto p-0 hover:bg-transparent">
            Ver Tudo
          </Button>
        </div>
        <div className="space-y-2">
          {records.slice(0, 10).map((record) => (
            <Card key={record.id} className="p-4 bg-zinc-900 border-zinc-800 rounded-2xl flex items-center justify-between transition-none">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`p-2 rounded-xl shrink-0 ${record.tipo === 'Entrada' ? 'bg-zinc-800 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                  {record.tipo === 'Entrada' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-bold truncate text-sm">{record.descricao || 'Sem descrição'}</span>
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${record.conta === 'Nabih' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {record.conta}
                  </span>
                </div>
              </div>
              <span className={`font-black tracking-tight whitespace-nowrap ${record.tipo === 'Entrada' ? 'text-white' : 'text-zinc-500'}`}>
                {record.tipo === 'Entrada' ? '+' : '-'} {parseFloat(record.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </Card>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
