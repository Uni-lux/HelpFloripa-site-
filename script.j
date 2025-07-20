function mostrarFormulario(tipo) {
  document.getElementById("form-cliente").style.display = "none";
  document.getElementById("form-profissional").style.display = "none";
  document.getElementById("form-sobre").style.display = "none";

  if (tipo === 'cliente') {
    document.getElementById("form-cliente").style.display = "block";
  } else if (tipo === 'profissional') {
    document.getElementById("form-profissional").style.display = "block";
  } else if (tipo === 'sobre') {
    document.getElementById("form-sobre").style.display = "block";
  }
}
