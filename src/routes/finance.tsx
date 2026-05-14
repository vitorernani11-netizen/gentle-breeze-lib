import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, Building2, Landmark } from 'lucide-react';
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell, XAxis, YAxis } from 'recharts';
import { saveToLocal, loadFromLocal } from '@/lib/storage';

const FINANCE_KEY = 'hardware_humano_finance';

export const Route = createFileRoute('/finance')({
  component: FinancePage,
});

function FinancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
    setLoading(false);
  }, []);

  const fetchRecords = () => {
    const data = loadFromLocal(FINANCE_KEY) || [];
    setRecords(data);
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
        r.conta === 'Nabih' && r.data === dateStr
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
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">
      <header className="mb-10">
        <div className="flex items-center gap-2 text-yellow-500 mb-2">
          <Landmark size={20} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Fluxo</span>
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Finanças</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 mb-10">
        <Card className="p-6 bg-zinc-950 border-zinc-900 rounded-[2rem] flex flex-col gap-1 border-l-4 border-l-blue-900">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Conta Pessoal</span>
            <Wallet className="text-zinc-700" size={16} />
          </div>
          <p className={`text-4xl font-black tracking-tighter ${personalBalance >= 0 ? 'text-white' : 'text-red-500'}`}>
            R$ {personalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-6 bg-zinc-950 border-zinc-900 rounded-[2rem] flex flex-col gap-1 border-l-4 border-l-white">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Caixa Nabih</span>
            <Building2 className="text-zinc-700" size={16} />
          </div>
          <p className={`text-4xl font-black tracking-tighter ${nabihBalance >= 0 ? 'text-white' : 'text-red-500'}`}>
            R$ {nabihBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      <section className="mb-12">
        <div className="flex justify-between items-end mb-4 px-1">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Performance Semanal (Nabih)</h2>
        </div>
        <Card className="p-6 bg-zinc-950 border-zinc-900 rounded-[2rem] h-56 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '16px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="lucro" radius={[6, 6, 0, 0]}>
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
        <div className="flex justify-between items-center mb-6 px-1">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Histórico Recente</h2>
        </div>
        <div className="space-y-3">
          {records.slice(0, 8).map((record) => (
            <Card key={record.id} className="p-5 bg-zinc-950 border-zinc-900 rounded-2xl flex items-center justify-between transition-none group hover:bg-zinc-900/30">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${record.tipo === 'Entrada' ? 'bg-zinc-900 text-white border border-zinc-800' : 'bg-zinc-900 text-zinc-700 border border-zinc-900'}`}>
                  {record.tipo === 'Entrada' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-bold truncate text-sm">{record.descricao || 'Transação'}</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${record.conta === 'Nabih' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    {record.conta} • {new Date(record.data).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              <span className={`font-black tracking-tighter text-lg ${record.tipo === 'Entrada' ? 'text-white' : 'text-zinc-600'}`}>
                {record.tipo === 'Entrada' ? '+' : '-'} {parseFloat(record.valor).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
