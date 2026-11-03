# Firebase Storage — como ligar (deixado pronto em 21/10/2026)

O site já está preparado para o Storage. Falta só **ativar no console** e **virar a chave**. Até lá, tudo
continua como hoje: as fotos ficam dentro dos documentos do Firestore (com limite de ~1 MB por documento, por
isso as fotos são bem comprimidas e não há vídeo).

## O que muda quando ligar
- **Vídeos** no Diário (até 50 MB), no Flash (até 40 MB), no chat (até 50 MB) e no suporte (até 50 MB).
- **Fotos com mais qualidade** (até 1.600 px) e várias fotos numa publicação sem encolher para caber.
- **PDF de até 20 MB** no suporte e nos comprovantes dos planos (hoje: 500 KB).
- **Site mais leve:** o documento guarda só o link da foto (poucos bytes, em vez de centenas de KB). As listas
  (vitrines, Diário, Comunidade) carregam mais rápido e gastam menos internet do celular.
- **Cache de 1 ano** em cada arquivo: cada foto tem um nome único, então o celular baixa uma vez só.
- Fotos antigas (dentro dos documentos) continuam funcionando e **passam para o Storage com um botão** (passo 6).

## Passo a passo (uns 15 minutos)
1. **Plano Blaze.** Console do Firebase → projeto **helpfloripa-61e0d** → engrenagem → *Uso e faturamento* →
   *Detalhes e configurações* → **Modificar plano** → **Blaze**. Logo depois, crie um **alerta de orçamento**
   (Google Cloud → Faturamento → Orçamentos e alertas), por exemplo **R$ 50/mês**, com aviso em 50%, 90% e 100%.
   O alerta só avisa, não corta; com ele, nenhuma conta chega de surpresa.
2. **Ativar o Storage.** Menu **Build → Storage → Começar** → **modo de produção**.
   - **Local do bucket (não dá para mudar depois):**
     - **`us-east1` (recomendado para começar):** entra na **cota grátis** do Google (5 GB guardados e 100 GB de
       download por mês, sem custo). As fotos levam uma fração de segundo a mais para começar a carregar no Brasil, mas
       com o cache de 1 ano isso só acontece na primeira vez.
     - **`southamerica-east1` (São Paulo):** mais rápido para o Brasil, mas **sem cota grátis** (paga desde o 1º GB,
       centavos por GB).
3. **Publicar as regras.** Ainda em Storage → aba **Regras** → apague o que estiver lá → copie **todo** o arquivo
   `storage.rules` (da raiz do repositório, cerca de 6 KB, cabe numa colagem só) → **Publicar**.
   (Ou, no Cloud Shell: `npx firebase-tools@13 deploy --only storage --project helpfloripa-61e0d` — o `firebase.json` já aponta
   para o `storage.rules`.)
   - O console vai pedir para **permitir que o Storage consulte o Firestore** (as regras conferem quem participa da
     conversa e quem é da equipe). Clique em **Permitir/Conceder**.
4. **Virar a chave.** Me avise que eu abro o PR com `const USAR_STORAGE = true;` no `firebase.js` (é uma linha;
   não tem `?v`, então vale em até 10 minutos para todo mundo). Ou, se preferir fazer você mesmo: edite essa linha no
   GitHub e faça o commit.
4b. **CORS (obrigatório para o Flash):** o site desenha fotos do Storage em imagens novas (cartão da publicação no Flash,
   arte do QR Code). Sem CORS o navegador bloqueia. No **Cloud Shell** (console.cloud.google.com, ícone **>_**):
   ```bash
   cd HelpFloripa-site- && git pull
   gcloud storage buckets update gs://helpfloripa-61e0d.firebasestorage.app --cors-file=cors.json
   ```
   (Se o console mostrar outro nome de bucket na página do Storage, use o que aparece lá, começando com `gs://`.)
5. **Conferir no site** (5 minutos):
   - Diário: publicar 2 fotos → no console, Storage → pasta `diario/<seu uid>/` com 2 arquivos.
   - Mensagens: mandar uma foto e um vídeo curto → pasta `mensagens/`.
   - Comunidade: anunciar uma doação com foto → pasta `comunidade/`.
   - Suporte: anexar um PDF → pasta `suporte/`.

6. **Passar as fotos antigas para o Storage** (Etapa D, depois do passo 4). Publique a função, no Cloud Shell:
   ```bash
   cd HelpFloripa-site- && git pull && cd functions && npm ci && cd ..
   npx firebase-tools@13 deploy --only functions:migrarFotos --project helpfloripa-61e0d
   ```
   Depois, no **painel** (conta de dono) → **Publicações** → **Passar fotos para o Storage**. Ele primeiro **conta** (não mexe em
   nada) e mostra quantas fotos e de onde (contas, negócios, imóveis, Diário, Flash, Comunidade); você confirma e ele passa,
   de 25 em 25 documentos, mostrando o andamento (não feche a página). Cada foto vira um arquivo na pasta da pessoa e o
   documento fica só com o link. Documento que alguém editou no meio fica para a próxima: é só apertar de novo. Rodar de novo
   quando já está tudo passado só avisa. Fica no Registro de ações. As fotos das conversas do chat continuam onde estão.

## Segurança (o que as regras garantem)
- Ninguém grava, troca ou apaga arquivo na pasta de outra pessoa.
- Cada pasta só aceita o tipo e o tamanho que o site envia (foto até 5–10 MB, vídeo até 50 MB, áudio até 15 MB no chat,
  PDF até 20 MB só no suporte e nos comprovantes). Qualquer outra pasta é fechada.
- Fotos e vídeos do **chat** só podem ser enviados e lidos por quem participa da conversa. Anexos do **suporte**: só a
  pessoa e a equipe. **Comprovantes de baixa renda**: só a pessoa e os donos do site.
- Os links salvos nos documentos abrem para quem tem o link, como hoje com as fotos dentro dos documentos.
- **Conta excluída:** a limpeza automática (`scripts/limpeza/limpar-contas.mjs`) também apaga os arquivos da pessoa no
  Storage (fotos de perfil e capa, negócios, anúncios, Diário, Flash, Comunidade, suporte, comprovantes e o que ela
  mandou no chat). Continua dependendo do segredo `FIREBASE_SERVICE_ACCOUNT` no GitHub.

## Custos (estimativa)
Com o bucket em `us-east1`: até 5 GB guardados e 100 GB baixados por mês, **R$ 0**. Uma foto do site tem ~150–300 KB,
então 5 GB ≈ 20 mil fotos. Passando disso, cerca de **US$ 0,02 por GB guardado** e **US$ 0,12 por GB baixado**.
O Firestore também fica mais leve com o Storage (documentos menores, menos dados baixados em cada lista).

## Testado antes de entregar
- `_testes/testes-storage.mjs`: **47 testes** das regras do Storage no emulador (pastas, donos, tipos, tamanhos,
  participantes do chat, equipe, donos do site).
- `_testes/t-storage.mjs`: o site com a chave ligada (emulador do Storage): fotos do Diário, do chat e da Comunidade
  vão para o Storage com nome único, o documento guarda só o link e as fotos aparecem para quem vê.
