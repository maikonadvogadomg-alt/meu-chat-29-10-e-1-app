/* Meu Chat — 60-previa.js: 👁 ver o código funcionando, na hora.
   - HTML: abre a página como ela é.
   - TSX / JSX (React): monta com React + Babel + Tailwind (pela internet) e mostra o componente.
   Os erros aparecem embaixo, em vermelho. */
(function (MC) {
  'use strict';
  let atual = null;
  const ESPIA = '<script>(function(){function m(t){try{parent.postMessage({mcPrevia:1,erro:String(t).slice(0,600)},"*")}catch(e){}}' +
    'addEventListener("error",function(e){m((e.message||"Erro")+(e.lineno?" (linha "+e.lineno+")":""))});' +
    'addEventListener("unhandledrejection",function(e){m("Promise: "+(e.reason&&e.reason.message||e.reason))});' +
    'var o=console.error;console.error=function(){m([].slice.call(arguments).join(" "));o&&o.apply(console,arguments)}})();<\/script>';
  function paginaHTML(cod) {
    if (!/<html|<body|<head/i.test(cod)) cod = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + cod + '</body></html>';
    return /<head[^>]*>/i.test(cod) ? cod.replace(/<head([^>]*)>/i, (x) => x + ESPIA) : ESPIA + cod;
  }
  function paginaReact(cod) {
    const nome = (cod.match(/export\s+default\s+(?:function\s+)?([A-Z][\w$]*)/) || cod.match(/(?:function|const|let|class)\s+([A-Z][\w$]*)/) || [])[1] || '';
    const fonte = cod + '\n;module.exports.__mcApp = (typeof ' + (nome || 'App') + ' !== "undefined" ? ' + (nome || 'App') + ' : undefined);';
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + ESPIA +
      '<script src="https://unpkg.com/react@18.3.1/umd/react.development.js"><\/script>' +
      '<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"><\/script>' +
      '<script src="https://unpkg.com/@babel/standalone@7.25.6/babel.min.js"><\/script>' +
      '<script src="https://cdn.tailwindcss.com/3.4.16"><\/script>' +
      '<style>body{margin:0;font-family:system-ui,sans-serif}</style></head><body><div id="root"></div><script>(function(){' +
      'var src=' + JSON.stringify(fonte).replace(/<\//g, '<\\/') + ';' +
      'function falha(t){document.getElementById("root").innerHTML="<pre style=\\"color:#b42318;white-space:pre-wrap;padding:12px\\">"+String(t).replace(/</g,"&lt;")+"</pre>";parent.postMessage({mcPrevia:1,erro:String(t).slice(0,600)},"*")}' +
      'if(!window.React||!window.Babel){falha("Não carregou o React/Babel: a prévia de TSX precisa de internet.");return}' +
      'try{var out=Babel.transform(src,{filename:"App.tsx",presets:[["typescript",{isTSX:true,allExtensions:true}],"react",["env",{modules:"commonjs",targets:{chrome:"100"}}]]}).code;' +
      'var module={exports:{}},exports=module.exports;' +
      'var icone=new Proxy({},{get:function(t,n){if(n==="__esModule")return false;return function(p){return React.createElement("span",Object.assign({},p,{style:Object.assign({display:"inline-block",width:"1em",height:"1em",textAlign:"center"},p&&p.style)}),"◆")}}});' +
      'var falso=new Proxy({},{get:function(t,n){if(n==="__esModule")return false;return function(p){return React.createElement("div",null,p&&p.children)}}});' +
      'function req(n){if(n==="react")return React;if(n==="react-dom"||n==="react-dom/client")return ReactDOM;if(/\\.css$/.test(n))return {};if(/lucide|icons|heroicons/.test(n))return icone;console.warn("peça de fora não carregada: "+n);return falso}' +
      'new Function("require","exports","module","React",out)(req,exports,module,React);' +
      'var C=module.exports.default||module.exports.__mcApp;if(!C){falha("Não achei o componente: use \\"export default function App()\\".");return}' +
      'ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(C));' +
      '}catch(e){falha(e.message)}})();<\/script></body></html>';
  }
  function tipoDe(ling, cod) {
    ling = (ling || '').toLowerCase();
    if (/^(tsx|jsx|react)$/.test(ling)) return 'react';
    if (/^(ts|typescript|js|javascript)$/.test(ling) && /return\s*\(?\s*</.test(cod) && /(React|useState|export default)/.test(cod)) return 'react';
    if (/^(html|htm|svg|xml)$/.test(ling) || /<html|<body|<div|<!doctype/i.test(cod)) return 'html';
    if (/^(css)$/.test(ling)) return 'css';
    return '';
  }
  function abrir(ling, cod) {
    const tipo = tipoDe(ling, cod);
    if (!tipo) { MC.aviso('Esse tipo de código (' + (ling || 'texto') + ') não tem prévia — só HTML, TSX e JSX.'); return; }
    atual = { ling, cod, tipo };
    const pagina = tipo === 'react' ? paginaReact(cod) : tipo === 'css' ? paginaHTML('<style>' + cod + '</style><h1>Título</h1><p>Texto de exemplo.</p><button>Botão</button>') : paginaHTML(cod);
    MC.$('#previa-tipo').textContent = tipo === 'react' ? 'React (' + (ling || 'tsx') + ')' : tipo.toUpperCase();
    MC.$('#previa-erros').innerHTML = '';
    MC.$('#previa').hidden = false;
    MC.$('#previa-quadro').srcdoc = pagina;
  }
  window.addEventListener('message', (e) => {
    const d = e.data; if (!d || !d.mcPrevia || MC.$('#previa').hidden) return;
    const el = document.createElement('div'); el.textContent = '⚠ ' + d.erro; MC.$('#previa-erros').appendChild(el);
  });
  document.addEventListener('DOMContentLoaded', () => {
    MC.$('#previa-fechar').onclick = () => { MC.$('#previa').hidden = true; MC.$('#previa-quadro').srcdoc = ''; };
    MC.$('#previa-recarregar').onclick = () => atual && abrir(atual.ling, atual.cod);
    MC.$('#previa-baixar').onclick = () => {
      if (!atual) return;
      if (atual.tipo === 'react') { MC.baixar('componente.' + (atual.ling === 'jsx' ? 'jsx' : 'tsx'), atual.cod); MC.baixar('componente-funcionando.html', paginaReact(atual.cod), 'text/html'); }
      else MC.baixar('pagina.html', atual.tipo === 'css' ? '<style>' + atual.cod + '</style>' : atual.cod, 'text/html');
      MC.aviso('⤓ Baixado', 'ok');
    };
  });
  MC.previa = { abrir, tipoDe, paginaReact, paginaHTML };
})(window.MC);
