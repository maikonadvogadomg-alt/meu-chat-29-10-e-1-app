/* Meu Chat — 85-config.js: ⚙️ chaves das IAs, modelo, busca, voz, instruções, tema. */
(function (MC) {
  'use strict';
  const E = MC.esc;
  function opcoesVoz() {
    const l = MC.voz.vozesAparelho(), atual = MC.pref.get('vozAparelhoNome', '');
    if (!l.length) return '<option value="">(a voz padrão do aparelho)</option>';
    return '<option value="">Automática (a melhor em português)</option>' + l.map((v) => '<option value="' + E(v.id) + '"' + (v.id === atual ? ' selected' : '') + '>' + (v.natural ? '⭐ ' : '') + E(v.nome) + ' · ' + E(v.lingua) + '</option>').join('');
  }
  async function pintar() {
    const P = MC.ia.P, lista = await MC.ia.chaves(), ativa = MC.pref.get('chaveAtiva', lista[0] && lista[0].id);
    const usados = [...new Set(lista.map((c) => c.provedor))];
    const buscaTipo = MC.pref.get('buscaTipo', ''), buscaChave = await MC.banco.kv('buscaChave', '');
    MC.$('#config-corpo').innerHTML =
      '<div class="cartao"><h3>🔑 Chaves das IAs</h3><p class="mudo pequeno">Ficam só neste aparelho. Grátis: ' + Object.keys(P).filter((k) => P[k].gratis).map((k) => '<a href="' + P[k].site + '" target="_blank" rel="noopener">' + E(P[k].nome) + '</a>').join(' · ') + '. Paga (quando quiser): <a href="' + P.claude.site + '" target="_blank" rel="noopener">Claude</a>.</p>' +
        (lista.length ? lista.map((c) => '<div class="chave" data-id="' + c.id + '"><button class="ic" data-k="ativar" title="Usar esta primeiro">' + (c.id === ativa ? '⭐' : '☆') + '</button><div style="flex:1;min-width:0"><b>' + E(c.apelido || P[c.provedor].nome) + '</b><br><code class="mudo pequeno">' + (c.automatica ? 'sem chave · ligado no aparelho' : E(c.chave.slice(0, 6) + '…' + c.chave.slice(-4))) + '</code></div><button class="bt peq" data-k="testar">🧪 Testar</button><button class="ic" data-k="apagar" title="Apagar">🗑</button></div>').join('') : '<p class="pequeno">Nenhuma chave ainda.</p>') +
        '<div class="linha"><input class="campo" id="nova-chave" placeholder="Cole a chave aqui" autocomplete="off" style="flex:1"></div>' +
        '<div class="linha"><select class="campo" id="nova-prov" style="flex:1"><option value="">(descobrir sozinho)</option>' + Object.keys(P).map((k) => '<option value="' + k + '">' + E(P[k].nome) + '</option>').join('') + '</select><input class="campo" id="nova-apelido" placeholder="Apelido (opcional)" style="flex:1"></div>' +
        '<div class="linha"><button class="bt primario" id="bt-add-chave">＋ Guardar chave</button><span id="chave-status" class="pequeno"></span></div>' +
        '<label class="pequeno"><input type="checkbox" id="cf-revezar"' + (MC.pref.get('revezar', true) ? ' checked' : '') + '> 🔁 Revezar: quando uma chave chega no limite, passa sozinho para a próxima</label></div>' +
      '<div class="cartao"><h3>🦙 Ollama (IA dentro do aparelho)</h3>' + (MC.ia.ollamaVivo ? '<p class="pequeno">✅ <b>Encontrei o Ollama ligado</b> (' + MC.pref.get('modelos:ollama', []).length + ' modelo(s)). Ele entra sozinho na lista de chaves: toque na ☆ dele para usar primeiro. Funciona até sem internet.</p><label class="pequeno"><input type="checkbox" id="cf-ollama"' + (MC.pref.get('usarOllama', true) ? ' checked' : '') + '> Usar o Ollama quando ele estiver ligado</label>' : '<p class="pequeno">Não está ligado agora. Ligue pelo <b>Mini SK → 📱 Termux → 🦙 Ligar o Ollama para a IA</b> (ou abra o Ollama no computador) e toque em 🔍.</p>') + '<div class="linha"><button class="bt" id="cf-ollama-procurar">🔍 Procurar de novo</button></div></div>' +
      (usados.length ? '<div class="cartao"><h3>🤖 Modelo de cada IA</h3><p class="mudo pequeno">A lista vem da própria IA quando você toca em 🧪 Testar. "Automático" escolhe o mais novo.</p>' + usados.map((p) => { const ms = MC.pref.get('modelos:' + p, []), m = MC.pref.get('modelo:' + p, ''); return '<div class="linha"><b style="min-width:7em">' + E(P[p].nome) + '</b><select class="campo" data-modelo="' + p + '" style="flex:1"><option value="">Automático</option>' + ms.map((x) => '<option' + (x === m ? ' selected' : '') + '>' + E(x) + '</option>').join('') + (m && !ms.includes(m) ? '<option selected>' + E(m) + '</option>' : '') + '</select></div>'; }).join('') + '</div>' : '') +
      '<div class="cartao"><h3>🌐 Pesquisa na internet</h3><p class="mudo pequeno">O Gemini e o Claude pesquisam sozinhos. Para as outras IAs, use a sua chave de busca:</p>' +
        '<div class="linha"><select class="campo" id="cf-busca-tipo" style="flex:1"><option value="">Nenhuma</option>' + Object.keys(MC.internet.BUSCAS).map((k) => '<option value="' + k + '"' + (k === buscaTipo ? ' selected' : '') + '>' + E(MC.internet.BUSCAS[k].nome) + '</option>').join('') + '</select></div>' +
        '<div class="linha"><input class="campo" id="cf-busca-chave" placeholder="Chave da busca" value="' + E(buscaChave) + '" autocomplete="off" style="flex:1"><button class="bt" id="cf-busca-testar">🧪</button></div><div id="busca-status" class="pequeno"></div></div>' +
      '<div class="cartao" id="cartao-voz"><h3>🔊 Voz</h3>' +
        '<div class="linha"><label class="op"><input type="radio" name="cf-motor" value="aparelho"' + (MC.voz.motor() === 'aparelho' ? ' checked' : '') + '> 📱 Voz do aparelho</label><label class="op"><input type="radio" name="cf-motor" value="gemini"' + (MC.voz.motor() === 'gemini' ? ' checked' : '') + '> ✨ Gemini</label></div>' +
        (MC.voz.motor() === 'aparelho'
          ? '<p class="mudo pequeno">Funciona com <b>qualquer IA</b>, grátis e sem limite, e <b>começa a falar enquanto a resposta chega</b>. As ⭐ são as vozes naturais.' + (MC.voz.temAndroid ? ' (vozes do Android)' : ' No computador, abra pelo <b>Edge</b> para ter as vozes neurais da Microsoft (Francisca, Antonio).') + '</p>' +
            '<div class="linha"><select class="campo" id="cf-voz-ap" style="flex:1">' + opcoesVoz() + '</select></div>' +
            '<div class="linha"><span class="pequeno" style="min-width:6.5em">Velocidade <b id="cf-vel-v">' + (+MC.pref.get('vozVelocidade', 1.15)).toFixed(2) + '</b></span><input type="range" id="cf-vel" min="0.6" max="2" step="0.05" value="' + MC.pref.get('vozVelocidade', 1.15) + '" style="flex:1"></div>' +
            '<div class="linha"><span class="pequeno" style="min-width:6.5em">Tom <b id="cf-tom-v">' + (+MC.pref.get('vozTom', 0.95)).toFixed(2) + '</b></span><input type="range" id="cf-tom" min="0.5" max="1.6" step="0.05" value="' + MC.pref.get('vozTom', 0.95) + '" style="flex:1"></div>' +
            '<div class="linha"><button class="bt" id="cf-voz-testar">🎧 Ouvir</button><button class="bt" id="cf-voz-jur">⚖️ Igual ao jurídico (1.15 · 0.95)</button></div>'
          : '<p class="mudo pequeno">Voz do Gemini: bonita, mas gasta a cota da sua chave do Gemini e para quando ela acaba. Só fala depois que a resposta termina.</p>' +
            '<div class="linha"><select class="campo" id="cf-voz" style="flex:1">' + MC.voz.VOZES.map((v) => '<option' + (v === MC.pref.get('voz', 'Kore') ? ' selected' : '') + '>' + v + '</option>').join('') + '</select><button class="bt" id="cf-voz-testar">🎧 Ouvir</button></div>' +
            '<input class="campo" id="cf-estilo" value="' + E(MC.pref.get('estiloVoz2', '')) + '" placeholder="Jeito de falar (opcional) — ex.: calma e clara" title="Como ela deve falar">') +
        '<label class="pequeno" style="display:block;margin-top:6px"><input type="checkbox" id="cf-mandar"' + (MC.pref.get('mandarAoFalar', true) ? ' checked' : '') + '> 🎤 Mandar sozinho quando eu parar de falar</label></div>' +
      '<div class="cartao"><h3>📝 Instruções para a IA</h3><p class="mudo pequeno">Vai junto em toda conversa (ex.: "responda curto", "sou advogado previdenciarista").</p><textarea class="campo" id="cf-instr" rows="4">' + E(MC.pref.get('instrucoes', '')) + '</textarea>' +
        '<div class="linha"><span class="pequeno">Mensagens que vão junto:</span><input type="number" class="campo" id="cf-contexto" min="4" max="200" value="' + MC.pref.get('contexto', 30) + '" style="width:6em"></div></div>' +
      '<div class="cartao"><h3>🎨 Tema</h3><select class="campo" id="cf-tema"><option value="">Automático</option><option value="escuro">Escuro</option><option value="claro">Claro</option></select></div>' +
      '<div class="cartao" id="cartao-cofre"></div>' +
      '<p class="mudo pequeno">Meu Chat ' + MC.versao + '</p>';
    MC.$('#cf-tema').value = MC.pref.get('tema', '');
    if (MC.cofre) await MC.cofre.pintar();
  }
  async function clique(e) {
    const b = e.target.closest('button'); if (!b) return;
    const lista = await MC.ia.chaves();
    const linha = b.closest('[data-id]'); const item = linha && lista.find((c) => c.id === linha.dataset.id);
    if (b.dataset.k === 'ativar' && item) { MC.pref.set('chaveAtiva', item.id); pintar(); }
    if (b.dataset.k === 'apagar' && item && item.automatica) { MC.pref.set('usarOllama', false); pintar(); return; }
    if (b.dataset.k === 'apagar' && item && confirm('Apagar esta chave?')) { await MC.ia.salvarChaves(lista.filter((c) => c !== item)); pintar(); }
    if (b.dataset.k === 'testar' && item) { b.textContent = '⏳'; try { const ms = await MC.ia.testarChave(item); MC.aviso('✅ Funciona! ' + ms.length + ' modelo(s). Vou usar: ' + (await MC.ia.modeloDe(item.provedor)), 'ok'); pintar(); } catch (er) { MC.aviso('❌ ' + er.message, 'erro'); b.textContent = '🧪 Testar'; } }
    if (b.id === 'bt-add-chave') {
      const chave = MC.$('#nova-chave').value.trim(); if (!chave) return;
      const prov = MC.$('#nova-prov').value || MC.ia.detectar(chave);
      if (!prov) { MC.$('#chave-status').textContent = '❓ Não reconheci: escolha de qual IA é.'; return; }
      const item2 = { id: MC.uid(), provedor: prov, chave, apelido: MC.$('#nova-apelido').value.trim() || MC.ia.P[prov].nome + (lista.some((c) => c.provedor === prov) ? ' ' + (lista.filter((c) => c.provedor === prov).length + 1) : '') };
      await MC.ia.salvarChaves(lista.concat(item2)); if (!lista.length) MC.pref.set('chaveAtiva', item2.id);
      MC.$('#chave-status').textContent = '⏳ Testando…';
      try { const ms = await MC.ia.testarChave(item2); MC.aviso('✅ ' + item2.apelido + ' funciona (' + ms.length + ' modelos)', 'ok'); } catch (er) { MC.aviso('Guardei, mas o teste falhou: ' + er.message, 'erro'); }
      pintar();
    }
    if (b.id === 'cf-ollama-procurar') { b.textContent = '⏳'; const ok = await MC.ia.procurarOllama(); MC.aviso(ok ? '🦙 Achei o Ollama!' : '🦙 Não achei o Ollama ligado.', ok ? 'ok' : 'erro'); pintar(); }
    if (b.id === 'cf-voz-testar') { if (MC.$('#cf-voz')) MC.pref.set('voz', MC.$('#cf-voz').value); MC.voz.falar('Olá, Maikon! Esta é a minha voz. Eu posso ler as respostas para você, enquanto elas chegam.'); }
    if (b.id === 'cf-voz-jur') { MC.pref.set('vozVelocidade', 1.15); MC.pref.set('vozTom', 0.95); pintar(); MC.aviso('⚖️ Velocidade 1.15 e tom 0.95, igual ao seu jurídico.', 'ok'); }
    if (b.id === 'cf-busca-testar') { const st = MC.$('#busca-status'); st.textContent = '⏳'; try { const r = await MC.internet.buscar('previdência social INSS'); st.textContent = r ? '✅ Funciona: ' + r.length + ' resultados' : 'Escolha o serviço e cole a chave.'; } catch (er) { st.textContent = '❌ ' + er.message + (/Failed to fetch/.test(er.message) ? ' (o navegador bloqueou: esse serviço pode não aceitar pedidos direto do celular)' : ''); } }
  }
  function mudou(e) {
    const t = e.target;
    if (t.dataset.modelo) MC.pref.set('modelo:' + t.dataset.modelo, t.value);
    if (t.id === 'cf-ollama') MC.pref.set('usarOllama', t.checked);
    if (t.id === 'cf-revezar') MC.pref.set('revezar', t.checked);
    if (t.id === 'cf-voz') MC.pref.set('voz', t.value);
    if (t.id === 'cf-estilo') MC.pref.set('estiloVoz2', t.value);
    if (t.name === 'cf-motor') { MC.pref.set('motorVoz', t.value); MC.voz.pararFala(); pintar(); }
    if (t.id === 'cf-voz-ap') MC.pref.set('vozAparelhoNome', t.value);
    if (t.id === 'cf-vel') MC.pref.set('vozVelocidade', +t.value);
    if (t.id === 'cf-tom') MC.pref.set('vozTom', +t.value);
    if (t.id === 'cf-mandar') MC.pref.set('mandarAoFalar', t.checked);
    if (t.id === 'cf-instr') MC.pref.set('instrucoes', t.value);
    if (t.id === 'cf-contexto') MC.pref.set('contexto', Math.max(4, Math.min(200, +t.value || 30)));
    if (t.id === 'cf-busca-tipo') MC.pref.set('buscaTipo', t.value);
    if (t.id === 'cf-busca-chave') MC.banco.kvSet('buscaChave', t.value.trim());
    if (t.id === 'cf-tema') { MC.pref.set('tema', t.value); aplicarTema(); }
  }
  function aplicarTema() { const t = MC.pref.get('tema', ''); if (t) document.documentElement.dataset.tema = t; else delete document.documentElement.dataset.tema; }
  async function abrir() { await pintar(); MC.abrirPainel('painel-config'); }
  document.addEventListener('DOMContentLoaded', () => {
    aplicarTema();
    MC.$('#bt-config').onclick = abrir;
    MC.$('#config-corpo').addEventListener('click', clique);
    MC.$('#config-corpo').addEventListener('change', mudou);
    MC.$('#config-corpo').addEventListener('input', (e) => { const t = e.target; if (t.id === 'cf-vel' || t.id === 'cf-tom') { MC.$('#' + t.id + '-v').textContent = (+t.value).toFixed(2); MC.pref.set(t.id === 'cf-vel' ? 'vozVelocidade' : 'vozTom', +t.value); } });
    MC.on('vozes', () => { const sel = MC.$('#cf-voz-ap'); if (sel && !MC.$('#painel-config').hidden) sel.innerHTML = opcoesVoz(); });
  });
  MC.config = { abrir, pintar };
})(window.MC);
