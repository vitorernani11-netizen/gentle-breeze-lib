Plano para corrigir a aba **ENTRADA / DETALHES**:

1. Ajustar o bloco da **descrição** para virar um quadrado/caixa de altura fixa acima dos cards de data, hora e prioridade.
2. Remover o auto-resize da descrição, porque ele ainda está deixando o texto crescer e invadir a linha de data/hora.
3. Aplicar rolagem interna dentro da descrição (`overflow-y-auto`) para textos grandes, mantendo o layout do modal intacto.
4. Garantir que o bloco de metadados fique sempre abaixo da descrição no fluxo normal, sem `absolute`, `fixed` ou margem negativa.
5. Manter o título com o limite atual de 3 linhas, sem alterar o restante do modal.