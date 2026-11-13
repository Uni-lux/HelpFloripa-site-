# Regras do Firestore — publicação

> **Versão de 03/11/2026 (2) — e-mail da conta:** o e-mail gravado na conta (`usuarios.email`) tem que ser o do login (antes a
> pessoa podia gravar o e-mail de outra e o painel mostrava e buscava por ele).

> **Versão de 03/11/2026 — e-mail confirmado:** a conta só pode anotar `usuarios.emailConfirmado` com o valor verdadeiro do
> login (o painel mostra quem confirmou). Sem esta versão o bloqueio de quem não confirmou já funciona no site; só a marcação
> do painel fica sem a trava.

> **Versão de 03/11/2026 — Etapa A (servidor):** coleção nova **`ranking_diario`** (as listas do Diário montadas pela
> Cloud Function: quem está logado lê, só o servidor grava). Enquanto não publicar (ou sem o Blaze), o Diário funciona como
> antes. O tempo de resposta do servidor (`perfis_publicos.respostaServ`) já é protegido pelas regras de hoje (o dono não
> grava esse campo). Junto vai tudo o que ainda não estava publicado.

> **Versão de 28/10/2026 — cobrança da condição especial:** a negociação aprovada **com valor** fica
> `aguardando_pagamento` (sem plano); a pessoa gera o pedido de pagamento (`planos_pedidos` com `negociacaoId`, só com o
> plano, a duração e o valor iguais aos combinados) e o plano só liga quando os donos confirmam o pagamento (ou o
> Mercado Pago, no automático); a pessoa pode desistir e os donos podem cancelar a cobrança. Enquanto não publicar, o
> painel avisa e deixa liberar o plano na hora, como antes. Junto vai tudo o que ainda não estava publicado desde 26/10.

> **Versão de 26/10/2026 — muda 2 regras (você publicou a anterior hoje):**
> 1. Os perfis de negócio aceitam o campo **`principal`** (o tipo do perfil que fica no ar quando a conta está sem plano).
>    Enquanto não publicar, nenhum perfil fica pausado para os clientes (a escolha fica guardada na conta).
> 2. **Para anunciar, a conta precisa ser verificada:** criar perfil de negócio ou anúncio de imóvel exige
>    `usuarios/{uid}.verificado == true` (selo azul, que só a moderação dá com o pedido aprovado). Quem já anuncia continua
>    editando o que tem; no painel (Verificações › Anunciantes sem verificação) dá para tirar do ar depois de 30/11/2026.
> O resto é igual ao que está no ar.

