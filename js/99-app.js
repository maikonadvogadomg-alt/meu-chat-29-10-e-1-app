/* Meu Chat — 99-app.js: liga tudo quando abre. */
(function (MC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', async () => {
    await MC.chat.abrirConversa(MC.pref.get('conversaAberta', null));
    const l = await MC.ia.chaves();
    if (l.length) { const a = l.find((c) => c.id === MC.pref.get('chaveAtiva', '')) || l[0]; MC.$('#tit-ia').textContent = a.apelido || MC.ia.P[a.provedor].nome; }
    else MC.$('#tit-ia').textContent = 'toque em ⚙️ para pôr uma chave';
    // app instalável (PWA) e funcionando sem internet (a tela; a IA precisa de internet)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  });
})(window.MC);
