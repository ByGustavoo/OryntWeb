import { useEffect, useRef, useState } from 'react';
import { ChartNoAxesColumn, FlaskConical, GitCompareArrows, ListTree, SearchX } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { ConsultaEmAnalise } from '@/componentes/consultas/ConsultaEmAnalise';
import type { ConsultaExibida } from '@/componentes/consultas/ConsultaEmAnalise';
import { GraficoHistorico } from '@/componentes/consultas/GraficoHistorico';
import { IndicadoresHistorico } from '@/componentes/consultas/IndicadoresHistorico';
import { MenuExportarCsv } from '@/componentes/consultas/MenuExportarCsv';
import { AlternarIntervalos, EsqueletoIntervalos, TabelaIntervalos } from '@/componentes/consultas/TabelaIntervalos';
import { EsqueletoIndicadores } from '@/componentes/dashboard/GradeIndicadores';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { DestaquesRelatorio, EsqueletoDestaques } from '@/componentes/relatorios/DestaquesRelatorio';
import { GraficosEmEspera, PainelEmEspera, RelatorioEmEspera } from '@/componentes/relatorios/EsqueletoRelatorio';
import { Botao, CabecalhoPainel, ConteudoAssincrono, Esqueleto, EstadoVazio, GrupoOpcoes, Nota, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useSelecaoHistorico } from '@/ganchos/useSelecaoHistorico';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useVerPlano } from '@/ganchos/useVerPlano';
import type { ConexaoDTO } from '@/modelos/conexao';
import type { ConsultaDetalhadaDTO, HistoricoConsultaDTO, SelecaoHistorico } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import { descricaoPeriodo, periodosDashboard, rotuloPeriodo } from '@/modelos/rotulos';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { gerarArquivoDoHistorico } from '@/regras/exportacaoHistorico';
import type { PadraoNumerico } from '@/regras/exportacaoRelatorio';
import {
  cabecalhoDoHistorico,
  descreverTroca,
  foiExecutada,
  intervalosComTroca,
  intervalosPorPeriodo,
  montarDestaquesDoHistorico,
  ordemInicialDosIntervalos,
  textosDoIntervalo,
} from '@/regras/historicoConsulta';
import type { OrdemDosIntervalos } from '@/regras/historicoConsulta';
import { caminhos } from '@/rotas/caminhos';
import { servicoConsultas } from '@/servicos';
import { baixarArquivo } from '@/utilitarios/download';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import estilos from './PaginaHistoricoConsulta.module.css';

const TITULO = 'Histórico';
const TITULO_EVOLUCAO = 'Evolução no período';
const TITULO_INTERVALOS = 'Por intervalo';
const PERIODO_MAIS_LONGO: PeriodoDashboard = 'ULTIMOS_30_DIAS';
const LINHAS_POR_DESTAQUE = [1, 1, 1, 2];
const LARGURA_DO_BOTAO_EXPORTAR = 156;

const opcoesPeriodo = periodosDashboard.map((periodo) => ({ valor: periodo, rotulo: rotuloPeriodo[periodo] }));

const textosDosDestaques = {
  titulo: 'Destaques',
  descricao: 'O que marcou a consulta no período, em poucas frases',
  copiado: 'Destaques copiados para a área de transferência.',
  falhaAoCopiar: 'Não foi possível copiar os destaques',
};

type Carga =
  | { tipo: 'SEM_CONSULTAS'; pedido: SelecaoHistorico }
  | { tipo: 'NAO_ENCONTRADA'; pedido: SelecaoHistorico }
  | { tipo: 'HISTORICO'; pedido: SelecaoHistorico; historico: HistoricoConsultaDTO };

function descreverEvolucao(periodo: PeriodoDashboard): string {
  return `Execuções e tempo médio da consulta em cada ${textosDoIntervalo[periodo].unidade}`;
}

function descreverIntervalos(periodo: PeriodoDashboard): string {
  return `Os números da consulta em cada ${textosDoIntervalo[periodo].unidade}`;
}

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver o histórico das consultas que ele executa.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

async function carregar(pedido: SelecaoHistorico, signal: AbortSignal): Promise<Carga> {
  const id = pedido.consulta ?? (await servicoConsultas.buscarMaisPesada(pedido.periodo, signal))?.id ?? null;
  if (id === null) return { tipo: 'SEM_CONSULTAS', pedido };

  try {
    return { tipo: 'HISTORICO', pedido, historico: await servicoConsultas.buscarHistorico(id, pedido.periodo, signal) };
  } catch (erro) {
    if (ehErroApi(erro, 'NAO_ENCONTRADO')) return { tipo: 'NAO_ENCONTRADA', pedido };
    throw erro;
  }
}

