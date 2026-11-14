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
- [x] **FEITO em 13/11/2026 (completo):** escondido pela equipe, por suspensão, por falta de verificação ou com a conta
      desativada vira um ESQUELETO vazio e o conteúdo vai para `guardados/` (só o dono e a equipe leem): nem numa lista dá
      para ler. Publicação agendada fica em `agendadas/` (só o autor) e entra no Diário na hora. Limites: sem servidor, a
      agendada sai quando o autor abre o site depois da hora, e o que a suspensão escondeu volta quando a pessoa entra
      depois do fim (ou na hora, se a equipe tirar a sanção). O que já estava escondido do jeito antigo: botão
      "Guardar o que já está escondido" no painel (Publicações), só para os donos — apertar depois de publicar as regras.

- [ ] **Social "Ocultar"/"Seguidores"/"Amigos" (achado em 14/11/2026)** — a escolha de quem abre o social só vale no
      app: pela regra, qualquer pessoa logada lê os vínculos aceitos de qualquer um (`vinculos` com `status == aceito`).
      A regra não consegue conferir a escolha numa lista (as buscas usam `participantes array-contains`). Correção: cada
      pessoa guarda a própria visibilidade no vínculo (ou um índice `social_publico/{uid}` só com os aceitos que ela deixou
      mostrar) e as buscas passam a usá-lo. PR próprio, médio.

## C. Dependem do servidor (Blaze / Cloud Functions)
- [ ] **PIN da entrega/corrida** tem 4 números: um entregador mal-intencionado pode tentar todos. Conferir o PIN numa
      Cloud Function com limite de tentativas.
- [ ] **"Responde rápido"** (`perfis_publicos.atendimento.resposta`) é gravado pelo próprio dono (dá para forjar).
      Já pronto no servidor (`respostaServ`), falta o deploy + `FUNCOES_LIGADAS = true`.
- [ ] **Pedido do chat** montado no celular de quem pede (o cartão é livre). Montar no servidor a partir do cardápio.
- [ ] **Agendadas e escondidos na hora certa** (anotado em 13/11/2026, PR #207): sem servidor, a publicação agendada só
      entra no Diário quando o autor abre o site depois da hora, e o que uma suspensão ou desativação com data escondeu só
      volta quando a pessoa entra depois da data. Com o Blaze: Cloud Function agendada (a cada 5 min) que publica as
      `agendadas` vencidas (mesma lógica do `publicarAgendada`) e devolve os `guardados` de motivo `sancao`/`conta` com
      `ate` vencido (mesma lógica do `devolverItem`).
- [ ] **Cartões do chat** (Pix, pedido, chamada, SOS...) são mapas livres: alguém com app modificado monta um cartão
      falso. O site já avisa nos casos de golpe; a correção de verdade é validar no servidor.

## D. Risco baixo (anotado; corrigir se sobrar tempo)
- [x] **FEITO em 13/11/2026:** nome/foto do autor da **avaliação** têm que ser os do perfil público (ou vazios).
- [x] **FEITO em 13/11/2026:** apagar o perfil público só junto com o @ (o @ não fica preso).
- [x] **FEITO em 13/11/2026:** mensagem apagada de vez (10 min) só com a cópia em `apagadas/` na mesma gravação.
- [x] **FEITO em 13/11/2026:** 30 dias depois da verificação recusada agora vale na regra. Chamados: até **5 novos por
      dia** (`ritmo.sup`) e no máximo **3 em andamento** pela lista `suporte_abertos/{uid}` (muda na mesma gravação; só
      sai da lista um chamado encerrado ou que não existe; reabrir também conta). SOS fora dos dois.
- [x] **FEITO em 13/11/2026:** e-mail do chamado = o do login (ou vazio).
- [x] **FEITO em 13/11/2026 (pelo site):** textos de **enquete/caixa/contagem do Flash** continuam sem conferência na
      regra (estoura o limite de 1.000), mas o site só desenha o que é texto (`enqueteLimpa`, `caixaLimpa`, `contagemLimpa`
      em stories.js): figurinha estragada não aparece e a posição volta para dentro do quadro.
- [x] **FEITO em 13/11/2026:** corrida só aceita como destinatário quem já conversa com quem pede (conversa aceita, sem
      bloqueio). Antes, além de ver a corrida e o PIN, a conversa "de serviço" furava o "quem pode me mandar mensagem".
- [x] **FEITO em 13/11/2026:** a corrida em aberto mostra aos entregadores só a **região** (2 casas decimais, ~1 km, e
      "Região de Centro"); o endereço exato fica em `corridas/{id}/privado/rota`, lido por quem pede, quem recebe, quem
      paga e o entregador só **depois de aceitar**.

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

Depois do Flash privado, dos votos, do escondido de verdade, das agendadas e do destinatário (13/11), quase todas as partes
mudaram: colar as 22 de novo. Testes: 1127 passando. Depois: painel → Publicações → "Guardar o que já está escondido".
Índices: agora 32 (5 novos do Flash) — `firebase deploy --only firestore:indexes`.
