/* Meu Chat — 00-base.js: peças comuns (MC). */
(function () {
  'use strict';
  const MC = window.MC = { versao: '2026.10.29-e', ouvintes: {} };
  MC.$ = (s, r) => (r || document).querySelector(s);
  MC.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  MC.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  MC.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  MC.on = (ev, fn) => { (MC.ouvintes[ev] = MC.ouvintes[ev] || []).push(fn); };
  MC.emit = (ev, d) => { for (const fn of MC.ouvintes[ev] || []) { try { fn(d); } catch (e) { console.error(e); } } };
  let tAviso = 0;
  MC.aviso = (txt, tipo) => {
    const el = MC.$('#aviso'); el.textContent = txt; el.className = tipo || ''; el.hidden = false;
    clearTimeout(tAviso); tAviso = setTimeout(() => { el.hidden = true; }, tipo === 'erro' ? 7000 : 3500);
  };
  // preferências pequenas (no aparelho)
  MC.pref = {
    get(k, d) { try { const v = localStorage.getItem('meuchat:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('meuchat:' + k, JSON.stringify(v)); } catch {} },
  };
  MC.baixar = (nome, dados, tipo) => {
    const blob = dados instanceof Blob ? dados : new Blob([dados], { type: tipo || 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  };
  MC.compartilhar = async (nome, dados, tipo) => {
    const blob = dados instanceof Blob ? dados : new Blob([dados], { type: tipo || 'application/octet-stream' });
    try { const f = new File([blob], nome, { type: blob.type }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: nome }); return true; } }
    catch (e) { if (e && e.name === 'AbortError') return false; }
    MC.baixar(nome, blob); MC.aviso('Este aparelho não abriu o "Compartilhar": baixei o arquivo. Mande para o Drive pelo app do Drive (＋ → Enviar).');
    return false;
  };
  MC.copiar = async (t) => { try { await navigator.clipboard.writeText(t); MC.aviso('📋 Copiado', 'ok'); } catch { prompt('Copie:', t); } };
  MC.abrirPainel = (id) => { MC.$$('.painel').forEach((p) => { p.hidden = p.id !== id; }); MC.emit('painel', id); };
  MC.fecharPaineis = () => MC.$$('.painel').forEach((p) => { p.hidden = true; });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-fechar]')) MC.fecharPaineis(); });
})();
// ⬅ botão VOLTAR do celular (no APK do Mini SK): fecha o painel aberto em vez de sair do app
window.addEventListener('voltar-celular', (e) => {
  const aberto = Array.from(document.querySelectorAll('.painel')).some((p) => !p.hidden);
  if (aberto && window.MC && MC.fecharPaineis) { MC.fecharPaineis(); e.preventDefault(); }
});
