# Help Floripa — notas para o Claude (lidas automaticamente em cada sessão)

Site estático (HTML/JS puro, sem build) publicado em helpfloripa.com.br pelo GitHub Pages
(Jekyll: pastas com `_` ou `.` não são publicadas). Firebase Auth/Firestore 10.12.2 carregado do gstatic.

## Regras fixas do dono do projeto
- Falar em **português**. Visual profissional e caprichado.
- Trabalhar na branch indicada pela sessão, commit + push e **um PR por etapa**. Ele faz o merge.
- **Sempre terminar a resposta com o link do PR** (abrir o PR assim que o trabalho estiver pronto e mandar o link no final).
- **NUNCA** publicar, compartilhar ou commitar chave de conta de serviço do Firebase.
- Não mudar o bloqueio/liberação do site sem ele pedir.
- `.js` importados com `?v=N`: ao mudar um arquivo, aumentar o `?v=` em todos que o importam
  (cascata). Use `python3 _testes/versoes.py` antes do commit. `firebase.js` é carregado sem `?v` (sempre foi).
- **Regras do Firestore: ele publica À MÃO e UMA VEZ, na Etapa 5.** Até lá, acumular em
  `firestore.rules` e avisar quando uma etapa depender delas. Entrega: dividir o arquivo em partes de
  ~12.800 bytes, cortando em fim de linha, cada parte terminando com `// ===== FIM DA PARTE X DE N =====`;
  conferir que as partes juntas dão exatamente o arquivo e rodar os testes de regras no arquivo remontado.
- Testar de verdade antes de cada push: emulador (firestore 8085, auth 9099, projeto demo-hf) + Playwright.
  Tudo pronto em `_testes/` (leia `_testes/README.md`). `clearFirestore()` no demo-hf apaga os dados do navegador:
  os testes de regras usam o projeto `demo-regras`.
- Excel precisa abrir no **Microsoft Excel**: validar com o Open XML SDK (`_testes/checar-todos.py`).

## História e visão do projeto (documento do dono, 22/10/2026 — base de contexto)
- Help Floripa é uma **iniciativa empresarial** (não "só um site"): plataforma que conecta quem precisa (clientes) e quem
  oferece (autônomos e pequenos negócios), com identidade própria, categorias, cadastros, perfis, comunicação e monetização.
  Há um amigo como possível cofundador (divisão de responsabilidades/participação ainda em definição). Começar como MEI e
  evoluir para LTDA. CNPJ do rodapé 61.935.934/0001-00 é informação dada por ele (situação cadastral a verificar).
- Frase da marca: **"Tudo que você precisa em um só lugar."** Frentes: serviços, lanches/delivery, shopping/produtos,
  aluguéis/imóveis e cadastro de clientes/profissionais/negócios (hoje o site também tem Saúde e Comunidade).
- Modelo: marketplace/intermediadora; prestadores são **autônomos, sem vínculo empregatício**. Receitas *consideradas*
  (não tratar como já implantadas): **comissão de 10–15%** sobre o valor acordado, **planos Premium**, publicidade/patrocínio.
  Comissão exige regras claras (quando é devida, confirmação, pagamento, cancelamento, reembolso).
- **Identidade visual — NÃO mudar sem autorização dele:** escura e tecnológica; fundo #000000, painéis #111111, ciano
  #00ADEE, ciano de hover #0087C2, textos brancos/neutros. Não trocar cores, conceito ou reconstruir a interface em outro estilo.
  Funcionar bem no computador e no celular (sem cortes, sobreposição, texto ilegível ou botão difícil de tocar).
- Princípios: não inventar preço (valor analisado/acordado; cliente pode informar orçamento máximo); números como avaliações e
  pedidos só com dados reais; tela de pagamento ≠ integração financeira (confirmar backend/provedor antes de dizer que funciona);
  segurança nunca "concluída" só por pôr um cabeçalho ou regra; confirmar no código antes de afirmar que algo funciona.
- Navegação desejada: marca centralizada, menu à esquerda, notificação e perfil acessíveis (também no computador); menu
  lateral com o nome "Help Floripa" sem subtítulo; opções Cliente, Profissionais, Ajuda, Seja sócio-parceiro. **Não
  reintroduzir o "painel de parcerias" que ele descartou** nem outras funções removidas. Login só por e-mail e senha (sem
  Google/Facebook na interface). Serviços: categorias Limpeza e Cuidados, Obras e Reformas, Saúde e Beleza, Transporte e
  Logística, Pet, Tosa, Assistência, Tecnologias e **"Outros" sempre por último**. Início: título "Bem-vindo à Help Floripa",
  Ponte Hercílio Luz à noite, carrossel com 3 imagens, cartões das categorias.
- Área de atuação no documento: **"somente Florianópolis por enquanto"**; São José só com **cobrança adicional** (regras
  comerciais a definir). Prioridade: validar o mercado inicial antes de expandir.
- Rede de profissionais: 27 → 29 colaboradores é referência histórica, NÃO contagem atual. Captação de **R$ 50.000** foi
  estimativa de planejamento (não recebida); Finep como possível apoio, se atender aos critérios.
- **Princípios (seção 20 do documento):** 1) preservar a identidade visual; 2) melhorar sem destruir (ver estrutura, links e
  integrações antes); 3) mobile primeiro, sem esquecer o computador; 4) protótipo ≠ funcionalidade pronta; 5) nada inventado
  (avaliações, pedidos, profissionais, pagamentos, resultados, funções); 6) intermediação, sem vínculo empregatício;
  7) Florianópolis como prioridade inicial; 8) mudanças direcionadas, código completo quando ele pedir; 9) segurança desde o
  início; 10) pensar como negócio (cada função com finalidade clara).
- **Como trabalhar com ele (seção 22):** parceiro técnico e estratégico; analisar o código antes de propor; correção pontual não
  reescreve tudo; arquivo completo quando pedido; explicar a causa e dar solução prática; decisão não definida = perguntar, não
  inventar; separar o que está pronto, o que é possível, o que depende de serviço externo e o que precisa de validação jurídica
  ou financeira. Construir por etapas, com visão de longo prazo.
