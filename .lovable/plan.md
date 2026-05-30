
## Objetivo

Reconhecer expressões de recorrência no input de nova tarefa (igual Todoist) e, ao confirmar a tarefa, jogá-la automaticamente para o próximo dia válido da rotina.

## Expressões suportadas

- `todo dia` / `todos os dias` / `diariamente` → recorrência diária
- `toda semana` / `semanalmente` → semanal (mesmo dia da semana atual)
- `todo mês` / `mensalmente` → mensal
- `toda quarta`, `todas as quartas`, `toda segunda e sexta`, `toda quarta e sábado` → dias específicos da semana (1 ou vários)
- `dias úteis` / `dia de semana` → seg–sex
- `fim de semana` → sáb e dom

Tokens detectados ficam destacados em verde neon (mesmo padrão de data/hora) e podem ser cancelados com clique.

## Mudanças

### 1. `src/utils/nlpParser.ts`
- Adicionar regex de recorrência e extrair `recurrenceToken` + `recurrence` no resultado:
  ```ts
  recurrence: {
    type: 'daily' | 'weekly' | 'monthly' | 'weekdays',
    weekdays?: string[] // ['quarta','sábado']
  } | null
  recurrenceToken: string
  ```
- Se houver recorrência sem data explícita, `finalDate` = próxima ocorrência válida (hoje se cai hoje, senão próximo dia da lista).
- Incluir `recurrenceToken` em `tokens` para o highlight verde.
- Remover o token do `text` final (igual já faz com data/hora).

### 2. `src/components/tasks/SmartInput.tsx`
- Estender `onParsed` para também emitir `recurrence` (novo 3º argumento) — ou trocar a assinatura para um objeto `{ date, time, recurrence }`.
- Cancelamento via clique no token de recorrência funciona igual aos outros.

### 3. `src/components/tasks/AddTaskOverlay.tsx` (consumidor do SmartInput)
- Receber `recurrence` do parser e salvar na nova tarefa:
  - `recorrencia_tipo: 'daily' | 'weekly' | 'monthly' | 'weekdays'`
  - `recorrencia_dias: string[]` (lista de weekdays quando aplicável)
- Quando há recorrência, ligar visualmente o botão "repetir" (o ícone de loop verde no overlay) como confirmação visual.

### 4. `src/hooks/useTaskActions.ts` — `completeTask`
Substituir o bloco atual de `recorrencia_semanal` (1 dia só) por lógica nova que lê `recorrencia_tipo` + `recorrencia_dias`:

- `daily` → `data_execucao = amanhã`
- `weekly` → `data_execucao = +7 dias`
- `monthly` → `data_execucao = +1 mês`
- `weekdays` (com lista de dias, ex: `['quarta','sábado']`) → calcular o próximo dia da semana da lista após hoje (pulando de quarta → sábado → quarta…)
- Manter `status_concluido: false` e atualizar `ultimo_processamento`
- Toast: "Próxima execução: <data>"

Compatibilidade: manter leitura do antigo `recorrencia_semanal` (string única) como fallback para tarefas já criadas.

### 5. `src/utils/dateHelpers.ts`
- Adicionar `getNextWeekdayFromList(weekdays: string[]): string` que retorna a próxima data (yyyy-mm-dd) cujo weekday está na lista, começando de amanhã (ou hoje se a lista inclui hoje e ainda quero rotacionar — usar **amanhã em diante** para "pular" ao confirmar, conforme pedido).

## Comportamento final esperado

1. Digito `teste todo dia` → "todo dia" fica verde, tarefa salva como diária com `data_execucao = hoje`. Ao concluir, vai para amanhã automaticamente.
2. Digito `treinar toda quarta e sábado` → "toda quarta e sábado" verde, agendada para a próxima quarta ou sábado (o que vier antes). Ao concluir, salta para o outro dia da lista.
3. Digito `pagar conta todo mês` → mensal, próxima execução +1 mês ao concluir.
4. Cancelando o token verde (clique) → some a recorrência, vira tarefa avulsa.
