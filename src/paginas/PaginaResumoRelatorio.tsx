import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartNoAxesColumn, Download, FlaskConical, GitCompareArrows, Printer } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { EsqueletoIndicadores } from '@/componentes/dashboard/GradeIndicadores';
import { TabelaConsultas } from '@/componentes/dashboard/TabelaConsultas';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { BarraPeriodo } from '@/componentes/relatorios/BarraPeriodo';
import { DestaquesRelatorio } from '@/componentes/relatorios/DestaquesRelatorio';
import { DistribuicaoDesempenho } from '@/componentes/relatorios/DistribuicaoDesempenho';
import { GraficoEvolucao } from '@/componentes/relatorios/GraficoEvolucao';
import { IndicadoresRelatorio } from '@/componentes/relatorios/IndicadoresRelatorio';
import { Botao, CabecalhoPainel, ConteudoAssincrono, Esqueleto, EstadoVazio, Nota, Painel } from '@/componentes/ui';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { usePeriodoRelatorio } from '@/ganchos/usePeriodoRelatorio';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { ConexaoDTO } from '@/modelos/conexao';
import type { PeriodoRelatorio, ResumoRelatorioDTO } from '@/modelos/relatorios';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { enderecoConexao } from '@/regras/conexoesSalvas';
import { cabecalhoDoResumo, montarDestaques } from '@/regras/destaquesRelatorio';
import { periodoAnteriorNaFrase, periodoNaFrase } from '@/regras/periodoRelatorio';
import { caminhos } from '@/rotas/caminhos';
import { servicoRelatorios } from '@/servicos';
import { formatarInstante } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaResumoRelatorio.module.css';

const TITULO = 'Resumo';

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

  useEffect(() => {
    if (sessaoEncerrada) marcarDesconectada();
  }, [sessaoEncerrada, marcarDesconectada]);

  return (
    <>
      <CabecalhoPagina
        titulo={TITULO}
        descricao={`Como o banco se comportou ${periodoNaFrase(periodo)}.`}
        acoes={
          <>
            <Botao
              variante="secundario"
              icone={GitCompareArrows}
              className="nao-imprimir"
              onClick={() => navegar(caminhos.relatoriosComparacao, { state: { periodo } })}
            >
              Comparar
            </Botao>
            <Botao
              variante="secundario"
              icone={Download}
              className="nao-imprimir"
              onClick={() => navegar(caminhos.relatoriosExportacao, { state: { periodo } })}
            >
              Exportar
            </Botao>
            <Botao variante="secundario" icone={Printer} className="nao-imprimir" onClick={() => window.print()}>
              Imprimir
            </Botao>
          </>
        }
      />

      <div className={estilos.blocos}>
        <p className={estilos.identificacao}>
          <strong>{NOME_APLICACAO}</strong> · {conexao.nome} · <span className="codigo">{enderecoConexao(conexao)}</span> ·
          gerado em {formatarInstante(hoje.toISOString())}
        </p>

        <BarraPeriodo periodo={periodo} hoje={hoje} aoMudar={mudarPeriodo} />

        {conexao.simulada ? (
          <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
            Os números deste relatório são fictícios e não vêm do seu banco. Eles dão lugar aos dados reais quando o Orynt
            estiver ligado à API.
          </Nota>
        ) : null}

        <div className={estilos.conteudo} aria-busy={resumo.carregando}>
          <ConteudoAssincrono
            resultado={resumo}
            esqueleto={<EsqueletoResumo />}
            tituloErro="Não foi possível carregar o resumo"
          >
            {(dados) => <CorpoResumo dados={dados} conexao={conexao} atualizando={resumo.carregando} />}
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
          titulo={<span id="titulo-evolucao">Evolução no período</span>}
          descricao={
            dados.granularidade === 'DIA'
              ? 'Volume de consultas e tempo médio de execução em cada hora'
              : 'Volume de consultas e tempo médio de execução em cada dia'
          }
        />
        <GraficoEvolucao pontos={dados.evolucao} granularidade={dados.granularidade} />
      </Painel>

      <DistribuicaoDesempenho faixas={dados.desempenho} />

      <Painel espacamento="nenhum" aria-labelledby="titulo-consultas-relatorio">
        <div className={estilos.cabecalhoTabela}>
          <CabecalhoPainel
            titulo={<span id="titulo-consultas-relatorio">Consultas que mais pesaram</span>}
            descricao={`As que mais consumiram tempo do banco, com a variação do tempo médio em relação ${anterior.comparado}`}
          />
        </div>
        <TabelaConsultas consultas={dados.consultas} referenciaVariacao={anterior.comparado} />
      </Painel>
    </div>
  );
}

function EsqueletoResumo() {
  return (
    <div className={estilos.relatorio} role="status" aria-label="Carregando o resumo…">
      <div className={estilos.abertura}>
        <Esqueleto altura={268} raio="var(--raio-lg)" />
        <EsqueletoIndicadores />
      </div>
      <Esqueleto altura={420} raio="var(--raio-lg)" />
      <Esqueleto altura={220} raio="var(--raio-lg)" />
    </div>
  );
}
