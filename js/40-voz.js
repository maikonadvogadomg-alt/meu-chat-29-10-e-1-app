/* Meu Chat — 40-voz.js: 🎤 falar (ditado) e 🔊 ouvir a resposta.
   🔊 DOIS "motores" de voz (⚙️ → Voz):
   - 📱 "Voz do aparelho" (o padrão): funciona com QUALQUER IA (Gemini, Groq, Claude, Ollama…),
     grátis e sem limite. Você escolhe a voz (as ⭐ são as naturais), a velocidade e o tom
     (o seu jurídico usava 1.15 e 0.95). Ela COMEÇA A FALAR ENQUANTO O TEXTO AINDA ESTÁ
     CHEGANDO, frase por frase — não espera terminar de escrever.
       · No APK: usa as vozes do próprio Android (ponte window.AndroidFala).
       · No Chrome/Edge: as vozes do navegador (no Edge do computador aparecem as
         "Microsoft Francisca/Antonio Online (Natural)" — as neurais).
   - ✨ "Gemini": a voz do Gemini (bonita, mas gasta a cota da chave e corta quando acaba).
   🎤 Ditado: o do Chrome, ou no APK a ponte de voz do Android (window.AndroidVoz). */
(function (MC) {
  'use strict';
  const VOZES = ['Kore', 'Aoede', 'Leda', 'Zephyr', 'Puck', 'Charon', 'Fenrir', 'Orus', 'Despina', 'Achird', 'Algieba', 'Sulafat'];
  let rec = null, ouvindo = false, audio = null, falando = false, filaTok = 0;

  // ── 🎤 ditado ──
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function podeOuvir() { return !!(window.AndroidVoz || SR); }
  function ouvir(aoFim) {
    if (ouvindo) { parar(); return; }
    pararFala();
    if (window.AndroidVoz && window.AndroidVoz.ouvir) { // ponte nativa (APK)
      window.__vozResultado = (t) => { ouvindo = false; marcar(); const e = MC.$('#entrada'); if (t) { e.value = t; e.dispatchEvent(new Event('input')); } aoFim && aoFim(String(t || '')); };
      window.__vozErro = (m) => { ouvindo = false; marcar(); MC.aviso('🎤 ' + m, 'erro'); };
      const ent = MC.$('#entrada'), antes = ent.value ? ent.value.replace(/\s*$/, ' ') : '';
      window.__vozParcial = (t) => { ent.value = antes + t; ent.dispatchEvent(new Event('input')); };
      ouvindo = true; marcar(); window.AndroidVoz.ouvir('pt-BR'); return;
    }
    if (!SR) { MC.aviso('🎤 Aqui não tem ditado por voz. Use o app instalado pelo Chrome (menu ⋮ → Instalar app), ou o teclado com microfone do Google.', 'erro'); return; }
    rec = new SR(); rec.lang = 'pt-BR'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    const ent = MC.$('#entrada'), antes = ent.value ? ent.value.replace(/\s*$/, ' ') : '';
    let final = '';
    rec.onresult = (e) => { let parcial = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) final += t; else parcial += t; } ent.value = antes + final + parcial; ent.dispatchEvent(new Event('input')); };
    rec.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') MC.aviso('🎤 Sem permissão de microfone. Toque no cadeado ao lado do endereço → Microfone → Permitir.', 'erro'); else if (e.error !== 'no-speech' && e.error !== 'aborted') MC.aviso('🎤 ' + e.error, 'erro'); };
    rec.onend = () => { ouvindo = false; marcar(); rec = null; if (aoFim) aoFim((antes + final).trim()); };
    try { rec.start(); ouvindo = true; marcar(); } catch (e) { MC.aviso('🎤 ' + e.message, 'erro'); }
  }
  function parar() { try { rec && rec.stop(); } catch {} try { window.AndroidVoz && window.AndroidVoz.parar && window.AndroidVoz.parar(); } catch {} ouvindo = false; marcar(); }
  function marcar() { const b = MC.$('#bt-mic'); if (b) { b.classList.toggle('ouvindo', ouvindo || falando); b.textContent = falando ? '⏹' : '🎤'; b.title = falando ? 'Parar a voz' : ouvindo ? 'Ouvindo… toque para parar' : 'Falar'; } }

  // ── texto bom para falar ──
  function paraFala(t) {
    return String(t || '').replace(/\[\[(?:lembrar|esquecer):[^\]]*\]\]/gi, '').replace(/```[\s\S]*?```/g, ' (o código está na tela) ').replace(/```[\s\S]*$/, ' ').replace(/`([^`]+)`/g, '$1')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/https?:\/\/\S+/g, ' link ')
      .replace(/[*_#>|]+/g, ' ').replace(/^\s*[-•]\s+/gm, '').replace(/\s+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
  }
  function pedacos(t, max) {
    const frases = t.split(/(?<=[.!?…:;])\s+|\n+/); const out = []; let a = '';
    for (const f of frases) { if ((a + ' ' + f).length > max && a) { out.push(a.trim()); a = ''; } a += ' ' + f; }
    if (a.trim()) out.push(a.trim()); return out;
  }

  // ═════════ 📱 VOZ DO APARELHO (qualquer IA, grátis) ═════════
  const motor = () => MC.pref.get('motorVoz', 'aparelho');
  const temAndroid = () => !!(window.AndroidFala && window.AndroidFala.falar);
  const temNavegador = () => 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const natural = (n) => /natural|online|neural|network|google|premium|enhanced|melhorad/i.test(n || '');
  function vozesAparelho() {
    if (temAndroid()) {
      try { return JSON.parse(window.AndroidFala.vozes() || '[]').map((v) => ({ id: v.nome, nome: v.nome, lingua: v.lingua, natural: !!v.rede || natural(v.nome), rede: !!v.rede })); } catch { return []; }
    }
    if (!temNavegador()) return [];
    return speechSynthesis.getVoices().filter((v) => /^pt/i.test(v.lang)).map((v) => ({ id: v.voiceURI || v.name, nome: v.name, lingua: v.lang, natural: natural(v.name) }))
      .sort((a, b) => (b.natural - a.natural) || (/BR/i.test(b.lingua) - /BR/i.test(a.lingua)));
  }
  const cfgVoz = () => ({ voz: MC.pref.get('vozAparelhoNome', ''), vel: +MC.pref.get('vozVelocidade', 1.15) || 1, tom: +MC.pref.get('vozTom', 0.95) || 1 });

  // fila de frases: cada uma vira uma "fala"; quando a última termina, chama aoFim
  let fila = null; // { tok, pendentes, acabou, aoFim }
  let nId = 0;
  function falarFrase(texto, aoTerminar) {
    const c = cfgVoz();
    if (temAndroid()) {
      const id = 'f' + (++nId);
      esperando[id] = aoTerminar;
      try { window.AndroidFala.falar(id, texto, c.voz || '', c.vel, c.tom, true); } catch (e) { delete esperando[id]; aoTerminar(); }
      return;
    }
    if (!temNavegador()) { MC.aviso('🔊 Este aparelho não tem voz. Use ⚙️ → Voz → Gemini.', 'erro'); aoTerminar(); return; }
    const u = new SpeechSynthesisUtterance(texto); u.lang = 'pt-BR'; u.rate = c.vel; u.pitch = c.tom;
    const v = speechSynthesis.getVoices().find((x) => (x.voiceURI || x.name) === c.voz) || speechSynthesis.getVoices().find((x) => /pt-BR/i.test(x.lang) && natural(x.name)) || speechSynthesis.getVoices().find((x) => /pt-BR/i.test(x.lang));
    if (v) u.voice = v;
    u.onend = u.onerror = () => aoTerminar();
    speechSynthesis.speak(u);
  }
  const esperando = {};
  window.__falaFim = (id) => { const f = esperando[id]; delete esperando[id]; f && f(); };
  window.__falaErro = (id, m) => { const f = esperando[id]; delete esperando[id]; if (m) MC.aviso('🔊 ' + m, 'erro'); f && f(); };
  function enfileirar(t) {
    if (!fila) return; const tok = fila.tok;
    for (const p of pedacos(t, 260)) {
      if (!p.trim()) continue; fila.pendentes++;
      falarFrase(p, () => { if (!fila || fila.tok !== tok) return; fila.pendentes--; verificarFim(); });
    }
  }
  function verificarFim() { if (fila && fila.acabou && fila.pendentes <= 0) { const f = fila.aoFim; fila = null; falando = false; marcar(); f && f(); } }
  function pararAparelho() {
    try { window.AndroidFala && window.AndroidFala.parar && window.AndroidFala.parar(); } catch {}
    try { temNavegador() && speechSynthesis.cancel(); } catch {}
    for (const k of Object.keys(esperando)) delete esperando[k];
  }

  // 🔊 falando ENQUANTO chega: MC.voz.fluxo() → .empurrar(textoAtéAgora) … .terminar(textoFinal, aoFim)
  function fluxo() {
    if (motor() !== 'aparelho') return null;
    pararFala();
    const meu = { tok: ++filaTok, pendentes: 0, acabou: false, aoFim: null };
    fila = meu; let falado = 0;
    const pegar = (bruto, tudo) => {
      if (!fila || fila !== meu) return;
      const limpo = paraFala(bruto);
      if (limpo.length < falado) return;
      let resto = limpo.slice(falado);
      if (!tudo) { const m = resto.match(/^[\s\S]*[.!?…:;\n](?=\s)/); if (!m) return; resto = m[0]; }
      falado += resto.length;
      if (resto.trim()) { if (!falando) { falando = true; marcar(); } enfileirar(resto); }
    };
    return {
      empurrar: (t) => pegar(t, false),
      terminar: (t, aoFim) => { if (fila !== meu) { aoFim && aoFim(); return; } pegar(t, true); meu.acabou = true; meu.aoFim = aoFim; verificarFim(); },
      cancelar: () => { if (fila === meu) pararFala(); },
    };
  }

  // ═════════ ✨ GEMINI (opcional) ═════════
  function wav(pcm, taxa) {
    const h = new ArrayBuffer(44), v = new DataView(h), w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, taxa, true); v.setUint32(28, taxa * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, pcm.length, true);
    return new Blob([h, pcm], { type: 'audio/wav' });
  }
  const b64bytes = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
  async function chaveGemini() { const l = await MC.ia.chaves(); return l.filter((c) => c.provedor === 'gemini'); }
  async function modeloTTS(chave) {
    const guardado = MC.pref.get('modeloTTS', ''); if (guardado) return guardado;
    try {
      const r = await fetch(MC.ia.P.gemini.base + '/models?pageSize=200&key=' + encodeURIComponent(chave)); const j = await r.json();
      const l = (j.models || []).map((m) => m.name.replace(/^models\//, '')).filter((n) => /tts/.test(n));
      const ponto = (n) => (parseFloat((n.match(/(\d+(?:\.\d+)?)/) || [])[1]) || 0) * 10 + (/flash/.test(n) ? 3 : 0) - (/lite/.test(n) ? 1 : 0) - (/preview/.test(n) ? 0.5 : 0);
      l.sort((a, b) => ponto(b) - ponto(a)); if (l[0]) { MC.pref.set('modeloTTS', l[0]); return l[0]; }
    } catch {}
    return 'gemini-2.5-flash-preview-tts';
  }
  async function sintetizar(texto, chave) {
    const voz = MC.pref.get('voz', 'Kore'), modelo = await modeloTTS(chave), base = MC.ia.P.gemini.base;
    // 28/10: o "estilo" ia junto no texto e às vezes ela LIA a instrução em voz alta (a "repetição").
    // Agora só vai o texto; o estilo só se você escrever um em ⚙️.
    const estilo = (MC.pref.get('estiloVoz2', '') || '').trim();
    const falarTexto = estilo ? estilo + ':\n' + texto : texto;
    let r = await fetch(base + '/models/' + modelo + ':generateContent?key=' + encodeURIComponent(chave), { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: falarTexto }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } } } }) });
    let j = await r.json().catch(() => ({}));
    let dados = null;
    try { dados = j.candidates[0].content.parts.find((p) => p.inlineData || p.inline_data); dados = (dados.inlineData || dados.inline_data).data; } catch { dados = null; }
    if (!dados) throw new Error((r.status === 429 ? 'acabou a cota de voz desta chave do Gemini — use a 📱 Voz do aparelho em ⚙️' : 'voz: ' + ((j.error && j.error.message) || r.status)));
    const bytes = b64bytes(dados);
    const ehWav = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    return ehWav ? new Blob([bytes], { type: 'audio/wav' }) : wav(bytes, 24000);
  }
  function tocar(blob) {
    return new Promise((ok) => { audio = new Audio(URL.createObjectURL(blob)); audio.onended = audio.onerror = () => ok(); audio.play().catch(() => ok()); });
  }

  // ── falar um texto inteiro (botão 🔊 da mensagem, teste, ou motor Gemini) ──
  async function falar(texto, aoFim) {
    if (motor() === 'aparelho') { const f = fluxo(); if (!f) { aoFim && aoFim(); return; } f.terminar(texto, aoFim); return; }
    pararFala(); const meu = ++filaTok;
    const t = paraFala(texto); if (!t) { aoFim && aoFim(); return; }
    const ks = await chaveGemini();
    if (!ks.length) { MC.aviso('🔊 A voz do Gemini precisa de uma chave do Gemini. Ou use ⚙️ → Voz → 📱 Voz do aparelho (qualquer IA).', 'erro'); aoFim && aoFim(); return; }
    falando = true; marcar();
    try {
      const partes = pedacos(t, 700); let k = 0, prox = null;
      const gerar = async (p) => { for (let i = 0; i < ks.length; i++) { try { return await sintetizar(p, ks[(k + i) % ks.length].chave); } catch (e) { if (i === ks.length - 1) throw e; k++; } } };
      for (let i = 0; i < partes.length && meu === filaTok; i++) {
        const atual = prox ? await prox : await gerar(partes[i]);
        prox = i + 1 < partes.length ? gerar(partes[i + 1]) : null;
        if (meu !== filaTok) break; await tocar(atual);
      }
    } catch (e) { MC.aviso('🔊 Não consegui falar: ' + e.message, 'erro'); }
    if (meu === filaTok) { falando = false; marcar(); aoFim && aoFim(); }
  }
  function pararFala() { filaTok++; fila = null; try { audio && audio.pause(); } catch {} pararAparelho(); falando = false; marcar(); }
  if (temNavegador()) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => MC.emit('vozes'); } catch {} }
  window.__falaPronta = (function (antes) { return function () { try { antes && antes(); } catch {} MC.emit('vozes'); }; })(window.__falaPronta);
  MC.voz = { VOZES, ouvir, parar, falar, fluxo, pararFala, podeOuvir, vozesAparelho, motor, get falando() { return falando; }, get ouvindo() { return ouvindo; }, paraFala, sintetizar,
    get temAndroid() { return temAndroid(); } };
})(window.MC);
