import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChartNoAxesColumn, FlaskConical, SearchX } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { GraficoAtividade } from '@/componentes/dashboard/GraficoAtividade';
import { ResumoIndicadores } from '@/componentes/dashboard/ResumoIndicadores';
import { TabelaConsultas } from '@/componentes/dashboard/TabelaConsultas';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import {
  CabecalhoPainel,
  ConteudoAssincrono,
  Esqueleto,
  EsqueletoLista,
  EstadoVazio,
  GrupoOpcoes,
  Nota,
  Painel,
} from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import type { ResultadoAssincrono } from '@/ganchos/useDadosAssincronos';
import { esperaMaximaDaEtapa, useEntradaCoordenada } from '@/ganchos/useEntradaCoordenada';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { ConexaoDTO } from '@/modelos/conexao';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import { descricaoPeriodo, periodosDashboard, rotuloPeriodo } from '@/modelos/rotulos';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { granularidadeDoDashboard, ultimoPeriodoFechado, ultimoPeriodoNaFrase } from '@/regras/periodoRelatorio';
import { caminhos } from '@/rotas/caminhos';
import { servicoDashboard } from '@/servicos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaDashboard.module.css';

const PERIODO_INICIAL: PeriodoDashboard = 'ULTIMAS_24_HORAS';

const opcoesPeriodo = periodosDashboard.map((periodo) => ({ valor: periodo, rotulo: rotuloPeriodo[periodo] }));

const ETAPA_INDICADORES = 1;
const ETAPA_ATIVIDADE = 2;
const ETAPA_CONSULTAS = 3;

function esperaDoEsqueleto(etapa: number): CSSProperties {
  return { '--espera-esqueleto': `${esperaMaximaDaEtapa(etapa)}ms` } as CSSProperties;
}

function respondeu(resultado: ResultadoAssincrono<unknown>): boolean {
  return resultado.dados !== null || resultado.erro !== null;
}

function aguardarEtapa<T>(resultado: ResultadoAssincrono<T>, liberada: boolean): ResultadoAssincrono<T> {
  return liberada ? resultado : { ...resultado, dados: null, erro: null, carregando: true };
}

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver como ele está se comportando.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

export default function PaginaDashboard() {
  useTituloDocumento('Dashboard');
  const { situacao, conexao } = useConexao();
  const [periodo, setPeriodo] = useState<PeriodoDashboard>(PERIODO_INICIAL);
  const idDaConexao = conexao?.id ?? null;
  const [idAcompanhado, setIdAcompanhado] = useState(idDaConexao);

  if (idAcompanhado !== idDaConexao) {
    setIdAcompanhado(idDaConexao);
    setPeriodo(PERIODO_INICIAL);
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Dashboard"
        descricao={conexao ? `Como o banco se comportou ${descricaoPeriodo[periodo]}.` : descreverSemConexao(situacao)}
        acoes={
          conexao ? <GrupoOpcoes rotulo="Período" opcoes={opcoesPeriodo} valor={periodo} aoMudar={setPeriodo} /> : undefined
        }
      />
      {conexao ? <DashboardConectado key={conexao.id} conexao={conexao} periodo={periodo} /> : <PainelSemConexao />}
    </>
  );
}

