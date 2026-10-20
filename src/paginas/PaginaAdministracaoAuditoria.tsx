import { useEffect, useMemo, useRef, useState } from 'react';
import { FlaskConical, RefreshCw, ScrollText, SearchX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarraFiltrosAuditoria } from '@/componentes/administracao/BarraFiltrosAuditoria';
import { DetalheEvento } from '@/componentes/administracao/DetalheEvento';
import { ResumoDaContaAuditoria } from '@/componentes/administracao/ResumoDaContaAuditoria';
import { EsqueletoAuditoria, TabelaAuditoria } from '@/componentes/administracao/TabelaAuditoria';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { ResumoDaLista } from '@/componentes/objetos/ResumoDaLista';
import { Botao, ConteudoAssincrono, EstadoVazio, Nota, Paginacao, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useFiltrosGuardados } from '@/ganchos/useFiltrosGuardados';
import { usePermissao } from '@/ganchos/usePermissao';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { EventoAuditoriaDTO, FiltrosAuditoria, PaginaAuditoriaDTO } from '@/modelos/administracao';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import {
  aplicarMudancaAuditoria,
  descreverFiltrosAuditoria,
  lerFiltrosAuditoria,
  resumirAuditoria,
  rotuloPeriodoAuditoria,
  semFiltrosAuditoria,
  temFiltroAtivoAuditoria,
} from '@/regras/auditoria';
import { limparBusca } from '@/regras/buscaConsultas';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { caminhos } from '@/rotas/caminhos';
import { servicoAdministracao } from '@/servicos';
import { formatarInstante, formatarNumero } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import proprios from './PaginaAdministracaoAuditoria.module.css';
import estilos from './PaginaObjetos.module.css';

const ESPERA_DA_BUSCA_MS = 250;
const LINHAS_DO_ESQUELETO = 8;

interface Carga {
  pedido: FiltrosAuditoria;
  pagina: PaginaAuditoriaDTO;
}

type Chegada = 'PRIMEIRO' | 'ULTIMO' | null;