export default function PaginaHistoricoConsulta() {
  useTituloDocumento('Consultas SQL: Histórico');
  const { situacao, conexao } = useConexao();
  const { selecao, mudarSelecao } = useSelecaoHistorico(caminhos.consultasHistorico);
  const idDaConexao = conexao?.id ?? null;
  const conexaoAnterior = useRef(idDaConexao);

  useEffect(() => {
    if (idDaConexao === null) return;
    if (conexaoAnterior.current !== null && conexaoAnterior.current !== idDaConexao) mudarSelecao({ consulta: null });
    conexaoAnterior.current = idDaConexao;
  }, [idDaConexao, mudarSelecao]);

  if (!conexao) {
    return (
      <>
        <CabecalhoPagina titulo={TITULO} descricao={descreverSemConexao(situacao)} />
        <PainelSemConexao />
      </>
    );
  }

  return <HistoricoConectado key={conexao.id} conexao={conexao} selecao={selecao} mudarSelecao={mudarSelecao} />;
}

interface HistoricoConectadoProps {
  conexao: ConexaoDTO;
  selecao: SelecaoHistorico;
  mudarSelecao: (mudanca: Partial<SelecaoHistorico>) => void;
}

function HistoricoConectado({ conexao, selecao, mudarSelecao }: HistoricoConectadoProps) {
  const { marcarDesconectada } = useConexao();
  const notificacoes = useNotificacoes();
  const [escolhida, setEscolhida] = useState<ConsultaDetalhadaDTO | null>(null);
  const [ordem, setOrdem] = useState(ordemInicialDosIntervalos);
  const [expandida, setExpandida] = useState(false);
  const verPlano = useVerPlano();

  const carga = useDadosAssincronos((signal) => carregar(selecao, signal), [selecao]);
  const sessaoEncerrada = ehErroApi(carga.erro, 'NAO_AUTORIZADO');
  const carregada = carga.dados;
  const trocando = carregada !== null && carregada.pedido !== selecao;
  const emEspera = carregada === null ? carga.carregando : trocando;
  const historico = carregada?.tipo === 'HISTORICO' ? carregada.historico : null;
  const mesmaConsulta = historico !== null && (!trocando || historico.consulta.id === selecao.consulta);

  useEffect(() => {
    if (sessaoEncerrada) marcarDesconectada();
  }, [sessaoEncerrada, marcarDesconectada]);

  const exibida: ConsultaExibida | null =
    historico && mesmaConsulta
      ? {
          id: historico.consulta.id,
          sql: historico.consulta.sql,
          tipo: historico.consulta.tipo,
          desempenho: trocando || !foiExecutada(historico) ? null : historico.consulta.desempenho,
        }
      : escolhida && escolhida.id === selecao.consulta
        ? { id: escolhida.id, sql: escolhida.sql, tipo: escolhida.tipo, desempenho: null }
        : null;

  const mudarPeriodo = (periodo: PeriodoDashboard) =>
    mudarSelecao({ periodo, consulta: selecao.consulta ?? historico?.consulta.id ?? null });

  const escolher = (consulta: ConsultaDetalhadaDTO) => {
    setEscolhida(consulta);
    mudarSelecao({ consulta: consulta.id });
  };

  const exportar = (padrao: PadraoNumerico) => {
    if (!historico) return;
    const arquivo = gerarArquivoDoHistorico(historico, { padrao, simulada: conexao.simulada, geradoEm: new Date() });
    baixarArquivo(arquivo);
    notificacoes.sucesso(
      'Arquivo gerado',
      `${arquivo.nome}, com ${formatarNumero(arquivo.linhas)} ${pluralizar(arquivo.linhas, 'intervalo', 'intervalos')}.`,
    );
  };

  return (
    <>
      <CabecalhoPagina
        titulo={TITULO}
        descricao={`Como uma consulta se comportou ${descricaoPeriodo[selecao.periodo]}.`}
        acoes={<GrupoOpcoes rotulo="Período" opcoes={opcoesPeriodo} valor={selecao.periodo} aoMudar={mudarPeriodo} />}
      />

      <div className={estilos.blocos}>
        {conexao.simulada ? (
          <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
            As consultas e os números desta tela são fictícios e não vêm do seu banco. Eles dão lugar aos dados reais quando o
            Orynt estiver ligado à API.
          </Nota>
        ) : null}

        <ConsultaEmAnalise
          periodo={selecao.periodo}
          consulta={exibida}
          semConsultas={!emEspera && exibida === null}
          posicao={historico && !trocando ? historico.posicao : null}
          total={historico?.totalDoPeriodo ?? 0}
          idAnterior={historico?.idAnterior ?? null}
          idSeguinte={historico?.idSeguinte ?? null}
          emEspera={emEspera}
          imediato={trocando}
          aoEscolher={escolher}
          aoIrPara={(id) => mudarSelecao({ consulta: id })}
          acao={(consulta) => (
            <Botao variante="secundario" tamanho="sm" icone={ListTree} onClick={() => verPlano(consulta.id)}>
              Ver plano
            </Botao>
          )}
        />

        <div className={estilos.conteudo} aria-busy={carga.carregando}>
          <ConteudoAssincrono
            resultado={carga}
            esqueleto={<EsqueletoHistorico periodo={selecao.periodo} ordem={ordem} aoOrdenar={setOrdem} expandida={expandida} />}
            tituloErro="Não foi possível carregar o histórico"
          >
            {(dados) =>
              dados.pedido !== selecao ? (
                <EsqueletoHistorico periodo={selecao.periodo} ordem={ordem} aoOrdenar={setOrdem} expandida={expandida} imediato />
              ) : (
                <CorpoHistorico
                  carga={dados}
                  conexao={conexao}
                  aoCompararPlanos={(consulta, versao, anterior) => verPlano(consulta, versao, anterior)}
                  ordem={ordem}
                  aoOrdenar={setOrdem}
                  expandida={expandida}
                  aoExpandir={setExpandida}
                  aoMudarPeriodo={mudarPeriodo}
                  aoVerMaisPesada={() => mudarSelecao({ consulta: null })}
                  aoExportar={exportar}
                />
              )
            }
          </ConteudoAssincrono>
        </div>
      </div>
    </>
  );
}

