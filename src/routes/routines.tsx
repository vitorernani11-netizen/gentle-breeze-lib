import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RotateCcw, CheckCircle2, Plus, Trash2, X, RefreshCw, History, Search, ChevronLeft, ChevronRight, Save, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateUUID } from '@/utils/uuid';

// ─── Chaves do localStorage ───────────────────────────────────────────────────
const ROUTINES_KEY    = 'routines_v2_definitions';
const COMPLETIONS_KEY = 'routines_v2_completions';
const ACTIVE_DATE_KEY = 'routines_v2_active_date';
const HISTORY_KEY     = 'routines_v2_history';

// ─── Helpers diretos de localStorage (sem cache em memória) ──────────────────
function lsGet<T = any>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[Routines] Erro ao salvar no localStorage:', e);
  }
}

// ─── Utilitários de data ──────────────────────────────────────────────────────
// Usa data LOCAL (evita bug de fuso horeário com ISO/UTC)
const getToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDisplayDate = (dateStr: string): string => {
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy (EEE)", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface RoutineItem {
  id: string;
  label: string;
}
interface Routine {
  id: string;
  titulo: string;
  itens: RoutineItem[];
}
type CompletionsMap = Record<string, string[]>; // rotina_id → item_id[]

interface HistoryRecord {
  rotina_id: string;
  rotina_titulo: string;
  item_id: string;
  item_label: string;
  concluido: boolean;
}
interface HistoryEntry {
  id: string;
  data: string;        // YYYY-MM-DD — data do ciclo encerrado
  data_reset: string;  // ISO — quando o reset foi clicado
  registros: HistoryRecord[];
}

// ─────────────────────────────────────────────────────────────────────────────
export const Route = createFileRoute('/routines')({
  component: Routines,
});

