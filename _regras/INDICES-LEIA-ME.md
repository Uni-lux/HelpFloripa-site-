# Índices do Firestore — vitrines por cidade e Diário por região (site nacional)

Com o filtro de **Estado/Cidade** escolhido, as vitrines (Freelances, Delivery, Shopping, Imóveis e Saúde) agora buscam
**no servidor** os perfis daquela cidade. Antes vinham os 48 mais recentes do Brasil inteiro e o filtro era feito no
celular: com muitos negócios no país, quem está em Recife podia ver a vitrine vazia mesmo havendo negócios em Recife.

Para isso o Firestore precisa de **24 índices compostos** (4 das entregas e corridas, 4 das vitrines, 1 do Diário por região, 1 dos Reels, 2 da Comunidade, 2 do registro de chamadas, 1 das Reclamações, 1 das republicações, 2 do Flash e 6 do sino). Enquanto eles não existem, o site continua funcionando
como antes (busca geral + filtro no celular), sem erro para ninguém.

## Como criar (uns 5 minutos, uma vez só)
Console do Firebase → projeto **helpfloripa-61e0d** → **Firestore Database** → aba **Índices** → **Criar índice**.
Crie um por vez, com **Escopo da consulta: Coleção**:

| Coleção    | Campo 1          | Campo 2                 | Campo 3                     |
|------------|------------------|-------------------------|-----------------------------|
| `negocios` | `tipo` Crescente | `uf` Crescente          | `atualizadoEm` Decrescente  |
| `negocios` | `tipo` Crescente | `cidadeIbge` Crescente  | `atualizadoEm` Decrescente  |
| `anuncios` | `tipo` Crescente | `uf` Crescente          | `atualizadoEm` Decrescente  |
| `anuncios` | `tipo` Crescente | `cidadeIbge` Crescente  | `atualizadoEm` Decrescente  |
| `diario`   | `autorUf` Crescente | `criadoEm` Decrescente | — |
| `comunidade` | `uf` Crescente | `atualizadoEm` Decrescente | — |
| `comunidade` | `cidadeIbge` Crescente | `atualizadoEm` Decrescente | — |
| `chamadas` | `de` Crescente | `criadoEm` Decrescente | — |
| `chamadas` | `para` Crescente | `criadoEm` Decrescente | — |
| `avaliacoes` | `tipo` Crescente | `nota` Crescente | `criadoEm` Decrescente |
| `republicacoes` | `uid` Crescente | `criadoEm` Decrescente | — |
| `diario`   | `mediaTipo` Crescente | `criadoEm` Decrescente | — |
| `stories`  | `autorId` Crescente | `criadoEm` Decrescente | — |
| `stories`  | `negocios` Matrizes ("Array contains") | `criadoEm` Decrescente | — |
| `relacoes` | `tipo` Crescente | `alvoId` Crescente | `criadoEm` Decrescente |
| `curtidas` | `postAutorId` Crescente | `criadoEm` Decrescente | — |
| `comentarios` | `postAutorId` Crescente | `criadoEm` Decrescente | — |
| `comentarios` | `respostaAutorId` Crescente | `criadoEm` Decrescente | — |
| `diario`   | `marcados` Matrizes ("Array contains") | `criadoEm` Decrescente | — |
| `republicacoes` | `postAutorId` Crescente | `criadoEm` Decrescente | — |
| `corridas` | `clienteId` Crescente | `criadoEm` Decrescente | — |
| `corridas` | `destinatarioId` Crescente | `criadoEm` Decrescente | — |
| `corridas` | `entregadorId` Crescente | `criadoEm` Decrescente | — |
| `corridas` | `status` Crescente | `paraId` Crescente | `geo4` Crescente |

Mais 5 do **Flash privado** (13/11/2026; sem eles a fileira do Flash não carrega depois de publicar as regras novas):

| Coleção    | Campo 1          | Campo 2                 | Campo 3                     |
|------------|------------------|-------------------------|-----------------------------|
| `stories`  | `autorId` Crescente | `restrito` Crescente | `criadoEm` Decrescente |
| `stories`  | `lista` Matrizes ("Array contains") | `criadoEm` Decrescente | — |
| `stories`  | `negocios` Matrizes ("Array contains") | `restrito` Crescente | `criadoEm` Decrescente |
| `stories_restritos` | `autorId` Crescente | `criadoEm` Decrescente | — |
| `stories_restritos` | `negocios` Matrizes ("Array contains") | `criadoEm` Decrescente | — |

Mais 3 que vêm de antes (confira se já existem; se não, crie também):

| Coleção    | Campo 1          | Campo 2                 |
|------------|------------------|-------------------------|
| `diario`   | `autorId` Crescente | `criadoEm` Decrescente |
| `negocios` | `tipo` Crescente | `atualizadoEm` Decrescente |
| `anuncios` | `tipo` Crescente | `atualizadoEm` Decrescente |

**Jeito rápido (todos de uma vez):** no Cloud Shell, dentro da pasta do repositório, rode
`firebase deploy --only firestore:indexes --project helpfloripa-61e0d`. Ele lê o `firestore.indexes.json` e cria os 32.
Se perguntar se quer apagar índices que existem no console e não estão no arquivo, responda **N** (não).

O 5º índice faz o Diário e o Explorar trazerem também as publicações recentes do seu estado. Os 2 da Comunidade fazem o
Início e o Explorar mostrarem as doações, trocas, quartos e achados mais recentes da sua cidade (e do seu estado). A seção
Os 2 de `chamadas` fazem a aba **Chamadas** (Mensagens) mostrar as 50 ligações mais recentes de cada lado. O de
`avaliacoes` faz a página **Reclamações** mostrar as mais recentes do Brasil em ordem, com "Carregar mais" (sem ele
aparecem 100 de cada nota, sem ordem de data e sem carregar mais). O de `republicacoes` faz o Diário mostrar as
publicações que quem você segue republicou, das mais novas. Os 2 de `stories` são do Flash: o primeiro faz o **Arquivo** mostrar os seus flashes do mais novo para o mais antigo, 12 por vez, e o anel do perfil ler só os flashes daquela pessoa; o segundo faz o perfil de um negócio ler só os flashes dele. Sem eles, o site lê os flashes das últimas 24 h de todo mundo e filtra no celular (mais pesado). Os 6 últimos são do **sino** (02/11/2026): seguidores, estrelas, comentários, respostas, marcações e republicações passam a vir só as 30 mais novas de cada (antes até 100 em qualquer ordem, a cada página); sem eles o sino funciona como antes. O de `diario` + `mediaTipo` faz os **Reels** trazerem os vídeos mais novos do Brasil (sem ele, 60 vídeos sem ordem de data). A seção
"Saúde" do Início usa os índices de `negocios` que já estão na lista. Sem os índices, tudo funciona do mesmo jeito,
só que lê sem a ordem de data (e ordena no celular).
Cada um leva alguns minutos para ficar **Ativado**. Não precisa mexer em mais nada: o site começa a usar sozinho.
(Os mesmos índices estão em `firestore.indexes.json`, na raiz do repositório.)

## Depois
- Rode o workflow **"Converter cidades"** (já estava na lista): ele grava o Estado nos perfis antigos que só têm a
  cidade escrita ("Florianópolis"). Sem o Estado gravado, esses perfis só aparecem no filtro quando estão entre os
  mais recentes.

Testado: `_testes/t-nacional.mjs` (60 perfis novos em SP + 1 em Recife: o filtro Recife mostra o de Recife).
