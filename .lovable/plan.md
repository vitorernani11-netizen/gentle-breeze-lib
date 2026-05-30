## Objetivo

Na tela de Adicionar Atividade, dentro do popover de data (CalendarPopover), permitir configurar uma rotina de duas formas:
1. **Campo de texto** onde o usuário digita ex. "toda quinta", "todo dia", "toda segunda e quarta" — e a rotina é configurada automaticamente (incluindo dias da semana).
2. **Botões rápidos** já presentes ("Todo dia", "Toda semana", "Todo mês") — mantidos e reorganizados, mais visíveis.

## Mudanças

### `src/components/tasks/CalendarPopover.tsx`
- Estender a prop `onRecurrenceSelect` para também aceitar uma `Recurrence` completa (incluindo `weekdays`), ou adicionar prop nova `onNlpRecurrenceSelect?: (rec: Recurrence | null) => void`.
- Adicionar prop `nlpRecurrence?: Recurrence | null` para refletir estado atual (ex: mostrar "QUI, SEX" quando configurado por texto).
- Na view `'repeat'`:
  - Adicionar um `<Input>` no topo: placeholder `Ex: toda quinta, toda segunda e quarta...`
  - Ao mudar (debounce simples no onBlur/Enter), chamar `parseRecurrence`-like via `parseNLP(value)`; se `result.recurrence` existir, chamar `onNlpRecurrenceSelect(rec)` + `onRecurrenceSelect(rec.type === 'weekdays' ? 'weekly' : rec.type)` e voltar para `'main'`.
  - Manter os 4 botões padrão (Não repetir / Todo dia / Toda semana / Todo mês) abaixo do input com label "Padrões rápidos".
  - Se `nlpRecurrence?.weekdays` existir, exibir badge laranja com abreviações (SEG TER ...) no topo da view e no botão "Repetir" da view main.
- Atualizar label do botão "Repetir" na view main: se `nlpRecurrence` tiver `weekdays`, mostrar as abreviações; senão usar `recurrence.toUpperCase()`.

### `src/components/tasks/AddTaskOverlay.tsx`
- Passar `nlpRecurrence` e `onNlpRecurrenceSelect={setNlpRecurrence}` para `<CalendarPopover>`.
- Quando o usuário define rotina pelo popover (texto ou botão), atualizar tanto `recurrence` quanto `nlpRecurrence` para que `handleSubmit` envie `recorrencia_tipo` e `recorrencia_dias` corretamente (mesma lógica que já existe para o SmartInput).

### Sem mudanças
- `nlpParser.ts` já parseia "toda quinta", "toda segunda e quarta", "todo dia", etc. — reutilizado.
- `useTaskActions.addTask` já persiste `recorrencia_tipo` + `recorrencia_dias`.

## UX

- Input de texto fica no topo da aba Recorrência com hint pequeno "Digite e pressione Enter".
- Botões padrão logo abaixo, em grid 2x2 compacto, para ficar "slim".
- Feedback visual: ao parsear com sucesso, fecha a view e o botão Repetir na main passa a mostrar os dias em laranja.
