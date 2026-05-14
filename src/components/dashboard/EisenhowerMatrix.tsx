import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertCircle, Clock, Zap, Target } from 'lucide-react';

interface EisenhowerMatrixProps {
  tasks: any[];
  onTaskClick: (task: any) => void;
}

export const EisenhowerMatrix: React.FC<EisenhowerMatrixProps> = ({ tasks, onTaskClick }) => {
  // Quadrants based on Priority (1 & 2 are Important, 1 & 3 are Urgent - simple mapping)
  // P1: Urgent & Important (Do First)
  // P2: Important but Not Urgent (Schedule)
  // P3: Urgent but Not Important (Delegate/Quick)
  // P4: Neither (Eliminate/Backlog)
  
  const quadrants = [
    {
      id: 'do',
      title: 'Fazer Agora',
      subtitle: 'Urgente & Importante',
      icon: <Zap size={14} className="text-[#00ff41]" />,
      color: 'border-l-[#00ff41]',
      filter: (t: any) => t.prioridade === 1
    },
    {
      id: 'schedule',
      title: 'Agendar',
      subtitle: 'Importante, Não Urgente',
      icon: <Clock size={14} className="text-blue-500" />,
      color: 'border-l-blue-500',
      filter: (t: any) => t.prioridade === 2
    },
    {
      id: 'delegate',
      title: 'Delegar/Rápido',
      subtitle: 'Urgente, Não Importante',
      icon: <Zap size={14} className="text-orange-500" />,
      color: 'border-l-orange-500',
      filter: (t: any) => t.prioridade === 3
    },
    {
      id: 'eliminate',
      title: 'Eliminar',
      subtitle: 'Não Urgente/Importante',
      icon: <Target size={14} className="text-zinc-600" />,
      color: 'border-l-zinc-800',
      filter: (t: any) => t.prioridade === 4 || !t.prioridade
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {quadrants.map((q) => {
        const quadrantTasks = tasks.filter(q.filter);
        return (
          <Card key={q.id} className={cn(
            "bg-zinc-950 border border-zinc-900 rounded-none p-3 flex flex-col gap-2 min-h-[120px] border-l-4",
            q.color
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {q.icon}
                <span className="text-[10px] font-black uppercase tracking-tighter">{q.title}</span>
              </div>
              <span className="text-[10px] font-black text-zinc-800">{quadrantTasks.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1 max-h-[100px] scrollbar-none">
              {quadrantTasks.length > 0 ? (
                quadrantTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onTaskClick(t)}
                    className="w-full text-left text-[9px] font-bold uppercase truncate text-zinc-400 hover:text-white transition-colors py-0.5 border-b border-zinc-900/50 last:border-0"
                  >
                    {t.titulo}
                  </button>
                ))
              ) : (
                <div className="h-full flex items-center justify-center opacity-10">
                   <AlertCircle size={20} />
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
