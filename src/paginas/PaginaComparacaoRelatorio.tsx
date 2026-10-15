import { useEffect, useMemo } from 'react';
import { ChartNoAxesColumn, FlaskConical, Printer } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { EsqueletoIndicadores } from '@/componentes/dashboard/GradeIndicadores';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { CabecalhoImpressao } from '@/componentes/relatorios/CabecalhoImpressao';
import { ConsultasComparadas, EsqueletoConsultasComparadas } from '@/componentes/relatorios/ConsultasComparadas';
import { DesempenhoComparado, EsqueletoDesempenhoComparado } from '@/componentes/relatorios/DesempenhoComparado';
import { DestaquesRelatorio, EsqueletoDestaques } from '@/componentes/relatorios/DestaquesRelatorio';
import { GraficosEmEspera, PainelEmEspera, RelatorioEmEspera } from '@/componentes/relatorios/EsqueletoRelatorio';
import { GraficoComparacao } from '@/componentes/relatorios/GraficoComparacao';
import { IndicadoresComparacao } from '@/componentes/relatorios/IndicadoresComparacao';
import { SeletorComparacao } from '@/componentes/relatorios/SeletorComparacao';
import { CabecalhoPainel, ConteudoAssincrono, EstadoVazio, Nota, Painel } from '@/componentes/ui';
import { useComparacaoRelatorio } from '@/ganchos/useComparacaoRelatorio';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useImpressao } from '@/ganchos/useImpressao';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useVerHistorico } from '@/ganchos/useVerHistorico';
import { useVerPlano } from '@/ganchos/useVerPlano';
import type { ConexaoDTO } from '@/modelos/conexao';
import type { ComparacaoRelatorio, GranularidadeRelatorio } from '@/modelos/relatorios';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import {
  alinharEvolucao,
  cabecalhoDaComparacao,
  compararConsultas,
  compararDesempenho,
  compararIndicadores,
  montarMudancas,
  periodosDaComparacao,
  referenciaDaBase,
  rotulosDaComparacao,
  titulosDaComparacao,
} from '@/regras/comparacaoRelatorio';
import { periodoDoHistorico, rotuloVerHistorico } from '@/regras/historicoConsulta';
import { rotuloDoPeriodo } from '@/regras/periodoRelatorio';
import { caminhos } from '@/rotas/caminhos';
import { servicoRelatorios } from '@/servicos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaComparacaoRelatorio.module.css';

const TITULO = 'Comparação';
const TITULO_EVOLUCAO = 'Evolução lado a lado';
const LINHAS_POR_MUDANCA = [2, 2, 1, 3, 3];

const textosDasMudancas = {
  titulo: 'O que mudou',
  descricao: 'O período em relação ao de comparação, em poucas frases',
  copiado: 'Frases copiadas para a área de transferência.',
  falhaAoCopiar: 'Não foi possível copiar as frases',
};

const descricaoDaEvolucao = {
  DIA: 'Volume de consultas e tempo médio de execução em cada hora dos dois dias',
  SEMANA: 'Volume de consultas e tempo médio de execução em cada dia das duas semanas',
  MES: 'Volume de consultas e tempo médio de execução em cada dia dos dois meses',
};

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para comparar dois períodos.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

export default function PaginaComparacaoRelatorio() {
  useTituloDocumento('Relatórios: Comparação');
  const { situacao, conexao } = useConexao();

  if (!conexao) {
    return (
      <>
        <CabecalhoPagina titulo={TITULO} descricao={descreverSemConexao(situacao)} />
        <PainelSemConexao />
      </>
    );
  }

  return <ComparacaoConectada key={conexao.id} conexao={conexao} />;
}

function ComparacaoConectada({ conexao }: { conexao: ConexaoDTO }) {
  const { marcarDesconectada } = useConexao();
  const { par, hoje, mudarPar } = useComparacaoRelatorio(caminhos.relatoriosComparacao);

  const comparacao = useDadosAssincronos(
    (signal) => servicoRelatorios.buscarComparacao(par.periodo, par.base, signal),
    [par],
  );
  const sessaoEncerrada = ehErroApi(comparacao.erro, 'NAO_AUTORIZADO');
  const impresso = comparacao.dados ? periodosDaComparacao(comparacao.dados.principal, comparacao.dados.base) : par;
  const trocandoDePeriodos =
    comparacao.dados !== null &&
    (impresso.periodo.granularidade !== par.periodo.granularidade ||
      impresso.periodo.inicio !== par.periodo.inicio ||
      impresso.base.inicio !== par.base.inicio);
  const { imprimir, imprimindo, instante } = useImpressao(
    TITULO,
    `${rotuloDoPeriodo(impresso.periodo)} comparado com ${rotuloDoPeriodo(impresso.base)}`,
  );

  useEffect(() => {
    if (sessaoEncerrada) marcarDesconectada();
  }, [sessaoEncerrada, marcarDesconectada]);

  return (
    <>
      <CabecalhoPagina
        titulo={TITULO}
        descricao="O que mudou no banco entre dois períodos do mesmo tamanho."
        imprimir={false}
      />

      <div className={estilos.blocos}>
        <CabecalhoImpressao
          documento={TITULO}
          periodo={impresso.periodo}
          base={impresso.base}
          conexao={conexao}
          geradoEm={instante}
        />

        <SeletorComparacao
          par={par}
          hoje={hoje}
          aoMudar={mudarPar}
          acoes={[{ icone: Printer, rotulo: 'Imprimir', aoAcionar: imprimir, carregando: imprimindo }]}
        />

        {conexao.simulada ? (
          <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
            Os números dos dois períodos são fictícios e não vêm do seu banco. Eles dão lugar aos dados reais quando o
            Orynt estiver ligado à API.
          </Nota>
        ) : null}

        <div className={estilos.conteudo} aria-busy={comparacao.carregando}>
          <ConteudoAssincrono
            resultado={comparacao}
            esqueleto={<EsqueletoComparacao granularidade={par.periodo.granularidade} />}
            tituloErro="Não foi possível carregar a comparação"
          >
            {(dados) =>
              trocandoDePeriodos ? (
                <EsqueletoComparacao granularidade={par.periodo.granularidade} imediato />
              ) : (
                <CorpoComparacao dados={dados} conexao={conexao} atualizando={comparacao.carregando} />
              )
            }
          </ConteudoAssincrono>
        </div>
      </div>
    </>
  );
}

