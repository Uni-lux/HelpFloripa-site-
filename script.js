// Script para alternar o menu lateral
document.addEventListener("DOMContentLoaded", function () {
  const toggleBtn = document.querySelector(".toggle-btn");
  const sidebar = document.querySelector(".sidebar");

  toggleBtn.addEventListener("click", function () {
    sidebar.classList.toggle("active");
  });
});
function calcularPreco() {
  const profissional = document.getElementById("profissional").value;
  const precoFinal = document.getElementById("precoFinal");

  const tabelaPrecos = {
    eletricista: 120,
    encanador: 110,
    faxineira: 100,
    pedreiro: 150,
    jardineiro: 90,
    diarista: 95
  };

  const gasolina = 25; // valor fixo de ida e volta

  if (profissional && tabelaPrecos[profissional]) {
    const total = tabelaPrecos[profissional] + gasolina;
    precoFinal.textContent = `Valor Total: R$ ${total.toFixed(2)}`;
  } else {
    precoFinal.textContent = `Valor Total: R$ 0,00`;
  }
}

// Enviar formulário (simulado)
document.getElementById("solicitarForm").addEventListener("submit", function(e) {
  e.preventDefault();
  alert("Sua solicitação foi enviada com sucesso! Em breve entraremos em contato.");
  this.reset();
  document.getElementById("precoFinal").textContent = "Valor Total: R$ 0,00";
});