> **Versão de 22/10/2026:** igual à publicada em 13/10, mais **várias fotos numa publicação do Diário**
> (campo `midias`, de 2 a 4 fotos), **dar estrelas na própria publicação** o **resumo das estrelas**
> (`diario_notas`: média e quantas pessoas deram 5, 4, 3, 2 e 1 estrela) e os **comentários novos** (quem pode
> comentar, comentário fixado e reações com emoji), **stories**, **hashtags e marcações**, **agendar**, **rascunhos**,
> **alcance e salvos** (estatísticas), o **aviso de reação** no comentário, **enquetes** (publicação e Flash, votos em
> `enquete_votos`, voto único: não troca nem tira), **menções e configurações do Flash** (respostas, público, amigos próximos, ocultar de),
> **quem pode me marcar** (`pref_publicas`), **duração da enquete** (`fimEm`: votar só até o fim), **enquete anônima**
> (`enquete_anon`), **contagem das enquetes em 10 pedaços** (`enquete_contas/{alvo}_{fatia}`, sobe junto com cada voto), **caixa de perguntas** (`caixa_respostas`, anônima com `caixa_autoria`), **Flash com link para negócio**
> (`stories.link`), **repostar o flash em que você foi mencionado** (`stories.repostDe`) e **flash nos perfis de negócio**
> (`stories.negocios` e `stories.perfil`), **reportar o atendimento do suporte** (`reportes`: só a moderação e os
> donos leem) e a **nota do atendimento** (`suporte_notas`) e a opção **"Só a rosinha"** do duo no perfil (`duoCapa: rosa`) e a **verificação do perfil** (`verificacoes`: pedido com a foto
> do documento, que só a pessoa e a moderação leem e que é apagada na decisão) e a **trava do selo** (a moderação só dá o selo
> com o pedido aprovado; só o dono do site dá o selo direto) e, nos **perfis de negócio**, Instagram, site, CNPJ, capa,
> horário de cada dia e promoção/cupom, mais as **estatísticas dos negócios** (`neg_visitas`: a visita de cada pessoa,
> que só ela lê; `neg_stats`: os números do dia, que só o dono do negócio lê e que só sobem +1 junto com uma visita ou ação nova),
> anexos no suporte, ponto do endereço (`geo`), **local nas publicações** (`diario.local`), **publicação no Flash**
> (`stories.postDe`, com o crédito; `pref_publicas.permiteFlash` deixa o autor desligar) e os **planos dos negócios**
> (`planos_pedidos`: a pessoa pede o Plus, o Pro ou o Premium e **só os donos do site** confirmam o Pix; `planos`: o plano
> ativo, que só os donos gravam; `planos_negociacoes`: pedido de **condição especial (baixa renda) ou parceria**, que só a
> pessoa e os donos leem), o **teste grátis de 30 dias** no primeiro acesso (a própria pessoa grava `planos/{uid}` com
> `teste: true`, uma vez por conta) e o **comprovante de baixa renda** na condição especial (qual documento, declaração e foto/PDF,
> que os donos apagam ao decidir) e o **registro de ações** (`admin_log`), que agora **só os donos leem** (o resto da equipe só vê
> as cobranças das reclamações) e, **novo nesta versão**: o tipo de negócio **Saúde** (`negocios.saude`: profissão,
> registro no conselho, especialidades, atendimento, valor, convênios), a **Comunidade** (`comunidade`: doar, trocar, pedir
> ajuda, dividir quarto e achados e perdidos — a regra **recusa "vendo/venda" e "R$"** fora da divisão das despesas do quarto),
> o **banimento de um programa** (`programa_banidos`: quem é banido da Comunidade ou de um tipo de negócio não anuncia mais lá)
> e a denúncia com o motivo **"Venda ou cobrança"**.
> **Novo nesta versão (22/10):** a **busca nacional** (campo `busca` com as palavras de negócios, imóveis e anúncios da
> Comunidade, até 100) e a **região de quem publica** no Diário (`autorUf`/`autorIbge`), para priorizar a sua cidade e o seu estado.
> Os **30 dias grátis** agora vêm junto com a **primeira assinatura paga** (o dono do site soma ao confirmar o Pix): a pessoa não grava mais o próprio plano.
> **Suporte nacional (22/10):** chamado com **prioridade** (`prioridade`: urgente só para golpe; alta para pagamento,
> contestação ou plano Pro/Premium; normal sempre), a equipe **transfere de setor, troca a prioridade e escala** para a moderação
> ou os donos (`escalonadoPara`), grava a hora da **1ª resposta** (`primeiraRespostaEm`), escreve **notas internas**
> (`suporte/{id}/notas`: só a equipe lê, ninguém edita) e salva **respostas prontas da equipe** (`suporte_respostas`).
> **Chat da equipe por canais (22/10):** canais por setor (`equipe_canais`: Avisos, Segurança, Moderação, Pagamentos,
> Negócios, Conta e Comercial; toda a equipe lê, em Avisos só os donos escrevem; anexos e apagar/editar como no Geral) e a
> **situação de cada um** no painel (`equipe_presenca.status`: disponível, em pausa ou fora do turno).
> **Republicar (29/10):** `republicacoes/{postId}_{uid}` — republicar a publicação de outra pessoa no Diário (não a própria,
> nem com bloqueio entre os dois); todos leem, só quem republicou desfaz. Junto: criar o índice `republicacoes`
> (`uid` + `criadoEm`), na lista do `INDICES-LEIA-ME.md`.
> **Estrela no Flash (29/10):** `stories/{id}/reacoes/{uid}` {curtiu, emoji, em} — quem vê dá a estrela (curtir) e o
> último emoji de reação fica guardado para o autor ver na lista de Visualizações. Só a própria pessoa grava (não no
> próprio flash); só ela e o autor leem. Sem a regra publicada, a estrela vai como reação "⭐" pelo Mensagens.
> **Público da publicação (29/10):** `diario.publico` {idadeMin, idadeMax, genero f|m, local brasil|estados|cidades|perto,
> ufs, cidades (código IBGE), perto {lat, lng, km, nome}, seguidores todos|seguidores|novos} — quem publica escolhe para quem
> a publicação aparece no Diário, no Explorar e nos Reels (só confere o formato; quem está no público é decidido no aparelho
> de quem lê). Sem a regra publicada, publicar com público avisa e não publica. Junto: criar o índice `diario` (`mediaTipo` +
> `criadoEm`) dos Reels, na lista do `INDICES-LEIA-ME.md`.
> **Tipos de publicação (29/10):** `diario.tipo` texto|foto|video|enquete|caixa (sem o campo = publicação antiga, vale como
> antes) e o que cada um aceita (`tipoOk`): texto com texto e no máximo UMA imagem "casada" (`estilo: 'casada'`, texto até
> 500 letras), foto com 1 a 4 fotos, vídeo com um vídeo, enquete/caixa com a sua enquete/caixa e no máximo uma imagem. O tipo
> não muda depois. Ajustes na hora de publicar: `quemComenta` e `ocultarNotas` (ocultar o número de estrelas; muda depois
> também). Sem a regra publicada, a publicação vai sem esses campos (como antes) e o texto com imagem aparece como foto.
> **Destaques do Flash (30/10):** `destaques/{id}` {uid, nome até 30, ids (1 a 100 flashes), capa (um dos ids), capaMini
> (miniatura JPEG até 30 mil letras), criadoEm, atualizadoEm} — os destaques do perfil, como no Instagram. Quem está logado
> lê; só o dono cria, muda e apaga (a moderação também apaga). Sem a regra publicada, criar um destaque avisa que falta
> publicar. Junto: criar o índice `stories` (`autorId` + `criadoEm`) do Arquivo do Flash, na lista do `INDICES-LEIA-ME.md`.
> Para publicar, o processo é o mesmo: apagar tudo no console e colar as 17 partes.

