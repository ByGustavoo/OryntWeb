import { useEffect, useState } from 'react';
import { ChartNoAxesColumn, FlaskConical, SearchX } from 'lucide-react';
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
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { ConexaoDTO } from '@/modelos/conexao';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import { descricaoPeriodo, periodosDashboard, rotuloPeriodo } from '@/modelos/rotulos';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { servicoDashboard } from '@/servicos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaDashboard.module.css';

const PERIODO_INICIAL: PeriodoDashboard = 'ULTIMAS_24_HORAS';

const opcoesPeriodo = periodosDashboard.map((periodo) => ({ valor: periodo, rotulo: rotuloPeriodo[periodo] }));

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver como ele está se comportando.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

export default function PaginaDashboard() {
  useTituloDocumento('Dashboard');
  const { situacao, conexao } = useConexao();

  if (!conexao) {
    return (
      <>
        <CabecalhoPagina titulo="Dashboard" descricao={descreverSemConexao(situacao)} />
        <PainelSemConexao />
      </>
    );
  }

  return <DashboardConectado key={conexao.id} conexao={conexao} />;
}

function DashboardConectado({ conexao }: { conexao: ConexaoDTO }) {
  const { marcarDesconectada } = useConexao();
  const [periodo, setPeriodo] = useState<PeriodoDashboard>(PERIODO_INICIAL);

  const indicadores = useDadosAssincronos((signal) => servicoDashboard.buscarIndicadores(periodo, signal), [periodo]);
  const atividade = useDadosAssincronos((signal) => servicoDashboard.buscarAtividade(periodo, signal), [periodo]);
  const consultas = useDadosAssincronos((signal) => servicoDashboard.buscarConsultas(periodo, signal), [periodo]);

  const sessaoEncerrada = [indicadores.erro, atividade.erro, consultas.erro].some((erro) => ehErroApi(erro, 'NAO_AUTORIZADO'));

  useEffect(() => {
    if (sessaoEncerrada) marcarDesconectada();
  }, [sessaoEncerrada, marcarDesconectada]);

  return (
    <>
      <CabecalhoPagina
        titulo="Dashboard"
        descricao={`Como o banco se comportou ${descricaoPeriodo[periodo]}.`}
        acoes={<GrupoOpcoes rotulo="Período" opcoes={opcoesPeriodo} valor={periodo} aoMudar={setPeriodo} />}
      />

      <div className={estilos.blocos}>
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
          />
          <div className={juntarClasses(estilos.regiao, atividade.carregando && atividade.dados !== null && estilos.atualizando)}>
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
          <div className={juntarClasses(estilos.regiao, consultas.carregando && consultas.dados !== null && estilos.atualizando)}>
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
    </>
  );
}
