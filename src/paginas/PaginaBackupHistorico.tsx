import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { History, Plus, SearchX } from 'lucide-react';
import { descreverFalha } from '@/api/tratamentoErros';
import { BarraFiltrosHistorico } from '@/componentes/backup/BarraFiltrosHistorico';
import { DetalheExecucao } from '@/componentes/backup/DetalheExecucao';
import { ModalPlanoBackup } from '@/componentes/backup/ModalPlanoBackup';
import { EsqueletoExecucoes, TabelaExecucoes } from '@/componentes/backup/TabelaExecucoes';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { ResumoDaLista } from '@/componentes/objetos/ResumoDaLista';
import { Botao, ConteudoAssincrono, DialogoConfirmacao, EstadoVazio, Paginacao, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useFiltrosGuardados } from '@/ganchos/useFiltrosGuardados';
import { usePlanoBackup } from '@/ganchos/usePlanoBackup';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { ExecucaoBackupDTO, FiltrosHistoricoBackup, PaginaExecucoesDTO } from '@/modelos/backup';
import { useBackupLocal } from '@/provedores/ProvedorBackupLocal';
import { useConexao } from '@/provedores/ProvedorConexao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import {
  aplicarMudancaHistorico,
  descreverFiltrosHistorico,
  lerFiltrosHistorico,
  resumirHistorico,
  semFiltrosHistorico,
  temFiltroAtivoHistorico,
} from '@/regras/backup';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { caminhos } from '@/rotas/caminhos';
import { servicoBackup } from '@/servicos';
import { formatarNumero } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import proprios from './PaginaAdministracaoAuditoria.module.css';
import estilosObjetos from './PaginaObjetos.module.css';
import estilos from './PaginaBackup.module.css';

const LINHAS_DO_ESQUELETO = 8;
const ESPERA_ENQUANTO_RODA_MS = 1500;

interface Carga {
  pedido: FiltrosHistoricoBackup;
  pagina: PaginaExecucoesDTO;
}

function execucaoDaChegada(estado: unknown): string | null {
  if (!estado || typeof estado !== 'object') return null;
  const { execucaoAberta } = estado as { execucaoAberta?: unknown };
  return typeof execucaoAberta === 'string' ? execucaoAberta : null;
}