> **Flash: figurinhas tocáveis, menção oculta e cores (02/11):** `stories.toques` (até 8 textos, conferidos numa expressão
> só: `h|hashtag|x|y|w|h`, `m|uid|x|y|w|h` e a localização `l|nome|lat|lng|x|y|w|h` com lat/lng no Brasil),
> `stories.mencoesOcultas` (até 10 uids: mencionados que não aparecem para quem vê) e `cor` na enquete/caixa de perguntas
> (`escuro|azul|rosa|laranja|verde|roxo`). A criação do flash virou a função `flashNovoOk(d)` (o flash "com TUDO junto" estava
> no limite de 1.000 expressões; com `d` no lugar de `request.resource.data` sobra espaço). Sem a regra publicada, o flash
> é publicado sem esses campos (a figurinha continua desenhada na foto, só não fica tocável; a pessoa da menção oculta
> recebe o aviso, mas não pode repostar).

> **Tamanho das figurinhas interativas do Flash (09/11):** `k` (o tamanho que a pessoa escolheu com dois dedos, de 0,6 a 1,3)
> passa a ser aceito na enquete/teste (`enqueteOk`), na caixa de perguntas (`caixaOk`), no link do negócio (`linkFlashOk`) e
> na contagem regressiva. O valor não é conferido na regra (não cabia no limite de 1.000 do flash "com TUDO junto"): o visor
> prende entre 0,6 e 1,3 ao desenhar. Sem a regra publicada, o flash vai sem o `k` e a figurinha aparece no tamanho de sempre.
> Agora são **17 partes**.

