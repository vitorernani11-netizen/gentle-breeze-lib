## Objetivo
Fazer o `AddTaskOverlay` se comportar como o Todoist:
1. Iniciar **sem data** e sem hora (chip "Agendar" cinza, não "27 MAI" verde).
2. Quando o usuário clica no chip verde dentro do título (ex: "hoje"), a palavra vira texto puro **e** o chip de data lá embaixo é desativado.
3. Ao enviar, o título salvo deve ser exatamente o que está visível — se o usuário anulou o chip, "teste hoje" é salvo como "teste hoje" (não "teste").

## Mudanças

### 1. `src/components/tasks/AddTaskOverlay.tsx`
- **Chip de data**: já está usando `vencimento || startOfToday()` para exibir e enviar. Mudar para:
  - Label do botão: se `vencimento` for `null`, mostrar `"Agendar"` (cinza), só ficar verde quando o usuário digitar uma data ou escolher uma.
  - No `handleSubmit`, se `vencimento` for `null`, enviar `vencimento: null` (ou string vazia) em vez de hoje. Verificar a assinatura de `onAddTask` e como `useTaskActions` trata `vencimento` vazio — provavelmente já aceita "sem data" como entrada no inbox.
- **`onParsed` do SmartInput**: quando o usuário anula o chip (`date === null`), hoje o código força `setVencimento(startOfToday())`. Trocar para `setVencimento(null)` e `setLembrete(null)`. Assim o chip de data lá embaixo também volta ao estado cinza, espelhando o título.
- **`handleSubmit` — preservar título literal quando o chip foi anulado**: hoje sempre chama `parseNLP(titulo)` e usa `result.text` se houver data detectada. Isso ignora se o usuário clicou para anular. Solução: usar como condição `vencimento !== null` (estado real do chip) em vez de re-parsear. Se `vencimento` é null → salvar `titulo` cru. Se tem data → salvar `result.text` (título sem o token).

### 2. `src/components/tasks/SmartInput.tsx`
- Já emite `onParsed(null, null)` quando `showRaw` é true. Confirmar que isso continua funcionando após a mudança acima.

### 3. Verificar `useTaskActions` / lista de tarefas
- Confirmar rapidamente que salvar uma task com `vencimento` nulo/vazio não quebra a Inbox. Se quebrar, fallback para `startOfToday()` apenas no insert (mas exibir "Sem data" na UI do overlay).

## Detalhes técnicos
- Tipo do estado `vencimento` já é `Date | null` ✔.
- Label do botão de data: `{vencimento ? format(vencimento, "dd MMM", { locale: ptBR }) : "Agendar"}` ✔ (já está assim, só ajustar o `cn` para só pintar verde quando `vencimento` existir — já está assim também). O único ponto faltante é parar de forçar `startOfToday()` no onParsed e no submit.
- Nenhuma mudança no `nlpParser` necessária.

## Fora de escopo
- Mudar visual dos chips, mexer em prioridade/lembretes, ou alterar a renderização do card final na lista.