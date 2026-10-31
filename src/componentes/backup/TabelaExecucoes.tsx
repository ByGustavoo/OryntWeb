import { useState } from 'react';
import type { AnimationEvent, CSSProperties, MouseEvent } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import estilos from '@/componentes/objetos/TabelaObjetos.module.css';
import { ESMAECIMENTO_DO_ESQUELETO, NaoSeAplica } from '@/componentes/objetos/TabelaObjetos';
import { BotaoIcone, Esqueleto } from '@/componentes/ui';
import type { ExecucaoBackupDTO } from '@/modelos/backup';
import { rotuloTipoBackup } from '@/regras/backup';
import { formatarDataNumerica, formatarDuracaoExtensa, formatarHorario, formatarTamanho } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { SeloSituacaoExecucao } from './SelosBackup';
import locais from './TabelaExecucoes.module.css';

function Cabecalho() {
  return (
    <thead>
      <tr>
        <th scope="col" className={estilos.colunaVisao}>
          Backup
        </th>
        <th scope="col">Banco</th>
        <th scope="col">Data</th>
        <th scope="col">Horário</th>
        <th scope="col" className={estilos.colunaNumerica}>
          Duração
        </th>
        <th scope="col" className={estilos.colunaNumerica}>
          Tamanho
        </th>
        <th scope="col">Tipo</th>
        <th scope="col">Status</th>
        <td className={locais.colunaAcoes} aria-hidden="true" />
      </tr>
    </thead>
  );
}

interface TabelaExecucoesProps {
  execucoes: ExecucaoBackupDTO[];
  idAberta: string | null;
  aoAbrir: (execucao: ExecucaoBackupDTO) => void;
  aoExcluir: (execucao: ExecucaoBackupDTO) => void;
}

export function TabelaExecucoes({ execucoes, idAberta, aoAbrir, aoExcluir }: TabelaExecucoesProps) {
  const [entrando, setEntrando] = useState(true);

  const abrir = (evento: MouseEvent<HTMLTableRowElement>, execucao: ExecucaoBackupDTO) => {
    if ((evento.target as HTMLElement).closest('[data-acao-da-linha]')) return;
    evento.currentTarget.querySelector('button')?.focus({ preventScroll: true });
    aoAbrir(execucao);
  };

  const encerrarEntrada = (evento: AnimationEvent<HTMLTableRowElement>) => {
    if (evento.target === evento.currentTarget) setEntrando(false);
  };

  return (
    <div className={estilos.conteiner}>
      <table className={juntarClasses(estilos.tabela, locais.tabela)}>
        <caption className="visualmente-oculto">Backups executados</caption>
        <Cabecalho />
        <tbody>
          {execucoes.map((execucao, posicao) => (
            <tr
              key={execucao.id}
              className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
              data-execucao={execucao.id}
              aria-current={execucao.id === idAberta ? 'true' : undefined}
              style={{ '--indice': posicao } as CSSProperties}
              onClick={(evento) => abrir(evento, execucao)}
              onAnimationEnd={posicao === execucoes.length - 1 ? encerrarEntrada : undefined}
            >
              <td className={estilos.celulaVisao}>
                <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                  <span className={estilos.nome}>{execucao.nome}</span>
                  <span className={estilos.descricao}>{execucao.conexaoNome}</span>
                  <span className="visualmente-oculto">. Ver os detalhes deste backup</span>
                </button>
              </td>
              <td className={juntarClasses(estilos.celulaTipo, 'codigo')} data-rotulo="Banco">
                {execucao.banco}
              </td>
              <td className={juntarClasses(estilos.celulaTipo, 'numeros')} data-rotulo="Data">
                {formatarDataNumerica(execucao.iniciadaEm)}
              </td>
              <td className={juntarClasses(estilos.celulaTipo, 'numeros')} data-rotulo="Horário">
                {formatarHorario(execucao.iniciadaEm)}
              </td>
              <td className={juntarClasses(estilos.celulaNumerica, 'numeros')} data-rotulo="Duração">
                {execucao.duracaoMs !== null ? formatarDuracaoExtensa(execucao.duracaoMs) : <NaoSeAplica />}
              </td>
              <td className={juntarClasses(estilos.celulaNumerica, 'numeros')} data-rotulo="Tamanho">
                {execucao.tamanhoBytes !== null ? formatarTamanho(execucao.tamanhoBytes) : <NaoSeAplica />}
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Tipo">
                {rotuloTipoBackup[execucao.tipo]}
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Status">
                <SeloSituacaoExecucao situacao={execucao.situacao} progresso={execucao.progresso} />
              </td>
              <td className={locais.celulaAcoes}>
                <span className={locais.acoes}>
                  <span data-acao-da-linha>
                    <BotaoIcone
                      icone={Trash2}
                      tamanho="sm"
                      rotulo={`Excluir ${execucao.nome}`}
                      aria-disabled={execucao.situacao === 'EM_ANDAMENTO' ? true : undefined}
                      dica={execucao.situacao === 'EM_ANDAMENTO' ? 'Espere o backup terminar para excluí-lo.' : undefined}
                      onClick={() => {
                        if (execucao.situacao !== 'EM_ANDAMENTO') aoExcluir(execucao);
                      }}
                    />
                  </span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className={locais.seta} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EsqueletoExecucoes({ linhas }: { linhas: number }) {
  return (
    <div className={estilos.conteiner} role="status" aria-label="Carregando o histórico…">
      <table className={juntarClasses(estilos.tabela, locais.tabela)} aria-hidden="true">
        <Cabecalho />
        <tbody>
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) } as CSSProperties}>
              <td className={estilos.celulaVisao}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${58 - ((indice * 9) % 22)}%`} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura="32%" altura={10} />
                </span>
              </td>
              {['Banco', 'Data', 'Horário', 'Duração', 'Tamanho', 'Tipo', 'Status'].map((rotulo) => (
                <td key={rotulo} className={estilos.celulaTipo} data-rotulo={rotulo}>
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={52} />
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
