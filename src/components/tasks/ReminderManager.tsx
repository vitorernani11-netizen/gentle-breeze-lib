import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Reminder {
  id: string;
  time: string; // "30 min before", "1 hour before", etc
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

  const options = [
    { label: 'No horário', value: 'at_time' },
    { label: '5 min antes', value: '5_min' },
    { label: '10 min antes', value: '10_min' },
    { label: '15 min antes', value: '15_min' },
    { label: '30 min antes', value: '30_min' },
    { label: '1 hora antes', value: '1_hour' },
  ];

  const addReminder = (value: string) => {
    if (reminders.some(r => r.time === value)) return;
    const newReminder: Reminder = {
      id: crypto.randomUUID(),
      time: value
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
        className="w-64 bg-black border-2 border-white p-4 z-[150] shadow-[0_10px_40px_rgba(0,0,0,0.9)]"
        align="start"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Lembretes</span>
            <span className="text-[10px] font-bold text-zinc-700">{reminders.length}/5</span>
          </div>

          {reminders.length > 0 ? (
            <div className="space-y-1">
              {reminders.map((r) => (
                <div 
                  key={r.id} 
                  className="flex items-center justify-between group bg-zinc-900/50 p-2 rounded-sm border border-zinc-900 hover:border-zinc-700 transition-all"
                >
                  <span className="text-xs font-bold text-white">
                    {options.find(o => o.value === r.time)?.label || r.time}
                  </span>
                  <button 
                    onClick={() => removeReminder(r.id)}
                    className="text-zinc-600 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center border border-dashed border-zinc-800 opacity-40">
              <span className="text-[10px] font-black uppercase">Sem lembretes</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-1 pt-2 border-t border-zinc-900">
            <span className="text-[8px] font-black uppercase text-zinc-600 mb-1">Adicionar novo</span>
            <div className="grid grid-cols-2 gap-1">
              {options.filter(o => !reminders.some(r => r.time === o.value)).slice(0, 6).map((opt) => (
                <Button
                  key={opt.value}
                  variant="ghost"
                  className="justify-start h-7 px-2 text-[9px] font-black uppercase bg-zinc-900/30 hover:bg-[#00ff41] hover:text-black transition-all rounded-none"
                  onClick={() => addReminder(opt.value)}
                >
                  <Plus size={10} className="mr-1" />
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
