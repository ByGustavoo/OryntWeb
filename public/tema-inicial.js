(function () {
  var tema = 'escuro';
  try {
    var salvo = JSON.parse(localStorage.getItem('orynt:tema') || '"escuro"');
    var claroNoSistema = window.matchMedia('(prefers-color-scheme: light)').matches;
    tema = salvo === 'claro' || salvo === 'escuro' ? salvo : claroNoSistema ? 'claro' : 'escuro';
  } catch (erro) {}
  document.documentElement.dataset.tema = tema;
})();
