# Help Floripa — lista do que fazer (12/11/2026)

Regra para não ficar corrigindo para sempre: **uma área por vez, um PR por área, e só passa para a próxima quando a
anterior estiver marcada como pronta.** Coisa nova só entra depois da parte 1.

## 1. Só você pode fazer (trava quase todo o resto) — nesta ordem
- [ ] **Publicar as regras** (22 partes em `_regras/`, passo a passo no `LEIA-ME.md`), criar os **índices**
      (`INDICES-LEIA-ME.md`) e apertar "Recalcular estrelas" no painel.
- [ ] **Plano Blaze** com alerta de orçamento (ex.: R$ 50/mês).
- [ ] **Storage**: ativar, regras, CORS e "Passar fotos para o Storage" no painel (`STORAGE-LEIA-ME.md`).
      Sem ele: sem vídeo/Vídeos, Diário pesado (fotos dentro dos documentos).
- [ ] **Publicar as funções do servidor** (`SERVIDOR-LEIA-ME.md`, `PUSH-LEIA-ME.md`, `TURN-LEIA-ME.md`,
      `PAGAMENTO-LEIA-ME.md`): ranking do Diário, "Responde rápido" seguro, notificações com o app fechado, TURN das
      ligações, Pix/cartão automático, apagar conta pelo painel. Me avise depois de cada uma para eu ligar a chave no site.
- [ ] **App Check** (reCAPTCHA) contra robôs.
- [ ] **Segredo `FIREBASE_SERVICE_ACCOUNT` no GitHub** (limpeza automática de contas). Obrigatório antes de abrir ao público.
- [ ] **Link dos e-mails** em Authentication → Templates (`EMAILS-LEIA-ME.md`), **Search Console** (sitemap) e
      **e-mails do domínio** (imprensa@, privacidade@, juridico@, contato@).
- [ ] **Mapbox**: criar a chave pública e me mandar (`MAPBOX-LEIA-ME.md`).

## 1b. Regras: o que ficou da revisão de 12–13/11 → `_regras/REGRAS-PENDENTES.md`
- [x] Flash "Amigos próximos"/"Ocultar de" de verdade (PR #205), escondido de verdade e agendadas (PR #206/#207).
- [ ] Depois do Blaze: agendadas e escondidos voltando na hora certa (Cloud Function; ver REGRAS-PENDENTES, seção C).

## 2. Decisões suas (eu não invento)
- [ ] Visibilidade justa: no máximo 1 pagante nos 4 cartões depois de cada espaço pago?
- [ ] Corridas e entregas: tarifas sugeridas, comissão (sim/não, quanto), seguro e regras municipais de passageiro.
- [ ] Conta privada: o que fica só para seguidores aprovados?
- [ ] App nativo (Capacitor) para tela inteira de verdade e GPS com a tela apagada: agora ou depois?
- [ ] Área de atuação: todo o Brasil ou começar por Florianópolis?
- [ ] Advogado: Termos (planos, arrependimento de 7 dias), corridas de passageiro, publicidade de saúde, Comunidade.

## 3. Eu ligo depois da parte 1 (pequeno, rápido)
- [ ] `USAR_STORAGE`, `FUNCOES_LIGADAS`, `PUSH_VAPID`, `TURN_LIGADO`, `PAGAMENTO.automatico` + chave de produção.
- [ ] Botão de vídeo, aba Vídeos do perfil e teste real de ligação no 4G.

## 3b. Sistemas novos para conferir DEPOIS das regras publicadas (12/11/2026)
Quase todos dependem das regras novas: conferir antes de publicar só mostra erro ou "falta publicar".
| Sistema | Depende de | Como conferir |
|---|---|---|
| Solicitações de mensagem | regras | conta nova manda mensagem para você → cai em "Solicitações"; aceitar/recusar |
| Notas | regras (sem elas só fica no aparelho) | criar nota no celular e abrir no computador |
| SOS em etapas, pets (RG + achados), roubos | regras + índices | SOS de teste com outra conta do Social; pet perdido × achado parecido |
| Presentes e localização em tempo real | regras | mandar mimo, vale e localização ao vivo para outra conta |
| Entregas e corridas | regras + índices (+ decidir tarifas) | conta A pede, conta B (entregador) aceita, PIN, avaliar |
| Automotivo | regras | criar o perfil Automotivo e ver na vitrine |
| Perfil "O que aparece" | regras | esconder cidade/nota/destaques e olhar com outra conta |
| Flash: menções e negócios em lote | regras | marcar 3 pessoas e 2 negócios, abrir com outra conta |
| Publicação com título/modelos, comentários com foto/áudio, reações no chat | regras | publicar um de cada modelo; comentar com foto e áudio |
| Corretor, emojis/figurinhas, Em alta/Hall da fama | nada (já dá para conferir) | — |
| Ligações | TURN (Blaze) | no 4G pode falhar até ligar o TURN |

## 4. Revisão por área (uma rodada só, celular 360 px, claro e escuro)
Para cada área: você manda os prints do que incomoda **de uma vez**, eu corrijo num PR, você confere e marca.
- [ ] Início e as 6 vitrines (Freelances, Delivery, Shopping, Imóveis, Saúde, Automotivo)
- [ ] Diário e Flash
- [ ] Explorar
- [ ] Comunidade (Mural)
- [ ] Mensagens (conversas, chamadas, notas, figurinhas)
- [ ] Perfil
- [ ] Meus negócios e planos
- [ ] Corridas/entregas, presentes, SOS e pets
- [ ] Notificações e sino
- [ ] Painel da equipe
- [ ] Páginas de acesso e institucionais (login, cadastro, ajuda, termos...)

### Achados dos prints de 12/11/2026 (corrigir num PR só, sem regra nova) — FEITOS em 13/11/2026, falta você conferir
- [ ] Mensagens: o "+" flutuante cobre a data da conversa de baixo ("03/11/26"); deixar espaço no fim da lista.
- [ ] Mensagens: o "+" é diferente do Diário/Comunidade (círculo dentro do quadrado); deixar os três iguais.
- [ ] Mensagens: conversas sem nenhuma mensagem ("Nova conversa") enchem a lista; esconder até ter mensagem.
- [ ] Perfil: o @ aparece duas vezes (no topo e embaixo do nome); deixar só um.
- [ ] Explorar › Em alta: com uma publicação só, as 4 primeiras são as hashtags dela ("Top 100" vazio). Exigir 2+
      publicações ou 2+ pessoas para entrar e esconder a seção quando houver pouco.
- [ ] Explorar: estrelinha solta no canto do cartão Automotivo (conferir a arte).
- [ ] Diário: fileira do Flash só com "Seu flash" ocupa muito espaço; encolher quando ninguém que você segue tem flash.
- [ ] Comunidade: vazia até em "Brasil" — conferir se não há mesmo publicações ou se é leitura recusada.

## 5. Programação de manutenção (eu faço, sem mexer no visual)
- [ ] Atualizar testes velhos: `t-explorar`, `t-sugestoes-online`, `t-perto`, `t-principais`, `t-x-transicoes`,
      `t-busca-regiao`, `t-deslizar-responder`.
- [ ] Conta apagada: tirar também as vistas e reações que a pessoa deixou nos flashes dos outros.
- [ ] Pedir data de nascimento/gênero a quem não tem (público das publicações).

## 6. Guardado para depois (não mexer agora)
Música no Flash · cartão "Ofertas" · aba "Republicados" no perfil · Cloudflare Pages e repositório privado ·
relatório da equipe por e-mail · parcelamento e renovação automática dos planos.
