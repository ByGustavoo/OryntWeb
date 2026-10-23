import type { CSSProperties } from 'react';
import { LinhaEmEspera, PainelEmEspera } from '@/componentes/relatorios/EsqueletoRelatorio';
import { CabecalhoPainel, Dica, Esqueleto, Painel } from '@/componentes/ui';
import type { FiltroSituacaoIndice, IndiceDTO, SituacaoIndice } from '@/modelos/objetos';
import { idDaTabela, situacaoDoIndice } from '@/regras/indices';
import type { ContextoDosIndices } from '@/regras/indices';
import { formatarNumero, formatarTamanho, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './FiguraDoPanorama.module.css';
import proprios from './CustoDosIndices.module.css';

const TITULO = 'Para que serve o espaço dos índices';
const DESCRICAO = 'O espaço de cada índice pela situação dele, no banco inteiro e nas tabelas que mais guardam índices';
const TABELAS_NA_FIGURA = 5;

type GrupoDoIndice = 'TRABALHAM' | 'OBSERVACAO' | 'SEM_USO' | 'DUPLICADOS' | 'INVALIDOS';

interface DefinicaoDoGrupo {
  grupo: GrupoDoIndice;
  rotulo: string;
  explicacao: string;
  cor: string;
  hachura: boolean;
  filtro: FiltroSituacaoIndice | null;
}

const grupos: DefinicaoDoGrupo[] = [
  {
    grupo: 'TRABALHAM',
    rotulo: 'Lidos ou garantem unicidade',
    explicacao: 'lidos por consultas ou garantindo unicidade',
    cor: 'var(--grafico-1)',
    hachura: false,
    filtro: null,
  },
  {
    grupo: 'SEM_USO',
    rotulo: 'Sem leitura em 30 dias',
    explicacao: 'nenhuma leitura em 30 dias',
    cor: 'var(--desempenho-moderada)',
    hachura: false,
    filtro: 'SEM_USO',
  },
  {
    grupo: 'DUPLICADOS',
    rotulo: 'Duplicados ou redundantes',
    explicacao: 'outro índice da tabela já cobre',
    cor: 'var(--desempenho-moderada)',
    hachura: true,
    filtro: 'DUPLICADOS',
  },
  {
    grupo: 'INVALIDOS',
    rotulo: 'Inválidos',
    explicacao: 'o planejador não usa e as gravações mantêm',
    cor: 'var(--desempenho-lenta)',
    hachura: false,
    filtro: 'INVALIDOS',
  },
  {
    grupo: 'OBSERVACAO',
    rotulo: 'Em observação',
    explicacao: 'sem leitura, mas vistos há menos de 30 dias',
    cor: 'var(--grafico-referencia)',
    hachura: false,
    filtro: null,
  },
];

function grupoDaSituacao(situacao: SituacaoIndice): GrupoDoIndice {
  if (situacao === 'INVALIDO') return 'INVALIDOS';
  if (situacao === 'DUPLICADO' || situacao === 'REDUNDANTE') return 'DUPLICADOS';
  if (situacao === 'SEM_USO') return 'SEM_USO';
  if (situacao === 'EM_OBSERVACAO') return 'OBSERVACAO';
  return 'TRABALHAM';
}

type Somas = Record<GrupoDoIndice, { quantidade: number; bytes: number }>;

function somasVazias(): Somas {
  return {
    TRABALHAM: { quantidade: 0, bytes: 0 },
    OBSERVACAO: { quantidade: 0, bytes: 0 },
    SEM_USO: { quantidade: 0, bytes: 0 },
    DUPLICADOS: { quantidade: 0, bytes: 0 },
    INVALIDOS: { quantidade: 0, bytes: 0 },
  };
}

function somar(indices: IndiceDTO[], contexto: ContextoDosIndices): Somas {
  const somas = somasVazias();
  for (const indice of indices) {
    const soma = somas[grupoDaSituacao(situacaoDoIndice(indice, contexto))];
    soma.quantidade += 1;
    soma.bytes += indice.tamanhoBytes;
  }
  return somas;
}

function bytesDe(somas: Somas): number {
  return grupos.reduce((total, { grupo }) => total + somas[grupo].bytes, 0);
}

function estiloDoGrupo(definicao: DefinicaoDoGrupo): CSSProperties {
  return { '--cor-segmento': definicao.cor, '--cor-amostra': definicao.cor } as CSSProperties;
}

function Barra({ somas, maximo, ordem, grossa = false }: { somas: Somas; maximo: number; ordem: number; grossa?: boolean }) {
  return (
    <span className={juntarClasses(estilos.trilha, grossa && proprios.trilhaGrossa)}>
      {grupos.map((definicao) => {
        const bytes = somas[definicao.grupo].bytes;
        if (bytes <= 0 || maximo <= 0) return null;
        return (
          <span
            key={definicao.grupo}
            className={juntarClasses(estilos.segmento, definicao.hachura && proprios.hachura)}
            style={{ ...estiloDoGrupo(definicao), flexBasis: `${(bytes / maximo) * 100}%`, '--ordem': ordem } as CSSProperties}
          />
        );
      })}
    </span>
  );
}

interface CustoDosIndicesProps {
  indices: IndiceDTO[];
  contexto: ContextoDosIndices;
  situacaoAtiva: FiltroSituacaoIndice | null;
  tabelaAtiva: string | null;
  aoFiltrarSituacao: (situacao: FiltroSituacaoIndice) => void;
  aoFiltrarTabela: (tabela: string) => void;
}

export function CustoDosIndices({
  indices,
  contexto,
  situacaoAtiva,
  tabelaAtiva,
  aoFiltrarSituacao,
  aoFiltrarTabela,
}: CustoDosIndicesProps) {
  const somas = somar(indices, contexto);
  const total = bytesDe(somas);
  const sobram = somas.SEM_USO.bytes + somas.DUPLICADOS.bytes + somas.INVALIDOS.bytes;
  const quantosSobram = somas.SEM_USO.quantidade + somas.DUPLICADOS.quantidade + somas.INVALIDOS.quantidade;
  const agrupados = new Map<string, IndiceDTO[]>();
  for (const indice of indices) agrupados.set(idDaTabela(indice), [...(agrupados.get(idDaTabela(indice)) ?? []), indice]);
  const porTabela = [...agrupados]
    .map(([tabela, daTabela]) => ({ tabela, somas: somar(daTabela, contexto), quantidade: daTabela.length }))
    .sort((a, b) => bytesDe(b.somas) - bytesDe(a.somas))
    .slice(0, TABELAS_NA_FIGURA);
  const maiorTabela = porTabela[0] ? bytesDe(porTabela[0].somas) : 0;

  return (
    <Painel aria-labelledby="titulo-custo-indices">
      <CabecalhoPainel titulo={<span id="titulo-custo-indices">{TITULO}</span>} descricao={DESCRICAO} />
      <div className={estilos.figura}>
        <div className={estilos.manchete}>
          <p className={estilos.numeroPrincipal}>
            <span className={estilos.valor}>{formatarTamanho(total)}</span>
            <span className={estilos.legendaDoValor}>
              em {formatarNumero(indices.length)} {pluralizar(indices.length, 'índice', 'índices')}
            </span>
          </p>
          {quantosSobram > 0 ? (
            <p className={juntarClasses(estilos.numeroPrincipal, proprios.sobra)}>
              <span className={estilos.valor}>{formatarTamanho(sobram)}</span>
              <span className={estilos.legendaDoValor}>
                em {formatarNumero(quantosSobram)} {pluralizar(quantosSobram, 'índice que não ajuda', 'índices que não ajudam')}{' '}
                nenhuma consulta, {formatarNumero(total > 0 ? Math.round((sobram / total) * 100) : 0)}% do total
              </span>
            </p>
          ) : null}
        </div>

        <span aria-hidden="true">
          <Barra somas={somas} maximo={total} ordem={0} grossa />
        </span>

        <div className={proprios.colunas}>
          <div className={proprios.coluna}>
            <h3 className={proprios.subtitulo}>Por situação</h3>
            <ul className={proprios.grupos} aria-label="Espaço por situação">
              {grupos.map((definicao) => {
                const { quantidade, bytes } = somas[definicao.grupo];
                if (quantidade === 0) return null;
                const conteudo = (
                  <>
                    <span
                      className={juntarClasses(estilos.amostra, definicao.hachura && proprios.hachura)}
                      style={estiloDoGrupo(definicao)}
                      aria-hidden="true"
                    />
                    <Dica conteudo={definicao.explicacao}>
                      <span className={proprios.rotuloDoGrupo}>
                        {definicao.rotulo}
                      </span>
                    </Dica>
                    <span className={proprios.quantidadeDoGrupo}>{formatarNumero(quantidade)}</span>
                    <span className={proprios.medidaDoGrupo}>{formatarTamanho(bytes)}</span>
                    <span className="visualmente-oculto">
                      {pluralizar(quantidade, 'índice', 'índices')}, {definicao.explicacao}
                    </span>
                  </>
                );
                const filtro = definicao.filtro;
                return (
                  <li key={definicao.grupo}>
                    {filtro ? (
                      <button
                        type="button"
                        className={juntarClasses(proprios.grupo, situacaoAtiva === filtro && proprios.ativo)}
                        aria-pressed={situacaoAtiva === filtro}
                        onClick={() => aoFiltrarSituacao(filtro)}
                      >
                        {conteudo}
                      </button>
                    ) : (
                      <div className={proprios.grupo}>{conteudo}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {porTabela.length > 1 ? (
            <div className={proprios.coluna}>
              <h3 className={proprios.subtitulo}>Tabelas com mais espaço em índices</h3>
              <ul className={juntarClasses(estilos.linhas, proprios.linhasDasTabelas)}>
                {porTabela.map(({ tabela, somas: daTabela, quantidade }, ordem) => (
                  <li key={tabela}>
                    <button
                      type="button"
                      className={juntarClasses(estilos.linha, tabelaAtiva === tabela && proprios.ativo)}
                      aria-pressed={tabelaAtiva === tabela}
                      aria-label={`${tabela}: ${formatarNumero(quantidade)} ${pluralizar(quantidade, 'índice', 'índices')}, ${formatarTamanho(bytesDe(daTabela))}. Filtrar a lista por esta tabela`}
                      onClick={() => aoFiltrarTabela(tabela)}
                    >
                      <span className={estilos.nome}>
                        <span className="codigo">{tabela}</span>
                      </span>
                      <span className={estilos.barra} aria-hidden="true">
                        <Barra somas={daTabela} maximo={maiorTabela} ordem={ordem + 1} />
                      </span>
                      <span className={estilos.valorDaLinha} aria-hidden="true">
                        {formatarTamanho(bytesDe(daTabela))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </Painel>
  );
}

export function EsqueletoCustoDosIndices() {
  return (
    <PainelEmEspera titulo={TITULO} descricao={DESCRICAO}>
      <div className={estilos.figura} aria-hidden="true">
        <div className={estilos.manchete}>
          <span className={estilos.numeroPrincipal}>
            <LinhaEmEspera largura={96} altura={22} className={estilos.valor} />
            <LinhaEmEspera largura={110} className={estilos.legendaDoValor} />
          </span>
          <span className={estilos.numeroPrincipal}>
            <LinhaEmEspera largura={96} altura={22} className={estilos.valor} />
            <LinhaEmEspera largura={260} className={estilos.legendaDoValor} />
          </span>
        </div>
        <Esqueleto altura={14} />
        <div className={proprios.colunas}>
          <div className={proprios.coluna}>
            <LinhaEmEspera largura={90} className={proprios.subtitulo} />
            <ul className={proprios.grupos}>
              {Array.from({ length: 5 }, (_, indice) => (
                <li key={indice} className={proprios.grupo}>
                  <Esqueleto largura={10} altura={10} raio="3px" />
                  <LinhaEmEspera largura={`${76 - indice * 9}%`} className={proprios.rotuloDoGrupo} />
                  <LinhaEmEspera largura={16} className={proprios.quantidadeDoGrupo} />
                  <LinhaEmEspera largura={56} className={proprios.medidaDoGrupo} />
                </li>
              ))}
            </ul>
          </div>
          <div className={proprios.coluna}>
            <LinhaEmEspera largura={220} className={proprios.subtitulo} />
            <ul className={juntarClasses(estilos.linhas, proprios.linhasDasTabelas)}>
              {Array.from({ length: TABELAS_NA_FIGURA }, (_, indice) => (
                <li key={indice} className={estilos.linha}>
                  <LinhaEmEspera largura={`${70 - indice * 9}%`} className={estilos.nome} />
                  <span className={estilos.barra}><Esqueleto largura={`${90 - indice * 18}%`} altura={10} /></span>
                  <LinhaEmEspera largura="80%" className={estilos.valorDaLinha} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </PainelEmEspera>
  );
}
