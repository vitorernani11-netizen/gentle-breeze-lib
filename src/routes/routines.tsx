import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RotateCcw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { saveToLocal, loadFromLocal } from '@/lib/storage';

const ROUTINES_KEY = 'hardware_humano_routines';
const COMPLETIONS_KEY = 'hardware_humano_completions';

export const Route = createFileRoute('/routines')({
  component: Routines,
});

function Routines() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [completions, setCompletions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    const today = new Date().toISOString().split('T')[0];

    // Fetch routines
    const routinesData = loadFromLocal(ROUTINES_KEY) || [];

    // Fetch today's completions
    const completionsHistory = loadFromLocal(COMPLETIONS_KEY) || [];
    const todayCompletions = completionsHistory.filter((c: any) => c.data === today);

    setRoutines(routinesData);
    
    const completionsMap: Record<string, string[]> = {};
    todayCompletions.forEach((c: any) => {
      completionsMap[c.rotina_id] = c.itens_concluidos || [];
    });
    setCompletions(completionsMap);
    
    setLoading(false);
  };

  const toggleItem = (routineId: string, itemId: string) => {
    const currentCompleted = completions[routineId] || [];
    const isCompleted = currentCompleted.includes(itemId);
    
    const newCompleted = isCompleted 
      ? currentCompleted.filter(id => id !== itemId)
      : [...currentCompleted, itemId];

    const today = new Date().toISOString().split('T')[0];
    const history = loadFromLocal(COMPLETIONS_KEY) || [];
    const index = history.findIndex((c: any) => c.rotina_id === routineId && c.data === today);

    const data = {
      rotina_id: routineId,
      data: today,
      itens_concluidos: newCompleted
    };

    if (index > -1) history[index] = data;
    else history.push(data);

    saveToLocal(COMPLETIONS_KEY, history);
    setCompletions({ ...completions, [routineId]: newCompleted });

    if (!isCompleted && newCompleted.length === routines.find(r => r.id === routineId)?.itens?.length) {
      toast.success('Rotina concluída! 🚀');
    }
  };

  const createDefaultRoutines = () => {
    const defaults = [
      {
        id: '1',
        titulo: 'Rotina Matinal',
        itens: [
          { id: '1', label: 'Beber 500ml de água' },
          { id: '2', label: '10 min de meditação' },
          { id: '3', label: 'Arrumar a cama' },
          { id: '4', label: 'Banho gelado' }
        ]
      },
      {
        id: '2',
        titulo: 'Antes de Dormir',
        itens: [
          { id: '5', label: 'Planejar o dia seguinte' },
          { id: '6', label: 'Ler 10 páginas' },
          { id: '7', label: 'Higiene do sono' }
        ]
      }
    ];

    saveToLocal(ROUTINES_KEY, defaults);
    setRoutines(defaults);
    toast.success('Rotinas iniciais criadas!');
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-green-500 mb-2">
            <RotateCcw size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sistemas</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Rotinas</h1>
        </div>
        {routines.length === 0 && (
          <Button onClick={createDefaultRoutines} variant="outline" className="rounded-xl border-zinc-800 text-[10px] font-black uppercase h-10 transition-none">
            Resetar Padrões
          </Button>
        )}
      </header>

      <div className="space-y-6">
        {routines.map(routine => {
          const total = routine.itens?.length || 0;
          const completed = completions[routine.id]?.length || 0;
          const progress = total > 0 ? (completed / total) * 100 : 0;

          return (
            <Card key={routine.id} className="p-0 bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden transition-none">
              <div className="p-6 pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-black uppercase tracking-tight">{routine.titulo}</h3>
                  <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                    <span className="text-xs font-black">{completed}/{total}</span>
                  </div>
                </div>
                <Progress value={progress} className="h-2 bg-zinc-900" />
              </div>
              
              <div className="bg-zinc-900/30 px-6 py-4 space-y-4">
                {routine.itens?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4 group">
                    <div 
                      onClick={() => toggleItem(routine.id, item.id)}
                      className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${
                        completions[routine.id]?.includes(item.id) 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                      }`}
                    >
                      {completions[routine.id]?.includes(item.id) && <CheckCircle2 size={14} className="text-black" />}
                    </div>
                    <span className={`text-sm font-bold transition-all ${
                      completions[routine.id]?.includes(item.id) ? 'text-zinc-600 line-through' : 'text-zinc-300'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}

        {routines.length === 0 && (
          <div className="text-center py-24 bg-zinc-950 rounded-3xl border border-dashed border-zinc-900">
            <RotateCcw className="mx-auto mb-4 text-zinc-800 animate-pulse" size={40} />
            <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">Sem sistemas ativos</p>
          </div>
        )}
      </div>
    </div>
  );
}
