## Mudanças no `AddTaskOverlay` e `SmartInput`

### 1. Anulação do chip não persiste ao apertar espaço (`SmartInput.tsx`)
Hoje, ao apertar espaço, `setShowRaw(false)` reativa o destaque verde e o `useEffect` re-emite a data. Solução:
- Manter um estado `cancelledTokens: Set<string>` (em lowercase) com as palavras que o usuário clicou para anular.
- No `useEffect`, se o token atual de data/hora estiver em `cancelledTokens`, emitir `onParsed(null, null)` e não destacar o token no `renderText()`.
- Quando o usuário digita um token NOVO/diferente (ex: troca "hoje" por "amanhã"), aquele token novo não está no set, então volta a destacar normalmente.
- Remover o toggle `showRaw` baseado em espaço — ele será derivado de "o token atual está cancelado?".

### 2. Quebra de linha de textos longos (`SmartInput.tsx` + `AddTaskOverlay.tsx`)
Trocar o `<input type="text">` por um `<textarea>` com auto-resize (igual Todoist), e a overlay de highlight passa a usar `white-space: pre-wrap` + `word-break: break-word` em vez de `whitespace-pre`. Isso elimina o "bug" da sobreposição em uma linha só e permite quebra natural.
- Enter continua fazendo submit (interceptar `Enter` sem Shift).
- Manter sincronia de altura entre o textarea real e a div de highlight.

### 3. Remover CAPSLOCK forçado (`AddTaskOverlay.tsx`)
Remover `uppercase` da className do `SmartInput` (linha ~108). O texto fica como o usuário digitar.

### 4. Remover ícone Alvo (anexo 4)
Remover o `<Button>` com `<Target size={20} />` no final da barra de ações.

### 5. Placeholder e título (anexo 5)
- Trocar "NOVA CAPTURA" por "Nova Tarefa" no header.
- Trocar placeholder `"Nova tarefa... (ex: reunião amanhã as 14h)"` por algo curto como `"Nome da tarefa"` (ou simplesmente vazio).

### 6. Hora já passada vira amanhã (`nlpParser.ts`)
Após definir `finalDate` + `finalTime`, se nenhuma data textual foi digitada (`dateToken` vazio) e o `finalDate` resultante for anterior a `new Date()`, adicionar 1 dia (`addDays(finalDate, 1)`). Assim "15h" às 15:17 vira amanhã 15:00. O comportamento de clicar para anular já passa a funcionar via a correção #1.

## Fora de escopo
- Visual dos chips inferiores, lógica de prioridade/lembretes, persistência no banco.
