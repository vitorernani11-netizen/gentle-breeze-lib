import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Calendar as CalendarIcon,
  Repeat,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  format,
  startOfToday,
  startOfTomorrow,
  nextMonday,
  isSameDay,
  nextSaturday,
  setHours,
  setMinutes,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseNLP, Recurrence } from '@/utils/nlpParser';

type SimpleRec = 'none' | 'daily' | 'weekly' | 'monthly';

interface CalendarPopoverProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  recurrence?: SimpleRec;
  onRecurrenceSelect?: (recurrence: SimpleRec) => void;
  nlpRecurrence?: Recurrence | null;
  onNlpRecurrenceSelect?: (rec: Recurrence | null) => void;
  children: React.ReactNode;
}

const WD_ABBR: Record<string, string> = {
  domingo: 'DOM', segunda: 'SEG', 'terça': 'TER', quarta: 'QUA',
  quinta: 'QUI', sexta: 'SEX', 'sábado': 'SAB',
};

const formatWeekdays = (wds?: string[]) =>
  (wds || []).map((w) => WD_ABBR[w] || w.slice(0, 3).toUpperCase()).join(' ');

export const CalendarPopover: React.FC<CalendarPopoverProps> = ({
  selectedDate,
  onSelect,
  recurrence = 'none',
  onRecurrenceSelect,
  nlpRecurrence = null,
  onNlpRecurrenceSelect,
  children,
}) => {
  const [view, setView] = useState<'main' | 'repeat'>('main');
  const [nlpText, setNlpText] = useState('');
  const [nlpError, setNlpError] = useState(false);

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

  const recurrenceLabel = () => {
    if (nlpRecurrence?.weekdays && nlpRecurrence.weekdays.length > 0) {
      return formatWeekdays(nlpRecurrence.weekdays);
    }
    if (recurrence === 'none') return 'Repetir';
    const map: Record<SimpleRec, string> = {
      none: 'Repetir',
      daily: 'TODO DIA',
      weekly: 'TODA SEMANA',
      monthly: 'TODO MÊS',
    };
    return map[recurrence];
  };

  const applyNlpText = () => {
    const txt = nlpText.trim();
    if (!txt) return;
    const result = parseNLP(txt);
    if (result.recurrence) {
      onNlpRecurrenceSelect?.(result.recurrence);
      const t = result.recurrence.type;
      onRecurrenceSelect?.(t === 'weekdays' ? 'weekly' : t);
      setNlpText('');
      setNlpError(false);
      setView('main');
    } else {
      setNlpError(true);
    }
  };

  const isActive = (id: SimpleRec) =>
    !nlpRecurrence?.weekdays && recurrence === id;

  return (
    <Popover onOpenChange={(open) => !open && setView('main')}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[300px] max-h-[80vh] overflow-y-auto bg-black border-2 border-white p-0 z-[150] shadow-[0_10px_40px_rgba(0,0,0,0.9)]"
        align="start"
        side="top"
        sideOffset={8}
        collisionPadding={16}
      >
        {view === 'main' ? (
          <div className="flex flex-col">
            <div className="p-2 space-y-1">
              {shortcuts.map((s) => (
                <Button
                  key={s.label}
                  variant="ghost"
                  className={cn(
                    'w-full justify-between font-bold text-xs h-9 rounded-none hover:bg-zinc-900 transition-all px-3',
                    isSameDay(selectedDate, s.date) ? 'text-[#00ff41]' : 'text-white'
                  )}
                  onClick={() => {
                    const newDate = new Date(s.date);
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
                  day_selected:
                    'bg-[#00ff41] text-black hover:bg-[#00ff41] hover:text-black focus:bg-[#00ff41] focus:text-black font-black',
                  day_today: 'text-[#00ff41] font-bold border border-[#00ff41]/30',
                  head_cell: 'text-zinc-500 font-black text-[10px] uppercase',
                  cell: 'text-center text-xs p-0 relative focus-within:relative focus-within:z-20',
                  day: cn(
                    'h-8 w-8 p-0 font-bold aria-selected:opacity-100 hover:bg-zinc-900 rounded-none transition-all'
                  ),
                }}
              />
            </div>

            {onRecurrenceSelect && (
              <div className="border-t border-zinc-900 p-1 flex items-center justify-end">
                <Button
                  variant="ghost"
                  className={cn(
                    'h-9 px-3 text-[10px] font-black uppercase transition-all',
                    nlpRecurrence?.weekdays
                      ? 'text-orange-400'
                      : recurrence !== 'none'
                      ? 'text-[#00ff41]'
                      : 'text-zinc-400 hover:text-white'
                  )}
                  onClick={() => setView('repeat')}
                >
                  <Repeat size={14} className="mr-2" />
                  {recurrenceLabel()}
                </Button>
              </div>
            )}
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
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Recorrência
              </span>
            </div>

            {nlpRecurrence?.weekdays && nlpRecurrence.weekdays.length > 0 && (
              <div className="text-[10px] font-black uppercase tracking-wider text-orange-400 border border-orange-400/30 bg-orange-400/5 px-2 py-1.5 rounded">
                Configurado: {formatWeekdays(nlpRecurrence.weekdays)}
              </div>
            )}

            {/* NLP text input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Sparkles size={11} className="text-orange-400" />
                Digite a rotina
              </label>
              <div className="flex gap-2">
                <Input
                  value={nlpText}
                  onChange={(e) => {
                    setNlpText(e.target.value);
                    setNlpError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyNlpText();
                    }
                  }}
                  placeholder="Ex: toda quinta e sexta"
                  className={cn(
                    'bg-zinc-900 border-zinc-800 text-white text-xs h-9 placeholder:text-zinc-600 focus-visible:ring-0',
                    nlpError && 'border-red-500'
                  )}
                />
                <Button
                  type="button"
                  onClick={applyNlpText}
                  disabled={!nlpText.trim()}
                  className="h-9 px-3 bg-orange-400 text-black hover:bg-orange-300 text-[10px] font-black uppercase disabled:opacity-30"
                >
                  OK
                </Button>
              </div>
              <p className="text-[9px] text-zinc-600 uppercase tracking-wide">
                {nlpError ? 'Não reconheci. Tente "toda quinta"' : 'Pressione Enter para aplicar'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Padrões rápidos
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'none' as const, label: 'Não repetir' },
                  { id: 'daily' as const, label: 'Todo dia' },
                  { id: 'weekly' as const, label: 'Toda semana' },
                  { id: 'monthly' as const, label: 'Todo mês' },
                ].map((opt) => (
                  <Button
                    key={opt.id}
                    variant="ghost"
                    className={cn(
                      'h-10 font-bold text-[11px] rounded border',
                      isActive(opt.id)
                        ? 'bg-[#00ff41]/10 border-[#00ff41] text-[#00ff41]'
                        : 'border-zinc-800 text-white hover:bg-zinc-900'
                    )}
                    onClick={() => {
                      onRecurrenceSelect?.(opt.id);
                      if (opt.id === 'none') {
                        onNlpRecurrenceSelect?.(null);
                      } else {
                        onNlpRecurrenceSelect?.({ type: opt.id });
                      }
                      setView('main');
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
