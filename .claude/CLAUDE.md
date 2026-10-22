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
- **Diferenças entre o documento e o site atual (PERGUNTAR antes de mexer; ele pediu nível nacional nesta mesma conversa):**
  1) atuação só Florianópolis × site inteiro preparado para todo o Brasil (PRs #76–#85); 2) comissão 10–15% × site diz
  "sem comissão" (Termos, Ajuda, Sobre, Profissionais, início, cadastro, login, delivery); 3) cores #000/#111/#0087C2 ×
  tema escuro atual #070b0e/#0f161b/#0093cc (+ tema claro e Automático); 4) título "Bem-vindo à Help Floripa" × "Tudo o que
  você precisa perto de você, num só lugar."; 5) categorias de serviço do documento × as 7 grupos/~27 áreas atuais
  (`GRUPOS_SERV`, "Outra" já fica por último); 6) menu com subtítulo e seções novas × "sem subtítulo" e 4 opções; 7) "painel de
  parcerias" descartado: confirmar se é o painel do admin (Parcerias) ou a página Sócios e parcerias, que hoje existe.
  Documento completo (seções 1–23) recebido em 22/10/2026; versão juntada com a história técnica: documento "Help Floripa —
  História, evolução e diagnóstico" (https://claude.ai/artifact/QygAianAGKf94wMR7T99oW).

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
