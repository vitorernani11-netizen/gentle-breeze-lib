import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertCircle, Clock, Zap, Target } from 'lucide-react';
import { useTaskActions } from '@/hooks/useTaskActions';

interface EisenhowerMatrixProps {
  tasks: any[];
  onTaskClick: (task: any) => void;
}

export const EisenhowerMatrix: React.FC<EisenhowerMatrixProps> = ({ tasks, onTaskClick }) => {
  const { updateTask } = useTaskActions();

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent, priority: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      updateTask(taskId, { prioridade: priority });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const quadrants = [
    {
      id: 'do',
      priority: 1,
      title: 'Fazer Agora',
      subtitle: 'Urgente & Importante',
      icon: <Zap size={14} className="text-[#00ff41]" />,
      color: 'border-[#00ff41]',
      titleColor: 'text-[#00ff41]',
      filter: (t: any) => t.prioridade === 1
    },
    {
      id: 'schedule',
      priority: 2,
      title: 'Agendar',
      subtitle: 'Importante, Não Urgente',
      icon: <Clock size={14} className="text-blue-400" />,
      color: 'border-blue-500',
      titleColor: 'text-blue-400',
      filter: (t: any) => t.prioridade === 2
    },
    {
      id: 'delegate',
      priority: 3,
      title: 'Delegar',
      subtitle: 'Urgente, Não Importante',
      icon: <Zap size={14} className="text-orange-400" />,
      color: 'border-orange-500',
      titleColor: 'text-orange-400',
      filter: (t: any) => t.prioridade === 3
    },
    {
      id: 'eliminate',
      priority: 4,
      title: 'Eliminar',
      subtitle: 'Não Urgente/Importante',
      icon: <Target size={14} className="text-zinc-500" />,
      color: 'border-zinc-700',
      titleColor: 'text-zinc-500',
      filter: (t: any) => t.prioridade === 4 || !t.prioridade
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      {quadrants.map((q) => {
        const quadrantTasks = tasks.filter(q.filter);
        return (
          <Card 
            key={q.id} 
            className={cn(
              "bg-black border-2 rounded-none p-4 flex flex-col gap-3 min-h-[160px] transition-all",
              q.color,
              "shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
            )}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, q.priority)}
          >
            <div className="flex flex-col gap-1 border-b-2 border-zinc-900 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {q.icon}
                  <span className={cn("text-xs font-black uppercase italic tracking-wider", q.titleColor)}>
                    {q.title}
                  </span>
                </div>
                <span className="text-[10px] font-black text-zinc-700 bg-zinc-900 px-1.5 rounded-sm">
                  {quadrantTasks.length}
                </span>
              </div>
              <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest leading-none">
                {q.subtitle}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[120px] scrollbar-none">
              {quadrantTasks.length > 0 ? (
                quadrantTasks.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, t.id)}
                    onClick={() => onTaskClick(t)}
                    className="w-full text-left p-2 bg-zinc-900/50 border border-zinc-800 hover:border-white transition-all cursor-grab active:cursor-grabbing"
                  >
                    <p className="text-[10px] font-bold uppercase truncate text-zinc-300 leading-none mb-1">
                      {t.titulo}
                    </p>
                    {t.lembrete && (
                      <span className="text-[8px] font-black text-zinc-600 uppercase flex items-center gap-1">
                        <Clock size={8} /> {t.lembrete}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-10 py-4">
                   <AlertCircle size={24} className="mb-1" />
                   <span className="text-[8px] font-black uppercase">Vazio</span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
