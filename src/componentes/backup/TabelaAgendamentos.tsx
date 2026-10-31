import { useState } from 'react';
import type { AnimationEvent, CSSProperties, MouseEvent } from 'react';
import { Copy, Pencil, Play, Trash2 } from 'lucide-react';
import estilos from '@/componentes/objetos/TabelaObjetos.module.css';
import { ESMAECIMENTO_DO_ESQUELETO, NaoSeAplica } from '@/componentes/objetos/TabelaObjetos';
import { BotaoIcone, Esqueleto, Interruptor } from '@/componentes/ui';
import type { AgendamentoBackupDTO } from '@/modelos/backup';
import { rotuloSituacaoExecucao } from '@/regras/backup';
import { descreverFrequencia } from '@/regras/frequenciaBackup';
import { formatarInstante, formatarTempoRelativo } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { SeloSituacaoAgendamento } from './SelosBackup';
import locais from './TabelaAgendamentos.module.css';

function Cabecalho() {
  return (
    <thead>
      <tr>
        <th scope="col" className={estilos.colunaVisao}>
          Agendamento
        </th>
        <th scope="col">Banco</th>
        <th scope="col">Próximo lembrete</th>
        <th scope="col">Último backup</th>
        <th scope="col">Status</th>
        <th scope="col">Ativo</th>
        <td className={locais.colunaAcoes} aria-hidden="true" />
      </tr>
    </thead>
  );
}

interface TabelaAgendamentosProps {
  agendamentos: AgendamentoBackupDTO[];
  idAberto: string | null;
  idAlternando: string | null;
  aoAbrir: (agendamento: AgendamentoBackupDTO) => void;
  aoAlternar: (agendamento: AgendamentoBackupDTO, ativo: boolean) => void;
  aoEditar: (agendamento: AgendamentoBackupDTO) => void;
  aoDuplicar: (agendamento: AgendamentoBackupDTO) => void;
  aoFazerAgora: (agendamento: AgendamentoBackupDTO) => void;
  aoExcluir: (agendamento: AgendamentoBackupDTO) => void;
}

export function TabelaAgendamentos({ agendamentos, idAberto, idAlternando, aoAbrir, aoAlternar, aoEditar, aoDuplicar, aoFazerAgora, aoExcluir }: TabelaAgendamentosProps) {
  const [entrando, setEntrando] = useState(true);

  const abrir = (evento: MouseEvent<HTMLTableRowElement>, agendamento: AgendamentoBackupDTO) => {
    if ((evento.target as HTMLElement).closest('[data-acao-da-linha]')) return;
    evento.currentTarget.querySelector('button')?.focus({ preventScroll: true });
    aoAbrir(agendamento);
  };

  const encerrarEntrada = (evento: AnimationEvent<HTMLTableRowElement>) => {
    if (evento.target === evento.currentTarget) setEntrando(false);
  };

  return (
    <div className={estilos.conteiner}>
      <table className={estilos.tabela}>
        <caption className="visualmente-oculto">Agendamentos de backup</caption>
        <Cabecalho />
        <tbody>
          {agendamentos.map((agendamento, posicao) => (
            <tr
              key={agendamento.id}
              className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
              data-agendamento={agendamento.id}
              aria-current={agendamento.id === idAberto ? 'true' : undefined}
              style={{ '--indice': posicao } as CSSProperties}
              onClick={(evento) => abrir(evento, agendamento)}
              onAnimationEnd={posicao === agendamentos.length - 1 ? encerrarEntrada : undefined}
            >
              <td className={estilos.celulaVisao}>
                <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                  <span className={estilos.nome}>{agendamento.nome}</span>
                  <span className={estilos.descricao}>{descreverFrequencia(agendamento.frequencia)}</span>
                  <span className="visualmente-oculto">. Ver os detalhes deste agendamento</span>
                </button>
              </td>
              <td className={juntarClasses(estilos.celulaTipo, 'codigo')} data-rotulo="Banco">
                {agendamento.banco}
              </td>
              <td className={juntarClasses(estilos.celulaTipo, 'numeros')} data-rotulo="Próximo lembrete">
                {agendamento.proximaExecucaoEm ? formatarInstante(agendamento.proximaExecucaoEm) : <NaoSeAplica />}
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Último backup">
                {agendamento.ultimaExecucao ? (
                  <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
                    <span className={estilos.textoPrincipal}>{formatarTempoRelativo(agendamento.ultimaExecucao.iniciadaEm)}</span>
                    <span className={estilos.textoSecundario}>{rotuloSituacaoExecucao[agendamento.ultimaExecucao.situacao]}</span>
                  </span>
                ) : (
                  <span className={estilos.secundario}>Nenhum ainda</span>
                )}
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Status">
                <SeloSituacaoAgendamento situacao={agendamento.situacao} />
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Ativo" data-acao-da-linha>
                <Interruptor
                  ligado={agendamento.ativo}
                  disabled={agendamento.conexaoId === null || idAlternando === agendamento.id}
                  aria-label={`${agendamento.ativo ? 'Desativar' : 'Ativar'} ${agendamento.nome}`}
                  aoMudar={(ativo) => aoAlternar(agendamento, ativo)}
                >
                  <span className="visualmente-oculto">{agendamento.ativo ? 'Ativo' : 'Inativo'}</span>
                </Interruptor>
              </td>
              <td className={locais.celulaAcoes} data-acao-da-linha>
                <span className={locais.acoes}>
                  <BotaoIcone
                    icone={Play}
                    tamanho="sm"
                    rotulo={`Fazer agora o backup ${agendamento.nome}`}
                    aria-disabled={agendamento.conexaoId === null ? true : undefined}
                    onClick={() => {
                      if (agendamento.conexaoId !== null) aoFazerAgora(agendamento);
                    }}
                  />
                  <BotaoIcone icone={Pencil} tamanho="sm" rotulo={`Editar ${agendamento.nome}`} onClick={() => aoEditar(agendamento)} />
                  <BotaoIcone icone={Copy} tamanho="sm" rotulo={`Duplicar ${agendamento.nome}`} onClick={() => aoDuplicar(agendamento)} />
                  <BotaoIcone icone={Trash2} tamanho="sm" rotulo={`Excluir ${agendamento.nome}`} onClick={() => aoExcluir(agendamento)} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EsqueletoAgendamentos({ linhas }: { linhas: number }) {
  return (
    <div className={estilos.conteiner} role="status" aria-label="Carregando os agendamentos…">
      <table className={estilos.tabela} aria-hidden="true">
        <Cabecalho />
        <tbody>
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) } as CSSProperties}>
              <td className={estilos.celulaVisao}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${54 - ((indice * 9) % 20)}%`} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura="38%" altura={10} />
                </span>
              </td>
              {['Banco', 'Próximo lembrete', 'Último backup', 'Status', 'Ativo'].map((rotulo) => (
                <td key={rotulo} className={estilos.celulaTipo} data-rotulo={rotulo}>
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={64} />
                  </span>
                </td>
              ))}
              <td className={locais.celulaAcoes} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