export default function PaginaBackupHistorico() {
  useTituloDocumento('Backup: Histórico');
  const localizacao = useLocation();
  const { salvas } = useConexao();
  const notificacoes = useNotificacoes();
  const { versao: versaoDosBackups } = useBackupLocal();
  const { filtros, mudarFiltros } = useFiltrosGuardados<FiltrosHistoricoBackup>(caminhos.backupHistorico, 'historico', lerFiltrosHistorico, aplicarMudancaHistorico);
  const regiao = useRef<HTMLDivElement>(null);
  const topo = useRef<HTMLDivElement>(null);
  const chegada = useRef(execucaoDaChegada(localizacao.state));
  const [aberta, setAberta] = useState<ExecucaoBackupDTO | null>(null);
  const [exclusao, setExclusao] = useState<{ execucao: ExecucaoBackupDTO; aberta: boolean } | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [versao, setVersao] = useState(0);
  const { plano, abrirNovo, fechar } = usePlanoBackup();
  const chave = JSON.stringify(filtros);

  const carga = useDadosAssincronos<Carga>(async (signal) => ({ pedido: filtros, pagina: await servicoBackup.listarExecucoes(filtros, signal) }), [chave, versao, versaoDosBackups]);
  const dados = carga.dados?.pagina ?? null;
  const aplicados = carga.dados?.pedido ?? filtros;
  const itens = useMemo(() => dados?.itens ?? [], [dados]);
  const indiceNaPagina = aberta ? itens.findIndex((item) => item.id === aberta.id) : -1;
  const posicao = dados && indiceNaPagina >= 0 ? (dados.pagina - 1) * dados.itensPorPagina + indiceNaPagina + 1 : null;
  const trocandoFiltros = carga.carregando && carga.dados !== null && JSON.stringify(carga.dados.pedido) !== chave;
  const algumaRodando = itens.some((item) => item.situacao === 'EM_ANDAMENTO');

  useEffect(() => {
    if (!algumaRodando) return;
    const temporizador = window.setTimeout(() => setVersao((atual) => atual + 1), ESPERA_ENQUANTO_RODA_MS);
    return () => window.clearTimeout(temporizador);
  }, [algumaRodando, dados]);

  useEffect(() => {
    if (!aberta) return;
    const atualizada = itens.find((item) => item.id === aberta.id);
    if (atualizada && atualizada !== aberta && atualizada.situacao !== aberta.situacao) setAberta(atualizada);
  }, [itens, aberta]);

  useEffect(() => {
    const id = chegada.current;
    if (!id) return;
    chegada.current = null;
    servicoBackup.buscarExecucao(id).then(setAberta).catch(() => undefined);
  }, []);

  const paginaCorrigida = dados && !carga.carregando && dados.pagina !== filtros.pagina ? dados.pagina : null;
  useEffect(() => {
    if (paginaCorrigida !== null) mudarFiltros({ pagina: paginaCorrigida });
  }, [paginaCorrigida, mudarFiltros]);

  const limparFiltros = () => mudarFiltros(semFiltrosHistorico());

  const mudarPagina = (pagina: number) => {
    mudarFiltros({ pagina });
    topo.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

  const percorrer = (sentido: SentidoDoPasso) => {
    const vizinha = itens[indiceNaPagina + sentido];
    if (vizinha) setAberta(vizinha);
  };

  const excluir = async () => {
    if (!exclusao) return;
    setExcluindo(true);
    try {
      await servicoBackup.excluirExecucao(exclusao.execucao.id);
      notificacoes.sucesso('Registro excluído.', 'O arquivo no seu computador não foi afetado.');
      if (aberta?.id === exclusao.execucao.id) setAberta(null);
      setVersao((atual) => atual + 1);
    } catch (erro) {
      notificacoes.erro('Não foi possível excluir o backup.', descreverFalha(erro));
    } finally {
      setExcluindo(false);
      setExclusao({ ...exclusao, aberta: false });
    }
  };

  const linhaDaAberta = () =>
    aberta === null ? null : (regiao.current?.querySelector<HTMLElement>(`[data-execucao="${CSS.escape(aberta.id)}"] button`) ?? null);

  return (
    <>
      <CabecalhoPagina
        titulo="Histórico"
        descricao="O registro de cada backup: quando foi feito, de qual banco e como terminou. Os arquivos ficam no computador de quem os fez."
        acoes={
          salvas.length > 0 ? (
            <Botao icone={Plus} onClick={() => abrirNovo()}>
              Novo backup
            </Botao>
          ) : undefined
        }
      />

      <div className={estilos.blocos}>
        <Painel espacamento="nenhum" aria-labelledby="titulo-lista-historico" aria-busy={carga.carregando}>
          <div className={estilosObjetos.topo} ref={topo}>
            <h2 className="visualmente-oculto" id="titulo-lista-historico">
              Backups executados
            </h2>
            <BarraFiltrosHistorico filtros={filtros} bancos={dados?.bancos ?? []} aoMudar={mudarFiltros} />
            <ResumoDaLista
              contagem={dados ? resumirHistorico(dados.totalItens, aplicados) : ''}
              emEspera={dados === null && carga.carregando}
              rotuloDosAtalhos="Backups que pedem atenção"
              atalhos={[]}
              mostrarLimpar={temFiltroAtivoHistorico(aplicados) && itens.length > 0}
              aoLimpar={limparFiltros}
            />
          </div>

          <div ref={regiao} className={juntarClasses(proprios.lista, trocandoFiltros && proprios.atualizando)}>
            <ConteudoAssincrono resultado={carga} esqueleto={<EsqueletoExecucoes linhas={LINHAS_DO_ESQUELETO} />} tituloErro="Não foi possível carregar o histórico">
              {({ pagina }) =>
                pagina.totalRegistradas === 0 ? (
                  <EstadoVazio
                    icone={History}
                    titulo="Nenhum backup ainda"
                    descricao="Os backups aparecem aqui assim que forem feitos, na hora ou por um lembrete."
                    acao={
                      salvas.length > 0 ? (
                        <Botao icone={Plus} onClick={() => abrirNovo()}>
                          Fazer o primeiro backup
                        </Botao>
                      ) : undefined
                    }
                  />
                ) : pagina.itens.length === 0 ? (
                  <EstadoVazio
                    icone={SearchX}
                    titulo="Nenhum backup encontrado"
                    descricao={`Nenhum dos ${formatarNumero(pagina.totalRegistradas)} backups corresponde aos filtros (${descreverFiltrosHistorico(aplicados).join(', ')}).`}
                    acao={
                      <Botao variante="secundario" onClick={limparFiltros}>
                        Limpar filtros
                      </Botao>
                    }
                  />
                ) : (
                  <>
                    <TabelaExecucoes
                      execucoes={pagina.itens}
                      idAberta={aberta?.id ?? null}
                      aoAbrir={setAberta}
                      aoExcluir={(execucao) => setExclusao({ execucao, aberta: true })}
                    />
                    {pagina.totalPaginas > 1 ? (
                      <Paginacao
                        rotulo="Páginas do histórico"
                        resumo={`${formatarNumero((pagina.pagina - 1) * pagina.itensPorPagina + 1)} a ${formatarNumero((pagina.pagina - 1) * pagina.itensPorPagina + pagina.itens.length)} de ${formatarNumero(pagina.totalItens)}`}
                        pagina={pagina.pagina}
                        totalPaginas={pagina.totalPaginas}
                        aoMudar={mudarPagina}
                        className={estilosObjetos.paginacao}
                      />
                    ) : null}
                  </>
                )
              }
            </ConteudoAssincrono>
          </div>
        </Painel>
      </div>

      <DetalheExecucao
        execucao={aberta}
        posicao={posicao}
        total={dados?.totalItens ?? 0}
        aoPercorrer={percorrer}
        aoFechar={() => setAberta(null)}
        aoExcluir={(execucao) => setExclusao({ execucao, aberta: true })}
        focoAoFechar={linhaDaAberta}
      />

      {exclusao ? (
        <DialogoConfirmacao
          aberto={exclusao.aberta}
          titulo={`Excluir o registro de ${exclusao.execucao.nome}?`}
          descricao="O registro sai do histórico, e a exclusão fica na auditoria. O arquivo no seu computador não é afetado."
          textoConfirmar="Excluir"
          destrutivo
          carregando={excluindo}
          aoConfirmar={excluir}
          aoCancelar={() => setExclusao({ ...exclusao, aberta: false })}
        />
      ) : null}

      {plano ? (
        <ModalPlanoBackup
          key={plano.vez}
          aberto={plano.aberto}
          modo={plano.modo}
          inicial={plano.inicial}
          agendamentoId={plano.agendamentoId}
          aoFechar={fechar}
          aoConcluir={() => setVersao((atual) => atual + 1)}
        />
      ) : null}
    </>
  );
}
