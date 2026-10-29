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
