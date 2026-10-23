import type { CSSProperties } from 'react';
import { LinhaEmEspera, PainelEmEspera } from '@/componentes/relatorios/EsqueletoRelatorio';
import { CabecalhoPainel, Dica, Esqueleto, Painel } from '@/componentes/ui';
import type { TabelaDTO } from '@/modelos/objetos';
import { rotuloSituacaoTabela, situacoesDaTabela, tamanhoTotal, tomDaSituacao } from '@/regras/tabelas';
import { formatarNumero, formatarTamanho, iniciarComMinuscula, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { iconeDaSituacaoTabela } from './SeloSituacaoTabela';
import estilos from './FiguraDoPanorama.module.css';

const TITULO = 'Onde está o espaço';
const DESCRICAO = 'As maiores tabelas pelo espaço em disco, separado em dados, índices e TOAST';
const TABELAS_NA_FIGURA = 7;

const partes = [
  { chave: 'dados', rotulo: 'Dados', cor: 'var(--categoria-1)', valor: (tabela: TabelaDTO) => tabela.tamanhoDadosBytes },
  { chave: 'indices', rotulo: 'Índices', cor: 'var(--categoria-2)', valor: (tabela: TabelaDTO) => tabela.tamanhoIndicesBytes },
  { chave: 'toast', rotulo: 'TOAST', cor: 'var(--categoria-3)', valor: (tabela: TabelaDTO) => tabela.tamanhoToastBytes },
] as const;

interface EspacoDasTabelasProps {
  tabelas: TabelaDTO[];
  aoAbrir: (tabela: TabelaDTO) => void;
}

export function EspacoDasTabelas({ tabelas, aoAbrir }: EspacoDasTabelasProps) {
  const ordenadas = [...tabelas].sort((a, b) => tamanhoTotal(b) - tamanhoTotal(a));
  const maiores = ordenadas.slice(0, TABELAS_NA_FIGURA);
  const restantes = ordenadas.slice(TABELAS_NA_FIGURA);
  const total = ordenadas.reduce((soma, tabela) => soma + tamanhoTotal(tabela), 0);
  const maior = maiores[0] ? tamanhoTotal(maiores[0]) : 0;
  const totais = partes.map((parte) => ({ ...parte, total: ordenadas.reduce((soma, tabela) => soma + parte.valor(tabela), 0) }));
  const parteDasMaiores = total > 0 ? maiores.reduce((soma, tabela) => soma + tamanhoTotal(tabela), 0) / total : 0;

  return (
    <Painel aria-labelledby="titulo-espaco-tabelas">
      <CabecalhoPainel titulo={<span id="titulo-espaco-tabelas">{TITULO}</span>} descricao={DESCRICAO} />
      <div className={estilos.figura}>
        <div className={estilos.manchete}>
          <p className={estilos.numeroPrincipal}>
            <span className={estilos.valor}>{formatarTamanho(total)}</span>
            <span className={estilos.legendaDoValor}>
              em {formatarNumero(tabelas.length)} {pluralizar(tabelas.length, 'tabela', 'tabelas')}
              {maiores.length < tabelas.length
                ? `, ${formatarNumero(Math.round(parteDasMaiores * 100))}% nas ${formatarNumero(maiores.length)} maiores`
                : ''}
            </span>
          </p>
          <ul className={estilos.legenda} aria-label="Partes do espaço">
            {totais.map((parte) => (
              <li key={parte.chave} className={estilos.itemLegenda}>
                <span className={estilos.amostra} style={{ '--cor-amostra': parte.cor } as CSSProperties} aria-hidden="true" />
                {parte.rotulo} <strong>{formatarTamanho(parte.total)}</strong>
              </li>
            ))}
          </ul>
        </div>

        <ul className={estilos.linhas}>
          {maiores.map((tabela, ordem) => {
            const situacoes = situacoesDaTabela(tabela);
            const primeira = situacoes[0];
            const Icone = primeira ? iconeDaSituacaoTabela[primeira] : null;
            const tamanho = tamanhoTotal(tabela);
            const detalhe = partes.map((parte) => `${parte.rotulo} ${formatarTamanho(parte.valor(tabela))}`).join(', ');
            const preenchidas = maior > 0 ? partes.filter((parte) => parte.valor(tabela) > 0) : [];
            return (
              <li key={tabela.id}>
                <Dica
                  lado="direita"
                  conteudo={
                    <>
                      {primeira ? <span className={estilos.situacaoNaDica}>{rotuloSituacaoTabela[primeira]}</span> : null}
                      {partes.map((parte) => (
                        <span key={parte.chave} className={estilos.itemLegenda}>
                          <span className={estilos.amostra} style={{ '--cor-amostra': parte.cor } as CSSProperties} />
                          {parte.rotulo} <strong>{formatarTamanho(parte.valor(tabela))}</strong>
                        </span>
                      ))}
                    </>
                  }
                >
                  <button
                    type="button"
                    className={estilos.linha}
                    onClick={() => aoAbrir(tabela)}
                    aria-label={`${tabela.esquema}.${tabela.nome}: ${formatarTamanho(tamanho)} (${detalhe})${primeira ? `, ${iniciarComMinuscula(rotuloSituacaoTabela[primeira])}` : ''}. Abrir a tabela`}
                  >
                    <span className={estilos.nome}>
                      {Icone && primeira ? (
                        <span className={juntarClasses(estilos.marcaSituacao, estilos[tomDaSituacao(primeira)])}>
                          <Icone size={12} strokeWidth={2.25} aria-hidden="true" />
                        </span>
                      ) : null}
                      <span className="codigo">
                        <span className={estilos.esquema}>{tabela.esquema}.</span>
                        {tabela.nome}
                      </span>
                    </span>
                    <span className={estilos.barra} data-dica-limite aria-hidden="true">
                      <span className={estilos.trilha}>
                        {preenchidas.map((parte, indice) => (
                          <span
                            key={parte.chave}
                            className={estilos.segmento}
                            data-dica-ancora={indice === preenchidas.length - 1 ? '' : undefined}
                            style={
                              {
                                flexBasis: `${(parte.valor(tabela) / maior) * 100}%`,
                                '--cor-segmento': parte.cor,
                                '--ordem': ordem,
                              } as CSSProperties
                            }
                          />
                        ))}
                      </span>
                    </span>
                    <span className={estilos.valorDaLinha} aria-hidden="true">
                      {formatarTamanho(tamanho)}
                    </span>
                  </button>
                </Dica>
              </li>
            );
          })}
        </ul>

        {restantes.length > 0 ? (
          <p className={estilos.rodape}>
            E mais {formatarNumero(restantes.length)} {pluralizar(restantes.length, 'tabela', 'tabelas')}, que somam{' '}
            <strong>{formatarTamanho(restantes.reduce((soma, tabela) => soma + tamanhoTotal(tabela), 0))}</strong>.
          </p>
        ) : null}
      </div>
    </Painel>
  );
}

export function EsqueletoEspacoDasTabelas() {
  return (
    <PainelEmEspera titulo={TITULO} descricao={DESCRICAO}>
      <div className={estilos.figura} aria-hidden="true">
        <div className={estilos.manchete}>
          <span className={estilos.numeroPrincipal}>
            <LinhaEmEspera largura={96} altura={22} className={estilos.valor} />
            <LinhaEmEspera largura={180} className={estilos.legendaDoValor} />
          </span>
          <LinhaEmEspera largura={260} className={estilos.legenda} />
        </div>
        <ul className={estilos.linhas}>
          {Array.from({ length: TABELAS_NA_FIGURA }, (_, indice) => (
            <li key={indice} className={estilos.linha}>
              <LinhaEmEspera largura={`${70 - ((indice * 13) % 30)}%`} className={estilos.nome} />
              <span className={estilos.barra}><Esqueleto largura={`${92 - indice * 14}%`} altura={10} /></span>
              <LinhaEmEspera largura="80%" className={estilos.valorDaLinha} />
            </li>
          ))}
        </ul>
        <LinhaEmEspera largura="40%" className={estilos.rodape} />
      </div>
    </PainelEmEspera>
  );
}
