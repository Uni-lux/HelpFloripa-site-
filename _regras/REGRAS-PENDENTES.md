# Regras do Firestore — o que ainda precisa ser corrigido (revisão de 12–13/11/2026)

Revisão completa do `firestore.rules` em 5 etapas (as ~3.830 linhas). O que já foi corrigido está no fim.
Os itens abaixo NÃO foram corrigidos: ou mudam também as buscas do site (não dá só na regra), ou dependem do
servidor (Blaze), ou são decisão sua. Ordem = prioridade.

## A. Prioridade alta (privacidade prometida na tela)
- [x] **FEITO em 13/11/2026** (pedido dele): Amigos próximos só para quem está na lista e "Ocultar de" barrado na regra
      (`restrito` + `stories_restritos`, `flash-privado.js`, 5 índices novos). Texto antigo abaixo, para histórico:
- [ ] **Flash "Amigos próximos" e "Ocultar de"** — pela regra qualquer pessoa logada lê qualquer flash das últimas
      26 h, inclusive os de Amigos próximos, os ocultados de alguém e os publicados só nos negócios (`perfil: false`).
      Só o app esconde. Correção: separar as buscas (públicos `publico == 'todos'` × amigos `lista array-contains eu`),
      regra exigindo isso, índices novos; "Ocultar de" provavelmente vira lista de quem pode ver. PR próprio, médio.

## B. Prioridade média (precisam mudar as buscas junto)
- [x] **FEITO em 13/11/2026:** votos só para quem votou e o autor (`enquete_votos.autorId`). Votos de antes (sem
      autorId) ficam só para quem votou; enquetes de antes de 26/10 perdem o resultado para os outros. Texto antigo:
- [ ] **Votos de enquete não anônima**: qualquer pessoa logada vê em quem cada um votou (deveria ser só o autor). A
      contagem de enquetes antigas (`enquetes.js`, sem os pedaços) usa essa leitura — trocar antes.
- [ ] **Conteúdo escondido pela equipe** (Diário, negócios, Comunidade com `ocultoAte`/`ocultoPelaEquipe`) ainda abre
      por link direto ou app modificado; só some das listas. Hoje o jeito definitivo é a moderação apagar.
- [ ] **Publicação agendada** pode ser lida antes da hora por um app modificado.

## C. Dependem do servidor (Blaze / Cloud Functions)
- [ ] **PIN da entrega/corrida** tem 4 números: um entregador mal-intencionado pode tentar todos. Conferir o PIN numa
      Cloud Function com limite de tentativas.
- [ ] **"Responde rápido"** (`perfis_publicos.atendimento.resposta`) é gravado pelo próprio dono (dá para forjar).
      Já pronto no servidor (`respostaServ`), falta o deploy + `FUNCOES_LIGADAS = true`.
- [ ] **Pedido do chat** montado no celular de quem pede (o cartão é livre). Montar no servidor a partir do cardápio.
- [ ] **Cartões do chat** (Pix, pedido, chamada, SOS...) são mapas livres: alguém com app modificado monta um cartão
      falso. O site já avisa nos casos de golpe; a correção de verdade é validar no servidor.

## D. Risco baixo (anotado; corrigir se sobrar tempo)
- [ ] Nome/foto do autor de uma **avaliação** vêm do celular (dá para exibir outro nome; a conta que avaliou é a real).
      Corrigir: regra comparar com `perfis_publicos/{uid}.nome` ou o site mostrar o nome do perfil.
- [ ] **@ reservado para sempre**: quem apaga o perfil público e cria outro deixa o @ antigo preso.
- [ ] **Mensagem apagada nos 10 primeiros minutos** some sem cópia para a moderação (igual ao WhatsApp).
- [ ] **Máximo de 3 chamados abertos** e **30 dias depois de uma verificação recusada** só no site, não na regra.
- [ ] **E-mail do chamado** não é conferido com o do login.
- [ ] Textos de **enquete/caixa/contagem do Flash** não conferem se são texto (pôr a conferência estoura o limite de
      1.000 do "flash com TUDO junto"); o pior caso é a figurinha aparecer quebrada.
- [ ] **Corrida**: quem pede pode pôr qualquer pessoa como destinatário (ela passa a ver a corrida e o PIN).
- [ ] **Endereço de busca** de uma corrida em aberto aparece para todos os entregadores ativos (é assim que eles acham
      a corrida; o contato e o PIN ficam escondidos).

## Decisões suas
- [x] Item A: sim (feito em 13/11/2026).
- [x] Votos de enquete só para o autor: sim (feito em 13/11/2026).

## Já corrigido nesta revisão (vai junto na próxima publicação)
- Erro de tipo da linha 738 que o console recusou (`d.keys().toSet()`).
- SOS público só enquanto aberto (antes: nome e lugar de todo SOS antigo do Brasil).
- Posição dos entregadores online sempre arredondada (~100 m).
- "Online agora" só com a hora de agora (antes dava para ficar sempre online).
- Seguir com a data real (antes dava para ficar no topo das notificações).
- Banido de Imóveis não cria anúncio de imóvel.
- Ninguém apaga a conversa inteira pelo site (passava por cima de solicitação recusada).
- Moderação não sanciona a equipe nem apaga a própria sanção; não decide a própria verificação nem se dá o selo.
- Banido de Entregas não aceita corrida, mesmo com o cadastro de entregador ativo.

Depois do Flash privado e dos votos (13/11), quase todas as partes mudaram: colar as 21 de novo. Testes: 1074 passando.
Índices: agora 32 (5 novos do Flash) — `firebase deploy --only firestore:indexes`.