interface CorpoHistoricoProps {
  carga: Carga;
  conexao: ConexaoDTO;
  aoCompararPlanos: (consulta: string, versao: string, anterior: string) => void;
  ordem: OrdemDosIntervalos;
  aoOrdenar: (ordem: OrdemDosIntervalos) => void;
  expandida: boolean;
  aoExpandir: (expandida: boolean) => void;
  aoMudarPeriodo: (periodo: PeriodoDashboard) => void;
  aoVerMaisPesada: () => void;
  aoExportar: (padrao: PadraoNumerico) => void;
}

function CorpoHistorico({
  carga,
  conexao,
  aoCompararPlanos,
  ordem,
  aoOrdenar,
  expandida,
  aoExpandir,
  aoMudarPeriodo,
  aoVerMaisPesada,
  aoExportar,
}: CorpoHistoricoProps) {
  if (carga.tipo === 'SEM_CONSULTAS') {
    return (
      <Painel>
        <EstadoVazio
          icone={SearchX}
          titulo="Nenhuma consulta registrada no período"
          descricao="Escolha um período maior ou aguarde o banco receber consultas."
        />
      </Painel>
    );
  }

  if (carga.tipo === 'NAO_ENCONTRADA') {
    return (
      <Painel>
        <EstadoVazio
          icone={SearchX}
          titulo="Consulta não encontrada"
          descricao="Ela não aparece mais nas estatísticas do banco. Busque outra consulta no campo acima ou veja a que mais pesa no período."
          acao={
            <Botao variante="secundario" onClick={aoVerMaisPesada}>
              Ver a que mais pesa
            </Botao>
          }
        />
      </Painel>
    );
  }

  const { historico } = carga;
  const comTroca = intervalosComTroca(historico);
  const ultimaTroca = historico.trocasDePlano[historico.trocasDePlano.length - 1];

  if (!foiExecutada(historico)) {
    return (
      <Painel>
        <EstadoVazio
          icone={ChartNoAxesColumn}
          titulo={`A consulta não foi executada ${descricaoPeriodo[historico.periodo]}`}
          descricao={
            historico.periodo === PERIODO_MAIS_LONGO
              ? 'Não há o que mostrar neste período. Busque outra consulta no campo acima.'
              : 'Escolha um período maior para ver o histórico dela.'
          }
          acao={
            historico.periodo === PERIODO_MAIS_LONGO ? undefined : (
              <Botao variante="secundario" onClick={() => aoMudarPeriodo(PERIODO_MAIS_LONGO)}>
                Ver os últimos 30 dias
              </Botao>
            )
          }
        />
      </Painel>
    );
  }

  return (
    <div className={estilos.historico}>
      <div className={estilos.abertura}>
        <DestaquesRelatorio
          destaques={montarDestaquesDoHistorico(historico)}
          cabecalhoDaCopia={cabecalhoDoHistorico(conexao.nome, historico, conexao.simulada)}
          textos={textosDosDestaques}
        />
        <IndicadoresHistorico historico={historico} />
      </div>

      <Painel aria-labelledby="titulo-evolucao-historico">
        <CabecalhoPainel
          titulo={<span id="titulo-evolucao-historico">{TITULO_EVOLUCAO}</span>}
          descricao={
            ultimaTroca
              ? `${descreverEvolucao(historico.periodo)}. ${descreverTroca(ultimaTroca)}, na linha tracejada.`
              : descreverEvolucao(historico.periodo)
          }
          acao={
            ultimaTroca ? (
              <Botao
                variante="secundario"
                tamanho="sm"
                icone={GitCompareArrows}
                onClick={() => aoCompararPlanos(historico.consulta.id, ultimaTroca.versao, ultimaTroca.versaoAnterior)}
              >
                Comparar os planos
              </Botao>
            ) : undefined
          }
        />
        <GraficoHistorico pontos={historico.pontos} periodo={historico.periodo} intervalosComTroca={comTroca} />
      </Painel>

      <Painel espacamento="nenhum" aria-labelledby="titulo-intervalos-historico">
        <div className={estilos.cabecalhoTabela}>
          <CabecalhoPainel
            titulo={<span id="titulo-intervalos-historico">{TITULO_INTERVALOS}</span>}
            descricao={descreverIntervalos(historico.periodo)}
            acao={
              <div className={estilos.acoesIntervalos}>
                <AlternarIntervalos
                  periodo={historico.periodo}
                  ordem={ordem}
                  total={historico.pontos.length}
                  expandido={expandida}
                  aoExpandir={aoExpandir}
                />
                <MenuExportarCsv exportando={false} desabilitado={false} aoExportar={aoExportar} />
              </div>
            }
          />
        </div>
        <TabelaIntervalos
          pontos={historico.pontos}
          periodo={historico.periodo}
          ordem={ordem}
          aoOrdenar={aoOrdenar}
          expandido={expandida}
          intervalosComTroca={comTroca}
        />
      </Painel>
    </div>
  );
}