> **Publicações formatadas, comentários ricos e reações no chat (10/11):** `diario.titulo` (1 a 90 letras, opcional) e
> `diario.layout` (o modelo escolhido: `topo|lado|fundo|citacao|simples|destaque|carrossel|grade|mosaico|baralho|pizza|polaroid|lista|cartoes|duelo|normal|cinema|vertical`),
> no criar e no editar. `comentarios.midia` {tipo `imagem|audio|figurinha`, url do site (`data:` ou Storage) até 700 mil letras,
> dur até 60 s} e `comentarios.enquete` {pergunta até 120, 2 a 4 opções até 60} — enquete só o autor da publicação; com mídia ou
> enquete o texto pode ficar vazio. Coleção nova `comentario_votos/{comentarioId}_{uid}` {comentarioId, uid, opcao, criadoEm}:
> um voto por pessoa (não muda), a opção tem que existir na enquete do comentário; todos leem. Mensagens do chat:
> `reacoes.{uid}` = emoji (❤️ 👍 😂 😮 😢 🙏 🔥 👏) — cada um dos dois põe/troca/tira só a própria, sem prazo, menos em mensagem
> apagada. Sem as regras publicadas: a publicação sai sem título/modelo (o título vai junto no começo do texto), comentário com
> foto/áudio/figurinha/enquete e a reação no chat avisam que falta publicar. Continuam **17 partes**.

> **Atualização (10/11/2026 – Automotivo):** tipo novo de negócio `automotivo` (oficinas, auto elétrica, pneus, lava-jato,
> guincho, peças...) aceito em `negocios` (criar, `principal`), banimento de programa, contexto da conversa, avaliações,
> reclamações, vínculos de cliente, figurinha de link e "Publicar em" do Flash, e `planos.tipos`/negociação (agora até 6
> perfis). Sem as regras publicadas, criar o perfil Automotivo avisa que falta publicar. Continuam **17 partes**, 827 testes.

> **Atualização (10/11/2026 – Entregas e corridas):** coleções novas `corridas/{id}` (pedido: entrega ou corrida, A → B,
> veículo, oferta, etapas procurando → aceita → chegou → em_rota → concluida/cancelada, posição ao vivo de quem leva em `pos`),
> `corridas/{id}/privado/pin` (só quem pede e quem recebe leem; quem leva digita e a regra confere para embarcar/finalizar) e
> `privado/contato` (quem leva só lê depois de aceitar), `entregadores/{uid}` (cadastro: conta verificada, placa, CNH,
> declarações; a equipe suspende), `entregadores_online/{uid}` (posição arredondada de quem está online) e
> `entregadores_notas/{uid}` (nota sobe na mesma gravação da avaliação). Banimento de programa aceita `entregas`.
> Sem as regras publicadas, pedir e se cadastrar avisam que falta liberar. Agora são **19 partes**, 904 testes.

> **Atualização (10/11/2026 – Presentes e localização em tempo real):** coleções novas `presentes/{id}` (mimo, dinheiro,
> produto de uma loja, corrida ou entrega; quem recebe aceita/recusa; quem pode mandar segue `pref_publicas.presentes` =
> todos | seguindo | vinculos | ninguem, padrão "seguindo"; gorjeta para quem levou uma corrida concluída vale sempre) e
> `locais_vivos/{id}` (localização em tempo real no chat: só os dois da conversa leem, até 8 h, quem compartilha para quando
> quiser). `corridas` aceita `presenteId`/`pagadorId` (corrida de presente: até o valor do presente, quem deu acompanha).
> Continuam **19 partes**, 940 testes.

