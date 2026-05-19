import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface FolderCardProps {
  title: string;
  count: number;
  color: string;
  onClick: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ title, count, color, onClick }) => {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "relative p-6 bg-black border-[3px] border-white rounded-none cursor-pointer transition-all active:translate-y-1 group",
        "hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
      )}
      style={{
        borderColor: 'white' // Default border
      }}
    >
      {/* Folder Tab Effect */}
      <div className="absolute -top-3 left-0 w-16 h-3 bg-white border-t-[3px] border-l-[3px] border-r-[3px] border-white" />
      
      <div className="flex flex-col items-center justify-center h-24 gap-2">
        <h3 className="text-lg font-black uppercase tracking-tighter text-center leading-tight">
          {title}
        </h3>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
          {count} REGISTROS
        </p>
      </div>

      {/* Hover glow effect with the specific neon color */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-[3px] -m-[3px]",
        )}
        style={{ borderColor: color, boxShadow: `0 0 20px ${color}` }}
      />
    </Card>
  );
};