# Regras do Firestore — publicação

> **Versão de 25/11/2026 (4) — roubos, furtos, golpes e veículos de volta, pelo servidor (12 partes).** Registrar
> ocorrência, pistas, encerrar, cadastrar veículo e o índice dos carros/motos à venda agora passam pela Cloud Function
> **`roubos`** (functions/roubos.js); as regras deles ficaram só de leitura. A 1ª tentativa deu 257.025 compilados (limite
> 256.000): o cadastro de entregador também passou para o servidor (`corrida`, ações cadastro e situacao) e saíram 2 funções
> sem uso. Texto: 137.232 (a versão das corridas, que coube, tinha 138.151).
> Desaparecidos continuam em `_regras/proxima-atualizacao.rules` ("Em breve"). 1305 testes passando.
>
> **Ordem para publicar (Cloud Shell, pasta `hf`), depois de mesclar o PR:**
> 1. `cd ~/hf && git fetch origin && git reset --hard origin/main`
> 2. `cd functions && npm ci && cd ..`
> 3. `npx firebase-tools@latest deploy --only functions:roubos,functions:corrida --project helpfloripa-61e0d` (✔ no fim)
> 4. `python3 _regras/medir-regras.py` — tem que aparecer **CABE** na linha `final.rules` (com erro 503 do Google, pode ir
>    direto ao passo 5: o deploy recusa se não couber).
> 5. `npx firebase-tools@latest deploy --only firestore:rules --project helpfloripa-61e0d`
>    (erro "409 ... already exists": `python3 _regras/ligar-regras.py`, deve dizer **PRONTO**).
> Até o passo 5, as abas Roubos e Veículos aparecem mas não leem as ocorrências (as regras do ar ainda não têm elas).

> **Versão de 25/11/2026 (3), publicada — corridas e entregas de volta, pelo servidor (12 partes).** As mudanças nos pedidos
> (criar, oferta, aceitar, PIN, cancelar, avaliar) agora são feitas pela Cloud Function **`corrida`** (functions/corridas.js);
> as regras das corridas ficaram pequenas (só quem lê e a posição ao vivo de quem leva). Texto: 138.151 (antes 133.633).
> Roubos/veículos e desaparecidos continuam em `_regras/proxima-atualizacao.rules` ("Em breve"). 1280 testes passando.
>
> **Ordem para publicar (Cloud Shell, pasta `hf`):**
> 1. `cd ~/hf && git fetch origin && git reset --hard origin/main`
> 2. `cd functions && npm ci && cd ..`
> 3. `npx firebase-tools@latest deploy --only functions:corrida --project helpfloripa-61e0d` (✔ no fim)
> 4. `python3 _regras/medir-regras.py` — tem que aparecer **CABE** na linha `final.rules`. Se der NÃO CABE, pare e avise o Claude.
> 5. `npx firebase-tools@latest deploy --only firestore:rules --project helpfloripa-61e0d`
>    (erro "409 ... already exists": `python3 _regras/ligar-regras.py`, deve dizer **PRONTO**).
> Até o passo 5, as corridas abrem no site mas não leem os pedidos (as regras do ar ainda não têm `corridas`).

