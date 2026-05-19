import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  Flag,
  Tag,
  Bell,
  Hash,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskDetailModalProps {
  task: any | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Record<string, any>) => void;
}

const PRIORITIES = [
  { value: 1, label: 'P1', color: 'text-red-500 border-red-500' },
  { value: 2, label: 'P2', color: 'text-orange-500 border-orange-500' },
  { value: 3, label: 'P3', color: 'text-blue-500 border-blue-500' },
  { value: 4, label: 'P4', color: 'text-zinc-500 border-zinc-700' },
];

export function TaskDetailModal({ task, open, onClose, onUpdate }: TaskDetailModalProps) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<number>(4);
  const [dataExecucao, setDataExecucao] = useState('');
  const [lembrete, setLembrete] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (task && open) {
      initRef.current = false;
      setTitulo(task.titulo || '');
      setDescricao(task.descricao || '');
      setPrioridade(task.prioridade || 4);
      setDataExecucao(task.data_execucao || '');
      setLembrete(task.lembrete || '');
      // mark as initialized after state apply
      setTimeout(() => { initRef.current = true; }, 0);
    }
    if (!open) initRef.current = false;
  }, [task, open]);

  const triggerSave = (updates: Record<string, any>) => {
    if (!task?.id) return;
    onUpdate(task.id, updates);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  // Debounced save for text fields
  useEffect(() => {
    if (!open || !task?.id || !initRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerSave({ titulo, descricao });
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo, descricao]);

  if (!task) return null;

  const handlePriority = (p: number) => {
    setPrioridade(p);
    triggerSave({ prioridade: p });
  };

  const handleDate = (v: string) => {
    setDataExecucao(v);
    triggerSave({ data_execucao: v });
  };

  const handleLembrete = (v: string) => {
    setLembrete(v);
    triggerSave({ lembrete: v || null });
  };

  const currentPriority = PRIORITIES.find((p) => p.value === prioridade) || PRIORITIES[3];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-4xl w-[95vw] p-0 bg-black border-2 border-white rounded-2xl overflow-hidden gap-0"
        onInteractOutside={onClose}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <span>Entrada</span>
          </div>
        </div>

        {/* Body: 2 cols on desktop, stack on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] max-h-[80vh] overflow-y-auto">
          {/* Main column */}
          <div className="p-6 space-y-4 md:border-r border-zinc-800">
            <div>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título da tarefa"
                className="border-0 bg-transparent text-xl font-bold uppercase tracking-tight text-white p-0 h-auto shadow-none focus-visible:ring-0"
              />
            </div>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição"
              className="border-0 bg-transparent text-sm text-zinc-400 p-0 min-h-[100px] shadow-none focus-visible:ring-0 resize-none"
            />
          </div>

          {/* Sidebar */}
          <div className="p-4 space-y-4 bg-zinc-950/50">
            {/* Data */}
            <SidebarRow icon={<Calendar size={14} />} label="Data">
              <input
                type="date"
                value={dataExecucao}
                onChange={(e) => handleDate(e.target.value)}
                className="bg-transparent border border-zinc-800 rounded-md px-2 py-1 text-xs text-white w-full focus:outline-none focus:border-white"
              />
            </SidebarRow>

            {/* Prioridade */}
            <SidebarRow icon={<Flag size={14} className={currentPriority.color.split(' ')[0]} />} label="Prioridade">
              <div className="flex gap-1">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handlePriority(p.value)}
                    className={cn(
                      'flex-1 text-[10px] font-bold py-1 border rounded-md transition-all',
                      prioridade === p.value
                        ? `${p.color} bg-white/5`
                        : 'border-zinc-800 text-zinc-600 hover:text-zinc-300'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </SidebarRow>

            {/* Lembrete */}
            <SidebarRow icon={<Bell size={14} />} label="Lembrete">
              <input
                type="time"
                value={lembrete || ''}
                onChange={(e) => handleLembrete(e.target.value)}
                className="bg-transparent border border-zinc-800 rounded-md px-2 py-1 text-xs text-white w-full focus:outline-none focus:border-white"
              />
            </SidebarRow>

            {/* Etiquetas (placeholder) */}
            <SidebarRow icon={<Tag size={14} />} label="Etiquetas">
              <span className="text-[10px] text-zinc-600 italic">em breve</span>
            </SidebarRow>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            {savedFlash ? (
              <span className="text-[#00ff41] flex items-center gap-1 animate-in fade-in">
                <Check size={12} /> Salvo
              </span>
            ) : (
              <span className="text-zinc-700">Auto-save ativo</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SidebarRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
        {icon}
        <span>{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}
