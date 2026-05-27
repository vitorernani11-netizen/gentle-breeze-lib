import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock,
  Flag,
  Send,
  X,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { parseNLP, NLPResult } from '@/utils/nlpParser';
import { CalendarPopover } from './CalendarPopover';
import { ReminderManager, type Reminder } from './ReminderManager';
import { SmartInput } from './SmartInput';
import { TimePickerPopover } from './TimePickerPopover';

interface AddTaskOverlayProps {
  open: boolean;
  onClose: () => void;
  onAddTask: (task: {
    titulo: string;
    vencimento: string;
    recorrencia: string;
    prioridade: string;
    lembrete: string | null;
    lembretes: Reminder[];
    reminders: any[];
    descricao?: string;
    hora_vencimento?: string | null;
  }) => void;
}

export const AddTaskOverlay: React.FC<AddTaskOverlayProps> = ({ open, onClose, onAddTask }) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [vencimento, setVencimento] = useState<Date | null>(null);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [prioridade, setPrioridade] = useState<string>('P4');
  const [lembrete, setLembrete] = useState<string | null>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setTitulo('');
      setDescricao('');
      setVencimento(null);
      setRecurrence('none');
      setPrioridade('P4');
      setLembrete(null);
      setReminders([]);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!titulo.trim()) return;

    // Se o chip de data está ativo (vencimento != null), parseamos para limpar o token do título.
    // Se o usuário anulou (vencimento == null), o título vai cru — como no Todoist.
    let finalTitle = titulo;
    if (vencimento) {
      const result = parseNLP(titulo);
      finalTitle = result.text || titulo;
    }

    onAddTask({
      titulo: finalTitle,
      vencimento: vencimento ? format(vencimento, 'yyyy-MM-dd') : '',
      recorrencia: recurrence,
      prioridade,
      lembrete: lembrete,
      lembretes: reminders,
      reminders: reminders,
      descricao,
      hora_vencimento: lembrete
    });
    
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-zinc-950 border-t border-x border-white/10 rounded-t-[2.5rem] p-8 pb-12 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-full duration-500 ease-out max-h-[90vh] overflow-y-auto overscroll-contain"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600">Nova Tarefa</span>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative group mb-4">
          <SmartInput
            value={titulo}
            onChange={(val) => setTitulo(val)}
            onSubmit={handleSubmit}
            placeholder="Nome da tarefa"
            className="bg-transparent border-none text-xl md:text-3xl font-black text-white placeholder:text-zinc-700 w-full focus:outline-none leading-snug"
            onParsed={(date, time) => {
              setVencimento(date);
              setLembrete(time);
            }}
          />
        </div>
        
        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descrição (opcional)"
          className="bg-transparent border-none text-sm placeholder:text-zinc-800 focus-visible:ring-0 p-0 min-h-[60px] resize-none mb-6"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-900 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <CalendarPopover 
              selectedDate={vencimento || startOfToday()} 
              onSelect={setVencimento}
              recurrence={recurrence}
              onRecurrenceSelect={setRecurrence}
            >
              <Button variant="ghost" className={cn("h-12 px-4 rounded-2xl border border-zinc-900 bg-zinc-900/50 transition-all", vencimento && "text-[#00ff41] border-[#00ff41]/30 bg-[#00ff41]/5")}>
                <CalendarIcon size={20} />
                <span className="ml-2 text-xs font-bold uppercase whitespace-nowrap">
                  {vencimento ? format(vencimento, "dd MMM", { locale: ptBR }) : "Agendar"}
                </span>
              </Button>
            </CalendarPopover>

            <TimePickerPopover selectedTime={lembrete} onSelect={setLembrete}>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 h-12 px-4 rounded-2xl border bg-zinc-900/50 transition-all active:scale-95",
                  lembrete
                    ? "text-[#00ff41] border-[#00ff41]/30 bg-[#00ff41]/5"
                    : "border-zinc-900 text-white"
                )}
              >
                <Clock size={20} />
                <span className="text-xs font-bold uppercase whitespace-nowrap">
                  {lembrete || '--:--'}
                </span>
              </button>
            </TimePickerPopover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className={cn(
                  "h-12 w-12 rounded-2xl border border-zinc-900 bg-zinc-900/50",
                  prioridade === 'P1' && "text-red-500 border-red-500/20 bg-red-500/5",
                  prioridade === 'P2' && "text-orange-500 border-orange-500/20 bg-orange-500/5",
                  prioridade === 'P3' && "text-blue-500 border-blue-500/20 bg-blue-500/5"
                )}>
                  <Flag size={18} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 bg-zinc-950 border-zinc-900 p-2 z-[110]">
                {['P1', 'P2', 'P3', 'P4'].map(p => (
                  <Button 
                    key={p} 
                    variant="ghost" 
                    className="w-full justify-start gap-2 font-bold" 
                    onClick={() => setPrioridade(p)}
                  >
                    <Flag size={14} className={cn(
                      p === 'P1' && "text-red-500",
                      p === 'P2' && "text-orange-500",
                      p === 'P3' && "text-blue-500"
                    )} />
                    {p}
                  </Button>
                ))}
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-12 w-12 rounded-2xl border border-zinc-900 bg-zinc-900/50",
                    reminders.length > 0 && "text-[#00ff41] border-[#00ff41]/30 bg-[#00ff41]/5"
                  )}
                  aria-label="Lembretes"
                >
                  <Bell size={18} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-zinc-950 border-zinc-900 p-4 z-[110]">
                <ReminderManager
                  reminders={reminders}
                  onUpdate={(r) => {
                    setReminders(r);
                    if (r.length > reminders.length && 'Notification' in window && Notification.permission === 'default') {
                      Notification.requestPermission();
                    }
                  }}
                />
              </PopoverContent>
            </Popover>

          </div>

          <Button 
            onClick={handleSubmit}
            disabled={!titulo.trim()}
            className="bg-white text-black hover:bg-zinc-200 rounded-2xl w-14 h-14 p-0 shrink-0 shadow-[0_0_25px_rgba(255,255,255,0.2)] disabled:opacity-20 transition-all active:scale-90"
          >
            <Send size={24} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