> **Atualização (11/11/2026 – SOS, roubos e RG do pet):** coleções novas `sos/{id}` (pedido de ajuda: o Social em
> `avisados` e, se a pessoa deixar, quem está perto; só UMA pessoa aceita ajudar e os outros veem; quem pediu ou quem ajuda
> encerra), `ocorrencias/{id}` (roubo, furto, golpe, suspeita; anônima com `ocorrencias_autoria/{id}` só para a pessoa e a
> moderação; IMEI/placa/série para a consulta), `ocorrencias/{id}/pistas` (só quem registrou lê; anônima com
> `pistas_autoria` só para a moderação), `pets/{id}` (RG do pet) e `pets_achados/{id}` (animal encontrado).
> Agora são **20 partes**, 986 testes.

> **Atualização (11/11/2026 – Flash: negócios marcados):** sem campo novo. As figurinhas tocáveis do flash (`stories.toques`)
> aceitam também os **negócios marcados** (até 10): `n|uid_tipo|t|nome|x|y|k|0` (na tela), `n|uid_tipo|l|nome|0|0|0|0` (na
> lista) e `n|uid_tipo|o|nome|0|0|0|0` (oculto) — até 18 itens no total, num regex só (o flash "com tudo" está no limite de
> 1.000 expressões). Continuam **20 partes**, 995 testes.

> **Atualização (12/11/2026 – solicitações de mensagem):** `conversas` aceita `pedido {de, status, em}` e `servico {tipo, id}` na
> criação (`acessoNova`: vai direto se quem recebe aceita todos, segue quem escreve ou tem vínculo aceito; senão nasce como
> solicitação; "fechado" nem isso; serviço confere corrida/SOS/pet no documento), só quem recebeu decide (`pedidoMudaOk`),
> mensagens com `pedidoLibera` e ligações só com a solicitação aceita; `pref_publicas` aceita `msgPessoal`, `msgNegocios` e
> `negociosNoPerfil`. Agora são **21 partes**, 1024 testes.

> **Atualização (12/11/2026 – Notas, SOS em etapas e vale-presente):** coleção nova `notas/{uid}/itens/{id}` (só o dono lê e
> grava; título ≤120, texto ≤20.000); `sos` aceita `equipe` e `escalarMin` (0–15) na criação e quem pediu pode abrir para quem
> está perto depois (`publico: true`, `escaladoEm`, `suporteId`); `suporte` aceita a categoria `sos` (urgente);
> `presentes` aceita o tipo `vale` (valor para usar num negócio, com o dono conferido). Continuam **21 partes**, 1037 testes.
> **12/11/2026 (perfil enxuto):** `pref_publicas` aceita `perfil` {cidade, nota, destaques} (verdadeiro/falso: o que aparece no perfil para quem visita). Continuam **21 partes**, 1040 testes.
> **13/11/2026 (escondido e corridas):** publicação, negócio, anúncio de imóvel e anúncio da Comunidade escondidos pela equipe
> (ou de conta desativada) e publicação agendada antes da hora NÃO abrem mais por link direto (só o dono e a equipe);
> corrida/entrega só aceita como destinatário quem já conversa com quem pede (conversa aceita, sem bloqueio).
> Continuam **21 partes**, 1092 testes (inclui o Flash privado e os votos só do autor).
> **13/11/2026 (escondido de verdade + agendadas):** coleção nova `guardados/{colecao}_{id}` (o conteúdo de um item escondido;
> só o dono e a equipe leem) e o item vira um esqueleto vazio; coleção nova `agendadas/{id}` (só o autor); o Diário não aceita
> mais `agendadoPara` no futuro. Agora são **22 partes**, 1127 testes.
> **13/11/2026 (risco baixo):** avaliação com o nome/foto do perfil público; apagar o perfil público libera o @; apagar
> mensagem de vez guarda a cópia em `apagadas/`; chamado com o e-mail do login e até 5 por dia (`ritmo.sup`, SOS fora);
> verificação recusada só pede de novo depois de 30 dias. Continuam **22 partes**, 1139 testes.