interface EsqueletoHistoricoProps {
  periodo: PeriodoDashboard;
  ordem: OrdemDosIntervalos;
  aoOrdenar: (ordem: OrdemDosIntervalos) => void;
  expandida: boolean;
  imediato?: boolean;
}

function EsqueletoHistorico({ periodo, ordem, aoOrdenar, expandida, imediato = false }: EsqueletoHistoricoProps) {
  return (
    <RelatorioEmEspera rotulo="Carregando o histórico…" imediato={imediato} className={estilos.historico}>
      <div className={estilos.abertura}>
        <EsqueletoDestaques linhasPorFrase={LINHAS_POR_DESTAQUE} textos={textosDosDestaques} />
        <EsqueletoIndicadores />
      </div>
      <PainelEmEspera titulo={TITULO_EVOLUCAO} descricao={descreverEvolucao(periodo)}>
        <GraficosEmEspera alturas={[190, 180]} />
      </PainelEmEspera>
      <PainelEmEspera
        espacamento="nenhum"
        titulo={TITULO_INTERVALOS}
        descricao={descreverIntervalos(periodo)}
        acao={
          <div className={estilos.acoesIntervalos}>
            <AlternarIntervalos
              periodo={periodo}
              ordem={ordem}
              total={intervalosPorPeriodo[periodo]}
              expandido={expandida}
              aoExpandir={() => undefined}
              emEspera
            />
            <Esqueleto largura={LARGURA_DO_BOTAO_EXPORTAR} altura="var(--altura-controle)" raio="var(--raio-md)" />
          </div>
        }
        classeCabecalho={estilos.cabecalhoTabela}
      >
        <EsqueletoIntervalos
          periodo={periodo}
          total={intervalosPorPeriodo[periodo]}
          ordem={ordem}
          aoOrdenar={aoOrdenar}
          expandido={expandida}
        />
      </PainelEmEspera>
    </RelatorioEmEspera>
  );
}
