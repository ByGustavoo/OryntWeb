import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { descreverFalha } from '@/api/tratamentoErros';
import { DetalheAcompanhamento } from '@/componentes/backup/DetalheAcompanhamento';
import { DialogoConfirmacao } from '@/componentes/ui';
import { usePermissao } from '@/ganchos/usePermissao';
import type { AgendamentoBackupDTO, ExecucaoBackupDTO, NovaExecucaoDTO } from '@/modelos/backup';
import { emAndamento, pedeConfirmacaoAoSair } from '@/regras/acompanhamentoBackup';
import type { EntregaDoArquivo, LocalDeSalvamento } from '@/regras/acompanhamentoBackup';
import { filtrosHistoricoIniciais } from '@/regras/backup';
import { caminhos } from '@/rotas/caminhos';
import { servicoBackup } from '@/servicos';
import { gravarNaPasta } from '@/utilitarios/arquivoLocal';
import { baixarArquivo } from '@/utilitarios/download';
import type { ArquivoParaBaixar } from '@/utilitarios/download';
import { useNotificacoes } from './ProvedorNotificacoes';

const INTERVALO_DE_ACOMPANHAMENTO_MS = 500;
const INTERVALO_DOS_LEMBRETES_MS = 30_000;
const JANELA_DA_INTERRUPCAO_MS = 5 * 60_000;

type Pedido = { tipo: 'NOVO'; dados: NovaExecucaoDTO } | { tipo: 'AGENDAMENTO'; id: string };

type DestinoEscolhido = { modo: 'NAVEGADOR' } | { modo: 'PASTA'; pasta: FileSystemDirectoryHandle };

export interface ExecucaoAcompanhada {
  execucao: ExecucaoBackupDTO;
  pedido: Pedido | null;
  local: LocalDeSalvamento | null;
  entrega: EntregaDoArquivo;
  daOutraAba: boolean;
  semResposta: boolean;
  dispensada: boolean;
  encerradaEm: number | null;
}

interface ValorBackupLocal {
  destino: DestinoEscolhido;
  localDoDestino: LocalDeSalvamento;
  escolherDestino: (destino: DestinoEscolhido) => void;
  iniciar: (dados: NovaExecucaoDTO) => Promise<void>;
  fazerAgendamento: (agendamento: Pick<AgendamentoBackupDTO, 'id' | 'nome'>) => Promise<void>;
  abrirDetalhes: (id: string) => void;
  versao: number;
}

interface ValorAcompanhamento {
  acompanhadas: ExecucaoAcompanhada[];
  lembretes: AgendamentoBackupDTO[];
  dispensar: (id: string) => void;
  dispensarLembrete: (agendamento: AgendamentoBackupDTO) => void;
  pedirCancelamento: (id: string) => void;
  tentarDeNovo: (id: string) => void;
  baixar: (id: string) => void;
}

const ContextoBackupLocal = createContext<ValorBackupLocal | null>(null);
const ContextoAcompanhamento = createContext<ValorAcompanhamento | null>(null);

function novaAcompanhada(execucao: ExecucaoBackupDTO, pedido: Pedido | null, local: LocalDeSalvamento | null, daOutraAba: boolean): ExecucaoAcompanhada {
  return { execucao, pedido, local, entrega: execucao.situacao === 'EM_ANDAMENTO' ? 'AGUARDANDO' : 'SEM_ARQUIVO', daOutraAba, semResposta: false, dispensada: false, encerradaEm: null };
}

function paraLocal(destino: DestinoEscolhido): LocalDeSalvamento {
  return destino.modo === 'PASTA' ? { modo: 'PASTA', pasta: destino.pasta.name } : { modo: 'NAVEGADOR' };
}

function chaveDoLembrete(agendamento: AgendamentoBackupDTO): string {
  return `${agendamento.id}|${agendamento.lembreteEm ?? ''}`;
}

