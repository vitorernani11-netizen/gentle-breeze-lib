import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TaskCard } from './TaskCard';

interface TodayContextGroupProps {
  title: string;
  color: string;
  tasks: any[];
  onTaskClick: (task: any) => void;
  onComplete: (task: any) => void;
  onMoveToToday: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateStage: (id: string, stage: number) => void;
}

export const TodayContextGroup: React.FC<TodayContextGroupProps> = ({
  title,
  color,
  tasks,
  onTaskClick,
  onComplete,
  onMoveToToday,
  onDelete,
  onUpdateStage
}) => {
  const [isOpen, setIsOpen] = React.useState(true);

  if (tasks.length === 0) return null;

  return (
    <div className="mb-6 border-2 border-white bg-black overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 
            className="font-black text-sm italic tracking-tighter uppercase"
            style={{ color }}
          >
            {title}
          </h3>
          <span className="bg-white text-black text-[10px] font-black px-1.5 py-0.5 rounded-sm">
            {tasks.length}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="text-zinc-500" />
        ) : (
          <ChevronDown size={16} className="text-zinc-500" />
        )}
      </button>

      {isOpen && (
        <div className="divide-y divide-white/10">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              onMoveToToday={onMoveToToday}
              onDelete={onDelete}
              onClick={onTaskClick}
              onUpdateStage={onUpdateStage}
            />
          ))}
        </div>
      )}
    </div>
  );
};
