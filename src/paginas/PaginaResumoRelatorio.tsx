import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartNoAxesColumn, Download, GitCompareArrows, Printer } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { EsqueletoIndicadores } from '@/componentes/dashboard/GradeIndicadores';
import { TabelaConsultas } from '@/componentes/dashboard/TabelaConsultas';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { BarraPeriodo } from '@/componentes/relatorios/BarraPeriodo';
import { CabecalhoImpressao } from '@/componentes/relatorios/CabecalhoImpressao';
import { DestaquesRelatorio, EsqueletoDestaques } from '@/componentes/relatorios/DestaquesRelatorio';
import { DistribuicaoDesempenho, EsqueletoDistribuicao } from '@/componentes/relatorios/DistribuicaoDesempenho';
import {
  GraficosEmEspera,
  PainelEmEspera,
  RelatorioEmEspera,
  TabelaEmEspera,
} from '@/componentes/relatorios/EsqueletoRelatorio';
import { GraficoEvolucao } from '@/componentes/relatorios/GraficoEvolucao';
import { IndicadoresRelatorio } from '@/componentes/relatorios/IndicadoresRelatorio';
import { CabecalhoPainel, ConteudoAssincrono, EstadoVazio, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useImpressao } from '@/ganchos/useImpressao';
import { usePeriodoRelatorio } from '@/ganchos/usePeriodoRelatorio';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useVerHistorico } from '@/ganchos/useVerHistorico';
import { useVerPlano } from '@/ganchos/useVerPlano';
import type { ConexaoDTO } from '@/modelos/conexao';
import type { GranularidadeRelatorio, PeriodoRelatorio, ResumoRelatorioDTO } from '@/modelos/relatorios';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { cabecalhoDoResumo, montarDestaques } from '@/regras/destaquesRelatorio';
import { periodoDoHistorico, rotuloVerHistorico } from '@/regras/historicoConsulta';
import { periodoAnteriorNaFrase, periodoNaFrase, periodoVizinho, rotuloDoPeriodo } from '@/regras/periodoRelatorio';
import { caminhos } from '@/rotas/caminhos';
import { servicoRelatorios } from '@/servicos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaResumoRelatorio.module.css';

const TITULO = 'Resumo';
const TITULO_EVOLUCAO = 'Evolução no período';
const TITULO_CONSULTAS = 'Consultas que mais pesaram';
const LINHAS_POR_DESTAQUE = [1, 1, 1, 3];

function descreverEvolucao(granularidade: GranularidadeRelatorio): string {
  return granularidade === 'DIA'
    ? 'Volume de consultas e tempo médio de execução em cada hora'
    : 'Volume de consultas e tempo médio de execução em cada dia';
}

function descreverConsultas(granularidade: GranularidadeRelatorio): string {
  return `As que mais consumiram tempo do banco, com a variação do tempo médio em relação ${periodoAnteriorNaFrase[granularidade].comparado}`;
}

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver o resumo de um período.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

export default function PaginaResumoRelatorio() {
  useTituloDocumento('Relatórios: Resumo');
  const { situacao, conexao } = useConexao();

  if (!conexao) {
    return (
      <>
        <CabecalhoPagina titulo={TITULO} descricao={descreverSemConexao(situacao)} />
        <PainelSemConexao />
      </>
    );
  }

  return <ResumoConectado key={conexao.id} conexao={conexao} />;
}

function ResumoConectado({ conexao }: { conexao: ConexaoDTO }) {
  const { marcarDesconectada } = useConexao();
  const navegar = useNavigate();
  const { periodo, hoje, mudarPeriodo } = usePeriodoRelatorio(caminhos.relatoriosResumo);

  const resumo = useDadosAssincronos((signal) => servicoRelatorios.buscarResumo(periodo, signal), [periodo]);
  const sessaoEncerrada = ehErroApi(resumo.erro, 'NAO_AUTORIZADO');
  const trocandoDePeriodo =
    resumo.dados !== null &&
    (resumo.dados.granularidade !== periodo.granularidade || resumo.dados.inicio !== periodo.inicio);
  const impresso: PeriodoRelatorio = resumo.dados
    ? { granularidade: resumo.dados.granularidade, inicio: resumo.dados.inicio }
    : periodo;
  const { imprimir, imprimindo, instante } = useImpressao(TITULO, rotuloDoPeriodo(impresso));

  useEffect(() => {
    if (sessaoEncerrada) marcarDesconectada();
  }, [sessaoEncerrada, marcarDesconectada]);

  return (
    <>
      <CabecalhoPagina
        titulo={TITULO}
        descricao={`Como o banco se comportou ${periodoNaFrase(periodo)}.`}
        imprimir={false}
      />

      <div className={estilos.blocos}>
        <CabecalhoImpressao
          documento={TITULO}
          periodo={impresso}
          base={periodoVizinho(impresso, -1)}
          conexao={conexao}
          geradoEm={instante}
        />

        <BarraPeriodo
          periodo={periodo}
          hoje={hoje}
          aoMudar={mudarPeriodo}
          className="nao-imprimir"
          acoes={[
            {
              icone: GitCompareArrows,
              rotulo: 'Comparar',
              aoAcionar: () => navegar(caminhos.relatoriosComparacao, { state: { periodo } }),
            },
            {
              icone: Download,
              rotulo: 'Exportar',
              aoAcionar: () => navegar(caminhos.relatoriosExportacao, { state: { periodo } }),
            },
            { icone: Printer, rotulo: 'Imprimir', aoAcionar: imprimir, carregando: imprimindo },
          ]}
        />

        <div className={estilos.conteudo} aria-busy={resumo.carregando}>
          <ConteudoAssincrono
            resultado={resumo}
            esqueleto={<EsqueletoResumo granularidade={periodo.granularidade} />}
            tituloErro="Não foi possível carregar o resumo"
          >
            {(dados) =>
              trocandoDePeriodo ? (
                <EsqueletoResumo granularidade={periodo.granularidade} imediato />
              ) : (
                <CorpoResumo dados={dados} conexao={conexao} atualizando={resumo.carregando} />
              )
            }
          </ConteudoAssincrono>
        </div>
      </div>
    </>
  );
}

