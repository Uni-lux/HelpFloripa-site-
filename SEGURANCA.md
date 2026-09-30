# Segurança do Help Floripa: passo a passo

Guia do que precisa ser feito à mão no Firebase e no Google Cloud.
O código do site já está pronto. Faça na ordem abaixo.

---

## 1. Suba os arquivos do site (GitHub Pages)

Envie todos os arquivos alterados para o repositório **antes** de publicar as regras novas.
Arquivo novo: `seguranca.js` (não esqueça dele).

## 2. Publique as regras do Firestore

1. Abra https://console.firebase.google.com e escolha o projeto **helpfloripa-61e0d**.
2. Menu **Firestore Database** → aba **Regras**.
3. Apague tudo e cole o conteúdo do arquivo `firestore.rules`.
4. Clique em **Publicar**.

O que muda para os usuários:
- Mandar mensagem, seguir, pedir vínculo, publicar e criar negócio ou anúncio agora exigem **e-mail confirmado**. Quem entra com Google já vem confirmado.
- Quem ainda não confirmou vê um aviso amarelo no topo com o botão **Reenviar link**.

## 3. Autenticação (Firebase Authentication)

Menu **Authentication** → aba **Configurações** (Settings):

1. **Proteção contra enumeração de e-mail** (User actions / Email enumeration protection): **ative**.
   Assim ninguém descobre quais e-mails têm conta.
2. **Política de senha** (Password policy): exija **no mínimo 8 caracteres**, com letra e número.
   Escolha "Notificar" no começo e depois "Exigir".
3. **Domínios autorizados** (Authorized domains): deixe só
   `helpfloripa.com.br`, `www.helpfloripa.com.br`, `helpfloripa-61e0d.firebaseapp.com` e `localhost`.
   Apague o que não for seu.
4. Aba **Modelos** (Templates) → **Verificação de endereço de e-mail**: coloque o idioma em **Português**.

## 4. App Check (protege contra robôs) — grátis, plano Spark

1. Abra https://www.google.com/recaptcha/admin/create
2. Rótulo: `Help Floripa`. Tipo: **reCAPTCHA v3** (baseado em pontuação).
   Domínios: `helpfloripa.com.br` e `www.helpfloripa.com.br`. Clique em **Enviar**.
3. A página mostra duas chaves: **Chave do site** e **Chave secreta**. Deixe aberta.
4. No Firebase: menu **App Check** → aba **Apps** → seu app da Web → **reCAPTCHA** (não o Enterprise)
   → cole a **Chave secreta** → **Salvar**.
5. No arquivo `firebase.js`, cole a **Chave do site** entre as aspas:
   ```js
   const RECAPTCHA_V3_SITE_KEY = "COLE_A_CHAVE_DO_SITE_AQUI";
   ```
   Suba o `firebase.js` para o GitHub.
6. Espere **2 ou 3 dias** e olhe em **App Check → APIs → Cloud Firestore**.
   Quando quase tudo aparecer como "verificado", clique em **Aplicar** (Enforce).
   Faça o mesmo para **Authentication**.

> Não aplique no mesmo dia: quem estiver com o site antigo aberto seria bloqueado.

## 5. Restrinja a chave de API (Google Cloud)

1. https://console.cloud.google.com/apis/credentials (projeto helpfloripa-61e0d).
2. Clique na chave **Browser key (auto created by Firebase)**. É a que começa com `AIzaSyBbRx...`.
3. **Restrições de aplicativo** → **Referenciadores HTTP (sites)** → adicione:
   - `https://helpfloripa.com.br/*`
   - `https://www.helpfloripa.com.br/*`
   - `https://helpfloripa-61e0d.firebaseapp.com/*`
4. **Salvar**. Pode levar alguns minutos para valer.

## 6. Alerta de gastos (evita susto na conta)

1. https://console.cloud.google.com/billing → **Orçamentos e alertas** → **Criar orçamento**.
2. Valor: o que você aceita gastar por mês (ex.: R$ 50). Alertas em 50%, 90% e 100%.
   Você recebe um e-mail se alguém abusar do site.

## 7. Storage (quando ativar) — precisa do plano Blaze

Sem Storage o site funciona: as fotos ficam dentro do Firestore (por isso o limite de fotos).
1. Menu **Storage** → **Começar**.
2. Aba **Regras**: cole o conteúdo de `storage.rules` → **Publicar**.
   Aceite quando o console pedir permissão para o Storage ler o Firestore.
3. Me avise para eu ligar o Storage no `firebase.js`.

## 8. Formulário de empresas (formsubmit.co)

O `cadastro-empresa.html` envia os dados para o serviço **formsubmit.co**, e o seu Gmail aparece no código.
- Envie um formulário de teste. O formsubmit vai mandar um e-mail com um **endereço secreto** (algo como `https://formsubmit.co/a1b2c3...`).
- Troque `helpfloripa7@gmail.com` no `action` do formulário por esse endereço secreto.
- Cite o formsubmit.co na Política de Privacidade (LGPD).

---

## O que foi corrigido no código

| Problema | Correção |
|---|---|
| Contas falsas e robôs | E-mail confirmado exigido nas regras (grátis, sem configurar nada), aviso com reenvio do link, e-mail de confirmação enviado no cadastro, App Check com reCAPTCHA v3 pronto (grátis) |
| Documentos gigantes e campos estranhos | Regras com lista de campos permitidos e limites de tamanho (negócios, anúncios, publicações, mensagens, conversas) |
| Falsificar "lido", "digitando" e o resumo da conversa | Cada pessoa só altera os próprios campos; o resumo só pode ser escrito por quem enviou a mensagem |
| Citação falsa no chat | A regra confere se a mensagem citada existe e quem a escreveu; o chat mostra o texto original |
| Imagens de sites de terceiros (rastreamento) | Fotos e anexos só do próprio site, nas regras e no código |
| Site embutido em outro (clickjacking) | Script que impede a página de abrir dentro de outro site, em todas as páginas |
| Sem política de conteúdo | CSP em todas as páginas: só carrega scripts e conexões de origens conhecidas |
| Usuário mudando o próprio plano | `plano`, `valorPlanoMensal` e `tipoUsuario` travados depois do cadastro |
| HTML montado com o que o usuário digita | Resumo do cadastro profissional montado com texto puro |
| SVG no Storage | Só JPG, PNG e WEBP (e vídeo/áudio onde faz sentido) |
| Aviso do chat enganoso | Texto diz claramente que não há criptografia de ponta a ponta |
