/* Meu Chat — 80-chat.js: a conversa (mensagens, fotos, mandar, parar, lista de conversas).
   Cada conversa fica guardada no aparelho. Vai para a IA: a memória + as últimas mensagens. */
(function (MC) {
  'use strict';
  const E = MC.esc;
  let conv = null, anexos = [], controle = null;

  function nova() { return { id: MC.uid(), titulo: 'Nova conversa', msgs: [], criado: Date.now(), atualizado: Date.now() }; }
  async function abrirConversa(id) {
    const c = id ? await MC.banco.pegar(id) : null;
    conv = c || nova(); MC.pref.set('conversaAberta', conv.id);
    pintar(); MC.fecharPaineis();
  }
  async function guardar() { conv.atualizado = Date.now(); await MC.banco.salvar(conv); }

  // ── fotos ──
  function reduzir(arquivo) {
    return new Promise((ok, erro) => {
      const img = new Image(); img.onload = () => {
        const max = 1280, k = Math.min(1, max / Math.max(img.width, img.height)); // menor = manda rápido (evita o erro 408)
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
        let q = 0.8, d = c.toDataURL('image/jpeg', q); while (d.length > 1.4e6 && q > 0.35) { q -= 0.15; d = c.toDataURL('image/jpeg', q); } ok({ tipo: 'image/jpeg', dados: d.split(',')[1] });
      };
      img.onerror = () => erro(new Error('não consegui abrir a imagem')); img.src = URL.createObjectURL(arquivo);
    });
  }
  async function anexar(arquivos) {
    for (const f of arquivos) { if (!/^image\//.test(f.type)) continue; try { anexos.push(await reduzir(f)); } catch (e) { MC.aviso(e.message, 'erro'); } }
    pintarAnexos();
  }
  function pintarAnexos() {
    const el = MC.$('#anexos'); el.hidden = !anexos.length;
    el.innerHTML = anexos.map((a, i) => '<div class="mini"><img src="data:' + a.tipo + ';base64,' + a.dados + '" alt="foto"><button data-tirar="' + i + '">✕</button></div>').join('');
  }

  // ── desenhar ──
  function htmlMsg(m, i) {
    const fotos = (m.fotos || []).map((f) => '<img class="anexo" src="data:' + f.tipo + ';base64,' + f.dados + '" alt="foto">').join('');
    if (m.papel === 'eu') return '<div class="msg eu" data-i="' + i + '">' + fotos + (m.texto ? '<div class="bolha">' + E(m.texto) + '</div>' : '') +
      '<div class="info">' + hora(m.quando) + '<button data-m="copiar">📋</button><button data-m="memoria" title="Guardar na memória">🧠</button></div></div>';
    const r = MC.texto.render((m.texto || '').replace(/^\s*\**LEVAR PARA O CLAUDE\**\s*\.?\s*$/gim, ''));
    const fontes = (m.fontes || []).length ? '<div class="fontes">🔗 Fontes:' + dedup(m.fontes).slice(0, 8).map((f) => '<a href="' + E(f.url) + '" target="_blank" rel="noopener">' + E(f.titulo || f.url) + '</a>').join('') + '</div>' : '';
    const feitos = (m.feitos || []).map((f) => '<div class="guardei">' + E(f) + '</div>').join('');
    const erro = m.erro ? '<div style="color:var(--er);white-space:pre-wrap">⚠ ' + E(m.erro) + '</div><div class="linha">' + (m.erro.includes('SEM_CHAVE') ? '' : '<button class="bt peq" data-m="denovo">↻ Tentar de novo</button>') + '<button class="bt peq" data-m="config">⚙️ Chaves</button></div>' : '';
    return '<div class="msg ia" data-i="' + i + '"><div class="bolha">' + r.html + erro + fontes + feitos + '</div>' +
      '<div class="info">' + hora(m.quando) + (m.ia ? ' · ' + E(m.ia) : '') + '<button data-m="copiar">📋</button><button data-m="ouvir" title="Ouvir">🔊</button><button data-m="memoria" title="Guardar na memória">🧠</button>' + (i === conv.msgs.length - 1 ? '<button data-m="denovo" title="Responder de novo">↻</button><button data-m="claude" title="Copia um resumo desta conversa (sem as chaves) para colar no app do Claude">📋→Claude</button>' : '') + '</div>' +
      (/LEVAR PARA O CLAUDE/i.test(m.texto || '') ? '<div class="linha"><button class="bt primario peq" data-m="claude">📋 Levar para o Claude</button></div>' : '') + '</div>';
  }
  const dedup = (l) => { const s = new Set(); return l.filter((f) => f.url && !s.has(f.url) && s.add(f.url)); };
  const hora = (t) => t ? new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  function pintar() {
    const el = MC.$('#conversa');
    MC.$('#tit-conversa').textContent = conv.titulo || 'Meu Chat';
    if (!conv.msgs.length) {
      el.innerHTML = '<div class="vazio"><h2>💬 Meu Chat</h2><p>Escreva ou toque no 🎤 para falar.<br>📷 manda foto ou print · 🌐 pesquisa na internet · 🔗 cole um link para ela ler · 🧠 ela lembra de você.</p><p class="pequeno">Primeira vez? Toque em ⚙️ e cole uma chave grátis do Gemini.</p></div>';
      return;
    }
    el.innerHTML = conv.msgs.map(htmlMsg).join('');
    conv.msgs.forEach((m, i) => { if (m.papel === 'ia') { const r = MC.texto.render(m.texto || ''); const b = el.querySelector('.msg[data-i="' + i + '"] .bolha'); if (b) MC.texto.ligar(b, r.blocos); } });
    el.scrollTop = el.scrollHeight;
  }

  // ── mandar ──
  async function mandar(textoForcado) {
    if (controle) { controle.abort(); return; }
    const ent = MC.$('#entrada');
    const texto = (textoForcado != null ? textoForcado : ent.value).trim();
    if (!texto && !anexos.length) return;
    MC.voz.pararFala();
    conv.msgs.push({ id: MC.uid(), papel: 'eu', texto, fotos: anexos.slice(), quando: Date.now() });
    if (conv.titulo === 'Nova conversa' && texto) conv.titulo = texto.slice(0, 48) + (texto.length > 48 ? '…' : '');
    ent.value = ''; ent.style.height = ''; anexos = []; pintarAnexos();
    await guardar(); pintar();
    await responder();
  }
  async function responder() {
    let voz = null;
    const busca = MC.$('#op-busca').checked;
    const ia = { id: MC.uid(), papel: 'ia', texto: '', quando: Date.now() };
    conv.msgs.push(ia); pintar();
    const bolha = MC.$('#conversa .msg:last-child .bolha'); bolha.classList.add('digitando');
    const btE = MC.$('#bt-enviar'); btE.textContent = '⏹'; btE.title = 'Parar';
    controle = new AbortController();
    try {
      const lista = await MC.ia.chaves(); if (!lista.length) throw new Error('SEM_CHAVE');
      const ativa = lista.find((c) => c.id === MC.pref.get('chaveAtiva', '')) || lista[0];
      const ultimo = conv.msgs[conv.msgs.length - 2];
      const net = await MC.internet.preparar(ultimo.texto || '', ativa.provedor, busca);
      if (net.avisos.length) MC.aviso(net.avisos.join(' · '), 'erro');
      const sistema = await MC.memoria.sistema(net.extras ? 'INFORMAÇÕES DE AGORA (internet):\n' + net.extras : '');
      const max = MC.pref.get('contexto', 30);
      const hist = conv.msgs.slice(0, -1).filter((m) => !m.erro).slice(-max).map((m, k, arr) => ({ papel: m.papel, texto: m.texto, fotos: k >= arr.length - 4 ? (m.fotos || []) : [] }));
      // 🔊 com a "Voz do aparelho", ela começa a falar enquanto a resposta chega (frase por frase)
      voz = (MC.$('#op-falar').checked || MC.$('#op-maos').checked) ? MC.voz.fluxo() : null;
      const r = await MC.ia.conversar(sistema, hist, { busca, sinal: controle.signal },
        (parcial) => { if (voz) voz.empurrar(parcial); bolha.innerHTML = MC.texto.render(parcial).html; const c = MC.$('#conversa'); if (c.scrollHeight - c.scrollTop - c.clientHeight < 200) c.scrollTop = c.scrollHeight; },
        (c) => MC.aviso('🔁 Essa chave chegou no limite: passei para ' + (c.apelido || MC.ia.P[c.provedor].nome)));
      const m = await MC.memoria.aplicarMarcas(r.texto);
      Object.assign(ia, { texto: m.limpo, feitos: m.feitos, fontes: dedup((r.fontes || []).concat(net.fontes)), ia: r.apelido + ' · ' + r.modelo, quando: Date.now() });
      MC.$('#tit-ia').textContent = r.apelido + ' · ' + r.modelo;
    } catch (e) {
      if (e.name === 'AbortError') { if (voz) { voz.cancelar(); voz = null; } ia.texto = (ia.texto || bolha.innerText || '') + '\n\n_(parei)_'; }
      else if (e.message === 'SEM_CHAVE') ia.erro = 'SEM_CHAVE: ainda não tem nenhuma chave de IA. Toque em ⚙️ Chaves e cole uma (a do Gemini é grátis).';
      else ia.erro = e.message;
    }
    controle = null; btE.textContent = '➤'; btE.title = 'Enviar';
    await guardar(); pintar();
    const falar = MC.$('#op-falar').checked || MC.$('#op-maos').checked;
    const depois = () => { if (MC.$('#op-maos').checked) setTimeout(() => ouvirEMandar(), 300); };
    if (voz) { if (ia.texto && !ia.erro) voz.terminar(ia.texto, depois); else voz.cancelar(); }
    else if (falar && ia.texto && !ia.erro) MC.voz.falar(ia.texto, depois);
  }
  function ouvirEMandar() { MC.voz.ouvir((t) => { if (t && MC.$('#op-maos').checked) mandar(t); }); }

  // 📋 resumo da conversa pronto para colar no app do Claude (sem as chaves)
  async function levarParaClaude() {
    if (!window.GuiaMaikon) return;
    const t = GuiaMaikon.resumoParaClaude({ app: 'Meu Chat', versao: 'v' + MC.versao, conversa: conv.msgs.map((m) => ({ quem: m.papel === 'eu' ? 'eu' : 'ia', texto: (m.texto || '') + (m.erro ? '\n⚠ ERRO: ' + m.erro : '') })) });
    try { await navigator.clipboard.writeText(t); } catch (e) {}
    if (confirm('📋 Copiei o resumo da conversa (sem as suas chaves). Abra o app do Claude e COLE.\n\nQuer baixar também como arquivo .md?')) MC.baixar('para-o-claude-' + new Date().toISOString().slice(0, 10) + '.md', t, 'text/markdown');
  }

  // ── ações das mensagens ──
  async function acao(e) {
    const b = e.target.closest('[data-m]'); if (!b) return; const el = b.closest('.msg'); const i = +el.dataset.i; const m = conv.msgs[i]; const a = b.dataset.m;
    if (a === 'copiar') MC.copiar(m.texto || '');
    if (a === 'ouvir') MC.voz.falar(m.texto || '');
    if (a === 'config') MC.config.abrir();
    if (a === 'memoria') { const t = prompt('Guardar na memória (uma frase curta):', (m.texto || '').slice(0, 200)); if (t && await MC.memoria.lembrar(t)) MC.aviso('🧠 Guardei na memória', 'ok'); }
    if (a === 'claude') return levarParaClaude();
    if (a === 'denovo') { if (conv.msgs[conv.msgs.length - 1].papel === 'ia') conv.msgs.pop(); await guardar(); pintar(); responder(); }
  }

  // ── lista de conversas ──
  async function pintarLista() {
    const q = (MC.$('#busca-conv').value || '').toLowerCase();
    const todas = await MC.banco.todas();
    const l = todas.filter((c) => !q || (c.titulo || '').toLowerCase().includes(q) || c.msgs.some((m) => (m.texto || '').toLowerCase().includes(q)));
    MC.$('#lista-conv').innerHTML = l.length ? l.map((c) => '<div class="conv-item' + (conv && c.id === conv.id ? ' on' : '') + '" data-id="' + c.id + '"><div class="nome"><div>' + E(c.titulo || 'Conversa') + '</div><small class="mudo">' + new Date(c.atualizado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + ' · ' + c.msgs.length + ' msg</small></div><button class="ic" data-c="renomear" title="Renomear">✏️</button><button class="ic" data-c="apagar" title="Apagar">🗑</button></div>').join('') : '<p class="mudo pequeno">' + (q ? 'Nada encontrado.' : 'Nenhuma conversa ainda.') + '</p>';
  }
  async function cliqueLista(e) {
    const it = e.target.closest('.conv-item'); if (!it) return; const id = it.dataset.id; const b = e.target.closest('[data-c]');
    if (!b) return abrirConversa(id);
    const c = await MC.banco.pegar(id);
    if (b.dataset.c === 'renomear') { const n = prompt('Nome da conversa:', c.titulo); if (n) { c.titulo = n; await MC.banco.salvar(c); if (conv.id === id) { conv.titulo = n; pintar(); } pintarLista(); } }
    if (b.dataset.c === 'apagar' && confirm('Apagar a conversa "' + c.titulo + '"?')) { await MC.banco.apagar(id); if (conv.id === id) await abrirConversa(null); pintarLista(); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const ent = MC.$('#entrada');
    ent.addEventListener('input', () => { ent.style.height = ''; ent.style.height = Math.min(ent.scrollHeight, innerHeight * 0.4) + 'px'; });
    ent.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (!e.shiftKey && matchMedia('(pointer:fine)').matches))) { e.preventDefault(); mandar(); } });
    MC.$('#bt-enviar').onclick = () => mandar();
    MC.$('#bt-mic').onclick = () => { if (MC.voz.falando) { MC.voz.pararFala(); return; } MC.voz.ouvir((t) => { if (t && (MC.$('#op-maos').checked || MC.pref.get('mandarAoFalar', true))) mandar(t); }); };
    MC.$('#bt-foto').onclick = () => MC.$('#in-foto').click();
    MC.$('#in-foto').onchange = (e) => { anexar(Array.from(e.target.files || [])); e.target.value = ''; };
    MC.$('#anexos').onclick = (e) => { const b = e.target.closest('[data-tirar]'); if (b) { anexos.splice(+b.dataset.tirar, 1); pintarAnexos(); } };
    ent.addEventListener('paste', (e) => { const fs = Array.from((e.clipboardData && e.clipboardData.files) || []); if (fs.length) { e.preventDefault(); anexar(fs); } }); // colar print
    MC.$('#conversa').addEventListener('click', acao);
    MC.$('#bt-conversas').onclick = () => { pintarLista(); MC.abrirPainel('gaveta'); };
    MC.$('#bt-nova').onclick = () => abrirConversa(null);
    MC.$('#busca-conv').oninput = pintarLista;
    MC.$('#lista-conv').onclick = cliqueLista;
    for (const id of ['op-busca', 'op-falar', 'op-maos']) { const c = MC.$('#' + id); c.checked = MC.pref.get(id, id === 'op-busca' ? false : false); c.onchange = () => { MC.pref.set(id, c.checked); if (id === 'op-maos' && c.checked) { MC.aviso('🙌 Mãos livres: fale depois do sinal; eu respondo falando e escuto de novo.'); ouvirEMandar(); } if (id === 'op-maos' && !c.checked) MC.voz.parar(); }; }
  });
  MC.chat = { abrirConversa, mandar, pintar, get conversa() { return conv; }, recarregar: async () => { if (conv) { const c = await MC.banco.pegar(conv.id); if (c) conv = c; } pintar(); } };
})(window.MC);
