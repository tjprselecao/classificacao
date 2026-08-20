/* pagina.js — comportamentos de página que não pertencem à lógica da
   ferramenta (resultado_final_logic.js):

   1. o bloco "Como funciona" começa recolhido e abre ao clique;
   2. um cabeçalho fixo miniaturizado aparece ao rolar, com o botão "Topo".

   Substitui o layout.js do portal interno, que além disto montava o menu de
   navegação entre ferramentas — aqui não existe menu: a página é a
   ferramenta. */

// Bloco "Como funciona" (.step-info): só o .step-head fica visível, e clicar
// (ou Enter/Espaço) nele abre/fecha o resto. Não depende de id nenhum:
// qualquer conteúdo que venha depois do .step-head é tratado como o corpo.
function ligarBlocoInfo(escopo){
  escopo.querySelectorAll('.step-info').forEach(function(caixa){
    const cabeca = caixa.querySelector(':scope > .step-head');
    if(!cabeca) return;
    const corpo = Array.prototype.slice.call(caixa.children).filter(function(el){ return el !== cabeca; });
    if(!corpo.length) return;

    corpo.forEach(function(el){ el.style.display = 'none'; });
    cabeca.setAttribute('role','button');
    cabeca.setAttribute('tabindex','0');
    cabeca.setAttribute('aria-expanded','false');
    cabeca.insertAdjacentHTML('beforeend','<span class="step-info-seta" aria-hidden="true">▾</span>');

    function alternar(){
      const abrir = corpo[0].style.display === 'none';
      corpo.forEach(function(el){ el.style.display = abrir ? '' : 'none'; });
      cabeca.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    }
    cabeca.addEventListener('click', alternar);
    cabeca.addEventListener('keydown', function(ev){
      if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); alternar(); }
    });
  });
}

// Cabeçalho fixo miniaturizado: exibido quando o cabeçalho principal
// (.app-header) sai de vista POR CIMA — rolando para baixo. Só some de novo
// quando o cabeçalho volta a aparecer.
function ligarMiniHeader(){
  const appHeader = document.querySelector('.app-header');
  if(!appHeader) return;

  const mini = document.createElement('div');
  mini.className = 'mini-header';
  mini.innerHTML = '<div class="mini-header-inner">'
    + '<span class="mini-header-tit">Tabela de resultado final — Unidades externas</span>'
    + '<button type="button" class="top-btn" title="Voltar ao topo da página">Topo <span aria-hidden="true">↑</span></button>'
    + '</div>';
  document.body.appendChild(mini);

  mini.querySelector('.top-btn').addEventListener('click', function(){
    window.scrollTo({ top:0, behavior:'smooth' });
  });

  if('IntersectionObserver' in window){
    new IntersectionObserver(function(entries){
      const e = entries[0];
      mini.classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0);
    }, { threshold:0 }).observe(appHeader);
  } else {
    window.addEventListener('scroll', function(){
      mini.classList.toggle('show', appHeader.getBoundingClientRect().bottom < 0);
    }, { passive:true });
  }
}

document.addEventListener('DOMContentLoaded', function(){
  ligarBlocoInfo(document);
  ligarMiniHeader();
});
