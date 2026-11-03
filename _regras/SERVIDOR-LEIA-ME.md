# Etapa A — Diário no servidor + conferências do chat (precisa do plano Blaze)

O código está pronto e **desligado**. Sem o Blaze o site funciona como hoje. Quando as funções forem publicadas:

| Função | O que faz | Liga como |
|---|---|---|
| `montarRankingDiario` | A cada 15 min monta as melhores publicações das últimas 48 h do **Brasil**, de **cada estado** e de **cada cidade** (`ranking_diario/br`, `ranking_diario/uf_SC`...). Pesa a **taxa** (interações ÷ quantas pessoas viram), não só o número de estrelas. | Sozinho: o Diário passa a usar a lista assim que ela aparece (e volta ao jeito antigo se a função parar por mais de 90 min). |
| `apagarConta` | Botão **Apagar conta** na ficha do painel (só donos): apaga o login e tudo da pessoa, a mesma limpeza da exclusão automática de 30 dias (`scripts/limpeza/limpeza-conta.mjs`). Não apaga a própria conta nem a de alguém da equipe; fica no Registro de ações. | Sozinho, depois do deploy. |
| `conferirMensagem` | A cada mensagem nova: (1) calcula o **tempo de resposta** do negócio no servidor (`perfis_publicos.respostaServ`, que o dono não consegue gravar) e (2) **confere o pedido** do chat com o cardápio, a taxa e a promoção de agora (`conferencia` na própria mensagem: "Valores conferidos" ou o alerta). | A conferência do pedido aparece sozinha. O "Responde rápido" só usa o do servidor depois que o Claude mudar `FUNCOES_LIGADAS = true` (`servidor.js`). |

## 1. Antes
1. **Plano Blaze** com **alerta de orçamento** (Firebase › Uso e faturamento › Detalhes e configurações › Alertas de orçamento; ex.: R$ 50/mês).
2. **Publicar as regras** (`_regras/LEIA-ME.md`, 16 partes): elas trazem a coleção nova `ranking_diario` (quem está logado lê, só o servidor grava).

## 2. Publicar as funções (Cloud Shell)
Abra **console.cloud.google.com**, projeto **helpfloripa-61e0d**, ícone **>_** (Cloud Shell). No celular, use "Versão para computador".

```bash
git clone https://github.com/Uni-lux/HelpFloripa-site-.git
cd HelpFloripa-site-/functions && npm ci && cd ..
npx firebase-tools@13 login --no-localhost
```
(Se já tiver a pasta de antes: `cd HelpFloripa-site- && git pull`.)

Publique **só as duas funções novas** (as do pagamento pedem os segredos do Mercado Pago; ficam para quando você fizer o `PAGAMENTO-LEIA-ME.md`):
```bash
npx firebase-tools@13 deploy --only functions:montarRankingDiario,functions:conferirMensagem,functions:apagarConta --project helpfloripa-61e0d
```
Na primeira vez ele pede para ativar APIs (Cloud Functions, Cloud Build, Artifact Registry, Cloud Run, **Cloud Scheduler**, Eventarc, Pub/Sub): responda **Y**. Se reclamar de permissão do Eventarc na 1ª vez, espere 2 minutos e rode o mesmo comando de novo (é normal no primeiro gatilho do Firestore).

No fim aparecem as duas com ✔.

## 3. Conferir
- Firebase › Firestore › coleção **`ranking_diario`**: em até 15 min aparecem `br` e `uf_XX` (com `atualizadoEm`).
- Google Cloud › Cloud Scheduler: o job `firebase-schedule-montarRankingDiario-...` rodando a cada 15 min ("Forçar execução" roda na hora).
- Mande um pedido de teste pelo chat: o cartão mostra **"Valores conferidos com o cardápio pelo Help Floripa"**.
- Avise o Claude: ele muda `FUNCOES_LIGADAS = true` no `servidor.js` (o tempo de resposta passa a vir só do servidor).

## Quanto custa (estimativa)
- **Ranking:** por rodada lê até 1.500 publicações + 1.500 resumos de estrelas + contagens das 400 mais promissoras (~3.800 leituras no máximo, com o site cheio). 96 rodadas/dia ≈ até 365 mil leituras/dia ≈ **até US$ 7/mês**; com pouco movimento, centavos. Em troca, cada pessoa que abre o Diário deixa de ler as estrelas e de contar os comentários das publicações que vieram do ranking.
- **conferirMensagem:** 1 execução por mensagem (2 milhões grátis por mês), 2–3 leituras e 1 gravação cada.
- Dá para diminuir: em `functions/diario-ranking.js` mude `MAX_POSTS`/`CONTAR` e, em `functions/index.js`, o `schedule` ("every 30 minutes").

## Testar (Claude, no emulador)
```bash
cd _testes && FUNCOES=1 ./emulador.sh     # sobe as Functions na porta 5001
node seed.mjs && FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-servidor.mjs
```
No emulador a função agendada não roda; o teste chama `montarRankingAgora` (só existe no emulador, não publicar).