Esta pasta começa com `_`, então o GitHub Pages **não publica** nada daqui. São as regras do
`firestore.rules` divididas em **22 partes** (cada uma com menos de 12.800 bytes, cortadas em fim de
linha), para colar no console do Firebase.

- Arquivo de origem: `firestore.rules` (260.964 bytes, 4.029 linhas, sha256 começa com `1214429c8cbe55b8`).
- Cada parte termina com a linha `// ===== FIM DA PARTE X DE 22 =====`. É um comentário: **pode colar junto**,
  não atrapalha (os testes rodaram nas regras com e sem essas linhas).
- Conferido: as 22 partes juntas, sem as linhas de fim, são **exatamente** o `firestore.rules`, byte a byte.
- Testes de regras no arquivo remontado: **1139 passaram, 0 falharam** (o emulador só cita o limite de 1.000 expressões ao explicar gravações recusadas; os testes "com TUDO junto" provam que as gravações máximas cabem).

## Como publicar (uma vez só)
1. Abra o **console do Firebase** → projeto **helpfloripa-61e0d** → **Firestore Database** → aba **Regras**.
2. Clique dentro do editor, selecione tudo (Ctrl+A, ou "Selecionar tudo" no celular) e **apague**.
3. Abra `parte-1-de-22.txt`, copie **tudo** e cole no editor.
4. Vá até o fim do que colou (depois da linha `// ===== FIM DA PARTE 1 DE 22 =====`), abra a parte 2,
   copie tudo e cole logo abaixo. Repita até a parte 22, **em ordem**.
5. Confira: a primeira linha do editor é `rules_version = '2';` e a última é
   `// ===== FIM DA PARTE 22 DE 22 =====`, logo depois de uma linha só com `}`.
6. Clique em **Publicar**. Se o console mostrar um erro (linha vermelha), **não publique**: provavelmente
   uma parte ficou faltando ou repetida. Confira se as 22 linhas `FIM DA PARTE` aparecem, de 1 a 22, uma vez cada.

> As regras do ar continuam valendo até o clique em Publicar. A troca leva até 1 minuto para valer.
> Depois de publicar: painel → Publicações → **"Guardar o que já está escondido"** (só os donos veem o botão) passa o que
> já estava escondido do jeito antigo para a área guardada.

## O que passa a funcionar depois de publicar
- **Diário: várias fotos numa publicação** (até 4, deslizando para o lado). Antes de publicar as regras, quem
  escolher várias fotos publica só a primeira, com um aviso.
- **Dar estrelas na própria publicação** ("se curtir"): conta na média da publicação, mas não na nota do perfil
  nem nos avisos. Antes de publicar as regras, tocar nas estrelas da própria publicação mostra um aviso.
- **Resumo das estrelas:** tocar na média (ao lado das estrelas) mostra quantas pessoas deram cada nota, com barras
  e porcentagem; na sua publicação, também quem deu (filtrando por estrela). Uma leitura por publicação, com
  10 ou 1 milhão de notas.
- **Comentários:** o autor escolhe quem pode comentar (todos, seguidores, seguidores que ele segue, ninguém), fixa
  um comentário no topo, e todo mundo reage com emoji (❤️ 👍 😂 😮 😢 👏). Antes de publicar, a reação conta como
  curtida e "quem pode comentar" só ativa/desativa.
- **Stories (24 h), hashtags, marcar pessoas, agendar, rascunhos e estatísticas (alcance, salvos, origem):** só
  funcionam depois de publicar. Antes disso, a publicação sai sem hashtags/marcações, agendar e rascunho avisam
  que falta publicar, e as estatísticas mostram só estrelas e comentários.
- **Enquetes** (publicação e Flash): duração (1 h a 1 dia, ou personalizada até 7 dias), votar só até o fim,
  **votação anônima** e o resultado nas notificações de quem votou e do dono. Antes de publicar, publicar uma enquete avisa
  que falta publicar as regras.
