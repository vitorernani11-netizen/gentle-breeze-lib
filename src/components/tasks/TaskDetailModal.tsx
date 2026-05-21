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
  const [subTasks, setSubTasks] = useState<any[]>([]);
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubTitulo, setNewSubTitulo] = useState('');
  
  const [isDirty, setIsDirty] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (task && open) {
      initRef.current = false;
      setTitulo(task.titulo || '');
      setDescricao(task.descricao || '');
      setPrioridade(task.prioridade || 'P4');
      setDataExecucao(task.data_execucao || '');
      let t = task.hora_vencimento || task.lembrete || '';
      if (t.includes('T')) t = t.split('T')[1];
      setLembrete(t.substring(0, 5));
      setLembretesState(task.lembretes || []);
      setSubTasks(task.sub_tasks || []);
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

  const forceGlobalSync = () => {
    setTimeout(() => {
      try {
        persistToHardware();
        window.dispatchEvent(new Event('storage_update'));
        if (typeof (window as any).onRefresh === 'function') {
          (window as any).onRefresh();
        }
      } catch (e) {}
    }, 100);
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
    forceGlobalSync(); // Botão é de clique único, pode sincronizar na hora
  };

  const handleDate = (v: string) => {
    setDataExecucao(v);
    triggerSave({ data_execucao: v, data_vencimento: v });
  };

  const handleLembrete = (v: string) => {
    setLembrete(v);
    triggerSave({ hora_vencimento: v || null });
  };

  const currentPriority = PRIORITIES.find((p) => p.value === prioridade) || PRIORITIES[3];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-3xl w-full sm:w-[95vw] h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 bg-black border-0 sm:border-2 border-white rounded-none sm:rounded-3xl overflow-hidden gap-0 flex flex-col"
        onInteractOutside={onClose}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
            <span>Entrada / Detalhes</span>
          </div>
        </div>

        {/* Body: Single Column Todoist-Style */}
        <div className="flex flex-col overflow-y-auto flex-grow p-6 sm:p-8 space-y-6">
          {/* 1. Título */}
          <div>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da tarefa"
              className="border-0 bg-transparent text-2xl md:text-3xl font-black uppercase tracking-tighter text-white p-0 h-auto shadow-none focus-visible:ring-0 placeholder:text-zinc-900 break-all"
            />
          </div>

          {/* 2. Descrição Colapsável */}
          <div className="min-h-[60px]">
            {isEditingDesc ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <Textarea
                  autoFocus
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição da tarefa..."
                  className="border border-zinc-800 bg-zinc-900/50 rounded-xl text-base text-zinc-300 p-4 min-h-[150px] shadow-none focus-visible:ring-1 focus-visible:ring-[#00ff41]/50 resize-none leading-relaxed placeholder:text-zinc-700 break-all whitespace-pre-wrap overflow-hidden w-full"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingDesc(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    Concluir Edição
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingDesc(true)}
                className="cursor-pointer group rounded-xl hover:bg-zinc-900/30 p-2 -ml-2 transition-colors"
              >
                {descricao ? (
                  <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3 overflow-hidden text-ellipsis whitespace-pre-wrap break-words">
                    {descricao}
                  </p>
                ) : (
                  <p className="text-zinc-600 text-sm italic">Adicionar descrição...</p>
                )}
              </div>
            )}
          </div>

          {/* 3. Metadados (Data, Hora, Prioridade) - Linha Única */}
          <div className="flex flex-wrap items-center gap-3 py-4 border-y border-zinc-900/80">
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-1.5 focus-within:border-zinc-500 transition-colors">
              <Calendar size={14} className="text-zinc-500" />
              <input
                type="date"
                value={dataExecucao}
                onChange={(e) => handleDate(e.target.value)}
                onBlur={forceGlobalSync}
                className="bg-transparent border-0 text-sm font-bold text-white focus:outline-none w-auto min-w-[120px]"
              />
            </div>

            <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-1.5 focus-within:border-zinc-500 transition-colors">
              <input
                type="time"
                value={lembrete}
                onChange={(e) => handleLembrete(e.target.value)}
                onBlur={forceGlobalSync}
                className="bg-transparent border-0 text-sm font-bold text-white focus:outline-none w-auto min-w-[80px]"
              />
            </div>

            <button
              onClick={() => {
                const priorities = ['P4', 'P1', 'P2', 'P3'];
                const currentIndex = priorities.indexOf(prioridade);
                const nextPriority = priorities[(currentIndex + 1) % priorities.length];
                handlePriority(nextPriority);
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-all active:scale-95 font-black text-xs uppercase',
                currentPriority.color,
                'bg-zinc-900/30 border-zinc-800 hover:border-current'
              )}
            >
              <Flag size={14} className={currentPriority.color.split(' ')[0]} />
              {prioridade}
            </button>
          </div>

          {/* 4. Sub-tarefas (Placeholder Visual) */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-600">Sub-tarefas</h4>
            <Button
              variant="ghost"
              className="w-full justify-start border border-dashed border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 hover:bg-zinc-900/50 rounded-xl py-6 transition-all"
            >
              + Adicionar sub-tarefa
            </Button>
          </div>
          
          {/* 5. Lembretes Push */}
          <div className="pt-2">
            <ReminderManager 
              reminders={lembretesState} 
              onUpdate={(newReminders) => {
                setLembretesState(newReminders);
                triggerSave({ lembretes: newReminders });
                if (newReminders.length > (lembretesState.length || 0)) {
                  if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                  }
                }
              }}
            />
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