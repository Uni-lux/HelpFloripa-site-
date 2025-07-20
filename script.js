// Alternar visibilidade da barra lateral
const toggleBtn = document.querySelector('.toggle-btn');
const sidebar = document.querySelector('.sidebar');

toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

// Adicionar sub-opções aos cards de categoria
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', () => {
    // Verifica se já existem sub-opções
    let subOptions = card.querySelector('.sub-options');

    if (subOptions) {
      subOptions.remove(); // Remove se já existir
    } else {
      // Cria container com botões
      subOptions = document.createElement('div');
      subOptions.classList.add('sub-options');

      // Botão Solicitar Profissional
      const btnSolicitar = document.createElement('a');
      btnSolicitar.href = 'solicitar.html'; // ajuste conforme o nome da página
      btnSolicitar.textContent = 'Solicitar Profissional';
      btnSolicitar.className = 'sub-btn';

      // Botão Cadastrar como Profissional
      const btnCadastrar = document.createElement('a');
      btnCadastrar.href = 'cadastrar.html'; // ajuste conforme o nome da página
      btnCadastrar.textContent = 'Cadastrar como Profissional';
      btnCadastrar.className = 'sub-btn';

      subOptions.appendChild(btnSolicitar);
      subOptions.appendChild(btnCadastrar);
      card.appendChild(subOptions);
    }
  });
});