interface CorpoComparacaoProps {
  dados: ComparacaoRelatorio;
  conexao: ConexaoDTO;
  atualizando: boolean;
}

function CorpoComparacao({ dados, conexao, atualizando }: CorpoComparacaoProps) {
  const { principal, base } = dados;
  const verHistorico = useVerHistorico();
  const verPlano = useVerPlano();
  const periodoRecente = periodoDoHistorico[principal.granularidade];
  const calculado = useMemo(() => {
    const par = periodosDaComparacao(principal, base);
    return {
      par,
      rotulos: rotulosDaComparacao(par),
      titulos: titulosDaComparacao(par),
      referencia: referenciaDaBase(par),
      mudancas: montarMudancas(principal, base),
      indicadores: compararIndicadores(principal, base),
      evolucao: alinharEvolucao(principal.evolucao, base.evolucao),
      desempenho: compararDesempenho(principal.desempenho, base.desempenho),
      consultas: compararConsultas(principal.consultas, base.consultas),
    };
  }, [principal, base]);
  const { par, rotulos, titulos, referencia, mudancas, indicadores, evolucao, desempenho, consultas } = calculado;

  if (principal.indicadores.totalConsultas <= 0 || base.indicadores.totalConsultas <= 0) {
    return (
      <Painel className={juntarClasses(estilos.regiao, atualizando && estilos.atualizando)}>
        <EstadoVazio
          icone={ChartNoAxesColumn}
          titulo="Sem atividade para comparar"
          descricao="O banco não registrou consultas em pelo menos um dos dois períodos. Escolha outros períodos para ver o que mudou."
        />
      </Painel>
    );
  }

  return (
    <div className={juntarClasses(estilos.relatorio, estilos.regiao, atualizando && estilos.atualizando)}>
      <div className={estilos.abertura}>
        <DestaquesRelatorio
          destaques={mudancas}
          cabecalhoDaCopia={cabecalhoDaComparacao(conexao.nome, par, conexao.simulada)}
          textos={textosDasMudancas}
        />
        <IndicadoresComparacao indicadores={indicadores} rotuloBase={rotulos.base} />
      </div>

      <Painel aria-labelledby="titulo-evolucao-comparada">
        <CabecalhoPainel
          titulo={<span id="titulo-evolucao-comparada">{TITULO_EVOLUCAO}</span>}
          descricao={descricaoDaEvolucao[principal.granularidade]}
        />
        <GraficoComparacao
          pontos={evolucao}
          granularidade={principal.granularidade}
          rotulos={rotulos}
          titulos={titulos}
        />
      </Painel>

      <DesempenhoComparado faixas={desempenho} rotulos={rotulos} titulos={titulos} referencia={referencia} />

      <ConsultasComparadas
        consultas={consultas}
        rotulos={rotulos}
        titulos={titulos}
        rotuloHistorico={rotuloVerHistorico(periodoRecente)}
        aoVerHistorico={(consulta) => verHistorico(consulta.id, periodoRecente)}
        aoVerPlano={(consulta) => verPlano(consulta.id)}
      />
    </div>
  );
}

interface EsqueletoComparacaoProps {
  granularidade: GranularidadeRelatorio;
  imediato?: boolean;
}

function EsqueletoComparacao({ granularidade, imediato = false }: EsqueletoComparacaoProps) {
  return (
    <RelatorioEmEspera rotulo="Carregando a comparação…" imediato={imediato} className={estilos.relatorio}>
      <div className={estilos.abertura}>
        <EsqueletoDestaques linhasPorFrase={LINHAS_POR_MUDANCA} textos={textosDasMudancas} />
        <EsqueletoIndicadores />
      </div>
      <PainelEmEspera titulo={TITULO_EVOLUCAO} descricao={descricaoDaEvolucao[granularidade]}>
        <GraficosEmEspera alturas={[180, 200]} comLegenda />
      </PainelEmEspera>
      <EsqueletoDesempenhoComparado />
      <EsqueletoConsultasComparadas />
    </RelatorioEmEspera>
  );
}
