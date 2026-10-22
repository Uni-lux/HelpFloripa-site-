# Testes do Help Floripa (só local, não vão para o site)

A pasta começa com `_`, então o GitHub Pages (Jekyll) não publica nada daqui.
Tudo roda no **emulador do Firebase** (projeto `demo-hf`): nenhuma chave de conta de serviço,
nada toca o Firebase de verdade.

## Preparar (uma vez por máquina)
```bash
cd _testes
npm install          # firebase-tools, rules-unit-testing, firebase-admin, playwright-core, validador do Excel
```
Precisa de Java (para o emulador do Firestore) e de um Chromium. O caminho padrão é o do
ambiente do Claude Code (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`); em outra máquina,
use `CHROMIUM=/caminho/do/chrome`.

## Subir (dois terminais, ou em segundo plano)
```bash
./emulador.sh            # firestore 8085, auth 9099 (usa ../firestore.rules)
node servidor-csp.mjs    # site em http://127.0.0.1:5057 com a CSP real, liberando só o emulador
```
O `nav.mjs` abre o Chromium apontando o `firebase.js` do site para o emulador (projeto demo-hf).

## Rodar
```bash
./rodar-tudo.sh pr25     # regressão inteira com as regras que estão no ar (PR #25, commit 7f5a28c)
./rodar-tudo.sh main     # com o firestore.rules do repositório (inclui o chat da equipe e a virada)
node testes-regras.mjs   # só os testes de regras (projeto separado demo-regras)
npm run xlsx             # Excel com casos extremos + validação
```
Capturas de tela, Excel baixados e logs ficam em `saida/` (fora do git).

## Arquivos
| Arquivo | O que faz |
|---|---|
| `seed.mjs` | **Apaga e recria** os dados do demo-hf. Usuários (senha `teste123`): ana, bruno (negócio + imóveis), admin (equipe), dani (equipe, moderação), edu (SP), fabi (cidade antiga "florianopolis"), gui (sem cidade), hele (cidade que não existe). Grava os uids em `saida/seed.json`. |
| `trocar-regras.mjs` | Troca as regras do emulador **sem perder os dados**: `main`, `pr25` ou um arquivo. |
| `testes-regras.mjs` | `@firebase/rules-unit-testing` no projeto `demo-regras` (não apaga o demo-hf). Acrescente os testes de cada etapa aqui. |
| `nav.mjs` | Abre o Chromium (celular ou computador) e entra com um usuário: `entrar(ctx, "ana", "pagina.html")`. |
| `t-chat.mjs`, `t-chat2.mjs` | Chat dos usuários: foco ao enviar, cartão de avaliação (cache, Firebase fora do ar), etiqueta do dia. |
| `t-audio.mjs` | Player de áudio: ondas, pular, 2x, onda guardada. |
| `t-atend.mjs` | Dias do atendimento (horário por dia): salvar, recarregar, mudar em outro aparelho. |
| `t-aval.mjs` | Negócio avalia o cliente pelo cartão do chat, motivo real quando não dá, e cliente com vínculo no Social avaliando o negócio. |
| `t-etapa4.mjs` | Etapa 4: suporte e avisos nas notificações/sino/Mensagens, conversa aberta pela equipe, denúncia com contexto no painel, atendimento com almoço e data de volta (e a faixa numa conversa pessoal). |
| `t-menu-sair.mjs` | Seção EQUIPE no menu (com pendências) e "Sair da conta". |
| `t-equipe.mjs` | Chat da equipe (precisa das regras do main). |
| `t-excel.mjs` | Baixa os Excel do painel; valide com `python3 checar-todos.py saida/excel`. |
| `t-forms.mjs` | Cadastro, editar perfil, endereço com CEP (ViaCEP simulado), negócio e anúncio. |
| `t-local.mjs`, `t-virada.mjs` | Conversão das cidades antigas, janela para completar e a virada regras antigas → novas. |
| `t-saida.mjs` | "Sair da conta?" igual nos três lugares, aviso ao "voltar" que sai do site e do painel (voltar entre páginas do site não pergunta), minha foto e foto da equipe no chat da equipe. |
| `t-painel2.mjs` | Painel no celular: Estatísticas sem contas falsas vindas do registro de ações, nomes do gráfico sem sobrepor e chat da equipe em tela cheia (campo à vista, conversa no fim). |
| `t-diario.mjs`, `t-coment.mjs`, `t-social2.mjs` | Diário: carrossel, estrelas surgindo no toque duplo, barra da publicação (comentar/enviar/compartilhar/salvar), comentários, hashtags, marcar, agendar, Flash ⚡ (criar foto e texto, ver, responder, reagir, quem viu). `t-diario` e `t-social2` usam `saida/foto1.png` (criada pelo `t-diario`). |
| `t-enquete.mjs` | Enquete na publicação (criar, votar, trocar, resultado da autora), Configurações → Diário e Flash (quem marca, quem comenta, Flash) e estatísticas do perfil (`insights.js`). |
| `t-perfil.mjs` | Perfil no tema escuro: rosinha do duo, botões que cabem na tela, negócios numa linha, enquete na aba Textos, toque duplo no texto (só a barra) e voto único. |
| `t-enquete2.mjs` | Enquete com duração (compositor e Flash), prazo, voto bloqueado depois do fim, resultado final com troféu, "Ver votos" e o resultado nas notificações (dono e quem votou), no painel do sino. |
| `t-flash3.mjs` | Flash completo: menção como cartão no Mensagens com "Adicionar ao seu flash" (repost com crédito), figurinha de link para negócio, reação/resposta/enviar como cartão com a miniatura e `feed.html?flash=ID`. |
| `t-flash-neg.mjs` | Flash nos perfis de negócio: "Publicar em" (perfil e/ou negócios), só no negócio não aparece no Diário, anel e visor no perfil do negócio e nas bolinhas de negócio do perfil. |
| `t-flash-cfg.mjs` | Configurações do Flash em cartões (onde publicar por padrão, câmera direto, respostas), "+" com a cor do Flash e borda neutra sem flash. |
| `t-caixa.mjs` | Enquete anônima (voto em enquete_anon + contagem, sem "Ver votos") e caixa de perguntas com nome e anônima na publicação e no Flash: responder, ver respostas, Responder pelo Mensagens e notificações. |
| `t-salvos.mjs` | "+" do Flash na foto do perfil, Seguidores/Seguindo com abas, busca e filtros (não segue de volta, mútuos), Salvos com coleções e ícone dos atalhos do Explorar. |
| `t-negocios.mjs` | Meus negócios: topo com os 4 tipos, cartões dos perfis (completude, compartilhar), cartões de criar com a cor de cada classe e formulário que muda de cor/textos pelo tipo (`dark` ou `light`). |
| `t-insights-neg.mjs` | Perfil de negócio com Instagram, site, CNPJ (validado), horário por dia e promoção/cupom; visitas e ações dos clientes (WhatsApp, Instagram, cupom, imóvel visto) contadas em `neg_stats`; cartão, estatísticas do negócio (KPIs, funil, origens, mapa de calor, Excel) e "Seus negócios" nas estatísticas do perfil. Precisa das regras do main. |
| `t-outra-cat.mjs` | "Outra (escrever)" em Freelances (área), Delivery (categoria) e Imóveis (tipo do anúncio): campo aparece, salvar vazio avisa, o texto vira tag e filtro próprio na página. Com as regras antigas o anúncio salva sem o texto. |
| `t-areas-cupom.mjs` | Áreas de atuação em grupos (busca por palavra, principal, limite de 6), promoção com o calendário do site, selo de cupom nos cartões, filtros das áreas novas, cupom copiado/digitado indo junto no pedido de orçamento até o chat e data de nascimento por ano → mês → dia. |
| `t-previa.mjs` | Chat: segurar o nome do topo abre a prévia do perfil com os negócios, pedir orçamento ali (o cartão volta para a conversa), gaveta do atendimento e "voltar" fechando uma janela por vez. |
| `t-pedido.mjs` | Pedido de delivery de ponta a ponta: carrinho, cupom, endereço, troco e observação; cartão novo no chat (número, etapas, itens, valores); o negócio confirma e avança as etapas; o cliente vê o andamento com a previsão. |
| `t-filtros.mjs` | Botão Filtros das vitrines (gaveta com contagem ao vivo, quartos/preço nos imóveis, etiquetas com x, guardado no aparelho, voltar fecha) e filtro por tipo nos carrosséis do início. |
| `t-anexar.mjs` | Chat: clipe abre a gaveta Anexar (galeria, câmera, localização, endereço, fazer pedido, cartão do meu negócio), voltar fecha, localização vai para o campo e o cartão do negócio fica pronto para enviar. |
| `t-suporte-anexo.mjs` | Suporte com anexos: chamado novo com print, resposta só com PDF, a equipe vê no painel e responde com foto. Com as regras antigas, o chamado vai só com o texto. |
| `t-perto.mjs` | Perto de você: início (pela cidade do perfil e com GPS), vitrine (distância nos cartões, Mais perto, filtro de distância), Explorar (negócios perto e publicações da região) e o ponto do endereço gravado ao salvar o negócio (Nominatim simulado). |
| `t-local-flash.mjs` | Local nas publicações (busca simulada do Nominatim, chip, nome no cartão, feed do lugar) e "Adicionar ao seu flash" (selo "Publicação de X", `postDe`, "Ver publicação" no visor, autor que desligou). |
| `t-planos.mjs` | Planos (Grátis/Pro): cartão em Meus negócios, 90 dias/Excel travados no Grátis, gaveta, pedido + Pix (CRC16 e QR), painel → Planos (ativar com aviso, Ativos), selo e Pro primeiro na vitrine e no perfil do negócio. |
| `t-negocio-sem-regras.mjs` | Os mesmos campos com as regras antigas: grava sem eles, guarda em `usuarios.negociosExtras`, visita sem erro, estatísticas avisam; com as regras novas, os campos vão para o perfil sozinhos. Uso: `git show HEAD:firestore.rules > saida/antigas.rules` antes. |
| `t-campos.mjs` | Janelas do site no lugar das do navegador: lista de opções com busca (Estado), horário com rodas, confirmação (Remover endereço) e "Baixar meus dados" como relatório HTML legível. |
| `t-suporte2.mjs` | Suporte refeito (atalhos, assunto em cartões, conversa com etapas, reportar atendimento, nota, denunciar pela busca), painel (KPIs, reportar a pessoa, Reportes do suporte) e o cartão da publicação no chat. |
| `t-suporte-nacional.mjs` | Suporte nacional: prioridade e prazo antes de enviar, respostas da Central pelo texto ("Resolveu"), limite de 3 chamados; painel: KPIs, filas, Pegar o próximo (trava), nota interna, resposta pronta, 1ª resposta, transferir e escalar. |
| `t-equipe-canais.mjs` | Chat da equipe por canais: canais do papel, Outros canais, entrar/silenciar, Avisos só dos donos, #PROTOCOLO vira cartão, situação (Em pausa), transferir avisa o canal, enviar chamado, encerrar o turno; logo nova e lupa do celular. |
| `t-voltar.mjs` | "Voltar" fecha a janela de cima (comentários, confirmação, lista de Estados), volta para a aba anterior (Diário/Explorar, perfil, seções do painel); "Cobrar resposta" guardado depois de recarregar; cartões de publicação e flash no chat. |
| `t-avisos.mjs` | Janela de aviso nova, comunicado no início, voltar dentro de Ajuda e suporte nas Mensagens (Central de ajuda embutida), rosinha do duo (4 opções, nome menor), registro legível e prévia dos comunicados no painel. |
| `t-verif.mjs` | Verificação do perfil: requisitos (falta/ok), pedido em 4 passos com foto do documento, "em análise" com protocolo, painel (documento, conferências, aprovar/recusar apagando a foto, aviso com motivo, Tirar o selo), selo explicado no perfil e "não aprovado" com motivo; menor de 18 (requisito, explicação, Aprovar travado, motivo "idade"), selo direto só pelo dono (com motivo no registro) e moderação sem "Dar selo". |
| `proxy-contador.mjs`, `carga-seed.mjs`, `t-leituras.mjs` | **Medidor de custo.** O proxy (porta 8086 → 8085) conta o que o Firebase cobraria (documentos lidos por coleção, contagens, gravações, bytes). `carga-seed.mjs` põe volume de site grande por cima do seed (60 pessoas, 400 publicações com foto de 80 KB, 400 negócios, 120 imóveis). `FS_PORTA=8086 node t-leituras.mjs saida/x.json` mede cada página (1ª e 2ª visita), uma sessão inteira e o "Ver mais" do Diário (`SO_SESSAO=1` só a sessão, `CONFERIR_MAIS=1` falha se o Ver mais parar cedo). Rode o `seed.mjs` antes dos outros testes (a carga atrapalha). |
| `t-enquete-escala.mjs` | Enquete para muita gente (`FS_PORTA=8086`, com o medidor): quem não votou não lê a contagem, votar sobe 1 dos 10 pedaços, o resultado é a soma (≤10 leituras, nenhuma contagem no servidor), guardado 90 s, a autora vê os números e "Ver votos" usa a contagem. |
| `t-capa.mjs` | Editor da capa no formato real da capa do perfil, com a foto e o nome marcados. |
| `t-explorar.mjs` | Explorar (etapa 4): busca com abas (Pessoas, Negócios, Hashtags, Publicações) e buscas recentes, hashtag subindo, enquetes abertas, negócios da cidade, sugestões com motivo e dispensar, filtros dos destaques, e tocar numa publicação abre a tela com as parecidas embaixo (rolagem infinita, voltar fecha). |
| `t-principais.mjs` | Diário → Principais (gosto do aparelho + quem segue, sem dois seguidos do mesmo autor), filtros Principais/Amigos, Explorar (em alta, destaques, sugestões, busca) e anel do Flash no perfil. |
| `t-busca.mjs`, `t-estat-local.mjs`, `t-painel.mjs` | Filtro de local da busca, filtros Estado→Cidade→Bairro do painel, topo das Estatísticas no celular. |
| `gerar-xlsx.mjs`, `checar-xlsx.py`, `checar-todos.py` | Gera planilhas extremas e valida: Open XML SDK da Microsoft (Office 2007/2016/365) + consistência (referências, links, mesclas, nomes) + openpyxl. |
| `dividir-regras.py` | Divide o `firestore.rules` em `_regras/parte-X-de-N.txt` (até 12.800 bytes, corte em fim de linha, linha `// ===== FIM DA PARTE X DE N =====`), confere byte a byte e grava os remontados em `saida/` para rodar `node testes-regras.mjs saida/remontado-com-marcas.rules`. |
| `versoes.py` | Aumenta o `?v=` de cada .js/.css alterado (em relação ao HEAD) em todos que o importam, em cascata, uma vez só, e falha se dois arquivos importarem o mesmo módulo com `?v=` diferentes (arquivo novo fica fora da troca automática). Rode antes de cada commit. |

## Cuidados que já custaram tempo
- Documentos "interceptados" pelo Playwright (`route.fulfill` na página) quebram a conexão com o emulador: por isso o `servidor-csp.mjs`.
- Não desligue a CSP nos testes (`bypassCSP`): ela já esconderia erro de verdade (ex.: `fetch` de `data:` é bloqueado no site).
- `usuarios/{uid}` precisa do campo `uid` para ser atualizado (as regras comparam): o seed já grava.
- Regras: o limite é de **1.000 expressões por gravação**; mapas grandes (ex.: tabela de 27 estados) estouram. Use expressão regular.