function DashboardConectado({ conexao, periodo }: { conexao: ConexaoDTO; periodo: PeriodoDashboard }) {
  const { marcarDesconectada } = useConexao();

  const respostaIndicadores = useDadosAssincronos((signal) => servicoDashboard.buscarIndicadores(periodo, signal), [periodo]);
  const respostaAtividade = useDadosAssincronos((signal) => servicoDashboard.buscarAtividade(periodo, signal), [periodo]);
  const respostaConsultas = useDadosAssincronos((signal) => servicoDashboard.buscarConsultas(periodo, signal), [periodo]);

  const respostas = [respostaIndicadores, respostaAtividade, respostaConsultas];
  const etapas = useEntradaCoordenada(respostas.every(respondeu), ETAPA_CONSULTAS);
  const indicadores = aguardarEtapa(respostaIndicadores, etapas >= ETAPA_INDICADORES);
  const atividade = aguardarEtapa(respostaAtividade, etapas >= ETAPA_ATIVIDADE);
  const consultas = aguardarEtapa(respostaConsultas, etapas >= ETAPA_CONSULTAS);

  const granularidadeDoResumo = granularidadeDoDashboard[periodo];

  const sessaoEncerrada = respostas.some((resposta) => ehErroApi(resposta.erro, 'NAO_AUTORIZADO'));

  useEffect(() => {
    if (sessaoEncerrada) marcarDesconectada();
  }, [sessaoEncerrada, marcarDesconectada]);

  return (
    <div className={estilos.blocos} style={esperaDoEsqueleto(ETAPA_INDICADORES)}>
      {conexao.simulada ? (
        <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
          Os números desta tela são fictícios e não vêm do seu banco. Eles dão lugar aos dados reais quando o Orynt
          estiver ligado à API.
        </Nota>
      ) : null}

      <ResumoIndicadores resultado={indicadores} />

      <Painel aria-labelledby="titulo-atividade" aria-busy={atividade.carregando}>
        <CabecalhoPainel
          titulo={<span id="titulo-atividade">Atividade das consultas</span>}
          descricao={`Consultas executadas ${descricaoPeriodo[periodo]}`}
          acao={
            <Link
              to={caminhos.relatoriosResumo}
              state={{ periodo: ultimoPeriodoFechado(granularidadeDoResumo, new Date()) }}
              className={estilos.atalho}
            >
              Ver o resumo {ultimoPeriodoNaFrase[granularidadeDoResumo]}
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
          }
        />
        <div
          className={juntarClasses(estilos.regiao, atividade.carregando && atividade.dados !== null && estilos.atualizando)}
          style={esperaDoEsqueleto(ETAPA_ATIVIDADE)}
        >
          <ConteudoAssincrono
            resultado={atividade}
            esqueleto={<Esqueleto altura={260} raio="var(--raio-md)" />}
            tituloErro="Não foi possível carregar a atividade"
          >
            {(pontos) =>
              pontos.length > 0 ? (
                <GraficoAtividade pontos={pontos} periodo={periodo} />
              ) : (
                <EstadoVazio
                  icone={ChartNoAxesColumn}
                  titulo="Nenhuma atividade no período"
                  descricao="Quando o banco executar consultas, o volume aparece aqui ao longo do tempo."
                />
              )
            }
          </ConteudoAssincrono>
        </div>
      </Painel>

      <Painel espacamento="nenhum" aria-labelledby="titulo-consultas" aria-busy={consultas.carregando}>
        <div className={estilos.cabecalhoTabela}>
          <CabecalhoPainel
            titulo={<span id="titulo-consultas">Consultas que mais pesam</span>}
            descricao="As consultas que mais consumiram tempo do banco no período"
          />
        </div>
        <div
          className={juntarClasses(estilos.regiao, consultas.carregando && consultas.dados !== null && estilos.atualizando)}
          style={esperaDoEsqueleto(ETAPA_CONSULTAS)}
        >
          <ConteudoAssincrono
            resultado={consultas}
            esqueleto={
              <div className={estilos.esqueletoTabela}>
                <EsqueletoLista linhas={6} rotulo="Carregando as consultas…" />
              </div>
            }
            tituloErro="Não foi possível carregar as consultas"
          >
            {(lista) =>
              lista.length > 0 ? (
                <TabelaConsultas consultas={lista} />
              ) : (
                <EstadoVazio
                  icone={SearchX}
                  titulo="Nenhuma consulta registrada no período"
                  descricao="Escolha um período maior ou aguarde o banco receber consultas."
                />
              )
            }
          </ConteudoAssincrono>
        </div>
      </Painel>
    </div>
  );
}
