import { useState } from 'react';
import { Ban, ChevronDown, ChevronUp, Download, OctagonX, Trash2 } from 'lucide-react';
import { Medida } from '@/componentes/objetos/DetalheObjeto';
import estilos from '@/componentes/objetos/DetalheObjeto.module.css';
import { Botao, BotaoIcone, Modal, Nota } from '@/componentes/ui';
import type { ExecucaoBackupDTO } from '@/modelos/backup';
import { useAcompanhamentoBackup } from '@/provedores/ProvedorBackupLocal';
import { descreverEntrega } from '@/regras/acompanhamentoBackup';
import { rotuloTipoBackup } from '@/regras/backup';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { descreverSelecao } from '@/regras/selecaoObjetosBackup';
import { formatarDuracaoExtensa, formatarInstante, formatarNumero, formatarTamanho, pluralizar } from '@/utilitarios/formatacao';
import { SeloSituacaoExecucao } from './SelosBackup';

interface DetalheExecucaoProps {
  execucao: ExecucaoBackupDTO | null;
  posicao: number | null;
  total: number;
  aoPercorrer: (sentido: SentidoDoPasso) => void;
  aoFechar: () => void;
  aoExcluir: (execucao: ExecucaoBackupDTO) => void;
  focoAoFechar: () => HTMLElement | null;
}

export function DetalheExecucao({ execucao, posicao, total, aoPercorrer, aoFechar, aoExcluir, focoAoFechar }: DetalheExecucaoProps) {
  const [exibida, setExibida] = useState(execucao);
  if (execucao && execucao !== exibida) setExibida(execucao);
  const temAnterior = posicao !== null && posicao > 1;
  const temSeguinte = posicao !== null && posicao < total;
  const { acompanhadas, baixar } = useAcompanhamentoBackup();
  const nestaAba = exibida ? acompanhadas.find((item) => item.execucao.id === exibida.id && !item.daOutraAba) : undefined;

  return (
    <Modal
      aberto={execucao !== null}
      aoFechar={aoFechar}
      titulo="Detalhes do backup"
      descricao={exibida ? formatarInstante(exibida.iniciadaEm) : undefined}
      tamanho="lg"
      focoAoFechar={focoAoFechar}
      rodape={
        <div className={estilos.navegacao}>
          <div className={estilos.passos} role="group" aria-label="Percorrer os backups">
            <BotaoIcone
              icone={ChevronUp}
              rotulo="Backup anterior da lista"
              variante="secundario"
              aria-disabled={temAnterior ? undefined : true}
              onClick={() => temAnterior && aoPercorrer(-1)}
            />
            <BotaoIcone
              icone={ChevronDown}
              rotulo="Próximo backup da lista"
              variante="secundario"
              aria-disabled={temSeguinte ? undefined : true}
              onClick={() => temSeguinte && aoPercorrer(1)}
            />
          </div>
          <p className={estilos.posicao} role="status">
            {posicao !== null ? (
              <>
                <span className="numeros">{formatarNumero(posicao)}</span> de <span className="numeros">{formatarNumero(total)}</span>
              </>
            ) : null}
          </p>
          {nestaAba?.entrega === 'PARA_BAIXAR' ? (
            <Botao icone={Download} onClick={() => baixar(nestaAba.execucao.id)}>
              Baixar backup
            </Botao>
          ) : null}
          {exibida ? (
            <Botao
              variante="secundario"
              icone={Trash2}
              aria-disabled={exibida.situacao === 'EM_ANDAMENTO' ? true : undefined}
              onClick={() => {
                if (exibida.situacao !== 'EM_ANDAMENTO') aoExcluir(exibida);
              }}
            >
              Excluir
            </Botao>
          ) : null}
        </div>
      }
    >
      {exibida ? (
        <div className={estilos.detalhe}>
          <header className={estilos.identidade}>
            <p className={estilos.nome}>{exibida.nome}</p>
            <div className={estilos.selos}>
              <SeloSituacaoExecucao situacao={exibida.situacao} progresso={exibida.progresso} />
            </div>
          </header>

          {exibida.situacao === 'FALHOU' ? (
            <Nota tom="erro" icone={OctagonX} titulo="Nenhum arquivo foi salvo.">
              {exibida.motivoDaFalha ?? 'O backup foi interrompido antes de terminar.'}
            </Nota>
          ) : null}
          {exibida.situacao === 'CANCELADO' ? (
            <Nota tom="neutro" icone={Ban} titulo="Cancelado.">
              A transferência parou e o arquivo parcial foi descartado.
            </Nota>
          ) : null}

          <dl className={estilos.medidas}>
            <Medida rotulo="Tipo" valor={rotuloTipoBackup[exibida.tipo]} />
            <Medida rotulo="Duração" valor={exibida.duracaoMs !== null ? formatarDuracaoExtensa(exibida.duracaoMs) : '—'} />
            <Medida rotulo="Tamanho" valor={exibida.tamanhoBytes !== null ? formatarTamanho(exibida.tamanhoBytes) : '—'} />
            <Medida rotulo="Objetos" valor={formatarNumero(exibida.objetosIncluidos)} />
          </dl>

          <section className={estilos.secao} aria-labelledby="titulo-origem-backup">
            <h3 className={estilos.tituloSecao} id="titulo-origem-backup">
              Origem
            </h3>
            <dl className={estilos.pares}>
              <div>
                <dt>Conexão</dt>
                <dd>{exibida.conexaoId ? exibida.conexaoNome : `${exibida.conexaoNome} (excluída)`}</dd>
              </div>
              <div>
                <dt>Banco</dt>
                <dd className="codigo">{exibida.banco}</dd>
              </div>
              <div>
                <dt>O que entrou</dt>
                <dd>
                  {exibida.selecao.modo === 'BANCO_INTEIRO'
                    ? `${descreverSelecao(exibida.selecao)} (${formatarNumero(exibida.objetosIncluidos)} ${pluralizar(exibida.objetosIncluidos, 'objeto', 'objetos')})`
                    : descreverSelecao(exibida.selecao)}
                </dd>
              </div>
              <div>
                <dt>Como começou</dt>
                <dd>{exibida.origem === 'AGENDADA' ? 'Pelo lembrete do agendamento' : 'Feito na hora'}</dd>
              </div>
            </dl>
          </section>

          {exibida.selecao.modo === 'ESCOLHIDOS' ? (
            <section className={estilos.secao} aria-labelledby="titulo-objetos-backup">
              <h3 className={estilos.tituloSecao} id="titulo-objetos-backup">
                Objetos incluídos
              </h3>
              <ul className={estilos.objetos}>
                {exibida.selecao.objetos.map((objeto) => (
                  <li key={objeto} className={`${estilos.objeto} codigo`}>
                    {objeto}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className={estilos.secao} aria-labelledby="titulo-destino-backup">
            <h3 className={estilos.tituloSecao} id="titulo-destino-backup">
              Destino
            </h3>
            <dl className={estilos.pares}>
              <div>
                <dt>Onde fica</dt>
                <dd>{nestaAba ? descreverEntrega(nestaAba.entrega, nestaAba.local) : 'No computador de quem fez o backup. O Orynt não guarda uma cópia.'}</dd>
              </div>
              {exibida.arquivo ? (
                <div>
                  <dt>Arquivo</dt>
                  <dd className="codigo">{exibida.arquivo}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
