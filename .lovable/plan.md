## Objetivo

Aplicar a Opção B: no **TaskDetailModal** (modal de editar atividade existente), substituir o `<input type="date">` nativo pelo mesmo `CalendarPopover` usado em `AddTaskOverlay`, para que o usuário também possa:

- Digitar a rotina em texto ("toda quinta", "toda segunda e quarta", "todo dia"...).
- Clicar nos botões rápidos (Todo dia / Toda semana / Todo mês / Não repetir).
- Ver as abreviações dos dias (ex.: `SEG QUA SEX`) em laranja no botão "Repetir".

## Mudanças

### `src/components/tasks/TaskDetailModal.tsx`

1. **Imports**: adicionar `CalendarPopover` (`./CalendarPopover`), `Repeat` de `lucide-react`, tipo `Recurrence` de `@/utils/nlpParser`, e helpers `format`/`parseISO` de `date-fns` + `ptBR` para exibir a data no botão.

2. **Estado novo**:
   - `recurrence: 'none' | 'daily' | 'weekly' | 'monthly'`
   - `nlpRecurrence: Recurrence | null`
   
   Inicializados no `useEffect` a partir de `task.recorrencia_tipo` / `task.recorrencia_dias`:
   - Se `recorrencia_tipo === 'weekdays'` → `recurrence = 'weekly'`, `nlpRecurrence = { type: 'weekdays', weekdays: task.recorrencia_dias }`
   - Senão → `recurrence = task.recorrencia_tipo || 'none'`, `nlpRecurrence = task.recorrencia_tipo ? { type: task.recorrencia_tipo } : null`

3. **Substituir o bloco "Data"** (linhas 215–224) por um `<CalendarPopover>` envolvendo um `<button>` que mostra:
   - Ícone `Calendar` + data formatada (`dd MMM`, ptBR) ou "Sem data".
   - Mesmo estilo visual do botão atual (`bg-zinc-900/40 border border-zinc-800/80 rounded-xl px-3 py-2 text-sm font-bold`).
   
   Props passadas:
   - `selectedDate`: `dataExecucao ? parseISO(dataExecucao) : new Date()`
   - `onSelect`: converte o `Date` → string `YYYY-MM-DD` e chama `handleDate(...)` + `forceGlobalSync()`.
   - `recurrence`, `onRecurrenceSelect`: atualiza estado local e chama `triggerSave({ recorrencia_tipo: ..., recorrencia_dias: null })` + sync. Para `'weekly'` com `nlpRecurrence?.weekdays` ativo, mantém o `type: 'weekdays'` ao salvar.
   - `nlpRecurrence`, `onNlpRecurrenceSelect`: atualiza estado local e salva `recorrencia_tipo` (`rec?.type || null`) e `recorrencia_dias` (`rec?.weekdays || null`).

4. **Botão de limpar rotina (slim)**: adicionar logo após o botão de data, visível apenas quando `nlpRecurrence` ou `recurrence !== 'none'`. Um botão pequeno (ícone `X`) que zera ambos os estados e chama `triggerSave({ recorrencia_tipo: null, recorrencia_dias: null })`. (Mesmo padrão que já existe no TaskCard.)

5. **Salvamento no botão Salvar (footer, ~linha 393)**: incluir `recorrencia_tipo` e `recorrencia_dias` no objeto passado para `triggerSave`, derivados do estado atual:
   ```ts
   recorrencia_tipo: nlpRecurrence ? nlpRecurrence.type : (recurrence !== 'none' ? recurrence : null),
   recorrencia_dias: nlpRecurrence?.weekdays || null,
   ```

### Sem mudanças

- `CalendarPopover.tsx` — já suporta tudo.
- `nlpParser.ts`, `useTaskActions.ts` — já persistem os campos certos.
- `AddTaskOverlay.tsx` — já implementado.

## UX

- O campo de data agora abre o mesmo popover bonito (atalhos Hoje/Amanhã, calendário, e botão "Repetir" no canto).
- Tocar em "Repetir" → tela de recorrência com input de texto + botões rápidos.
- Botão "X" slim ao lado da data, quando há rotina, remove a recorrência mantendo a data agendada.
- O botão "Repetir" mostra `SEG QUI SEX` em laranja quando configurado por dias específicos.
