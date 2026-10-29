/* Meu Chat — 10-banco.js: onde tudo fica guardado (IndexedDB do aparelho — não some ao fechar). */
(function (MC) {
  'use strict';
  let dbP = null;
  function abrir() {
    if (!dbP) dbP = new Promise((ok, erro) => {
      const r = indexedDB.open('meu-chat', 1);
      r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('conversas')) db.createObjectStore('conversas', { keyPath: 'id' }); if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv'); };
      r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error);
    });
    return dbP;
  }
  const req = (q) => new Promise((ok, erro) => { q.onsuccess = () => ok(q.result); q.onerror = () => erro(q.error); });
  async function loja(nome, modo) { const db = await abrir(); return db.transaction(nome, modo || 'readonly').objectStore(nome); }
  MC.banco = {
    async todas() { return (await req((await loja('conversas')).getAll())).sort((a, b) => b.atualizado - a.atualizado); },
    async pegar(id) { return req((await loja('conversas')).get(id)); },
    async salvar(c) { c.atualizado = c.atualizado || Date.now(); return req((await loja('conversas', 'readwrite')).put(c)); },
    async apagar(id) { return req((await loja('conversas', 'readwrite')).delete(id)); },
    async kv(k, d) { const v = await req((await loja('kv')).get(k)); return v === undefined ? d : v; },
    async kvSet(k, v) { return req((await loja('kv', 'readwrite')).put(v, k)); },
  };
  // pede ao navegador para NÃO apagar os dados quando o celular encher
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})(window.MC);
