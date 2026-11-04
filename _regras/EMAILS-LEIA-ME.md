# E-mails da conta com a cara do Help Floripa

Hoje, quando alguém pede uma senha nova ou confirma o e-mail, o link do e-mail abre a página padrão do Firebase
(branca, sem a marca). O site já tem a página própria pronta: **`conta-acao.html`** (criar senha nova com força e
confirmação, confirmar e-mail e desfazer uma troca de e-mail que a pessoa não pediu). Ela só passa a ser usada depois
dos passos abaixo. Nada quebra enquanto isso: os links continuam abrindo a página do Firebase.

Faça no computador (o console do Firebase é ruim no celular). Leva uns 10 minutos.

## 1. Abrir os modelos de e-mail
1. Entre em **console.firebase.google.com** e abra o projeto **helpfloripa-61e0d**.
2. No menu da esquerda: **Criação → Authentication** (ou "Autenticação").
3. Abra a aba **Templates** (ou "Modelos").

## 2. Idioma e remetente
1. Embaixo da lista de modelos, em **Idioma do modelo**, escolha **Português (Brasil)** e salve.
2. Toque no lápis do modelo **Verificação de endereço de e-mail**:
   - **Nome do remetente:** `Help Floripa`
   - **Responder para:** o e-mail do Help Floripa (hoje `helpfloripa7@gmail.com`).
   - Salve.
3. Faça o mesmo no modelo **Redefinição de senha** e no **Alteração do endereço de e-mail**.

## 3. Ligar a página própria (o passo principal)
1. Em qualquer um dos modelos, toque no lápis e depois em **Personalizar URL de ação** (link pequeno embaixo).
2. Cole exatamente: `https://helpfloripa.com.br/conta-acao.html`
3. Salve. Vale para todos os modelos de uma vez.

## 4. Conferir o domínio autorizado
1. Ainda em Authentication, abra **Configurações → Domínios autorizados**.
2. Confira se **helpfloripa.com.br** está na lista. Se não estiver, toque em **Adicionar domínio** e coloque
   `helpfloripa.com.br`.

## 5. Testar
1. Abra `https://helpfloripa.com.br/recuperar-senha.html`, digite o seu e-mail e toque em **Enviar link**.
2. No e-mail que chegar, toque no link. Deve abrir a página **"Criar senha nova"** do Help Floripa, com o seu e-mail.
3. Crie a senha nova e entre com ela.

Se o link abrir a página branca do Firebase, o passo 3 não foi salvo: repita.

## Opcional: e-mail saindo de `@helpfloripa.com.br`
Em Templates → lápis → **Personalizar domínio** dá para mandar de `noreply@helpfloripa.com.br`. O Firebase mostra
alguns registros DNS para pôr no lugar onde o domínio está registrado. Ajuda o e-mail a não cair no spam. Pode ficar
para depois, junto com os e-mails do domínio (imprensa@, privacidade@...).
