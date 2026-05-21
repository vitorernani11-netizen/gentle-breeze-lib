import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Reminder {
  id: string;
  tipo: '1h' | '30min' | '15min' | 'personalizado' | 'at_time';
  minutosAntecendia: number;
  disparado?: boolean;
}

interface ReminderManagerProps {
  reminders: Reminder[];
  onUpdate: (reminders: Reminder[]) => void;
}

type Unit = 'm' | 'h' | 'd';

export const ReminderManager: React.FC<ReminderManagerProps> = ({ 
  reminders, 
  onUpdate
}) => {
  const [customValue, setCustomValue] = useState<string>('');
  const [unit, setUnit] = useState<Unit>('m');

  const handleAdd = () => {
    const val = parseInt(customValue);
    if (isNaN(val) || val < 0) return;

    // Converter tudo para minutos para manter compatibilidade do banco
    let mins = val;
    if (unit === 'h') mins = val * 60;
    if (unit === 'd') mins = val * 1440;

    if (!reminders.some(r => r.minutosAntecendia === mins)) {
      const newReminder: Reminder = {
        id: crypto.randomUUID(),
        tipo: 'personalizado',
        minutosAntecendia: mins,
        disparado: false
      };
      onUpdate([...reminders, newReminder]);
    }
    setCustomValue('');
  };

  const removeReminder = (id: string) => {
    onUpdate(reminders.filter(r => r.id !== id));
  };

  const formatMin = (m: number) => {
    if (m === 0) return 'No horário';
    if (m >= 1440 && m % 1440 === 0) return `${m / 1440}d`;
    if (m >= 60 && m % 60 === 0) return `${m / 60}h`;
    return `${m}m`;
  };

  return (
    <div className="space-y-3">
      {/* Linha de Lembretes Ativos */}
      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center gap-1.5 mr-2">
          <Bell size={14} className="text-zinc-600" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Lembretes</span>
        </div>
        
        {reminders.map((r) => (
          <div 
            key={r.id} 
            className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 pl-2 pr-1 py-0.5 rounded group hover:border-zinc-700 transition-colors"
          >
            <span className="text-[10px] font-bold uppercase tracking-tighter text-zinc-300">
              {formatMin(r.minutosAntecendia)} antes
            </span>
            <button 
              onClick={() => removeReminder(r.id)}
              className="w-4 h-4 flex items-center justify-center rounded text-zinc-600 group-hover:text-red-500 transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Linha Slim de Criação */}
      <div className="flex items-center gap-2 bg-zinc-900/30 p-1.5 rounded-xl border border-zinc-800/50">
        <input 
          type="number"
          placeholder="0"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="w-12 h-8 bg-transparent text-center text-sm font-bold text-white focus:outline-none placeholder:text-zinc-700"
        />
        
        <div className="flex gap-1 bg-zinc-950 p-1 rounded-lg">
          {(['m', 'h', 'd'] as Unit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={cn(
                "px-2.5 py-1 text-[10px] font-black uppercase rounded transition-all",
                unit === u 
                  ? "bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/30" 
                  : "text-zinc-600 hover:text-zinc-400 border border-transparent"
              )}
            >
              {u === 'm' ? 'Min' : u === 'h' ? 'Hrs' : 'Dias'}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          disabled={!customValue}
          onClick={handleAdd}
          className="h-8 w-8 ml-auto bg-[#00ff41]/10 hover:bg-[#00ff41] text-[#00ff41] hover:text-black rounded-lg transition-colors p-0 border border-[#00ff41]/20"
        >
          <Plus size={14} />
        </Button>
      </div>
    </div>
  );
};