export default function PaginaAdministracaoAuditoria() {
  useTituloDocumento('Administração: Auditoria');
  const { usuario } = useAutenticacao();
  const navegar = useNavigate();
  const veAlteracoes = usePermissao('BANCO_ACESSOS_VER');
  const { filtros, mudarFiltros } = useFiltrosGuardados<FiltrosAuditoria>(
    caminhos.administracaoAuditoria,
    'auditoria',
    lerFiltrosAuditoria,
    aplicarMudancaAuditoria,
  );
  const regiao = useRef<HTMLDivElement>(null);
  const topo = useRef<HTMLDivElement>(null);
  const [busca, setBusca] = useState(filtros.busca);
  const [aberto, setAberto] = useState<EventoAuditoriaDTO | null>(null);
  const [chegada, setChegada] = useState<Chegada>(null);
  const [versao, setVersao] = useState(0);
  const chave = JSON.stringify(filtros);

  const carga = useDadosAssincronos<Carga>(
    async (signal) => ({ pedido: filtros, pagina: await servicoAdministracao.listarAuditoria(filtros, signal) }),
    [chave, versao],
  );
  const dados = carga.dados?.pagina ?? null;
  const aplicados = carga.dados?.pedido ?? filtros;
  const eventos = useMemo(() => dados?.itens ?? [], [dados]);
  const buscaDigitada = limparBusca(busca);
  const simulada = usuario?.simulado ?? false;
  const nomeDaConta = dados?.contas.find((conta) => conta.id === aplicados.conta)?.nome ?? null;
  const indiceNaPagina = aberto ? eventos.findIndex((evento) => evento.id === aberto.id) : -1;
  const posicao = dados && indiceNaPagina >= 0 ? (dados.pagina - 1) * dados.itensPorPagina + indiceNaPagina + 1 : null;
  const atualizando = carga.carregando && carga.dados !== null;

  useEffect(() => {
    if (buscaDigitada === filtros.busca) return;
    const temporizador = window.setTimeout(() => mudarFiltros({ busca: buscaDigitada }), ESPERA_DA_BUSCA_MS);
    return () => window.clearTimeout(temporizador);
  }, [buscaDigitada, filtros.busca, mudarFiltros]);

  const paginaCorrigida = dados && !carga.carregando && dados.pagina !== filtros.pagina ? dados.pagina : null;
  useEffect(() => {
    if (paginaCorrigida !== null) mudarFiltros({ pagina: paginaCorrigida });
  }, [paginaCorrigida, mudarFiltros]);

  useEffect(() => {
    if (!chegada || !dados || carga.carregando || aplicados.pagina !== filtros.pagina) return;
    const alvo = chegada === 'PRIMEIRO' ? eventos[0] : eventos[eventos.length - 1];
    setChegada(null);
    if (alvo) setAberto(alvo);
  }, [chegada, dados, carga.carregando, aplicados.pagina, filtros.pagina, eventos]);

  const percorrer = (sentido: SentidoDoPasso) => {
    if (!dados || indiceNaPagina < 0 || chegada) return;
    const vizinho = eventos[indiceNaPagina + sentido];
    if (vizinho) {
      setAberto(vizinho);
      return;
    }
    const proxima = dados.pagina + sentido;
    if (proxima < 1 || proxima > dados.totalPaginas) return;
    setChegada(sentido === 1 ? 'PRIMEIRO' : 'ULTIMO');
    mudarFiltros({ pagina: proxima });
  };

  const limparFiltros = () => {
    setBusca('');
    mudarFiltros(semFiltrosAuditoria());
  };

  const mudarPagina = (pagina: number) => {
    mudarFiltros({ pagina });
    topo.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

  const verDaConta = (contaId: string) => {
    setAberto(null);
    mudarFiltros({ conta: contaId });
  };

  const linhaDoAberto = () =>
    aberto === null ? null : (regiao.current?.querySelector<HTMLElement>(`tr[data-evento="${CSS.escape(aberto.id)}"] button`) ?? null);

  const descricaoDaPagina = dados?.registradosDesde
    ? `O que cada conta acessou e fez no Orynt, registrado pelo servidor desde ${formatarInstante(dados.registradosDesde)}. Nada aqui pode ser editado ou apagado.`
    : 'O que cada conta acessou e fez no Orynt, registrado pelo servidor. Nada aqui pode ser editado ou apagado.';

  return (
    <>
      <CabecalhoPagina
        titulo="Auditoria"
        descricao={descricaoDaPagina}
        acoes={
          <Botao variante="secundario" icone={RefreshCw} carregando={atualizando} onClick={() => setVersao((atual) => atual + 1)}>
            Atualizar
          </Botao>
        }
      />

      <div className={estilos.blocos}>
        {simulada ? (
          <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
            Os eventos são os que o simulador registrou neste navegador desde que você começou a usar o Orynt, guardados até{' '}
            {formatarNumero(5000)}. Nenhum evento foi inventado; o endereço IP não existe na simulação.
          </Nota>
        ) : null}

        {dados?.resumoDaConta && aplicados.conta ? (
          <ResumoDaContaAuditoria
            resumo={dados.resumoDaConta}
            periodo={aplicados.periodo ? `em ${rotuloPeriodoAuditoria[aplicados.periodo].toLowerCase()}` : 'desde o início do registro'}
            aoLimpar={() => mudarFiltros({ conta: null })}
          />
        ) : null}

        <Painel espacamento="nenhum" aria-labelledby="titulo-lista-auditoria" aria-busy={carga.carregando}>
          <div className={estilos.topo} ref={topo}>
            <h2 className="visualmente-oculto" id="titulo-lista-auditoria">
              Eventos registrados
            </h2>
            <BarraFiltrosAuditoria
              busca={busca}
              filtros={filtros}
              contas={dados?.contas ?? []}
              aoDigitarBusca={setBusca}
              aoConfirmarBusca={() => mudarFiltros({ busca: buscaDigitada })}
              aoMudar={mudarFiltros}
            />
            <ResumoDaLista
              contagem={dados ? resumirAuditoria(dados.totalItens, aplicados) : ''}
              emEspera={dados === null && carga.carregando}
              rotuloDosAtalhos="Eventos que pedem atenção"
              atalhos={[]}
              mostrarLimpar={temFiltroAtivoAuditoria(aplicados) && eventos.length > 0}
              aoLimpar={limparFiltros}
            />
          </div>

          <div ref={regiao} className={juntarClasses(proprios.lista, atualizando && proprios.atualizando)}>
            <ConteudoAssincrono
              resultado={carga}
              esqueleto={<EsqueletoAuditoria linhas={LINHAS_DO_ESQUELETO} />}
              tituloErro="Não foi possível carregar a auditoria"
            >
              {({ pagina }) =>
                pagina.totalRegistrados === 0 ? (
                  <EstadoVazio
                    icone={ScrollText}
                    titulo="Nenhum evento registrado ainda"
                    descricao="Logins, acessos a telas e operações aparecem aqui assim que acontecem."
                  />
                ) : pagina.itens.length === 0 ? (
                  <EstadoVazio
                    icone={SearchX}
                    titulo="Nenhum evento encontrado"
                    descricao={`Nenhum dos ${formatarNumero(pagina.totalRegistrados)} eventos corresponde aos filtros (${descreverFiltrosAuditoria(aplicados, nomeDaConta).join(', ')}).`}
                    acao={
                      <Botao variante="secundario" onClick={limparFiltros}>
                        Limpar filtros
                      </Botao>
                    }
                  />
                ) : (
                  <>
                    <TabelaAuditoria eventos={pagina.itens} geradoEm={pagina.geradoEm} idAberto={aberto?.id ?? null} aoAbrir={setAberto} />
                    {pagina.totalPaginas > 1 ? (
                      <Paginacao
                        rotulo="Páginas da auditoria"
                        resumo={`${formatarNumero((pagina.pagina - 1) * pagina.itensPorPagina + 1)} a ${formatarNumero(
                          (pagina.pagina - 1) * pagina.itensPorPagina + pagina.itens.length,
                        )} de ${formatarNumero(pagina.totalItens)}`}
                        pagina={pagina.pagina}
                        totalPaginas={pagina.totalPaginas}
                        aoMudar={mudarPagina}
                        className={estilos.paginacao}
                      />
                    ) : null}
                  </>
                )
              }
            </ConteudoAssincrono>
          </div>
        </Painel>
      </div>

      <DetalheEvento
        evento={aberto}
        simulada={simulada}
        posicao={posicao}
        total={dados?.totalItens ?? 0}
        temAnterior={posicao !== null && posicao > 1 && chegada === null}
        temSeguinte={posicao !== null && dados !== null && posicao < dados.totalItens && chegada === null}
        aoPercorrer={percorrer}
        aoFechar={() => setAberto(null)}
        focoAoFechar={linhaDoAberto}
        aoVerDaConta={verDaConta}
        aoAbrirAlteracoes={veAlteracoes ? () => navegar(caminhos.usuariosAlteracoes) : undefined}
      />
    </>
  );
}