function Routines() {
  const [routines,    setRoutines]    = useState<Routine[]>([]);
  const [completions, setCompletions] = useState<CompletionsMap>({});
  const [activeDate,  setActiveDate]  = useState<string>('');
  const [viewDate,    setViewDate]    = useState<string>(''); // data sendo visualizada/editada
  const [loading,     setLoading]     = useState(true);

  // Modal de criação
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle,   setNewTitle]   = useState('');
  const [newItems,   setNewItems]   = useState<string[]>(['']);

  // Confirmações
  const [deleteId,  setDeleteId]  = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  // Modal histórico
  const [historyOpen,       setHistoryOpen]       = useState(false);
  const [historyEntries,    setHistoryEntries]    = useState<HistoryEntry[]>([]);
  const [historyFilter,     setHistoryFilter]     = useState<'semana' | 'mes' | 'personalizado'>('semana');
  const [customStart,       setCustomStart]       = useState('');
  const [customEnd,         setCustomEnd]         = useState('');
  const [historySearch,     setHistorySearch]     = useState('');
  const [deleteHistoryRecord, setDeleteHistoryRecord] = useState<{
    entry_id: string;
    data: string;
    rotina_id: string;
    item_id: string;
    item_label: string;
    rotina_titulo: string;
  } | null>(null);
  const [alreadyReset,    setAlreadyReset]    = useState(false);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);

  // ─── Carrega dados iniciais ─────────────────────────────────────────────────
  useEffect(() => { fetchData(); }, []);

  const fetchData = () => {
    let date = lsGet<string | null>(ACTIVE_DATE_KEY, null);
    if (!date) {
      date = getToday();
      lsSet(ACTIVE_DATE_KEY, date);
    }
    setActiveDate(date);
    setViewDate(date); // inicializa viewDate com a data ativa

    const rData     = lsGet<Routine[]>(ROUTINES_KEY, []);
    const allComp   = lsGet<any[]>(COMPLETIONS_KEY, []);
    const todayComp = allComp.filter((c) => c.data === date);
    const log       = lsGet<HistoryEntry[]>(HISTORY_KEY, []);

    setRoutines(rData);
    setAlreadyReset(log.some((e) => e.data === date));

    const map: CompletionsMap = {};
    todayComp.forEach((c) => { map[c.rotina_id] = c.itens_concluidos || []; });
    setCompletions(map);
    setLoading(false);
  };

  // ─── Carrega dados para uma data específica (navegação) ───────────────────────────
  const loadViewData = (date: string, currentActiveDate: string) => {
    const log = lsGet<HistoryEntry[]>(HISTORY_KEY, []);
    const histEntry = log.find((e) => e.data === date);

    if (histEntry) {
      // Monta o mapa de completions a partir do registro histórico
      const map: CompletionsMap = {};
      histEntry.registros.forEach((reg) => {
        if (!map[reg.rotina_id]) map[reg.rotina_id] = [];
        if (reg.concluido) map[reg.rotina_id].push(reg.item_id);
      });
      setCompletions(map);
    } else if (date === currentActiveDate) {
      // Data ativa sem histórico: carrega de COMPLETIONS_KEY
      const allComp = lsGet<any[]>(COMPLETIONS_KEY, []);
      const dayComp = allComp.filter((c) => c.data === date);
      const map: CompletionsMap = {};
      dayComp.forEach((c) => { map[c.rotina_id] = c.itens_concluidos || []; });
      setCompletions(map);
    } else {
      setCompletions({}); // data sem nenhum dado
    }
  };

  // ─── Navegação entre datas ──────────────────────────────────────────────────
  const navigateDate = (direction: -1 | 1) => {
    const today = getToday();
    const current = parseISO(viewDate || today);
    const next = direction === -1 ? subDays(current, 1) : addDays(current, 1);
    const nextStr = format(next, 'yyyy-MM-dd');
    if (nextStr > today) return;
    setHasUnsavedEdits(false);
    setViewDate(nextStr);
    loadViewData(nextStr, activeDate);
  };

  const goToToday = () => {
    setHasUnsavedEdits(false);
    setViewDate(activeDate);
    loadViewData(activeDate, activeDate);
  };

  // ─── Toggle item ────────────────────────────────────────────────────────────
  const toggleItem = (routineId: string, itemId: string) => {
    const current = completions[routineId] || [];
    const isDone  = current.includes(itemId);
    const updated = isDone ? current.filter((id) => id !== itemId) : [...current, itemId];

    // Atualiza estado visual imediatamente
    setCompletions({ ...completions, [routineId]: updated });

    if (viewDate === activeDate) {
      // ─ Data ativa: persiste em COMPLETIONS_KEY automaticamente ─────────────
      const allComp = lsGet<any[]>(COMPLETIONS_KEY, []);
      const idx     = allComp.findIndex((c) => c.rotina_id === routineId && c.data === activeDate);
      const entry   = { rotina_id: routineId, data: activeDate, itens_concluidos: updated };
      if (idx > -1) allComp[idx] = entry; else allComp.push(entry);
      lsSet(COMPLETIONS_KEY, allComp);
      const routine = routines.find((r) => r.id === routineId);
      if (!isDone && updated.length === routine?.itens?.length) {
        toast.success('Rotina concluída! 🚀');
      }
    }

    // Para qualquer dia (hoje ou passado), ao alterar check/uncheck, permitimos Salvar
    setHasUnsavedEdits(true);
  };

  // ─── Salva edições de um dia no histórico ───────────────────────────
  const saveHistoryEdits = () => {
    const rData = lsGet<Routine[]>(ROUTINES_KEY, []);
    const log   = lsGet<HistoryEntry[]>(HISTORY_KEY, []);

    // Constrói registros completos a partir do estado atual de completions
    const registros: HistoryRecord[] = [];
    rData.forEach((routine) => {
      const doneIds = completions[routine.id] || [];
      routine.itens.forEach((item) => {
        registros.push({
          rotina_id:     routine.id,
          rotina_titulo: routine.titulo,
          item_id:       item.id,
          item_label:    item.label,
          concluido:     doneIds.includes(item.id),
        });
      });
    });

    const eIdx = log.findIndex((e) => e.data === viewDate);
    if (eIdx > -1) {
      log[eIdx] = { ...log[eIdx], registros }; // atualiza entrada existente
    } else {
      log.push({                               // cria nova entrada
        id:         generateUUID(),
        data:       viewDate,
        data_reset: new Date().toISOString(),
        registros,
      });
    }

    lsSet(HISTORY_KEY, log);
    setHasUnsavedEdits(false);

    // Garante que o status de alreadyReset está atualizado para a data ativa
    const updatedLog = lsGet<HistoryEntry[]>(HISTORY_KEY, []);
    setAlreadyReset(updatedLog.some((e) => e.data === activeDate));

    toast.success(`Alterações de ${formatDisplayDate(viewDate)} salvas ✅`);
  };


  // ─── Reset com snapshot ─────────────────────────────────────────────────────
  const resetDaily = () => {
    const date       = lsGet<string>(ACTIVE_DATE_KEY, getToday());
    const rData      = lsGet<Routine[]>(ROUTINES_KEY, []);
    const allComp    = lsGet<any[]>(COMPLETIONS_KEY, []);
    const dayComp    = allComp.filter((c) => c.data === date);

    // Monta snapshot completo (todos os itens, marcados ou não)
    const registros: HistoryRecord[] = [];
    rData.forEach((routine) => {
      const comp         = dayComp.find((c) => c.rotina_id === routine.id);
      const doneIds: string[] = comp?.itens_concluidos || [];
      routine.itens.forEach((item) => {
        registros.push({
          rotina_id:     routine.id,
          rotina_titulo: routine.titulo,
          item_id:       item.id,
          item_label:    item.label,
          concluido:     doneIds.includes(item.id),
        });
      });
    });

    // Persiste no histórico
    const log = lsGet<HistoryEntry[]>(HISTORY_KEY, []);
    log.push({
      id:         generateUUID(),
      data:       date,
      data_reset: new Date().toISOString(),
      registros,
    });
    lsSet(HISTORY_KEY, log);

    // Atualiza data ativa para hoje e verifica se já há histórico para ela
    lsSet(COMPLETIONS_KEY, allComp.filter((c) => c.data !== date)); // limpa completions do dia encerrado
    const newDate = getToday();
    lsSet(ACTIVE_DATE_KEY, newDate);
    setActiveDate(newDate);
    setCompletions({});
    setResetOpen(false);

    // Após reset, a nova data ativa é hoje — checa se já existe histórico para hoje
    const updatedLog = lsGet<HistoryEntry[]>(HISTORY_KEY, []);
    setAlreadyReset(updatedLog.some((e) => e.data === newDate));

    toast.success(`Dia ${formatDisplayDate(date)} salvo no histórico ✅`);
  };

  // ─── Criar rotina ───────────────────────────────────────────────────────────
  const resetCreateForm = () => { setNewTitle(''); setNewItems(['']); };

  const handleCreateRoutine = () => {
    const title = newTitle.trim();
    const items = newItems.map((i) => i.trim()).filter(Boolean);
    if (!title)          { toast.error('Dê um nome para a rotina'); return; }
    if (!items.length)   { toast.error('Adicione pelo menos um item'); return; }

    const newRoutine: Routine = {
      id:     Date.now().toString(),
      titulo: title,
      itens:  items.map((label) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label,
      })),
    };

    const updated = [...routines, newRoutine];
    lsSet(ROUTINES_KEY, updated);
    setRoutines(updated);
    toast.success('Rotina criada');
    resetCreateForm();
    setCreateOpen(false);
  };

  // ─── Deletar rotina ─────────────────────────────────────────────────────────
  const handleDeleteRoutine = (id: string) => {
    const updated = routines.filter((r) => r.id !== id);
    lsSet(ROUTINES_KEY, updated);
    setRoutines(updated);

    const allComp = lsGet<any[]>(COMPLETIONS_KEY, []);
    lsSet(COMPLETIONS_KEY, allComp.filter((c) => c.rotina_id !== id));

    const newMap = { ...completions };
    delete newMap[id];
    setCompletions(newMap);
    setDeleteId(null);
    toast.success('Rotina removida');
  };

  // ─── Abre modal histórico: carrega dados frescos ─────────────────────────────
  const openHistory = () => {
    setHistoryEntries(lsGet<HistoryEntry[]>(HISTORY_KEY, []));
    setHistoryOpen(true);
  };

  // ─── Remove um registro específico do histórico (item + data) ──────────────────
  const handleDeleteHistoryRecord = () => {
    if (!deleteHistoryRecord) return;
    const { entry_id, item_id, rotina_id, item_label } = deleteHistoryRecord;

    const updated = historyEntries
      .map((entry) => {
        if (entry.id !== entry_id) return entry; // identifica pela entrada EXATA
        return {
          ...entry,
          registros: entry.registros.filter(
            (r) => !(r.rotina_id === rotina_id && r.item_id === item_id)
          ),
        };
      })
      .filter((entry) => entry.registros.length > 0);

    lsSet(HISTORY_KEY, updated);
    setHistoryEntries(updated);
    setDeleteHistoryRecord(null);

    // Re-checa se ainda existe histórico para a data ativa
    const currentActiveDate = lsGet<string | null>(ACTIVE_DATE_KEY, null) || getToday();
    setAlreadyReset(updated.some((e) => e.data === currentActiveDate));

    toast.success(`"${item_label}" removido do histórico`);
  };

  // ─── Filtragem do histórico ─────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;

    if (historyFilter === 'semana') {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end   = endOfWeek(now,   { weekStartsOn: 1 });
    } else if (historyFilter === 'mes') {
      start = startOfMonth(now);
      end   = endOfMonth(now);
    } else {
      if (!customStart || !customEnd) return [];
      try { start = parseISO(customStart); end = parseISO(customEnd); }
      catch { return []; }
    }

    return historyEntries.filter((e) => {
      try { return isWithinInterval(parseISO(e.data), { start, end }); }
      catch { return false; }
    });
  }, [historyEntries, historyFilter, customStart, customEnd]);

  // ─── Agrega contagens por item ──────────────────────────────────────────────
  // ─── Agrupa histórico por rotina → item → lista de datas com status ──────────
  const itemsByRoutineDated = useMemo(() => {
    // Ordena entradas por data crescente (mais antiga primeiro)
    const sorted = [...filteredEntries].sort((a, b) => a.data.localeCompare(b.data));

    const groups: Record<string, Record<string, Array<{ entry_id: string; data: string; concluido: boolean; item_id: string; rotina_id: string }>>> = {};

    sorted.forEach((entry) => {
      entry.registros.forEach((reg) => {
        if (!groups[reg.rotina_titulo]) groups[reg.rotina_titulo] = {};
        if (!groups[reg.rotina_titulo][reg.item_label]) groups[reg.rotina_titulo][reg.item_label] = [];
        groups[reg.rotina_titulo][reg.item_label].push({
          entry_id: entry.id,
          data: entry.data,
          concluido: reg.concluido,
          item_id: reg.item_id,
          rotina_id: reg.rotina_id,
        });
      });
    });

    // Aplica filtro de busca
    const q = historySearch.trim().toLowerCase();
    if (!q) return groups;

    const filtered: typeof groups = {};
    Object.entries(groups).forEach(([rotina, items]) => {
      const matchedItems: typeof items = {};
      Object.entries(items).forEach(([itemLabel, dates]) => {
        if (itemLabel.toLowerCase().includes(q) || rotina.toLowerCase().includes(q)) {
          matchedItems[itemLabel] = dates;
        }
      });
      if (Object.keys(matchedItems).length > 0) filtered[rotina] = matchedItems;
    });
    return filtered;
  }, [filteredEntries, historySearch]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading) return null;

  const routineBeingDeleted = routines.find((r) => r.id === deleteId);

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">

      {/* ── Cabeçalho ── */}
      <header className="mb-6 flex flex-col gap-4">
        {/* Linha 1: Título à esquerda, Ações principais à direita */}
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <RotateCcw size={20} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sistemas</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Rotinas</h1>
          </div>

          <div className="flex gap-2 shrink-0">
            {/* Histórico */}
            <Button
              id="btn-historico-rotinas"
              onClick={openHistory}
              variant="outline"
              aria-label="Ver histórico"
              className="rounded-xl border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 h-10 w-10 p-0 transition-none"
            >
              <History size={16} />
            </Button>

            {/* Reset — só visível na data ativa */}
            {routines.length > 0 && viewDate === activeDate && (
              <Button
                id="btn-reset-rotinas"
                onClick={() => alreadyReset
                  ? toast.error('Já existe um registro no histórico para esta data. Apague o histórico do dia antes de resetar novamente.')
                  : setResetOpen(true)
                }
                variant="outline"
                aria-label="Resetar check-ins"
                className={`rounded-xl border-zinc-800 h-10 w-10 p-0 transition-none ${
                  alreadyReset
                    ? 'text-zinc-700 cursor-not-allowed opacity-40'
                    : 'text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <RefreshCw size={16} />
              </Button>
            )}

            {/* Nova rotina */}
            <Button
              id="btn-nova-rotina"
              onClick={() => setCreateOpen(true)}
              className="rounded-xl bg-green-500 hover:bg-green-400 text-black text-[10px] font-black uppercase h-10 px-4 gap-1.5 transition-none"
            >
              <Plus size={16} strokeWidth={3} />
              Nova
            </Button>
          </div>
        </div>

        {/* Linha 2: Filtros de data à esquerda, Botão salvar à direita */}
        <div className="flex justify-between items-center gap-3">
          {/* Navegação de data */}
          {(viewDate || activeDate) ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateDate(-1)}
                aria-label="Dia anterior"
                className="h-6 w-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 transition-colors"
              >
                <ChevronLeft size={12} strokeWidth={3} />
              </button>
              <div className="relative inline-flex items-center">
                <button
                  type="button"
                  className="flex items-center gap-1.5 h-6 px-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-colors"
                >
                  <Calendar size={11} className="text-green-500 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                    {formatDisplayDate(viewDate || activeDate)}
                  </span>
                </button>
                <input
                  type="date"
                  max={getToday()}
                  value={viewDate || activeDate}
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (selected && selected <= getToday()) {
                      setHasUnsavedEdits(false);
                      setViewDate(selected);
                      loadViewData(selected, activeDate);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer [color-scheme:dark]"
                />
              </div>

              <button
                onClick={() => navigateDate(1)}
                disabled={(viewDate || activeDate) >= getToday()}
                aria-label="Próximo dia"
                className="h-6 w-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={12} strokeWidth={3} />
              </button>

              {viewDate !== activeDate && (
                <button
                  onClick={goToToday}
                  className="h-6 px-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors text-[10px] font-black uppercase tracking-wider leading-none ml-1"
                >
                  Voltar
                </button>
              )}
            </div>
          ) : (
            <div />
          )}

          {/* Salvar */}
          <Button
            id="btn-salvar-rotinas"
            onClick={saveHistoryEdits}
            disabled={!hasUnsavedEdits}
            className={`rounded-xl text-[10px] font-black uppercase h-10 px-4 gap-1.5 transition-all ${
              hasUnsavedEdits
                ? 'bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-500/20'
                : 'bg-zinc-900/40 text-zinc-600 border border-zinc-800/80 cursor-not-allowed opacity-40'
            }`}
          >
            <Save size={16} />
            Salvar
          </Button>
        </div>
      </header>

      {/* ── Lista de Rotinas ── */}
      <div className="space-y-6">
        {routines.map((routine) => {
          const total     = routine.itens?.length || 0;
          const completed = completions[routine.id]?.length || 0;
          const progress  = total > 0 ? (completed / total) * 100 : 0;

          return (
            <Card key={routine.id} className="p-0 bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden transition-none">
              <div className="p-4 pb-3">
                <div className="flex justify-between items-center mb-3 gap-2">
                  <h3 className="text-sm font-black uppercase tracking-tight flex-1 min-w-0 break-words [overflow-wrap:anywhere] leading-snug">
                    {routine.titulo}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="h-7 px-2 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                      <span className="text-[10px] font-black">{completed}/{total}</span>
                    </div>
                    <button
                      onClick={() => setDeleteId(routine.id)}
                      aria-label="Remover rotina"
                      className="h-7 w-7 rounded-full bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/40 flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <Progress value={progress} className="h-1.5 bg-zinc-900" />
              </div>

              <div className="bg-zinc-900/30 px-4 py-3 space-y-2">
                {routine.itens?.map((item) => {
                  const done = completions[routine.id]?.includes(item.id);
                  return (
                    <div key={item.id} className="flex items-start gap-2.5 group">
                      <div
                        onClick={() => toggleItem(routine.id, item.id)}
                        className={`h-4 w-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 mt-0.5 ${
                          done ? 'bg-green-500 border-green-500' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                        }`}
                      >
                        {done && <CheckCircle2 size={10} className="text-black" />}
                      </div>
                      <span
                        className={`text-xs font-medium transition-all min-w-0 flex-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-snug ${
                          done ? 'text-zinc-600 line-through' : 'text-zinc-300'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}

        {routines.length === 0 && (
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full text-center py-24 bg-zinc-950 rounded-3xl border border-dashed border-zinc-900 hover:border-green-500/40 transition-colors"
          >
            <Plus className="mx-auto mb-4 text-zinc-700" size={40} />
            <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Criar primeira rotina</p>
          </button>
        )}
      </div>

      {/* ── Modal: Criar Rotina ── */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreateForm(); }}>
        <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">Nova rotina</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Título</label>
              <Input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Rotina matinal"
                className="bg-zinc-900/40 border-zinc-800 rounded-xl h-11 text-sm font-bold text-white placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-green-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Itens</label>
              <div className="space-y-2">
                {newItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Textarea
                      value={item}
                      onChange={(e) => { const a = [...newItems]; a[idx] = e.target.value; setNewItems(a); }}
                      placeholder={`Item ${idx + 1}`}
                      rows={2}
                      className="bg-zinc-900/40 border-zinc-800 rounded-xl min-h-[44px] max-h-[160px] overflow-y-auto text-sm text-white placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-green-500/50 resize-none"
                    />
                    {newItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setNewItems(newItems.filter((_, i) => i !== idx))}
                        className="h-11 w-11 rounded-xl bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/40 flex items-center justify-center text-zinc-500 hover:text-red-400 shrink-0"
                        aria-label="Remover item"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setNewItems([...newItems, ''])}
                className="text-[10px] font-black uppercase tracking-widest text-green-500 hover:text-green-400 flex items-center gap-1 mt-1"
              >
                <Plus size={12} strokeWidth={3} /> Adicionar item
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => { setCreateOpen(false); resetCreateForm(); }} className="text-zinc-400 hover:text-white text-xs font-black uppercase">
              Cancelar
            </Button>
            <Button onClick={handleCreateRoutine} className="bg-green-500 hover:bg-green-400 text-black text-xs font-black uppercase rounded-xl px-4">
              Criar rotina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Confirmar exclusão ── */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black uppercase tracking-tight">Remover rotina?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-sm">
              {routineBeingDeleted?.titulo
                ? `"${routineBeingDeleted.titulo}" será excluída permanentemente.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white text-xs font-black uppercase rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDeleteRoutine(deleteId)} className="bg-red-500 hover:bg-red-400 text-white text-xs font-black uppercase rounded-xl">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Modal: Confirmar Reset ── */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black uppercase tracking-tight">Salvar e resetar?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-sm">
              O progresso do dia{' '}
              <span className="text-white font-bold">{activeDate ? formatDisplayDate(activeDate) : ''}</span>{' '}
              será salvo no histórico e os check-ins resetados para hoje.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white text-xs font-black uppercase rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={resetDaily} className="bg-green-500 hover:bg-green-400 text-black text-xs font-black uppercase rounded-xl">
              Salvar e Resetar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Modal: Histórico ── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            // Só fecha se clicar diretamente no overlay do próprio Dialog
            // (evita fechar ao clicar em toasts, alert dialogs ou quando o modal secundário fecha)
            const isDialogOverlay = target?.classList?.contains('bg-black/80') && !deleteHistoryRecord;
            if (!isDialogOverlay) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            const isDialogOverlay = target?.classList?.contains('bg-black/80') && !deleteHistoryRecord;
            if (!isDialogOverlay) {
              e.preventDefault();
            }
          }}
          onFocusOutside={(e) => {
            // Evita que o modal feche quando o elemento focado é removido do DOM
            e.preventDefault();
          }}
          className="bg-zinc-950 border-zinc-900 text-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col p-0 overflow-hidden"
        >

          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-900 shrink-0">
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <History size={18} className="text-green-500" />
              Histórico de Rotinas
            </DialogTitle>
          </DialogHeader>

          {/* Filtros */}
          <div className="flex flex-col gap-3 px-6 pt-4 shrink-0">
            {/* Abas */}
            <div className="flex gap-1 bg-zinc-900 rounded-xl p-1">
              {(['semana', 'mes', 'personalizado'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={`flex-1 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-all ${
                    historyFilter === f ? 'bg-green-500 text-black' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {f === 'semana' ? 'Semana' : f === 'mes' ? 'Mês' : 'Personalizado'}
                </button>
              ))}
            </div>

            {/* Intervalo personalizado */}
            {historyFilter === 'personalizado' && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl h-10 px-3 text-sm text-white [color-scheme:dark]"
                />
                <span className="text-zinc-600 font-bold text-xs shrink-0">até</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl h-10 px-3 text-sm text-white [color-scheme:dark]"
                />
              </div>
            )}

            {/* Busca */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar item ou rotina..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl h-10 pl-9 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-green-500/40"
              />
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 pb-1">
              {filteredEntries.length} {filteredEntries.length === 1 ? 'dia registrado' : 'dias registrados'} neste período
            </p>
          </div>

          {/* Conteúdo datado */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {Object.keys(itemsByRoutineDated).length === 0 ? (
              <div className="py-16 text-center">
                <History size={32} className="mx-auto mb-3 text-zinc-800" />
                <p className="text-zinc-600 font-black uppercase tracking-widest text-[10px]">
                  {filteredEntries.length === 0 ? 'Nenhum reset registrado neste período' : 'Nenhum item encontrado'}
                </p>
                {filteredEntries.length === 0 && (
                  <p className="text-zinc-700 text-xs mt-2">
                    Clique em Reset (↺) para salvar o progresso do dia no histórico.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(itemsByRoutineDated).map(([rotinaNome, items]) => (
                  <div key={rotinaNome} className="bg-zinc-900/50 rounded-2xl overflow-hidden border border-zinc-800/50">
                    {/* Nome da rotina */}
                    <div className="px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-900/80">
                      <span className="text-[10px] font-black uppercase tracking-widest text-green-500">
                        {rotinaNome}
                      </span>
                    </div>

                    {/* Itens com chips de data */}
                    <div className="divide-y divide-zinc-900/40 bg-zinc-950/40">
                      {Object.entries(items).map(([itemLabel, dates]) => {
                        const done  = dates.filter((d) => d.concluido).length;
                        const total = dates.length;
                        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                        return (
                          <div key={itemLabel} className="px-4 py-3">
                            {/* Cabeçalho do item */}
                            <div className="flex items-center justify-between mb-2.5 gap-2">
                              <span className="text-xs font-bold text-zinc-200 leading-snug">
                                {itemLabel}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800/80 text-zinc-400">
                                  {percent}%
                                </span>
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400">
                                  {done}/{total} dias
                                </span>
                              </div>
                            </div>

                            {/* Chips de data compactos */}
                            <div className="flex flex-wrap gap-1.5">
                              {dates.filter((d) => d.concluido).map((d, i) => {
                                return (
                                  <button
                                    key={i}
                                    onClick={() => setDeleteHistoryRecord({
                                      entry_id: d.entry_id,
                                      data: d.data,
                                      rotina_id: d.rotina_id,
                                      item_id: d.item_id,
                                      item_label: itemLabel,
                                      rotina_titulo: rotinaNome,
                                    })}
                                    title={`Remover registro de ${formatDisplayDate(d.data)}`}
                                    className={`group relative flex flex-col items-center justify-between w-[38px] h-11 py-1 rounded-lg border transition-all duration-200 ${
                                      d.concluido
                                        ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400'
                                        : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-600 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400'
                                    }`}
                                  >
                                    {/* Conteúdo Normal */}
                                    <div className="flex flex-col items-center justify-between h-full w-full group-hover:hidden">
                                      {/* Mês abreviado */}
                                      <span className="text-[7px] font-bold uppercase tracking-wider text-zinc-500 leading-none">
                                        {(() => {
                                          try {
                                            return format(parseISO(d.data), 'MMM', { locale: ptBR }).replace('.', '').slice(0, 3);
                                          } catch {
                                            return '';
                                          }
                                        })()}
                                      </span>
                                      {/* Dia do mês */}
                                      <span className="text-xs font-black leading-none my-0.5">
                                        {(() => {
                                          try {
                                            return format(parseISO(d.data), 'dd');
                                          } catch {
                                            return '';
                                          }
                                        })()}
                                      </span>
                                    </div>

                                    {/* Conteúdo no Hover */}
                                    <div className="hidden group-hover:flex items-center justify-center h-full w-full">
                                      <X size={11} strokeWidth={3} />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: Confirmar exclusão de registro individual ── */}
      <AlertDialog open={!!deleteHistoryRecord} onOpenChange={(o) => !o && setDeleteHistoryRecord(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black uppercase tracking-tight">
              Remover item do histórico?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-sm">
              O item{' '}
              <span className="text-white font-bold">
                "{deleteHistoryRecord?.item_label}"
              </span>{' '}
              do dia{' '}
              <span className="text-white font-bold">
                {deleteHistoryRecord ? formatDisplayDate(deleteHistoryRecord.data) : ''}
              </span>{' '}
              será removido permanentemente do histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white text-xs font-black uppercase rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHistoryRecord}
              className="bg-red-500 hover:bg-red-400 text-white text-xs font-black uppercase rounded-xl"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
}