- **Caixa de perguntas** (publicação e Flash), com nome ou **anônima**: quem vê escreve a resposta e o dono recebe nas
  notificações. Antes de publicar, ela avisa que falta publicar as regras.
- **Flash:** figurinha que leva ao **perfil de um negócio**, **repostar** o flash em que você foi mencionado e
  **publicar o flash no perfil de um, alguns ou todos os seus negócios** (com ou sem o seu perfil pessoal). Antes de
  publicar, o flash com essas coisas avisa que falta publicar as regras.
- **Suporte:** o botão **Reportar este atendimento** (no ⋯ do chamado) grava o reporte que só a moderação e os donos
  veem (antes de publicar, vai como um chamado de "Denúncia"); a equipe pode **Reportar à moderação** a pessoa de um
  chamado; e quem abriu o chamado dá **nota de 1 a 5** depois de encerrado (antes de publicar, avisa que ainda não
  está disponível).
- **Verificação do perfil:** o pedido vai com a **foto do documento** para a moderação conferir no painel (Verificações),
  e a foto é apagada quando a equipe aprova ou recusa. Antes de publicar, o pedido chega à equipe sem a foto do documento.
- **Trava do selo:** quem é da moderação só consegue dar o selo a quem tem o pedido aprovado (tirar continua livre); só o
  **dono** do site dá o selo direto, sem pedido. O perfil público só mostra o selo se a conta tiver o selo.
- **Saúde e Comunidade:** criar o perfil de Saúde e publicar na Comunidade só funcionam depois de publicar (antes, o
  site avisa que falta publicar as regras). O painel ganha **"Banir de um programa"** na ficha e na denúncia.
- **Busca nacional e Diário por região:** a busca do Explorar, das vitrines e da Comunidade passa a achar negócios e
  anúncios do Brasil inteiro (não só os mais recentes), e as publicações novas guardam a região de quem publica.
  Também crie os índices de `_regras/INDICES-LEIA-ME.md`.
- **Teste no Flash (quiz):** a figurinha Teste grava a resposta certa (`enquete.certa`). Antes de publicar as regras, o
  teste vai como enquete comum (o site avisa).
- **Contagem regressiva e público do Flash:** a figurinha Contagem (`stories.contagem`), o "Lembrar-me"
  (`contagem_lembretes`) com o aviso no sino quando acaba e o público do flash (`stories.alvo`: idade, gênero, lugar,
  seguidores). Antes de publicar, o flash vai sem a contagem/sem o público (o site avisa).
- O resto (toque duplo para dar estrelas, quem deu estrelas, Salvos, editar legenda) já funciona com as regras de hoje.

- **Limite diário do Flash (anti-spam):** até 50 flashes por dia por pessoa, contados no mesmo `ritmo/{uid}` das
  mensagens, publicações e comentários (o site soma 1 na mesma gravação do flash; o 51º é recusado com o aviso do
  limite). Antes de publicar, o flash vai sem contar, como hoje.

## Conferência no site depois de publicar
0. **Logo depois de publicar: Painel → Publicações → "Recalcular estrelas"** (uma vez só). Monta o resumo das
   publicações que já tinham estrelas antes (sem isso, a média delas recomeçaria do zero).
1. **Diário → publicar:** escolher 2 ou 3 fotos (aparecem as miniaturas com 2/4, 3/4), publicar e conferir que a
   publicação mostra "1/3" e desliza para o lado. No perfil, a miniatura tem o ícone de várias fotos.

Depois disso, os próximos passos combinados: rodar o workflow **"Converter cidades"** (primeiro simulando) e
configurar o segredo `FIREBASE_SERVICE_ACCOUNT` para a limpeza automática de contas, **antes** de liberar o site.

## Para gerar as partes de novo (se o firestore.rules mudar)
```bash
python3 _testes/dividir-regras.py          # gera _regras/parte-X-de-N.txt e confere byte a byte
cd _testes && node testes-regras.mjs saida/remontado-com-marcas.rules
```