> **Versão de 25/11/2026 (2), publicada — 11 partes, cabe no limite do Firebase.** O Firebase recusa regras com mais de **256.000 bytes
> compilados** (as de antes davam 353.213). Agora:
> 1. **Corridas/entregas, roubos/veículos e pessoas desaparecidas ficaram para a próxima atualização** (decidido em 25/11/2026):
>    as regras delas estão guardadas em `_regras/proxima-atualizacao.rules` e o site mostra "Em breve" (`em-breve.js`).
> 2. As regras passam por `_testes/preparar-publicacao.sh`: sem comentários, nomes curtos e atalhos para o que se repete
>    (mesmas regras; Flash e negócios ficam sem atalho porque estão perto do limite de 1.000 conferências por gravação).
> Testes: 1217 passando no arquivo remontado (e 20 guardados junto com as funções que saíram).
>
> **Jeito recomendado de publicar — Cloud Shell, na pasta `hf`:**
> 1. Antes: os 3 donos com `papel: "dono"` em `admins/{uid}` (Firestore › Dados).
> 2. `git pull`
> 3. `python3 _regras/medir-regras.py` — tem que aparecer **CABE** na linha `final.rules`.
> 4. `npx firebase-tools@latest deploy --only firestore:rules --project helpfloripa-61e0d`
> 5. Se o deploy der o erro "409 ... already exists": `python3 _regras/ligar-regras.py` (deve dizer **PRONTO**).
> 6. No painel: Publicações › "Recalcular estrelas" e "Guardar o que já está escondido".
> Pelo console também dá: as 11 partes abaixo, coladas em ordem.

