## Bug

Ao concluir uma rotina "toda quinta e sexta", a próxima execução é calculada a partir de **hoje+1**, e não da **data atual da tarefa+1** — então a tarefa cai de novo no mesmo dia em vez de pular para o próximo da lista.

## Correção

### `src/utils/nlpParser.ts`
Trocar `computeRecurrenceDate(rec, fromTomorrow)` por:
```ts
computeRecurrenceDate(rec: Recurrence, baseDate: Date = new Date(), advance = false): Date
```
- `daily`: `baseDate + 1` quando `advance`
- `weekly`: `baseDate + 7` quando `advance`
- `monthly`: `baseDate` com mês +1 quando `advance`
- `weekdays`: começa em `advance ? baseDate+1 : baseDate` e procura até 14 dias o próximo dia da semana presente em `weekdays`

### `src/hooks/useTaskActions.ts` — `completeTask`
Para tarefas com `recorrencia_tipo`:
- baseline = `parseISO(task.data_execucao)` em data local (sem shift de timezone); fallback para `new Date()` se ausente
- chamar `computeRecurrenceDate(rec, baseline, true)`
- demais campos (status_concluido, ultimo_processamento, toast) iguais

Sem outras mudanças.