export function ProvedorBackupLocal({ children }: { children: ReactNode }) {
  const navegar = useNavigate();
  const notificacoes = useNotificacoes();
  const podeUsar = usePermissao('BACKUP_GERENCIAR');
  const [destino, setDestino] = useState<DestinoEscolhido>({ modo: 'NAVEGADOR' });
  const [acompanhadas, setAcompanhadas] = useState<ExecucaoAcompanhada[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoBackupDTO[]>([]);
  const [lembretesDispensados, setLembretesDispensados] = useState<ReadonlySet<string>>(new Set());
  const [idDetalhe, setIdDetalhe] = useState<string | null>(null);
  const [idCancelando, setIdCancelando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [versao, setVersao] = useState(0);
  const arquivos = useRef(new Map<string, ArquivoParaBaixar>());
  const pastas = useRef(new Map<string, FileSystemDirectoryHandle>());
  const destinoAtual = useRef(destino);
  destinoAtual.current = destino;

  const atualizar = useCallback((id: string, mudanca: Partial<ExecucaoAcompanhada>) => {
    setAcompanhadas((atuais) => atuais.map((item) => (item.execucao.id === id ? { ...item, ...mudanca } : item)));
  }, []);

  const buscarArquivo = useCallback(async (id: string): Promise<ArquivoParaBaixar> => {
    const guardado = arquivos.current.get(id);
    if (guardado) return guardado;
    const arquivo = await servicoBackup.buscarArquivo(id);
    arquivos.current.set(id, arquivo);
    return arquivo;
  }, []);

  const entregar = useCallback(
    async (id: string) => {
      atualizar(id, { entrega: 'RECEBENDO' });
      try {
        const arquivo = await buscarArquivo(id);
        const pasta = pastas.current.get(id);
        if (pasta) {
          await gravarNaPasta(pasta, arquivo);
          atualizar(id, { entrega: 'NA_PASTA', encerradaEm: Date.now() });
          return;
        }
        atualizar(id, { entrega: 'PARA_BAIXAR' });
      } catch {
        atualizar(id, { entrega: 'PARA_BAIXAR' });
      }
    },
    [atualizar, buscarArquivo],
  );

  const receberAtualizacao = useCallback(
    (id: string, atual: ExecucaoBackupDTO) => {
      const anterior = acompanhadasRef.current.find((item) => item.execucao.id === id);
      if (!anterior) return;
      const terminou = emAndamento(anterior.execucao) && !emAndamento(atual);
      if (!terminou) {
        atualizar(id, { execucao: atual, semResposta: false });
        return;
      }
      setVersao((valor) => valor + 1);
      if (atual.situacao !== 'CONCLUIDO') {
        atualizar(id, { execucao: atual, semResposta: false, entrega: 'SEM_ARQUIVO', encerradaEm: Date.now(), dispensada: false });
        return;
      }
      atualizar(id, { execucao: atual, semResposta: false, dispensada: false, encerradaEm: Date.now(), entrega: anterior.daOutraAba ? 'NA_OUTRA_ABA' : 'RECEBENDO' });
      if (!anterior.daOutraAba) void entregar(id);
    },
    [atualizar, entregar],
  );

  const acompanhadasRef = useRef(acompanhadas);
  acompanhadasRef.current = acompanhadas;

  const idsAtivos = acompanhadas.filter((item) => emAndamento(item.execucao)).map((item) => item.execucao.id).join(',');

  useEffect(() => {
    if (!idsAtivos) return;
    const controlador = new AbortController();
    const ids = idsAtivos.split(',');
    let temporizador = 0;
    const consultar = () => {
      void Promise.all(
        ids.map((id) =>
          servicoBackup
            .buscarExecucao(id, controlador.signal)
            .then((atual) => receberAtualizacao(id, atual))
            .catch(() => {
              if (!controlador.signal.aborted) atualizar(id, { semResposta: true });
            }),
        ),
      ).finally(() => {
        if (!controlador.signal.aborted) temporizador = window.setTimeout(consultar, INTERVALO_DE_ACOMPANHAMENTO_MS);
      });
    };
    temporizador = window.setTimeout(consultar, INTERVALO_DE_ACOMPANHAMENTO_MS);
    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [idsAtivos, receberAtualizacao, atualizar]);

  useEffect(() => {
    if (!podeUsar) return;
    const controlador = new AbortController();
    servicoBackup
      .listarExecucoes({ ...filtrosHistoricoIniciais, periodo: 'ULTIMAS_24_HORAS' }, controlador.signal)
      .then(({ itens }) => {
        const agora = Date.now();
        const achadas = itens.filter(
          (execucao) => emAndamento(execucao) || (execucao.interrompida && agora - new Date(execucao.iniciadaEm).getTime() < JANELA_DA_INTERRUPCAO_MS),
        );
        if (achadas.length === 0) return;
        setAcompanhadas((atuais) => {
          const conhecidas = new Set(atuais.map((item) => item.execucao.id));
          return [...atuais, ...achadas.filter((execucao) => !conhecidas.has(execucao.id)).map((execucao) => novaAcompanhada(execucao, null, null, true))];
        });
      })
      .catch(() => undefined);
    return () => controlador.abort();
  }, [podeUsar]);

  useEffect(() => {
    if (!podeUsar) return;
    const controlador = new AbortController();
    const buscar = () => {
      servicoBackup
        .listarAgendamentos(controlador.signal)
        .then(({ agendamentos: lista }) => setAgendamentos(lista))
        .catch(() => undefined);
    };
    buscar();
    const temporizador = window.setInterval(buscar, INTERVALO_DOS_LEMBRETES_MS);
    return () => {
      window.clearInterval(temporizador);
      controlador.abort();
    };
  }, [podeUsar, versao]);

  const haPerda = acompanhadas.some((item) => !item.dispensada && pedeConfirmacaoAoSair(item.execucao, item.entrega, item.daOutraAba));

  useEffect(() => {
    if (!haPerda) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [haPerda]);

  const adicionar = useCallback((execucao: ExecucaoBackupDTO, pedido: Pedido) => {
    const atual = destinoAtual.current;
    if (atual.modo === 'PASTA') pastas.current.set(execucao.id, atual.pasta);
    setAcompanhadas((atuais) => [novaAcompanhada(execucao, pedido, paraLocal(atual), false), ...atuais]);
    setVersao((valor) => valor + 1);
  }, []);

  const iniciar = useCallback(
    async (dados: NovaExecucaoDTO) => {
      adicionar(await servicoBackup.iniciarExecucao(dados), { tipo: 'NOVO', dados });
    },
    [adicionar],
  );

  const fazerAgendamento = useCallback(
    async ({ id, nome }: Pick<AgendamentoBackupDTO, 'id' | 'nome'>) => {
      try {
        adicionar(await servicoBackup.iniciarDoAgendamento(id), { tipo: 'AGENDAMENTO', id });
      } catch (erro) {
        notificacoes.erro(`Não foi possível iniciar ${nome}.`, descreverFalha(erro));
      }
    },
    [adicionar, notificacoes],
  );

  const dispensar = useCallback((id: string) => atualizar(id, { dispensada: true }), [atualizar]);

  const dispensarLembrete = useCallback((agendamento: AgendamentoBackupDTO) => {
    setLembretesDispensados((atuais) => new Set(atuais).add(chaveDoLembrete(agendamento)));
  }, []);

  const baixar = useCallback(
    (id: string) => {
      void buscarArquivo(id)
        .then((arquivo) => {
          baixarArquivo(arquivo);
          atualizar(id, { entrega: 'BAIXADO', encerradaEm: Date.now() });
        })
        .catch((erro: unknown) => notificacoes.erro('Não foi possível baixar o backup.', descreverFalha(erro)));
    },
    [atualizar, buscarArquivo, notificacoes],
  );

  const tentarDeNovo = useCallback(
    (id: string) => {
      const pedido = acompanhadasRef.current.find((item) => item.execucao.id === id)?.pedido;
      if (!pedido) {
        navegar(caminhos.backupResumo);
        return;
      }
      dispensar(id);
      setIdDetalhe(null);
      const refazer = pedido.tipo === 'NOVO' ? servicoBackup.iniciarExecucao(pedido.dados) : servicoBackup.iniciarDoAgendamento(pedido.id);
      refazer.then((execucao) => adicionar(execucao, pedido)).catch((erro: unknown) => notificacoes.erro('Não foi possível tentar de novo.', descreverFalha(erro)));
    },
    [adicionar, dispensar, navegar, notificacoes],
  );

  const confirmarCancelamento = async () => {
    if (!idCancelando) return;
    setCancelando(true);
    try {
      receberAtualizacao(idCancelando, await servicoBackup.cancelarExecucao(idCancelando));
      setIdCancelando(null);
    } catch (erro) {
      notificacoes.erro('Não foi possível cancelar o backup.', descreverFalha(erro));
    } finally {
      setCancelando(false);
    }
  };

  const lembretes = useMemo(() => {
    const emCurso = new Set(acompanhadas.filter((item) => emAndamento(item.execucao)).map((item) => item.execucao.agendamentoId));
    return agendamentos.filter((item) => item.lembreteEm !== null && !emCurso.has(item.id) && !lembretesDispensados.has(chaveDoLembrete(item)));
  }, [acompanhadas, agendamentos, lembretesDispensados]);

  const localDoDestino = useMemo(() => paraLocal(destino), [destino]);

  const valorBackup = useMemo<ValorBackupLocal>(
    () => ({ destino, localDoDestino, escolherDestino: setDestino, iniciar, fazerAgendamento, abrirDetalhes: setIdDetalhe, versao }),
    [destino, localDoDestino, iniciar, fazerAgendamento, versao],
  );

  const valorAcompanhamento = useMemo<ValorAcompanhamento>(
    () => ({ acompanhadas, lembretes, dispensar, dispensarLembrete, pedirCancelamento: setIdCancelando, tentarDeNovo, baixar }),
    [acompanhadas, lembretes, dispensar, dispensarLembrete, tentarDeNovo, baixar],
  );

  const detalhada = acompanhadas.find((item) => item.execucao.id === idDetalhe) ?? null;
  const emCancelamento = acompanhadas.find((item) => item.execucao.id === idCancelando) ?? null;

  return (
    <ContextoBackupLocal.Provider value={valorBackup}>
      <ContextoAcompanhamento.Provider value={valorAcompanhamento}>
        {children}
        <DetalheAcompanhamento
          acompanhada={detalhada}
          aoFechar={() => setIdDetalhe(null)}
          aoCancelar={setIdCancelando}
          aoTentarDeNovo={tentarDeNovo}
          aoBaixar={baixar}
          aoVerHistorico={(execucao) => {
            setIdDetalhe(null);
            navegar(caminhos.backupHistorico, { state: { execucaoAberta: execucao.id } });
          }}
        />
        <DialogoConfirmacao
          aberto={emCancelamento !== null && emAndamento(emCancelamento.execucao)}
          titulo={`Cancelar ${emCancelamento?.execucao.nome ?? 'o backup'}?`}
          descricao="A transferência para agora e o arquivo parcial é descartado. Nada fica salvo no seu computador, e o cancelamento fica no histórico."
          textoConfirmar="Cancelar backup"
          textoCancelar="Continuar o backup"
          destrutivo
          carregando={cancelando}
          aoConfirmar={() => void confirmarCancelamento()}
          aoCancelar={() => setIdCancelando(null)}
        />
      </ContextoAcompanhamento.Provider>
    </ContextoBackupLocal.Provider>
  );
}

export function useBackupLocal(): ValorBackupLocal {
  const contexto = useContext(ContextoBackupLocal);
  if (!contexto) throw new Error('useBackupLocal precisa estar dentro de <ProvedorBackupLocal>.');
  return contexto;
}

export function useAcompanhamentoBackup(): ValorAcompanhamento {
  const contexto = useContext(ContextoAcompanhamento);
  if (!contexto) throw new Error('useAcompanhamentoBackup precisa estar dentro de <ProvedorBackupLocal>.');
  return contexto;
}
