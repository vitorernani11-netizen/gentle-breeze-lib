import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { X, Calendar, Tag, Trash2 } from 'lucide-react';

interface NoteModalProps {
  note: any | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({ note, isOpen, onClose, onDelete }) => {
  if (!note) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-950 border-4 border-white text-white max-w-2xl p-0 overflow-hidden rounded-none">
        <DialogHeader className="p-8 border-b-2 border-zinc-900 flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">
              {note.titulo}
            </DialogTitle>
            <div className="flex items-center gap-4 text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
              <span className="flex items-center gap-1">
                <Tag size={12} className="text-zinc-700" />
                {note.categoria}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} className="text-zinc-700" />
                {new Date(note.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="h-10 w-10 border-2 border-white flex items-center justify-center hover:bg-white hover:text-black transition-all"
          >
            <X size={24} />
          </button>
        </DialogHeader>

        <div className="p-8 max-h-[60vh] overflow-y-auto">
          <p className="text-lg text-zinc-300 font-medium whitespace-pre-wrap leading-relaxed">
            {note.conteudo}
          </p>
        </div>

        <div className="p-6 border-t-2 border-zinc-900 flex justify-end gap-4 bg-zinc-900/20">
          <Button 
            variant="ghost" 
            onClick={() => {
              onDelete(note.id);
              onClose();
            }}
            className="text-red-500 hover:bg-red-500/10 font-black uppercase tracking-widest text-[10px] h-10 px-4 rounded-none"
          >
            <Trash2 size={14} className="mr-2" />
            Excluir Registro
          </Button>
          <Button 
            onClick={onClose}
            className="bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-none"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};