const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dir = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

const erros = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://tjprselecao.github.io/classificacao/'
});
const win = dom.window;
win.addEventListener('error', e => erros.push('window error: ' + e.message));
win.fetch = () => Promise.reject(new Error('rede desligada no teste'));
win.matchMedia = win.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));

['tjpr_logo.js','edital_unidades_sei.js','resultado_final_logic.js','pagina.js'].forEach(f => {
  const s = win.document.createElement('script');
  s.textContent = fs.readFileSync(path.join(dir, f), 'utf8');
  win.document.body.appendChild(s);
});

win.document.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles:true }));

const d = win.document;
const ok = [];
function checa(nome, cond){ ok.push((cond ? '  ok   ' : '  FALHA') + '  ' + nome); if(!cond) erros.push(nome); }

checa('tela inicial visível', d.getElementById('rfInicio') && d.getElementById('rfTrabalho').style.display === 'none');
checa('bloco "Como funciona" recolhido', d.querySelector('.step-info .step-head').getAttribute('aria-expanded') === 'false');
checa('mini-header montado', !!d.querySelector('.mini-header .top-btn'));
checa('base de unidades carregada', win.eval('typeof UNIDADES_SEI === "object" && Object.keys(UNIDADES_SEI).length') > 100);
checa('logo do PDF carregado', win.eval('typeof TJPR_LOGO_DATA_URI === "string" && TJPR_LOGO_DATA_URI.startsWith("data:image/jpeg;base64,")'));

// abre o bloco "Como funciona"
d.querySelector('.step-info .step-head').dispatchEvent(new win.MouseEvent('click', { bubbles:true }));
checa('bloco "Como funciona" abre ao clique', d.querySelector('.step-info .step-head').getAttribute('aria-expanded') === 'true');

// entra em "novo preenchimento" e cadastra candidatos
d.getElementById('rfBtnInicioNovo').dispatchEvent(new win.MouseEvent('click', { bubbles:true }));
checa('novo preenchimento abre a área de trabalho', d.getElementById('rfTrabalho').style.display !== 'none');
checa('tabela começa vazia, com o aviso de vazio', !!d.querySelector('#rfCorpo .empty-hint'));

function digita(el, valor){
  el.value = valor;
  el.dispatchEvent(new win.Event('input', { bubbles:true }));
  el.dispatchEvent(new win.Event('change', { bubbles:true }));
}
// a tabela é redesenhada a cada digitação: sempre reconsultar a linha
const campo = (i, f) => d.querySelectorAll('#rfCorpo tr')[i].querySelector(`[data-f="${f}"]`);

// primeira linha: só aparece depois de "+ Adicionar candidato"
d.getElementById('rfBtnAdicionar').dispatchEvent(new win.MouseEvent('click', { bubbles:true }));
checa('adicionar candidato cria a 1ª linha editável', !!d.querySelector('#rfCorpo [data-f="nome"]'));
digita(campo(0, 'nome'), 'MARIA DE SOUZA');
digita(campo(0, 'notaProva'), '8,0');
digita(campo(0, 'notaEntrevista'), '6,0');
checa('nota final = média de prova e entrevista (7,00)',
      String(campo(0, 'notaFinal').value).replace('.', ',').startsWith('7'));

d.getElementById('rfBtnAdicionar').dispatchEvent(new win.MouseEvent('click', { bubbles:true }));
checa('adicionar candidato cria a 2ª linha', d.querySelectorAll('#rfCorpo tr').length === 2);

// segunda linha com nota maior, para testar a reordenação por nota
digita(campo(1, 'nome'), 'ANA LIMA');
digita(campo(1, 'notaProva'), '10,0');
digita(campo(1, 'notaEntrevista'), '10,0');
d.getElementById('rfBtnOrdenarNota').dispatchEvent(new win.MouseEvent('click', { bubbles:true }));
checa('reordenar por nota põe a maior em 1º', campo(0, 'nome').value === 'ANA LIMA');
d.getElementById('rfBtnOrdenarNome').dispatchEvent(new win.MouseEvent('click', { bubbles:true }));
checa('reordenar por nome ordena alfabeticamente', campo(0, 'nome').value === 'ANA LIMA');
checa('coluna CLASS. renumera de 1 a N',
      Array.from(d.querySelectorAll('#rfCorpo .rf-col-class')).map(e => e.textContent.trim()).join(',') === '1,2');

// autocomplete da unidade
const un = d.getElementById('rfUnidade');
digita(un, 'DSERFTA');
checa('autocomplete sugere unidades', d.getElementById('rfUnidadeLista').children.length > 0);

const RF = win.ResultadoFinal;
checa('API de teste exposta', !!RF);

// CSV: separador ";" e decimal com vírgula (Excel pt-BR)
const csv = RF.gerarCsvTexto();
checa('CSV usa ; como separador', csv.split('\n')[0].includes(';'));
checa('CSV traz os dois candidatos', /ANA LIMA/.test(csv) && /MARIA DE SOUZA/.test(csv));
checa('CSV escreve nota com vírgula decimal', /7,00|10,00/.test(csv));

// PDF montado em memória (sem baixar)
const pdf = RF.construirPdf();
const cabecalhoPdf = typeof pdf === 'string' ? pdf.slice(0,5) : String.fromCharCode.apply(null, pdf.slice(0,5));
checa('PDF gerado começa com %PDF-', cabecalhoPdf === '%PDF-');

// prévia em HTML do documento
checa('prévia do documento cita a unidade', /TJPR|Tribunal|unidade/i.test(RF.montarDocumentoHtml()));

// área administrativa: fechada, e o PIN destranca
d.getElementById('rfAdminToggle').dispatchEvent(new win.MouseEvent('click', { bubbles:true }));
checa('área administrativa abre', d.getElementById('rfAdminCorpo').style.display !== 'none');
checa('conteúdo administrativo continua travado', d.getElementById('rfAdminConteudo').style.display === 'none');
d.getElementById('rfPin').value = RF.PIN_ADMIN;
d.getElementById('rfBtnPin').dispatchEvent(new win.MouseEvent('click', { bubbles:true }));
checa('PIN correto libera o conteúdo administrativo', d.getElementById('rfAdminConteudo').style.display !== 'none');

// caixa de rascunho
const draft = d.getElementById('rfDraft');
checa('rascunho começa recolhido', draft.classList.contains('collapsed'));
d.getElementById('rfDraftToggle').dispatchEvent(new win.MouseEvent('click', { bubbles:true }));
checa('rascunho abre ao clique', !draft.classList.contains('collapsed'));

console.log(ok.join('\n'));
console.log(erros.length ? '\nERROS:\n' + erros.join('\n') : '\nSem erros.');
process.exit(erros.length ? 1 : 0);
