# Índices do Firestore — vitrines por cidade e Diário por região (site nacional)

Com o filtro de **Estado/Cidade** escolhido, as vitrines (Freelances, Delivery, Shopping, Imóveis e Saúde) agora buscam
**no servidor** os perfis daquela cidade. Antes vinham os 48 mais recentes do Brasil inteiro e o filtro era feito no
celular: com muitos negócios no país, quem está em Recife podia ver a vitrine vazia mesmo havendo negócios em Recife.

Para isso o Firestore precisa de **5 índices compostos** (4 das vitrines e 1 do Diário por região). Enquanto eles não existem, o site continua funcionando
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

O 5º índice faz o Diário e o Explorar trazerem também as publicações recentes do seu estado.
Cada um leva alguns minutos para ficar **Ativado**. Não precisa mexer em mais nada: o site começa a usar sozinho.
(Os mesmos índices estão em `firestore.indexes.json`, na raiz do repositório.)

## Depois
- Rode o workflow **"Converter cidades"** (já estava na lista): ele grava o Estado nos perfis antigos que só têm a
  cidade escrita ("Florianópolis"). Sem o Estado gravado, esses perfis só aparecem no filtro quando estão entre os
  mais recentes.

Testado: `_testes/t-nacional.mjs` (60 perfis novos em SP + 1 em Recife: o filtro Recife mostra o de Recife).
