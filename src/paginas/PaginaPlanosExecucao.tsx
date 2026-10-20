import { useEffect, useMemo, useRef, useState } from 'react';
import { FlaskConical, History, ListTree, SearchX } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { ArvorePlano, EsqueletoArvore, idDaEtapa } from '@/componentes/consultas/ArvorePlano';
import { ComparacaoPlanos } from '@/componentes/consultas/ComparacaoPlanos';
import type { LadoExibido } from '@/componentes/consultas/ComparacaoPlanos';
import { ConsultaEmAnalise } from '@/componentes/consultas/ConsultaEmAnalise';
import type { ConsultaExibida } from '@/componentes/consultas/ConsultaEmAnalise';
import { DetalheEtapa } from '@/componentes/consultas/DetalheEtapa';
import { DiagnosticoPlano, EsqueletoDiagnostico } from '@/componentes/consultas/DiagnosticoPlano';
import { IndicadoresPlano } from '@/componentes/consultas/IndicadoresPlano';
import { IndicesSugeridos } from '@/componentes/consultas/IndicesSugeridos';
import { MenuCopiarPlano } from '@/componentes/consultas/MenuCopiarPlano';
import { VersoesPlano } from '@/componentes/consultas/VersoesPlano';
import { EsqueletoIndicadores } from '@/componentes/dashboard/GradeIndicadores';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { LinhaEmEspera, PainelEmEspera, RelatorioEmEspera } from '@/componentes/relatorios/EsqueletoRelatorio';
import { Botao, CabecalhoPainel, ConteudoAssincrono, Esqueleto, EstadoVazio, Nota, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useSelecaoPlano } from '@/ganchos/useSelecaoPlano';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useVerHistorico } from '@/ganchos/useVerHistorico';
import type { ConexaoDTO } from '@/modelos/conexao';
import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import type { PlanoExecucaoDTO, PlanosConsultaDTO, SelecaoPlano } from '@/modelos/planos';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { rotuloVerHistorico } from '@/regras/historicoConsulta';
import {
  PERIODO_DOS_PLANOS,
  ancestraisDaEtapa,
  descreverNo,
  diagnosticarPlano,
  etapaMaisLenta,
  linhasDoPlano,
  nomeDoNo,
  periodoDaVersao,
  rotuloDaVersao,
} from '@/regras/planoExecucao';
import { servicoConsultas } from '@/servicos';
import { prefereMovimentoReduzido } from '@/utilitarios/graficos';
import estilos from './PaginaPlanosExecucao.module.css';

const TITULO = 'Planos de execução';
const TITULO_ARVORE = 'Árvore do plano';
const DESCRICAO_ARVORE = 'Cada etapa recebe as linhas das que estão abaixo dela. A barra mostra o tempo gasto na própria etapa.';
const LARGURA_DO_BOTAO_COPIAR = 142;

type Carga =
  | { tipo: 'SEM_CONSULTAS'; pedido: SelecaoPlano }
  | { tipo: 'NAO_ENCONTRADA'; pedido: SelecaoPlano }
  | { tipo: 'PLANOS'; pedido: SelecaoPlano; planos: PlanosConsultaDTO; comparado: PlanosConsultaDTO | null };

type MudarPlanos = (versao: string | null, comparacao: string | null) => void;

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para ver como ele executa cada consulta.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

async function carregar(pedido: SelecaoPlano, signal: AbortSignal): Promise<Carga> {
  const id = pedido.consulta ?? (await servicoConsultas.buscarMaisPesada(PERIODO_DOS_PLANOS, signal))?.id ?? null;
  if (id === null) return { tipo: 'SEM_CONSULTAS', pedido };

  try {
    const [planos, comparado] = await Promise.all([
      servicoConsultas.buscarPlano(id, pedido.versao, signal),
      pedido.comparacao ? servicoConsultas.buscarPlano(id, pedido.comparacao, signal) : Promise.resolve(null),
    ]);
    return { tipo: 'PLANOS', pedido, planos, comparado };
  } catch (erro) {
    if (ehErroApi(erro, 'NAO_ENCONTRADO')) return { tipo: 'NAO_ENCONTRADA', pedido };
    throw erro;
  }
}

