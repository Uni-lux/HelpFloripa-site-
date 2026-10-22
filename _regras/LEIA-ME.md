# Regras do Firestore — publicação

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
> Para publicar, o processo é o mesmo: apagar tudo no console e colar as 15 partes.

Esta pasta começa com `_`, então o GitHub Pages **não publica** nada daqui. São as regras do
`firestore.rules` divididas em **15 partes** (cada uma com menos de 12.800 bytes, cortadas em fim de
linha), para colar no console do Firebase.

- Arquivo de origem: `firestore.rules` (170.578 bytes, 2.882 linhas, sha256 começa com `cbe73f5129ae5fea`).
- Cada parte termina com a linha `// ===== FIM DA PARTE X DE 15 =====`. É um comentário: **pode colar junto**,
  não atrapalha (os testes rodaram nas regras com e sem essas linhas).
- Conferido: as 15 partes juntas, sem as linhas de fim, são **exatamente** o `firestore.rules`, byte a byte.
- Testes de regras no arquivo remontado: **561 passaram, 0 falharam** (o emulador só cita o limite de 1.000 expressões ao explicar gravações recusadas; os testes "com TUDO junto" provam que as gravações máximas cabem).

## Como publicar (uma vez só)
1. Abra o **console do Firebase** → projeto **helpfloripa-61e0d** → **Firestore Database** → aba **Regras**.
2. Clique dentro do editor, selecione tudo (Ctrl+A, ou "Selecionar tudo" no celular) e **apague**.
3. Abra `parte-1-de-15.txt`, copie **tudo** e cole no editor.
4. Vá até o fim do que colou (depois da linha `// ===== FIM DA PARTE 1 DE 15 =====`), abra a parte 2,
   copie tudo e cole logo abaixo. Repita até a parte 15, **em ordem**.
5. Confira: a primeira linha do editor é `rules_version = '2';` e a última é
   `// ===== FIM DA PARTE 15 DE 15 =====`, logo depois de uma linha só com `}`.
6. Clique em **Publicar**. Se o console mostrar um erro (linha vermelha), **não publique**: provavelmente
   uma parte ficou faltando ou repetida. Confira se as 15 linhas `FIM DA PARTE` aparecem, de 1 a 15, uma vez cada.

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
- **Verificação do perfil:** o pedido vai com a **foto do documento** para a moderação conferir no painel (Verificações),
  e a foto é apagada quando a equipe aprova ou recusa. Antes de publicar, o pedido chega à equipe sem a foto do documento.
- **Trava do selo:** quem é da moderação só consegue dar o selo a quem tem o pedido aprovado (tirar continua livre); só o
  **dono** do site dá o selo direto, sem pedido. O perfil público só mostra o selo se a conta tiver o selo.
- **Saúde e Comunidade:** criar o perfil de Saúde e publicar na Comunidade só funcionam depois de publicar (antes, o
  site avisa que falta publicar as regras). O painel ganha **"Banir de um programa"** na ficha e na denúncia.
- **Busca nacional e Diário por região:** a busca do Explorar, das vitrines e da Comunidade passa a achar negócios e
  anúncios do Brasil inteiro (não só os mais recentes), e as publicações novas guardam a região de quem publica.
  Também crie os índices de `_regras/INDICES-LEIA-ME.md`.
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
