import { saveToLocal, loadFromLocal } from '@/lib/storage';
import { toast } from 'sonner';

const VAULT_KEY = 'hardware_humano_vault';

export const useVaultActions = (onSuccess?: () => void) => {
  const addVaultItem = (itemData: {
    titulo: string;
    conteudo: string;
    projeto_id: string | null;
    categoria: string;
  }) => {
    if (!itemData.titulo) {
      toast.error('Título é obrigatório');
      return null;
    }

    try {
      const allItems = loadFromLocal(VAULT_KEY) || [];
      const newItem = {
        id: crypto.randomUUID(),
        ...itemData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const updatedItems = [newItem, ...allItems];
      saveToLocal(VAULT_KEY, updatedItems);
      window.dispatchEvent(new Event('storage'));
      
      if (onSuccess) onSuccess();
      return newItem;
    } catch (error) {
      console.error('Erro ao adicionar ao cofre:', error);
      toast.error('Erro ao salvar no cofre');
      return null;
    }
  };

  const deleteVaultItem = (id: string) => {
    try {
      const allItems = loadFromLocal(VAULT_KEY) || [];
      const updatedItems = allItems.filter((item: any) => item.id !== id);
      saveToLocal(VAULT_KEY, updatedItems);
      window.dispatchEvent(new Event('storage'));
      toast.success('Item removido do cofre');
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error('Erro ao remover item');
    }
  };

  return { addVaultItem, deleteVaultItem };
};