import { useState } from 'react';
import { ArrowRight, Copy, Pencil, Play, TriangleAlert } from 'lucide-react';
import { Medida } from '@/componentes/objetos/DetalheObjeto';
import locais from '@/componentes/administracao/DetalheEvento.module.css';
import estilos from '@/componentes/objetos/DetalheObjeto.module.css';
import { Botao, Modal, Nota } from '@/componentes/ui';
import type { AgendamentoBackupDTO } from '@/modelos/backup';
import { PROXIMAS_NA_PREVIA, rotuloSituacaoExecucao, rotuloTipoBackup } from '@/regras/backup';
import { descreverFrequencia, proximasOcorrencias } from '@/regras/frequenciaBackup';
import { descreverSelecao } from '@/regras/selecaoObjetosBackup';
import { formatarDiaSemana, formatarInstante, formatarTempoAte, formatarTempoRelativo, iniciarComMaiuscula } from '@/utilitarios/formatacao';
import { SeloSituacaoAgendamento } from './SelosBackup';

interface DetalheAgendamentoProps {
  agendamento: AgendamentoBackupDTO | null;
  aoFechar: () => void;
  aoEditar: (agendamento: AgendamentoBackupDTO) => void;
  aoDuplicar: (agendamento: AgendamentoBackupDTO) => void;
  aoFazerAgora: (agendamento: AgendamentoBackupDTO) => void;
  aoVerHistorico: (banco: string) => void;
  focoAoFechar: () => HTMLElement | null;
}

export function DetalheAgendamento({ agendamento, aoFechar, aoEditar, aoDuplicar, aoFazerAgora, aoVerHistorico, focoAoFechar }: DetalheAgendamentoProps) {
  const [exibido, setExibido] = useState(agendamento);
  if (agendamento && agendamento !== exibido) setExibido(agendamento);
  const agora = new Date();
  const proximas =
    exibido && exibido.proximaExecucaoEm
      ? proximasOcorrencias(exibido.frequencia, new Date(exibido.vigenteDesde), agora, PROXIMAS_NA_PREVIA)
      : [];

  return (
    <Modal
      aberto={agendamento !== null}
      aoFechar={aoFechar}
      titulo="Detalhes do agendamento"
      descricao={exibido ? descreverFrequencia(exibido.frequencia) : undefined}
      tamanho="lg"
      focoAoFechar={focoAoFechar}
      rodape={
        exibido ? (
          <>
            <Botao variante="secundario" icone={Copy} onClick={() => aoDuplicar(exibido)}>
              Duplicar
            </Botao>
            <Botao variante="secundario" icone={Pencil} onClick={() => aoEditar(exibido)}>
              Editar
            </Botao>
            {exibido.conexaoId ? (
              <Botao icone={Play} onClick={() => aoFazerAgora(exibido)}>
                Fazer agora
              </Botao>
            ) : null}
          </>
        ) : null
      }
    >
      {exibido ? (
        <div className={estilos.detalhe}>
          <header className={estilos.identidade}>
            <p className={estilos.nome}>{exibido.nome}</p>
            <div className={estilos.selos}>
              <SeloSituacaoAgendamento situacao={exibido.situacao} />
            </div>
          </header>

          {exibido.situacao === 'ATRASADO' ? (
            <Nota tom="aviso" icone={TriangleAlert} titulo="A hora passou e o backup não foi feito.">
              O Orynt só avisa com o site aberto: nada roda sozinho. Faça o backup agora, ou salve ou reative o agendamento para a contagem recomeçar.
            </Nota>
          ) : null}
          {exibido.situacao === 'SEM_CONEXAO' ? (
            <Nota tom="erro" icone={TriangleAlert} titulo="A conexão foi excluída.">
              Edite o agendamento, escolha outra conexão e ative de novo. O histórico dos backups antigos continua guardado.
            </Nota>
          ) : null}

          <dl className={estilos.medidas}>
            <Medida rotulo="Tipo" valor={rotuloTipoBackup[exibido.tipo]} />
            <Medida rotulo="Objetos" valor={descreverSelecao(exibido.selecao)} />
            <Medida
              rotulo="Próximo lembrete"
              valor={exibido.proximaExecucaoEm ? formatarTempoAte(exibido.proximaExecucaoEm) : '—'}
              dica={exibido.proximaExecucaoEm ? formatarInstante(exibido.proximaExecucaoEm) : undefined}
            />
            <Medida
              rotulo="Último backup"
              valor={exibido.ultimaExecucao ? formatarTempoRelativo(exibido.ultimaExecucao.iniciadaEm) : 'Nunca'}
              dica={exibido.ultimaExecucao ? `${formatarInstante(exibido.ultimaExecucao.iniciadaEm)}: ${rotuloSituacaoExecucao[exibido.ultimaExecucao.situacao].toLowerCase()}` : undefined}
            />
          </dl>

          <section className={estilos.secao} aria-labelledby="titulo-config-agendamento">
            <h3 className={estilos.tituloSecao} id="titulo-config-agendamento">
              Configuração
            </h3>
            <dl className={estilos.pares}>
              <div>
                <dt>Conexão</dt>
                <dd>{exibido.conexaoId ? exibido.conexaoNome : `${exibido.conexaoNome} (excluída)`}</dd>
              </div>
              <div>
                <dt>Banco</dt>
                <dd className="codigo">{exibido.banco}</dd>
              </div>
              <div>
                <dt>Destino</dt>
                <dd>O computador de quem fizer o backup</dd>
              </div>
            </dl>
            <button type="button" className={locais.link} onClick={() => aoVerHistorico(exibido.banco)}>
              Ver os backups deste banco no histórico
              <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          </section>

          {proximas.length > 0 ? (
            <section className={estilos.secao} aria-labelledby="titulo-proximas-agendamento">
              <h3 className={estilos.tituloSecao} id="titulo-proximas-agendamento">
                Próximos lembretes
              </h3>
              <dl className={estilos.pares}>
                {proximas.map((instante) => (
                  <div key={instante.toISOString()}>
                    <dt>{iniciarComMaiuscula(formatarDiaSemana(instante.toISOString()))}</dt>
                    <dd className="numeros">{formatarInstante(instante.toISOString())}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {exibido.selecao.modo === 'ESCOLHIDOS' ? (
            <section className={estilos.secao} aria-labelledby="titulo-objetos-agendamento">
              <h3 className={estilos.tituloSecao} id="titulo-objetos-agendamento">
                Objetos incluídos
              </h3>
              <ul className={estilos.objetos}>
                {exibido.selecao.objetos.map((objeto) => (
                  <li key={objeto} className={`${estilos.objeto} codigo`}>
                    {objeto}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
