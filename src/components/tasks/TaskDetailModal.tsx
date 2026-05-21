import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ReminderManager, type Reminder } from './ReminderManager';

import {
  Calendar,
  Flag,
  Save
} from 'lucide-react';
import { persistToHardware, hasUnsavedChanges } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface TaskDetailModalProps {
  task: any | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Record<string, any>) => void;
}

const PRIORITIES = [
  { value: 'P1', label: 'P1', color: 'text-red-500 border-red-500' },
  { value: 'P2', label: 'P2', color: 'text-orange-500 border-orange-500' },
  { value: 'P3', label: 'P3', color: 'text-blue-500 border-blue-500' },
  { value: 'P4', label: 'P4', color: 'text-zinc-500 border-zinc-700' },
];

export function TaskDetailModal({ task, open, onClose, onUpdate }: TaskDetailModalProps) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<string>('P4');
  const [dataExecucao, setDataExecucao] = useState('');
  const [lembrete, setLembrete] = useState('');
  const [lembretesState, setLembretesState] = useState<Reminder[]>([]);
  
  const [isDirty, setIsDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (task && open) {
      initRef.current = false;
      setTitulo(task.titulo || '');
      setDescricao(task.descricao || '');
      setPrioridade(task.prioridade || 'P4');
      setDataExecucao(task.data_execucao || '');
      setLembrete(task.lembrete || '');
      setLembretesState(task.lembretes || []);
      // mark as initialized after state apply
      setTimeout(() => { initRef.current = true; }, 0);
    }
    if (!open) initRef.current = false;

    const handleStorageUpdate = () => {
      setIsDirty(hasUnsavedChanges());
    };

    window.addEventListener('storage_update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('storage_update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [task, open]);

  const triggerSave = (updates: Record<string, any>) => {
    if (!task?.id) return;
    const tarefaAtualizada = {
      ...task,
      ...updates
    };
    onUpdate(task.id, tarefaAtualizada);
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

  const handlePriority = (p: string) => {
    setPrioridade(p);
    triggerSave({ prioridade: p });
  };

  const handleDate = (v: string) => {
    setDataExecucao(v);
    triggerSave({ data_execucao: v, data_vencimento: v });
  };

  const handleLembrete = (v: string) => {
    // Blindagem: salva apenas o texto HH:mm do input type="time"
    setLembrete(v);
    triggerSave({ hora_vencimento: v || null });
  };

  const currentPriority = PRIORITIES.find((p) => p.value === prioridade) || PRIORITIES[3];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-4xl w-full sm:w-[95vw] h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 bg-black border-0 sm:border-2 border-white rounded-none sm:rounded-3xl overflow-hidden gap-0 flex flex-col"
        onInteractOutside={onClose}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
            <span>Entrada / Detalhes</span>
          </div>
        </div>

        {/* Body: 2 cols on desktop, stack on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] overflow-y-auto flex-grow">
          {/* Main column */}
          <div className="p-8 space-y-6 md:border-r border-zinc-900">
            <div>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título da tarefa"
                className="border-0 bg-transparent text-2xl md:text-3xl font-black uppercase tracking-tighter text-white p-0 h-auto shadow-none focus-visible:ring-0 placeholder:text-zinc-900 break-all"
              />
            </div>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição da tarefa..."
              className="border-0 bg-transparent text-base text-zinc-400 p-0 min-h-[150px] shadow-none focus-visible:ring-0 resize-none leading-relaxed placeholder:text-zinc-900 break-all whitespace-pre-wrap overflow-hidden w-full"
            />
          </div>

          {/* Sidebar */}
          <div className="p-6 space-y-6 bg-zinc-950/50">
            {/* Data */}
            <SidebarRow icon={<Calendar size={18} />} label="Vencimento">
              <input
                type="date"
                value={dataExecucao}
                onChange={(e) => handleDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white w-full focus:outline-none focus:border-white transition-all shadow-lg"
              />
            </SidebarRow>

            {/* Prioridade */}
            <SidebarRow icon={<Flag size={18} className={currentPriority.color.split(' ')[0]} />} label="Prioridade">
              <button
                onClick={() => {
                  const priorities = ['P4', 'P1', 'P2', 'P3'];
                  const currentIndex = priorities.indexOf(prioridade);
                  const nextPriority = priorities[(currentIndex + 1) % priorities.length];
                  handlePriority(nextPriority);
                }}
                className={cn(
                  'flex items-center justify-center h-10 px-4 border rounded-xl transition-all active:scale-95 font-black text-xs uppercase',
                  currentPriority.color,
                  'bg-zinc-900/30 border-zinc-900'
                )}
              >
                {prioridade}
              </button>
            </SidebarRow>


            {/* Horário Fixo da Atividade */}
            <div className="pb-4 border-b border-zinc-900/50">
              <SidebarRow icon={null} label="Horário Fixo">
                <input
                  type="time"
                  value={task.hora_vencimento || lembrete || ''}
                  onChange={(e) => handleLembrete(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white w-full focus:outline-none focus:border-white transition-all shadow-lg pointer-events-auto"
                />
              </SidebarRow>
            </div>

            {/* Lembretes Push Inline */}
            <div className="pt-2" id="lembretes-section">
              <ReminderManager 
                reminders={lembretesState} 
                onUpdate={(newReminders) => {
                  setLembretesState(newReminders);
                  triggerSave({ lembretes: newReminders });
                  // Solicita permissão ao adicionar lembrete se necessário
                  if (newReminders.length > (lembretesState.length || 0)) {
                    if ('Notification' in window && Notification.permission === 'default') {
                      Notification.requestPermission();
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-900 px-6 py-4 flex items-center justify-end bg-black shrink-0">
          {isDirty && (
            <button
              onClick={() => {
                persistToHardware();
                setIsDirty(false);
                if (typeof onUpdate === 'function') {
                  try {
                    (onUpdate as any)();
                  } catch (e) {
                    if (task?.id) onUpdate(task.id, {});
                  }
                } else if (typeof (window as any).onRefresh === 'function') {
                  (window as any).onRefresh();
                } else {
                  window.location.reload();
                }
              }}
              className="w-full sm:w-auto bg-[#00ff41] text-black font-black px-8 py-4 rounded-2xl border-b-4 border-black shadow-2xl active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm italic"
            >
              <Save size={20} strokeWidth={3} />
              Confirmar Alterações
            </button>
          )}
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">
        {icon}
        <span>{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}