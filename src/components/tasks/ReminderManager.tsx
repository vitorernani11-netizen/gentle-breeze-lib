import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, X, Bell, Clock } from 'lucide-react';
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
  children: React.ReactNode;
}

export const ReminderManager: React.FC<ReminderManagerProps> = ({ 
  reminders, 
  onUpdate, 
  children 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState<string>('');

  const options: { label: string; tipo: Reminder['tipo']; minutos: number }[] = [
    { label: 'No horário', tipo: 'at_time', minutos: 0 },
    { label: '15 min antes', tipo: '15min', minutos: 15 },
    { label: '30 min antes', tipo: '30min', minutos: 30 },
    { label: '1 hora antes', tipo: '1h', minutos: 60 },
  ];

  const addReminder = (tipo: Reminder['tipo'], minutos: number) => {
    if (reminders.some(r => r.minutosAntecendia === minutos)) return;
    const newReminder: Reminder = {
      id: crypto.randomUUID(),
      tipo,
      minutosAntecendia: minutos,
      disparado: false
    };
    onUpdate([...reminders, newReminder]);
  };

  const removeReminder = (id: string) => {
    onUpdate(reminders.filter(r => r.id !== id));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 bg-black border-2 border-white p-6 z-[150] shadow-[0_20px_50px_rgba(0,0,0,1)] rounded-3xl"
        align="start"
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-[#00ff41]" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Notificações</span>
            </div>
            <span className="text-[10px] font-black text-zinc-700 bg-zinc-900 px-2 py-0.5 rounded-full">{reminders.length} ativos</span>
          </div>

          {reminders.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {reminders.map((r) => (
                <div 
                  key={r.id} 
                  className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 pl-3 pr-1 py-1 rounded-xl transition-all hover:border-zinc-700 shadow-lg"
                >
                  <span className="text-[10px] font-black uppercase tracking-tighter text-white">
                    {r.minutosAntecendia === 0 ? 'No Horário' : `${r.minutosAntecendia}m antes`}
                  </span>
                  <button 
                    onClick={() => removeReminder(r.id)}
                    className="w-6 h-6 flex items-center justify-center bg-black rounded-lg text-zinc-600 hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center border-2 border-dashed border-zinc-900 rounded-2xl bg-zinc-950/30">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Sem Alertas Ativos</span>
            </div>
          )}

          <div className="space-y-3 pt-2 border-t border-zinc-900">
            <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest ml-1">Configurar Alerta</span>
            <div className="grid grid-cols-2 gap-2">
              {options.map((opt) => (
                <Button
                  key={opt.tipo}
                  variant="ghost"
                  className={cn(
                    "justify-center h-12 text-[10px] font-black uppercase tracking-tighter bg-zinc-900/50 hover:bg-[#00ff41] hover:text-black transition-all rounded-xl border border-zinc-800",
                    reminders.some(r => r.minutosAntecendia === opt.minutos) && "opacity-20 pointer-events-none"
                  )}
                  onClick={() => addReminder(opt.tipo, opt.minutos)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            
            <div className="flex gap-2 pt-2">
              <div className="relative flex-1">
                <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input 
                  type="number"
                  placeholder="Minutos..."
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 text-xs font-bold text-white focus:outline-none focus:border-[#00ff41] transition-all"
                />
              </div>
              <Button
                variant="ghost"
                disabled={!customValue}
                className="h-12 w-12 bg-zinc-900 hover:bg-white hover:text-black rounded-xl border border-zinc-800"
                onClick={() => {
                  const mins = parseInt(customValue);
                  if (!isNaN(mins)) {
                    addReminder('personalizado', mins);
                    setCustomValue('');
                  }
                }}
              >
                <Plus size={18} />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

