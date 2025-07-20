// Seleciona o botão e a barra lateral
const toggleBtn = document.querySelector('.toggle-btn');
const sidebar = document.querySelector('.sidebar');

toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

function calcularPreco() {
  const cidade = document.getElementById("cidade").value;
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

  let gasolina = 0;
  if (cidade === "florianopolis") {
    gasolina = 70;
  } else if (cidade === "saojose") {
    gasolina = 90;
  }

  if (profissional && tabelaPrecos[profissional]) {
    const total = tabelaPrecos[profissional] + gasolina;
    precoFinal.textContent = `Valor Total: R$ ${total.toFixed(2)}`;
  } else {
    precoFinal.textContent = "Valor Total: R$ 0,00";
  }
}

// Atualiza o preço sempre que a cidade ou profissional mudar
document.getElementById("cidade").addEventListener("change", calcularPreco);
document.getElementById("profissional").addEventListener("change", calcularPreco);

// Enviar formulário (simulado)
document.getElementById("solicitarForm").addEventListener("submit", function(e) {
  e.preventDefault();
  alert("Sua solicitação foi enviada com sucesso! Em breve entraremos em contato.");
  this.reset();
  document.getElementById("precoFinal").textContent = "Valor Total: R$ 0,00";
});
