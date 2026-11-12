# Help Floripa — lista do que fazer (12/11/2026)

Regra para não ficar corrigindo para sempre: **uma área por vez, um PR por área, e só passa para a próxima quando a
anterior estiver marcada como pronta.** Coisa nova só entra depois da parte 1.

## 1. Só você pode fazer (trava quase todo o resto) — nesta ordem
- [ ] **Publicar as regras** (21 partes em `_regras/`, passo a passo no `LEIA-ME.md`), criar os **índices**
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

## 5. Programação de manutenção (eu faço, sem mexer no visual)
- [ ] Atualizar testes velhos: `t-explorar`, `t-sugestoes-online`, `t-perto`, `t-principais`, `t-x-transicoes`,
      `t-busca-regiao`, `t-deslizar-responder`.
- [ ] Conta apagada: tirar também as vistas e reações que a pessoa deixou nos flashes dos outros.
- [ ] Pedir data de nascimento/gênero a quem não tem (público das publicações).

## 6. Guardado para depois (não mexer agora)
Música no Flash · cartão "Ofertas" · aba "Republicados" no perfil · Cloudflare Pages e repositório privado ·
relatório da equipe por e-mail · parcelamento e renovação automática dos planos.
