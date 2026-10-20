# Regras do Firestore — publicação

> **Versão de 19/10/2026:** igual à publicada em 13/10, mais **várias fotos numa publicação do Diário**
> (campo `midias`, de 2 a 4 fotos), **dar estrelas na própria publicação** o **resumo das estrelas**
> (`diario_notas`: média e quantas pessoas deram 5, 4, 3, 2 e 1 estrela) e os **comentários novos** (quem pode
> comentar, comentário fixado e reações com emoji), **stories**, **hashtags e marcações**, **agendar**, **rascunhos**,
> **alcance e salvos** (estatísticas), o **aviso de reação** no comentário, **enquetes** (publicação e Flash, votos em
> `enquete_votos`, voto único: não troca nem tira), **menções e configurações do Flash** (respostas, público, amigos próximos, ocultar de),
> **quem pode me marcar** (`pref_publicas`), **duração da enquete** (`fimEm`: votar só até o fim), **enquete anônima**
> (`enquete_anon` + `enquete_contas`), **caixa de perguntas** (`caixa_respostas`, anônima com `caixa_autoria`), **Flash com link para negócio**
> (`stories.link`), **repostar o flash em que você foi mencionado** (`stories.repostDe`) e **flash nos perfis de negócio**
> (`stories.negocios` e `stories.perfil`), **reportar o atendimento do suporte** (`reportes`: só a moderação e os
> donos leem) e a **nota do atendimento** (`suporte_notas`).
> Para publicar, o processo é o mesmo: apagar tudo no console e colar as 12 partes.

Esta pasta começa com `_`, então o GitHub Pages **não publica** nada daqui. São as regras do
`firestore.rules` divididas em **12 partes** (cada uma com menos de 12.800 bytes, cortadas em fim de
linha), para colar no console do Firebase.

- Arquivo de origem: `firestore.rules` (134.042 bytes, 2.354 linhas, sha256 começa com `b8539f192a498f1a`).
- Cada parte termina com a linha `// ===== FIM DA PARTE X DE 12 =====`. É um comentário: **pode colar junto**,
  não atrapalha (os testes rodaram nas regras com e sem essas linhas).
- Conferido: as 12 partes juntas, sem as linhas de fim, são **exatamente** o `firestore.rules`, byte a byte.
- Testes de regras no arquivo remontado: **289 passaram, 0 falharam**, sem o aviso de limite de 1.000 expressões.

## Como publicar (uma vez só)
1. Abra o **console do Firebase** → projeto **helpfloripa-61e0d** → **Firestore Database** → aba **Regras**.
2. Clique dentro do editor, selecione tudo (Ctrl+A, ou "Selecionar tudo" no celular) e **apague**.
3. Abra `parte-1-de-12.txt`, copie **tudo** e cole no editor.
4. Vá até o fim do que colou (depois da linha `// ===== FIM DA PARTE 1 DE 12 =====`), abra a parte 2,
   copie tudo e cole logo abaixo. Repita até a parte 12, **em ordem**.
5. Confira: a primeira linha do editor é `rules_version = '2';` e a última é
   `// ===== FIM DA PARTE 12 DE 12 =====`, logo depois de uma linha só com `}`.
6. Clique em **Publicar**. Se o console mostrar um erro (linha vermelha), **não publique**: provavelmente
   uma parte ficou faltando ou repetida. Confira se as 12 linhas `FIM DA PARTE` aparecem, de 1 a 12, uma vez cada.

> As regras do ar continuam valendo até o clique em Publicar. A troca leva até 1 minuto para valer.

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
- O resto (toque duplo para dar estrelas, quem deu estrelas, Salvos, editar legenda) já funciona com as regras de hoje.

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
