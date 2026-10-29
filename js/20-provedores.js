/* Meu Chat — 20-provedores.js: conversar com as IAs (Gemini, Groq, OpenRouter, OpenAI, DeepSeek, Claude).
   - Várias chaves; quando uma acaba (limite/cota), passa sozinho para a próxima ("revezar").
   - Busca a lista de modelos de verdade na hora de testar a chave (nada de nome velho chumbado).
   - As chaves ficam SÓ neste aparelho. */
(function (MC) {
  'use strict';
  const P = {
    gemini: { nome: 'Gemini (Google)', gratis: true, base: 'https://generativelanguage.googleapis.com/v1beta', tipo: 'gemini', site: 'https://aistudio.google.com/apikey', padrao: 'gemini-2.5-flash', foto: true, busca: true },
    groq: { nome: 'Groq', gratis: true, base: 'https://api.groq.com/openai/v1', tipo: 'openai', site: 'https://console.groq.com/keys', padrao: 'llama-3.3-70b-versatile' },
    openrouter: { nome: 'OpenRouter', gratis: true, base: 'https://openrouter.ai/api/v1', tipo: 'openai', site: 'https://openrouter.ai/keys', padrao: 'openrouter/auto', foto: true },
    deepseek: { nome: 'DeepSeek', base: 'https://api.deepseek.com/v1', tipo: 'openai', site: 'https://platform.deepseek.com/api_keys', padrao: 'deepseek-chat' },
    openai: { nome: 'OpenAI (ChatGPT)', base: 'https://api.openai.com/v1', tipo: 'openai', site: 'https://platform.openai.com/api-keys', padrao: 'gpt-4o-mini', foto: true },
    ollama: { nome: '🦙 Ollama (no aparelho)', base: 'http://127.0.0.1:11434/v1', tipo: 'openai', site: 'https://ollama.com/download', padrao: 'llama3.2', foto: true, semChave: true },
    claude: { nome: 'Claude (Anthropic)', base: 'https://api.anthropic.com/v1', tipo: 'anthropic', site: 'https://console.anthropic.com/settings/keys', padrao: 'claude-sonnet-4-5', foto: true, busca: true },
  };
  // descobre o provedor pela cara da chave
  function detectar(chave) {
    chave = (chave || '').trim();
    if (/^AIza[\w-]{30,}$/.test(chave)) return 'gemini';
    if (/^gsk_/.test(chave)) return 'groq';
    if (/^sk-or-/.test(chave)) return 'openrouter';
    if (/^sk-ant-/.test(chave)) return 'claude';
    if (/^sk-/.test(chave)) return 'openai';
    return '';
  }

  // ── chaves ──
  // 🦙 Ollama: se estiver ligado no aparelho (pelo Mini SK/Termux, ou no computador), aparece sozinho — sem chave
  let ollamaVivo = false;
  async function procurarOllama() {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 1500);
      const r = await fetch('http://127.0.0.1:11434/api/tags', { signal: ctl.signal }); clearTimeout(t);
      const j = await r.json(); const ms = (j.models || []).map((m) => m.name).filter((n) => !/embed/.test(n));
      ollamaVivo = r.ok && ms.length > 0; if (ollamaVivo) MC.pref.set('modelos:ollama', ms);
    } catch { ollamaVivo = false; }
    MC.emit('ollama', ollamaVivo); return ollamaVivo;
  }
  async function chaves() {
    const l = (await MC.banco.kv('chaves', [])) || [];
    if (ollamaVivo && MC.pref.get('usarOllama', true)) l.push({ id: 'ollama', provedor: 'ollama', chave: 'ollama', apelido: '🦙 Ollama', automatica: true });
    return l;
  }
  async function salvarChaves(l) { await MC.banco.kvSet('chaves', l.filter((c) => !c.automatica)); MC.emit('chaves'); }
  const descanso = {}; // id da chave → até quando descansa (limite)

  // ── modelos ──
  function pontoGemini(n) {
    if (/tts|image|embed|aqa|live|audio|learnlm|robotic|computer|veo|imagen|native/.test(n)) return -1;
    let p = 0; const v = (n.match(/(\d+(?:\.\d+)?)/) || [])[1]; p += (parseFloat(v) || 0) * 10;
    if (/flash/.test(n)) p += 5; if (/lite/.test(n)) p -= 3; if (/preview|exp/.test(n)) p -= 2; if (/pro/.test(n)) p += 1;
    return p;
  }
  async function listarModelos(prov, chave) {
    const d = P[prov];
    if (d.tipo === 'gemini') {
      const r = await fetch(d.base + '/models?pageSize=200&key=' + encodeURIComponent(chave)); const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(erroLegivel(r.status, j));
      return (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent')).map((m) => m.name.replace(/^models\//, '')).filter((n) => pontoGemini(n) >= 0).sort((a, b) => pontoGemini(b) - pontoGemini(a));
    }
    if (prov === 'ollama') { await procurarOllama(); return MC.pref.get('modelos:ollama', []); }
    if (d.tipo === 'anthropic') {
      const r = await fetch(d.base + '/models?limit=100', { headers: cabAnthropic(chave) }); const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(erroLegivel(r.status, j));
      return (j.data || []).map((m) => m.id);
    }
    const r = await fetch(d.base + '/models', { headers: { Authorization: 'Bearer ' + chave } }); const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(erroLegivel(r.status, j));
    let l = (j.data || []).map((m) => m.id).filter((n) => !/whisper|tts|embed|guard|dall-e|moderation|audio|transcribe|image/.test(n));
    if (prov === 'openrouter') l = l.filter((n) => /:free$/.test(n)).concat(['openrouter/auto']);
    return l.sort();
  }
  async function modeloDe(prov) {
    const escolhido = MC.pref.get('modelo:' + prov, '');
    if (escolhido) return escolhido;
    const cache = MC.pref.get('modelos:' + prov, []);
    if (prov === 'groq') return cache.includes('llama-3.3-70b-versatile') ? 'llama-3.3-70b-versatile' : (cache[0] || P.groq.padrao);
    return cache[0] || P[prov].padrao;
  }
  async function testarChave(item) {
    const l = await listarModelos(item.provedor, item.chave);
    MC.pref.set('modelos:' + item.provedor, l);
    return l;
  }

  // ── erros em português ──
  function erroLegivel(status, j) {
    const m = (j && (j.error && (j.error.message || j.error) || j.message)) || '';
    const t = typeof m === 'string' ? m : JSON.stringify(m);
    if (status === 429 || /quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(t)) return 'LIMITE: essa chave chegou no limite (' + t.slice(0, 120) + ')';
    if (status === 401 || status === 403 || /API key not valid|invalid.*key|unauthorized|permission/i.test(t)) return 'CHAVE: a chave está errada ou sem permissão (' + t.slice(0, 120) + ')';
    if (status === 408 || status >= 500 || /overloaded|UNAVAILABLE|INTERNAL|DEADLINE/i.test(t)) return 'SERVIDOR: a IA está com problema ou demorou demais agora (erro ' + status + '). ' + t.slice(0, 100);
    if (status === 404 || /not found|does not exist|is not supported/i.test(t)) return 'MODELO: esse modelo não existe mais ou não aceita isso (' + t.slice(0, 160) + ')';
    return 'Erro ' + status + ': ' + t.slice(0, 200);
  }
  const ehLimite = (e) => /^(LIMITE|CHAVE|SERVIDOR|MODELO)/.test(e.message || '') || /Failed to fetch|NetworkError|Load failed/i.test(e.message || '');
  const cabAnthropic = (chave) => ({ 'x-api-key': chave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'content-type': 'application/json' });

  // ── leitura de "stream" (a resposta chegando aos pedaços) ──
  async function lerSSE(r, cada) {
    const leitor = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done } = await leitor.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i; while ((i = buf.indexOf('\n')) >= 0) {
        const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!l.startsWith('data:')) continue; const d = l.slice(5).trim(); if (!d || d === '[DONE]') continue;
        try { cada(JSON.parse(d)); } catch {}
      }
    }
  }

  // ── um pedido para UM provedor ──
  // msgs: [{papel:'eu'|'ia', texto, fotos:[{tipo,dados(base64)}]}]
  async function pedir(prov, chave, modelo, sistema, msgs, op, aoTexto) {
    const d = P[prov]; let texto = '', fontes = [];
    const parcial = (t) => { texto += t; aoTexto && aoTexto(texto); };
    if (d.tipo === 'gemini') {
      const corpo = {
        systemInstruction: { parts: [{ text: sistema }] },
        contents: msgs.map((m) => ({ role: m.papel === 'eu' ? 'user' : 'model', parts: [].concat(m.texto ? [{ text: m.texto }] : [], (m.fotos || []).map((f) => ({ inline_data: { mime_type: f.tipo, data: f.dados } }))) })).filter((c) => c.parts.length),
      };
      if (op.busca) corpo.tools = [{ google_search: {} }];
      const r = await fetch(d.base + '/models/' + modelo + ':streamGenerateContent?alt=sse&key=' + encodeURIComponent(chave), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo), signal: op.sinal });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(erroLegivel(r.status, j)); }
      await lerSSE(r, (j) => {
        const c = (j.candidates || [])[0]; if (!c) return;
        for (const p of (c.content && c.content.parts) || []) if (p.text && !p.thought) parcial(p.text);
        const g = c.groundingMetadata; if (g && g.groundingChunks) for (const ch of g.groundingChunks) if (ch.web) fontes.push({ url: ch.web.uri, titulo: ch.web.title || ch.web.uri });
      });
      return { texto, fontes };
    }
    if (d.tipo === 'anthropic') {
      const corpo = {
        model: modelo, max_tokens: 8192, system: sistema, stream: true,
        messages: msgs.map((m) => ({ role: m.papel === 'eu' ? 'user' : 'assistant', content: [].concat((m.fotos || []).map((f) => ({ type: 'image', source: { type: 'base64', media_type: f.tipo, data: f.dados } })), m.texto ? [{ type: 'text', text: m.texto }] : []) })).filter((m) => m.content.length),
      };
      if (op.busca) corpo.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }];
      let r = await fetch(d.base + '/messages', { method: 'POST', headers: cabAnthropic(chave), body: JSON.stringify(corpo), signal: op.sinal });
      if (!r.ok && op.busca && r.status === 400) { delete corpo.tools; r = await fetch(d.base + '/messages', { method: 'POST', headers: cabAnthropic(chave), body: JSON.stringify(corpo), signal: op.sinal }); }
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(erroLegivel(r.status, j)); }
      await lerSSE(r, (j) => {
        if (j.type === 'content_block_delta' && j.delta && j.delta.type === 'text_delta') parcial(j.delta.text);
        if (j.type === 'content_block_start' && j.content_block && j.content_block.type === 'web_search_tool_result') for (const x of j.content_block.content || []) if (x.url) fontes.push({ url: x.url, titulo: x.title || x.url });
      });
      return { texto, fontes };
    }
    // OpenAI e compatíveis
    const corpo = {
      model: modelo, stream: true,
      messages: [{ role: 'system', content: sistema }].concat(msgs.map((m) => ({ role: m.papel === 'eu' ? 'user' : 'assistant', content: (m.fotos && m.fotos.length && m.papel === 'eu') ? [{ type: 'text', text: m.texto || 'Veja a imagem.' }].concat(m.fotos.map((f) => ({ type: 'image_url', image_url: { url: 'data:' + f.tipo + ';base64,' + f.dados } }))) : (m.texto || '') }))),
    };
    const cab = { Authorization: 'Bearer ' + chave, 'content-type': 'application/json' };
    if (prov === 'openrouter') { cab['HTTP-Referer'] = location.origin.startsWith('http') ? location.origin : 'https://meuchat.local'; cab['X-Title'] = 'Meu Chat'; }
    const r = await fetch(d.base + '/chat/completions', { method: 'POST', headers: cab, body: JSON.stringify(corpo), signal: op.sinal });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(erroLegivel(r.status, j)); }
    await lerSSE(r, (j) => { const c = (j.choices || [])[0]; if (c && c.delta && c.delta.content) parcial(c.delta.content); });
    return { texto, fontes };
  }

  // ── conversar: escolhe a chave, e se der limite passa para a próxima ──
  async function conversar(sistema, msgs, op, aoTexto, aoTrocar) {
    const lista = await chaves();
    if (!lista.length) throw new Error('SEM_CHAVE');
    const ativa = MC.pref.get('chaveAtiva', lista[0].id);
    const revezar = MC.pref.get('revezar', true);
    const temFoto = msgs.some((m) => m.fotos && m.fotos.length);
    let ordem = [lista.find((c) => c.id === ativa) || lista[0]];
    if (revezar) ordem = ordem.concat(lista.filter((c) => c !== ordem[0]));
    const erros = [];
    for (const c of ordem) {
      if (descanso[c.id] && descanso[c.id] > Date.now()) { erros.push((c.apelido || P[c.provedor].nome) + ': descansando (limite)'); continue; }
      if (temFoto && !P[c.provedor].foto && ordem.length > 1) continue; // essa IA não vê imagem: pula
      const modelo = await modeloDe(c.provedor);
      try {
        if (c !== ordem[0] && aoTrocar) aoTrocar(c);
        let r, m = modelo;
        try { r = await pedir(c.provedor, c.chave, m, sistema, msgs, op, aoTexto); }
        catch (e1) {
          if (e1.name === 'AbortError' || !/^(SERVIDOR|MODELO)/.test(e1.message || '')) throw e1;
          // erro 500/503/408 ou modelo que sumiu: espera um pouco e tenta de novo com OUTRO modelo da mesma IA
          await new Promise((ok) => setTimeout(ok, 1500));
          const outros = MC.pref.get('modelos:' + c.provedor, []).filter((x) => x !== m);
          m = outros[0] || P[c.provedor].padrao; if (m === modelo) throw e1;
          if (aoTrocar) aoTrocar(Object.assign({}, c, { apelido: (c.apelido || P[c.provedor].nome) + ' (modelo ' + m + ')' }));
          r = await pedir(c.provedor, c.chave, m, sistema, msgs, op, aoTexto);
        }
        if (!r.texto.trim()) throw new Error('SERVIDOR: a IA respondeu vazio.');
        return Object.assign(r, { provedor: c.provedor, modelo: m, apelido: c.apelido || P[c.provedor].nome });
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        erros.push((c.apelido || P[c.provedor].nome) + ': ' + e.message);
        if (ehLimite(e)) descanso[c.id] = Date.now() + 60 * 1000;
        if (!revezar) break;
      }
    }
    throw new Error(erros.join('\n'));
  }

  procurarOllama(); setInterval(() => procurarOllama(), 30000); // ligou o Ollama depois? aparece sozinho
  MC.ia = { P, detectar, procurarOllama, get ollamaVivo() { return ollamaVivo; }, chaves, salvarChaves, testarChave, listarModelos, modeloDe, conversar, pedir };
})(window.MC);
