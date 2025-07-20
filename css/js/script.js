function mostrarSecao(secaoId) {
  const secoes = document.querySelectorAll('.secao');
  secoes.forEach(secao => secao.style.display = 'none');

  const secaoSelecionada = document.getElementById(secaoId);
  if (secaoSelecionada) {
    secaoSelecionada.style.display = 'block';
    secaoSelecionada.scrollIntoView({ behavior: 'smooth' });
  }
}
