import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarClock, Plus } from 'lucide-react';
import { descreverFalha } from '@/api/tratamentoErros';
import { DetalheAgendamento } from '@/componentes/backup/DetalheAgendamento';
import { ModalConexaoSalva } from '@/componentes/backup/ModalConexaoSalva';
import { ModalPlanoBackup } from '@/componentes/backup/ModalPlanoBackup';
import { EsqueletoAgendamentos, TabelaAgendamentos } from '@/componentes/backup/TabelaAgendamentos';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { Botao, ConteudoAssincrono, DialogoConfirmacao, EstadoVazio, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { usePlanoBackup } from '@/ganchos/usePlanoBackup';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { AgendamentoBackupDTO } from '@/modelos/backup';
import { useBackupLocal } from '@/provedores/ProvedorBackupLocal';
import { useConexao } from '@/provedores/ProvedorConexao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { caminhos } from '@/rotas/caminhos';
import { servicoBackup } from '@/servicos';

const LINHAS_DO_ESQUELETO = 5;

function agendamentoDaChegada(estado: unknown): string | null {
  if (!estado || typeof estado !== 'object') return null;
  const { agendamentoAberto } = estado as { agendamentoAberto?: unknown };
  return typeof agendamentoAberto === 'string' ? agendamentoAberto : null;
}

export default function PaginaBackupAgendamentos() {
  useTituloDocumento('Backup: Agendamentos');
  const localizacao = useLocation();
  const navegar = useNavigate();
  const { salvas, guardarSalva } = useConexao();
  const notificacoes = useNotificacoes();
  const { fazerAgendamento, versao: versaoDosBackups } = useBackupLocal();
  const regiao = useRef<HTMLDivElement>(null);
  const chegada = useRef(agendamentoDaChegada(localizacao.state));
  const [versao, setVersao] = useState(0);
  const [aberto, setAberto] = useState<AgendamentoBackupDTO | null>(null);
  const [alternando, setAlternando] = useState<string | null>(null);
  const [exclusao, setExclusao] = useState<{ agendamento: AgendamentoBackupDTO; aberta: boolean } | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [cadastro, setCadastro] = useState({ vez: 0, aberto: false });
  const { plano, abrirNovo, abrirEdicao, abrirDuplicata, fechar } = usePlanoBackup();
  const lista = useDadosAssincronos((signal) => servicoBackup.listarAgendamentos(signal), [versao, versaoDosBackups]);
  const agendamentos = lista.dados?.agendamentos ?? null;
  const semConexoes = salvas.length === 0;

  useEffect(() => {
    if (!chegada.current || !agendamentos) return;
    const alvo = agendamentos.find((item) => item.id === chegada.current);
    chegada.current = null;
    if (alvo) setAberto(alvo);
  }, [agendamentos]);

  const alternar = async (agendamento: AgendamentoBackupDTO, ativo: boolean) => {
    setAlternando(agendamento.id);
    try {
      await servicoBackup.alternarAgendamento(agendamento.id, ativo);
      notificacoes.sucesso(ativo ? 'Agendamento ativado.' : 'Agendamento desativado.', agendamento.nome);
      setVersao((atual) => atual + 1);
    } catch (erro) {
      notificacoes.erro('Não foi possível mudar o agendamento.', descreverFalha(erro));
    } finally {
      setAlternando(null);
    }
  };

  const excluir = async () => {
    if (!exclusao) return;
    setExcluindo(true);
    try {
      await servicoBackup.excluirAgendamento(exclusao.agendamento.id);
      notificacoes.sucesso('Agendamento excluído.', exclusao.agendamento.nome);
      setVersao((atual) => atual + 1);
    } catch (erro) {
      notificacoes.erro('Não foi possível excluir o agendamento.', descreverFalha(erro));
    } finally {
      setExcluindo(false);
      setExclusao({ ...exclusao, aberta: false });
    }
  };

  const editar = (agendamento: AgendamentoBackupDTO) => {
    setAberto(null);
    abrirEdicao(agendamento);
  };

  const duplicar = (agendamento: AgendamentoBackupDTO) => {
    setAberto(null);
    abrirDuplicata(agendamento);
  };

  const fazerAgora = (agendamento: AgendamentoBackupDTO) => {
    setAberto(null);
    void fazerAgendamento(agendamento);
  };

  const linhaDoAberto = () =>
    aberto === null ? null : (regiao.current?.querySelector<HTMLElement>(`[data-agendamento="${CSS.escape(aberto.id)}"] button`) ?? null);

  return (
    <>
      <CabecalhoPagina
        titulo="Agendamentos"
        descricao="Lembretes de backup. Na hora prevista, com o Orynt aberto, você recebe um aviso e confirma o início. Com o site fechado, nada roda."
        acoes={
          semConexoes ? undefined : (
            <Botao icone={Plus} onClick={() => abrirNovo('DIARIA')}>
              Novo agendamento
            </Botao>
          )
        }
      />

      <Painel espacamento="nenhum" aria-label="Agendamentos de backup" aria-busy={lista.carregando}>
        <div ref={regiao}>
          <ConteudoAssincrono resultado={lista} esqueleto={<EsqueletoAgendamentos linhas={LINHAS_DO_ESQUELETO} />} tituloErro="Não foi possível carregar os agendamentos">
            {({ agendamentos: itens }) =>
              itens.length === 0 ? (
                <EstadoVazio
                  icone={CalendarClock}
                  titulo="Nenhum agendamento ainda"
                  descricao={semConexoes ? 'Cadastre uma conexão PostgreSQL para poder agendar backups.' : 'Crie um lembrete para o Orynt avisar quando for a hora de fazer o backup.'}
                  acao={
                    semConexoes ? (
                      <Botao icone={Plus} onClick={() => setCadastro((atual) => ({ vez: atual.vez + 1, aberto: true }))}>
                        Cadastrar conexão
                      </Botao>
                    ) : (
                      <Botao icone={Plus} onClick={() => abrirNovo('DIARIA')}>
                        Criar agendamento
                      </Botao>
                    )
                  }
                />
              ) : (
                <TabelaAgendamentos
                  agendamentos={itens}
                  idAberto={aberto?.id ?? null}
                  idAlternando={alternando}
                  aoAbrir={setAberto}
                  aoAlternar={(agendamento, ativo) => void alternar(agendamento, ativo)}
                  aoEditar={editar}
                  aoDuplicar={duplicar}
                  aoFazerAgora={fazerAgora}
                  aoExcluir={(agendamento) => setExclusao({ agendamento, aberta: true })}
                />
              )
            }
          </ConteudoAssincrono>
        </div>
      </Painel>

      <DetalheAgendamento
        agendamento={aberto}
        aoFechar={() => setAberto(null)}
        aoEditar={editar}
        aoDuplicar={duplicar}
        aoFazerAgora={fazerAgora}
        aoVerHistorico={(banco) => navegar(caminhos.backupHistorico, { state: { historico: { banco } } })}
        focoAoFechar={linhaDoAberto}
      />

      {exclusao ? (
        <DialogoConfirmacao
          aberto={exclusao.aberta}
          titulo={`Excluir ${exclusao.agendamento.nome}?`}
          descricao="O Orynt deixa de avisar. Os backups já feitos continuam no histórico, e os arquivos no seu computador não são afetados."
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

      {cadastro.vez > 0 ? (
        <ModalConexaoSalva
          key={cadastro.vez}
          conexao={null}
          aberto={cadastro.aberto}
          aoFechar={() => setCadastro((atual) => ({ ...atual, aberto: false }))}
          aoSalvar={(salva) => {
            guardarSalva(salva);
            setCadastro((atual) => ({ ...atual, aberto: false }));
            notificacoes.sucesso('Conexão salva.', salva.nome);
          }}
        />
      ) : null}
    </>
  );
}