interface CorpoResumoProps {
  dados: ResumoRelatorioDTO;
  conexao: ConexaoDTO;
  atualizando: boolean;
}

function CorpoResumo({ dados, conexao, atualizando }: CorpoResumoProps) {
  const periodo: PeriodoRelatorio = { granularidade: dados.granularidade, inicio: dados.inicio };
  const destaques = montarDestaques(dados);
  const anterior = periodoAnteriorNaFrase[dados.granularidade];
  const verHistorico = useVerHistorico();
  const verPlano = useVerPlano();
  const periodoRecente = periodoDoHistorico[dados.granularidade];

  if (dados.indicadores.totalConsultas <= 0) {
    return (
      <Painel className={juntarClasses(estilos.regiao, atualizando && estilos.atualizando)}>
        <EstadoVazio
          icone={ChartNoAxesColumn}
          titulo="Nenhuma atividade no período"
          descricao="O banco não registrou consultas neste intervalo. Escolha outro período para ver o resumo."
        />
      </Painel>
    );
  }

  return (
    <div className={juntarClasses(estilos.relatorio, estilos.regiao, atualizando && estilos.atualizando)}>
      <div className={estilos.abertura}>
        <DestaquesRelatorio
          destaques={destaques}
          cabecalhoDaCopia={cabecalhoDoResumo(conexao.nome, periodo, conexao.simulada)}
        />
        <IndicadoresRelatorio indicadores={dados.indicadores} granularidade={dados.granularidade} />
      </div>

      <Painel aria-labelledby="titulo-evolucao">
        <CabecalhoPainel
          titulo={<span id="titulo-evolucao">{TITULO_EVOLUCAO}</span>}
          descricao={descreverEvolucao(dados.granularidade)}
        />
        <GraficoEvolucao pontos={dados.evolucao} granularidade={dados.granularidade} />
      </Painel>

      <DistribuicaoDesempenho faixas={dados.desempenho} />

      <Painel espacamento="nenhum" aria-labelledby="titulo-consultas-relatorio">
        <div className={estilos.cabecalhoTabela}>
          <CabecalhoPainel
            titulo={<span id="titulo-consultas-relatorio">{TITULO_CONSULTAS}</span>}
            descricao={descreverConsultas(dados.granularidade)}
          />
        </div>
        <TabelaConsultas
          consultas={dados.consultas}
          referenciaVariacao={anterior.comparado}
          rotuloHistorico={rotuloVerHistorico(periodoRecente)}
          aoVerHistorico={(consulta) => verHistorico(consulta.id, periodoRecente)}
          aoVerPlano={(consulta) => verPlano(consulta.id)}
        />
      </Painel>
    </div>
  );
}

interface EsqueletoResumoProps {
  granularidade: GranularidadeRelatorio;
  imediato?: boolean;
}

function EsqueletoResumo({ granularidade, imediato = false }: EsqueletoResumoProps) {
  return (
    <RelatorioEmEspera rotulo="Carregando o resumo…" imediato={imediato} className={estilos.relatorio}>
      <div className={estilos.abertura}>
        <EsqueletoDestaques linhasPorFrase={LINHAS_POR_DESTAQUE} />
        <EsqueletoIndicadores />
      </div>
      <PainelEmEspera titulo={TITULO_EVOLUCAO} descricao={descreverEvolucao(granularidade)}>
        <GraficosEmEspera alturas={[190, 180]} />
      </PainelEmEspera>
      <EsqueletoDistribuicao />
      <PainelEmEspera
        espacamento="nenhum"
        titulo={TITULO_CONSULTAS}
        descricao={descreverConsultas(granularidade)}
        classeCabecalho={estilos.cabecalhoTabela}
      >
        <TabelaEmEspera linhas={10} alturaDaLinha={66} alturaDoCabecalho={37} />
      </PainelEmEspera>
    </RelatorioEmEspera>
  );
}
