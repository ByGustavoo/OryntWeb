import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, FlaskConical, LockKeyhole, MailWarning, SearchX, UserPlus, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarraFiltrosContas } from '@/componentes/administracao/BarraFiltrosContas';
import { DetalheConta } from '@/componentes/administracao/DetalheConta';
import { ModalConta } from '@/componentes/administracao/ModalConta';
import type { ModoDaConta } from '@/componentes/administracao/ModalConta';
import { ModalExclusaoConta } from '@/componentes/administracao/ModalExclusaoConta';
import { EsqueletoContas, TabelaContas } from '@/componentes/administracao/TabelaContas';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { ResumoDaLista } from '@/componentes/objetos/ResumoDaLista';
import { Botao, ConteudoAssincrono, EstadoVazio, Nota, Paginacao, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { useFiltrosGuardados } from '@/ganchos/useFiltrosGuardados';
import { usePermissao } from '@/ganchos/usePermissao';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { ContaDTO, FiltroSituacaoConta, FiltrosContas } from '@/modelos/administracao';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { limparBusca } from '@/regras/buscaConsultas';
import {
  DIAS_SEM_ACESSO,
  aplicarMudancaContas,
  contarAtencao,
  descreverFiltrosContas,
  filtrarContas,
  lerFiltrosContas,
  resumirContas,
  semFiltrosContas,
  temFiltroAtivoContas,
} from '@/regras/contas';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { paginaDaPosicao, paginarLista } from '@/regras/paginacaoLocal';
import { caminhos } from '@/rotas/caminhos';
import { servicoAdministracao } from '@/servicos';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import estilos from './PaginaObjetos.module.css';

const ESPERA_DA_BUSCA_MS = 250;
const LINHAS_DO_ESQUELETO = 5;

type Formulario = { modo: ModoDaConta; geracao: number } | null;

export default function PaginaAdministracaoUsuarios() {
  useTituloDocumento('Administração: Usuários');
  const { usuario, atualizarUsuario } = useAutenticacao();
  const notificacoes = useNotificacoes();
  const navegar = useNavigate();
  const podeVerAuditoria = usePermissao('ADMIN_AUDITORIA');
  const { filtros, mudarFiltros } = useFiltrosGuardados<FiltrosContas>(
    caminhos.administracaoUsuarios,
    'contas',
    lerFiltrosContas,
    aplicarMudancaContas,
  );
  const regiao = useRef<HTMLDivElement>(null);
  const topo = useRef<HTMLDivElement>(null);
  const [busca, setBusca] = useState(filtros.busca);
  const [idAberta, setIdAberta] = useState<string | null>(null);
  const [rolarAteAberta, setRolarAteAberta] = useState(true);
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [excluindo, setExcluindo] = useState<ContaDTO | null>(null);
  const [exclusaoAberta, setExclusaoAberta] = useState(false);

  const lista = useDadosAssincronos((signal) => servicoAdministracao.listarContas(signal), []);
  const contas = useMemo(() => lista.dados?.contas ?? [], [lista.dados]);
  const agora = useMemo(() => new Date(lista.dados?.geradoEm ?? Date.now()), [lista.dados]);
  const filtradas = useMemo(() => filtrarContas(contas, filtros, agora), [contas, filtros, agora]);
  const atencao = useMemo(() => contarAtencao(contas, agora), [contas, agora]);
  const paginaAtual = useMemo(() => paginarLista(filtradas, filtros.pagina), [filtradas, filtros.pagina]);
  const carregado = lista.dados !== null;
  const paginaForaDaLista = carregado && paginaAtual.pagina !== filtros.pagina;
  const buscaDigitada = limparBusca(busca);
  const aberta = idAberta === null ? null : (contas.find((conta) => conta.id === idAberta) ?? null);
  const indiceAberto = aberta ? filtradas.indexOf(aberta) : -1;
  const simulada = usuario?.simulado ?? false;
  const ator = usuario ? { id: usuario.id, permissoes: usuario.permissoes } : { id: '', permissoes: [] };

  useEffect(() => {
    if (buscaDigitada === filtros.busca) return;
    const temporizador = window.setTimeout(() => mudarFiltros({ busca: buscaDigitada }), ESPERA_DA_BUSCA_MS);
    return () => window.clearTimeout(temporizador);
  }, [buscaDigitada, filtros.busca, mudarFiltros]);

  useEffect(() => {
    if (paginaForaDaLista) mudarFiltros({ pagina: paginaAtual.pagina });
  }, [paginaForaDaLista, paginaAtual.pagina, mudarFiltros]);

  const abrir = (conta: ContaDTO, rolar: boolean) => {
    setRolarAteAberta(rolar);
    setIdAberta(conta.id);
    const posicao = filtradas.indexOf(conta);
    if (posicao >= 0 && paginaDaPosicao(posicao) !== paginaAtual.pagina) mudarFiltros({ pagina: paginaDaPosicao(posicao) });
  };

  const percorrer = (sentido: SentidoDoPasso) => {
    const vizinha = filtradas[indiceAberto + sentido];
    if (indiceAberto < 0 || !vizinha) return;
    abrir(vizinha, true);
  };

  const limparFiltros = () => {
    setBusca('');
    mudarFiltros(semFiltrosContas());
  };

  const alternarSituacao = (situacao: FiltroSituacaoConta) =>
    mudarFiltros({ situacao: filtros.situacao === situacao ? null : situacao });

  const mudarPagina = (pagina: number) => {
    mudarFiltros({ pagina });
    topo.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

  const abrirFormulario = (modo: ModoDaConta) => {
    setFormulario((atual) => ({ modo, geracao: (atual?.geracao ?? 0) + 1 }));
    setFormularioAberto(true);
  };

  const atualizar = (conta: ContaDTO) => {
    lista.recarregar();
    if (conta.id === usuario?.id) void atualizarUsuario();
  };

  const aoSalvarConta = (conta: ContaDTO) => {
    const nova = formulario?.modo.tipo === 'NOVA';
    setFormularioAberto(false);
    atualizar(conta);
    if (nova) {
      notificacoes.sucesso(
        `Conta de ${conta.nome} criada`,
        conta.convite ? `O convite foi para ${conta.email} e vale por 7 dias.` : 'Ela fica desativada até alguém ativá-la.',
      );
      setRolarAteAberta(true);
      setIdAberta(conta.id);
    } else {
      notificacoes.sucesso('Dados da conta salvos', `${conta.nome}, ${conta.email}.`);
    }
  };

  const aoExcluirConta = (conta: ContaDTO) => {
    setExclusaoAberta(false);
    setIdAberta(null);
    lista.recarregar();
    notificacoes.sucesso(`Conta de ${conta.nome} excluída`, 'O que ela fez continua na auditoria.');
  };

  const verAtividade = (conta: ContaDTO) =>
    navegar(caminhos.administracaoAuditoria, { state: { auditoria: { conta: conta.id } } });

  const linhaDaAberta = () =>
    idAberta === null ? null : (regiao.current?.querySelector<HTMLElement>(`tr[data-conta="${CSS.escape(idAberta)}"] button`) ?? null);

  return (
    <>
      <CabecalhoPagina
        titulo="Usuários"
        descricao="As contas que entram no Orynt: quem são, o perfil, o que cada uma pode fazer e quando entrou pela última vez."
        acoes={
          <Botao icone={UserPlus} onClick={() => abrirFormulario({ tipo: 'NOVA' })} disabled={!carregado}>
            Novo usuário
          </Botao>
        }
      />

      <div className={estilos.blocos}>
        {simulada ? (
          <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
            As contas, as senhas (só o hash) e a auditoria ficam no simulador, neste navegador. Nenhum servidor guarda nada e nenhum
            e-mail é enviado.
          </Nota>
        ) : null}

        <Painel espacamento="nenhum" aria-labelledby="titulo-lista-contas" aria-busy={lista.carregando}>
          <div className={estilos.topo} ref={topo}>
            <h2 className="visualmente-oculto" id="titulo-lista-contas">
              Lista de usuários
            </h2>
            <BarraFiltrosContas
              busca={busca}
              filtros={filtros}
              aoDigitarBusca={setBusca}
              aoConfirmarBusca={() => mudarFiltros({ busca: buscaDigitada })}
              aoMudar={mudarFiltros}
            />
            <ResumoDaLista
              contagem={carregado ? resumirContas(contas.length, filtradas.length, filtros) : ''}
              emEspera={lista.dados === null && lista.carregando}
              rotuloDosAtalhos="Contas que pedem atenção"
              atalhos={[
                {
                  chave: 'BLOQUEADA',
                  icone: LockKeyhole,
                  tom: 'erro',
                  quantidade: atencao.bloqueadas,
                  texto: pluralizar(atencao.bloqueadas, 'bloqueada', 'bloqueadas'),
                  ativo: filtros.situacao === 'BLOQUEADA',
                  aoAlternar: () => alternarSituacao('BLOQUEADA'),
                },
                {
                  chave: 'CONVITE_EXPIRADO',
                  icone: MailWarning,
                  tom: 'aviso',
                  quantidade: atencao.convitesExpirados,
                  texto: pluralizar(atencao.convitesExpirados, 'convite expirado', 'convites expirados'),
                  ativo: filtros.situacao === 'CONVITE_EXPIRADO',
                  aoAlternar: () => alternarSituacao('CONVITE_EXPIRADO'),
                },
                {
                  chave: 'SEM_ACESSO_RECENTE',
                  icone: Clock,
                  tom: 'aviso',
                  quantidade: atencao.semAcesso,
                  texto: `sem acesso há ${DIAS_SEM_ACESSO} dias`,
                  ativo: filtros.situacao === 'SEM_ACESSO_RECENTE',
                  aoAlternar: () => alternarSituacao('SEM_ACESSO_RECENTE'),
                },
              ]}
              mostrarLimpar={temFiltroAtivoContas(filtros) && filtradas.length > 0}
              aoLimpar={limparFiltros}
            />
          </div>

          <div ref={regiao}>
            <ConteudoAssincrono
              resultado={lista}
              esqueleto={<EsqueletoContas linhas={LINHAS_DO_ESQUELETO} />}
              tituloErro="Não foi possível carregar os usuários"
            >
              {(dados) =>
                filtradas.length === 0 ? (
                  <EstadoVazio
                    icone={contas.length === 0 ? UsersRound : SearchX}
                    titulo="Nenhum usuário encontrado"
                    descricao={`Nenhuma das ${formatarNumero(contas.length)} contas corresponde aos filtros (${descreverFiltrosContas(filtros).join(', ')}).`}
                    acao={
                      <Botao variante="secundario" onClick={limparFiltros}>
                        Limpar filtros
                      </Botao>
                    }
                  />
                ) : (
                  <>
                    <TabelaContas
                      contas={paginaAtual.itens}
                      geradoEm={dados.geradoEm}
                      contaAtual={dados.contaAtual}
                      idAberta={idAberta}
                      rolarAteAberta={rolarAteAberta}
                      aoAbrir={(conta) => abrir(conta, false)}
                    />
                    {paginaAtual.totalPaginas > 1 ? (
                      <Paginacao
                        rotulo="Páginas da lista de usuários"
                        resumo={`${formatarNumero(paginaAtual.primeiro)} a ${formatarNumero(paginaAtual.ultimo)} de ${formatarNumero(filtradas.length)}`}
                        pagina={paginaAtual.pagina}
                        totalPaginas={paginaAtual.totalPaginas}
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

      <DetalheConta
        conta={aberta}
        contas={contas}
        ator={ator}
        geradoEm={lista.dados?.geradoEm ?? new Date().toISOString()}
        simulada={simulada}
        posicao={indiceAberto >= 0 ? indiceAberto + 1 : null}
        total={filtradas.length}
        podeVerAuditoria={podeVerAuditoria}
        aoPercorrer={percorrer}
        aoFechar={() => setIdAberta(null)}
        focoAoFechar={linhaDaAberta}
        aoEditar={(conta) => abrirFormulario({ tipo: 'EDITAR', conta })}
        aoExcluir={(conta) => {
          setExcluindo(conta);
          setExclusaoAberta(true);
        }}
        aoVerAtividade={verAtividade}
        aoAtualizar={atualizar}
      />

      {formulario ? (
        <ModalConta
          key={formulario.geracao}
          modo={formulario.modo}
          aberto={formularioAberto}
          ator={ator}
          contas={contas}
          simulada={simulada}
          aoFechar={() => setFormularioAberto(false)}
          aoSalvar={aoSalvarConta}
        />
      ) : null}

      {excluindo ? (
        <ModalExclusaoConta
          key={excluindo.id}
          conta={excluindo}
          aberto={exclusaoAberta}
          aoFechar={() => setExclusaoAberta(false)}
          aoExcluir={aoExcluirConta}
        />
      ) : null}
    </>
  );
}
