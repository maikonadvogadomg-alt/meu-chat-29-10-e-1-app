/* Meu Chat — 50-internet.js: 🌐 pesquisar e 🔗 ler links.
   - Gemini e Claude pesquisam sozinhos (a busca vem embutida neles).
   - As outras IAs: usa a SUA chave de busca (Serper, Tavily ou Brave), se tiver, e manda os resultados junto.
   - Link na mensagem: o app lê a página (pelo leitor r.jina.ai, grátis) e manda o texto para a IA. */
(function (MC) {
  'use strict';
  const BUSCAS = {
    serper: { nome: 'Serper (google.serper.dev — 2.500 grátis)', site: 'https://serper.dev/api-key' },
    tavily: { nome: 'Tavily', site: 'https://app.tavily.com/home' },
    brave: { nome: 'Brave Search', site: 'https://api-dashboard.search.brave.com/app/keys' },
  };
  async function buscar(q) {
    const tipo = MC.pref.get('buscaTipo', ''), chave = await MC.banco.kv('buscaChave', '');
    if (!tipo || !chave) return null;
    let itens = [];
    if (tipo === 'serper') {
      const r = await fetch('https://google.serper.dev/search', { method: 'POST', headers: { 'X-API-KEY': chave, 'content-type': 'application/json' }, body: JSON.stringify({ q, gl: 'br', hl: 'pt-br', num: 8 }) });
      if (!r.ok) throw new Error('Serper respondeu ' + r.status);
      const j = await r.json(); itens = (j.organic || []).map((x) => ({ titulo: x.title, url: x.link, trecho: x.snippet }));
      if (j.answerBox && (j.answerBox.answer || j.answerBox.snippet)) itens.unshift({ titulo: 'Resposta rápida', url: j.answerBox.link || '', trecho: j.answerBox.answer || j.answerBox.snippet });
    } else if (tipo === 'tavily') {
      const r = await fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + chave }, body: JSON.stringify({ api_key: chave, query: q, max_results: 8, include_answer: true }) });
      if (!r.ok) throw new Error('Tavily respondeu ' + r.status);
      const j = await r.json(); itens = (j.results || []).map((x) => ({ titulo: x.title, url: x.url, trecho: x.content }));
      if (j.answer) itens.unshift({ titulo: 'Resposta rápida', url: '', trecho: j.answer });
    } else if (tipo === 'brave') {
      const r = await fetch('https://api.search.brave.com/res/v1/web/search?count=8&country=BR&search_lang=pt-br&q=' + encodeURIComponent(q), { headers: { 'X-Subscription-Token': chave, Accept: 'application/json' } });
      if (!r.ok) throw new Error('Brave respondeu ' + r.status);
      const j = await r.json(); itens = ((j.web && j.web.results) || []).map((x) => ({ titulo: x.title, url: x.url, trecho: (x.description || '').replace(/<[^>]+>/g, '') }));
    }
    return itens;
  }
  async function lerLink(url) {
    const r = await fetch('https://r.jina.ai/' + url, { headers: { Accept: 'text/plain' } });
    if (!r.ok) throw new Error('não consegui abrir (' + r.status + ')');
    const t = await r.text(); return t.length > 40000 ? t.slice(0, 40000) + '\n…(cortado: página grande)' : t;
  }
  // monta o "contexto da internet" para mandar junto da pergunta
  async function preparar(pergunta, provedor, querBusca) {
    const extras = [], fontes = [], avisos = [];
    const links = [...new Set((pergunta.match(/https?:\/\/[^\s)>\]]+/g) || []).slice(0, 3))];
    for (const u of links) {
      try { const t = await lerLink(u); extras.push('CONTEÚDO DO LINK ' + u + ':\n' + t); fontes.push({ url: u, titulo: u }); }
      catch (e) { avisos.push('🔗 ' + u + ': ' + e.message); }
    }
    const embutida = MC.ia.P[provedor] && MC.ia.P[provedor].busca; // Gemini/Claude pesquisam sozinhos
    if (querBusca && !embutida) {
      try {
        const it = await buscar(pergunta);
        if (it && it.length) { extras.push('RESULTADOS DA PESQUISA NA INTERNET (para: ' + pergunta.slice(0, 200) + '):\n' + it.map((x, i) => (i + 1) + '. ' + x.titulo + (x.url ? ' — ' + x.url : '') + '\n' + (x.trecho || '')).join('\n\n') + '\n\nUse esses resultados e cite os links.'); it.forEach((x) => x.url && fontes.push({ url: x.url, titulo: x.titulo })); }
        else if (it === null) avisos.push('🌐 Esta IA não pesquisa sozinha: ponha uma chave de busca em ⚙️ (Serper, Tavily ou Brave), ou use o Gemini.');
      } catch (e) { avisos.push('🌐 A pesquisa falhou: ' + e.message); }
    }
    return { extras: extras.join('\n\n'), fontes, avisos };
  }
  MC.internet = { BUSCAS, buscar, lerLink, preparar };
})(window.MC);
