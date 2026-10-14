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
