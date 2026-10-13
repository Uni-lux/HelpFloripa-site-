# Regras do Firestore — publicação

> **Versão de 13/10/2026 (4ª):** igual à publicada, mais a **foto da equipe** (`equipe_info/grupo`) e
> **editar / apagar mensagens** (Mensagens e chat da equipe). Agora são **9 partes**.
> Para publicar, o processo é o mesmo: apagar tudo no console e colar as 9 partes.

Esta pasta começa com `_`, então o GitHub Pages **não publica** nada daqui. São as regras do
`firestore.rules` divididas em **9 partes** (cada uma com menos de 12.800 bytes, cortadas em fim de
linha), para colar no console do Firebase.

- Arquivo de origem: `firestore.rules` (104.559 bytes, 1.925 linhas, sha256 começa com `27ea5c2efe8ca9c5`).
- Cada parte termina com a linha `// ===== FIM DA PARTE X DE 9 =====`. É um comentário: **pode colar junto**,
  não atrapalha (os testes rodaram nas regras com e sem essas linhas).
- Conferido: as 9 partes juntas, sem as linhas de fim, são **exatamente** o `firestore.rules`, byte a byte.
- Testes de regras no arquivo remontado: **137 passaram, 0 falharam**, sem o aviso de limite de 1.000 expressões.

## Como publicar (uma vez só)
1. Abra o **console do Firebase** → projeto **helpfloripa-61e0d** → **Firestore Database** → aba **Regras**.
2. Clique dentro do editor, selecione tudo (Ctrl+A, ou "Selecionar tudo" no celular) e **apague**.
3. Abra `parte-1-de-9.txt`, copie **tudo** e cole no editor.
4. Vá até o fim do que colou (depois da linha `// ===== FIM DA PARTE 1 DE 9 =====`), abra a parte 2,
   copie tudo e cole logo abaixo. Repita até a parte 9, **em ordem**.
5. Confira: a primeira linha do editor é `rules_version = '2';` e a última é
   `// ===== FIM DA PARTE 9 DE 9 =====`, logo depois de uma linha só com `}`.
6. Clique em **Publicar**. Se o console mostrar um erro (linha vermelha), **não publique**: provavelmente
   uma parte ficou faltando ou repetida. Confira se as 9 linhas `FIM DA PARTE` aparecem, de 1 a 9, uma vez cada.

> As regras do ar continuam valendo até o clique em Publicar. A troca leva até 1 minuto para valer.

## O que passa a funcionar depois de publicar
- **Editar mensagem** (texto e legenda de foto, vídeo e áudio), só até **10 minutos** depois de enviar: aparece "editada" e dá para ver a original.
- **Apagar para todos** (só até **10 minutos** depois de enviar; depois, só "apagar para mim"): no lugar fica "Fulano apagou esta mensagem · hora"; os dois abrem a mensagem por
  24 horas ("Ver mensagem apagada", com Denunciar; mensagem denunciada não some: fica para a equipe). Antes de publicar, "apagar para todos" apaga de vez
  (como era) e "editar" avisa que falta publicar. "Apagar para mim" já funciona sem as regras novas.
- **Chat da equipe:** foto do grupo, editar e apagar para todos.
- **Chat da equipe:** conversa individual, anexos (foto, áudio, arquivo), citar e reações.
- **Endereço (Etapa 3):** estado e cidade do IBGE no perfil público, nos negócios e nos anúncios. O site completa
  sozinho, aos poucos, o que foi gravado só na parte privada da conta.
- **Etapa 4:**
  - avaliação de negócio por quem tem vínculo no Social;
  - denúncia de mensagem com as mensagens em volta;
  - "Abrir conversa de suporte" no painel (antes ia como aviso);
  - atendimento com horário por dia, almoço e data de volta (se completa sozinho quando o dono abre as mensagens).

## Conferência no site depois de publicar
0. **Mensagens:** editar uma mensagem sua (aparece "editada"; tocar mostra a original); apagar para todos
   (aparece "Você apagou esta mensagem"; na outra conta, "Ver mensagem apagada" abre o conteúdo).
1. **Painel → Chat da equipe:** mandar texto, foto e áudio no grupo e numa conversa individual; citar uma
   mensagem; reagir com um emoji e tirar a reação.
2. **Painel → ficha de alguém → "Abrir conversa de suporte":** o aviso deve ser "Conversa de suporte aberta"
   (e não "Enviado como aviso"). Na conta da pessoa, aparece "Suporte Help Floripa" nas Notificações.
3. **Mensagens → Configurações → Atendimento** (conta com negócio): salvar o horário por dia e a pausa de
   almoço; o aviso deve ser só "Atendimento salvo".
4. **Busca por local (Serviços → filtro de Estado):** escolher o seu estado e conferir que o seu negócio
   aparece (depois de abrir o site uma vez com a sua conta, o estado entra no perfil público).
5. **Denunciar uma mensagem** (conta de teste) e abrir no painel → "Ver conteúdo denunciado": aparecem as
   mensagens de antes e de depois.

Depois disso, os próximos passos combinados: rodar o workflow **"Converter cidades"** (primeiro simulando) e
configurar o segredo `FIREBASE_SERVICE_ACCOUNT` para a limpeza automática de contas, **antes** de liberar o site.

## Para gerar as partes de novo (se o firestore.rules mudar)
```bash
python3 _testes/dividir-regras.py          # gera _regras/parte-X-de-N.txt e confere byte a byte
cd _testes && node testes-regras.mjs saida/remontado-com-marcas.rules
```
