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

        {/* Body: Linear Layout (Todoist Style) */}
        <div className="overflow-y-auto flex-grow p-8 space-y-6">
          {/* Título */}
          <div>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da tarefa"
              className="border-0 bg-transparent text-2xl md:text-3xl font-black uppercase tracking-tighter text-white p-0 h-auto shadow-none focus-visible:ring-0 placeholder:text-zinc-900 break-all"
            />
          </div>

          {/* Descrição Colapsável */}
          <div className="group cursor-text" onClick={() => !isEditingDesc && setIsEditingDesc(true)}>
            {isEditingDesc ? (
              <Textarea
                autoFocus
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                onBlur={() => setIsEditingDesc(false)}
                placeholder="Descrição da tarefa..."
                className="border-0 bg-zinc-900/50 rounded-xl text-base text-zinc-300 p-4 min-h-[120px] shadow-none focus-visible:ring-0 resize-none leading-relaxed placeholder:text-zinc-800 break-all whitespace-pre-wrap w-full transition-all"
              />
            ) : (
              <div className="text-base text-zinc-400 leading-relaxed break-all whitespace-pre-wrap line-clamp-3 hover:text-zinc-300 transition-colors">
                {descricao || <span className="text-zinc-800 italic">Adicionar descrição...</span>}
              </div>
            )}
          </div>

          {/* Metadata Row: Data, Hora e Prioridade */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-2 hover:border-zinc-700 transition-colors">
              <Calendar size={16} className="text-zinc-500" />
              <input
                type="date"
                value={dataExecucao}
                onChange={(e) => handleDate(e.target.value)}
                onBlur={forceGlobalSync}
                className="bg-transparent text-sm font-bold text-white focus:outline-none w-[120px] [color-scheme:dark]"
              />
            </div>

            <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-2 hover:border-zinc-700 transition-colors">
              <span className="text-xs font-black text-zinc-600 uppercase">Hora</span>
              <input
                type="time"
                value={lembrete}
                onChange={(e) => handleLembrete(e.target.value)}
                onBlur={forceGlobalSync}
                className="bg-transparent text-sm font-bold text-white focus:outline-none w-[80px] [color-scheme:dark]"
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
                'flex items-center gap-2 h-10 px-4 border rounded-2xl transition-all active:scale-95 font-black text-xs uppercase bg-zinc-900/50',
                currentPriority.color.replace('border-', 'border-zinc-800 hover:border-')
              )}
            >
              <Flag size={14} className={currentPriority.color.split(' ')[0]} />
              {prioridade}
            </button>
          </div>

          {/* Sub-tarefas (Skeleton) */}
          <div className="pt-6 border-t border-zinc-900">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600 mb-4 flex items-center gap-2">
              Sub-tarefas
              <span className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-500">BETA</span>
            </h3>
            
            <button 
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-dashed border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-600 transition-all group"
              onClick={() => alert("A funcionalidade de Sub-tarefas requer uma nova tabela no banco de dados e será implementada em breve.")}
            >
              <div className="w-5 h-5 rounded-full border-2 border-zinc-800 group-hover:border-zinc-600 flex items-center justify-center">
                <span className="text-lg leading-none mb-0.5">+</span>
              </div>
              <span className="text-sm font-bold uppercase tracking-wider">Adicionar sub-tarefa</span>
            </button>
          </div>

          {/* Lembretes (Mantidos do layout anterior) */}
          <div className="pt-6 border-t border-zinc-900">
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