- **Diferenças entre o documento e o site atual: decididas por ele em 22/10/2026 — eram dados antigos, vale o site
  como está.** Não perguntar de novo nem mudar por causa do documento: atuação em todo o Brasil, textos atuais sobre
  comissão, tema escuro atual (#070b0e/#0f161b/#0093cc + claro e Automático), título atual do início, os 7 grupos de
  `GRUPOS_SERV`, menu atual e a página Sócios e parcerias. Documento completo (seções 1–23) recebido em 22/10/2026;
  versão juntada com a história técnica: documento "Help Floripa — História, evolução e diagnóstico"
  (https://claude.ai/artifact/QygAianAGKf94wMR7T99oW).

## Situação (13/10/2026)
- **Regras do Firestore publicadas por ele em 13/10/2026** (as do `firestore.rules` do main, Etapas 1 a 4).
  Daqui em diante, mudança de regra volta a precisar de publicação manual (combinar com ele).
- Etapa 1 (PR #27), Etapa 2 (PR #28) e Etapa 3 (PR #29): **mescladas**.
- Etapa 4 (PR #32): **mesclada**. Mudou regras: avaliação com vínculo, `denuncias.contexto`, equipe abre
  `suporte/{id}` para qualquer pessoa (`abertoPor`), `atendimento.semana/almoco/volta`.
- Etapa 5: `_regras/parte-1..8-de-8.txt` + `_regras/LEIA-ME.md` (passo a passo) gerados por
  `_testes/dividir-regras.py`; 91 testes de regras passando no arquivo remontado (com e sem as linhas de fim).
  PR #33 mesclado, **regras publicadas** e **conferência do site feita por ele: tudo funcionando** (13/10/2026).
- PR #35 (mesclado): chat da equipe em tela cheia no celular e no topo do menu, gráficos de colunas sem nomes
  sobrepostos (quebra em 2 linhas ou vira barras deitadas) e Estatísticas sem contas falsas do registro de ações.
- Chat da equipe no padrão da página de Mensagens (abas Individual | Equipe, mesmos ícones, balões, campo e
  botão com seta; no celular ocupa a tela toda; "Adicionar alguém" no ⓘ). Atendimento salva sozinho
  (`agendarSalvarAtend`, status "✓ Salvo"); com ausência ligada o horário aparece junto ("Horário: ...").
- `confirmar.js`: janela de confirmação única (`confirmarHF`), `sairDaConta()` usado pelos 3 botões de sair
  (menu, configurações, mensagens) e `guardarSaida()` (ligado no firebase.js): "voltar" que sairia do site ou do
  painel pergunta "Sair do Help Floripa?/do painel?" (marca hfBase + entrada hfGuarda; não usar
  `history.replaceState(null, ...)`, use `history.state`). Chat da equipe: minha foto com lápis e foto do grupo
  (`equipe_info/grupo`, regra publicada em 13/10/2026 junto com a de editar/apagar).
- **Editar e apagar mensagens** (Mensagens e chat da equipe; PR depois do #37), `msg-acoes.js` (janelas comuns):
  apagar para mim = `usuarios/{uid}.ocultasMsg` (`{conv: [ids]}`, equipe usa `"eq_"+conv`, sem regra nova);
  apagar para todos = a mensagem vira `{remetenteId, criadoEm, apagada:{por,em}}` (equipe: `autorId,nome,em,apagada`)
  e o conteúdo vai junto (writeBatch) para `conversas/{c}/apagadas/{id}` / `equipe_apagadas/{id}`; lê por 24 h a
  partir de `apagadaEm` (sem `expiraEm`: o cliente não grava request.time+24h), depois quem abrir a conversa apaga.
  Denunciar marca `denunciada`; e se existe `denuncias/mensagem_{id}_{quemRecebeu}` (mesmo feita antes de apagar) só a moderação apaga o conteúdo. Editar: `texto`, `editadaEm`, `edicoes` (lista de
  `{texto, em}`, `em` = `editadaEm` ou `criadoEm`/`em` anterior; regra usa `concat`, slice `[0:0]` dá erro).
  Editar e apagar para todos só até 10 min do envio (regra `noPrazoDeMexer`, cliente `podeMexer`; apagar de vez também). Cartões (pedido/avaliação) não se editam. Com as regras antigas: apagar p/ todos apaga de vez, editar avisa.
  PR #38 mesclado (sem o commit dos 10 min, que foi para o PR seguinte). **Regras publicadas por ele em 13/10/2026**
  (versão 4ª das 9 partes, com equipe_info, editar/apagar e 10 min; 137 testes). Menu do painel: trava só `html`.
- **Diário (PR depois do #39):** estrelas com reserva se a soma no servidor falhar (índice), prévia de foto alta com
  "Ver inteira", toque duplo = 5 estrelas (`darRapido`), "quem deu estrelas" (dono toca no resumo), Salvos
  (`usuarios.salvos`, filtro "Salvos" no feed, botão na publicação do perfil), carrossel `carrosselFotos`/`fotosDoPost`
  (`diario.midias` 2–4, `midias[0]==mediaUrl`; sem Storage as fotos encolhem para caber no doc). "Se curtir": estrelas
  na própria publicação (regra sem `postAutorId != uid`; não conta em `estrelasDoAutor` nem nos avisos).
  **Resumo das estrelas** `diario_notas/{postId}` {total,soma,n1..n5}: muda na MESMA gravação da nota (regra
  `contaCerta` confere antes/depois; `resumoJunto` obriga a nota a mexer no resumo); sem resumo (posts antigos) conta com
  5 `getCountFromServer`; painel → Publicações → "Recalcular estrelas" (moderação) remonta tudo. Folha
  `abrirResumoEstrelas` (média, barras 5→1, sua nota, quem deu com filtro só p/ dono). Estrela grande do toque duplo
  aparece também com "remover animações" (antes sumia na hora). Conta apagada: `conta.js` e `limpar-contas.mjs`
  tiram a nota do resumo.
  **Diário/comentários (PR depois do #41):** filtro "Principais ▾" (Principais = recentes por engajamento:
  `buscarPrincipais` lê 120 posts + `lerResumosEstrelas` + comentários dos 40 melhores, nota decai com a idade;
  Quem eu sigo; Amigos = vínculos aceitos + seguidores mútuos). Salvos foi para o Perfil (abas Publicações | Salvos).
  Foto sem "ver inteira" (proporção da publicação, entre 4:5 e 1,91:1). Toque duplo = `contadorEstrelas` (1→5,
  tocar para parar; na 5ª as estrelas se fundem). Comentários (`montarComentarios`): fixado (`diario.comentarioFixo`;
  sem escolha = o 1º; "" = nenhum), ordem por engajamento (reações + 2×respostas), reações `curtidas_comentarios.reacao`,
  `diario.quemComenta` (todos/seguidores/mutuos/ninguem; regra `podeComentar`), barra Salvar/Enviar/Compartilhar
  (`acoesPublicacao`; Enviar = cartão `tipo: publicacao` no Mensagens), link `usuarios.html?post=ID`. Quem deu estrelas:
  rolagem infinita, 1º quem você segue, 2º `minhaRede()` (seguidos por quem você segue/seus seguidores).
  **Diário parte 2:** avisos de reação (`curtidas_comentarios.comentarioAutorId`) e de marcação (`diario.marcados`)
  em rede.js/painel-avisos.js/categoria.js/notificacoes.js; `diario.tags` (de `tagsDoTexto`, busca `feed.html?tag=` e
  "#x" no Explorar), `diario.marcados` (≤10), `diario.agendadoPara` (até 60 dias; feeds escondem; perfil mostra
  "Agendada" + "Publicar agora"), rascunhos em `rascunhos/{uid}/itens`, alcance `diario/{id}/vistas/{uid}` (origem;
  `marcarVista` 1 s na tela), `salvamentos/{post_uid}` (o autor conta), `curtidas.origem`; `estatisticas-post.js`;
  silenciar `usuarios.silenciados`; `stories.js` (stories/{id} 24 h, vistos/{uid}; vídeo só com Storage); vídeo curto
  ≤60 s, toca sem som quando aparece.
  **Regras de `midias`, "se curtir", `diario_notas`, comentários e Diário parte 2 NÃO publicadas** (10 partes em `_regras/`, 191 testes; depois de publicar, apertar "Recalcular estrelas" no painel); com as regras do ar
  publica só a primeira foto e avisa; estrela na própria publicação avisa que falta publicar.
- **Diário parte 3 (PR depois do #43, sem regra nova):** toque duplo = estrelas SURGINDO espalhadas pela foto e
  crescendo (`contadorEstrelas`, `.est-voa` com SVG dourado em `data:`; 5 lugares em `LUGARES_ESTRELAS`), pílula
  "★★★ 3 · toque para parar". Barra da publicação estilo Instagram (`barraInteracao`): linha 1 = estrelas + comentar,
  enviar, compartilhar e salvar (à direita); linha 2 = média/notas e "Ver os N comentários". Os botões saíram da folha
  de comentários (`acoesPublicacao` foi apagada). Filtros: só **Principais** e **Amigos** ("Quem eu sigo" guardado vira
  Principais). Principais = 120 recentes + recentes de quem segue; nota = engajamento × (1 + `afinidade`) × 1,8 se
  segue × 0,35 se já vista ÷ idade^(1,35 ou 1,1 se segue), ±10% de mistura, `espalharAutores`. `gosto.js`: gosto no
  aparelho (`hf-gosto`, autores e hashtags, meia-vida 14 dias) por estrelas, comentar, salvar, enviar, compartilhar,
  abrir e 4 s olhando; `sincronizarGosto` lê `curtidas.uid` 1×/dia. **Stories viraram Flash ⚡** (coleção continua
  `stories`): anel segmentado por flash (`fundoAnel`), criador em tela cheia (Foto/vídeo com legenda ou Texto com
  8 fundos e 4 letras, desenhado em canvas 1080×1920 e salvo como foto), visor com selo "⚡ Flash", som, deslizar entre
  pessoas, segurar esconde tudo, "Visto por N" com rostos, responder e reações (vão como texto pela `mandarMensagem`
  do rede.js), anel na foto do perfil (`anelNoPerfil`). Visor e criador ficam em z-index 4900 (folhas por cima).
- **Diário parte 4 (PR depois do #44, sem regra nova):** barra da publicação em 2 faixas: estrelas + média em cima
  (`.int-topo`), embaixo 4 ações iguais com ícone e nome (`.acoes-post`: Comentar/N comentários, Enviar,
  Compartilhar, Salvar/Salvo). Editor de imagem (`editor-imagem.js`) estilo Instagram: tela preta, "Concluir" no topo
  (`.hfe-btn.pri`, `op.botao` troca o texto), moldura fina, grade dos terços e margem tracejada só ao mexer, linhas
  rosa que encaixam no meio, faixas "Nome e hora"/"Responder" quando é em pé, toque duplo volta ao início. Flash:
  criador com cartão 9:16 de bordas arredondadas; a foto é ajustada no próprio cartão (arrastar/pinça, guias e faixas
  de segurança), "Aa" escreve por cima (cor, letra, destaque, tamanho; arrastar até a lixeira apaga), Câmera/Galeria;
  `desenharFoto` grava o cartão em 1080×1920. Nome: ficou **Flash** (o dono perguntou "Registro"; recomendado Flash).
  Explorar: busca no topo, atalhos, "Em alta agora" (hashtags das 120 recentes), "Destaques para você" (mosaico, 1ª
  grande, `usuarios.html?post=`), "Sugestões para você" (cartões com Seguir) e "Ativos recentemente" (8).
- **Diário parte 5 (PR depois do #45, sem regra nova):** `confirm()` do navegador trocado pela janela do site
  (`confirmarHF`, ícones novos lixo/bloquear/pessoa/alerta/selo, `cor: "normal"` = azul) no Flash, Diário, perfil,
  bloquear/restringir/remover seguidor, comentário e rascunho. Publicação enviada no Mensagens vira cartão estilo
  Instagram (`cartaoPublicacao` em mensagens.html: lê `diario/{id}` do link, autor + foto 4:5 + legenda; apagada =
  "Publicação indisponível"). Flash: câmera do próprio app (`getUserMedia`, abre direto se a permissão já foi dada;
  sem permissão cai na câmera do celular), virar câmera, lanterna (se o aparelho deixa), temporizador 3 s, deslizar
  troca o filtro. `filtros-foto.js`: 8 filtros (Normal, Pele suave, Luz, Vívido, Quente, Frio, Retrô, P&B) iguais na
  prévia (CSS) e na foto (`ctx.filter` ou matriz pixel a pixel no Safari antigo); "Pele suave" = cópia desfocada por
  cima. Comentários: tocar nas reações abre "Reações" (quem reagiu, emoji de cada um, filtro por emoji). Testes:
  `navegador({ camera: true })` liga câmera de mentira com permissão.
- **Diário parte 6 (PR depois do #46, sem regra nova):** `filtros-foto.js` refeito: 10 filtros (Original, Beleza,
  Beleza+, Radiante, HD, Dourado, Brisa, Cinema, Retrô, P&B) processados pixel a pixel (`aplicarFiltro`/`imagemFiltrada`):
  pele lisa só onde é tom de pele (YCbCr) e sem contorno, nitidez, glow, temperatura, desbotado, tons de cinema,
  vinheta. Câmera com filtro desenha cada quadro num canvas (`ligarQuadros`, ~380 px); foto processada por filtro em
  cache (1100 px) e em tamanho cheio só ao publicar; bolinhas com a prévia real. Criador do Flash quase tela cheia com
  moldura em degradê (`.flash-moldura`); ícones `i-raio`/`i-raio-off`/`i-figurinha`/`i-local` no rede.js; figurinhas
  Horário/Data/Localização (`EST_FIG`, toque troca o estilo, localização do perfil editável). Menções: `uidsMencionados`
  (nicknames/{nick}) entram em `diario.marcados` ao publicar. Perfil: grade com filtros Tudo/Fotos/Vídeos/Textos/
  Marcações (`renderizarGrade` com `uid`; marcações = `marcados array-contains`, `_marcacao` abre sem editar/apagar),
  cartão de texto com aspas e tom fixo por id (`tomDoTexto`), grade 4:5. Diário: texto curto sem foto vira cartão.
  Estatísticas refeitas (cabeçalho, comparação com a média das últimas 12, engajamento, destaques, gráfico de alcance e
  de interações no tempo com dica ao tocar, horários, distribuição das estrelas, seguidores × não seguidores).
- **Diário parte 7 (PR depois do #47, MUDA REGRAS — não publicadas):** perfil novo (`.pf2`: nome, @, cidade e bio
  sobre a capa; cartão de números com seta → estatísticas; botão "Estatísticas do perfil" `.pf-painel`; abas com
  ícone e sublinhado `.abas-perfil`: Publicações | Reels | Textos | Salvos | Marcados, `ABAS_PERFIL`/`renderizarGrade`;
  Textos em lista estilo Threads/X `desenharTextos` `.texto-item`). Texto da publicação voltou ao simples
  (`post-texto so-texto`) com toque duplo = estrelas. **Toque duplo = 5 estrelas na hora** (`contadorEstrelas` não
  conta mais); arrastar o dedo pela fileira dá a nota onde soltar; estrelas são SVG (`icone("estrela")`,
  `estrelasEmLinha`), nada de ★ emoji. Filtros na GPU: `FiltroGL` (WebGL, mesmo efeito do `aplicarFiltro`, que fica de
  reserva). **Enquetes**: `diario.enquete`/`stories.enquete` {pergunta, opcoes 2–4, x, y}, votos em
  `enquete_votos/{d|f}_{itemId}_{uid}` {alvo,tipo,itemId,uid,opcao,criadoEm} (`blocoEnquete`, conta com count por
  opção). Flash: menções (`stories.mencoes`, manda DM), configurações `usuarios.flashConfig` (respostas, publico
  todos/amigos + `lista`, `ocultoPara`, salvarAparelho; `abrirConfigFlash`; filtro de quem vê é no cliente, `podeVer`),
  anel verde de amigos próximos. "Quem pode me marcar": `pref_publicas/{uid}.permiteMarcar` (`podeMarcar`; em
  `perfis_publicos` estourava 1.000 expressões). Configurações → "Diário e Flash". `insights.js`: estatísticas do
  perfil (7/30/90 dias, variação vs período anterior, gráficos, melhores publicações, público). Teste: `t-enquete.mjs`.
  Regras: 10 partes em `_regras/`, 208 testes.
- **Diário parte 8 (PR depois do #48, muda 1 regra — não publicada):** perfil no modelo que ele mandou: no tema
  escuro sem cartão (capa sangrando até as bordas e se fundindo no fundo, `--pf-fundo`), Editar perfil em azul,
  perfil dos outros com Seguir · Mensagem · ⋯ (Social e Compartilhar foram para o ⋯), negócios em grade de 5 sem
  rolar ("Criar / de negócio"), números sem fundo. **Fio vermelho e foto do duo na capa saíram**: rosinha ao lado do
  nome (`.pf-rosa`, `desenharDuoCapa`), configuração "Rosinha do duo no perfil" (Clicável / Só a rosinha / Ocultar,
  mesmo campo `duoCapa`); a rosinha fica no canto da foto de perfil (no seu perfil a câmera vai para a esquerda) e
  tocar nela mostra a fotinho do duo (`.pf-duo-bolha`, abre o perfil só se for clicável). Tocar e SEGURAR a foto de
  perfil (`segurarFoto`/`abrirFotoGrande`): foto grande estilo Instagram com lápis (sua) e 4 opções do Help Floripa. Toque duplo em texto/enquete: sem estrelas voando, só as da barra acendem
  (`seletor.pular()`, `toqueDuplo(..., simples)`). **Enquete: voto único** (regra `allow update, delete: if false`;
  `limpar-contas.mjs` apaga os votos da conta). Enquete aparece também na aba Textos. Teste: `t-perfil.mjs`.
  Regras: 10 partes em `_regras/`, 209 testes.
- **Diário parte 9 / Social etapa 1 (PR depois do #49, sem regra nova):** pedido dele dividido em 4 etapas:
  **1) perfil, seguidores e salvos** (PR #51, mesclado), **2) enquete profissional** (duração até 1 dia ou personalizada, resultado
  nas notificações de quem votou e do dono; MUDA REGRA), **3) Flash completo** (repostar quando mencionado, figurinha de
  link para perfil de negócio, reações/respostas/menções como cartão no Mensagens), **4) Explorar** (o que falta e
  sugestões da atualidade). Etapa 1: "+" azul na foto do seu perfil = novo flash (`novoFlash(aoPublicar)` em
  stories.js; trocar a foto ficou só no lápis da foto grande, que também tem "Novo flash"); anel do seu flash no seu
  perfil (`anelNoPerfil` serve para os dois e não liga o clique duas vezes). Seguidores/Seguindo numa folha só ("Sua
  rede"/"Conexões"): abas com número, busca sem acento por nome/@, filtros com contagem (seus seguidores: não segue de
  volta/mútuos; quem você segue: não seguem você de volta/mútuos; de outra pessoa: quem você segue/seguem você), selo
  "Segue você" (`meusSeguidores()` lê 1× por página). Salvos com **coleções** `usuarios.colecoes`
  [{id,nome,ids}] (≤30, só o dono; `listaColecoes/gravarColecoes/novaColecao/escolherColecao` no rede.js; folha
  "Salvar em"; toast depois de salvar abre a folha; feed ⋯ "Salvar em uma coleção"); capa em mosaico, filtros
  Tudo/Fotos/Vídeos/Textos, autor em cada item e marcador com opções. Atalhos do Explorar: ícone no fluxo (não cobre
  mais o nome). Teste: `t-salvos.mjs`.
- **Social etapa 2 – enquete profissional (PR depois do #51, MUDA REGRAS — não publicadas):** `enquetes.js` (sem
  dependência do rede.js): `enquete.fimEm` (publicação: 1 h/6 h/12 h/1 dia padrão ou personalizado até 7 dias a partir
  de quando aparece — agendada conta da data agendada; flash: até 24 h), `seletorDuracao`/`fimEscolhido`. Regras:
  `enqueteOk(e, inicio, maxMin)` (10090 min na publicação, 1450 no flash), voto só antes do fim e com `fimEm` igual ao
  da enquete (opcional, versão antiga não manda). `blocoEnquete` novo: selo do prazo ("Termina em 5 h"/"Encerrada"),
  bolinhas antes de votar, resultado final para todos depois do fim, troféu na mais votada, "Ver votos" do autor
  (`verVotosEnquete`, por opção). Resultado nas notificações (página com aba Enquetes + resultado na linha, sino,
  painel e número das páginas de categoria): dono = `usuarios.enquetes` [{a,p,o,f}] (`registrarEnquete`, ≤40);
  quem votou = `enquete_votos` uid==eu com `fimEm`; pergunta/opções do voto guardadas no aparelho (`hf-enq-info`,
  o flash some), resultado final guardado (`hf-enq-res`); `abrirResultadoEnquete` (folha) e
  `notificacoes.html?enquete=ALVO`. Teste `t-enquete2.mjs`; 11 partes em `_regras/`.
  Obs.: no teste, o painel do sino não carrega com duas abas do mesmo navegador (já era assim).
  **Enquete anônima e caixa de perguntas (mesmo PR):** `enquete.anonima` → voto em `enquete_anon/{alvo}_{uid}` (get só o
  próprio id, list só `uid == eu`) + contagem `enquete_contas/{alvo}` {n0..n3} que sobe +1 na MESMA gravação (writeBatch;
  regras conferem com getAfter); enquete_votos recusa enquete anônima; autor não tem "Ver votos". **Caixa de perguntas**
  (`diario.caixa`/`stories.caixa` = {pergunta, anonima, x?, y?}, `caixaOk`): `blocoCaixa` (quem vê escreve e envia; o autor
  vê "N respostas · ver" → `verRespostasCaixa`, apagar e Responder pelo Mensagens só se não for anônima);
  `caixa_respostas/{id}` {alvo,tipo,itemId,autorId,uid?,nome?,foto?,texto≤300,anonima,criadoEm}; anônima sem
  uid/nome/foto e com `caixa_autoria/{id}` {uid} (só a moderação lê). Compositor: botão Caixa de perguntas + chaves
  "Votação anônima"/"Respostas anônimas" (`linhaChave` em enquetes.js); Flash: figurinha "Perguntas" (`editarCaixa`,
  não vai desenhada; no visor `.story-cx`, digitar pausa). Notificações das respostas (tipo `caixa`, aba "Enquetes e
  perguntas", painel, sino). `limpar-contas.mjs` tira votos anônimos da contagem e apaga respostas/autorias.
  Teste `t-caixa.mjs`; 255 testes de regras.
- **Social etapa 3 – Flash completo (PR depois do #52, MUDA REGRAS — não publicadas):** respostas, reações, menções,
  enviar e repost vão como **cartão** no Mensagens (`msgFlash` em stories.js → `cartao: {tipo:"flash", acao:
  resposta|reacao|mencao|enviar|repost, flashId, autorId, nome, emoji?, texto?}`; `cartaoFlash` em mensagens.html lê
  `stories/{id}` e mostra a miniatura 9:16 enquanto o flash tem < 24 h, senão "Flash indisponível"; links com
  `target=_top` por causa da gaveta). Menção recebida: "Adicionar ao seu flash" (`feed.html?repostar=ID` →
  `repostarFlash` → `abrirCriador({ repost })` com a foto e o selo; grava `stories.repostDe {storyId, autorId, nome}`,
  regra `repostOk`: só quem foi mencionado e o original existe; autor recebe "Repostou o seu flash"; visor mostra
  "Flash de X"). Figurinha **Link do negócio** (`escolherNegocio`: seus negócios + busca em `negocios` limit 300;
  `stories.link {negocioId, nome, tipo, x, y}`, regra `linkFlashOk` com exists; no visor `.story-link` →
  `servicos.html?negocio=ID` etc.; não vai desenhada). Botão Enviar no topo do visor (`enviarFlash`). Abrir pelo link:
  `feed.html?flash=ID` (`abrirFlashPorId`). Regras do flash juntas em `extrasFlashOk` (estava perto do limite de 1.000:
  o emulador avisa o estouro só ao explicar recusas; teste "flash com TUDO junto" prova que a gravação máxima cabe).
  Teste `t-flash3.mjs`.
  **Flash nos perfis de negócio (mesmo PR):** no criador, "Publicar em" (só aparece se a pessoa tem negócio): Seu perfil
  e cada negócio dela (um, alguns ou todos; pelo menos um) → `stories.negocios` [uid_tipo] (≤4) e `perfil: false` quando
  é só nos negócios (regra `negociosFlashOk`: ids `^uid_(servicos|delivery|lojinha|imoveis)$` num regex só; perfil false
  exige negócios; o "Publicar em" fica num botão da barra de cima `.flash-onde` com o número de lugares e como 1º item
  das Figurinhas, e abre o painel `escolherDestinos` — embaixo empurrava o Compartilhar para fora da tela; a dica
  embaixo resume onde vai e também abre o painel). `perfil: false` não aparece no Diário nem no anel do perfil pessoal (só o dono vê). `flash-negocio.js`
  (sem rede.js): `flashesDoNegocio` (array-contains), `anelNegocio` (anel por box-shadow, cinza quando visto) e
  `abrirVisorNegocio` (visor leve com o nome do negócio, "por Fulano", Enviar mensagem, Ver quem postou, link). Ligado
  na foto do perfil do negócio (`abrirDetalhe` em vitrine.js) e nas bolinhas de negócio do perfil (usuarios.html).
  Visor normal mostra "Também no/Só no perfil de N negócios". **Configurações do Flash refeitas** (`abrirConfigFlash`,
  cartões `.cfg2-card`): Seus flashes agora (ver/novo), Quem vê (todos/amigos, Amigos próximos, Ocultar de), Onde publicar
  por padrão (`flashConfig.ondePerfil/ondeNegocios`, já vem marcado no "Publicar em"), Respostas, Câmera e vídeo
  (`cameraDireto`, `somVideo`), Salvar no aparelho e atalho de Menções (`configuracoes.html#diario`). "+" do Flash no
  perfil e no "Seu flash" do Diário: o mesmo degradê azul com brilho (pedido dele); foto do perfil e bolinhas de negócio com borda neutra sem flash
  (o anel azul/colorido parecia flash). Teste `t-flash-cfg.mjs`. Enquete: opções conferidas num regex só (`join('\n')`)
  para caber no limite. Teste `t-flash-neg.mjs`; 270 testes de regras.
- **Social etapa 4 – Explorar (PR depois do #54, sem regra nova):** `explorar.js` (saiu do feed.js; `abrirExplorar()`).
  Busca com abas Tudo | Pessoas | Negócios | Hashtags | Publicações (`#abasBusca`; negócios = 200 de `negocios` por
  `atualizadoEm` guardados 10 min e filtrados sem acento por nome/categoria/bairro/cidade/descrição; hashtags = prefixo
  nas 120 recentes + a exata contada no servidor, some se 0; publicações = legenda/tags/pergunta das 120 recentes),
  buscas recentes no aparelho (`hf-buscas`, ≤10, Enter ou abrir um resultado guarda). Em alta com "subindo" (metade+ do
  uso nas últimas 24 h), **Enquetes abertas** (`#secEnquetes`, as que terminam antes primeiro), **Negócios em {cidade}**
  (`chaveCidade`: "Florianópolis/SC" = "florianopolis"; < 3 na cidade = todos; selo Novo < 14 dias), sugestões com
  motivo (Segue você > Seguido por X via `minhaRede` exportada do rede.js > mesma cidade > ativo) e X para dispensar
  (`hf-sug-dispensados`), destaques com filtros Tudo/Fotos/Vídeos/Textos (`hf-explorar-filtro`) e "Ver mais". Teste
  `t-explorar.mjs`.
  **Tocar numa publicação do Explorar** (destaques e busca) abre a tela `.visor-exp` (estilo Instagram, z-index 4000,
  `history.pushState({hfVisorExp})`, voltar fecha): o cartão do Diário (`definirCartao(cartaoPost)` vindo do feed.js),
  a tocada em cima e as parecidas embaixo (`parecida`: hashtags, tipo, enquete, autor, gosto, engajamento, idade, já
  vista), 6 por vez com rolagem infinita; acabando as 120 recentes, busca as mais antigas (30 por vez, `startAfter`).
  Vistas dali gravam origem "principais" (as regras só aceitam a lista atual; "explorar" pediria regra nova).
  **Seu flash no Diário:** foto = abre os seus flashes direto; "+" = criador direto (o menu saiu).
- **Janelas do site (PR depois do #56, sem regra nova):** nenhum `confirm()`/`alert()` do navegador sobrou: tudo em
  `confirmarHF` / `avisoHF` (confirmar.js, `soOk`, ícones info/check/carrinho/recarregar/escudo/olhoOff), inclusive
  painel (`confirmarItem` agora é async). `campos.js` (ligado no firebase.js, todas as páginas): `<select>` e
  `<input type=time>` abrem painel do site (lista com busca se > 12 opções, sigla "(SC)" vira etiqueta; horário com
  rodas + atalhos) ouvindo pointerdown/touchend/click no documento; `data-nativo` mantém o nativo. "Baixar meus dados":
  escolher Relatório (HTML legível, `meus-dados.js` `relatorioHTML`: nomes no lugar dos uids, datas por extenso, fotos,
  conversas em balões, imprimir/PDF) ou JSON técnico. Teste `t-campos.mjs`.
- **Suporte refeito + reportes (mesmo PR #57, MUDA REGRAS — não publicadas; 12 partes, 289 testes):** suporte.html/js:
  atalhos (Novo chamado, Central, Denunciar pela busca → `abrirDenuncia` perfil, Contestar), abas Em andamento/Encerrados,
  protocolo `#` + 6 do id, assunto em cartões com dica (`CATS`), conversa com etapas Recebido→Em atendimento
  (`responsavel`)→Respondido→Encerrado, compositor embaixo, ⋯ Encerrar/Reabrir/Copiar protocolo/Reportar.
  `reportes/{atendimento|usuario}_{chamado}_{uid}` (motivo por regex; só `podeModerar` lê; quem reportou dá get);
  sem as regras novas o reporte do usuário vira chamado "denuncia". `suporte_notas/{chamado}` nota 1–5 uma vez, depois
  de encerrado. Painel: KPIs no Suporte (nota média), protocolo e nota no item, "Responder e encerrar", "Reportar à
  moderação"; Denúncias → botão "Reportes do suporte" (`filtroDen = "reportes"`, `reportesSuporte`), contador soma os
  reportes novos, Visão geral lista. Cartão de publicação no Mensagens refeito (`cartaoPublicacao`: autor + @ + tempo,
  selo Diário, proporção da foto, 1/N + bolinhas, play, texto/enquete com aspas, ★ média de `diario_notas`, legenda com
  nome em negrito, "Ver publicação →"; não pega a cor do balão). Teste `t-suporte2.mjs`.
- **Voltar + cartões + cobrança (PR depois do #57, sem regra nova):** `voltar.js` (ligado no firebase.js): cada camada
  aberta (`CAMADAS`: .folha.aberta, .hfc, .hf-confirma-fundo, .hf-den/.hf-aval/.ad-modal/.ad-gaveta-fundo, .story-visor,
  .fn-visor, .flash-criar, .hfe-fundo, .esc-lista, .vt-modal, .vt-local-fundo, .foto-grande) vira `history.state.hfCamadas`;
  voltar fecha a de cima ([data-fechar] ou Esc); fechar pela tela desfaz com `history.go`. `data-sem-voltar` fica de fora
  (o "Sair?" do confirmar.js usa `semVoltar`; a proteção só arma sem camada aberta). Abas viram passos: Diário/Explorar
  (`hfAbaFeed`), abas do perfil (`hfAbaPerfil`), seções do painel (hash, `porHistorico`). Cartões no Mensagens com
  `.bolha.cartao-msg.pub-msg/.flash-msg` (mais forte que `.minha .bolha`); flash refeito (miniatura 9:14 com borda em
  degradê, autor, horas restantes e barra, "Ver flash", emoji grande na reação, botão degradê na menção).
  "Cobrar resposta" (reclamações no painel) grava `admin_log` acao `cobrar_reclamacao` detalhe `queixa:ID` e mostra
  "Cobrado há X · Fulano" / "Cobrar de novo" (`lerCobrancas`). Teste `t-voltar.mjs`.
- **Avisos/comunicados, registro, suporte embutido, rosinha e capa (PR depois do #58, muda 1 regra — não publicada;
  12 partes, 291 testes):** `comunicados.js` (sem rede.js): `cartaoComunicado` (faixa do início e prévia no painel) e
  `janelaAvisos` (alerta/grave ao entrar, firebase.js; `data-sem-voltar`, bolinhas "1 de N", Responder/Entendi).
  Registro de ações: `alvoLegivel` ("suporte:ID" → "Chamado #ABC · assunto", denúncia, proposta, listas exportadas;
  no celular cada ação é um cartão `.ad-registro`). Suporte nas Mensagens (iframe): voltar.js vale em iframe do mesmo
  site; ajuda.html pode ser embutida (`html.embutido`, botão "Voltar ao suporte") e o link da Central abre dentro.
  Rosinha do duo: `duoCapa` clicavel (foto e nome) | foto (só a foto, `.sem-nome`) | **rosa** (só a rosinha, regra nova;
  sem ela o público grava "foto" e a conta guarda "rosa") | ocultar; nome menor (9,5 px). Editor da capa
  (`opcoesCapa` em usuarios.html): proporção medida da `.pf-capa` real e `op.marcas` (Sua foto / Nome e bio) +
  `escurecerBaixo` no editor-imagem.js. Testes `t-avisos.mjs`, `t-capa.mjs`.
- **Voltar no suporte embutido (PR depois do #59):** reserva no mensagens.html: no popstate, se o painel de suporte está
  aberto e o iframe tem janela aberta, chama `contentWindow.__hfFecharTopo()` (voltar.js) e põe o passo do painel de
  volta. suporte.js liga o voltar.js direto (não depende do firebase.js, que fica em cache no celular por não ter `?v`);
  `window.__hfVoltarLigado` evita duas cópias ligadas.
- **Registro de ações (mesmo PR #60):** `registrar(acao, alvo, detalhe, ref)` grava `ref` ("suporte:ID", "denuncias:ID")
  — a regra do admin_log não limita campos. `refDe` acha o item (ref, alvo "col:ID", ID da denúncia no detalhe ou, nos
  antigos, o chamado da pessoa com o mesmo assunto); `detalheLegivel` troca o ID da denúncia por "Denúncia de X" e a ação
  ("aviso enviado"...). Tocar na ação abre `detalheAcao` (quando, quem, alvo, detalhe + Abrir o chamado / Ver o conteúdo
  denunciado / Ver ficha). Textos longos quebram (`overflow-wrap: anywhere`).
- **Verificação do perfil (PR #61 mesclado; trava do selo no PR #62, MUDA REGRAS — não publicadas; 12 partes, 307 testes):** `verificacao.js`
  (`abrirVerificacao({aoMudar})` em Configurações e no perfil, `explicarSelo(nome)` ao tocar no selo): requisitos
  conferidos (e-mail, foto, nome e sobrenome, bio, conta ≥7 dias, sem sanção, "Resolver"), benefícios, pedido em 4 passos
  (tipo: pessoa/profissional/negócio/pública/organização; nome legal; documento RG/CNH/passaporte/RNE/CNPJ com foto JPEG
  ≤600 KB; até 3 links + motivo; declaração). `verificacoes/{uid}` {uid,categoria,nomeLegal,conhecidoComo,documentoTipo,
  documento,links,motivo,status pendente|em_analise|aprovada|recusada|cancelada,...}: só o dono e a moderação leem;
  o dono cancela (apaga a foto) e pede de novo se recusada/cancelada (cliente: 30 dias depois da recusa); a moderação
  decide e a foto do documento TEM que sair (deleteField) ao aprovar/recusar. Sem as regras novas: vai para
  `usuarios.verificacaoPedido` sem a foto. Telas: em análise (protocolo `#V`+5, etapas), verificado, não aprovado com
  motivo. Painel → Verificações refeito: KPIs, abas Esperando/Aprovadas/Não aprovadas, documento ampliável, conferências
  (nome do documento × perfil, idade da conta, denúncias, sanções, negócios, foto), motivos prontos de recusa, aviso
  automático, "Tirar o selo". **Só maiores de 18** (`dia18()` pela `usuarios.dataNascimento`; contas a partir de 16):
  requisito "Ter 18 anos ou mais" com a data em que poderá pedir + cartão `.vf-idade`; no painel, pedido de menor tem
  alerta `.ad-vf-alerta`, idade em vermelho, Aprovar travado e motivo "idade" pré-escolhido (aviso sem "30 dias"). A data
  do cadastro o dono pode mudar: a equipe confere a idade no documento (sem regra para isso).
  **Trava do selo (MUDA REGRAS; 321 testes):** `seloLiberado(uid)` em usuarios: moderação só põe `verificado: true` com
  `verificacoes/{uid}.status == 'aprovada'` (tirar é livre; `papel() == 'dono'` dá direto); perfis_publicos só aceita
  `verificado: true` se `usuarios/{uid}.verificado` já é true (função completa ali estourava 1.000 nas recusas — o
  emulador avisa 14× "1000 expressions" ao EXPLICAR recusas de perfis_publicos, inofensivo: teste "perfil público com
  TUDO junto" prova que a gravação máxima cabe). Moderação só decide pedido `pendente|em_analise`. Painel: `decidir`
  ANTES de `definirSelo` (que agora recebe detalhe para o registro); ficha: "Tirar selo" (moderação), "Dar selo direto"
  só para o dono (`darSeloDireto`: motivo `MOTIVOS_SELO` + como confirmou, obrigatório; bloqueia < 18), moderação vê
  "Ver pedido de verificação"; pedido antigo sem documento só o dono aprova. Teste `t-verif.mjs`.
- **Para o próximo chat (20/10/2026):** PRs #61 e #62 (verificação e trava do selo) mesclados. Regras com tudo desde
  13/10 (Diário, Flash, enquetes, suporte, verificação e trava do selo) **ainda não publicadas**: 12 partes em `_regras/`
  (321 testes). Depois de publicar: "Recalcular estrelas" no painel.
- **Aviso de manutenção (PR depois do #63, sem regra nova):** `manutencao.js` (importado pelo firebase.js, todas as
  páginas, também sem login): cartão fixo embaixo com X; fechado só volta em nova sessão ou com texto novo. Liga/desliga
  e texto em `ATIVO`/`TITULO`/`TEXTO`/`PREVISAO` no topo do arquivo (aumentar o `?v=` no firebase.js). Não bloqueia nada.
- **Meus negócios refeito (PR depois do #64, sem regra nova):** `negocios.css` (só nessa página) com as cores das
  classes da página inicial (servicos #00adee, delivery #ff7a1a, lojinha #b066ff, imoveis #2fbf71). Topo "Painel do
  anunciante" com 4 lugares (`ng-slot`, aceso quando criado); cartão do perfil com capa colorida, "No ar/Fora do ar",
  números (nota/avaliações/itens), **completude** (`completude(n)`: foto, descrição ≥40, WhatsApp, bairro + itens do
  tipo) com "Falta: ..." que abre o editor, Editar na cor do tipo, Vitrine e Compartilhar (`navigator.share`/copiar).
  Cartões de criar diferentes por tipo (`ng-novo`: foto da classe, chamada, 3 pontos, botão "Oferecer serviços"/"Abrir
  delivery"/"Montar lojinha"/"Anunciar imóveis"). Formulário: tipos em cartões (`pintarTipos`/`escolherTipo`),
  `#folhaNegocio[data-tipo]` pinta topo/Salvar/campos, placeholders por tipo (`phNome`/`phDesc`), avatar vazio com o
  ícone do tipo, WhatsApp formatado. Perfil: bolinha "Novo / negócio". Testes: `nav.mjs` desliga o manutencao.js.
- **Negócios: campos novos + estatísticas (PR depois do #65, MUDA REGRAS — não publicadas; 12 partes, 358 testes):**
  `negocios`: `instagram` (só o nome), `site`, `cnpj` (14 números, dígitos conferidos no cliente), `capa` (não no delivery,
  que usa fotos[0]), `semana` (7 textos "HH:MM-HH:MM" ou "", dom→sáb; ao salvar também preenche `dias`, `horaAbre/horaFecha`
  e `horario`) e `promocao` {titulo, texto, codigo A-Z0-9, ate ≤ 62 dias}. Regra `extrasNegocioOk` só confere o que mudou e
  Instagram+site+CNPJ num regex só (a gravação de vazio→completo estourava 1.000). Sem as regras: grava sem eles e guarda em
  `usuarios.negociosExtras[id]`; `sincronizarExtras` leva depois. Vitrine (`abrirDetalhe`): capa (`capaDe`), selo
  "Responsável verificado" + CNPJ, cartão da promoção com "copiar cupom", atalhos Instagram/Site/Como chegar (Google Maps,
  só com rua)/Compartilhar, horário por dia com "Aberto agora · fecha às" (`situacaoHorario`, vale p/ todos os tipos).
  **Estatísticas** (`estat-negocio.js`, sem rede.js): `neg_visitas/{neg}_{uid}_{dia}` (só a pessoa lê, inclusive inexistente)
  + `neg_stats/{neg}_{dia}` {negocioId, donoId, dia, v, o, h, a, it} que só o dono lê (lista por `donoId`); cada número sobe
  +1 na MESMA gravação da visita/ação (regras com getAfter; dia/hora de Brasília calculados na regra: `diaBR`/`horaBR`).
  Origem pelo `&de=` (explorar, inicio, flash, mensagens; sem = link), vitrine/busca, perfil. Ações: whats, mensagem,
  orcamento, pedido, rota, site, instagram, compartilhar, cupom, avaliar; itens `p_`+nome sem acento / `an_`+id.
  `insights-negocio.js` (`abrirInsightsNegocio`, `negocios.html?insights=ID`): KPIs com variação, gráfico dia a dia
  (anterior pontilhado), funil, ações, origens, mapa de calor dia×3 h, itens mais vistos, avaliações, dicas e Excel
  (`baixarPlanilhaMulti`, validado). Meus negócios: resumo de 30 dias no topo, faixa "Últimos 30 dias" em cada cartão e
  atalho; estatísticas do perfil (`insights.js`): seção "Seus negócios". `limpar-contas.mjs` apaga `neg_visitas`/`neg_stats`;
  "Baixar meus dados" lista as visitas. Testes `t-insights-neg.mjs`, `t-negocio-sem-regras.mjs`. Obs.: `t-enquete.mjs`
  já travava no main em `.cfgf-op` (config. antiga do Flash). O emulador às vezes não recarrega as regras: reinicie.
- **Para o próximo chat (20/10/2026, fim do dia):** PRs #64 (manutenção), #65 (Meus negócios), #66 (campos novos +
  estatísticas dos negócios) e #67 (testes atualizados) **mesclados**. Os 43 testes `_testes/t-*.mjs` passam com as regras
  do main (`t-flash3`/`t-voltar` às vezes falham com o emulador lento: rodar de novo). `nav.mjs` tem `garantirImagem()`.
  Regras com tudo desde 13/10 **ainda não publicadas**: 12 partes em `_regras/` (358 testes). Depois de publicar:
  "Recalcular estrelas" no painel. O aviso de manutenção (`manutencao.js`) está LIGADO (`ATIVO = true`).
  Dica: não usar `pkill -f` com nome de teste (mata o próprio shell); reiniciar o emulador se as regras parecerem velhas.
- **"Outra (escrever)" em cada tipo de negócio (PR depois do #67, muda 1 regra — não publicada; 12 partes, 360 testes):**
  Freelances (área "Outra", vale junto com as outras), Delivery e Shopping (categoria) gravam `negocios.categoriaPersonalizada`
  (já aceito nas regras do ar, ≤30); Imóveis grava `anuncios.categoriaPersonalizada` (regra nova; com as regras do ar grava
  sem ela e, sem título, usa "Chácara para aluguel" no título). `nomeCat(n, k)`/`chaveCat` em vitrine.js: tag, título e
  filtro próprio `c:Nome` (`chipsDinamicos` agora em todas as vitrines). Páginas da vitrine carregam
  `vitrine.js?tipo=X&v=N`: o `versoes.py` NÃO aumenta esse `v` (fazer à mão). Teste `t-outra-cat.mjs`.
- **Mesmo PR (#69): áreas, cupom, calendário e gavetas do chat (sem regra nova):** áreas dos Freelances em
  `GRUPOS_SERV` (vitrine.js: 7 grupos, ~27 áreas com palavras de busca `PALAVRAS_SERV`; chaves antigas valem; `beleza` =
  "Beleza e estética"); formulário `seletorAreas` (escolhidas em cima, a 1ª é a principal = `categoria`, até 6, busca sem
  acento, grupos `<details>`); vitrine cria filtro para cada área que tem alguém (`chipsDinamicos`); busca da vitrine sem
  acento. Cupom: `blocoCupom` no pedido (delivery/lojinha) e no orçamento (aplicado sozinho se a pessoa tocou em "Copiar",
  `hf-cupom-{neg}` no sessionStorage; promoção sem código entra sozinha); vai em `cartao.pedido.cupom` /
  `cartao.solicitacao.cupom` {codigo,titulo} (cartão é mapa livre nas regras) e no texto do WhatsApp; linha "Cupom" no
  cartão do chat; `prazoPromo` ("Faltam 3 dias"); selo `.vt-promo-tag` nos cartões; faixa `situacaoPromo` em Meus
  negócios (no ar / salva aguardando regras / encerrada). **Com as regras do ar a promoção fica guardada na conta e só
  aparece depois da publicação** (campo `promocao` é das regras não publicadas). `campos.js` agora troca também o
  `input[type=date]` (calendário `abrirData`: min/max, atalhos, ano → mês). Mensagens: faixa do atendimento abre a
  gaveta `abrirGavetaAtendimento`; segurar o nome do topo (`btnQuem`, 450 ms) abre `abrirPreviaPerfil` (negócios →
  `abrirDetalhe` do vitrine.js carregado sob demanda; pedido/orçamento vira o cartão pendente da conversa
  `usarCartaoNaConversa`); `.pv-fundo` está nas camadas do voltar.js. Testes `t-areas-cupom.mjs`, `t-previa.mjs`.
- **Mesmo PR (#69), parte 3 (sem regra nova):** cartão de pedido novo no chat (`cartaoPedido` em mensagens.html:
  número `#`+6 do id da mensagem, negócio, situação + etapas com nome `pd-passos`, itens com "ver todos", subtotal/entrega/
  cupom/total, entrega, pagamento, obs; negócio tem "Confirmar pedido"/"Marcar: próxima" + ⋯; cliente cancela só antes
  de confirmar; `mudarStatusPedido` publica o cartão de status de sempre); `pedido.prazo` ("30–45 min") gravado pela
  vitrine. Vitrines: botão **Filtros** (`FILTROS[TIPO]`, gaveta com contagem ao vivo "Ver N resultados", quartos e preço
  nos imóveis, `hf-filtros-{tipo}` no aparelho, etiquetas `#vtAtivos` com ×); Local + Filtros em cima e categorias
  embaixo. Início: filtro por tipo nos carrosséis (`filtroTipos`, `.hm-filtro`; revezar tem `_geracao`). Teste
  `t-pedido.mjs`, `t-filtros.mjs`. Hashtag hoje abre o Diário filtrado (`feed.html?tag=`); sugerido: página da tag no Explorar.
- **Mesmo PR (#69), parte 4:** prévia do perfil no chat com média das estrelas (`lerResumos` dos `neg_`), estrelas em
  cada negócio, selo "Perfil verificado" e @/cidade em chips; gaveta não seleciona texto. Clipe do chat = gaveta
  **Anexar** (`abrirAnexar`: Galeria, Câmera `#inputCamera capture`, Localização e Endereço vão para o campo de texto,
  Fazer pedido = prévia do perfil, cartão de cada negócio meu via `cartaoDeNegocio`). Teste `t-anexar.mjs`.
- **Anexos no suporte (PR #70, MUDA REGRA — não publicada; 12 partes, 368 testes):** `anexos-suporte.js` (sem rede.js,
  usado por suporte.js e admin-secoes.js): `suporte/{id}/mensagens.anexo` {tipo imagem|video|arquivo, url, nome}; foto
  reduzida para JPEG ≤700 KB no doc (ou Storage), vídeo só com Storage, PDF ≤500 KB no doc (20 MB com Storage); regra
  `anexoOk` (data:image/jpeg|application/pdf ou firebasestorage, ≤750000) e texto vazio só com anexo. Novo chamado: até 3
  anexos (mensagens depois do `inicio`); conversa: clipe `#chAnexar`; painel: "Anexar foto ou PDF" na resposta. Sem as
  regras: texto vai e o anexo avisa. Cabeçalhos (chat, equipe `.eq-topo`, suporte) com `user-select: none` (sem as
  "pinças" ao segurar). Teste `t-suporte-anexo.mjs`.
- **Localização no chat + teclado (PR depois do #70, sem regra nova):** Localização e Endereço do Anexar viram **cartão**
  (`cartao {tipo:"local", lat, lng, precisao, endereco}` / `{tipo:"endereco", endereco, linha2, lat?, lng?}`; `cartaoLocal`
  com mapa de azulejos do OpenStreetMap `mapaEstatico` (z16, sem chave, crédito "© OpenStreetMap"), "Como chegar" e
  "Copiar"; antes de enviar abre a gaveta com a prévia). Nome da rua (reverse) e ponto do endereço (search) pelo Nominatim
  só na hora de enviar. CSP do mensagens.html: img-src `tile.openstreetmap.org`, connect-src `nominatim.openstreetmap.org`.
  Localização antiga em texto ("📍 Minha localização: https://maps.google.com/?q=...") é desenhada como cartão.
  **Teclado escondia o campo:** todos os .html com `interactive-widget=resizes-content` no viewport; no mensagens.html a
  `.app` usa `var(--vv)` (altura do visualViewport quando o teclado abre, reserva p/ Safari). No teste os azulejos e o
  Nominatim são simulados (`ctx.route`), a rede daqui bloqueia o OpenStreetMap. Teste `t-anexar.mjs`.
- **Perto de você (mesmo PR da localização no chat, MUDA REGRA — não publicada; 12 partes, 373 testes):** `perto.js` (sem
  rede.js): posição da pessoa = GPS só no aparelho (`hf-perto`, arredondado 3 casas, vale 12 h, `pedirLocalizacao`) ou o centro
  da cidade do perfil (`minhaPosicao(perfil)`); posição das coisas = `geo {lat,lng}` (ponto do endereço) ou o centro da
  cidade pelo `cidadeIbge`/nome (`geo-cidades.json`, 5.571 municípios, gerado por `scripts/geo/gerar-geo-cidades.py` da base
  kelvins/municipios-brasileiros, MIT); `comDistancia` põe `_km`/`_aprox`; `textoDistancia` ("3,4 km", "Na sua cidade").
  `negocios.geo`/`anuncios.geo` (regra `geoOk`: só lat/lng no Brasil) gravados ao salvar (`pontoDoEndereco` → `geocodificar`
  no Nominatim, reaproveita se o endereço não mudou); sem as regras: negócio guarda em `negociosExtras` (`NOVOS_NEG`), anúncio
  grava sem (lista do `gravarComLocal`). Vitrines: `seloDist` nos cartões, ordem "Mais perto" (pede o GPS se não tem
  posição), Filtros → Distância (2–50 km, "Usar minha localização"). Início: seção `#secPerto` (até 60 km, filtro por tipo,
  botão `#pertoLoc`). Explorar: "Perto de você" no lugar de "Negócios em {cidade}" quando há posição + "Publicações perto de
  você" (`#secPostsPerto`, autores até 50 km pela cidade do perfil). CSP do negocios.html: connect-src Nominatim. Teste `t-perto.mjs`.
- **Local nas publicações, publicação no Flash e planos dos negócios (PR depois do #71, MUDA REGRAS — não publicadas;
  13 partes, 402 testes):** compositor do Diário com "Adicionar local" (`escolherLocal` no rede.js: busca no Nominatim
  `countrycodes=br`, "Usar minha localização atual" arredondada 2 casas, cidade do perfil, recentes `hf-locais`) →
  `diario.local {nome, lat, lng}` (regra `localPubOk`: no Brasil); no cartão `.local-post` abre `feed.html?local=lat,lng&n=`
  (`buscarLocal`: 200 recentes, mesmo nome ou ≤3 km); Explorar "Publicações perto" usa o local (≤30 km) antes da cidade do
  autor. CSP do feed/usuarios: connect-src Nominatim. **Publicação no Flash** (como o Instagram, recurso próprio):
  Compartilhar → "Adicionar ao seu flash" (`compartilharNoFlash` em stories.js: `imagemDaPublicacao` desenha o cartão
  com autor, local, foto e legenda em 1080×1920; vídeo não) → `stories.postDe {postId, autorId, nome}` (regra `postFlashOk`
  dentro de `extrasFlashOk`: post existe, autor confere, e `pref_publicas.permiteFlash != false`); visor com "Ver publicação
  de X" (`.story-post` → `usuarios.html?post=`). Configurações: "Permitir compartilhar no Flash" (`permiteFlash`).
  **Planos** (`planos.js`, sem rede.js): Grátis e **Pro R$ 39,90/mês** (`PRECO_PRO`, `PERIODOS` 1/3/6/12, `BENEFICIOS`),
  pagamento por **Pix manual**: `planos_pedidos/{id}` {uid,nome,email,plano:"pro",meses,valor,txid,status pendente} (a
  pessoa cria/cancela; `podeComercial()` = dono/comercial marca pago/recusado) e `planos/{uid}` {plano, ate, meses, pedidoId,
  ativadoEm, ativadoPor} (todos leem; só comercial/dono grava). **`PIX.chave` está VAZIA**: sem ela o pedido é criado e a
  tela diz que a equipe manda a chave pelo Suporte; com ela sai o copia e cola (BR Code com CRC16, `codigoPix`) e o QR
  (`qrcode-gerador.js`, qrcode-generator 1.4.4 MIT). Meus negócios: `#planoBox` (Grátis / aguardando o Pix / Pro até...),
  `negocios.html?planos=1`. Pro: selo `seloPro()` nos cartões (`nomeComSelo`) e no detalhe (`.vd-selo-pro`), primeiro na
  ordem padrão das vitrines (`proPrimeiro`, `planosDonos` lido em `carregarDonos`), no Perto de você do início conta 40% mais
  perto (`_pro`), 90 dias e Excel nas estatísticas do negócio (no Grátis aparecem com "PRO" e abrem os planos), chamados
  do suporte sobem na fila do painel (`proSup`, selo "PRO · prioridade"). Painel → **Planos** (`S.planos`): KPIs, Esperando/
  Ativos/Histórico, "Confirmar pagamento e ativar" (writeBatch pedido pago + planos; soma a partir do `ate` atual; aviso
  para a pessoa; registro `plano_ativar`), "Recusar" (motivo + aviso), "Encerrar o Pro agora". `.pl-fundo` no voltar.js.
  Testes `t-local-flash.mjs`, `t-planos.mjs`.
- **3 planos pagos, negociação e permissões de dono (PR depois do #72, MUDA REGRAS — não publicadas; 13 partes, 437 testes):**
  `planos.js`: `PLANOS` plus R$ 29,90 (nível 1: selo + 90 dias/Excel) · pro R$ 39,90 (nível 2: + destaque nas vitrines/Perto,
  suporte prioritário) · premium R$ 59,90 (nível 3: topo de tudo, Perto ×0,5) — preços do Pro/Premium escolhidos por mim,
  ele só disse "plano 1 = 29,90, 3 planos"; Grátis ele vai repensar. `nivelPlano`, `ehPago` (≥1), `ehPro` (≥2), `seloPlano`
  (PLUS/PRO/PREMIUM com cor), `diasRestantes`/`textoFalta`, `creditoDias` (troca de plano: dias que sobram viram dias do
  novo na proporção do preço), `cartaoStatus` ("faltam N dias" + barra, laranja ≤7 dias, vencido até 30 dias). Gaveta:
  cartões dos 3 planos, tabela Grátis|Plus|Pro|Premium com a coluna escolhida, bloco "Não dá para pagar agora?" →
  **condição especial (baixa renda) ou parceria** em `planos_negociacoes/{uid}` {uid,nome,email,tipo apoio|parceria,plano,
  valorProposto,contato,mensagem,status novo} (pessoa cancela; pede de novo só depois de decidido). Meus negócios: "Faltam N
  dias" + barra. **Só donos** (`donoDoSite()` nas regras, `pode("dono")` no painel, `SO_DONO` em admin.js, botões
  `data-so-dono`): Planos e receita (abas Esperando | Negociações | Ativos | Histórico | Receita; aprovar negociação =
  writeBatch negociação + planos com `negociacaoId`; receita = Pix pagos + `valorAcordado`) e **Registro e histórico**
  (aba "Por pessoa (dia)": cartão de cada membro com nº de ações, horário e tipos; linha do tempo do dia, dia anterior/
  calendário, Excel; lê `admin_log` por intervalo de `em`). `admin_log` só o dono lê (resto da equipe: só
  `acao == cobrar_reclamacao`). Painel grava "entrou" 1×/dia por pessoa (`marcarEntrada`). Comercial perdeu os planos.
  Teste `t-planos.mjs` (duas abas no mesmo navegador travam o Firestore do teste: usar outro `navegador()`).
- **Sem plano Grátis + 30 dias grátis (PR depois do #73, MUDA 1 REGRA — não publicada; 13 partes, 446 testes):** pedido dele:
  "tire o grátis, 30 dias grátis para cada plano no primeiro acesso" → interpretado como UM teste por conta, no plano que a
  pessoa escolher. `planos.js`: `DIAS_TESTE`, `testeDisponivel` (planos/{uid} não existe), `comecarTeste` (a pessoa grava
  `{plano, teste: true, meses: 1, ate: agora+30d}`; regra: só create, ate entre +29 e +31 dias), `emTeste`; tabela sem a
  coluna Grátis (`c3`); botão verde `.pl-teste` "Começar 30 dias grátis no X"; no teste, assinar soma depois do fim do
  teste (`creditoDias` devolve os dias restantes). Meus negócios: "Comece com 30 dias grátis" / "Teste grátis do X" /
  "Sem plano ativo". Painel: selo TESTE GRÁTIS nos ativos, teste fora da receita recorrente. Textos de divulgação
  ("Anunciar grátis") viraram "30 dias grátis". **Ainda não feito:** o que acontece com o negócio sem plano depois do
  teste (hoje continua aparecendo, só sem selo/destaque) — perguntar a ele.
  **Mesmo PR (#74): descontos e prova de baixa renda (MUDA REGRA; 454 testes):** `PERIODOS` [meses, nome, desconto]
  3 meses 10%, 6 meses 15%, 12 meses 20% (escolhidos por mim), `valorPeriodo(k, m)`/`descontoDe(m)`; cartões dos períodos
  com selo "-10%", preço riscado e "R$ X por mês", `.pl-economia`; painel mostra "(10% de desconto)". Condição especial:
  `DOCS_RENDA` (CadÚnico, Bolsa Família, BPC/LOAS, CTPS/CNIS, comprovante de renda até 2 SM, seguro-desemprego, Tarifa
  Social, DASN-SIMEI, isento do IR, "mando depois") → `comprovanteTipo`, `declaracao: true` e `comprovante` {tipo imagem|
  arquivo, url data:/Storage ≤750000, nome} via `prepararAnexo` (anexos-suporte.js). Regra: apoio exige declaração e tipo;
  parceria não leva comprovante; dono só decide (aprovado/recusado) APAGANDO o `comprovante` (deleteField); cancelar também
  apaga. Painel: `.ad-neg-prova` com o documento.
  Segunda opção virou **"Parceria ou negociação"** (tipo continua `parceria`; aberta a qualquer pessoa: outro valor, prazo,
  troca ou parceria; "A gente aceita negociar"), sem comprovante de renda. Registro: "Aprovou negociação de plano".
- **Saúde e Comunidade (PR depois do #74, MUDA REGRAS — não publicadas; 14 partes, 500 testes):** 2 tipos novos.
  **Saúde** (`tipo: "saude"`, cor #0fb5a6, `saude.html`, `vitrine.js?tipo=saude`): `saude-dados.js` (profissões com
  conselho CRM/COREN/CRP/CRMV/CRO/CREFITO/CRN/CRFa/CRF/CREF, especialidades, modalidades, convênios, `textoRegistro`,
  `AVISO_EMERGENCIA`); `negocios.saude` {profissao, profissaoOutra, registro, registroUf, rqe, especialidades,
  modalidades, valorConsulta, duracao, particular, convenios, publico, idiomas, formacao, acessivel} (regra `saudeOk`
  num regex só com `string()` para bool/número — o "TUDO junto" estava no limite de 1.000; `textoAte`/`listaAte` agora
  leem o campo 1× com `get`). Detalhe com registro + "Conferir no CRP" e aviso 192/193; `abrirAgendamento` vira cartão
  `solicitacao.saude` no chat ("Pedido de agendamento"). **Comunidade** (`comunidade.html/js/css`, cor #e5487f, coleção
  `comunidade`: doacao/troca/pedido/quarto/achados, 60 dias e renovar): aviso fixo "proibido vender ou cobrar", regra
  recusa "vend*"/"R$" (fora do rateio do quarto), denúncia com motivo `venda`. **Banimento de programa**
  `programa_banidos/{uid}_{tipo}` (`banidoDoPrograma` na regra; painel: ficha e denúncia → `banirPrograma` em
  admin-base.js, esconde o conteúdo e manda aviso grave). Classes do topo agora 6 (3 por linha no celular). Telefone
  da negociação formatado (`formatarTelefone` em planos.js). Capas `saude.svg`/`comunidade.svg` são ilustrações
  (dá para trocar por foto). Teste `t-saude-comunidade.mjs`.
  Pergunta em aberto para ele: criar negócio sem plano e o que acontece depois do teste grátis.
- **Saúde e Comunidade em todas as páginas (PR depois do #75, sem regra nova):** rodapés "Explorar", atalhos do
  Diário/Explorar (`feed.html`, 3 colunas a partir de 700 px), cartões em Sobre/Clientes/Profissionais (`info.css`
  `--c-saude/--c-comunidade`), Ajuda (FAQ de Saúde, Comunidade e "Quanto custa anunciar?" com os planos), filtro Saúde
  em Reclamações, `acesso.js` (login volta para saude/comunidade), link "Ver" do painel para Saúde e textos que listavam
  só os 4 tipos. #75 (Saúde e Comunidade) mesclado e no ar; as regras ainda não publicadas (14 partes).
- **Verificação geral, otimização nacional e Storage engatilhado (PR depois do #76, sem regra do Firestore nova):**
  57 testes `t-*.mjs` rodados (falhas eram testes desatualizados: Registro abre em "Por pessoa", 6 atalhos, Saúde no
  perfil; `t-negocio-sem-regras` precisa de `saida/antigas.rules` = `git show ebf49e8:firestore.rules`).
  **Storage pronto para ligar:** `const USAR_STORAGE = false` no `firebase.js` (ligado: carrega o SDK do Storage com
  top-level await ANTES de `window.firebaseAuth`, as páginas já conferem `window.firebaseStorage`); `storage.rules` (pastas
  fotosPerfil, fotosCapa, negocios, anuncios, diario, stories, comunidade, mensagens [participantes via firestore.get],
  suporte, negociacoes [só donos]); nomes únicos `_<ts36>` + `cacheControl` 1 ano (`salvarImagem` no rede.js);
  `armazenamento.js` (`subirFoto`, usado pela Comunidade); foto do chat reduzida a 1600 px JPEG antes de subir;
  `limpar-contas.mjs` apaga os arquivos da conta. Passo a passo: `_regras/STORAGE-LEIA-ME.md`. Testes: `testes-storage.mjs`
  (47, emulador Storage 9199; o `emulador.sh` agora sobe firestore+auth+storage) e `STORAGE=1 node t-storage.mjs` (nav.mjs
  liga a chave, aponta o emulador e, só no teste, aceita `http://127.0.0.1:9199` nos filtros de foto; regras do Firestore
  trocadas por uma cópia que aceita o link do emulador e voltam no fim). Lembrete agendado para 26/10 (trig_0125yEkm2exoQLsnzU4hmT8s).
  **Nacional:** textos sem "de Florianópolis" (marca continua Help Floripa, "Nasceu em Floripa"; Termos citam todo o
  Brasil — avisar o dono); `fuso.js` (`relogioDe(uf)`, `ufDe`): "Aberto agora" e atendimento no relógio do estado do
  negócio (AC/AM/RR/RO/MT/MS); vitrines com Estado/Cidade buscam no servidor (`filtroServidor`, índices tipo+uf/cidadeIbge+
  atualizadoEm em `firestore.indexes.json` e `_regras/INDICES-LEIA-ME.md`; sem índice cai na busca geral) + a busca geral na
  1ª página (perfis antigos sem uf), sem repetidos. Teste `t-nacional.mjs`.
  **Leveza:** `planos-base.js` (preços/nível/selo/lerPlano) separado do `planos.js` (gaveta): vitrines e início não baixam a
  gaveta (~45 KB); cartões das classes com `*-480.webp`; ponte e propagandas do início com `srcset` `*-800.webp`.
- **Nacional etapa 1 – busca nacional, Diário por região e _config.yml (PR depois do #76, MUDA REGRAS — não publicadas;
  14 partes, 509 testes):** pedido dele: fazer a lista "o que falta para o nível nacional" (etapas: 1 busca+região+_config,
  2 otimização Diário/perfil/Mensagens, 3 mapa/endereços com mais capacidade que o Nominatim, 4 Pix automático, 5 material
  para o que não é programação). `_config.yml` (Jekyll exclui firestore.rules, storage.rules, indexes, README, LICENSE,
  scripts/; conferido com `jekyll build` 3.10: mesmas páginas, byte a byte). `busca.js` (sem deps): `termosBusca` (palavras
  sem acento + começos a partir de 3 letras, ≤15 letras, ≤100 termos), `buscarNoServidor` (array-contains da palavra mais
  longa + filtros, confere o resto na tela), `combina`. Campo `busca` em negocios/anuncios/comunidade (regras `listaAte('busca',
  100)`; "negócio com TUDO junto" + busca cabe); gravado ao salvar (`buscaDoNegocio`/`buscaDoAnuncio` em negocios.js;
  NOVOS_NEG inclui busca), preenchido sozinho quando o dono abre Meus negócios (`completarBusca`) e em lote pelo workflow
  manual "Preencher busca" (`scripts/limpeza/preencher-busca.mjs`, simula por padrão). Explorar junta os 200 recentes + a
  busca no servidor (+ publicações com a #palavra); vitrines `buscarNaVitrine` (debounce 400 ms, ?q= também) e `incorporar`;
  Comunidade idem. **Região:** `diario.autorUf/autorIbge` gravados ao publicar (sem as regras: publica sem, sem aviso);
  `regiao.js` (`postsDoEstado` = autorUf + criadoEm, índice novo; `pesoRegiao` cidade ×1,6, estado ×1,25) em Principais,
  Em alta e Destaques. 5 índices em `_regras/INDICES-LEIA-ME.md`. Teste `t-busca-regiao.mjs`.
  **Mesmo PR: primeira assinatura +30 dias grátis (pedido dele, substitui o teste sem pagar):** `primeiraAssinatura` (planos/{uid} sem
  pedidoId/negociacaoId; erro de leitura = mostra a oferta), `DIAS_BONUS`; gaveta com `.pl-bonus` no topo, "+30 dias grátis" em cada
  período, resumo "3 meses + 30 dias grátis, até ...", lembrete na tela do Pix; painel `primeiraPaga` soma 30 dias ao "Confirmar
  pagamento" (aviso e registro dizem); regra de a pessoa criar o próprio plano (teste) REMOVIDA. Textos "Começar/Anunciar grátis"
  viraram "Criar perfil"/"Anunciar no Help Floripa"; Termos seção 6 reescrita (planos, preços, bônus, Pix sem renovação automática,
  arrependimento de 7 dias do CDC — pedir revisão do advogado) e FAQ. Registro: fileira de pessoas em "Todas as ações" (foto, nome,
  número; filtra), foto+nome em cada ação, "Ver tudo de Fulano" na linha do tempo do dia (`quemRegistro`).
  Painel: `logo-icone.png` (ícone da ponte recortado do logo.png) no lugar do "HF". Topos de Profissionais, Clientes, Sócios e
  Sobre no padrão da Ajuda (`hero-info sem-foto`, sem foto); "Sua vitrine profissional, de graça" virou "para todo o Brasil".
- **Suporte em nível nacional (PR depois do #77, MUDA REGRAS — não publicadas; 14 partes, 527 testes):** `suporte-fila.js`
  (sem dependências): `FILAS` (setores pela categoria: Segurança golpe/denuncia, Moderação contestacao, Pagamentos, Negócios,
  Conta, Geral), `PRIORIDADES` urgente 2 h (golpe) / alta 8 h (pagamento, contestação ou plano nível ≥2) / normal 24 h,
  `prazoDe` (SLA da 1ª resposta a partir de `criadoEm`), `situacaoPrazo`, `ordemFila` (atrasados → prioridade → prazo),
  `textoPrevisao`, `MAX_ABERTOS = 3`. Usuário (suporte.js): selo "Prioridade X · responde em até N h" antes de enviar
  (`#supPrevisao`), **respostas da Central** pelo que escreve (`#supSugestoes`: lê `ajuda.html`, raízes de 5 letras, ≥2 iguais,
  top 3; "Resolveu, não preciso do chamado" fecha e conta em `hf-sup-resolvidos`), máximo 3 chamados em andamento, chamado
  grava `prioridade` (sem as regras: grava sem), previsão na conversa. Painel (admin-secoes.js `suporte`): KPIs Na fila/Prazo
  estourado/Urgentes/1ª resposta média/Comigo/Nota, **"Pegar o próximo da fila"** (`pegarProximo`: lê os abertos do servidor e
  trava com `runTransaction`, pula o que já tem responsável), chips das filas, filtros Sem responsável/Prazo estourado/Escalados
  para mim, "Atendimento da equipe hoje" (`.ad-sup-ritmo`), selos de prioridade/fila/prazo. No chamado: **notas internas**
  (`suporte/{id}/notas`, só a equipe), **Transferir / prioridade** e **Escalar** (`escalonadoPara` moderacao|donos; registro
  `suporte_fila`), `primeiraRespostaEm` na 1ª resposta (`atualizarChamado`, com reserva sem as regras), **respostas prontas da
  equipe** (`suporte_respostas`, grupo "Da equipe" no seletor; "Salvar como resposta pronta"). admin.js carrega também todos os
  abertos (até 2000). Import do suporte-fila no admin-secoes: `PRIORIDADES as PRIO_SUP` (já existe `PRIORIDADES` das tarefas).
  Teste `t-suporte-nacional.mjs` (fecha os chamados abertos de outros testes durante o teste e reabre no fim; `t-etapa4` precisa
  do `seed.mjs` antes, sempre foi assim).
- **Chat da equipe por canais + logo + busca do celular (PR depois do #78, MUDA REGRAS — não publicadas; 14 partes, 550 testes):**
  `equipe-canais.js` (sem deps): `CANAIS` avisos (só donos escrevem) · seguranca · moderacao · pagamentos · negocios · conta ·
  comercial (cor, desc, `fila` do suporte-fila, `papeis` padrão); Geral = o grupo antigo (`equipe_chat`, conv "equipe"). Conversa
  de canal = `"canal-<id>"` (sem "_"); mensagens em `equipe_canais/{id}/mensagens` + resumo `equipe_canais/{id}` {ultimaEm,
  ultimaTexto, ultimoAutor, ultimoNome, mencoes} (regra `canalEquipeOk`; anexos/apagadas aceitam `canal-`). Quem é de cada canal:
  `meusCanais(papel, usuarios.equipeCanais {entrou, saiu, silenciados})` (dono = todos); "Outros canais" na lista com "Entrar";
  ⋯ Silenciar/Sair; não lidas por canal no aparelho (`hf-canais-visto-<uid>`, admin.js escuta só os 7 resumos). Abas Individual |
  Canais. **Situação** `equipe_presenca.status` disponivel|pausa|fora (`C.meuStatus`, `C.mudarStatus`, `C.statusDe`; sem a regra a
  presença vai sem o campo): bolinha amarela/vazada, "Passar para…" desativa quem está fora, Suporte mostra quantos estão
  disponíveis e "Pegar o próximo" volta para Disponível. **Encerrar meu turno** (`encerrarTurno` em admin-chat.js): devolve os
  chamados (opcional), resumo no Geral com os protocolos, fica Fora. **#PROTOCOLO** no texto vira cartão (`cartoesChamado`, abre
  por `C.abrirChamado`). Transferir/escalar postam no canal do setor (`postarNaConversa`; escalar para donos = Geral com @);
  "Enviar para a equipe" no chamado (canal ou pessoa). Logo do painel = `logo-app-96.webp` (imagem que ele mandou, recortada;
  `logo-app.png` 192 px é o apple-touch-icon do painel; `logo-icone.png` saiu). Busca do topo no celular (≤900 px): só a lupa
  `#btBuscaCel`, abre o campo por cima da barra (`.ad-topo.buscando`, × fecha). Teste `t-equipe-canais.mjs`.
- **Para o próximo chat (22/10/2026):** PRs #76 a #79 **mesclados** (otimização nacional, busca/região, suporte nacional,
  canais da equipe + logo WebP + lupa do celular). Regras com tudo desde 13/10 **ainda não publicadas**: 14 partes em
  `_regras/` (550 testes). Depois de publicar: "Recalcular estrelas" no painel e criar os 5 índices (`_regras/INDICES-LEIA-ME.md`).
  Etapas que ainda faltam da lista nacional: 2) otimização do Diário, perfil e Mensagens; 3) mapa/endereços com mais capacidade
  que o Nominatim; 4) Pix automático (Mercado Pago, precisa do Blaze); 5) material do que não é programação (advogado, regras de
  publicidade dos conselhos de saúde, roteiro de teste no celular). Storage: lembrete em 26/10 (trig_0125yEkm2exoQLsnzU4hmT8s).
  Respondido por ele (22/10): os 30 dias grátis são só para quem ASSINA (primeira assinatura: dias do período pago + 30 de
  bônus; depois segue normal, renovando pelo preço do plano). É o que já está feito (`primeiraAssinatura`/`DIAS_BONUS`). Emulador: depois que o contêiner reinicia, subir de novo
  (`setsid nohup ./emulador.sh` e `setsid nohup node servidor-csp.mjs`) e rodar `node seed.mjs`.
- **Menu lateral nacional (PR depois do #80, sem regra nova):** `menu.js` com seções Explorar (+ "Perto de você" →
  `index.html#secPerto`, inicio.js rola até a seção depois de carregar), Minha conta ("Feed" virou "Diário"), Para quem
  anuncia (Meus negócios, Planos `negocios.html?planos=1`, Como anunciar), Ajuda e suporte (Central, Meus chamados,
  Reclamações, Contato), Help Floripa; itens aceitam texto pequeno (6º campo); faixa "Em todo o Brasil" + ano automático.
  Contato: chamado em destaque, horário de Brasília, prazos da 1ª resposta, formulário com Cidade/UF e "Enviar como
  chamado" → `suporte.html?categoria=&assunto=&texto=` (suporte.js preenche). Ajuda: grupo "Em todo o Brasil".
  Textos nacionais em Clientes, Profissionais, Sócios (proposta pelo formulário `#sproposta`) e Sobre. Teste `t-menu-nacional.mjs`.
  **Mesmo PR, parte 2 (estilo das grandes redes):** páginas novas `seguranca.html` (Central de Segurança: temas, sinais de
  golpe, ferramentas, dicas, "fui vítima" com MED do Pix/B.O./SaferNet, telefones 190/192/193/180/100/188) e `diretrizes.html`
  (Diretrizes da Comunidade no layout dos Termos, 9 seções). NÃO estão em `PAGINAS_LIVRES` (firebase.js): perguntar ao dono.
  `.nav-inst` (barra fixa com as 10 páginas institucionais, gerada igual em todas) e componentes no info.css (v=6):
  `.faixa-numeros`, `.topicos`, `.populares`, `.linha-tempo`, `.casos`, `.emergencia`, `.planos-mini`, `.mais-recursos`.
  Ajuda: "Navegue por tema", "Mais procuradas" (`#p-...` abre a pergunta), grupos novos Diário/Flash e Planos. Sobre: números +
  "Nossa história". Contato: "Qual é o seu caso?" (9 casos, imprensa/LGPD/jurídico pelo e-mail). Para negócios: planos + perguntas.
  Rodapés com Central de Segurança e Diretrizes. Teste `t-paginas-inst.mjs`.
  **Parte 3 (canais como as grandes redes):** atendimento só pelo chamado. WhatsApp (48 99684-9431) só no cartão
  `contato.html#acesso` "Não consegue entrar na conta?" (mensagem pronta; link "Não consigo entrar" no rodapé do login e na
  pergunta de senha da Ajuda). Formulário do Contato só "Enviar como chamado" (sem nome; Parcerias vai para Sócios). E-mail só
  para imprensa, LGPD e jurídico (mesmo endereço, assuntos diferentes). Instagram no rodapé das páginas e do menu, "sem
  atendimento por mensagem direta". WhatsApp saiu da Ajuda, Sócios e Termos.
  Menu: abre na rolagem em que estava (`hf-gaveta-rolagem` no sessionStorage) e garante a página atual à vista; o foco no X
  usa `preventScroll` (era ele que puxava o menu para o topo). Segurança e Diretrizes entraram em `PAGINAS_LIVRES` (contas
  suspensas/desativadas leem); as páginas institucionais não usam auth-guard, já abriam sem login.
- **Início nacional (PR depois do #83, sem regra nova):** `local-escolhido.js` (sem rede.js): "Você está em ..." no lugar
  da legenda da ponte (`#localBtn`, estilo "Entregar em"), folha `escolherLocal` (GPS, cidade do perfil, Todo o Brasil,
  Estado/Cidade; `.vt-local-fundo` para o voltar.js). Grava em `hf-busca-local` (MESMA chave do "Onde procurar" das vitrines)
  e recarrega a página; escolha manual chama `esquecerPosicao()`. `perto.js` `minhaPosicao`: GPS → cidade escolhida → perfil
  (`escolhida: true`). Início: buscas populares por área (`POPULARES`), destaques/novos/imóveis com a cidade escolhida
  primeiro e títulos "em Florianópolis/SC", "Cidades em destaque" (`#secCidades`, ≥2 cidades), faixa "Negocie com
  segurança", título da página e textos nacionais. Teste `t-inicio-nacional.mjs`.
- **Sino atualizado (mesmo PR do início nacional, sem regra nova):** `avisos-agrupar.js` (sem deps): estrelas na mesma
  publicação e seguidores viram uma linha ("Ana, Bruno e mais 3 deram estrelas · média 4,7"), seções Novas/Hoje/Ontem/
  Últimos 7 dias/Últimos 30 dias/Anteriores — no painel do sino e em notificacoes.html. Tipos novos: `avaliacao` (nota 3–5 no
  negócio ou "avaliou você como cliente", vem da mesma leitura de `buscarReclamacoes`/`ouvirReclamacoes`) e `plano`
  (`avisoPlano` em planos-base.js: 7, 3 e 1 dia(s) antes e até 15 dias depois de vencer). Aba "Reclamações" virou "Negócios".
  Painel: miniatura da publicação, "Seguir de volta" (cache `seguindo-<uid>` do leituras.js), estrelas/comentários/marcações
  abrem `usuarios.html?post=`. Número do sino (categoria.js e rede.js) conta plano e avaliações. Teste `t-sino.mjs`
  (`FIRESTORE_EMULATOR_HOST=127.0.0.1:8085`). `t-enquete2.mjs` falha também sem estas mudanças (ambiente).
- **Notificações profissionais (mesmo PR #84, sem regra nova):** `avisos-lista.js` (sem rede.js) desenha a lista no painel do
  sino E em notificacoes.html (`criarLista({raiz, uid, ganchos})`; ganchos: abrir, botaoSeguir, responderVinculo, salvarPrefs,
  marcarTodasVistas, miniatura, extra). Barra "Todas | Não lidas" + ✓✓ + ⚙, filtros por categoria (`CATEGORIAS`: mensagens,
  publicacoes, seguidores, enquetes, social, negocios, suporte), "Pedidos do social · N" no topo, linha com etiqueta do tipo,
  prévia, botões de ação, miniatura e menu ⋯ (lida/não lida, remover, desativar a categoria). Lidas/removidas no aparelho
  (`hf-notif-<uid>`; ids iguais no painel e na página: s_, c_, m_, r_, e_, k_, x_). Preferências `usuarios.prefNotif`
  ({categoria:false}; suporte sempre ligado), evento `hf:prefs-notif`; categoria.js e rede.js (`contarNovos`) não contam o que
  foi desligado. painel-avisos.js só carrega os dados e cuida da gaveta. Testes `t-sino.mjs` (24 verificações), `t-etapa4.mjs`
  atualizado (`.nt2-item`).
- **Ajustes do sino e das abas (PR depois do #84, sem regra nova):** reclamação já respondida (`respondida` em
  avisos-reclamacoes.js: resposta em `reclamacoes/{id}.texto` ou `queixas.resposta`) mostra "Respondida" e "Ver sua resposta"
  (sem o botão azul); suporte/aviso só ficam com botão azul enquanto não lidos ("Ler aviso" → "Ver aviso"); prévia corta em
  3 linhas no `span` de dentro (antes a 3ª linha aparecia pela metade). Abas `.nav-inst` no estilo das centrais de ajuda: só
  texto, sublinhado na atual, nomes curtos (Ajuda, Clientes, Negócios), categoria.js põe as abas num `.nav-inst-trilho` (barra
  sólida, esmaece só as abas nas bordas: `.tem-esq/.tem-dir`) e centraliza a aba atual; no computador ficam centralizadas.
- **Sobre com a história (mesmo PR #85):** sobre.html ganhou "Por que a Help Floripa existe" (os dois lados), "Como funciona"
  (intermediadora, sem vínculo, preço combinado), "Nossa história" detalhada (2025 ideia/ecossistema/marca; 2026 plataforma,
  rede social, Saúde e Comunidade; Hoje "Pronta para crescer"), "Como a Help Floripa se sustenta" (grátis para quem procura,
  planos para negócios, Comunidade grátis, dados não vendidos) e "Nada inventado". Hero manteve "para todo o Brasil" (área de
  atuação ainda em aberto). Nada privado na página (R$ 50 mil, Finep, cofundador, comissão). Foto do menu lateral com borda
  neutra (`.gaveta-avatar`; anel colorido só para quem tem flash).
- **Análise de capacidade (22/10/2026, pedida por ele — ainda NÃO pronto para fluxo grande):** plano Spark (50 mil
  leituras e 20 mil gravações/dia para o site todo); por abertura: Início ~175 leituras, Diário ~250–400 (120 posts + seguidos +
  estado + resumos + comentários), Explorar ~560 → algumas centenas de pessoas ativas/dia esgotam a cota. Fotos em `data:`
  dentro dos docs (até 900 KB; `USAR_STORAGE = false`) pesam em cada leitura. Cada post visto = 1 gravação (`marcarVista`) e
  cada visita a negócio = 2 (`neg_visitas` + `neg_stats`). Contadores num doc só (`diario_notas`, `enquete_contas`, `neg_stats`)
  aguentam ~1 gravação/s cada. `RECAPTCHA_V3_SITE_KEY` vazio (sem App Check), regras e 5 índices não publicados (sem índice a
  vitrine cai em `limit(300)`), Nominatim/azulejos do OSM não aceitam uso pesado, GitHub Pages ~100 GB/mês. Ordem sugerida:
  publicar regras+índices → Blaze com alerta de orçamento → Storage → App Check → enxugar leituras (Diário/Explorar/Início,
  vistas em lote, contadores divididos) → mapa/endereços com provedor pago → Cloudflare Pages → teste de carga.
- **Leituras enxutas (passo 5 da análise, PR depois do #86, sem regra nova):** medidor `_testes/proxy-contador.mjs` +
  `carga-seed.mjs` + `t-leituras.mjs`. `RECENTES_PAIS = 60` (regiao.js; eram 120) na MESMA consulta/chave do Diário e do
  Explorar; `postsDoEstado` 30; seguidos 20 por lote; comentários contados nas 20 melhores; Principais com "Ver mais"
  (`buscarPrincipais(true)`: próximas 60 mais antigas com `startAfter`, `ordenarPrincipais`). `lerResumosEstrelas` usa o
  cache "r:" de 5 min (só `comResumo`). Explorar lê os negócios do início (`inicio-negocios`, 60; eram 200). `minhaRede`
  guardada 6 h em `hf-rede-<uid>` (ponte 150 por consulta; não guarda se falhar). Resultado com a carga: sessão de 8
  páginas 1.342 → 699 leituras, 7,65 → 4,21 MB; Diário 500 → 320 (2ª visita 178 → 39); Explorar 710 → 414 (198 → 36).
  Contadores num doc só NÃO foram divididos: o SDK já repete gravação recusada por disputa; dividir exige reescrever
  `contaCerta`/`resumoJunto` nas regras (perto do limite de 1.000) — só se uma publicação/negócio passar de ~1 gravação/s.
  `t-busca-regiao` já falhava no main (2 itens), igual antes e depois.
- **Estimativa de gasto (22/10/2026, dada a ele):** base 700 leituras + 30 gravações por pessoa ativa/dia (medido no
  t-leituras), Firestore US$ 0,03–0,06/100 mil leituras (região simples × multirregião; região do projeto NÃO conferida),
  Storage 100 GB/mês de download grátis e depois ~US$ 0,12/GB, App Check (reCAPTCHA) 10 mil avaliações grátis/mês, US$ 8 até
  100 mil, depois US$ 1/mil — recomendar validade do token de 3–7 dias no console. Mapas: uso leve (geocodificar ao salvar/
  marcar local, azulejos nos cartões do chat); Mapbox ou LocationIQ cabem no grátis até ~5 mil ativos/dia. Totais: 500
  ativos/dia ≈ US$ 3–15/mês; 5 mil ≈ US$ 95–130; 50 mil ≈ US$ 1.200–2.500. Ele vai ligar Storage + App Check na semana de
  26/10 e escolher o serviço de mapas.
- **Enquetes para muita gente (PR depois do #87, MUDA REGRAS — não publicadas; 15 partes, 561 testes):** contagem em 10
  pedaços `enquete_contas/{alvo}_{fatia}` {n0..n3} para enquete pública E anônima: o voto leva `fatia` (0–9, `sortearFatia`)
  e o pedaço sobe +1 na MESMA gravação (writeBatch; regra `fatiaSobe(d)` nos dois votos; `enquete_contas/{cid}` só aceita id
  `^[df]_id_[0-9]$` com o voto da pessoa sendo criado agora, na fatia dele). Documento único antigo (`enquete_contas/{alvo}`)
  e voto sem fatia são recusados (nada disso estava no ar). `enquetes.js`: `FATIAS`, `lerContasEnquete` (consulta
  `documentId in` os 10 ids, soma; guardado 90 s em `hf-enq-contas`; o autor sempre lê na hora), `contarVotos` usa os pedaços.
  `blocoEnquete` (pedido dele, 22/10): as % só aparecem para o AUTOR (sempre, lido na hora) e para os outros quando a
  enquete ACABA (`precisaContas` = autor || encerrada || votou numa enquete antiga sem fim); quem votou vê a escolha marcada
  e "Voto registrado · resultado em <data>". Encerrada lê `resultadoFinal` (guardado de vez em `hf-enq-res`).
  Votar ou passar pela enquete não lê a contagem. "Ver votos": números pela contagem + "Mostrando as N pessoas mais recentes"
  (lista até 300). `limpar-contas.mjs` desconta o pedaço do voto (público e anônimo). Teste `t-enquete-escala.mjs`
  (FS_PORTA=8086, medidor conta `contagensPor` coleção). `t-caixa` (para em `.notif`) e `t-enquete2` (notificação do Bruno)
  falham igual no código de antes.
- **Enquete no Flash (PR depois do #88, sem regra nova):** "Adicionar ao seu flash" de publicação com enquete:
  `imagemDaPublicacao` (stories.js) desenha o cartão com selo ENQUETE, prazo ("Termina em"/"Encerrada"), pergunta e opções;
  com resultado (barras, %, 🏆 na mais votada, "Resultado final · N votos") quando a enquete acabou, ou "Parcial" quando quem
  compartilha é o autor (`resultadoParaCartao`); senão "Toque em “Ver publicação” para votar". Layout cabe entre y=250 e
  1690 (`TOPO`/`MAXH`): com enquete a foto vai até 3:4 e a legenda encolhe para 1 linha se faltar espaço; texto sem foto em
  letra grande. Imagens com limite de 4 s (`carregarImg(url, limite)`; antes uma foto lenta travava o "Preparando...") e
  carregadas junto com o resultado (`Promise.all`); desfoque do fundo por miniatura 54×96 esticada (sem `ctx.filter`).
  Selo do criador "Enquete de X". Teste `t-enquete-flash.mjs` (CPU 6× mais lenta: 0,9–1,8 s).
- **Publicações no Flash + compositor (PR depois do #89, sem regra nova):** pedido dele: os outros tipos no Flash no mesmo
  modelo da enquete (o Diário NÃO muda). `imagemDaPublicacao` em blocos: cabeçalho (foto, nome, "local ou Diário · data",
  marca HELP FLORIPA), foto com "1/N" + bolinhas quando tem várias, só texto = cartão de citação (aspas, letra 56→40 até
  caber), legenda, bloco ENQUETE ou CAIXA DE PERGUNTAS (`caixaBloco`, campo "Escreva sua resposta…", pílula "Anônima"),
  estrelas embaixo quando há notas (`lerResumosEstrelas`), rodapé em 1 linha (letra encolhe). Selo do criador por tipo.
  **Nova publicação:** a barra de 8 ícones + contador passava da largura no celular (a folha escorregava para o lado);
  agora `.pub-campo` (contador dentro, campo cresce até 45% da tela), selo "Publicando no Diário" e grade 4 colunas
  "Adicionar à publicação" (`.pub-ferr` com ícone + nome; `.ativo` em Enquete, Perguntas, Marcar, Local, Agendar).
  Testes `t-enquete-flash.mjs` (6 tipos), `t-compositor.mjs` (360/390 px e computador, sem passar da largura).
  **Diário no mesmo modelo (pedido dele depois):** só texto ≤500 sem foto/enquete/caixa = `.post-texto.citacao` (feed.js; caixa
  com aspas, letra 18 px, "ver mais" com 7 linhas); enquete e caixa de perguntas no Diário com o MESMO bloco (fundo
  accent 7% sobre `--panel-2`, borda accent 20%, opções/campo em pílula com borda); a caixa perdeu o degradê laranja/roxo
  (o visor do Flash `.escura` continua branco). Cores pelas variáveis do tema: no escuro ficam os tons escuros do site.
- **Salvos no mesmo modelo (PR depois do #90, sem regra nova):** `miniModelo(post, autor)` em usuarios.html (só quando
  `desenharGrade(..., { salvo: true })`; a grade do perfil não mudou): enquete = selo ENQUETE + pergunta (2 linhas) + até 2
  opções em pílula com bolinha ("+N opções"); caixa = selo PERGUNTAS + pergunta + campo "Escreva sua resposta…"; texto =
  citação (aspas azuis à direita, abaixo do marcador). Fundo accent 7% sobre `--panel-2` (cores do tema). Foto com
  enquete/caixa ganha o selo `.sv-tipo`. Capas das coleções: texto em `.col-cel.txt.mm-capa` (sem as cores sortidas do
  `tomDoTexto`). CSS `.mm*` no fim do rede.css.
- **Regras publicadas por ele em 26/10/2026** (tudo desde 13/10: as 15 partes de `_regras/`, 561 testes). Os "não
  publicadas" acima valem só como histórico. Conferir com ele: "Recalcular estrelas" no painel e os 5 índices
  (`_regras/INDICES-LEIA-ME.md`). Daqui em diante, regra nova volta a precisar de publicação manual.
- **Sem plano = 1 perfil no ar + Comunidade no "Tipo de perfil" (PR depois do #92, MUDA 1 REGRA — não publicada; 15 partes,
  565 testes):** decidido por ele (26/10): sem plano ativo o negócio "aparece com tudo, menos extras" e só UM perfil fica no
  ar; quando o plano vence, faz "como as outras plataformas" (3 dias de tolerância, depois perde os extras; nada é apagado).
  `planos-base.js`: `TOLERANCIA_DIAS = 3` (`nivelPlano` vale até `ate` + 3 dias; `emTolerancia`, `fimComTolerancia`),
  `negocioPausado(n, plano)` (= `n.principal` ≠ tipo do perfil e sem plano; anúncio `imovel` conta como `imoveis`),
  `semPausados(fb, lista)` (lê o plano só de quem tem outro principal). Campo novo `negocios.principal` (tipo escolhido,
  gravado em TODOS os perfis do dono; regra em `extrasNegocioOk`; sem a regra grava sem ele = nada pausa). Meus negócios:
  `principalEscolhido()` (`usuarios.negocioPrincipal` → o marcado → o mais antigo), `sincronizarPrincipal()` ao abrir,
  selo "Pausado" (laranja) + aviso "Deixar este no ar"/"Ver planos" (`deixarNoAr`), criar outro sem plano pergunta antes,
  promoção sem plano = "Promoção salva" (não aparece). Extras só com plano: promoção/cupom (`promoAtiva` em vitrine.js
  confere `planosDonos`; detalhe pinta a promoção depois de ler o plano, `.vd-promo-lugar`), flash nos negócios
  (`flashesDoNegocio` e o "Publicar em" do stories.js), selo/destaque/90 dias (já eram). Pausado some de: vitrines (+ link
  direto avisa "pausado no momento"), início, Explorar (recentes e busca), bolinhas de negócio do perfil, prévia do chat
  (mensagens.html, que também tira a promoção sem plano). Cache de 10 min das listas: a troca demora até 10 min para quem visita.
  "Tipo de perfil": cartão Comunidade (link `comunidade.html?novo=doacao`, tracejado, não é perfil). Textos: tabela de
  benefícios, Ajuda ("Quanto custa anunciar?"), Termos seção 6, aviso do sino do plano. Teste `t-pausado.mjs`; `t-areas-cupom`,
  `t-pedido`, `t-previa` dão plano ao Bruno; `t-negocios` aceita o aviso. Chromium aqui: `CHROMIUM=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.
- **Grátis "Forte", Plus atraente, verificação para anunciar e punição por má-fé (26/10/2026, mesmo PR #92, MUDA 1 REGRA a
  mais — não publicada; 15 partes, 570 testes):** decidido por ele: perfil grátis (sem plano) = 1 perfil no ar, até 3 itens
  (`LIMITES_GRATIS` em planos-base.js), 1 foto, 1 anúncio de imóvel (o mais antigo), sem capa, sem Instagram/site, sem pedidos/
  orçamentos/agendamentos pelo site (só chat e WhatsApp), sem estatísticas, sem promoção, sem flash. Nada é apagado: a vitrine
  mostra `versaoGratis(n)` (vitrine.js `comLimites`, lê o plano antes de abrir o detalhe) e o editor marca o excedente com "PLUS"
  (`notaPlus`, `.so-plano`). Promoção só nos planos e NUNCA em Saúde (`promoAtiva`, editor esconde `#negPromo`). Ordem padrão:
  Premium > Pro > Plus > grátis (`destaqueDe = nível`; Perto do início: Plus ×0,85). Gaveta dos planos: coluna Grátis
  (`BENEFICIOS` = [nome, grátis, plus, pro, premium], valores true/false/texto, `.pl-tabela.c4`) e topo que muda com o plano
  tocado (`pintarHero`: `PLANOS[k].titulo/pitch`, `DESTAQUES_PLANO`, preço do mês e "≈ R$ X por dia", cor do plano).
  **Para anunciar a conta precisa ser verificada** (regra `contaVerificada()` no create de negocios e anuncios; `exigirVerificacao`
  em negocios.js; aviso `#ngVerif` com prazo **30/11/2026** para quem já anuncia). Painel → Verificações: "Anunciantes sem
  verificação" (tira do ar com `ocultoAte` = 2999-11-30, data-marca; `voltarNegociosVerificados` devolve ao aprovar) e
  conferência "mesmo nome no documento em outra conta". Ficha: "Contas ligadas" (`contasLigadas`: mesmo WhatsApp/CNPJ nos
  negócios, telefone, nomeLegal) e **"Punir má-fé (anunciar)"** (`punirMaFe`, `NIVEIS_MA_FE`: 1ª vez = 5 programas banidos
  30 dias + negócios/anúncios escondidos + tira o selo + aviso grave; reincidência = banidos sem prazo + suspensão 30 dias;
  documento falso/golpe/3ª vez = banimento; motivo começa com "Má-fé ao anunciar", que o nível sugerido procura; pode aplicar
  às contas ligadas). Termos (seção 6), Diretrizes (seções 4 e 8) e Ajuda atualizados. Seed: Bruno verificado (o `t-verif`
  tira no começo). Teste `t-gratis-plus.mjs`.
- **Capa no cartão, avaliação automática, tempo de resposta e link curto + QR (26/10/2026, PRs #94 e seguinte, sem regra
  nova):** Meus negócios: o cartão usa `n.capa` (antes ignorava; sem plano, etiqueta "PLUS · Capa visível com plano").
  **Avaliação automática** (mensagens.html): pedido marcado "Entregue" pelo negócio manda o cartão de avaliação sozinho
  (`avaliacaoAoConcluir` → `pedirAvaliacao(n, titulo, aviso)`); orçamento/agendamento recebido tem o botão "Serviço/Atendimento
  concluído · pedir avaliação" (`.orc-concluir`, só para quem recebeu; uma vez: `avaliacaoJaPedida(desde)`). **Tempo de
  resposta** (já calculado em `perfis_publicos.atendimento.resposta {media (min), n}` pelo `registrarTempoResposta`): vitrine
  `respostaDe`/`tempoResposta`, selo `.vt-rapido` "Responde rápido" nos cartões (≤60 min, n≥3) e `.vd-selo-resp` no perfil.
  **Link curto**: `helpfloripa.com.br/@nick` (perfil) e `/@nick/servicos|delivery|loja|imoveis|saude` → 404.html (script no
  `<head>`) → `link.html` (lê `nicknames/{nick}`, que é público, e redireciona). Meus negócios: botão do cartão abre
  "Link e QR Code" (`abrirLinkQr`: copiar, compartilhar, QR com qrcode-gerador.js e arte 1080×1350 para imprimir; sem @ usa o
  link longo e avisa). `servidor-csp.mjs` agora devolve o 404.html (status 404) como o GitHub Pages. Teste
  `t-perfil-negocio.mjs`; `t-pedido` confere a avaliação ao entregar.
- **QR no WhatsApp, cartão de Pix no chat, avaliações sem comentários (26/10/2026, PR depois do #94, sem regra nova):**
  `qr.js` (sem deps): `qrSvg`, `desenharQr`, `artePerfil` (PNG 1080×1350 preto/#111, brilho e anel na cor do tipo, foto ou
  iniciais, nome, etiqueta, QR em cartão branco, link) e `compartilharPerfil` (manda a ARTE como arquivo + texto com o link
  via `navigator.share({files})`, assim o WhatsApp recebe a imagem; sem suporte a arquivo manda só o texto; sem share copia).
  Usado no Compartilhar do Meus negócios ("Enviar com o QR") e do detalhe da vitrine (link curto `/@nick/tipo`).
  `pix.js` (sem deps): `codigoPix` (BR Code, `descricao` no campo 02) e `tipoChavePix` (e-mail/aleatória/celular +55/CPF/CNPJ);
  planos.js usa ele. **Cartão de Pix no chat** (Anexar → Pix, `abrirCartaoPix`): `cartao {tipo:"pix", chave, tipoChave, nome,
  cidade, valor|null, descricao}` (cartão é mapa livre nas regras); `cartaoPix`: valor ou "Valor a combinar", Copiar código
  Pix / Copiar chave / QR Code e o aviso de conferir o nome no banco (o site não intermedia). Chave guardada em
  `usuarios.pix`. Folha das avaliações (`abrirDetalhamento`) sem "Comentários recentes" (pedido dele: o que o cliente diz
  fica só nas Reclamações). Cartão Comunidade do "Tipo de perfil" sem a setinha. Teste `t-pix-qr.mjs`.
- **Chave Pix do Help Floripa (27/10/2026):** conta PJ no Mercado Pago no CNPJ (atividade "marketing e publicidade", CNAE do
  MEI = promotor de vendas). `PIX.chave = "61935934000100"` (planos-base.js): o pedido do plano mostra QR + copia e cola;
  a confirmação continua MANUAL no painel. Próximo: Pix automático + cartão (Mercado Pago Checkout Bricks + Cloud Functions
  com webhook) — espera o Blaze; Access Token só como segredo do Firebase, nunca no site/repositório.
  27/10: aplicação "Help Floripa" criada no Mercado Pago Developers (Pagamentos online, desenvolvimento próprio, URL
  https://helpfloripa.com.br, **Checkout Bricks**). **Public Key de TESTE: `TEST-1855e5db-1f54-4020-a318-98f3f6187f73`**
  (pública, pode ir no site). Credenciais de produção ainda NÃO ativadas (ativar só depois dos testes). Combinado: fazer o
  pagamento automático em 28/10 (Pix + cartão crédito/débito pelo Payment Brick, Cloud Functions criar pagamento + webhook
  que ativa `planos/{uid}`). Falta ele: ligar o Blaze com alerta de orçamento. Guardado no stash: texto do passo 2 do Pix
  ("Como o Help Floripa é MEI, o banco mostra o nome do responsável") — ele não respondeu se quer.
- **Pagamento automático (27/10/2026, mesmo PR #96, sem regra nova):** `functions/` (Cloud Functions v2, Node 22, região
  southamerica-east1; `firebase.json`/`.firebaserc` na raiz, excluídos do Jekyll no `_config.yml`; o predeploy copia o
  `planos-base.js` para `functions/` — preço vem SEMPRE dele). `pagamentos.js`: `criarApi`, `corpoPix` (QR do MP, 24 h,
  guardado em `planos_pedidos.mpPix`), `corpoCartao` (token do Card Payment Brick, à vista, `statement_descriptor`
  HELPFLORIPA), `confirmarPagamento` (transação: só "approved" + BRL + valor certo; pedido pago `decididoPor:"mercadopago"`,
  `metodo` pix|cartao, `mp` {id,status,detalhe}; `planos/{uid}` igual ao painel com `fimDoPlano` + bônus da 1ª assinatura;
  aviso; `admin_log` plano_ativar `porNome` "Mercado Pago (automático)"), `assinaturaOk` (x-signature HMAC). `index.js`:
  `pagarPlano` (onCall; dono do pedido, pendente) e `webhookMercadoPago` (onRequest; confere a assinatura e SEMPRE consulta
  `/v1/payments/{id}` com o token). Segredos `MP_ACCESS_TOKEN`/`MP_WEBHOOK_SECRET` (Secret Manager). Site: `PAGAMENTO`
  {automatico:false, publicKey, regiao} em planos-base.js; `automatico:true` → `mostrarPix` vira abas Pix | Cartão
  (`chamarPagamento`, `carregarSdkMp` sdk.mercadopago.com/js/v2, `bricks().create("cardPayment")`, `ouvirPedido` onSnapshot
  → "Pagamento aprovado!"); se a função não responde, cai no Pix manual (`mostrarPixManual`). CSP do negocios.html libera
  *.mercadopago.com/*.mlstatic.com/*.mercadolibre/livre e a URL das funções. Painel: `nomeEquipe("mercadopago")`, "· Pix/cartão".
  Testes: `FUNCOES=1 ./emulador.sh` (sobe as Functions, `funcoes` → ../functions, escreve `.secret.local`/`.env.local`) +
  `node mp-falso.mjs` (Mercado Pago de mentira, porta 5099) → `t-pagamento.mjs` (24). Passo a passo dele:
  `_regras/PAGAMENTO-LEIA-ME.md` (Blaze, webhook no MP, Cloud Shell: secrets + deploy). Depois do deploy: virar `automatico: true`;
  na produção trocar `publicKey` pela APP_USR-.
- **Negociação depois do grátis (27/10/2026, PR #98, MUDA REGRAS — não publicadas; 15 partes, 586 testes):** Pix: passo 2
  explica que o banco mostra o nome do responsável (MEI). Formulário da condição especial/parceria: aviso "já pode ficar no ar
  de graça" (`.pl-neg-gratis`), "Quantos perfis no ar?" e "Por quanto tempo?" (`planos_negociacoes.perfisPedidos` 1–5,
  `mesesPedidos` 1–12; sem as regras vai sem eles), documentos de renda recolhidos no celular (4 + "mando depois" +
  "Ver outros documentos"), "Fulano, da equipe, está cuidando do seu pedido" (`responsavelNome`, só o 1º nome).
  Painel → Negociações: `seloResp`/`controlesResp` (só donos, `membros`), "Precisa de N perfis · Por N meses · Tem: ...".
  Aprovar: tempo em dias (7/15 dias, 1–12 meses ou "Até uma data", `seCampo` no `modal`), **perfis no ar** (`tipo: "multi"`
  no `modal`; todos = sem lista), **esconder o selo** e **responsável**. Grava `planos.{dias, tipos, semSelo}` e
  `planos_negociacoes.{dias, tipos, semSelo, responsavel, responsavelNome}` (sem as regras grava sem eles e avisa).
  `planos-base.js`: `perfisDoPlano`, `mostraSelo`, `NOMES_PERFIL`/`TIPOS_PERFIL`; `negocioPausado` também pausa perfil fora de
  `planos.tipos` (principal nunca pausa); vitrine/início escondem o selo com `semSelo`. Ativos: "Ajustar tempo, perfis e selo"
  (`ajustarPlano`, registro `plano_ajustar`, aviso se mudou prazo/perfis). Teste `t-negociacao.mjs`.
- **Baixa renda R$ 15 fixo + comprovante obrigatório + pagamento no chat (27/10/2026, PR depois do #98, MUDA REGRA — não
  publicada; 15 partes, 588 testes):** pedido dele: condição especial = valor fixo `BAIXA_RENDA` {plano "plus", preco 15}
  (planos.js; escolhido por mim o Plus — confirmar com ele). Formulário de baixa renda sem escolher plano/valor (`.pl-fixo`).
  "Mando o documento depois" SAIU: regra exige `comprovante` na baixa renda e tira "depois" do regex (`nomeDocRenda("depois")`
  = "Ia mandar depois (pedido antigo)"). Painel: "Baixa renda · Plus por R$ 15/mês", valor sugerido 15 × meses. Meus negócios:
  "Criar mesmo assim" virou "Criar pausado". Mensagens: ⋯ → "Configurações de pagamento" (`abrirConfigPagamento`: chave Pix
  em `usuarios.pix`, tipo da chave na hora, remover). Testes `t-config-pix.mjs`, `t-negociacao.mjs`, `t-planos.mjs`.
- **Baixa renda 50% + formulário refeito + selfie na verificação (27/10/2026, PR depois do #99, MUDA REGRAS — não
  publicadas; 15 partes, 594 testes):** decidido por ele: baixa renda = **50% em qualquer plano** (`BAIXA_RENDA {desconto: 0.5}`,
  `precoBaixaRenda(k)`: Plus 14,95 · Pro 19,95 · Premium 29,95), com tudo o que o plano oferece; perguntas de perfis/meses
  SAÍRAM do formulário (painel ainda escolhe tempo/perfis/selo ao aprovar). Formulário refeito "mais vivo": caminhos em
  cartões com degradê (`.pl-tipo` verde/roxo), passos numerados (`.pl-passo`), cartões dos planos na cor de cada um
  (`.pl-pn`, `--cor`, preço cheio riscado + -50%), botão no degradê do caminho; o "R$ 15 fixo" anterior foi trocado.
  **Selfie segurando o documento** na verificação (`verificacoes.selfie`, JPEG ≤450000, obrigatória; documento reduzido
  para ~470 KB e selfie ~360 KB para caber no limite de 1 MB do doc; `capture="user"`; dicas; apagada junto com o documento
  ao cancelar/aprovar/recusar). Painel mostra a selfie ao lado do documento. Ajuda e Termos citam a selfie. Testes
  `t-negociacao`, `t-planos`, `t-verif`.
- **Painel do anunciante e atalhos da negociação (27/10/2026, PR depois do #100, sem regra nova):** 6 lugares sempre 3 + 3
  (também no computador): cada um com ícone em degradê da cor da classe e pílula "+ Criar"/"No ar"/"Pausado" (laranja);
  criado = cartão aceso no degradê. Cartão do plano no celular: ícone + texto em cima e botão inteiro embaixo.
  "Não dá para pagar agora?": os 2 botões viraram os cartões coloridos `.pl-tipo.on.pl-atalho` com seta. Baixa renda ganhou
  "Por quanto tempo" (1/3/6/12 meses, sempre 50%, sem somar o desconto do período; `mesesPedidos`; painel sugere preço × meses
  e a duração). Aviso "Proibido vender" da Comunidade em amarelo (sumia no tema claro). **Estatísticas sem plano:**
  `negocios.html?insights=ID` abria antes de ler o plano (`garantirPlano()` agora); estatísticas do perfil (`insights.js`)
  mostram "Seus negócios" sem números e com PLUS (levam aos planos). Testes `t-estat-gratis.mjs`, `t-negociacao`.
- **Ligações de voz e vídeo (27/10/2026, PR depois do #101, MUDA REGRAS — não publicadas; 15 partes, 614 testes):**
  `chamadas.js` (sem rede.js; WebRTC 1 a 1): sinalização em `chamadas/{id}` {de, para, conv, tipo audio|video, status
  chamando|aceita|recusada|cancelada|perdida|encerrada, oferta, resposta, criadoEm, aceitaEm, fimEm, encerradaPor} +
  `candidatos/{auto}` {de, c, em}. Regras: só entre os 2 de uma conversa que existe (`conv` = ids em ordem), sem bloqueio;
  quem recebe atende com a resposta; qualquer um encerra; nada se apaga. `ICE.stun` Google/Cloudflare (grátis);
  **`ICE.turn` vazio**: sem TURN, parte das ligações em 4G/rede de empresa não conecta ("A rede não deixou conectar") —
  contratar Cloudflare TURN (credencial gerada por Cloud Function, precisa do Blaze). `ouvirChamadas(uid)` ligado no
  firebase.js (tela de chamada em qualquer página, campainha WebAudio + vibração, 45 s = perdida, ocupado = recusa).
  Chat: botões Vídeo e Ligar no topo (no celular a lupa sai do topo, fica no ⋯), cartão `cartao {tipo:"chamada", modo,
  resultado, duracao}` (NÃO usar `status` no cartão: colide com o cartão de status de pedido) com "Ligar de novo/Retornar".
  Tocar com o site fechado (notificação) ainda NÃO: precisa de push (FCM + Cloud Function, Blaze). Teste `t-ligacao.mjs`.
  Site ainda sem `manifest.webmanifest`/service worker (para virar app: PWABuilder/TWA ou Capacitor — perguntar a ele).
- **App (PWA) + ligações no chat da equipe (27/10/2026, mesmo PR das ligações):** `manifest.webmanifest` (nome, start_url
  `index.html?origem=app`, standalone, fundo #000, atalhos Mensagens/Diário/Meus negócios/Notificações), ícones novos sem os
  cantos brancos `icone-192/512.png` e `icone-maskable-192/512.png` (feitos do android-chrome-512, fundo #011a38 com brilho
  ciano), `<link rel="manifest">` em todas as páginas, `sw.js` (páginas sempre da rede, `offline.html` estilizada sem
  internet; só guarda ícones/offline — nunca JS, para não prender versão velha; registrado no firebase.js só em https).
  Chat da equipe: Vídeo e Ligar nas conversas individuais (`equipe_dm`; regra aceita conversas OU equipe_dm), registro
  "📞 Ligação de voz · N s" como mensagem. Música livre: a rede daqui bloqueia FreePD/Incompetech, não deu para baixar e
  conferir licenças — deixado de lado (combinado com ele).
  **Imagens novas dele (27/10):** ícone só da ponte com neon azul → `icone-192/512`, `icone-maskable-*` (arte em ~72%),
  `apple-touch-icon.png`, `android-chrome-*`, `favicon*` (fundo preto); ícone com o nome → `icone-nome-512.png` (reserva);
  logo deitada com a frase → `logo-horizontal.png` (tela offline, `mix-blend-mode: lighten` some com o retângulo preto).
  Bolinha do Google (busca): `favicon-48x48`/`favicon-96x96`/`favicon-192x192.png` feitos do maskable (cabem no círculo),
  `<link rel="icon" sizes="96x96">` em todas as páginas; o Google só troca quando passar de novo pelo site.
- **Saúde e Comunidade no Início e no Explorar (27/10/2026, PR depois do #102, sem regra nova):** `comunidade-cartao.js`
  (sem deps: `CAT_COM`, `comunidadeNoAr` = disponível + não oculto + ≤60 dias, `lerComunidade` 40 por `atualizadoEm` com cache
  "inicio-comunidade" 10 min, `cartaoComunidade` `.cm-mini` com foto ou emoji na cor do tipo + selo De graça/rateio/Perdido/
  Encontrado, `filtrosComunidade`). Início: `#secSaude` (consulta própria `tipo == saude`, cache "inicio-saude", sem pausados,
  cidade escolhida primeiro) e `#secComunidade` (filtro por tipo, aviso amarelo "Proibido vender ou cobrar", "Ver tudo").
  Explorar: `#secComunidade` (cidade da pessoa primeiro) e aba "Comunidade" na busca (recentes + `buscarNoServidor`).
  Teste `t-comunidade-inicio.mjs`.
- **Saúde e Comunidade nacionais e otimizadas (27/10/2026, PR depois do #103, sem regra nova; 2 índices novos):**
  `por-local.js` (sem deps): `lerPorLocal(fb, docsComValidade, {colecao, filtros, loc, limite, minimo, noAr, chave})` lê a
  cidade (`cidadeIbge` número), depois o estado e só então o Brasil, parando com `minimo` itens; cada nível no cache 10 min;
  com índice (filtros + `atualizadoEm` desc) e, sem ele, lê sem ordem e ordena na tela. `quandoVisivel` (IntersectionObserver,
  600 px): Início só lê Saúde/Comunidade quando a seção chega perto (seções sem `hidden`, `preencher` esconde se vier vazio).
  Local: "Você está em" ou, sem escolha, a cidade do perfil (`localSecoes`). Títulos "em {cidade}"/"em {estado}"/"no Brasil".
  Cartão da Comunidade mostra a distância (`a._dist`, `comDistancia`). Explorar: cidade do perfil (`dados.uf/cidadeIbge`).
  Índices novos: `comunidade` uf+atualizadoEm e cidadeIbge+atualizadoEm (firestore.indexes.json + INDICES-LEIA-ME: agora 7).
  Teste `t-comunidade-inicio.mjs` (35 anúncios mais novos em SP não escondem os 7 de Florianópolis; só carrega ao rolar).
- **Cobrança da condição especial + varredura de falhas (28/10/2026, PR depois do #105, MUDA REGRAS — não publicadas;
  16 partes, 632 testes):** baixa renda: trocar o documento com arquivo anexado pergunta e TIRA o arquivo (`anexo.doc`
  guarda o tipo; enviar exige `anexo.doc === docEscolhido`). Aprovar negociação com valor > 0 = `planos_negociacoes.status
  "aguardando_pagamento"` SEM `planos/{uid}` (valor 0 continua ligando na hora); aviso "Pedido aprovado: pague R$ X";
  Meus negócios mostra "Condição aprovada · Pagar" e a gaveta abre nela (`negPagar`); "Pagar" cria `planos_pedidos` com
  `negociacaoId: uid` (regra `negociacaoPagavel`: plano/meses/valor iguais aos da negociação esperando o pagamento) e a
  tela do Pix usa o valor combinado (`valorDoPedido`, sem bônus). Painel: Esperando mostra "Condição especial aprovada",
  `ativarNegociada` (writeBatch pedido pago + planos com dias/tipos/semSelo a partir do pagamento + negociação "aprovado"
  com `pedidoId`/`pagoEm`), "Cancelar a cobrança"; receita não conta duas vezes (negociação com `pedidoId` sai);
  `valorErrado` alerta pedido normal com valor fora da tabela. Sem as regras novas o painel pergunta e libera na hora.
  Functions: `valorDoPedido`, `conferirPedido` aceita negociação (1–24 meses), `confirmarPagamento` confere a negociação
  ("negociacao-mudou") e liga o combinado. Também: `primeiraAssinatura` olha pedidos pagos e negociação aprovada (antes
  um plano encerrado voltava a prometer o bônus) e "Encerrar o plano" guarda `pedidoId/negociacaoId`; verificação: trocar
  o tipo de documento com fotos pergunta e tira documento + selfie; categoria Negócio não troca para CNPJ se já tem foto;
  cartão de pedido no chat: alerta `.pd-alerta` se total ≠ itens + entrega, e para o dono do negócio se preço/cupom ≠
  cardápio/promoção de agora (`conferirCardapio`); cartão de Pix "em nome do Help Floripa" (nome/descrição ou a chave CNPJ)
  não envia e mostra `.px-golpe`. Testes `t-cobranca.mjs`, `t-pagamento-neg.mjs` (usa o firebase-admin de functions/:
  `cd functions && npm install && cp ../planos-base.js .`), `t-pedido`, `t-pix-qr`, `t-verif`, `t-planos` atualizados.
  Ficou anotado (precisa de servidor/Blaze): "Responde rápido" vem de `perfis_publicos.atendimento.resposta`, que o dono
  grava (dá para forjar); pedidos do chat são montados no aparelho do cliente (o alerta ajuda, a correção de verdade é
  gravar o pedido por Cloud Function).
- **Aba Chamadas em Mensagens (28/10/2026, mesmo PR #106, sem regra nova; 2 índices novos `chamadas` de/para + criadoEm):**
  terceira aba em `.modos` (Pessoal | Negócios | Chamadas), `renderizarChamadas`/`lerChamadas` em mensagens.html (50 de cada
  lado; sem índice lê 150 sem ordem), feitas/recebidas/perdidas por dia, filtro Perdidas, ligar de volta, "Limpar registro"
  no aparelho (`hf-chamadas-<uid>`). Teste `t-registro-chamadas.mjs`.
  **Painel das vitrines (topo com foto, classes, busca): o dono testou 2 versões novas e mandou voltar e ESQUECER (28/10).**
  Não propor de novo redesenho do topo das vitrines sem ele pedir.
  **Depois (pedido dele, 28/10): melhorias SÓ na página de Freelances** (`body.pg-freelances`; a index também usa
  data-classe servicos): arte `servicos-arte.svg` no lugar da foto (`.hero.hero-arte`; se não gostar, volta `obras.webp`),
  azul escuro vivo (#2563ff; `.vitrine[data-tipo=servicos] --vc #2f6bff`), topo mais compacto (lead em 2 linhas, classes
  baixas com ícone ao lado). Cartões `cartaoPro` (`.vt-fl`): borda e anel do avatar pela cor do plano (Plus #0ea5e9, Pro
  degradê violeta→azul, Premium dourado com brilho), etiquetas de atendimento, rodapé preço + seta. **Online agora:**
  `presenca.js` (ligado no firebase.js) grava `perfis_publicos.ultimoAcesso` a cada 4 min com a página à vista (respeita
  `ultimoAcesso: null` = escondeu); bolinha verde `.fl-online` quando < 10 min (`estaOnline`); donos lidos com cache de 5 min.
  **Mesmo PR #107, parte 2:** Plus = azul escuro vivo (#2563ff, degradê #3b82f6→#1d4ed8 nos selos/gaveta/negocios.css) e grátis =
  azul claro #00adee (anel e seta); `--c-servicos` do Início = #2563ff. Cartões estreitos (3 por linha) por container query
  (`.vt-fl` ≤190 px: sem etiquetas, avatar menor, preço sem corte). Freelances: bolinhas `bolhasProfissionais` (abas Online
  agora · Destaques · Novos · Perto de você; anel pela cor do plano, bolinha verde). `corDoPlano(fb, cartao, donoId)` em
  planos-base.js (classes `hf-pl-plus/pro/premium/gratis`, 1 leitura de `planos/{dono}` por dono, cache 10 min) nos cartões do
  Início (`.mini`, selo do plano foi para o canto de cima) e do Explorar (`.exp-neg`).
  **Topos das 6 classes no modelo de Freelances (pedido dele, 28/10):** `body.pg-compacta` (topo compacto, classes 3 por linha
  com ícone ao lado) em servicos/delivery/shopping/imoveis/saude/comunidade; `.hero.hero-arte` com a arte `{tipo}-arte.svg`
  (delivery, shopping, imoveis, saude, comunidade geradas por `scripts/arte/gerar-artes.py`; sombra por `--arte-sombra`).
  As fotos antigas (lanchonetes/shopping/imoveis.webp) continuam no Início/Explorar. Link Freelances agora #2563ff em todo lugar.
  **Cartão de visita dos Freelances (`.vt-cv`, `cartaoPro`, 28/10):** capa curta 16:7 (sem capa = degradê azul), UMA
  etiqueta na capa (destaque > urgência > cupom; só ícone em cartão estreito) e selo do plano no canto oposto, foto no centro
  com anel da cor do plano + bolinha de online, nome (2 linhas), área, nota, onde ("~3 km · Cidade" ou só a cidade), extras
  (responde rápido/modos) e rodapé "a partir de R$ X"/"Preço a combinar" + seta. Container queries ≤210 px e ≤140 px.
  **Mesmo modelo em todas as vitrines (28/10):** `cartaoVisita({...})` em vitrine.js monta o cartão base (`.vt-cv`; `tagCartao`,
  `linhaCv`, `ondeCv`); Saúde (`cartaoSaude`, classe `vt-saude`, linha do registro `.cv-reg`, rodapé Consulta/Convênios),
  Delivery (`tileDelivery`: Aberto/Fechado na capa, tempo de entrega, rodapé Entrega Grátis/R$), Imóveis (`cartaoImovelMini`,
  `cv-item`: foto 4:3, quartos/vagas/m², rodapé finalidade + preço) e produtos (`cartaoProduto`, `cv-prod` 1:1, preço riscado,
  loja). Comunidade (comunidade.js/css) ganhou o rodapé `.cm-rod` (tipo · há X + "De graça"/"Divisão R$"/"Ajude a devolver" + seta).
  Testes usam `.vt-cv`, `.cv-tag.promo` (antes `.vt-free`, `.vt-del`, `.vt-promo-tag`).
  **Local único, filtros e destaques (28/10, pedido dele):** o botão de local das vitrines (`#vtLocalBtn`) abre a MESMA folha
  do Início (`escolherLocal` de local-escolhido.js, `.hm-local-pop`); "Onde procurar" (e o bairro nele) saiu — bairro virou
  opção nos Filtros dos Imóveis. `atualizarPeloGps` (início e vitrines): sem escolha manual (`hf-local-manual`), lê o GPS
  (pede a permissão 1× por aparelho, `hf-gps-perguntado`) e grava a cidade em `hf-busca-local`; `aoMudarLocal` (evento
  storage) refaz as outras páginas abertas. Gaveta de Filtros nova (`.vf`, `abrirFiltros`): Onde você está (Mudar), Distância,
  Ordenar por (`ordemDaPagina`), opções em grupos (`GRUPOS_FILTRO`) com contagem, preço (`PRECOS_FILTRO`: Freelances, Saúde,
  Imóveis), quartos e bairro (Imóveis); `filtrosX.bairro`, `FILTROS_VAZIO()`. Bolinhas com abas (`bolhasProfissionais`) também
  em Delivery, Saúde, Shopping (no lugar de "Lojas") e Imóveis (anunciantes, `anunciantesDe`); carrossel de destaques
  (`secaoDestaques`) em Delivery e Saúde e "Destaques das lojas" no Shopping. Testes: `.vf-chip`, `.vf-aplicar`, `.hm-local-*`.
  **Ajustes pedidos por ele (28/10, PR depois do #109):** os cartões de Saúde, Delivery, Imóveis, Shopping e Comunidade
  VOLTARAM ao modelo de cada página (não mexer na organização dos cartões sem ele pedir); só Freelances ficou com o cartão de
  visita (`.vt-cv`). **Cor do plano só no selo** (PLUS/PRO/PREMIUM): bordas, anéis da foto, bolinhas e seta na cor da página
  (`--vc`); os estilos `hf-pl-*` de borda saíram do planos-base.js, inicio.css e rede.css. **Freelances voltou ao azul da
  Help Floripa #00adee** (vitrine, topo `servicos-arte.svg` recolorida, `--c-servicos` do Início, `.classe-link.servicos`).
  **Local dentro dos Filtros** (`.vf-local`, sem abrir outra janela): onde você está, Usar minha localização (preenche
  Estado/Cidade), Minha cidade, Todo o Brasil e os campos Estado/Cidade; cada mudança salva na hora (`salvarLocal` +
  `marcarManual`) e vale no botão do topo, no início e nas outras vitrines. A folha do botão do topo (`escolherLocal`) abre
  na cor da página (`cores` → `--accent`; `coresDaPagina()` em vitrine.js).
  **Organização das vitrines (28/10, PR depois do #110, pedido dele com prints do Spotify "adaptado à Help Floripa"):**
  bordas/anéis na COR DO PLANO de volta (vt-cv pl-*, hf-pl-*, bolinhas, Início/Explorar como antes do #110; grátis = cor da
  página). **O lugar escolhido NÃO conta como filtro** (`filtrando` sem `filtroLocal.uf`): antes, com a localização lida
  sozinha, as vitrines escondiam destaques e fileiras por categoria. Fileiras no estilo dos apps de música: `carrossel(titulo,
  itens, classe, {sub, mais, foto, pre})` (título 20 px, frase, "›" `.vt-car-mais`, cabeçalho "Parecido com" + foto; setas só
  no computador). `fileirasDaPagina` (Vistos por você — `lembrarVisto`/`hf-vistos-{tipo}` gravado em abrirDetalhe/abrirAnuncio
  ("anuncios") —, Parecido com o último visto, Em promoção, Perto de você (› ordena por "Mais perto", `mudarOrdemPagina`),
  Chegaram agora) em Freelances, Saúde, Delivery e Imóveis; Shopping: Em promoção (preço riscado) e Perto de você.
  Categorias: cada uma uma fileira com "N profissionais/imóveis..." e "›" (abre o filtro). Distância do cartão de imóvel acima
  do preço (`.vt-imo .vt-dist` bottom 34px).
  **Leitura em lote (28/10, PR depois do #111):** `docsPorIds(fbx, colecao, ids, validade)` em leituras.js (de 30 em 30 com
  `documentId in`, guarda no aparelho com a validade e anota os que não existem `{nada:1}`; falhou = um por um). Usado em
  `carregarDonos` (planos + perfis_publicos; `guardarPlano` enche o cache do lerPlano) e em `lerResumos` (notas). Saúde com 50
  perfis: 11,2 s → 1,5 s no emulador, ~150 leituras → 6. **Comunidade organizada (mesmo PR):** botão do lugar `#cmLocalBtn` (o MESMO do início/vitrines,
  `escolherLocal` em rosa, `aoMudarLocal`, `atualizarPeloGps`); carrega por `lerPorLocal` (cidade → estado → Brasil, 60 por
  nível, mínimo 30, cache 10 min, chave "cm") + "Ver mais anúncios" (`verMais`: próximos 60 do Brasil com `startAfter`);
  o lugar escolhido vem primeiro (`doLugar`). Sem filtro/busca: fileiras `.cm-fila` (Perto de você — › ordena por perto —,
  Chegaram agora (7 dias) e uma por tipo com a cor dele e "›" que liga o filtro); com filtro: a grade `.cm-grade` de antes.
  Cartões da Comunidade NÃO mudaram.
- **Verificação nacional das 10 páginas (28/10/2026, mesmo PR #112, sem regra nova; 1 índice novo):** medido com
  `t-leituras.mjs` (carga agora tem 300 da Comunidade e 300 reclamações; `SO="Saúde,..."` mede só algumas). Vitrines 52–55
  leituras (2ª visita 4), Início 118, Comunidade 64, Diário 320, Explorar 444. **Reclamações** refeita: 100 mais recentes do
  Brasil (`nota in [1,2]` + `criadoEm` desc, índice `avaliacoes` tipo+nota+criadoEm; sem ele lê como antes) com "Carregar
  mais" no servidor (`startAfter`), as suas e as da pessoa do painel por consulta própria (`daPessoa`: alvoId/autorId), total
  do Brasil por contagem (`hf-recl-total` 10 min), "Onde" (Todo o Brasil · UF · cidade do lugar escolhido, pelo negócio) e
  negócios/perfis/respostas em lote (`docsPorIds`). 565 → 364 leituras (2ª visita 65 → 4). **Bug corrigido no `docsPorIds`:**
  guardava o objeto das marcas do começo e outra gravação no meio trocava o objeto (as marcas sumiam, a 2ª visita relia
  tudo). Teste `t-reclamacoes-nacional.mjs`. `saida/fotos-previa.json` (t-comunidade-inicio) pode ser gerado com fotos lisas.
- **Visibilidade justa — Parte 1: vitrines (28/10/2026, mesmo PR #112, sem regra nova):** decidido por ele: 1 espaço pago a
  cada 5, bônus do plano Plus +10% · Pro +20% · Premium +30% na lista orgânica, e os topos de categoria seguem a mesma regra.
  `relevancia.js` (sem deps): `relevancia(d)` = média ajustada (3,8 com peso 3) × responde rápido/devagar × completude ×
  atualizado × novidade (até 14 dias, +25%) × perto (km ou mesma cidade) × verificado × `fator` × `BONUS_PLANO` ÷ exposição
  (`hf-expo` no aparelho, meia-vida 3 dias; a vez da janela atual NÃO conta, senão a recarga mudaria a ordem) × giro fixo
  (`sorteioFixo(uid:janela de 3 h:id)`). `ordenarJusto(itens, dados, {dono, semente, marcar})`: posições 1, 6, 11... = melhor
  pagante ainda não usado; resto pela nota; mesmo dono não seguido; `marcar` = quantos do começo contam como vistos no topo.
  vitrine.js: `dadosRel`/`completoDe`/`justo`/`justoProd`/`pesoJusto`, ordem padrão "Relevância" (3º item da ordem =
  `ordenarPor`) + "Mais bem avaliados"; Imóveis padrão `relevancia`. Vale na lista, em cada fileira de categoria
  (`mostrarItens` `reordenar`), destaques (`secaoDestaques` sem sorteio, `secaoDestaquesServ`/`girar` com `pesoJusto`, imóveis),
  bolinhas (Online/Destaques), lojas em destaque, promoções, "Parecido com", Atendem online. Delivery fechado ×0,75.
  **Promessas dos planos trocadas (decidido por ele, opção B; ainda sem assinantes, só bots de teste):** espaços pagos na ordem
  Premium → Pro → Plus (`ordenarJusto` ordena `pagos` por nível; o 1º cartão de cada lista/fileira é de um Premium). Plus =
  "espaços de destaque (1 a cada 5) e +10%", Pro = "à frente do Plus nos destaques, +20% e mais perto no Perto de você",
  Premium = "1º lugar de cada vitrine e categoria (revezando entre os Premium), +30%". Textos em planos-base.js (PLANOS,
  DESTAQUES_PLANO, BENEFICIOS com linha "Bônus na ordem das vitrines" +10/20/30%), profissionais.html, ajuda.html e Termos
  seção 6 ("Ordem das vitrines"; nenhum plano garante vendas ou posição fixa além do descrito).
  Também: Profissionais (cartão "Destaque na vitrine", listas dos 3 planos e FAQ "Como apareço primeiro?"), nota "Como
  funciona a ordem das vitrines" embaixo da tabela da gaveta (planos.js) e comentários do Perto de você (inicio.js).
  Teste `t-relevancia.mjs`.
  **Parte 2 – Início e Explorar (PR #113, mesclado; o #112 tinha sido mesclado sem os 2 commits dos textos dos planos, que
  foram no #113):** `relevancia.js` `dadosNegocio(n, {nota, nivel, km, mesmaCidade, fator})`; `planos-base.js`
  `planosDosDonos(fb, ids, docsPorIds)` (lote, 10 min, enche o cache do lerPlano). Início: `revezar(..., {ordem, nivel})`
  começa na ordem justa e, no revezamento, os lugares 1, 6, 11 só trocam entre pagantes (o 1º, entre os do maior plano);
  Mais bem avaliados, Chegaram agora (`fatorNovo`) e Imóveis (`fatorIm`) com `justoLocal` (cidade escolhida primeiro); Saúde
  do início com `ordenarJusto`; Perto de você: Plus ×0,9 (era 0,85), Pro ×0,6, Premium ×0,5 sobre km+0,5. Explorar:
  "Negócios em…/em destaque" com `ordenarJusto` (Perto = distância × bônus) e busca de negócios com `ordenarJusto` + quanto o
  nome bate (`fator`). Teste `t-relevancia-inicio.mjs`.
  **Parte 3 – Diário + página (PR depois do #113, sem regra nova):** feed.js `ordenarPrincipais`: mistura fixa
  (`sorteioFixo(uid:janela:id)` no lugar do `Math.random`) e `comDescoberta` (relevancia.js): 1 a cada 5 a partir da 3ª =
  publicação de quem a pessoa não segue, não vista, com ≤3 notas e ≤1 comentário; no máximo 2 do mesmo autor nas 10
  primeiras; depois `espalharAutores`. O que já foi visto continua descendo (×0,35). Página `como-ordenamos.html` (modelo das
  Diretrizes, 8 seções), link no rodapé das 13 páginas institucionais, no menu (seção Help Floripa), Termos seção 6, Ajuda,
  Profissionais (FAQ) e na nota da gaveta dos planos. Teste `t-diario-justo.mjs` (Diário mostra 10 por vez: clicar `#maisFeed`).
  Em aberto: com perfis iguais, o bônus pode pôr 4 pagantes nos 5 primeiros (sugerido a ele: no máximo 1 pagante nos 4
  depois de cada espaço pago; ainda sem resposta). As 3 partes estão feitas.
- **Abas e listas das páginas institucionais (PR depois do #114, sem regra nova):** `.nav-inst` em ordem alfabética nas 11
  páginas (Ajuda, Clientes, Contato, Diretrizes, Negócios, Parcerias, Privacidade, Segurança, Sobre, Termos). Listas com ícone
  (`.lista-check`, `.plano-mini`, `.confianca`, `.dicas`) deixaram de ser `display: flex`: o ícone fica `position: absolute` e o
  texto corre (com flex, `<strong>`/`<a>` no meio da frase viravam colunas, ex.: Diretrizes seções 1 e 4, Segurança).
- **Barra de baixo + Diário | Registros (PR depois do #115, sem regra nova):** pedido dele: Explorar e Comunidade na barra de
  baixo; no topo, no lugar do Explorar, **Registros** (textos e enquetes). `barra-rede.js` (sem deps): 5 itens Diário ·
  Explorar (`feed.html?aba=explorar`) · Comunidade · Mensagens · Perfil, `montarBarra/marcarBarra/pintarAvatarBarra`, CSS
  próprio só sem o rede.css; `rede.js` `montarBarraRede` usa ele; mensagens.html tem a barra fixa no HTML (5 itens) e a
  comunidade.html monta a barra (Comunidade marcada). feed.js: `ABAS` diario|registros|explorar, `urlAba`, `abaDaUrl`;
  **Diário = com foto/vídeo (`temMidia`), Registros = sem mídia (texto, enquete, caixa)**, `daAba` (com #hashtag ou local
  mostra tudo); Registros sem a fileira do Flash e com outro texto no campo de publicar; publicar leva à aba certa; Explorar
  sem as abas do topo; na barra, Diário/Explorar trocam sem recarregar (clique interceptado). Testes: os que criam texto/
  enquete abrem `feed.html?aba=registros`; Explorar = `#barraRede [data-barra=explorar]`; duas abas no mesmo navegador
  travam o Firestore do teste (t-salvos usa a mesma aba). Teste `t-barra-registros.mjs`. Etapa B (com Blaze): exibições somadas no servidor e ranking pré-calculado por cidade/categoria.
- **Mural da Comunidade + Diário | Registros organizados (PR depois do #116, sem regra nova):** `mural.html/js/css` (item
  Comunidade da barra de baixo, `barra-rede.js` e mensagens.html apontam para ele): publicações da coleção `comunidade` no
  jeito de rede social (rosa #e5487f, cor de cada tipo em `--cc`): "Ana está doando/quer trocar/está precisando de/
  encontrou", bairro · cidade · há X, etiqueta do tipo, título, descrição (3 linhas), foto ou emoji, selo (De graça...),
  Disponível/Reservado, compartilhar e a ação do tipo → `comunidade.html?item=ID&de=mural`. Sem hero; topo com o botão do
  lugar (`escolherLocal`), campo "O que você quer doar, trocar ou pedir?" + 5 atalhos → `comunidade.html?novo=TIPO&volta=mural`
  (comunidade.js `voltarMural`: depois de publicar vai para `mural.html?publicado=1`), aviso amarelo "Proibido vender",
  números reais do carregado, filtros com contagem e "Ver mais" (12 por vez, depois 60 do servidor com `startAfter`).
  Leitura = `lerPorLocal` chave "cm" (mesmo cache da comunidade.html) + perfis em lote (`docsPorIds`). comunidade.html
  ganhou "Ver o mural". **Formulário de publicar:** seletor `#pubModo` Diário (fotos e vídeos) | Registros (textos, enquetes,
  perguntas) em `abrirCompositor({ modo, inicio })`; Registros esconde Foto/Vídeo; Diário sem foto avisa (`#pubDestino`) que
  vai para Registros; botão "Publicar no Diário/em Registros"; com mídia o modo vira Diário. Feed: topo de cada aba
  (`#feedIntro`), atalhos embaixo do campo (`#comporAtalhos`: Foto/Flash/Local ou Texto/Enquete/Perguntas), Registros em
  lista corrida estilo conversa (`#listaFeed.registros`, foto à esquerda e linha ligando, sem a caixa de citação) e sem a
  fileira do Flash (`body.aba-registros`; o stories.js mostrava a fileira ao terminar de carregar). **Mensagens da barra**
  abre a página inteira (chat-gaveta.js ignora links em `#barraRede`). Teste `t-mural.mjs`.
- **Diário único + Republicar + nome atual (29/10/2026, PR depois do #117, MUDA 1 REGRA — não publicada; 16 partes, 640
  testes):** pedido dele: Diário e Registros viram UM Diário (fotos, vídeos, textos, enquetes). feed.js: `ABAS` diario|explorar
  (`?aba=registros` antigo abre o Diário), sem `#abasFeed`, filtro de tipo `#tiposFeed` (`TIPOS_FEED` Tudo/Fotos e vídeos/Textos/
  Enquetes e perguntas, `doTipo`, filtra o já lido: `todosPosts` → `posts`, `mostrarFiltrados`), atalhos Foto/Enquete/Flash/Local;
  formulário sem o seletor `#pubModo` ("Publicando no Diário"). **Republicar** (rede.js): `republicacoes/{postId}_{uid}` {postId,
  uid, postAutorId, nome, criadoEm} (regra: não a própria, autor confere, sem bloqueio; delete quem republicou/moderação);
  `carregarMeusRepublicados` (cache "repub-uid" 10 min), `contarRepublicacoes` (count 5 min), `alternarRepublicar`,
  `verQuemRepublicou` (no próprio post o botão abre a lista). Barra: Comentar · Salvar · **Republicar (meio)** · Compartilhar ·
  **Enviar (último)**, números num selo no ícone (`b.contar`), nomes com `clamp` para caber em 360 px. Diário: `buscarRepublicados`
  (de quem você segue, 7 dias, índice `republicacoes` uid+criadoEm — agora 11 índices) → "Fulano republicou" (`.post-repost`),
  idade conta da republicação, empurrão social. Aviso para o autor (tipo `republicacao`, id `p_`) em rede.js/notificacoes/
  painel-avisos/avisos-lista/categoria.js. `gosto.js` PESO.republicar. Conta apagada: conta.js e limpar-contas apagam.
  **Nome antigo no Flash:** cada `diario` guarda o nome/foto de quando foi publicado; `compartilharNoFlash` usa o perfil de
  agora, `atualizarMinhasPublicacoes()` (rede.js, roda ao entrar se nome/foto mudaram — marca `hf-pub-perfil-<uid>` — e ao
  salvar o perfil/foto) grava o nome/foto atuais nas até 300 publicações da pessoa (uma por uma); sino/notificações trocam
  nome/foto pelos do perfil (`ganchos.perfis` em avisos-lista.js, `docsPorIds`). **Entrega revisada (ordenarPrincipais):** as
  suas publicações só sobem nas 3 primeiras horas (antes ficavam sempre em cima com o empurrão de "sigo"), agendada conta a
  idade de quando apareceu, região = lugar escolhido (`regiaoLeitor`, antes só o perfil), já vista ×0,3, filtro por tipo depois
  da ordem (antes o Diário de fotos filtrava as 60 lidas e quebrava o 1 a cada 5 da descoberta). Teste `t-republicar.mjs`;
  `t-sino` espera os nomes atuais do perfil.
- **Diário compacto + link da publicação (29/10/2026, PR depois do #118, sem regra nova):** pedido dele: tirar do topo o
  cartão "Diário", a caixa de publicar (com os atalhos Foto/Enquete/Flash/Local) e a fileira de filtros. Agora: "+" no topo
  (`#btnComporFeed.topo-criar`, no lugar do `.topo-espaco`, abre o formulário direto), flash pelo "Seu flash", e uma linha fina
  `.filtro-feed.compacto`: "Principais ▾" (texto, sem pílula) + `#tiposFeed` só com ícones (grade/imagem/registros/enquete,
  nome no title). **Link de uma publicação = `feed.html?post=ID`** (`abrirPublicacao` em explorar.js: a tela `.visor-exp` com
  topo "Publicação · Nome · @nick", a publicação e "Mais para você" embaixo; vistas com origem "link"); `ganchos.abrirPublicacao`
  no feed: o "Ver publicação" do Flash fecha o visor e abre a publicação ali (antes ia para `usuarios.html?post=`, que abria o
  perfil com uma folha por cima). Cartão do Mensagens, notificações, Explorar, estatísticas e "Copiar link" usam o link novo;
  `usuarios.html?post=` continua funcionando (links antigos). Flash: "Ver publicação" menor e no rodapé, logo acima do "Responder" (`.story-post-linha`; solto por cima cobria a
  legenda do cartão), reações rápidas (`.story-bandeja`) flutuando em cima do rodapé (escondidas ocupavam espaço), t-flash-cfg dá
  plano ao Bruno (flash no negócio só com plano),
  "Preparando..." some quando o criador abre, foto do criador medida com `offsetWidth` (durante a animação de abrir
  `getBoundingClientRect` pegava o cartão encolhido e sobrava uma faixa escura) + ResizeObserver. Teste `t-diario-compacto.mjs`.
  Testes do Flash/Diário falham com dados que sobraram de outros testes (flashes da Ana, 60 recentes cheios): rodar `seed.mjs` antes.
- **Estrela no Flash + Visualizações + resposta da caixa no flash (29/10/2026, mesmo PR #120, MUDA 1 REGRA — não publicada;
  16 partes, 650 testes):** pedido dele: trocar o raio por uma estrela para curtir o flash e deixar perguntas, visualizações
  e quem reagiu como no Instagram. Visor: `.story-estrela` (no lugar do `⚡`, `curtir()`; dourada quando dada, estrela grande
  `.story-estrela-voa`; com respostas desligadas fica sozinha `.story-so-estrela`). Grava `stories/{id}/reacoes/{uid}`
  {curtiu, emoji, em} (merge; regra: só o próprio uid, não no próprio flash, emoji da lista REACOES + ⭐, `em == request.time`;
  lê só ele e o autor); o que eu curti fica no aparelho (`hf-flash-curtidos`, sem leitura por flash). Reações rápidas
  continuam indo como cartão no Mensagens e também gravam `emoji`. Sem a regra: a estrela vai como reação "⭐" pelo Mensagens.
  Autor: "Visto por N" + estrela com o número (`.story-vistos-est`); `verQuemViu` = folha "Visualizações" (números de
  visualizações/estrelas/reações, filtros Todos · Estrelas · Reações, estrela e emoji na foto de cada pessoa, quem curtiu
  primeiro, botão de mensagem que escreve ali e manda pelo Mensagens). "Ver publicação" sem o nome (como no Instagram; o nome
  fica no aria-label). Caixa de perguntas: "No flash" em cada resposta (`compartilharRespostaNoFlash` em stories.js: cartão
  1080×1920 com a pergunta e a resposta, sem o nome de quem respondeu → `abrirCriador({ imagem, selo })`). Testes
  `t-social2` (estrela, reação gravada, Visualizações, mensagem) e `t-diario-compacto` (caixa → flash, estrela sozinha).
- **Reels + público da publicação + auditoria do Diário (29/10/2026, mesmo PR #120, MUDA 1 REGRA — não publicada; 16 partes,
  663 testes; 1 índice novo, agora 12):** pedido dele: "no lugar de fotos, os vídeos (tipo reels)" → no filtro do Diário o
  ícone de foto virou **Reels** (`TIPOS_FEED` tudo/reels/textos/enquetes; "reels" não filtra, abre `reels.js`
  `abrirReels({lista, oculto, comecarEm, aoNovo})`: tela cheia `.reels` z 4000, um vídeo por vez com scroll-snap, toca com 70%
  na tela, som 🔇/🔊, toque = pausa, toque duplo = 5 estrelas, `barraInteracao` na coluna da direita `.reel-lado` e as
  estrelas + autor + Seguir + legenda embaixo `.reel-info`; vídeos = já lidos + `diario mediaTipo == video` (índice
  mediaTipo + criadoEm; sem ele 60 sem ordem); `feed.html?reels=1|ID`; voltar fecha). **Vídeo novo só com Storage**
  (`USAR_STORAGE`): sem ele o botão Vídeo do formulário fica escondido e os Reels ficam vazios.
  **Público da publicação** (`publico-alvo.js` sem deps + `publico-tela.js`, que recebe as funções do rede.js por parâmetro):
  `diario.publico` {idadeMin/idadeMax 16–100, genero f|m, local brasil|estados(ufs ≤27)|cidades(códigos IBGE em texto, ≤10)|
  perto({lat,lng,km 5–300,nome}), seguidores todos|seguidores|novos}; regra `publicoOk` (create e update; "TUDO junto" cabe).
  Formulário: botão "Público: Todos ▾" (`#pubPublicoBtn`) ao lado de "Publicando no Diário" → folha (Quem vê, Idade com faixas
  e De/até, Gênero, Lugar com UFs/cidades por estado/perto da minha cidade ou localização + raio, resumo e nota). Sem a regra:
  não publica e avisa. ⋯ da sua publicação → "Público da publicação" (`editarPublicoDoPost`) e aviso `.post-publico` só para o
  autor. **Quem lê** (`leitorDe`/`combinaPublico`, tudo no aparelho): idade de `usuarios.dataNascimento`, `usuarios.genero`
  (novo, privado: Configurações → Gênero `#cfgGenero` e campo opcional no cadastro), lugar escolhido ou cidade do perfil,
  posição (`minhaPosicao`, espera 1,5 s), segue ou não. Vale no Diário (`postOculto` do feed.js), Explorar e Reels; no perfil
  e pelo link continua aparecendo (direcionamento, não privacidade — dito na tela e na Política de Privacidade). Sem idade/gênero
  informado = não vê publicação com esse filtro.
  **Auditoria** (`t-auditoria-diario.mjs`, 86 verificações celular+computador): achou e corrigiu o voto perdido na enquete
  (tocar antes de carregar não fazia nada: `votar` espera `carregar()`; `recarregar` zera o cache) e o Explorar usando o
  estado do perfil em vez do lugar escolhido (`regiaoEu`). Medido (carga): Diário 318 leituras/3,7 MB na 1ª visita (fotos em
  `data:`), 38 na 2ª; Explorar 444/36. Os ouvintes do sino (rede.js `ouvir`, até 100 docs cada) releem a cada página.
- **Promover, tipos de publicação, Reels e marcações (29/10/2026, PR depois do #121, MUDA REGRA — não publicada; 16 partes,
  692 testes):** Público virou PÁGINA em tela cheia no estilo "Promover" (`publico-tela.js` `escolherPublico(atual, ajuda)`,
  `.pa-pagina` z 5300, Esc/voltar fecham só ela): Automático | Personalizado, Quem vê, Localização em abas (Todo o Brasil,
  Estados com atalhos Sul/Sudeste, Cidades por UF, Raio 5–300 km), Idade (faixas + controle duplo), Gênero, **alcance estimado
  real** (`estimarAlcance`: `getCountFromServer` em `perfis_publicos` por `uf in`/`cidadeIbge in` em lotes de 30, raio = cidades
  do `geo-cidades.json` dentro do círculo, até 300; seguidores pela contagem de `relacoes`; barra = fração do Brasil; idade e
  gênero só dizem "até") e **públicos salvos** (`usuarios.publicosSalvos` ≤10). No formulário: tile "Público" na grade e no topo
  só o rótulo (`#pubPublicoBtn` é um span). **Tipos de publicação** (`TIPOS_PUB` em rede.js, seletor `#pubTipos`: Texto · Foto ·
  Vídeo (só com Storage) · Enquete (`#pubEnqueteBtn`) · Perguntas (`#pubCaixaBtn`), um por vez, `mudarTipo` tira o que não cabe
  e avisa): `diario.tipo` + regra `tipoOk` (ver `_regras/LEIA-ME.md`); **texto com UMA imagem = cartão casado**
  (`blocoCasado` em rede.js, `estilo: "casada"`, até 500 letras; Diário, tela da publicação, perfil → aba Textos, Explorar
  `.casada-tile`); no Texto, a 2ª imagem muda para Foto. Grade com 8 botões: Imagem/Fotos ou Vídeo, Marcar, Hashtag (põe "#"),
  Local, Agendar, Público, **Ajustes** (`abrirAjustesPub`: quem pode comentar desta publicação, ocultar o número de estrelas
  `diario.ocultarNotas` → `.sem-notas` para os outros, anônima da enquete/caixa e as regras do tipo), Rascunhos. **Marcações**
  `pessoasEmPilha(uids, opc)` em rede.js: até 3 fotinhas + "+N" e "com Ana e mais 2 pessoas", toque = lista; no Diário (todos
  os tipos), tela da publicação, perfil, Reels e menções do Flash (`.story-mencoes escuro`). **Reels:** ícone novo `i-reels`
  (filtro, aba do perfil, vazio), som com ícones `i-som`/`i-mudo` (sem emoji), legenda em 2 linhas com "mais", marcados, local,
  barra de progresso, no computador coluna 9:16 no centro; vídeo do Diário tem botão "Abrir nos Reels" (`.video-reels`) e o do
  Explorar abre direto nos Reels. **Links:** `usuarios.html?post=` redireciona para `feed.html?post=`; aberta de outra página
  do site, um "voltar" volta para ela (`daOrigem`); aberta de fora, a proteção "Sair?" (confirmar.js) só arma depois que a
  tela da publicação/Reels fecha. Testes `t-tipos-pub.mjs`, `t-video.mjs` (Storage ligado: vídeo sobe e toca no Diário/Reels,
  Flash e Mensagens), `t-publico-reels.mjs` (alcance nacional: SC+PR, Salvador+Manaus), `t-compositor.mjs`, `t-coment.mjs`.
- **Correções do celular (29/10/2026, PR depois do #122, sem regra nova):** prints dele. (1) **"Já vi" do Flash por conta**:
  `hf-stories-vistos-<uid>` e `hf-flash-curtidos-<uid>` (`conjuntoDaConta` em stories.js; flash-negocio.js idem) — antes uma
  chave só por aparelho: a outra conta via os flashes como vistos. (2) **Gaveta do chat fechada** (chat-gaveta.js, o iframe fica
  carregado escondido) marcava como lidas as mensagens da conversa aberta e não avisava: `avisarQuadro` põe
  `__hfGavetaAberta` no iframe + evento `hf:gaveta`; mensagens.html `escondida()` (aba escondida OU gaveta fechada) em
  marcarComoLida/notificar/som. (3) **Número das Mensagens conta mensagens** (não conversas): `mensagens-novas.js`
  (`contarNovas`: 1 contagem por conversa com novidade, `criadoEm > última leitura`, guardada por `atualizadoEm` em
  sessionStorage; `textoMensagens` → "enviou 26 mensagens") em rede.js (`avisos.mensagens[].n`), categoria.js, painel-avisos.js
  e notificacoes.js; menu até "99+". `mandarMensagem` (rede.js) grava `vistoEm` de quem envia. (4) **"Ver publicação" no Flash
  como no Instagram**: área de toque `.story-post-area` sobre o cartão → balão `.story-post.balao` onde tocou (pausa o flash);
  o balão abre a publicação POR CIMA do flash (`abrirPublicacao(id, {sobreFlash, aoFechar})`, `.visor-exp.sobre-flash` z 4950)
  e o "voltar" retorna ao flash, que continua. (5) **Enquetes antigas zeradas**: votos de antes da contagem em pedaços —
  `lerContasEnquete` cai para o documento único antigo + `enquete_votos` contados por opção quando os pedaços somam 0
  (`resultadoFinal` não guarda zero de vez); enquete sem `fimEm` termina 7 dias depois de publicada (`DIAS_ENQUETE_ANTIGA`
  em blocoEnquete, `comFimImplicito` no cartão do Flash). Quem votou vê "Voto registrado · o resultado sai em <data> e você
  recebe uma notificação"; autor sem votos vê "Nenhum voto ainda". (6) **Local no topo da publicação**: nome numa linha e
  `.sub-linha` "📍 Local · 3 h" numa linha só (o local encurta com "…"; sem local, "@nick · 3 h"). (7) **Marcados no cartão
  da publicação no Flash**: até 3 fotinhas + "+N" e "com Ana e mais 2 pessoas" (`imagemDaPublicacao`, `MARC_H`).
  O "com Douglas e Edilson" sem fotinhas do print era a versão antiga em cache (não era por causa das regras).
  Teste `t-correcoes-social.mjs`; `t-diario-compacto` (balão e voltar ao flash).
- **Flash: teclado, Aa, visor e Visualizações (30/10/2026, PR depois do #123, sem regra nova):** prints dele comparando com o
  Instagram ("não faça igual, seja original"). (1) **Teclado espremia o criador** (`resizes-content` + `.flash-caixa 100dvh`):
  `medirCartao` em stories.js prende a altura do `.flash-palco` em px no celular (`pointer: coarse`) enquanto um campo do
  criador está focado; `--tecl` (quanto o teclado cobre) e `.flash-criar.teclado` fazem `.flash-figs`/`.flash-edtxt` terminarem
  acima do teclado, o modo Texto centralizar na parte à vista e a legenda subir; `.flash-criar { overflow: clip }`.
  (2) **Aa refeito:** alinhamento (`t.alinha` center/left/right, `ALINHAS`, `iconeAlinha`; vale no DOM e no canvas), fundo atrás
  do texto, régua em cunha na lateral (`.fe-regua`), letras em pílulas com o nome (`.fe-letra`; LETRAS + "Forte" e
  "Manuscrita"), cores numa fileira; tocar fora conclui. (3) **Visor:** `.story-post-area` só no miolo (22% de cada lado
  ficam para voltar/passar) e o balão só com toque rápido e parado (≤10 px, ≤350 ms); deslizar acompanha o dedo
  (`translateX` + `rotateY`, `perspective` no `.story-visor`), toque rápido para o lado também troca, gesto curto volta.
  (4) **Visualizações** (`verQuemViu(s, aoFechar, flashes)`): fita dos seus flashes no ar com a contagem (`getCountFromServer`
  em `vistos`), "Publicado há X · some em N h" (`restaTexto`), estrela e emoji como selos na foto, ⋯ de cada pessoa abre
  `.vv-acoes` (Mensagem, Ver perfil, Ocultar/Mostrar flashes → `flashConfig.ocultarDe`). Ícones novos `i-olho-off`, `i-pessoa`.
  (5) Configurações do Flash: `.cfg2-ic` sem cor (pedido dele). Teste `t-flash-teclado.mjs` (teclado simulado encolhendo a
  tela com o campo focado; toques/arrastos pelo CDP).
- **Flash igual ao que foi feito (30/10/2026, PR depois do #124, sem regra nova):** 20 prints dele comparando com o Instagram.
  **Visor:** `.story-quadro` 9:16 (palco, sombra, legenda e as figurinhas interativas dentro; `object-fit: contain`) — antes no
  celular a foto era `cover` em 100vw×100dvh, cortava as laterais e as figurinhas não ficavam onde foram postas. Celular
  comprido (`max-aspect-ratio: 9/17.4`): `--reserva` 68 px e o campo de responder fica embaixo do quadro. Enquete/perguntas:
  `encaixar(w, fx, fy)` desenha em 300 px e escala (`--k`) para 74% do quadro (= criador), centro preso entre 11% e o rodapé;
  `.story-quadro` tem `pointer-events: none` (só figurinhas/links/área da publicação recebem toque). Tempo ao lado do nome;
  `tempoDoFlash`: 5 s por foto, +2,5 s com enquete/perguntas/publicação/link, +1,5 s com legenda > 80. ⋯ do seu flash:
  Visualizações, Salvar foto (`salvarFotoFlash`), Compartilhar (`compartilharLinkFlash`, feed.html?flash=ID), Configurações
  do Flash. Fita das Visualizações troca o flash de trás (`irPara`, 4º parâmetro de `verQuemViu`). Estrela sem as regras: a
  reação "⭐" pelo Mensagens vai uma vez por flash (`estrelaAvisada`); o cartão diz "Deu uma estrela no seu flash".
  **Criador:** ferramentas em coluna à direita (`.flash-ferr` column); "Amigos próximos" virou a estrela `.flash-amigos` por
  flash (`paraAmigos`, `_publico` em `camposDestino`, o `gravar` tira o "_"; botão verde "Amigos próximos"; sem lista abre
  `escolherPessoas`); texto na foto `width: max-content` (perto da borda quebrava letra a letra) e o canvas quebra igual
  (`quebrarLinhas`, 88% da largura); `.flash-palco { overflow: clip }` (com texto passando da borda o cartão rolava para o lado
  e cortava os painéis); figurinhas em pílulas `.fig-pilula` (ícone colorido, `i-calendario` novo). **Mensagens:** cartão do
  flash `.fc-mini > img` (a foto do perfil no topo ficava esticada como faixa), emoji da reação no canto. Respostas da caixa:
  `.cx-acoes` quebra linha. **Bug antigo:** o X da `#folhaPerfil` FECHADA continuava tocável no canto de cima (só com
  `.aberta` agora). Teste `t-flash-visor.mjs`; `t-caixa` e `t-enquete2` passam de novo.
- **Flash parte 2 – Arquivo, Destaques, pincel e sino (30/10/2026, mesmo PR #125, MUDA REGRAS — não publicadas; 16 partes,
  718 testes; 2 índices novos, agora 14):** pedido dele "completo como no Instagram, com o estilo da Help Floripa".
  **Arquivo:** o site APAGAVA os flashes vencidos (`limparVencidos`); agora ficam guardados (`flashConfig.arquivo`, padrão
  ligado; desligado apaga os vencidos menos os destacados). Regra de `stories` nova: lê o autor, o que tem < 26 h
  (`request.time - duration.value(26,'h')`) ou `destacado == true` (e moderação); o autor só atualiza `destacado`. Por isso
  consultas de flashes de OUTRA pessoa precisam do prazo: `flashesNoArDe(uid)` (autorId + criadoEm >= 24 h, índice novo;
  sem ele, as últimas 24 h de todos filtradas; com as regras antigas, a consulta antiga) em anelNoPerfil, abrirFlashPorId e
  config; `flash-negocio.js` `noAr` igual (índice negocios array-contains + criadoEm). Mensagens: cartão de flash com
  permission-denied = "Flash indisponível". `abrirArquivo({selecionar, marcados, titulo, botao})` (12 por vez, índice
  autorId + criadoEm desc; sem ele 60 de uma vez; abrir um flash fecha a folha e volta para ela ao fechar o visor).
  **Destaques:** `destaques/{id}` {uid, nome ≤30, ids 1–100, capa (∈ ids), capaMini JPEG 132 px ≤30000, criadoEm,
  atualizadoEm} (regra `destaqueOk`); `destaquesNoPerfil(corpo, uid)` (usuarios.html, no fim do `.pf-corpo`: Novo · destaques ·
  Arquivo no seu; só os destaques nos outros; segurar = `editarDestaque`), `abrirDestaque` (visor com `lista` + `destaque`:
  nome no topo, data do flash), `adicionarAoDestaque` (botão "Destacar" no rodapé do seu flash e no ⋯), `novoDestaque`
  (arquivo → nome), `gravarDestaque`/`tirarDoDestaque`/`marcarDestacados` (põe/tira `stories.destacado`). `abrirVisor`
  usa `mapa` (lista própria) no lugar de `porAutor`. Sem as regras: criar destaque avisa que falta publicar.
  **Criador:** pincel `abrirPincel` (caneta, marca-texto, neon, borracha, espessura, desfazer; traços 0–1 em `tracos`,
  `pintarTracos` no canvas `.flash-desenho` e na foto final), figurinhas Emoji (`EMOJIS_FIG`, `t.emoji`, toque troca o
  tamanho) e Hashtag (`fig-hashtag`), fundo do texto em 3 estilos (sem → cor cheia → escuro transparente `t.vidro`,
  `FUNDO_VIDRO`). **Sino:** `flash-avisos.js` (`lerReacoesFlash`: seus flashes de 48 h + reacoes; tipo `flash`, id
  `f_<flash>_<uid>`, "deu uma estrela e reagiu com 🔥 ao seu flash", abre `feed.html?flash=`) em rede.js/painel-avisos/
  notificacoes/avisos-lista. Conta apagada: conta.js e limpar-contas.mjs apagam `stories` (com vistos/reacoes) e `destaques`.
  `vitrine.js?tipo=X&v=53` aumentado à mão. Teste `t-flash-destaques.mjs` (23).
- **Flash: @, figurinhas tocáveis, cores e respostas (02/11/2026, PR depois do #125, MUDA REGRAS — não publicadas; 16 partes,
  732 testes):** prints dele. (1) **Modo Texto espremido ao trocar a letra:** o `pintar()` tirava e recolocava o campo (perdia o
  foco → `medirCartao` media de novo com o teclado aberto). Agora o campo fica, `bLetra/bFundo` com `pointerdown`
  preventDefault e `medirCartao` também considera teclado aberto quando a tela está 120 px menor que a maior vista (`vhMax`).
  (2) **Menções (@):** botão `.flash-arroba` com o número (foto, vídeo e texto) → lista "Menções" (`abrirMencoes`: figurinhas
  com mostrar/ocultar/tirar, escritos no texto, ocultas); sugestões ao digitar "@" no texto, na legenda e no Aa (`ligarArroba`,
  `.fe-arroba`; ordem: @ que começa > nome > contém, recentes `hf-mencoes-rec-<uid>` sobem; com 2+ letras busca em
  `nicknames` por prefixo de documentId); olho cortado = **menção oculta** (só o aviso; figurinha oculta fica tracejada e não vai
  desenhada). Grava `stories.mencoes` (todas) + `stories.mencoesOcultas` (`mencoesParaGravar`); visor esconde as ocultas.
  (3) **Figurinhas tocáveis** `stories.toques` (até 8 textos): `l|nome|lat|lng|x|y|w|h` (Localização agora usa a busca de lugar
  `escolherLocal(aoEscolher)` exportada do rede.js), `h|tag|...`, `m|uid|...`; posições medidas no `desenharFoto` (`t._area`);
  visor `figurinhasTocaveis` → `.story-fig-toque` + balão (feed.html?local= / ?tag= / perfil). Legenda do visor com `comMencoes`.
  (4) **Enquete/caixa com cor** (`cor` escuro|azul|rosa|laranja|verde|roxo, `CORES_FIG`/`temaFig` no rede.js, `seletorCor` no
  criador, classes `tema-*`) e opções com borda à vista. (5) **Publicação apagada:** `apagarFlashesDaPublicacao` (feed.js e
  usuarios.html) apaga os seus flashes com `postDe.postId`; o visor confere (`publicacaoExiste`) e pula/apaga (`pularFlash`).
  (6) **Respostas da caixa** (`verRespostasCaixa`): topo com a pergunta e números, Todas | Novas (`hf-cx-visto-<uid>`), busca
  (8+), por dia, balão e ações. Regras: criação do flash virou `flashNovoOk(d)` (o "TUDO junto" estava no limite de 1.000;
  `local` como mapa separado estourava, por isso foi para dentro de `toques`); sem as regras grava sem os campos novos
  (`semCamposNovos`). Galeria: o site abre o seletor do sistema (Android "Fotos"); grade própria só como app instalado.
  Teste `t-flash-mencoes.mjs`.
- **Flash parte 2 dos prints de 02/11 (mesmo PR #126, sem regra nova):** celular: cartão do criador de ponta a ponta (sem a
  moldura em degradê, `@media (max-width: 699px)`). **Todo flash começa para todos** (`paraAmigos = false`; a escolha "Quem vê"
  saiu das Configurações do Flash — ele reclamou que sempre abria em Amigos próximos; a estrela verde vale só para aquele flash).
  **Pinça e giro** com dois dedos em textos, figurinhas, emojis e fotos por cima (`gesto` + `baseGesto/moverGesto/soltarGesto`;
  o 2º dedo pode cair fora da figurinha: `pointerdown` em captura no palco; `t.rot` em graus, desenhado com `g.rotate`;
  `LIMITE_TAM`); enquete/perguntas/link só arrastam. **Figurinhas no modo Texto** (camada à mostra, `desenharCamada` usada por
  `desenharFoto` e pelo `extra` do `desenharTexto`; publicar texto e foto pelo mesmo caminho, com enquete/caixa/toques).
  **Fotos** (`bImagens`, `abrirImagens`): trocar o fundo, **foto por cima** (`t.ft`, `lerImagem` reduz, até 4; toque troca a
  moldura sem/branca/redonda e traz para a frente; lixeira tira) e **modelos com várias fotos** (`MODELOS` 2/2/1+2/3/4/6,
  `montarModelo` monta 1080×1920 e vira o fundo). **@:** a mesma pessoa não entra duas vezes; cada figurinha de menção tem
  Na tela | Só na lista (`t.soLista`: não é desenhada, aparece em "Mencionados") | Oculta. Cor da enquete/caixa com **prévia ao
  vivo** (`previaFig`) e as 7 cores numa fileira. Painel aberto esconde a coluna de botões. Segurar o flash não abre o menu
  "baixar imagem" (`contextmenu` + `-webkit-touch-callout`). **Visor com teclado** (responder/caixa): o `.story-quadro` fica
  com o tamanho preso em px enquanto um campo está em uso (`teclado-preso`). Uma enquete e uma caixa por flash (como o
  Instagram). Teste `t-flash-gestos.mjs` (pinça via CDP com dois toques).
- **Flash parte 3 dos prints de 02/11 (PR depois do #127, sem regra nova):** os prints dele mostravam localização, # e @ sem
  abrir nada porque as **regras não estão publicadas** (sem elas o `semCamposNovos` grava sem `toques`) — avisado a ele.
  **Atividade do flash** (`verQuemViu`, opções `{aoApagar, aba}`): barra `.vv-barra` com o número de quem viu + Destacar +
  lixeira (apaga e tira da lista do visor, `tirarDaLista`), abas Visualizações | Enquete (opções com %, barra e quem votou;
  anônima só números) | Respostas (cartões `.vv-resp` na cor da caixa, tocar = Pôr no flash/Ver perfil/Apagar); no seu flash,
  "Ver votos" e "N respostas · ver" abrem a atividade na aba certa (`paraAtividade`). Segurar miniatura/imagem não abre o menu
  do navegador (`contextmenu`). **Lugar e # como no Instagram:** o balão abre folha (`abrirLugarFlash`: mapa de azulejos do
  OSM `mapaDoLugar` — CSP img-src `tile.openstreetmap.org` em feed.html/usuarios.html —, Como chegar, Ver no Diário e grade
  das publicações ≤3 km entre as 80 recentes; `abrirHashtagFlash`: contagem + grade `tags array-contains`). **@ escrito no
  Aa** vira área tocável (`t._arrobas` medidos no canvas, girados junto; entram em `toques` como `m|uid`). **"Também em N
  negócios"** numa linha, tocável → lista com o link de cada negócio. Temporizador: desligado → 3 s → 10 s. Aviso (toast) no
  criador/visor: pílula escura embaixo (não cobre a coluna). Menções: "N de 10" e botão "Tirar os @ da foto e mostrar só em
  Mencionados" (3+ figurinhas). Teste `t-flash-atividade.mjs`.
- **Flash etapa 1 "profissional" (PR #129, sem regra nova):** enquete/caixa no visor e na prévia do criador no padrão do
  Instagram (cartão branco, faixa `--band` na cor com a pergunta em branco, pílulas, barra animada na cor; Escuro = cartão
  escuro; Diário não muda); lugar/#/@ no 1º estilo com texto em degradê (`GRAD_FIG`, DOM `.fig-grad` e canvas). **Mesmo PR,
  lista nova dele:** resposta da caixa vira FIGURINHA (`compartilharRespostaNoFlash` → cartão PNG transparente como `t.ft`
  estilo 3 = pronto, fundo em degradê; "Trocar o fundo" não apaga); ⋯ das Visualizações = `abrirOpcoes` (Enviar mensagem,
  Ver perfil, Ocultar); **barra do tempo por requestAnimationFrame** (`animarBarra`; o categoria.css desliga transições com
  "remover animações"); tempos: foto 5 s, com enquete/caixa/publicação/link 10 s, legenda longa +3 s, máx. 15 s, vídeo o
  tempo dele; **voltar/Esc/X no criador**: painel aberto fecha só o painel (`fecharPainel`), com conteúdo abre "Sair do
  flash?" (Salvar como rascunho / Descartar / Continuar editando; com essa folha aberta, voltar = continuar); **rascunhos**
  no aparelho (IndexedDB `hf-flash-<uid>`, até 10: `guardarRascunho/lerRascunhos/apagarRascunho/abrirRascunhos`, pílula
  "Rascunhos · N" no cartão vazio, reabre foto/posição/filtro/figurinhas/pincel/menções ocultas; publicar apaga o rascunho);
  **desfazer** (↶ `.flash-desfazer`, `marcar()` antes de cada mudança, até 40 passos; lixeira mostra "toque para desfazer").
  Testes `t-flash-figurinhas.mjs`, `t-flash-rascunho.mjs`.
- **Flash: responder no chat, voltar ao flash e fotos sem menu (02/11/2026, PR depois do #129, sem regra nova):**
  Responder uma resposta da caixa de perguntas (atividade do flash e `verRespostasCaixa`) = `responderNoChat(uid, cartao)`
  (rede.js): garante a conversa, guarda o cartão em `hf-cartao-pendente` e abre a GAVETA do chat (`chat-gaveta.js`) por cima,
  com o cartão `{tipo:"caixa", pergunta, resposta, cor, itemTipo f|d, itemId, autorId}` (`cartaoRespostaCaixa`) pronto; a
  pessoa escreve e envia lá (cartão + texto). mensagens.html: `cartaoCaixa` (faixa da cor + resposta + "Ver flash/publicação"),
  barra pendente "Respondendo: …", resumo "💬 Caixa de perguntas: …"; na gaveta, `?conversa=` abre sem passo no histórico
  (um voltar fecha e volta ao flash). **voltar.js:** `.hfc` virou `div.hfc` (a gaveta do chat também é `.hfc` e ficava
  como camada sempre aberta: 2 voltar para fechar). chat-gaveta tira o foco do iframe ao fechar. **Voltar ao flash:** ao
  sair da página com um flash aberto (`pagehide`, `_flashAtual`) ou por `irParaPerfil`, guarda `hf-flash-volta` {id, pagina};
  `voltarAoFlash()` (feed.js e usuarios.html; também no `pageshow` da memória do navegador) reabre o mesmo flash se a
  navegação é "voltar". Atalho **Salvar rascunho** no criador (`.flash-salvar-rasc`, aparece com algo feito). Bolinhas
  de cor com espaço para o anel. **`sem-menu-imagem.js`** (firebase.js, rede.js, categoria.js, mensagens.html): segurar
  foto/vídeo/canvas não abre "Copiar/Baixar/Compartilhar imagem" em nenhuma página (pedido dele; campos de texto normais).
  **Barra de flashes nacional:** `carregar()` lia os 400 MAIS ANTIGOS do país (24 h); agora só de quem você segue
  (`autorId in` 30 por consulta + criadoEm, índice existente autorId + criadoEm desc; sem ele, os 300 mais novos).
  Teste `t-flash-respostas.mjs`.
- **Flash: editor na figurinha, rascunho e voltar dos perfis (02/11/2026, PR depois do #130, sem regra nova):** prints
  dele (Instagram). Enquete e caixa de perguntas editadas NA PRÓPRIA FIGURINHA (`editorVivo(tipo, t)` em stories.js,
  `.flash-fig-viva`): cartão no meio da parte que o teclado deixa à vista, pergunta escrita na faixa colorida (`.fv-perg`),
  opções nas pílulas e a tracejada "Adicionar outra opção..." vira opção ao digitar (`.fv-nova`; Backspace na vazia tira a
  partir da 3ª), botão colorido em cima troca a cor a cada toque (`.fv-cor`, ordem de `CORES_FIG`), pílulas embaixo:
  Anônima e "Termina em 24 h ▾" (1/6/12/24 h). `seletorCor`/`previaFig` saíram. Atalho de rascunho pergunta antes
  ("Quer salvar como rascunho?": Salvar e continuar / Salvar e sair / Cancelar); "Rascunhos · N" acompanha quando apaga
  (`abrirRascunhos(aoAbrir, aoMudar)`). **Voltar ao flash depois de abrir um perfil:** `irParaPerfil` não fecha mais o
  visor antes de trocar de página (o passo do histórico era desfeito junto); vindo de uma lista (Mencionados,
  Visualizações) espera o passo dela sair antes de navegar; `window.__hfNavegando` (rede.js `abrirPerfil`) faz o
  voltar.js não desfazer passo durante a troca; usuarios.html: perfil aberto por `?perfil=` vindo de outra página do site
  fica sem passo próprio (`data-sem-voltar`), então UM voltar volta ao flash; na página de perfis, fechar o perfil reabre o
  mesmo flash (`vaiReabrir`). @ da legenda e lista Mencionados passam pelo visor (`comMencoes(alvo, texto, abrir)`,
  `pessoasEmPilha` `opc.abrirPerfil`, `perfilDoFlash`). **Bug achado:** o flash aberto de dentro de uma folha (foto de
  outra pessoa no perfil) abria POR BAIXO dela; folhas agora sobem de 2 em 2 (`5000 + pilha.length * 2`) e o visor fica
  em cima da folha aberta. Teste `t-flash-editor-vivo.mjs` (22). `t-caixa` (linha 81), `t-diario-compacto` (104) e
  `t-social2` (102) já falhavam antes, iguais.
- **Flash: limitador, desfazer/refazer, respostas no chat e Responder direto no Mensagens (02/11/2026, PR depois do #131,
  sem regra nova):** prints dele. **Limitador de fotos:** o seletor do celular não limita quantas a pessoa marca; se vierem
  mais do que cabe, `escolherDentre(arqs, max)` abre "Escolha até N fotos" (`.fe-escolha`, as primeiras já marcadas com o
  número da ordem, "N de N", a 5ª não entra, "Usar N"); "Foto por cima" conta as que já estão (`vagas`, botão "mais 2"/
  "4 de 4"). **Desfazer/refazer** (`.flash-hist` no alto do cartão: ↶ · "Desfeito: Mover texto" · ↷; `marcar(rotulo)`,
  `nomeFig(t)`, `renomearUltimo`, `avisarHist`, pilhas `historico`/`refeitos` até 40, Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y; some
  ao arrastar e com painel aberto; apagar na lixeira avisa "Foto apagada · toque em ↶ para desfazer"). **Chat no modelo
  único (como o Instagram):** `cartaoFlash`/`cartaoCaixa` em mensagens.html = `.rsp`: linha pequena ("Você respondeu ao
  flash de Ana"), miniatura compacta 132 px 9:16 (`.rsp-mini`, toque abre; "Flash indisponível" cinza) ou cartão da caixa
  compacto (`a.rsp-cx`), emoji da reação no canto (`.rsp-emoji`) e o texto num balão igual aos outros (`.rsp-txt`, cores
  `--bubble-me/other`); a bolha não tem mais fundo/borda. **Responder (caixa) abre a página de Mensagens de vez**:
  `responderNoChat` → `irParaPagina(url)` (rede.js: fecha as folhas, espera o passo sair do histórico e navega) com
  `mensagens.html?conversa=ID&volta=1` (abre a conversa sem passo próprio: um voltar volta ao flash, que reabre). Teste
  `t-flash-limite-desfazer.mjs` (18); `t-flash-respostas`, `t-flash3`, `t-voltar` atualizados.
- **Flash: topo, caixa em foco, câmera direto e voltar mais rápido (02/11/2026, PR depois do #132, sem regra nova):**
  prints dele. Topo do visor: foto e nome abrem o perfil (`.story-vai-perfil` → `irParaPerfil`), texto do topo em
  `.story-quem-tx` (min-width 0: o "Também em 1 negócio" passava por baixo do avião). **Caixa de perguntas em foco:**
  tocar no campo leva o `.story-cx` para `.story-cx-foco` (fixo, do tamanho do `visualViewport`, cartão no meio acima do
  teclado, `focarCaixa`/`soltarCaixa`/`medirFoco`); topo/rodapé somem (`.cx-foco`); tocar fora devolve. **Criador:** com
  "Abrir a câmera direto", o cartão fica escuro com "Abrindo a câmera…" (`.abrindo-cam`, `hf-cam-ok` no aparelho) em vez de
  mostrar por 1 s a tela Câmera/Galeria. **Voltar de um @/link do flash:** feed.html/usuarios.html têm um script no `<head>`
  que, se `hf-flash-volta` bate e a navegação é "voltar", põe `html.hf-volta-flash` (tela preta, z 4890) até o visor
  abrir (`tirarCapa` em stories.js, 7 s no máximo); feed.js chama `voltarAoFlash()` logo depois do `iniciarRede`
  (antes esperava o Diário carregar). Teste `t-flash-topo-volta.mjs` (11).
- **Flash: Teste (quiz), nome fixo e configurações (02/11/2026, PR depois do #133, MUDA 1 REGRA — não publicada; 16
  partes, 741 testes):** figurinha **Teste** (como o "Teste" do Instagram) = enquete com `enquete.certa` (índice da opção,
  sem `fimEm`; regra `enqueteOk`: `certa` int < opções; x/y agora num regex só para caber no limite de 1.000). Criador:
  pílula "Teste" (verde), `editorVivo("teste")` com letras A–D (tocar marca a certa, `.fv-letra`), uma enquete OU um teste
  por flash; prévia `.fe-teste`. Visor (`blocoEnquete` em rede.js, `teste`): letras, a certa só aparece depois de
  responder (verde ✓, a errada vermelha ✗), % na hora, "Você acertou!"/"a certa era a C", animação `acertou`/`errou`; o
  autor vê "N respostas · X% acertaram"; sem notificação de resultado (`registrarEnquete` pula). Sem as regras:
  `semCamposNovos` tira `certa` e grava como enquete de 24 h (avisa). Topo do visor: linhas extras em `.story-quem-sub`
  (absolutas) — o nome fica na altura da foto. **Configurações do Flash:** cartão "Criar flash" (`flashConfig.modoInicial`
  foto|texto, `perguntarRascunho`, Rascunhos N + "Apagar todos") e textos de Respostas/Atividade atualizados. Teste
  `t-flash-quiz.mjs` (14). Pergunta aberta: o que falha no teclado do app instalado (PWA).
- **Flash: Contagem regressiva + Público do flash (02/11/2026, PR depois do #134, MUDA REGRAS — não publicadas; 16 partes,
  758 testes):** pedido dele "completo e profissional". **Contagem** `stories.contagem {titulo ≤40, fim (5 min a 1 ano),
  cor?, x, y}`: `cartaoContagem(c)` (module-level em stories.js: faixa com o título, "CONTAGEM REGRESSIVA", casas dias/h/min/s
  andando a cada 1 s, "Termina seg. 9 de nov., 14:50", "Terminou! 🎉"), pílula "Contagem" nas figurinhas, `editarContagem(t)`
  (nome na faixa, Dia/Hora com o calendário e relógio do campos.js, atalhos Em 1 hora/Hoje 20h/Amanhã 20h/Em 7 dias, cor),
  `t.ct` no criador (não vai desenhada, não gira). Visor: `.story-enq.story-ct` (encaixar), quem vê toca "Lembrar-me" →
  `contagem_lembretes/{flash}_{uid}` {flashId, autorId, uid, titulo, fim, criadoEm} (regra: confere título/fim/autor no
  flash com get; lê a pessoa e o autor; apaga a pessoa); o autor vê "N pessoas pediram lembrete" (count + lista). Aviso no
  sino: `lerReacoesFlash` (flash-avisos.js) junta os lembretes que acabaram (até 7 dias) como tipo `flash` com `contagem`
  (`textoFlash` → "· a contagem “X” terminou ⏰"). Conta apagada: conta.js e limpar-contas apagam os lembretes.
  **Público do flash** `stories.alvo` (mesmo formato de `diario.publico`): botão `.flash-alvo` (ícone alvo) na barra de cima
  do criador abre `escolherPublico` (publico-tela.js, `ajuda.sub` "Quem vê este flash"; `ajudaPublico` exportado do rede.js),
  dica embaixo mostra o público, rascunho guarda. Quem vê: `podeVer` → `noPublico` (`combinaPublico` com `leitorAgora()`:
  dados da conta + lugar escolhido + posição). Regras: `flashNovos2Ok` dentro de `extrasFlashOk` (contagem: chaves, título,
  fim; alvo: só as chaves) — para caber no limite de 1.000, x/y da enquete e da caixa viraram um regex só e saíram
  conferências repetidas (tamanho das opções, tipo da pergunta). Sem as regras: `semCamposNovos` tira contagem/alvo e avisa.
  Teste `t-flash-contagem.mjs` (16); `t-flash-cfg` atualizado ("Criar flash").
- **Deslizar para o Flash, avisos e regiões (02/11/2026, PR depois do #134, sem regra nova):** `deslizar-flash.js` (sem deps):
  deslizar o dedo para a direita abre o criador do Flash (indicador "Novo flash" com anel que enche; abre ao passar de
  ~110 px). Só no toque, com a conta entrada, começando a 28 px da borda (a borda é do "voltar" do celular) e até 70% da
  tela, ignorando campos/vídeo/canvas, listas que rolam para o lado (`overflow-x` auto/scroll), `[data-sem-deslizar]`,
  qualquer janela aberta (`CAMADAS`) e conversa aberta (`body.chat-aberto`). Ligado pelo `montarBarra` (barra-rede.js: Diário,
  Explorar, Mural, Mensagens, Perfil, Notificações), mensagens.html e inicio.js. Abre na hora com `window.__hfAbrirFlash`
  (feed.js e usuarios.html); nas outras vai para `feed.html?novoFlash=1`. **Avisos (toasts)** iguais em todas as páginas
  (`.toast`, `.vt-toast`, `.cm-toast`, `.ad-toast`, mensagens/social): `width: max-content`, até 440 px, centralizados,
  `text-wrap: balance`, entrada suave; número fica junto da palavra seguinte (`(R\$|\d)\s+` → espaço fixo); no Flash
  ficam embaixo, acima do rodapé (`bottom: 92px`). Contagem: dia e hora com `minmax(0, …)` (cortava a hora). Público →
  Estados: atalhos das 5 regiões (`REGIOES`, toque põe/tira, acesa quando completa). Teste `t-deslizar-flash.mjs`.
- **Deslizar entre abas, app mais rápido e campo do chat no app (02/11/2026, PR depois do #135, sem regra nova):** pedido
  dele: o Flash pelo gesto só no Diário; nas outras abas da barra, deslizar troca de aba. `deslizar-flash.js`: dedo para a
  ESQUERDA = próxima aba, para a DIREITA = anterior; no Diário (1ª aba) para a direita = Flash (`window.__hfAbrirFlash`,
  feed.js). Aba atual = link `aria-current="page"` da `#barraRede`, troca clicando nele. Carrossel só bloqueia se ainda rola
  para o lado do gesto (`examinar`/`podeRolar`, folga 8 px: o trilho do Explorar para em 2 px). Início e Notificações sem gesto.
  Selos "⚡ Flash" e "⚡ Flash de X" (repost) saíram do topo do visor. **Service worker** (sw.js `hf-app-3`/`hf-arq-1`): `?v=` e o SDK do gstatic vêm do
  aparelho (cache-first; versão nova apaga a velha, até 500), imagens/json do site stale-while-revalidate, páginas da rede com
  navigation preload; registrado também em 127.0.0.1 (testes: `navegador({ sw: true })` +
  `PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1`). Medido com 4G lento simulado: perfil 9,7 s → 0,9 s, mural 5,1 → 0,4,
  Diário 8,6 → 0,4 (páginas já visitadas). **Campo de mensagem sumido no app instalado:** mensagens.html `--vv` agora é
  sempre a altura visível (`min(innerHeight, vv.height)`) e, se o rodapé ainda sair da tela, encolhe o que falta
  (`__hfMedirTela`, também ao abrir a conversa) — causa no aparelho dele não reproduzida aqui (provável 100dvh errado no app).
  `nav.mjs` acha sozinho o Chromium 1243. Testes `t-deslizar-flash.mjs`, `t-sw-rapido.mjs`.
- **Gestos estilo Instagram, prerender, envio duplo e enquete (02/11/2026, PR depois do #136, sem regra nova):**
  `deslizar-flash.js` refeito: a página (`main.pagina` ou `.app`) acompanha o dedo e a aba vizinha aparece ao lado
  (`.df-painel` com ícone e nome; no Diário para a direita = painel azul "Novo flash"); solta depois de 1/3 da tela ou com
  deslize rápido (> 0,45 px/ms e > 30 px); sem aba para o lado, "estica" 44 px e volta; Diário ↔ Explorar entra pelo outro
  lado (mesma página). **Prerender** (`preparar`, speculation rules `immediate`, só Chrome; até 4 por página): a página de
  destino é preparada quando o gesto trava e no toque num item da barra. No teste o prerender não liga (o roteamento do
  Playwright desativa), então não foi medido. `marcarVista` espera `prerenderingchange` (página preparada não conta vista).
  Barra: `:active` com escala e `touch-action: manipulation`. **Chat:** o teclado Android devolvia a palavra para o campo
  depois de enviar e o 2º toque mandava duas vezes: `ultimoEnviado` (2 s), `limparEco` em input/compositionend/keyup e
  depois de 0/120/400 ms; mesmo texto na mesma conversa em 2 s não sai de novo. Enquete do autor: "1 voto · só você vê até
  acabar" numa linha com "Ver votos"; "Visto por N | ★ N" com divisória e rostos 24 px. Testes `t-deslizar-flash.mjs` (deslize
  rápido com toques sintéticos: o CDP manda devagar demais), `t-chat-eco.mjs`.
- **Páginas mais rápidas: cópia do aparelho primeiro + código fora do HTML (02/11/2026, PR depois do #137, sem regra nova):**
  medido com `_testes/medir-rapido.mjs` (2ª visita, 4G simulado 150 ms/1,6 Mbit/s, service worker ligado): Mensagens
  3,4 → 0,9 s, Perfil 1,75 → 0,7 s, Diário 1,5 → 1,0 s. Causas: (1) o HTML do Mensagens tinha 388 KB (código e estilo
  dentro da página, e página sempre vem da rede) → `mensagens-app.js` + `mensagens.css` e `usuarios-app.js` (saíram do
  HTML; o service worker guarda pelo `?v=`; páginas agora 40 KB e 14 KB); (2) leituras em fila no servidor antes de
  mostrar algo → `rapido.js` (sem deps): `docRapido(fb, ref, aoAtualizar)` = `getDocFromCache` na hora + servidor por trás;
  `docsRapido(fb, consulta, chave, aoAtualizar)` só usa a cópia se a consulta já trouxe algo antes (marca `hf-rapido-*`).
  `iniciarRede` (rede.js): conta e perfil público em paralelo pela cópia; as gravações (sincronizar o público, busca,
  e-mail novo) só com a versão do servidor; quando ela chega, `dados` é atualizado no mesmo objeto e dispara `hf:dados-conta`.
  Mensagens: perfil, conta e bloqueios juntos pela cópia (antes 3 esperas seguidas). **Ao mexer no código do Mensagens ou
  do perfil: os arquivos agora são `mensagens-app.js`/`mensagens.css`/`usuarios-app.js`** (o HTML só tem a marcação).
- **Rede social numa página só (02/11/2026, PR depois do #138, sem regra nova):** decidido com ele: página única SÓ na parte
  social; vitrines/institucionais continuam páginas separadas (Google, links). `rede.html` + `rede-app.js` (casca): 4 quadros
  (iframes) que carregam UMA vez — feed (Diário + Explorar, trocam por dentro com `window.__hfTrocarAba`), mural, mensagens,
  usuarios; trocar de aba = mostrar outro quadro (rolagem e estado ficam), os que faltam carregam sozinhos com a tela parada
  (`carregarOutros`, 1 a cada 2,5 s). API `window.__hfShell` (definido no `<head>` do rede.html): `ir(k)`, `atual` (getter
  com defineProperty), `marcou(k, w)` (barra-rede `marcarBarra`), `destinoDe(href, w)` ("aqui" | aba | null), `vizinho`,
  `comecar/mover/terminar` (deslize: as DUAS abas andam juntas, a vizinha aparece de verdade; no quadro o gesto usa `screenX`).
  Histórico: sair da aba inicial = 1 passo (`hfPasso`), entre as outras só troca; dentro da rede o feed não cria passo ao
  trocar Diário/Explorar. Quadro escondido recebe `__hfGavetaAberta = false` + `hf:gaveta` (o Mensagens não marca lido).
  `quadro-rede.js` (sem deps): `casca()` (parent === top com `__hfShell`), `ligarQuadro()` (barra-rede `montarBarra` e
  mensagens-app.js): na rede, link para outra aba troca de aba, o resto (vitrine, perfil de outra pessoa, notificações)
  abre no próprio quadro (`_top` das gavetas vira o quadro); fora da rede, os itens da barra levam a `rede.html?aba=`.
  feed/mural/mensagens/usuarios.html abertos SOZINHOS e SEM parâmetros vão para a rede (script no `<head>`; com parâmetros
  — post, perfil, conversa, flash — ficam sozinhos). Proteção anti-embutir das 31 páginas aceita a casca (`hfRede`);
  mensagens/ajuda/suporte: na rede = `na-rede`, não `embutido`. Login/conta dentro do quadro → a página inteira. **Testes:**
  `nav.mjs` grava `hf-sem-rede` (páginas sozinhas, como antes); `navegador({ rede: true })` liga a rede. Teste `t-rede.mjs`.
- **Sino enxuto (02/11/2026, PR depois do #140, sem regra nova; 6 índices novos, agora 20 na tabela do LEIA-ME):**
  decidido com ele: FICA no sino = seguidores, estrelas, comentários/respostas, marcações, republicações, resultado de
  enquete, contagem regressiva que terminou, Social, reclamações, avaliação de você como cliente, plano e suporte/avisos.
  SAIU (fica só na página de origem) = mensagens (número no ícone do Mensagens continua; categoria "Mensagens" saiu de
  `CATEGORIAS`), pedidos/orçamentos (cartões no Mensagens), estrelas/reações do Flash (Atividade do flash; `lerReacoesFlash`
  agora só lê os lembretes de contagem), respostas da caixa (aba "Novas" da caixa), reações em comentários e avaliação boa do
  negócio (bolinha "N novas" no cartão do Meus negócios: `novasBoas`, `hf-aval-visto-<uid>`, marcado no `pagehide`).
  `sino-fontes.js` (sem deps): `fontesDoSino`, `lerFonte`/`ouvirFonte` = só as 30 mais novas por fonte (`orderBy criadoEm desc`),
  e sem o índice (`failed-precondition`) cai na consulta antiga (60 sem ordem); usado em rede.js (ao vivo), painel-avisos.js e
  categoria.js. **Na rede (rede.html) só UMA aba ouve o sino:** `S.sino` em rede-app.js (`virarDono`, `assinar`, `publicar`,
  `marcarVistos`, `largar`; a dona sai no `pagehide` e outra assume); rede.js `ouvirAvisos` → dona (`ligarAvisos`,
  `window.__hfSinoDono`) ou assinante (`__hfSinoRecebido`). Antes: até ~860 documentos por página × 4 abas; agora até ~240 uma
  vez. Emulador é HTTP/1.1 (6 conexões por endereço, cada aba do Firebase segura 2): a 4ª aba da rede às vezes não conecta no
  teste — no Firebase de verdade é HTTP/2. Testes `t-sino-enxuto.mjs`, `t-sino` (atualizado), `t-flash-destaques`,
  `t-correcoes-social` e `t-caixa` (este já parava antes na linha 81, no "Responder" antigo).
- **Vistas em lote + "já vi" na conta (03/11/2026, PR #141 mesclado, sem regra nova):** `marcarVista` (rede.js) põe a
  vista numa fila (`filaVistas`) que sai numa gravação só (writeBatch) a cada 6 s, com 20 na fila ou quando a página some
  (`visibilitychange` hidden, `pagehide`, aba escondida na rede = `hf:gaveta`). Mesmo documento `diario/{id}/vistas/{uid}`.
  Lote recusado (vista que já existia) é dividido ao meio até isolar a recusada. "Já vi" agora é da CONTA:
  `usuarios.vistos` (últimas 400, gravada ao esconder a página e no máximo 1×/min junto com os lotes) + `hf-vistas-<uid>`
  no aparelho (a chave antiga `hf-vistas`, por aparelho, passa para a 1ª conta que abrir); `juntarVistosDaConta` no
  `montar` do iniciarRede. Outro aparelho não tenta gravar de novo e o Diário desce o já visto nos dois. Obs.: o Firestore
  cobra cada documento do lote; o ganho é menos envios/bateria e nenhuma gravação repetida entre aparelhos. Teste
  `t-vistas-lote.mjs`. `t-social2` para no `.flash-ferr-btn.letra` (antes da conferência da vista), igual sem a mudança.
- **Anti-spam do Diário e do Flash (03/11/2026, PR depois do #141, MUDA REGRAS — não publicadas; 16 partes,
  762 testes):** Diário (feed.js): `POR_AUTOR = 3`; `buscarSeguindo` corta em 3 por pessoa (`limitarPorAutor`) e, se 1–2
  pessoas encheram as 20 do lote de quem você segue, lê o lote de novo SEM elas (só nesse caso); `ordenarPrincipais`:
  cada publicação a mais da mesma pessoa ×0,55 e só as 3 melhores de cada pessoa por leitura (as suas não contam).
  Publicar no Diário já tinha limite de 20/dia (`ritmo.js` + `ritmoOk('pub')`). **Flash:** tipo `flash` no `ritmo`
  (50/dia; `LIMITES.flash`, chave `flash` só vai quando é flash — com as regras do ar as outras ações continuam), regra
  `ritmoOk('flash')` no create de `stories`; `gravar` (stories.js) usa `comRitmo` e, com as regras de antes
  (permission-denied), grava sozinho como antes. Para caber no limite de 1.000 do "flash com TUDO junto", x/y do
  `linkFlashOk` viraram um regex só. Teste `t-antispam.mjs`; `t-vistas-lote` agora espalha os autores.
  **Mesmo PR: novas não ficam embaixo das antigas** (ele via as que acabou de postar abaixo de outras velhas; reproduzido:
  publicação de 40 h com 12 estrelas e 6 comentários em 2º, acima das novas). `ordenarPrincipais`: engajamento com
  retorno decrescente (`Math.log1p(eng + 2×comentários)`, antes contava cheio), **frescor** até 24 h para o que não foi
  visto (até ×3,5, cai ao quadrado), idade ÷ (h+2)^1,3 (quem você segue 1,2; antes 1,1), segue ×1,6, as suas ×12 nas 3
  primeiras horas. Já vista continua ×0,3 (por isso, depois de aparecer na tela, a nova desce). Outras pessoas: a lista
  dos recentes fica 3 min no aparelho (`DIARIO_VALIDADE`), então uma publicação nova dos outros pode levar até 3 min para
  aparecer. Teste `t-diario-recentes.mjs`. `t-auditoria-diario` para na linha 150 (`Reforma completa`), igual antes.
- **Seguindo + "Você está em dia" (03/11/2026, PR depois do #142, sem regra nova):** pedido dele (comparação com o
  Instagram). Filtro **Seguindo** (`FILTROS.seguindo`, `buscarSeguindoCrono`): só quem você segue (sem você), em ordem de
  data, sem nota e sem limite por pessoa; 20 por grupo de 30 pessoas (índice autorId + criadoEm, o mesmo de sempre); a página
  para no ponto em que todos os grupos cheios estão completos (`cursorSeguindo` = o mais recente dos "mais antigos" dos grupos
  cheios) e "Ver mais" continua com `criadoEm <` (nada pulado nem repetido). **Você está em dia** (Principais, `comEmDia` +
  `cartaoEmDia`): novidades = de quem você segue, não vistas, até 3 dias (e as suas das últimas 3 h) vêm primeiro, com a
  descoberta nos lugares 3, 8, 13 e no máximo 2 da mesma pessoa nas 10 primeiras (se só sobrar novidade da mesma pessoa, entra
  assim mesmo); depois o item `{_emDia}` (`.feed-em-dia`: check, "Você está em dia", "Ver as anteriores de quem você segue" →
  Seguindo, título "Sugestões para você") e o resto na ordem de sempre. Só aparece se você segue alguém e há sugestões depois;
  não entra no "Ver mais" nem nos filtros de tipo. Teste `t-seguindo.mjs`; `t-diario-justo` carrega até 20 cartões.
- **Sino rápido (03/11/2026, PR depois do #143, sem regra nova):** print dele com o painel do sino em "Carregando..." por
  muito tempo. Causa: `carregar()` do painel-avisos.js fazia ~10 esperas em fila (conta → fontes → enquetes → plano → flash →
  miniaturas → quem eu sigo → perfis). Agora: tudo num `Promise.all` (a conta é uma promessa compartilhada por suporte e
  enquetes), miniaturas sob demanda pelo `ganchos.miniatura` e nomes/fotos pelo `ganchos.perfis` (docsPorIds), "Seguir de
  volta" chega depois (`lista.redesenhar`). **Cópia da lista no aparelho** `hf-sino-lista-<uid>` (até 120 itens, fotos `data:`
  grandes ficam fora, 7 dias): o sino abre com ela na hora ("· atualizando…") e a do servidor redesenha; a página
  notificacoes.html também pinta a cópia antes dos ouvintes. A busca começa no `pointerdown` do sino. sino-fontes.js lembra
  6 h o índice que falta (`hf-sino-sem-indice`, vai direto à reserva). enquetes.js: as 2 listas de votos em paralelo.
  Medido (`t-sino-rapido.mjs`, emulador + 4G simulado): 1,85 s → 0,84 s na 1ª abertura e 0,08 s com a cópia.
- **Etapa A do servidor (03/11/2026, PR depois do #144, MUDA 1 REGRA — não publicada; 16 partes, 769 testes):** pedido dele
  ("deixa pronto para o Blaze"). Cloud Functions novas (functions/index.js): `montarRankingDiario` (onSchedule a cada 15 min:
  lê as publicações de 48 h, `diario_notas`, conta vistas e comentários das 400 mais promissoras e grava `ranking_diario/br` e
  `ranking_diario/uf_XX` {itens, cidades: {ibge: [...]}, atualizadoEm}; cada item é TEXTO "id|autor|nota×1e6|estrelas|soma|
  comentários|vistas|criadoEm|ibge" — o Firestore não aceita lista dentro de lista; conta em functions/diario-ranking.js
  `notaServidor`: log do engajamento × fator da TAXA interações÷vistas (prior de 30 vistas) ÷ idade^1,3, 3 por pessoa) e
  `conferirMensagem` (onDocumentCreated conversas/{c}/mensagens/{m}: tempo de resposta em `servidor_atendimento/{conv}`
  {de, desde} → `perfis_publicos.respostaServ` {media, n, em}, que as regras já não deixam o dono gravar; pedido conferido com
  o negócio → `mensagem.conferencia {ok, avisos, total, em}`; functions/seguranca-chat.js). `montarRankingAgora` só no emulador.
  Site: `ranking-diario.js` (`lerRanking` lê br + uf, 5 min no sessionStorage `hf-rk-*`, lista > 90 min ou sem permissão =
  null e `hf-ranking-sem` 30 min/6 h; `juntarRanking` cidade 20 + estado 25 + Brasil 45, o resto vai para o "Ver mais";
  `fatorTaxa`). feed.js `buscarPrincipais`: com o ranking lê as publicações dele (docsPorIds, `_srv` com os números) + 20
  recentes do país + quem segue + republicações; `ordenarPrincipais` não lê estrelas nem conta comentários das `_srv` e
  multiplica por `fatorTaxa`. `servidor.js`: `FUNCOES_LIGADAS = false` (virar true depois do deploy: "Responde rápido" só
  com `respostaServ` e o Mensagens para de gravar o tempo) e `respostaDoPerfil` (vitrine e Mensagens). Chat: `.pd-conferido`
  "Valores conferidos" / alerta com os avisos do servidor (assinatura da mensagem inclui a conferência). Passo a passo dele:
  `_regras/SERVIDOR-LEIA-ME.md` (deploy só das 2 funções: as do pagamento pedem os segredos). Teste `t-servidor.mjs` (36).
  Próximas etapas combinadas: B) notificações com o app fechado (FCM), C) TURN das ligações, D) Storage + migrar fotos.
- **Etapa B do servidor – notificações com o app fechado (03/11/2026, PR depois do #145, sem regra nova):** FCM.
  Site: `push.js` (`pushDisponivel` = `PUSH_VAPID` em servidor.js + PushManager; `estadoPush` ligado|desligado|bloqueado|
  instalar (iPhone sem app instalado)|indisponivel; `ativarPush` pede a permissão, `getToken` do firebase-messaging com a
  registration do NOSSO sw.js, grava `usuarios.pushTokens` [{t, em, app}] ≤5 + `pushPref.ligado`; `desativarPush` só este
  aparelho; `salvarPrefPush` (categorias mensagens/chamadas/seguidores/publicacoes/social/avisos, false desliga);
  `renovarPush` 1×/dia pelo firebase.js; `enviarTeste` → callable `pushTeste`). `usuarios` é livre para o dono: sem regra.
  Configurações: item "Notificações no celular" → `#folhaPush` (CSP do configuracoes.html libera a URL das Functions).
  sw.js: `push` (só `data` {titulo, texto, url, tag, categoria, urgente}; url fora do site vira notificacoes.html; com a
  mesma página à vista e focada fica silenciosa) e `notificationclick` (foca a janela ou abre). Servidor (functions/push.js
  conta + index.js): `avisarPush(uid, tipo, dados)` (pref, bloqueios nos 2 sentidos, limite `push_estado/{uid}` para
  estrelas 10 min/seguidores 5 min por tag, `sendEachForMulticast`, tira tokens mortos; no emulador grava `push_teste`).
  Gatilhos: mensagem (dentro do `conferirMensagem`), `pushChamada`/`pushChamadaPerdida`, `pushSeguidor`, `pushEstrelas`,
  `pushComentario` (resposta e comentário), `pushMarcacao` (diario create), `pushSocial` (vinculos), `pushAvisoEquipe`
  (avisos), `pushSuporte` (suporte/{id}/mensagens com `equipe: true`). Falta ele: gerar a chave Web Push (pública) e
  mandar; deploy (`_regras/PUSH-LEIA-ME.md`). Teste `t-push.mjs` (24). FCM real não deu para testar daqui (rede bloqueada).
- **Etapa C do servidor – TURN das ligações (03/11/2026, PR depois do #146, sem regra nova):** Cloudflare Realtime TURN.
  `functions/turn.js` (`lerServidores` tira portas 53 e o que não é stun/turn, aceita os 2 formatos; `limiteDia` 60/dia;
  `urlCloudflare` .../v1/turn/keys/{id}/credentials/generate-ice-servers) + callable `credenciaisTurn` (segredos
  CF_TURN_KEY_ID/CF_TURN_TOKEN, ttl 4 h, `turn_uso/{uid}` {dia, n}; no emulador `TURN_API` no .env.local). Site:
  `servidor.js` `TURN_LIGADO = false`; `chamadas.js` `servidoresIce()` (callable com 8 s, nunca segura mais de 3,5 s,
  sessionStorage `hf-turn` {iceServers, ate} ou {falhou: +10 min}; quem liga pede junto com o microfone, quem recebe pede
  enquanto toca) e `iniciarConexao(..., turn)`. CSP de TODAS as páginas com connect-src libera a URL das Functions
  (chamadas.js roda em todas pelo firebase.js). Corrigido: a campainha fechava o AudioContext duas vezes (erro na página).
  Falta ele: criar o TURN no Cloudflare, segredos e deploy (`_regras/TURN-LEIA-ME.md`) e avisar para virar true.
  Teste `t-turn.mjs` (19). `t-registro-chamadas` falha no "separado por dia" também sem a mudança (depende da data).
- **Etapa D do servidor – Storage e fotos antigas (03/11/2026, PR depois do #147, sem regra nova):** callable `migrarFotos`
  (só `admins/{uid}.papel` dono; {colecao, depois, simular, lote ≤60}; lê por `__name__`, sobe cada data:image com token
  `firebaseStorageDownloadTokens` e cacheControl 1 ano na pasta do storage.rules, link no formato do getDownloadURL;
  `update` com `lastUpdateTime` (editado no meio = fica para a próxima); em `usuarios` troca junto o `perfis_publicos` com o
  mesmo link). `functions/migrar-fotos.js`: `COLECOES` usuarios, perfis_publicos, negocios (foto, capa, fotos, itens[].foto),
  anuncios, diario (mediaUrl + midias, a repetida é uma só), stories, comunidade; `fotosDoDoc`, `documentoNovo`, `lerData`.
  Painel → Publicações → "Passar fotos para o Storage" (`migrarFotosStorage` em admin-secoes.js: simula tudo, confirma com
  o total por lugar, passa com andamento, `registrar("migrar_fotos")`). `firebase.json` ganhou `storage.rules` (deploy
  --only storage), `cors.json` (GET/HEAD para helpfloripa.com.br, www e uni-lux.github.io; obrigatório porque o Flash desenha
  fotos com crossOrigin) e STORAGE-LEIA-ME com os passos 4b (CORS) e 6 (migração). Mensagens do chat NÃO são migradas.
  `USAR_STORAGE` continua false até ele ativar. Teste `t-migrar-fotos.mjs` (19); `t-storage` e `testes-storage` (47) passam.
  **As 4 etapas do servidor (A–D) estão prontas, todas desligadas até o Blaze.**
- **Figurinhas do Flash no negócio e no repost (03/11/2026, PR depois do #148, sem regra nova):** relato dele: as figurinhas
  só funcionavam no flash de quem criou. Causas: o perfil do negócio usava um visor leve à parte (`abrirVisorNegocio` em
  flash-negocio.js: só a foto e o link) e o repost só levava a foto do original. Agora: `abrirFlashesDoNegocio(n, {comecarEm,
  aoFechar, lista})` em stories.js abre o visor COMPLETO com `negocio` {id, nome, foto, tipo} (topo com o negócio, `.story-por`
  "por Fulano", foto/nome levam ao perfil do negócio); `window.__hfVisorNegocio` = ela onde o stories.js está carregado
  (Diário, perfis); nas vitrines o anel (`anelNegocio`) vai para `feed.html?flash=ID&negocio=UID_tipo` (feed.js lê o negócio
  e, vindo de outra página do site, fechar faz `history.back()`); o visor leve ficou só de reserva. **Repost:** o visor lê o
  original 1× (`s._orig`, como o postDe) e `figurinhasDe(s)` junta as figurinhas que o repost não tem (enquete/teste, caixa,
  contagem, link, toques de lugar/#/@) com o id do ORIGINAL (voto, resposta e lembrete contam lá; a contagem usa o `meu` do
  original); "Ver votos"/atividade só nas do próprio flash. Criador do repost: foto do original parada (`fotoFixa`) e aviso de
  quais figurinhas vão junto. Teste `t-flash-figurinhas-negocio.mjs` (17); `t-flash-neg` atualizado (visor completo e texto
  "Também em 2 negócios", que já falhava antes).
- **E-mail confirmado obrigatório + logo no login + apagar conta (03/11/2026, PR depois do #149, MUDA 1 REGRA — não publicada;
  16 partes, 775 testes):** pedido dele (alguém entrou sem confirmar o e-mail). firebase.js `barrarSemEmail`: conta de
  e-mail e senha sem confirmar vai para `verificar-email.html?continuar=` de QUALQUER página (recarrega o login antes; a
  página fica invisível enquanto confere; na rede troca a página de cima), menos `LIVRES_SEM_EMAIL` (verificar, login,
  cadastro, termos, privacidade, ajuda, contato, diretrizes, segurança, sobre, como-ordenamos, 404/link/offline). login.js já
  manda para lá. verificar-email.html sem "Continuar sem confirmar", com aviso, 3 passos e "Sair e entrar com outra conta";
  verificar.js: espera no botão (`hf-reenvio-ate`, 60 s; "muitos envios" = 5 min). `anotarEmail`: 1 gravação por sessão de
  `usuarios.emailConfirmado` (valor do token) + `emailConferidoEm`; regra `emailConfirmadoOk` (só o valor verdadeiro do login).
  Painel: selo `seloEmail` na lista (coluna E-mail) e na ficha, filtro "E-mail não confirmado" (`usuarios where
  emailConfirmado == false`), linha "Confirmação do e-mail", Excel com a coluna, botão **Apagar conta** (só dono, não a
  própria nem da equipe; 2 confirmações, digitar APAGAR) → callable `apagarConta` (functions/index.js; limpeza em
  `scripts/limpeza/limpeza-conta.mjs` `criarLimpeza`, a MESMA do limpar-contas.mjs, copiada para functions/ no predeploy e no
  emulador.sh; registro `apagar_conta`). Sem o Blaze o botão explica que falta o servidor. **Logo nova** (imagem dele) recortada
  com fundo transparente: `logo-login.webp`/`logo-login-360.webp`/`logo-login.png`; `.logo-acesso` no topo do cartão no celular
  (tema claro = versão clara `logo-login-claro-preto*.webp`/`.png` (escolhida por ele em 03/11: letras "HELP" e frase azul-marinho #0b1b2a, quadrado da ponte com fundo PRETO #0a0f14→#000 e a ponte branca; antes era azul #0b4fc8→#05184e, arquivos `logo-login-claro*` apagados), sem cartão; as duas imagens no HTML com `loading="lazy"`, `.logo-escura`/`.logo-clara`, só a visível baixa) e na coluna da marca no computador, em login, cadastre-se, verificar-email e conta;
  acesso.css v=3. Teste `t-email-confirmado.mjs` (26).
- **Revisão do Painel › Usuários (03/11/2026, PR depois do #151, MUDA 1 REGRA — não publicada; 16 partes, 780 testes):**
  pedido dele ("procure bugs e brechas"). (1) A correção das linhas desalinhadas (`display: flex` no `td` da coluna E-mail)
  NÃO tinha entrado: o #151 foi mesclado antes do último commit; reaplicada (bloco `.ad-email-cel` dentro do `td`).
  (2) "Todos" e "Último acesso" (`orderBy` em criadoEm/ultimoAcesso) deixavam de fora quem não tem o campo ("9 de 10"):
  no fim da lista `pagina()` completa com `perfis_publicos` sem ordem (limit 2000, `completou`). (3) E-mail "—": contas
  antigas sem `usuarios.email`; `anotarEmail` (firebase.js) grava o e-mail do login junto. (4) **Brecha:** `usuarios.email`
  era livre para o dono (dava para pôr o e-mail de outra pessoa e o painel mostrava/buscava por ele): regra `emailDaContaOk`
  (= `request.auth.token.email`, sem diferenciar maiúsculas). Conferidos sem problema: planilha (texto vai como texto,
  nunca fórmula), e-mails só para moderação (regras + `pode("moderar")`), fotos só de origens do site, sem `innerHTML` com
  dados das pessoas, ações destrutivas conferidas nas regras/servidor. Teste `t-painel-usuarios.mjs` (8).
- **Acesso sem login fechado ao máximo (03/11/2026, PR depois do #153, MUDA REGRAS — não publicadas; 16 partes, 783 testes;
  Storage 48):** pedido dele ("sem conta dá para ver o menu lateral: é brecha?"). Conferido: todas as páginas da plataforma já
  levavam ao login e as regras já recusavam ler sem login (exceto `nicknames`). Abertas sem login ficam SÓ as de ler: termos,
  privacidade (obrigatórias antes do cadastro), ajuda, contato (quem não consegue entrar), segurança, diretrizes, sobre,
  clientes, profissionais, sócios, como-ordenamos, login/cadastro, 404/link/offline. Feito: `auth-guard.js` (página escondida
  até confirmar o login) também em admin, configuracoes, conta, feed, mensagens, mural, negocios, notificacoes, social, suporte,
  usuarios e verificar-email (antes mostravam o esqueleto da tela); limite de 8 s (nunca fica escondida para sempre) e
  `window.__hfIrLogin` = UMA navegação só (a página e a proteção mandando para endereços diferentes ao mesmo tempo TRAVAVAM a
  aba: mensagens-app.js, verificar.js, social.html, rede.js, admin.js, conta-pagina.js usam ela); `sairDaConta` marca
  `window.__hfSaindo` para a proteção não redirecionar junto. Menu sem conta (`PUBLICAS_MENU`, `data-so-conta`, `ehVisitante`
  em menu.js): só as páginas públicas, "Criar conta grátis", ícone de pessoa; sino escondido no topo (categoria.js). Regras:
  `nicknames` get livre (cadastro confere o @, link.html) e list só com login; storage.rules: leitura só com login (os links com
  token continuam abrindo). Teste `t-sem-login.mjs`. `t-voltar` já falhava antes (janela "complete sua cidade" na frente).
- **Arrastar figurinhas do Flash (03/11/2026, PR depois do #154, sem regra nova):** prints dele ("mal consigo mover").
  Causa: cada movimento chamava `pintarTexto`, que remontava a figurinha (enquete/caixa/contagem) embaixo do dedo; a enquete
  podia ir para fora do cartão (só o centro era limitado) e ficar pela metade; ouvintes no `window` em fase de bolha
  (um `stopPropagation` de pointerup deixava a figurinha "presa"). Agora (stories.js): `moverFig` (só left/top/transform) e
  `ajustarTam` (só tamanho) num quadro por vez (`requestAnimationFrame`), `limitar` (enquete/teste/caixa/contagem inteiras e
  entre as faixas, igual ao `encaixar` do visor; as outras com o meio no cartão), `afastarDosBotoes` (soltou embaixo da
  coluna da direita ou da barra de cima = vai para o lado), guias vertical e horizontal com vibração, lixeira pelo dedo
  (`.no-lixo` encolhe a figurinha com `scale`), `.segurando`, área de toque 14 px maior (`.flash-txt::after`), ouvintes em
  captura e `zerarGesto` no 1º dedo de um toque novo (`isPrimary`). Enquete/caixa/contagem continuam só arrastando (tamanho
  fixo no visor; mudar exigiria campo novo nas regras). firebase.js: "complete sua cidade" abria para quem tem cidade
  (a leitura da conta vinha com a gravação do e-mail pendente, só com esses campos): agora relê do servidor
  (`getDocFromServer`) quando `fromCache`/`hasPendingWrites`. Teste `t-flash-arrastar.mjs` (15). `t-flash-contagem` (linha 60),
  `t-flash-mencoes` (73) e `t-flash-limite-desfazer` ("Você respondeu") falham igual sem a mudança.
- **Flash: 2ª leva dos prints de 03/11 + varredura geral (PR depois do #155, sem regra nova):** (1) zoom da página travado
  com o criador aberto (`travarZoom` em stories.js: viewport `maximum-scale=1, user-scalable=no` no documento E na página de
  cima da rede.html; `.flash-criar { touch-action: pan-x pan-y }`), volta ao fechar; (2) toque parado numa figurinha engole o
  `click` seguinte (o painel abria embaixo do dedo e o mesmo toque escolhia um negócio: o link "trocava sozinho"); painel do
  link: "Fechar" só fecha, `.lk-atual` com "No flash agora" + "Tirar o link" (desfazível), dica "o seu ou o de outra pessoa";
  (3) feed.js abre `?flash=`/`?repostar=`/`?novoFlash=1` logo depois do `iniciarRede` (antes esperava o Diário) e o feed.html
  cobre de preto (`hf-volta-flash`) até o criador/visor abrir; (4) repost mostra no criador as figurinhas interativas do
  original (`doOriginal`, `pintarOriginal`, `.flash-orig` sem toque); menção OCULTA com as regras do ar não fica em `mencoes`
  (`semCamposNovos`) → repostar explica que precisa das regras novas; (5) visor: `empilhar`/`separar` (módulo + visor) tira
  enquete/caixa/contagem/link de cima uma da outra (ResizeObserver refaz quando a enquete cresce); criador faz o mesmo nas
  prévias do original. **Conta incompleta ao entrar (bug de verdade):** o `anotarEmail` gravava (merge) sem a conta na cópia
  do aparelho e as leituras de logo depois (firebase.js e rede.js, até `getDocFromServer`) vinham só com 3 campos: a janela
  "complete sua cidade" abria para quem tem cidade, a cidade não convertia ("Sua cidade" sumia do Local, público por estado
  falhava) e a conferência de conta desativada olhava um doc incompleto. Agora o `anotarEmail` lê a conta antes de gravar e a
  conferência lê do servidor (espera a gravação se ainda vier incompleta); local-conta não pergunta se a lista de cidades não
  baixou (`cidadesDe`). Diário: Publicar espera a foto terminar de comprimir (`preparandoFoto`, prazo 60 s; antes saía o texto
  sem a foto). Testes atualizados (estavam velhos): t-caixa e t-diario-compacto (Responder abre o Mensagens com cartão + texto
  em 2 mensagens; respostas do flash na Atividade `.vv-resp`), t-publico-reels e t-auditoria-diario (máx. 3 por autor),
  t-social2 (botão de letra), t-tipos-pub (aviso usa espaço fixo `\u00a0` entre número e palavra), t-flash-figurinhas-negocio
  e t-caixa (responder a caixa tocando e digitando: `fill` direto foca sem o toque e a caixa muda de lugar), t-flash-respostas
  (seed.mjs cria mensagem no futuro; espera até 10 s). Teste novo `t-flash-correcoes3.mjs` (21). Varredura: 51 testes, 937
  verificações; só `t-email-confirmado` falha no "apagar conta" (precisa de `FUNCOES=1`) e `t-enquete-escala` precisa de
  `FS_PORTA=8086` (medidor).
- **Deslizar da rede + Diário/Flash rápidos + criar (04/11/2026, PR depois do #156, sem regra nova):** o Perfil NÃO
  deslizava: `deslizar-flash.js` contava qualquer `[aria-modal='true']` como janela aberta e as folhas do usuarios.html
  ficam no HTML com aria-modal mesmo fechadas → `camadaAberta()` (ignora folha fechada/invisível). rede-app.js: durante o
  deslize a barra de baixo fica parada (`copiaDaBarra`: cópia com o estilo calculado por cima dos quadros, a de dentro
  some; o item acende na metade, `acenderNaCopia`), sombra na aba que entra (`.hf-quadro.entra`) e a animação termina na
  velocidade do dedo (`terminar(vai, v)`, 140–320 ms). Diário: não espera mais a posição (`prepararLeitor` síncrono;
  `esperarPosicaoSePrecisa` só com público "perto"), Flash começa junto com a lista de quem segue, cópia da última lista
  (`hf-diario-ultimos-<uid>`, 8 ids lidos do cache do Firebase) aparece na hora e a do servidor entra por trás (se a
  pessoa já rolou, mantém e põe o resto embaixo), voltar do Explorar não recarrega (`feedAtual`, 4 min; `carregarFeed({forcar})`).
  Fileira do Flash na hora (`hf-flash-barra-<uid>`, ids e horários; anel `_leve` espera a leitura ao tocar, `.carregando`).
  Botão do topo do Diário: lápis com brilho num quadradinho em degradê (`i-criar`, `.tc-ic`), não o "+" das outras redes.
  Nova publicação: trocar o tipo NÃO abre a galeria nem o teclado (`mudarTipo(t, {abrir:false})`); Foto/Vídeo sem arquivo
  mostram o quadro `#pubEscolher`. Testes `t-deslizar-rede.mjs`, `t-diario-rapido.mjs`.
- **Rede rápida, cubo e ajustes (04/11/2026, PR depois do #157, sem regra nova):** **causa da lentidão do Diário/Explorar/
  Flash dentro da rede:** `firebase.js` usava só cache na MEMÓRIA em qualquer iframe (`embutidaNoSite`), e na rede.html cada
  aba é um iframe → tudo vinha do servidor a cada abertura (e a cópia do aparelho do PR #157 não funcionava lá). Agora
  `naCascaDaRede` (pai = topo com `__hfShell`) usa o cache do aparelho; gaveta do chat continua só memória. Medido no teste
  (servidor atrasado 4 s): publicações 0,45 s e fileira do Flash 0,5 s (antes: só depois do servidor). Diário sem cópia no
  aparelho: as 5 mais novas (`limit(5)`) aparecem antes da lista completa. Flash: anéis guardados com nome/foto (só https)
  (`perfisBarra`, `pessoas` em `hf-flash-barra-<uid>`); tocar num anel ainda sem fotos lê só os flashes dele
  (`flashesNoArDe`) e abre só ele. **Cubo:** troca de aba na rede (`pintarCubo` em rede-app.js, perspective + rotateY,
  quadro a quadro com rAF) e troca de pessoa no Flash (`.story-face` com a 1ª foto da próxima pessoa, `pintarFaces`/
  `girarAte`; toque para a próxima = `entrarCubo` com Web Animations) — funcionam com as animações do celular desligadas
  (prefers-reduced-motion só desliga CSS). "Reels" virou **Vídeos** (textos; ícone `i-reels` trocado por um celular com play;
  nomes internos `reels` continuam). Ícones sem azul: lápis do topo (`.tc-ic`) e `#pubEscolher .ic` nas cores do tema. Trocar
  o tipo da publicação só avisa se sair algo escrito (enquete/caixa vazias saem caladas). Barra de baixo: `:hover` só no
  mouse (`@media (hover: hover)`, ficava preso depois do toque) e item atual sempre azul com fundinho (rede.css,
  mensagens.css, barra-rede.js). Teste `t-rede-cubo.mjs` (16).
- **Diário rápido de verdade (04/11/2026, PR depois do #158, sem regra nova):** o cache do aparelho nos quadros da rede
  (PR #158, `naCascaDaRede`) foi DESFEITO: com as 4 abas disputando o cache (multi-tab) e as fotos dentro dos documentos, o
  Diário levou 158 s (`Failed to obtain primary lease` sem parar). Quadros da rede = só memória, NÃO religar. Medido com
  fotos reais (`carga-seed.mjs` + `carga-fotos.mjs doc`) e 4G simulado (`_testes/medir-rede.mjs`: 4 Mbit/s, 120 ms;
  `BYTES=1` mostra quem baixa o quê por quadro): antes 48–56 s até a 1ª publicação. Causa: tudo baixando junto (60
  publicações com foto, o sino com as marcações em publicações com foto, o Flash e as outras 3 abas da rede). Agora:
  1º só as 4 mais novas (`limit(4)`, sozinha, até 9 s) e elas aparecem; depois a lista completa por trás; o sino
  (`ouvirAvisos`) e a leitura do Flash (`montarStories(alvo, {esperar})`) esperam `primeirasPublicacoes` (ou 5 s); a rede só
  carrega as outras abas depois de `__hfShell.conteudoPronto()` (feed) ou 10 s. Resultado: 3 s até a 1ª publicação, mural
  5,6 s. A solução definitiva é o Storage (fotos fora dos documentos).
- **Flash como o Instagram (04/11/2026, mesmo PR):** tocar num anel guardado (`_leve`, só id) abre o visor NA HORA
  (antes esperava a fileira inteira com todas as fotos); `carregarFlash(s)` lê só aquele `stories/{id}` quando vai
  aparecer (rodinha `.story-lendo`; sumiu/venceu = pula), `adiantar` lê o próximo (desta pessoa ou o 1º não visto da
  próxima) e decodifica a foto por trás (`prepararFoto`); encostar o dedo no anel (`pointerdown`) já começa a baixar.
  **Campo da foto do flash é `midia` (+ `tipo` video), não `mediaUrl`** — a face do cubo do PR #158 usava `mediaUrl` e
  aparecia vazia (o teste também usava o nome errado). Medido (fotos reais, 4G): fileira 1 s, visor 0,16 s, 1ª foto 3,8 s,
  próximo flash 0,02 s. Teste `t-flash-rapido.mjs`.
- **Abas da rede sem cubo, ícone dos Vídeos e chip de mencionados (04/11/2026, PR depois do #159, sem regra nova):**
  pedido dele: trocar de aba na rede (rede-app.js `pintarDeslize`) é um deslize reto, as duas abas andam juntas, sem giro;
  o cubo ficou SÓ no Flash (trocar de pessoa) e o Diário → Flash continua igual. Ícone `i-reels` (Vídeos) refeito: tela
  vertical com furinhos de filme e play (o claquete ficava igual ao do Instagram). Chip "Mencionados" do visor com 40 px
  e o mesmo recuo do "Visualizações"; em celular comprido ficava metade em cima da foto e metade fora: `encaixarLinha`
  (stories.js) sobe a linha para dentro da foto; mede por offsetTop/offsetHeight (o getBoundingClientRect errava na
  animação de abrir/cubo) e refaz com ResizeObserver. Testes `t-rede-cubo.mjs` (atualizado) e `t-chip-mencao.mjs` (4 tamanhos).
- **Flash nos negócios organizado (04/11/2026, PR depois do #161, sem regra nova):** prints dele. (1) **Anel do negócio
  sem recarregar:** `flash-negocio.js` guardava a lista de cada negócio para sempre na página (na rede o Perfil fica aberto):
  agora 60 s (`VALIDADE`), `ligados` (fotos com anel) e `avisarFlashNegocio(ids)` (stories.js chama ao publicar e ao apagar)
  pinta de novo na hora e avisa as outras páginas/quadros por `localStorage` `hf-flash-negocio-mudou` (evento storage, 1,2 s);
  ao voltar a aparecer (`visibilitychange`/`hf:gaveta`) confere o que venceu. Sem flash no ar, o anel sai e o toque na foto
  volta a abrir o perfil do negócio (`alvo._fnLista`). (2) **Botão da vitrine no flash do negócio** (`.story-vitrine`: Ver
  serviços/cardápio/produtos/imóveis, Ver perfil e agendar): `abrirFlashesDoNegocio(n, {aoVitrine})` → no perfil
  (usuarios-app.js) fecha o flash e abre `abrirPerfilNegocio` ali; vindo da vitrine (feed.js `daVitrine`) só fecha (volta);
  sem `aoVitrine` vai para `linkNegocio`. (3) "Também em N negócios": o `font: inherit` deixava 16 px e cortava; agora 12 px;
  no flash visto pelo negócio só o dono vê, com "Também em mais N lugares". `.story-por` menor. (4) Figurinhas de @/lugar/#/
  hora saem INTEIRAS na foto (o canvas mede a letra mais larga que o DOM e a ponta ficava cortada): `desenharCamada` prende o
  centro dentro e o `limitar` do criador faz igual. `vitrine.js?tipo=X&v=60` à mão. Teste `t-flash-negocio-anel.mjs` (11).
- **Puxar para atualizar + barra de baixo (04/11/2026, PR depois do #162, sem regra nova):** pedido dele (prints do
  Instagram). `puxar-atualizar.js` (`ligarPuxar({aoAtualizar, area, rolagem, conteudo, escuro, ativo, topo, campos})`): só
  no toque, no topo da rolagem, sem janela aberta (`camadaAberta` agora exportada do deslizar-flash.js) nem `body.travado`;
  decide o sentido nos primeiros 10 px (para o lado = troca de aba, não puxa); círculo `.pa-ind` que se completa até 72 px
  e gira por rAF; a página (`main`) desce junto; `overscroll-behavior-y: contain` tira o puxar do navegador. Ao soltar,
  `buscarDeNovo()` (leituras.js: por 12 s `docsComValidade`/`docComValidade`/`docsPorIds` vão ao servidor). Ligado em:
  Diário (`carregarFeed({forcar})` + `atualizarBarraFlash` do stories.js) e Explorar (`recarregarExplorar`) no feed.js,
  Vídeos (reels.js `encher(true)`, área = `.reels`, círculo claro), Comunidade (mural.js `carregar` + `pintarTudo`) e Perfil
  (usuarios-app.js: `esquecerFlashesNegocio` + negócios, números e publicações). **Barra de baixo:** o cartão
  "Estatísticas do perfil" colado nela parecia uma 2ª barra: fundo 97% + desfoque e esmaecido `body.com-barra::after`
  (128 px, rede.css e barra-rede.js), padding-bottom 92 px. Teste `t-puxar-atualizar.mjs` (17).
- **Anel do flash por classe, sem o retângulo do toque e puxar no Início/vitrines (04/11/2026, PR depois do #163, sem regra
  nova):** prints dele. `flash-negocio.js`: anel na cor da classe (`COR_TIPO`, `--fn-cor` no avatar; visto continua cinza).
  Toque: `-webkit-tap-highlight-color: transparent` em `html` (sem-menu-imagem.js + categoria/rede/info/acesso/mensagens.css).
  **Puxar para atualizar** também no Início (inicio.js: `buscarDeNovo`, tira `hf-totais-inicio`, `localSecoesP = null`, chama
  `carregar` de novo; o botão do Perto de você liga uma vez só, `bt._ligado`) e nas vitrines (vitrine.js `atualizarVitrine`:
  zera listas/donos/planos/notas, `esquecerFlashesNegocio`, `carregarLote(true)`; o que está na tela fica até a lista nova
  chegar). Esqueletos no formato do cartão (capa, foto, linhas: `.mini.esqueleto i.sk-*` e `.vt-esqueleto i.sk-*`, 6 na
  vitrine). Teste `t-anel-puxar-inicio.mjs` (dedo fora do campo de busca: dentro de campo o puxar não liga).
  `t-puxar-atualizar` às vezes falha no "Perfil: ainda não está na tela" (tempo; passa rodando de novo, igual no main).
- **Comparação sem × com Storage (26/10/2026, pedida por ele):** `_testes/gerar-fotos.py` (JPEGs reais: post 176 KB,
  perfil/logo 34 KB, foto 89 KB) + `carga-fotos.mjs doc|storage` (por cima do carga-seed; lotes de 8, o emulador recusa
  envio > 4 MB) + `t-storage-compara.mjs` (4G simulado 10 Mbit/s, 70 ms; leituras, MB do Firestore, MB de fotos, LCP, memória).
  Resultado: Início 32,5 MB do Firestore (≈26 s no 4G, memória 336 MB) → 0,18 MB + 2,5 MB de fotos (27 MB de memória);
  Explorar 745 → 26 MB de memória; sessão de 8 páginas 164 MB → 13,4 MB (Firestore 1,1 MB). Sem Storage o cache do
  aparelho não funciona (as listas não cabem no localStorage) e a 2ª visita baixa tudo de novo. No teste a 2ª visita
  baixou as fotos de novo (o cache do navegador não segurou), mesmo com `Cache-Control: immutable` vindo do emulador.
- **As 5 etapas estão concluídas.** Próximos passos são as pendências abaixo (só ele pode fazer) e o que ficou
  para depois.

## Etapa 4 – Moderação, suporte e avaliações (muda regras)
1. Avaliações: liberar também para quem tem vínculo aceito no Social (hoje `!vinculados` bloqueia, em
   `match /avaliacoes` → `doCliente()`); manter uma por pessoa em cada negócio, conta com 3 dias e os dois terem
   conversado. O negócio avaliando um cliente mostrou "Não foi possível avaliar. Confirme seu e-mail", mas a
   causa pode ser outra: investigar e mostrar o motivo real (avaliacoes.js).
2. Denúncia no painel mostrando o conteúdo completo como apareceu (texto, foto, áudio, cartão de avaliação) e
   algumas mensagens antes e depois. Hoje aparece só "Mensagem (...): (avaliacao)". O aviso tem "Cancelar" e
   "Fechar" fazendo a mesma coisa.
3. Avisos da equipe hoje só aparecem como janela ao abrir o site (`avisosDaEquipe` em firebase.js) e a resposta do
   suporte não gera notificação. Fazer: avisos e respostas do suporte na página de Notificações e no número do
   sino e do ícone de mensagens; tocar leva ao chamado; a equipe pode abrir uma conversa de suporte com qualquer
   usuário, que aparece como "Suporte Help Floripa" com selo oficial.
4. Tela de atendimento do negócio profissional: horário por dia, pausa de almoço, ausência com data de volta.
   O aviso de ausente e o horário precisam aparecer para todos que conversam com o negócio, inclusive quem tem
   vínculo com ele (hoje não aparecem para essas pessoas). Atendimento hoje: `perfis_publicos.atendimento`
   (`atendimentoOk()` nas regras), configurado em mensagens.html (`pintarConfigAtendimento`).

## Etapa 5 – Regras e conferência final
Rodar todos os testes de regras, entregar o firestore.rules final dividido em partes (formato acima) e,
depois que ele publicar, verificar o site inteiro (incluindo conversa individual, anexos, citar e reações do
chat da equipe).

## Como as coisas funcionam (para não redescobrir)
- **Campos novos em documentos públicos antes da Etapa 5**: as regras do ar recusam. Padrão usado:
  `gravarComLocal(gravar, dados, NOVOS.x)` em `endereco.js` grava com os campos novos e, se vier
  `permission-denied`, grava de novo sem eles (o dado completo fica em `usuarios/{uid}`, que é livre para o dono).
  `local-conta.js` completa o público sozinho depois da publicação. Siga o mesmo padrão na Etapa 4.
- **Regras**: limite de 1.000 expressões por gravação. Tabelas/mapas grandes estouram; use regex.
  Sempre conferir nos testes que não aparece "maximum of 1000 expressions".
- `endereco.js`: Estado, Cidade do IBGE (`municipios/{UF}.json`, com população para ordenar sugestões), CEP
  (ViaCEP), `resolverCidade()` para textos antigos, `camposEndereco()` (componente), `textoCidade()`.
- `audio-ondas.js`: player com ondas (onda calculada do áudio e guardada no aparelho, sem campo novo).
- `planilha.js`: Excel em OOXML à mão (capa Resumo, gráfico, tabela com total, A4). Qualquer mudança: validar.
- `mensagens.html`: conversa desenhada aos poucos (`nosConversa`), cartão de avaliação com cache
  (`situacaoAval`). Não voltar a usar `replaceChildren` na lista inteira.
- `admin-chat.js` + `admin.css` (classes `eq-`): chat da equipe estilo mensageiro.
- `admin-secoes.js`: Estatísticas (filtro Estado→Cidade→Bairro via `localDe`), Relatórios, Excel com capa.
- CSP: cada página tem a sua em `<meta>`; `fetch` de `data:` é bloqueado (connect-src).
- **Etapa 4** — `avisos-equipe.js`: avisos (`avisos/`) e respostas do suporte (`suporte/`, `ultimaDe: equipe`)
  como "Suporte Help Floripa" (selo oficial) em notificações, sino, Mensagens e faixa nas mensagens; leitura do
  chamado em `usuarios/{uid}.suporteLido` (sem regra nova); `suporte.html?chamado=` / `?aviso=`. Janela ao abrir o
  site (firebase.js) só para avisos alerta/grave. `admin-denuncia.js`: conteúdo denunciado com contexto (ids em
  `denuncias.contexto`, lidos um a um). `avaliacoes.js`: `podeAvaliarCliente` + `gravarComMotivo` (motivo real,
  renova token). Atendimento (`mensagens.html`): `semana` = lista de 7 textos "HH:MM-HH:MM" ou "" validada com UM
  regex (`join(';')`) — por dia estourava 1.000 expressões; com regras antigas grava compatível no público e
  completo em `usuarios/{uid}.atendimento`, `completarAtendimento()` completa depois.
- `versoes.py` agora falha se o mesmo módulo for importado com `?v=` diferentes (arquivo novo fica fora da troca).
- `scripts/limpeza/converter-cidades.mjs` + workflow manual "Converter cidades" (simula por padrão).

## Lista de prioridades a fazer (pedida por ele em 29/10/2026 — lembrar e propor quando der)
Junta a lista do PR #119 (melhorias do Diário que ficaram de fora do PR #118) com o que faltou nos PRs #120 e seguinte.
**Só ele pode fazer:**
1. **Publicar as regras** (16 partes em `_regras/`, 769 testes; inclui `ranking_diario` da Etapa A): tudo desde 26/10, incluindo o limite diário do Flash, o Teste, a Contagem regressiva e o público do Flash, `republicacoes`, destaques e arquivo do Flash,
   `stories/{id}/reacoes` (estrela do Flash), `diario.publico` (público da publicação) e os tipos de publicação
   (`diario.tipo/estilo/quemComenta/ocultarNotas`). Depois: "Recalcular estrelas" no
   painel e criar os **14 índices** (`_regras/INDICES-LEIA-ME.md`; os novos: `republicacoes` uid + criadoEm e `diario`
   mediaTipo + criadoEm dos Reels). Sem as regras: publicar com público avisa e não publica; a estrela do Flash vai como "⭐"
   pelo Mensagens.
2. **Ligar o Storage** (Blaze): sem ele não há vídeo novo (os Reels ficam vazios e o botão Vídeo fica escondido) e o Diário
   pesa 3,7 MB na 1ª visita (fotos em `data:` dentro dos documentos).
3. **Responder (Parte 1 da visibilidade justa):** no máximo 1 pagante nos 4 cartões depois de cada espaço pago?
4. **Ideias que ele adiou ("depois eu vejo", 29/10):** o 6º cartão do Início no lugar da Comunidade (sugerido: **Ofertas** =
   promoções/cupons dos assinantes, sem regra nova; outras: Aulas e cursos, Eventos) e **Fretes e Entregas** com mapa em tempo
   real (etapas: pedido + propostas → acompanhar ao vivo com Realtime Database → distribuição automática com Cloud Functions →
   passageiros só depois do advogado e de app instalado; ele precisa escolher preço por proposta/estimativa e Mapbox/MapTiler).
**Programação (dá para fazer):**
5. **Quem posta muito toma o espaço dos outros que você segue:** `buscarSeguindo` lê 20 publicações por lote de 30 autores
   (no total). Limite por autor (ex.: até 3 de cada); o jeito certo é um "feed por pessoa" montado no servidor (Cloud Function,
   Blaze); sem Blaze, ler em lotes menores, com custo maior de leituras.
6. **"Já vi" só no aparelho (`jaVisto`):** no computador e no celular a mesma publicação reaparece. Guardar as vistas recentes
   na conta (resumo compacto) ou ler `diario/{id}/vistas/{uid}` em lote.
7. **Engajamento sem contar o alcance:** a nota usa estrelas e comentários absolutos; deveria pesar pela taxa (interações ÷ quem
   viu). Precisa das exibições somadas no servidor (Blaze). Junto: ranking pré-calculado por cidade/estado — hoje os Principais
   escolhem entre só 60 recentes do país + 30 do estado + quem você segue (com muito movimento, só os últimos minutos).
8. **Aba "Republicados" no perfil** (como o Instagram): lista das `republicacoes` da pessoa (`uid ==`) — perguntar se ele quer.
9. **Sino relê tudo a cada página:** os ouvintes do rede.js (`ouvir`, até 100 documentos cada: seguidores, curtidas, comentários...)
   releem em toda página aberta (medido: 30 `relacoes` na 2ª visita do Diário). Ordenar por data e baixar o limite, ou ler só o
   que é novo desde a última visita.
10. ~~Estrela do Flash no sino~~ (feito em 30/10, `flash-avisos.js`).
11. **Reels:** a aba Reels do perfil ainda abre na folha antiga (os vídeos do Explorar e do Diário já abrem nos Reels).
12. **Público da publicação:** (estimativa de alcance FEITA em 29/10; público no Flash FEITO em 02/11); pedir gênero/data de nascimento a quem não tem (contas antigas sem gênero não entram em público por gênero).
13. **Conta apagada:** os flashes e destaques da pessoa já saem (30/10); faltam os `vistos`/`reacoes` que ELA deixou nos flashes dos outros.
14. ~~Revisar a ferramenta "Aa"~~ (feita em 30/10: letras, alinhamento, régua, teclado).
15. **Testes que falham desde antes:** `t-busca-regiao` (2 itens; `t-enquete2` e `t-caixa` passaram em 30/10). Atualizar os testes. Os testes do Diário/Flash precisam do `seed.mjs` antes (dados que sobram atrapalham).

## Escala nacional da parte social (diagnóstico de 02/11/2026, pedido dele: "anote na listinha pra depois")
Hoje aguenta dezenas a poucas centenas de pessoas ativas/dia; NÃO está pronto para escala nacional.
**Só ele (console):** publicar regras (16 partes) + 14 índices; plano Blaze com alerta de orçamento (Spark = 50 mil
leituras/dia ≈ 70 ativos/dia a ~700 leituras por pessoa); Storage (fotos fora dos documentos, vídeo/Reels); App Check.
**Eu, sem Blaze (combinado para começar em 02/11/2026, nesta ordem):** 1) ~~sino lendo só o que é novo + o que fica no sino~~
(FEITO: "Sino enxuto"); 2) ~~vistas (`marcarVista`) gravadas em lote~~ (FEITO);
3) ~~limite de publicações por pessoa no Diário~~ (FEITO, + limite diário do Flash); 4) ~~"já vi" guardado na conta~~ (FEITO junto com o 2).
**Eu, depois do Blaze:** ranking do Diário no servidor (Cloud Function por cidade/estado, taxa de engajamento por alcance);
notificações com o app fechado (FCM); TURN para as ligações; contadores no servidor; mapas/endereços com provedor pago
(Mapbox/LocationIQ) e hospedagem com mais banda (Cloudflare Pages). Também pesa: a rede numa página só abre 4 conexões do
Firebase (uma por aba) e cada uma liga os ouvintes do sino.

## Pendências do dono e o que ficou para depois (vindas de sessões anteriores)
Coisas que só ELE pode fazer (lembrar no momento certo, sem fazer por ele):
- **Pagamento automático (Mercado Pago) — falta ele, na ordem** (passo a passo em `_regras/PAGAMENTO-LEIA-ME.md`; código
  pronto no PR #96, desligado com `PAGAMENTO.automatico = false`):
  1. Mesclar o PR #96 (já liga o Pix com QR na chave CNPJ, conferido à mão no painel).
  2. Ligar o **plano Blaze** no Firebase com **alerta de orçamento** (ex.: R$ 50/mês).
  3. **Webhook** no Mercado Pago (app Help Floripa → Webhooks → URL
     `https://southamerica-east1-helpfloripa-61e0d.cloudfunctions.net/webhookMercadoPago`, evento Pagamentos) e copiar a
     **assinatura secreta**.
  4. **Cloud Shell**: `functions:secrets:set MP_ACCESS_TOKEN` (Access Token de TESTE) e `MP_WEBHOOK_SECRET`, depois
     `deploy --only functions`. Nunca mandar os segredos no chat.
  5. Avisar o Claude → ele muda `automatico: true` e testam juntos com cartões de teste (titular APRO/OTHE/FUND).
  6. Produção: ativar credenciais no MP, trocar o segredo pelo token `APP_USR-` e publicar de novo, mandar a Public Key
     `APP_USR-` (o Claude troca no `planos-base.js`) e fazer um pagamento real com Pix para conferir.
  **Junto com o deploy das Functions (decidido por ele em 28/10/2026, "anota"):** 2 Cloud Functions de segurança —
  (a) "Responde rápido": trigger em mensagens calcula `perfis_publicos.atendimento.resposta` e a regra deixa de aceitar
  o dono gravando esse campo (hoje dá para forjar); (b) pedido do chat montado no servidor a partir de `negocios.itens`
  (o cliente manda só itens/quantidades/cupom; hoje o cartão vem pronto do aparelho, só com o alerta `.pd-alerta`).
  Não fazer paliativo nas regras nem esconder o selo antes disso (ele preferiu esperar o Blaze).
  Depois: a fazer quando ele quiser — parcelamento no cartão, renovação automática (assinaturas) e, no futuro, SLU/LTDA
  para o Pix mostrar "Help Floripa" (hoje mostra a razão social do MEI com o nome dele).
- **E-mails do domínio (lista da semana de 26/10, lembrete trig_01Skdj622NFsQ7wGqJrbK4HC):** imprensa@, privacidade@ (LGPD),
  juridico@ e contato@helpfloripa.com.br redirecionados para o Gmail (Cloudflare Email Routing recomendado, ou ImprovMX).
  Depois trocar no site onde hoje está helpfloripa7@gmail.com (privacidade, contato, sócios, termos).
- **Segredo `FIREBASE_SERVICE_ACCOUNT` no GitHub** (Settings → Secrets → Actions). Sem ele não rodam a limpeza
  automática de contas (`limpeza-contas.yml`), a conversão de cidades (`converter-cidades.yml`) nem relatório
  automático. **Configurar a limpeza automática ANTES de liberar o site ao público** (exclusões pedidas há 30 dias).
- Rodar o workflow manual "Converter cidades" (primeiro simulando, depois de verdade) depois da Etapa 5.
- Testar o Excel no Microsoft Excel do celular dele depois de cada mudança em `planilha.js` (já falhou uma vez).
- **Liberar o site** (tirar o bloqueio de login): só quando ele disser que está pronto.
- **Deixar o repositório privado (ele decidiu fazer DEPOIS, 13/10/2026).** Hoje o repositório é público: o
  `firestore.rules`, o histórico, as notas, os testes e os scripts ficam visíveis no GitHub. Sem `_config.yml`, o
  site provavelmente publica o `firestore.rules` e outros arquivos de trabalho na raiz do site. No plano grátis o
  GitHub Pages não publica repositório privado: antes de fechar, migrar a publicação. Opções explicadas a ele:
  GitHub Pro (US$ 4/mês, nada muda), **Cloudflare Pages (grátis, recomendado)**, Firebase Hosting (grátis, mas
  o deploy automático precisa da chave de conta de serviço como segredo). Ordem para não derrubar o site:
  montar e testar o novo host → apontar o domínio → só então ele torna o repositório privado.
  Também oferecido e ainda NÃO feito: `_config.yml` excluindo `firestore.rules`, `README.md` e arquivos de
  trabalho da publicação. O HTML/JS do site continua visível no navegador de qualquer jeito: a segurança está nas regras.

Ficou para depois da Etapa 5 (combinado com ele, ainda não feito):
- Plano Blaze + Firebase Storage para fotos/áudios/arquivos (hoje vão em `data:` dentro do Firestore, com limite
  de tamanho), App Check (reCAPTCHA) contra robôs, e os índices compostos que o console pedir.
- Planos pagos para negócios e revisar os textos que dizem "grátis" no site.
- Relatório da equipe enviado por e-mail automaticamente (depende do segredo acima).
- Existe um orçamento de custos/preços feito numa sessão anterior (doc no Claude); custos sobem com Blaze/Storage.
