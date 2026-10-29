/* Meu Chat — 70-texto.js: mostra a resposta da IA bonitinha (negrito, listas, links, blocos de código
   com 📋 copiar, ⤓ baixar e 👁 ver funcionando). */
(function (MC) {
  'use strict';
  const E = MC.esc;
  function inline(t) {
    return E(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  }
  const EXT = { html: 'html', htm: 'html', tsx: 'tsx', jsx: 'jsx', js: 'js', javascript: 'js', ts: 'ts', typescript: 'ts', css: 'css', python: 'py', py: 'py', json: 'json', md: 'md', sh: 'sh', bash: 'sh', sql: 'sql' };
  function render(md) {
    const blocos = [];
    md = String(md || '').replace(/\r\n?/g, '\n').replace(/```([\w+-]*)[^\n]*\n([\s\S]*?)(?:```|$)/g, (m, l, c) => { blocos.push({ l: l.toLowerCase(), c: c.replace(/\n$/, '') }); return '\n\u0000' + (blocos.length - 1) + '\u0000\n'; });
    const out = []; const linhas = md.split('\n'); let i = 0;
    while (i < linhas.length) {
      const l = linhas[i];
      const b = /^\u0000(\d+)\u0000$/.exec(l.trim());
      if (b) { const x = blocos[+b[1]]; const prev = MC.previa.tipoDe(x.l, x.c);
        out.push('<div class="codigo" data-b="' + b[1] + '"><div class="cab-cod"><b>' + E(x.l || 'código') + '</b> · ' + x.c.split('\n').length + ' linhas<span style="flex:1"></span>' +
          (prev ? '<button class="bt peq primario" data-acao="ver">👁 Ver funcionando</button>' : '') + '<button class="bt peq" data-acao="copiar">📋</button><button class="bt peq" data-acao="baixar">⤓</button></div><pre>' + E(x.c) + '</pre></div>'); i++; continue; }
      if (/^#{1,6}\s/.test(l)) { const n = Math.min(3, l.match(/^#+/)[0].length); out.push('<h' + n + '>' + inline(l.replace(/^#+\s*/, '')) + '</h' + n + '>'); i++; continue; }
      if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) {
        const ord = /^\s*\d/.test(l), itens = [];
        while (i < linhas.length && /^\s*([-*•]|\d+[.)])\s+/.test(linhas[i])) itens.push('<li>' + inline(linhas[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, '')) + '</li>');
        out.push((ord ? '<ol>' : '<ul>') + itens.join('') + (ord ? '</ol>' : '</ul>')); continue;
      }
      if (!l.trim()) { i++; continue; }
      const par = []; while (i < linhas.length && linhas[i].trim() && !/^#{1,6}\s|^\s*([-*•]|\d+[.)])\s+|^\u0000/.test(linhas[i])) par.push(inline(linhas[i++]));
      out.push('<p>' + par.join('<br>') + '</p>');
    }
    return { html: out.join(''), blocos };
  }
  function ligar(el, blocos) {
    el.addEventListener('click', (e) => {
      const bt = e.target.closest('[data-acao]'); if (!bt) return; const cx = bt.closest('[data-b]'); if (!cx) return;
      const x = blocos[+cx.dataset.b]; const a = bt.dataset.acao;
      if (a === 'copiar') MC.copiar(x.c);
      if (a === 'baixar') { MC.baixar('codigo.' + (EXT[x.l] || 'txt'), x.c); MC.aviso('⤓ codigo.' + (EXT[x.l] || 'txt'), 'ok'); }
      if (a === 'ver') MC.previa.abrir(x.l, x.c);
    });
  }
  MC.texto = { render, ligar };
})(window.MC);