export default function PaginaPlanosExecucao() {
  useTituloDocumento('Consultas SQL: Planos de execução');
  const { situacao, conexao } = useConexao();
  const { selecao, mudarSelecao } = useSelecaoPlano();
  const idDaConexao = conexao?.id ?? null;
  const conexaoAnterior = useRef(idDaConexao);

  useEffect(() => {
    if (idDaConexao === null) return;
    if (conexaoAnterior.current !== null && conexaoAnterior.current !== idDaConexao) {
      mudarSelecao({ consulta: null, versao: null, comparacao: null });
    }
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

  return <PlanosConectados key={conexao.id} conexao={conexao} selecao={selecao} mudarSelecao={mudarSelecao} />;
}

interface PlanosConectadosProps {
  conexao: ConexaoDTO;
  selecao: SelecaoPlano;
  mudarSelecao: (mudanca: Partial<SelecaoPlano>) => void;
}

function PlanosConectados({ conexao, selecao, mudarSelecao }: PlanosConectadosProps) {
  const { marcarDesconectada } = useConexao();
  const verHistorico = useVerHistorico();
  const [escolhida, setEscolhida] = useState<ConsultaDetalhadaDTO | null>(null);

  const carga = useDadosAssincronos((signal) => carregar(selecao, signal), [selecao]);
  const sessaoEncerrada = ehErroApi(carga.erro, 'NAO_AUTORIZADO');
  const carregada = carga.dados;
  const trocando = carregada !== null && carregada.pedido !== selecao;
  const emEspera = carregada === null ? carga.carregando : trocando;
  const planos = carregada?.tipo === 'PLANOS' ? carregada.planos : null;
  const mesmaConsulta = planos !== null && (!trocando || planos.consulta.id === selecao.consulta);

  useEffect(() => {
    if (sessaoEncerrada) marcarDesconectada();
  }, [sessaoEncerrada, marcarDesconectada]);

  const exibida: ConsultaExibida | null =
    planos && mesmaConsulta
      ? {
          id: planos.consulta.id,
          sql: planos.consulta.sql,
          tipo: planos.consulta.tipo,
          desempenho: trocando || planos.consulta.quantidadeExecucoes === 0 ? null : planos.consulta.desempenho,
        }
      : escolhida && escolhida.id === selecao.consulta
        ? { id: escolhida.id, sql: escolhida.sql, tipo: escolhida.tipo, desempenho: null }
        : null;

  const escolher = (consulta: ConsultaDetalhadaDTO) => {
    setEscolhida(consulta);
    mudarSelecao({ consulta: consulta.id, versao: null, comparacao: null });
  };

  const mudarPlanos: MudarPlanos = (versao, comparacao) =>
    mudarSelecao({ consulta: selecao.consulta ?? planos?.consulta.id ?? null, versao, comparacao });

  return (
    <>
      <CabecalhoPagina
        titulo={TITULO}
        descricao="Como o banco executa uma consulta e em qual etapa o tempo é gasto, a partir de uma execução registrada."
      />

      <div className={estilos.blocos}>
        {conexao.simulada ? (
          <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
            As consultas, os planos e os números desta tela são fictícios e não vêm do seu banco. Eles dão lugar aos dados
            reais quando o Orynt estiver ligado à API.
          </Nota>
        ) : null}

        <ConsultaEmAnalise
          periodo={PERIODO_DOS_PLANOS}
          consulta={exibida}
          semConsultas={!emEspera && exibida === null}
          posicao={planos && !trocando ? planos.posicao : null}
          total={planos?.totalDoPeriodo ?? 0}
          idAnterior={planos?.idAnterior ?? null}
          idSeguinte={planos?.idSeguinte ?? null}
          emEspera={emEspera}
          imediato={trocando}
          rotuloDaPosicao="por peso em 30 dias"
          aoEscolher={escolher}
          aoIrPara={(id) => mudarSelecao({ consulta: id, versao: null, comparacao: null })}
          acao={(consulta) => (
            <Botao
              variante="secundario"
              tamanho="sm"
              icone={History}
              title={rotuloVerHistorico(PERIODO_DOS_PLANOS)}
              onClick={() => verHistorico(consulta.id, PERIODO_DOS_PLANOS)}
            >
              Ver histórico
            </Botao>
          )}
        />

        <div className={estilos.conteudo} aria-busy={carga.carregando}>
          <ConteudoAssincrono
            resultado={carga}
            esqueleto={<EsqueletoPlanos />}
            tituloErro="Não foi possível carregar o plano de execução"
          >
            {(dados) =>
              dados.pedido !== selecao ? (
                <EsqueletoPlanos imediato />
              ) : (
                <CorpoPlanos
                  carga={dados}
                  aoVerMaisPesada={() => mudarSelecao({ consulta: null, versao: null, comparacao: null })}
                  aoMudarPlanos={mudarPlanos}
                />
              )
            }
          </ConteudoAssincrono>
        </div>
      </div>
    </>
  );
}

interface CorpoPlanosProps {
  carga: Carga;
  aoVerMaisPesada: () => void;
  aoMudarPlanos: MudarPlanos;
}

function ladoExibido(planos: PlanosConsultaDTO): LadoExibido | null {
  const { plano } = planos;
  const indice = plano ? planos.versoes.findIndex((versao) => versao.id === plano.id) : -1;
  const versao = planos.versoes[indice];
  if (!plano || !versao) return null;
  return { plano, versao, rotulo: rotuloDaVersao(versao, indice), atual: indice === 0 };
}

function CorpoPlanos({ carga, aoVerMaisPesada, aoMudarPlanos }: CorpoPlanosProps) {
  if (carga.tipo === 'SEM_CONSULTAS') {
    return (
      <Painel>
        <EstadoVazio
          icone={SearchX}
          titulo="Nenhuma consulta registrada nos últimos 30 dias"
          descricao="Os planos aparecem aqui assim que o banco executar as primeiras consultas."
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
          descricao="Ela não aparece mais nas estatísticas do banco. Busque outra consulta no campo acima ou veja a que mais pesa."
          acao={
            <Botao variante="secundario" onClick={aoVerMaisPesada}>
              Ver a que mais pesa
            </Botao>
          }
        />
      </Painel>
    );
  }

  const { planos } = carga;
  if (!planos.plano) {
    const comando = planos.consulta.tipo === 'OUTRO';
    return (
      <Painel>
        <EstadoVazio
          icone={ListTree}
          titulo={comando ? 'Este comando não tem plano de execução' : 'Nenhum plano registrado nos últimos 30 dias'}
          descricao={
            comando
              ? 'Comandos de transação e de manutenção, como COMMIT, ANALYZE e REFRESH MATERIALIZED VIEW, não passam pelo planejador. Busque outra consulta no campo acima.'
              : 'O banco ainda não registrou uma execução desta consulta. Busque outra no campo acima ou veja a que mais pesa.'
          }
          acao={
            comando ? undefined : (
              <Botao variante="secundario" onClick={aoVerMaisPesada}>
                Ver a que mais pesa
              </Botao>
            )
          }
        />
      </Painel>
    );
  }

  const principal = ladoExibido(planos);
  const base = carga.comparado ? ladoExibido(carga.comparado) : null;
  if (principal && base && principal.plano.id !== base.plano.id) {
    return (
      <div className={estilos.planos}>
        <ComparacaoPlanos
          principal={principal}
          base={base}
          aoInverter={() => aoMudarPlanos(base.plano.id, principal.plano.id)}
          aoFechar={() => aoMudarPlanos(principal.plano.id, null)}
          aoAbrir={(versao) => aoMudarPlanos(versao, null)}
        />
        <VersoesPlano
          versoes={planos.versoes}
          exibidas={[principal.plano.id, base.plano.id]}
          aoEscolher={(versao) => aoMudarPlanos(versao, null)}
        />
      </div>
    );
  }

  const outra = planos.versoes.find((versao) => versao.id !== planos.plano?.id);
  return (
    <ConteudoDoPlano
      key={planos.plano.id}
      planos={planos}
      plano={planos.plano}
      aoEscolherVersao={(versao) => aoMudarPlanos(versao, null)}
      aoComparar={outra ? () => aoMudarPlanos(planos.plano?.id ?? null, outra.id) : undefined}
    />
  );
}

interface ConteudoDoPlanoProps {
  planos: PlanosConsultaDTO;
  plano: PlanoExecucaoDTO;
  aoEscolherVersao: (versao: string) => void;
  aoComparar?: () => void;
}

function ConteudoDoPlano({ planos, plano, aoEscolherVersao, aoComparar }: ConteudoDoPlanoProps) {
  const linhas = useMemo(() => linhasDoPlano(plano), [plano]);
  const achados = useMemo(() => diagnosticarPlano(plano), [plano]);
  const [selecionado, setSelecionado] = useState(() => etapaMaisLenta(linhas)?.no.id ?? plano.raiz.id);
  const detalhe = useRef<HTMLDivElement>(null);
  const posicao = Math.max(0, linhas.findIndex((linha) => linha.no.id === selecionado));
  const linha = linhas[posicao];
  const no = linha?.no ?? plano.raiz;
  const indiceDaVersao = planos.versoes.findIndex((versao) => versao.id === plano.id);
  const versaoExibida = planos.versoes[indiceDaVersao];
  const versaoAtual = planos.versoes[0];

  const nomeDaEtapa = (id: number) => {
    const etapa = linhas.find((linha) => linha.no.id === id)?.no;
    return etapa ? descreverNo(etapa) : 'a etapa';
  };

  const irParaEtapa = (id: number) => {
    setSelecionado(id);
    requestAnimationFrame(() => {
      const etapa = document.getElementById(idDaEtapa(id));
      etapa?.focus({ preventScroll: true });
      etapa?.scrollIntoView({ block: 'center', behavior: prefereMovimentoReduzido() ? 'auto' : 'smooth' });
    });
  };

  const selecionar = (id: number) => {
    setSelecionado(id);
    const caixa = detalhe.current?.getBoundingClientRect();
    if (caixa && caixa.top > window.innerHeight * 0.85) {
      detalhe.current?.scrollIntoView({ block: 'start', behavior: prefereMovimentoReduzido() ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className={estilos.planos}>
      <div className={estilos.abertura}>
        <DiagnosticoPlano
          achados={achados}
          nomeDaEtapa={nomeDaEtapa}
          aoIrParaEtapa={irParaEtapa}
          comLigacoes={linhas.length > 1}
        />
        <IndicadoresPlano plano={plano} />
      </div>

      {versaoExibida && versaoAtual && indiceDaVersao > 0 ? (
        <Nota tom="info" icone={History} titulo={`${rotuloDaVersao(versaoExibida, indiceDaVersao)}.`}>
          {periodoDaVersao(versaoExibida, false)}. O banco usa outro plano hoje.{' '}
          <button type="button" className={estilos.voltar} onClick={() => aoEscolherVersao(versaoAtual.id)}>
            Ver o plano atual
          </button>
        </Nota>
      ) : null}

      <div className={estilos.exame}>
        <Painel espacamento="nenhum" aria-labelledby="titulo-arvore-plano" className={estilos.painelArvore}>
          <div className={estilos.cabecalhoArvore}>
            <CabecalhoPainel
              titulo={<span id="titulo-arvore-plano">{TITULO_ARVORE}</span>}
              descricao={DESCRICAO_ARVORE}
              acao={<MenuCopiarPlano plano={plano} />}
            />
          </div>
          <ArvorePlano plano={plano} selecionado={no.id} aoSelecionar={selecionar} />
        </Painel>
        <div ref={detalhe} className={estilos.detalhe}>
          <div className={estilos.fixo}>
            <DetalheEtapa
              plano={plano}
              no={no}
              abaixoDeLimite={linha?.abaixoDeLimite ?? false}
              posicao={posicao + 1}
              total={linhas.length}
              caminho={ancestraisDaEtapa(linhas, no.id).map((id) => ({
                id,
                nome: nomeDoNo(linhas.find((outra) => outra.no.id === id)?.no ?? no),
              }))}
              aoIrParaEtapa={irParaEtapa}
            />
          </div>
        </div>
        <div className={estilos.extras}>
          {plano.sugestoes.length > 0 ? (
            <IndicesSugeridos plano={plano} aoIrParaEtapa={linhas.length > 1 ? irParaEtapa : null} />
          ) : null}
          <VersoesPlano
            versoes={planos.versoes}
            exibidas={[plano.id]}
            aoEscolher={aoEscolherVersao}
            aoComparar={aoComparar}
          />
        </div>
      </div>
    </div>
  );
}

function EsqueletoPlanos({ imediato = false }: { imediato?: boolean }) {
  return (
    <RelatorioEmEspera rotulo="Carregando o plano de execução…" imediato={imediato} className={estilos.planos}>
      <div className={estilos.abertura}>
        <EsqueletoDiagnostico />
        <EsqueletoIndicadores />
      </div>
      <div className={estilos.exame}>
        <PainelEmEspera
          espacamento="nenhum"
          titulo={TITULO_ARVORE}
          descricao={DESCRICAO_ARVORE}
          larguraDaAcao={LARGURA_DO_BOTAO_COPIAR}
          classeCabecalho={estilos.cabecalhoArvore}
          className={estilos.painelArvore}
        >
          <EsqueletoArvore />
        </PainelEmEspera>
        <div className={estilos.detalhe}>
          <Painel aria-hidden="true" className={estilos.detalheEmEspera}>
            <Esqueleto largura={72} altura={11} />
            <Esqueleto largura={148} altura={22} />
            <LinhaEmEspera largura="62%" />
            <LinhaEmEspera largura="88%" />
            <Esqueleto altura={78} raio="var(--raio-md)" />
            {Array.from({ length: 5 }, (_, indice) => (
              <LinhaEmEspera key={indice} largura={`${92 - indice * 6}%`} />
            ))}
          </Painel>
        </div>
      </div>
    </RelatorioEmEspera>
  );
}
