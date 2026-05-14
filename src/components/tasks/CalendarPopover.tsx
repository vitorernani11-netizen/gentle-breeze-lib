import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Repeat, 
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  format, 
  addDays, 
  startOfToday, 
  startOfTomorrow, 
  nextMonday, 
  isSameDay,
  nextSaturday,
  setHours,
  setMinutes
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarPopoverProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  onRecurrenceSelect?: (recurrence: 'none' | 'daily' | 'weekly' | 'monthly') => void;
  children: React.ReactNode;
}

export const CalendarPopover: React.FC<CalendarPopoverProps> = ({ 
  selectedDate, 
  onSelect, 
  recurrence = 'none',
  onRecurrenceSelect,
  children 
}) => {
  const [view, setView] = useState<'main' | 'time' | 'repeat'>('main');
  const today = startOfToday();
  const tomorrow = startOfTomorrow();
  const weekend = nextSaturday(today);
  const nextWeek = nextMonday(today);

  const shortcuts = [
    { label: 'Hoje', date: today, sub: format(today, 'EEE', { locale: ptBR }) },
    { label: 'Amanhã', date: tomorrow, sub: format(tomorrow, 'EEE', { locale: ptBR }) },
    { label: 'Este fim de semana', date: weekend, sub: 'Sáb' },
    { label: 'Próxima semana', date: nextWeek, sub: format(nextWeek, 'd MMM', { locale: ptBR }) },
  ];

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(':').map(Number);
    const newDate = setHours(setMinutes(new Date(selectedDate), m), h);
    onSelect(newDate);
  };

  return (
    <Popover onOpenChange={(open) => !open && setView('main')}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[280px] bg-black border-2 border-white p-0 z-[150] shadow-[0_10px_40px_rgba(0,0,0,0.9)] overflow-hidden"
        align="start"
      >
        {view === 'main' ? (
          <div className="flex flex-col">
            <div className="p-2 space-y-1">
              {shortcuts.map((s) => (
                <Button
                  key={s.label}
                  variant="ghost"
                  className={cn(
                    "w-full justify-between font-bold text-xs h-9 rounded-none hover:bg-zinc-900 transition-all px-3",
                    isSameDay(selectedDate, s.date) ? "text-[#00ff41]" : "text-white"
                  )}
                  onClick={() => {
                    const newDate = new Date(s.date);
                    // Preserve time if already set
                    newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                    onSelect(newDate);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={14} className="opacity-50" />
                    <span>{s.label}</span>
                  </div>
                  <span className="text-[10px] opacity-40 uppercase">{s.sub}</span>
                </Button>
              ))}
            </div>

            <div className="border-t border-zinc-900 p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    const newDate = new Date(date);
                    newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                    onSelect(newDate);
                  }
                }}
                locale={ptBR}
                className="p-0"
                classNames={{
                  day_selected: "bg-[#00ff41] text-black hover:bg-[#00ff41] hover:text-black focus:bg-[#00ff41] focus:text-black font-black",
                  day_today: "text-[#00ff41] font-bold border border-[#00ff41]/30",
                  head_cell: "text-zinc-500 font-black text-[10px] uppercase",
                  cell: "text-center text-xs p-0 relative focus-within:relative focus-within:z-20",
                  day: cn(
                    "h-8 w-8 p-0 font-bold aria-selected:opacity-100 hover:bg-zinc-900 rounded-none transition-all"
                  ),
                }}
              />
            </div>

            <div className="border-t border-zinc-900 p-1 flex items-center justify-between">
              <Button 
                variant="ghost" 
                className={cn(
                  "h-9 px-3 text-[10px] font-black uppercase transition-all",
                  view === 'time' ? "text-[#00ff41]" : "text-zinc-400 hover:text-white"
                )}
                onClick={() => setView('time')}
              >
                <Clock size={14} className="mr-2" />
                {format(selectedDate, 'HH:mm')}
              </Button>
              <Button 
                variant="ghost" 
                className={cn(
                  "h-9 px-3 text-[10px] font-black uppercase transition-all",
                  recurrence !== 'none' ? "text-[#00ff41]" : "text-zinc-400 hover:text-white"
                )}
                onClick={() => setView('repeat')}
              >
                <Repeat size={14} className="mr-2" />
                {recurrence === 'none' ? 'Repetir' : recurrence.toUpperCase()}
              </Button>
            </div>
          </div>
        ) : view === 'time' ? (
          <div className="p-4 space-y-4 animate-in slide-in-from-right-2 duration-200">
            <div className="flex items-center gap-2 mb-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setView('main')}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Configurar Horário</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-600 block mb-1.5">Hora</label>
                <input 
                  type="time" 
                  className="w-full bg-zinc-900 border border-zinc-800 text-white p-2 text-sm font-bold focus:border-[#00ff41] outline-none"
                  value={format(selectedDate, 'HH:mm')}
                  onChange={handleTimeChange}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {['09:00', '12:00', '15:00', '18:00', '21:00'].map(t => (
                  <Button 
                    key={t}
                    variant="ghost"
                    className="h-8 px-2 text-[10px] font-black border border-zinc-800"
                    onClick={() => {
                      const [h, m] = t.split(':').map(Number);
                      const newDate = setHours(setMinutes(new Date(selectedDate), m), h);
                      onSelect(newDate);
                    }}
                  >
                    {t}
                  </Button>
                ))}
              </div>

              <Button 
                className="w-full bg-[#00ff41] text-black font-black uppercase text-xs h-10 hover:bg-[#00cc33]"
                onClick={() => setView('main')}
              >
                Confirmar
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 animate-in slide-in-from-right-2 duration-200">
             <div className="flex items-center gap-2 mb-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setView('main')}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Recorrência</span>
            </div>

            <div className="space-y-1">
              {[
                { id: 'none', label: 'Não repetir' },
                { id: 'daily', label: 'Todo dia' },
                { id: 'weekly', label: 'Toda semana' },
                { id: 'monthly', label: 'Todo mês' }
              ].map((opt) => (
                <Button
                  key={opt.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-10 font-bold text-xs rounded-none border-l-2",
                    recurrence === opt.id ? "bg-zinc-900 border-[#00ff41] text-[#00ff41]" : "border-transparent text-white"
                  )}
                  onClick={() => {
                    onRecurrenceSelect?.(opt.id as any);
                    setView('main');
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
