import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Archive, ArrowLeft, Search, Trash2 } from 'lucide-react';
import { loadFromLocal } from '@/lib/storage';
import { FolderCard } from '@/components/vault/FolderCard';
import { NoteModal } from '@/components/vault/NoteModal';
import { useVaultActions } from '@/hooks/useVaultActions';

const VAULT_KEY = 'hardware_humano_vault';

// Definindo os 5 Projetos Core
const CORE_PROJECTS = [
  { id: 'pessoal', nome: 'GESTÃO / PESSOAL', cor: '#00ff41' }, // Verde Neon
  { id: 'faculdade', nome: 'FACULDADE', cor: '#3b82f6' },      // Azul
  { id: 'riolax', nome: 'RIOLAX', cor: '#ff00ff' },           // Magenta
  { id: 'esfiharia', nome: 'ESFIHARIA', cor: '#f97316' },     // Laranja
  { id: 'youtube', nome: 'YOUTUBE DARK', cor: '#ef4444' }      // Vermelho
];

export const Route = createFileRoute('/vault')({
  component: VaultPage,
});

function VaultPage() {
  const navigate = useNavigate();
  const { deleteVaultItem } = useVaultActions();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    fetchVaultData();
    const handleStorageChange = () => fetchVaultData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchVaultData = () => {
    setLoading(true);
    const vaultData = loadFromLocal(VAULT_KEY) || [];
    setItems(vaultData);
    setLoading(false);
  };

  const getNotesForFolder = (folderId: string) => {
    return items.filter(item => item.projeto_id === folderId);
  };

  const selectedProject = CORE_PROJECTS.find(p => p.id === selectedFolderId);
  
  const filteredItems = (selectedFolderId 
    ? getNotesForFolder(selectedFolderId) 
    : items
  ).filter(item => 
    item.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.conteudo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20 font-sans">
      <header className="mb-10">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => selectedFolderId ? setSelectedFolderId(null) : navigate({ to: '/' })} 
            className="border border-zinc-800 rounded-xl hover:bg-zinc-900 transition-all w-10 h-10 shrink-0"
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center gap-2 text-zinc-400">
            <Archive size={18} />
            <h1 className="text-2xl font-black uppercase tracking-tight italic">
              {selectedFolderId ? `Cofre: ${selectedProject?.nome}` : 'Cofre de Memória'}
            </h1>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text"
            placeholder="BUSCAR NO HARDWARE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border-2 border-zinc-900 h-14 pl-12 pr-4 rounded-xl font-bold text-sm focus:outline-none focus:border-white transition-all uppercase tracking-widest"
          />
        </div>
      </header>

      {!selectedFolderId ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {CORE_PROJECTS.map((project) => (
            <FolderCard
              key={project.id}
              title={project.nome}
              count={getNotesForFolder(project.id).length}
              color={project.cor}
              onClick={() => setSelectedFolderId(project.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 px-2">
              {filteredItems.length} Registros Encontrados
            </h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedFolderId(null)}
              className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white"
            >
              VOLTAR PARA PASTAS
            </Button>
          </div>

          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <Card key={item.id} className="p-6 bg-zinc-950 border-2 border-zinc-900 rounded-none hover:border-white transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-black text-lg uppercase tracking-tight">{item.titulo}</h4>
                  <button 
                    onClick={() => deleteVaultItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-zinc-600 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-sm text-zinc-400 line-clamp-2 font-medium">
                  {item.conteudo}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[8px] bg-zinc-900 px-2 py-0.5 rounded font-black uppercase tracking-widest text-zinc-500 border border-zinc-800">
                    {item.categoria}
                  </span>
                  <span className="text-[8px] font-black text-zinc-700 uppercase">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            ))
          ) : (
            <div className="py-20 text-center border-2 border-dashed border-zinc-900 rounded-2xl">
              <Archive size={40} className="mx-auto mb-4 text-zinc-900" />
              <p className="text-zinc-700 font-black uppercase tracking-widest text-xs">Esta pasta está vazia</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}