> **Se o console continuar com "Ocorreu um erro desconhecido" — publicar pelo Cloud Shell (mostra o erro de verdade):**
> 1. Abra o Cloud Shell (ícone `>_` no topo do console do Google Cloud, projeto helpfloripa-61e0d).
> 2. Cole, uma linha por vez:
>    `rm -rf hf && git clone https://github.com/Uni-lux/HelpFloripa-site- hf && cd hf`
>    `npx firebase-tools@latest deploy --only firestore:rules --project helpfloripa-61e0d`
> 3. Se publicar, aparece "Deploy complete!". Se não, copie a mensagem de erro (ou mande print) para o Claude.
> O `firebase.json` publica o `_regras/firestore-publicar.rules` (as mesmas regras das 16 partes, sem comentários).

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
> **13/11/2026 (corrida, figurinhas e chamados):** a corrida em aberto guarda só a região (2 casas decimais, "Região de
> Centro") e o endereço exato vai para `corridas/{id}/privado/rota`, que o entregador só lê depois de aceitar; coleção nova
> `suporte_abertos/{uid}` (a lista dos chamados em andamento, que muda na mesma gravação): no máximo 3 em andamento
> (SOS fora), também ao reabrir. Continuam **22 partes**, 1157 testes.
>
> **Links do perfil (13/11/2026):** coleção nova `contatos_perfil/{uid}_{instagram|whatsapp}` {uid, tipo, valor, ver, em}:
> Instagram e WhatsApp em ícones no perfil, cada um com quem pode ver (`todos`, `seguidores` = quem segue a pessoa, `ninguem`);
> quem não pode ver tem a leitura recusada; bloqueio esconde; ninguém lista a coleção. Agora são **23 partes**, 1174 testes.
>
> **Perfil como nas redes (13/11/2026):** `contatos_perfil` aceita também `tiktok`, `x` e `youtube`; `pref_publicas` ganhou
> `pronomes` (≤24) e `profissao` (≤40), opcionais, mostrados no perfil. Continuam **23 partes**, 1180 testes.
>
> **Redes do perfil (14/11/2026):** `contatos_perfil` aceita também `telegram`, `kwai`, `facebook` e `linkedin` (tipo + valor
> num regex só); quem vê agora é `todos`, `seguidores` ou `amigos` (vocês se seguem: as duas `relacoes` existem); `ninguem`
> antigo só o dono vê. `pref_publicas.redes` = lista dos tipos que a pessoa tem (sem os valores). Continuam **23 partes**, 1188 testes.
>
> **E-mail de contato no perfil (14/11/2026):** `contatos_perfil` aceita também `email` (minúsculo, ≤120); `redes` até 10.
> Continuam **23 partes**, 1190 testes.
>
> **Social: memória do vínculo (16/11/2026):** `vinculos` aceita, de um dos dois e com o vínculo aceito, `conheceram`
> ("AAAA-MM-DD" ou vazio), `frase` (≤90), `retrato` (sim/não), `memoriaEm` e `memoriaPor`. Coleção nova `vinculos_retrato/{id do vínculo}`
> {foto JPEG ≤240 mil letras, por, em}: lê quem vê o vínculo, grava um dos dois, ninguém lista. Continuam **23 partes**, 1210 testes.
>
> **Salão (16/11/2026):** coleção nova `momentos/{id}` {uid, tipo foto|lembranca, titulo ≤60, texto ≤400, data "AAAA-MM-DD" ou
> vazio, local ≤60, categoria (12), foto JPEG ≤240 mil (obrigatória na foto), fixado, ver todos|seguidores|amigos|eu, com ≤10,
> criadoEm, atualizadoEm}. Lê quem o "ver" deixa (seguidores = segue; amigos = os dois se seguem; bloqueio esconde); a lista
> precisa filtrar `uid` e `ver`. Só o dono grava. Continuam **23 partes**, 1238 testes.
>
> **Veículos (18/11/2026):** coleção nova `veiculos/{id}` {donoId, tipo carro|moto, placa (padrão Mercosul), placaHash, marca,
> modelo, ano, cor, apelido, chassiFim, status ok|roubado|recuperado, ocorrenciaId, roubadoEm, criadoEm, atualizadoEm}: só o
> dono e a moderação leem. Índice `veiculos_venda/{negocio}_{16 letras do hash}` {negocioId (`uid_lojinha` ou
> `uid_automotivo`), donoId, tipoNegocio, item, tipo, placaHash, marca, modelo, ano, cor, cidade, uf, criadoEm, atualizadoEm}:
> qualquer conta lê (procura pelo hash), só o dono do negócio grava, a moderação apaga — **nunca leva a placa**.
> `ocorrencias.veiculo` {marca, modelo, ano, cor} (opcional). Continuam **23 partes**, 1266 testes.
>
> **Desaparecidos (18/11/2026):** coleção nova `desaparecidos/{id}` (aviso de pessoa desaparecida com o número do boletim de
> ocorrência). Nasce "analise" e só a moderação publica ("ativo") depois de conferir; quem registrou e a moderação leem sempre,
> os outros só o publicado. Pistas em `desaparecidos/{id}/pistas` (anônima com `pistas_desap_autoria/{id}_{p}`, só a moderação
> lê). Continuam **23 partes**, 1282 testes.

> **Auditorias (23/11/2026):** equipe sem o campo `papel` não é mais dono (`'nenhum'`); listar `entregadores` só a
> moderação; `pets_achados.local` dentro do Brasil; comentário oculto vira esqueleto e o conteúdo vai para
> `comentarios_ocultos/{id}` (só quem escreveu, o dono da publicação e a moderação leem). Agora são **24 partes**, 1302 testes.

> **4ª auditoria, partes 1 a 5 (24/11/2026):** cadastro não aceita `plano`/`valorPlanoMensal` e `tipoUsuario` só "usuario";
> anúncio de imóvel com números de verdade (preço, condomínio, IPTU, quartos, área... nunca negativos nem absurdos),
> finalidade e tipo só das listas do site; promoção não pode já ter acabado; Comunidade confere venda também no tipo do item,
> nas regras do quarto e no local do achado, e recusa "R $", "50 reais", "30 conto", "aceito proposta". Agora são
> **25 partes**, 1321 testes.

> **4ª auditoria, partes 6 a 10 (24/11/2026):** cópia da mensagem apagada igual à original em TODOS os campos (cartão,
> avaliação, resposta, nome do arquivo, histórico de edição); solicitação de mensagem só é decidida uma vez, quando está
> pendente, com a hora do servidor; agendadas com criadoEm/atualizadoEm do servidor; etiquetas das notas de clientes são
> textos de até 24 letras; comunicado só com link para página do site e datas certas; reclamação nasce e reabre sem datas
> de resposta/resolução; contexto da denúncia só com ids de mensagem; histórico de sanção só cresce (e só os donos apagam
> uma sanção). Continuam **25 partes**, 1336 testes.

> **4ª auditoria, partes 11 a 15 (24/11/2026):** chamado de golpe e de Help sempre urgente; anexo do suporte só da pasta
> `suporte/` do Storage (a sua ou a da equipe); pedido de verificação só com links http(s) e decisão com a hora do servidor;
> reportes só andam para a frente (novo → em análise → resolvido/descartado); nota do atendimento com o atendente do
> chamado; menções do chat da equipe só com ids; conversa individual da equipe: cada um marca só a própria leitura e o
> resumo só de quem grava; cópia da mensagem apagada da equipe igual em tudo; tarefa concluída com a hora do servidor;
> registro de ações só com os campos dele; visto e reação do Flash só de quem pode ver o flash. Continuam **25 partes**,
> 1352 testes.

> **4ª auditoria, partes 21 a 24 (25/11/2026):** presente de produto com itens no formato do site ({nome, preco, qtd}) e
> presente/vale só para negócio no ar; localização ao vivo: com bloqueio a outra pessoa deixa de ver e a posição para de
> mudar; Help: lista de avisados só com contas (sem a própria pessoa), número do chamado tem que ser da própria pessoa e quem
> desiste de ajudar limpa nome e hora; autoria de pista anônima só para pista nova; ocorrência e desaparecido só com a
> região (até 3 casas, ~100 m); ao publicar um desaparecido o boletim sai do aviso (fica no registro de ações); cores do pet
> só da lista; código da placa do veículo conferido na regra (SHA-256 da placa). Continuam **25 partes**, 1366 testes.

> **4ª auditoria, partes 16 a 20 (25/11/2026):** destaque do Flash sem flash repetido, ids só de flash e capa (quando
> muda) tem que ser um flash da própria pessoa; nota pessoal não muda a data de criação; voto na enquete de um comentário
> recusado se o comentário está escondido ou há bloqueio com quem fez; público da publicação com idade mínima ≤ máxima;
> foto/vídeo do Storage numa publicação só da pasta `diario/<autor>/`. Continuam **25 partes**, 1375 testes.

Esta pasta começa com `_`, então o GitHub Pages **não publica** nada daqui. São as regras do
`firestore.rules` divididas em **11 partes** (versão para publicar, gerada pelo `_testes/preparar-publicacao.sh`) (cada uma com menos de 12.800 bytes, cortadas em fim de
linha), para colar no console do Firebase.
- Arquivo de origem: `firestore.rules` (298.320 bytes, com comentários) → versão compacta de 191.423 bytes (limite do console: 256 KB).
- Arquivo de origem: `firestore.rules` (298.320 bytes. 4.467 linhas. sha256 começa com `bc4c611a43dcafba`).
- Conferido: as 11 partes juntas, sem as linhas de fim, são **exatamente** o `_regras/firestore-publicar.rules`, byte a byte.
  não atrapalha (os testes rodaram nas regras com e sem essas linhas).
- Conferido: as 25 partes juntas, sem as linhas de fim, são **exatamente** o `firestore.rules`, byte a byte.
- Testes de regras no arquivo remontado: **1375 passaram, 0 falharam** (o emulador só cita o limite de 1.000 expressões ao explicar gravações recusadas; os testes "com TUDO junto" provam que as gravações máximas cabem).

## Como publicar (uma vez só)
1. Abra o **console do Firebase** → projeto **helpfloripa-61e0d** → **Firestore Database** → aba **Regras**.
2. Clique dentro do editor, selecione tudo (Ctrl+A, ou "Selecionar tudo" no celular) e **apague**.
3. Abra `parte-1-de-22.txt`, copie **tudo** e cole no editor.
4. Vá até o fim do que colou (depois da linha `// ===== FIM DA PARTE 1 DE 23 =====`), abra a parte 2,
   copie tudo e cole logo abaixo. Repita até a parte 22, **em ordem**.
5. Confira: a primeira linha do editor é `rules_version = '2';` e a última é
   `// ===== FIM DA PARTE 22 DE 23 =====`, logo depois de uma linha só com `}`.
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
