/* Meu Chat — 90-backup.js: 💾 backup de tudo (conversas + memória + ajustes) e restaurar SEM APAGAR NADA. */
(function (MC) {
  'use strict';
  async function gerar(comChaves) {
    const prefs = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('meuchat:')) prefs[k.slice(8)] = localStorage.getItem(k); }
    return { app: 'meu-chat', versao: 1, data: new Date().toISOString(), conversas: await MC.banco.todas(), memoria: await MC.memoria.texto(), prefs,
      chaves: comChaves ? await MC.ia.chaves() : [], buscaChave: comChaves ? await MC.banco.kv('buscaChave', '') : '' };
  }
  async function baixar(paraDrive) {
    const comChaves = confirm('Levar também as chaves das IAs no backup?\n\nOK = levar (NÃO mande esse arquivo para ninguém)\nCancelar = sem as chaves');
    const txt = JSON.stringify(await gerar(comChaves)), nome = 'meu-chat-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    if (paraDrive) await MC.compartilhar(nome, txt, 'application/json'); else { MC.baixar(nome, txt, 'application/json'); MC.aviso('💾 Backup baixado', 'ok'); }
  }
  async function restaurar(arq) {
    let d; try { d = JSON.parse(await arq.text()); } catch { throw new Error('não é um backup do Meu Chat'); }
    if (!d || d.app !== 'meu-chat') throw new Error('não é um backup do Meu Chat');
    const atuais = new Map((await MC.banco.todas()).map((c) => [c.id, c]));
    let novas = 0, juntas = 0, iguais = 0;
    for (const c of d.conversas || []) {
      const a = atuais.get(c.id);
      if (!a) { await MC.banco.salvar(c); novas++; continue; }
      const ids = new Set(a.msgs.map((m) => m.id)); const faltam = c.msgs.filter((m) => !ids.has(m.id));
      if (!faltam.length) { iguais++; continue; }
      a.msgs = a.msgs.concat(faltam).sort((x, y) => (x.quando || 0) - (y.quando || 0)); await MC.banco.salvar(a); juntas++;
    }
    // memória: junta as linhas que faltam
    const linhas = (d.memoria || '').split('\n').map((x) => x.trim()).filter(Boolean); let mem = 0;
    for (const l of linhas) if (await MC.memoria.lembrar(l)) mem++;
    for (const [k, v] of Object.entries(d.prefs || {})) if (localStorage.getItem('meuchat:' + k) == null) try { localStorage.setItem('meuchat:' + k, v); } catch {}
    if ((d.chaves || []).length) { const atual = await MC.ia.chaves(); const tem = new Set(atual.map((c) => c.chave)); await MC.ia.salvarChaves(atual.concat(d.chaves.filter((c) => !tem.has(c.chave)))); }
    if (d.buscaChave && !(await MC.banco.kv('buscaChave', ''))) await MC.banco.kvSet('buscaChave', d.buscaChave);
    MC.aviso('✅ Restaurado sem apagar: ' + novas + ' conversa(s) nova(s), ' + juntas + ' completada(s), ' + iguais + ' igual(is) · memória +' + mem, 'ok');
    MC.chat.recarregar();
  }
  document.addEventListener('DOMContentLoaded', () => {
    MC.$('#bt-backup').onclick = () => baixar(false);
    MC.$('#bt-drive').onclick = () => baixar(true);
    MC.$('#bt-restaurar').onclick = () => MC.$('#in-restaurar').click();
    MC.$('#in-restaurar').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) try { await restaurar(f); } catch (er) { MC.aviso('❌ ' + er.message, 'erro'); } };
  });
  MC.backup = { gerar, baixar, restaurar };
})(window.MC);
