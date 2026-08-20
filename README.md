# Criação da tabela de resultado final — Unidades externas

Ferramenta de apoio às comarcas e unidades do Tribunal de Justiça do Estado do
Paraná que conduzem o próprio processo seletivo de estágio.

Monta a **tabela de resultado final** no mesmo modelo do relatório da Fábrica
de Provas, para a unidade informar as notas sem precisar cadastrá-las na
Fábrica. Ao final gera dois arquivos:

- **PDF** com cabeçalho institucional, pronto para juntar ao processo SEI;
- **CSV** aceito diretamente pela ferramenta do Ponto 20 (elaboração do edital
  de classificação final).

Desenvolvida na Divisão de Seleção de Estagiários e Residentes, Formação de
Talentos e Ambientação (SG-SGP-CDHO-DSERFTA), da Coordenadoria de
Desenvolvimento Humano e Organizacional, da Secretaria de Gestão de Pessoas.

> **Aviso:** ferramenta em fase de testes, não é um sistema oficial do TJPR. O
> documento gerado é um apoio de trabalho — a conferência das notas e da
> classificação é responsabilidade da unidade.

## Como usar

Abrir `index.html`. Funciona de duas formas:

- **Publicada** (GitHub Pages ou outro servidor): basta o endereço.
- **Local**: baixar a pasta inteira e abrir o `index.html` com duplo clique.
  Todos os arquivos precisam ficar juntos na mesma pasta — um arquivo isolado
  não funciona, porque os links entre eles são relativos.

O preenchimento acontece todo no navegador. O que está na tela é guardado
automaticamente no próprio computador; ao finalizar, o registro também é
gravado numa base compartilhada, identificado pelo número do processo SEI.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | a página: estrutura e textos |
| `estilo.css` | toda a aparência (identidade visual do TJPR) |
| `resultado_final_logic.js` | a lógica da ferramenta: tabela, cálculo das notas, geração do PDF e do CSV, gravação na base |
| `edital_unidades_sei.js` | base de siglas e nomes das unidades do TJPR, usada pelo autocomplete |
| `tjpr_logo.js` | logotipo em base64, embutido no PDF gerado |
| `pagina.js` | dois comportamentos de página: o bloco "Como funciona" recolhível e o cabeçalho fixo ao rolar |
| `sql/` | criação da tabela no Supabase e sugestões de endurecimento |
| `teste/` | suíte de testes automatizados |

Nenhum arquivo depende de internet para carregar: sem CDN de fontes, sem
imagens externas, sem bibliotecas remotas. A única chamada de rede é a
gravação e a leitura da base compartilhada — o resto funciona offline.

## Base compartilhada

Os preenchimentos finalizados vão para uma tabela no Supabase
(`resultado_final_unidades`), identificados pelos dígitos do processo SEI:
finalizar de novo com o mesmo SEI substitui o registro anterior, e é assim
que se corrige um envio.

O SQL de criação da tabela está em
[`sql/resultado_final_unidades.sql`](sql/resultado_final_unidades.sql).

**Sobre a chave que aparece no código:** a `sb_publishable_...` é a chave
publicável do Supabase e é feita para ficar visível — quem protege a base são
as regras de RLS no banco, não a chave. Hoje essas regras liberam leitura e
escrita para qualquer visitante. Em
[`sql/endurecimento_opcional.sql`](sql/endurecimento_opcional.sql) há um
conjunto de medidas que fecham o que dá para fechar **sem mudar uma linha do
código da página nem o jeito de usar a ferramenta**: tirar o DELETE da API
pública, exigir que o id gravado corresponda ao SEI do próprio registro,
limitar o tamanho do registro e guardar histórico das versões anteriores para
poder desfazer uma sobrescrita.

## Testes

```bash
npm install jsdom
node teste/teste.js
```

Cobre a montagem da página, o cálculo da nota final, a reordenação da tabela,
o autocomplete das unidades, a geração do CSV e do PDF, a área administrativa
e a caixa de rascunho. A rede fica desligada durante o teste.

---

elaborado com o uso de ia por igor pankiewicz
