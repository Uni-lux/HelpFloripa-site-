# Etapa B — Notificações com o app fechado (precisa do plano Blaze)

Pronto e **desligado**. Depois de ligado, a pessoa liga em **Configurações › Notificações no celular** (cada aparelho)
e escolhe o que receber: Mensagens, Ligações, Seguidores, Publicações (estrelas, comentários, respostas, marcações),
Social e Avisos/suporte. Tocar na notificação abre a conversa, a publicação, o perfil ou o chamado.

| Aviso | Quando |
|---|---|
| Mensagem | mensagem nova no chat (nome de quem mandou + o texto, "📷 Foto", "🎤 Mensagem de voz", "🛍️ Novo pedido"...) |
| Ligação | ligação de voz/vídeo tocando (urgente, some em 45 s) e ligação perdida |
| Seguidor, estrelas, comentário, resposta, marcação | iguais aos do sino. Estrelas na mesma publicação: 1 aviso a cada 10 min; seguidores: 1 a cada 5 min |
| Social | pedido para o social |
| Avisos | aviso da equipe e resposta do suporte |

Quem está bloqueado (nos dois sentidos) não gera aviso. Aparelho que desinstalou ou tirou a permissão sai sozinho da lista.

## 1. Gerar a chave do site (2 minutos)
Firebase › ⚙ **Configurações do projeto** › aba **Cloud Messaging** › **Configuração da Web** › **Certificados push da Web** ›
**Gerar par de chaves**. Copie a chave que aparece (começa com `B`, ~88 letras) e **mande para o Claude**: ela é **pública**
(vai no site, `PUSH_VAPID` em `servidor.js`). Não é a "chave do servidor" nem a de conta de serviço — essas nunca vão no chat.

## 2. Publicar as funções (Cloud Shell, igual à Etapa A)
```bash
cd HelpFloripa-site- && git pull
cd functions && npm ci && cd ..
npx firebase-tools@13 deploy --only functions:conferirMensagem,functions:pushChamada,functions:pushChamadaPerdida,functions:pushSeguidor,functions:pushEstrelas,functions:pushComentario,functions:pushMarcacao,functions:pushSocial,functions:pushAvisoEquipe,functions:pushSuporte,functions:pushTeste --project helpfloripa-61e0d
```
(Se ainda não fez a Etapa A, inclua também `functions:montarRankingDiario` — veja `SERVIDOR-LEIA-ME.md`.)
Pode pedir para ativar a API **Firebase Cloud Messaging**: responda **Y**.

## 3. Conferir
1. O Claude põe a chave no `servidor.js` e publica.
2. No celular (Android: Chrome; iPhone: **só com o app instalado na tela de início**, iOS 16.4+): Configurações ›
   Notificações no celular › ligar "Neste aparelho" › **Enviar um teste**.
3. Feche o app e peça para alguém mandar uma mensagem.

## Custo
O FCM é **grátis**. Cada evento roda uma função (2 milhões grátis por mês) com 2–4 leituras (conta da pessoa, nome de
quem fez e bloqueios) e, nas estrelas/seguidores, 1 gravação do limite.

## Teste (Claude, no emulador)
`FUNCOES=1 ./emulador.sh` e `FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-push.mjs`. No emulador não existe FCM: o aviso vai
para a coleção `push_teste` e a notificação do celular é simulada pelo DevTools (ServiceWorker.deliverPushMessage).
