// Seleciona o botão e a barra lateral
const toggleBtn = document.querySelector('.toggle-btn');
const sidebar = document.querySelector('.sidebar');

// Adiciona o evento de clique para alternar a classe 'active'
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});
