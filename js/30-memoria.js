/* Meu Chat — 30-memoria.js: 🧠 a memória que vai junto em TODA conversa.
   A IA guarda sozinha o que for importante escrevendo [[lembrar: …]] no fim da resposta
   (o app tira isso do texto, guarda e mostra "🧠 guardei"). [[esquecer: …]] apaga. */
(function (MC) {
  'use strict';
  async function texto() { return (await MC.banco.kv('memoria', '')) || ''; }
  async function salvar(t) { await MC.banco.kvSet('memoria', String(t || '').trim()); MC.emit('memoria'); }
  async function lembrar(linha) {
    linha = String(linha || '').trim(); if (!linha) return false;
    const atual = await texto(); const linhas = atual.split('\n').map((x) => x.trim()).filter(Boolean);
    if (linhas.some((x) => x.toLowerCase() === linha.toLowerCase())) return false;
    linhas.push(linha); await salvar(linhas.join('\n')); return true;
  }
  async function esquecer(trecho) {
    trecho = String(trecho || '').trim().toLowerCase(); if (!trecho) return 0;
    const linhas = (await texto()).split('\n').filter(Boolean); const fica = linhas.filter((x) => !x.toLowerCase().includes(trecho));
    await salvar(fica.join('\n')); return linhas.length - fica.length;
  }
  // tira as marcas da resposta e aplica
  async function aplicarMarcas(resposta) {
    const guardei = [], esqueci = [];
    let limpo = resposta.replace(/\[\[\s*lembrar\s*:\s*([\s\S]*?)\]\]/gi, (m, t) => { guardei.push(t.trim()); return ''; })
      .replace(/\[\[\s*esquecer\s*:\s*([\s\S]*?)\]\]/gi, (m, t) => { esqueci.push(t.trim()); return ''; }).trim();
    const feitos = [];
    for (const g of guardei) if (await lembrar(g)) feitos.push('🧠 guardei: ' + g);
    for (const e of esqueci) { const n = await esquecer(e); if (n) feitos.push('🧠 esqueci: ' + e); }
    return { limpo, feitos };
  }
  async function sistema(extra) {
    const mem = await texto();
    const instr = MC.pref.get('instrucoes', '');
    const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return [
      'Você é a assistente pessoal do usuário, no app "Meu Chat". Responda sempre em português do Brasil, simples e direto.',
      'Hoje é ' + hoje + '.',
      'MEMÓRIA: abaixo está o que você sabe do usuário. Use quando ajudar, sem ficar repetindo.',
      'Quando o usuário disser algo que vale lembrar para sempre (quem ele é, preferências, projetos, decisões) ou pedir "lembra disso", escreva NO FIM da resposta, numa linha só: [[lembrar: o fato, curto]]. Para apagar algo da memória quando ele pedir: [[esquecer: palavra do fato]]. Não use isso para coisas passageiras.',
      'CÓDIGO: quando escrever código, mande o arquivo INTEIRO (nunca "troque o pedaço X"), num bloco com a linguagem: ```html, ```jsx, ```tsx, ```css, ```js, ```python. Uma página que funciona sozinha vai em um ```html só (CSS e JS dentro). Componente React vai em ```tsx ou ```jsx com "export default".',
      // 🧭 o guia das ferramentas dele (não vai para o Ollama do celular: pesado demais)
      window.GuiaMaikon && MC.pref.get('saberFerramentas', true) && MC.pref.get('chaveAtiva', '') !== 'ollama' ? GuiaMaikon.texto : '',
      instr ? 'INSTRUÇÕES DO USUÁRIO:\n' + instr : '',
      '--- MEMÓRIA DO USUÁRIO ---\n' + (mem || '(vazia por enquanto)'),
      extra || '',
    ].filter(Boolean).join('\n\n');
  }
  // painel
  async function abrir() { MC.$('#memoria-texto').value = await texto(); MC.$('#mem-status').textContent = ''; MC.abrirPainel('painel-memoria'); }
  document.addEventListener('DOMContentLoaded', () => {
    MC.$('#bt-memoria').onclick = abrir;
    MC.$('#bt-mem-salvar').onclick = async () => { await salvar(MC.$('#memoria-texto').value); MC.$('#mem-status').textContent = '✅ salva ' + new Date().toLocaleTimeString('pt-BR'); };
  });
  MC.memoria = { texto, salvar, lembrar, esquecer, aplicarMarcas, sistema, abrir };
})(window.MC);
