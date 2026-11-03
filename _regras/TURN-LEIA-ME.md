# Etapa C — Ligações que conectam em qualquer rede (TURN do Cloudflare, precisa do plano Blaze)

Hoje a ligação vai direto de um aparelho para o outro. Em alguns 4G, redes de empresa e de universidade a rede não deixa
("A rede não deixou conectar"). O **TURN** repassa o áudio e o vídeo nesses casos. Pronto e **desligado**
(`TURN_LIGADO = false` em `servidor.js`).

Como funciona: a cada ligação o site pede à função **`credenciaisTurn`** uma credencial que vale **4 horas** (fica guardada
na aba, então ligar de novo não pede outra). A chave do Cloudflare fica só no servidor. Se o serviço falhar, a ligação
segue pela conexão direta, como hoje, sem esperar mais de 3,5 s. Limite: 60 pedidos por pessoa por dia.

## 1. Criar o TURN no Cloudflare (conta grátis)
1. Entre em **dash.cloudflare.com** (crie a conta se não tiver; não precisa de domínio no Cloudflare).
2. Menu **Realtime** (em algumas contas aparece como **Calls**) › **TURN Server** › **Create** › nome: `help-floripa`.
3. Ele mostra **Turn Token ID** e **API Token**. Guarde os dois e **não mande no chat**: vão direto para o Cloud Shell no passo 2.

## 2. Guardar os segredos e publicar (Cloud Shell)
```bash
cd HelpFloripa-site- && git pull
cd functions && npm ci && cd ..
npx firebase-tools@13 functions:secrets:set CF_TURN_KEY_ID --project helpfloripa-61e0d
npx firebase-tools@13 functions:secrets:set CF_TURN_TOKEN --project helpfloripa-61e0d
npx firebase-tools@13 deploy --only functions:credenciaisTurn --project helpfloripa-61e0d
```
O `secrets:set` pede o valor: cole e aperte Enter (não aparece nada na tela, é normal).
**CF_TURN_KEY_ID** = Turn Token ID · **CF_TURN_TOKEN** = API Token.

## 3. Ligar
Avise o Claude: ele muda `TURN_LIGADO = true` e publica. Para conferir: ligue de um celular no **4G** (Wi-Fi desligado)
para alguém num Wi-Fi de empresa/escola, que é onde mais falhava.

## Custo
Cloudflare Realtime TURN: **1.000 GB por mês grátis**, depois cerca de US$ 0,05 por GB (só o que passa pelo repasse; a
maioria das ligações continua direta). Uma ligação de voz gasta ~0,5 MB por minuto; vídeo ~5–15 MB por minuto.
A função roda 1 vez por ligação (2 milhões grátis por mês).

## Teste (Claude)
`FUNCOES=1 ./emulador.sh` e `FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-turn.mjs` (o teste sobe um Cloudflare de mentira
na porta 5098; o `emulador.sh` já aponta `TURN_API` para ele).
