import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock,
  Flag, 
  Target,
  Send
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
  const [nlpData, setNlpData] = useState<NLPResult | null>(null);
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
      setNlpData(null);
    }
  }, [open]);

  useEffect(() => {
    if (titulo.trim()) {
      const result = parseNLP(titulo);
      setNlpData(result);
      
      if (result?.date) {
        setVencimento(new Date(result.date));
        if (result.detectedData.time) {
          setLembrete(result.detectedData.time);
        }
      } else {
        // REGRA DE OURO: Se o NLP retornar nulo, force a limpeza absoluta
        setVencimento(null);
        setLembrete(null);
      }
    } else {
      setNlpData(null);
      setVencimento(null);
      setLembrete(null);
    }
  }, [titulo]);

  const handleSubmit = () => {
    if (!titulo.trim()) return;

    const result = nlpData || parseNLP(titulo);
    
    let finalTitle = result ? result.text : titulo;

    // Formatting for LocalStorage as requested: due_date: "2026-05-14T17:00:00.000Z"
    const horaVencISO = vencimento ? vencimento.toISOString() : null;

    console.log('[Task:Create]', { title: finalTitle || titulo, due_date: horaVencISO, recurrence });

    onAddTask({
      titulo: finalTitle || titulo,
      vencimento: vencimento ? format(vencimento, 'yyyy-MM-dd') : '',
      recorrencia: recurrence,
      prioridade,
      lembrete: vencimento ? format(vencimento, 'HH:mm') : null,
      lembretes: reminders,
      reminders: reminders,
      descricao,
      hora_vencimento: lembrete || (vencimento ? format(vencimento, 'HH:mm') : null)
    });
    
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-zinc-950 border-t border-x border-white/10 rounded-t-[2.5rem] p-8 pb-12 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-full duration-500 ease-out"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600">Nova Captura</span>
        </div>

        <div className="relative group mb-4">
          <SmartInput
            value={titulo}
            onChange={(val) => setTitulo(val)}
            placeholder="Nova tarefa... (ex: reunião amanhã as 14h)"
            className="bg-transparent border-none text-xl md:text-3xl font-black uppercase text-white placeholder:text-zinc-700 w-full focus:outline-none"
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

            <div className="flex items-center gap-2 h-12 px-4 rounded-2xl border border-zinc-900 bg-zinc-900/50">
              <input
                type="time"
                value={lembrete || ''}
                onChange={(e) => setLembrete(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-white uppercase focus:ring-0 p-0 w-16"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "h-12 px-4 rounded-2xl border border-zinc-900 bg-zinc-900/50 transition-all", 
                    reminders.length > 0 && "text-[#00ff41] border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.2)] bg-[#00ff41]/5"
                  )}
                >
                  <Clock size={20} />
                  {reminders.length > 0 && <span className="ml-2 text-xs font-black tracking-tighter">{reminders.length}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-black border-2 border-white p-6 z-[150] shadow-[0_20px_50px_rgba(0,0,0,1)] rounded-3xl" align="start">
                <ReminderManager reminders={reminders} onUpdate={setReminders} />
              </PopoverContent>
            </Popover>

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

            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl border border-zinc-900 bg-zinc-900/50 text-zinc-700">
              <Target size={20} />
            </Button>
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
