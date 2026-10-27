# Pagamento automático (Mercado Pago) — passo a passo

O que já está pronto no código:
- **Servidor** (pasta `functions/`, região São Paulo):
  - `pagarPlano` cria o pagamento por Pix ou cartão.
  - `webhookMercadoPago` recebe o aviso do Mercado Pago e liga o plano.
- **Site** (`planos.js`): na tela do pedido, abas **Pix** (QR Code que confirma sozinho) e **Cartão de crédito ou débito** (formulário do próprio Mercado Pago).
- Enquanto `PAGAMENTO.automatico` estiver `false` no `planos-base.js`, o site continua com o Pix conferido à mão no painel. Nada muda para quem usa o site.

O Access Token e a assinatura secreta **nunca** vão no site, no GitHub ou em conversa: só no Secret Manager do Firebase (passo 3).

---

## 1. Plano Blaze
Console do Firebase → **Uso e faturamento** → **Modificar plano** → **Blaze**.
Crie um **alerta de orçamento** (por exemplo, R$ 50 por mês).

## 2. Webhook no Mercado Pago (conta da empresa)
1. Abra **mercadopago.com.br/developers/panel/app** → aplicação **Help Floripa** → **Webhooks** → **Configurar notificações**.
2. **Modo de teste** e **Modo produção**, a mesma URL nos dois:
   `https://southamerica-east1-helpfloripa-61e0d.cloudfunctions.net/webhookMercadoPago`
3. Evento: marque só **Pagamentos**. Salve.
4. Copie a **Assinatura secreta** que aparece. Ela é usada no passo 3.

## 3. Publicar o servidor (Cloud Shell, no navegador)
Abra **console.cloud.google.com**, escolha o projeto **helpfloripa-61e0d** e toque no ícone **>_** (Ativar o Cloud Shell). No celular, use "Versão para computador" do navegador.
Cole um bloco por vez:

```bash
git clone https://github.com/Uni-lux/HelpFloripa-site-.git
cd HelpFloripa-site-/functions && npm ci && cd ..
npx firebase-tools@13 login --no-localhost
```
O `login` mostra um link: abra, entre com a conta do Firebase e cole o código de volta. Se ele disser que já está conectado, siga em frente.

Cadastre os dois segredos. O comando pede o valor: cole e aperte Enter. Nada aparece na tela, e é assim mesmo.
```bash
npx firebase-tools@13 functions:secrets:set MP_ACCESS_TOKEN --project helpfloripa-61e0d
npx firebase-tools@13 functions:secrets:set MP_WEBHOOK_SECRET --project helpfloripa-61e0d
```
- **MP_ACCESS_TOKEN**: comece com o **Access Token de TESTE** (Credenciais de teste, começa com `TEST-`).
- **MP_WEBHOOK_SECRET**: a assinatura secreta do passo 2.

Publique:
```bash
npx firebase-tools@13 deploy --only functions --project helpfloripa-61e0d
```
Na primeira vez ele pode pedir para ativar APIs (Cloud Functions, Cloud Build, Artifact Registry, Secret Manager, Cloud Run): responda **Y**.
No fim aparecem as duas funções com ✔.

## 4. Ligar no site (o Claude faz)
Avise no chat: o Claude muda `automatico: true` no `planos-base.js` e abre o PR.

## 5. Testar com as credenciais de teste
- **Cartão**: use os cartões de teste do Mercado Pago (em Developers → Cartões de teste).
  - Nome do titular **APRO** = aprovado.
  - **OTHE** = recusado.
  - **FUND** = saldo insuficiente.
  - CPF qualquer válido de teste.
  O plano deve ligar na hora.
- **Pix**: no modo de teste o QR Code aparece, mas não dá para pagar de verdade. O Pix se confere no passo 6, com R$ 29,90 reais.

## 6. Ir para produção
1. No Mercado Pago, **Ativar credenciais** de produção.
2. No Cloud Shell, troque o token pelo de produção (`APP_USR-...`) e publique de novo:
   ```bash
   npx firebase-tools@13 functions:secrets:set MP_ACCESS_TOKEN --project helpfloripa-61e0d
   npx firebase-tools@13 deploy --only functions --project helpfloripa-61e0d
   ```
3. Mande para o Claude a **Public Key de produção** (`APP_USR-...`; é pública): ele troca no `planos-base.js`.
4. Faça um pagamento real de um plano com uma conta sua (Pix) e confira:
   - a tela muda para "Pagamento aprovado!";
   - o painel mostra o pedido **pago · Pix · Mercado Pago (automático)**.

## Se algo der errado
- **Logs**: Console do Firebase → Functions → `pagarPlano` / `webhookMercadoPago` → Registros.
- **Pix pago mas o plano não ligou**: o painel (Planos e receita → Esperando) continua com "Confirmar pagamento e ativar" à mão.
- **Para desligar o automático**: o Claude volta `automatico: false` (o Pix conferido à mão volta na hora).
