import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, FlaskConical, ShieldCheck } from 'lucide-react';
import { Medida } from '@/componentes/objetos/DetalheObjeto';
import estilos from '@/componentes/objetos/DetalheObjeto.module.css';
import { BotaoIcone, Modal, Selo } from '@/componentes/ui';
import type { EventoAuditoriaDTO, TipoAlvoAuditoria } from '@/modelos/administracao';
import {
  descreverEvento,
  descreverMotivo,
  descreverPermissoesDoEvento,
  rotuloCategoriaAuditoria,
  rotuloModuloAuditoria,
} from '@/regras/auditoria';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { formatarInstante, formatarNumero, formatarTempoRelativo } from '@/utilitarios/formatacao';
import { SeloResultadoAuditoria } from './SeloResultadoAuditoria';
import locais from './DetalheEvento.module.css';

const rotuloDoAlvo: Record<TipoAlvoAuditoria, string> = {
  CONTA: 'Conta',
  CONEXAO: 'Conexão',
  TELA: 'Tela',
  ROTA: 'Operação da API',
  ALTERACAO: 'Alteração no banco',
};

interface DetalheEventoProps {
  evento: EventoAuditoriaDTO | null;
  simulada: boolean;
  posicao: number | null;
  total: number;
  temAnterior: boolean;
  temSeguinte: boolean;
  aoPercorrer: (sentido: SentidoDoPasso) => void;
  aoFechar: () => void;
  focoAoFechar: () => HTMLElement | null;
  aoVerDaConta: (contaId: string) => void;
  aoAbrirAlteracoes?: () => void;
}

export function DetalheEvento({
  evento,
  simulada,
  posicao,
  total,
  temAnterior,
  temSeguinte,
  aoPercorrer,
  aoFechar,
  focoAoFechar,
  aoVerDaConta,
  aoAbrirAlteracoes,
}: DetalheEventoProps) {
  const [exibido, setExibido] = useState(evento);
  if (evento && evento !== exibido) setExibido(evento);

  return (
    <Modal
      aberto={evento !== null}
      aoFechar={aoFechar}
      titulo="Detalhes do evento"
      descricao={exibido ? formatarInstante(exibido.ocorridoEm) : undefined}
      tamanho="lg"
      focoAoFechar={focoAoFechar}
      rodape={
        <div className={estilos.navegacao}>
          <div className={estilos.passos} role="group" aria-label="Percorrer os eventos">
            <BotaoIcone
              icone={ChevronUp}
              rotulo="Evento mais recente"
              variante="secundario"
              aria-disabled={temAnterior ? undefined : true}
              onClick={() => temAnterior && aoPercorrer(-1)}
            />
            <BotaoIcone
              icone={ChevronDown}
              rotulo="Evento mais antigo"
              variante="secundario"
              aria-disabled={temSeguinte ? undefined : true}
              onClick={() => temSeguinte && aoPercorrer(1)}
            />
          </div>
          <p className={estilos.posicao} role="status">
            {posicao !== null ? (
              <>
                <span className={estilos.palavraDaPosicao}>Evento </span>
                <span className="numeros">{formatarNumero(posicao)}</span> de <span className="numeros">{formatarNumero(total)}</span>
              </>
            ) : null}
          </p>
        </div>
      }
    >
      {exibido ? (
        <CorpoDoEvento
          key={exibido.id}
          evento={exibido}
          simulada={simulada}
          aoVerDaConta={aoVerDaConta}
          aoAbrirAlteracoes={aoAbrirAlteracoes}
        />
      ) : null}
    </Modal>
  );
}

interface CorpoDoEventoProps {
  evento: EventoAuditoriaDTO;
  simulada: boolean;
  aoVerDaConta: (contaId: string) => void;
  aoAbrirAlteracoes?: () => void;
}

function CorpoDoEvento({ evento, simulada, aoVerDaConta, aoAbrirAlteracoes }: CorpoDoEventoProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const motivo = descreverMotivo(evento);
  const permissoes = descreverPermissoesDoEvento(evento);
  const contaId = evento.conta?.id ?? null;

  useLayoutEffect(() => {
    raiz.current?.parentElement?.scrollTo({ top: 0 });
  }, []);

  return (
    <div ref={raiz} className={estilos.detalhe}>
      <header className={estilos.identidade}>
        <p className={estilos.nome}>{descreverEvento(evento)}</p>
        <div className={estilos.selos}>
          <SeloResultadoAuditoria resultado={evento.resultado} />
          {simulada ? (
            <Selo tom="aviso" icone={FlaskConical}>
              Dados demonstrativos
            </Selo>
          ) : null}
        </div>
      </header>

      <dl className={estilos.medidas}>
        <Medida rotulo="Quando" valor={formatarTempoRelativo(evento.ocorridoEm)} />
        <Medida rotulo="Data e hora" valor={formatarInstante(evento.ocorridoEm)} />
        <Medida rotulo="Módulo" valor={rotuloModuloAuditoria[evento.modulo]} />
        <Medida rotulo="Tipo de ação" valor={rotuloCategoriaAuditoria[evento.categoria]} />
      </dl>

      <section className={estilos.secao} aria-labelledby="titulo-responsavel-evento">
        <h3 className={estilos.tituloSecao} id="titulo-responsavel-evento">
          Responsável
        </h3>
        <dl className={estilos.pares}>
          <div>
            <dt>Conta</dt>
            <dd>
              {evento.conta ? (
                <>
                  {evento.conta.nome} <span className="codigo">({evento.conta.email})</span>
                </>
              ) : (
                'Nenhuma conta identificada'
              )}
            </dd>
          </div>
          {evento.emailInformado && (!evento.conta || evento.conta.email !== evento.emailInformado) ? (
            <div>
              <dt>E-mail digitado</dt>
              <dd className="codigo">{evento.emailInformado}</dd>
            </div>
          ) : null}
        </dl>
        {contaId ? (
          <button type="button" className={locais.link} onClick={() => aoVerDaConta(contaId)}>
            Ver só os eventos desta conta
            <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
      </section>

      {evento.alvo ? (
        <section className={estilos.secao} aria-labelledby="titulo-alvo-evento">
          <h3 className={estilos.tituloSecao} id="titulo-alvo-evento">
            Registro afetado
          </h3>
          <dl className={estilos.pares}>
            <div>
              <dt>{rotuloDoAlvo[evento.alvo.tipo]}</dt>
              <dd>{evento.alvo.rotulo}</dd>
            </div>
            <div>
              <dt>Identificador</dt>
              <dd className="codigo">{evento.alvo.id}</dd>
            </div>
          </dl>
          {evento.alvo.tipo === 'ALTERACAO' && aoAbrirAlteracoes ? (
            <button type="button" className={locais.link} onClick={aoAbrirAlteracoes}>
              Ver os comandos em Usuários e permissões › Alterações
              <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
        </section>
      ) : null}

      {evento.mudancas.length > 0 ? (
        <section className={estilos.secao} aria-labelledby="titulo-mudancas-evento">
          <h3 className={estilos.tituloSecao} id="titulo-mudancas-evento">
            O que mudou
          </h3>
          <dl className={estilos.pares}>
            {evento.mudancas.map((mudanca) => (
              <div key={mudanca.campo}>
                <dt>{mudanca.campo}</dt>
                <dd>
                  {mudanca.antes !== null ? (
                    <>
                      <span className={locais.antes}>{mudanca.antes}</span>
                      <ArrowRight size={14} strokeWidth={2} aria-label="para" className={locais.seta} />
                    </>
                  ) : null}
                  {mudanca.depois ?? 'removido'}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {permissoes.concedidas.length > 0 || permissoes.revogadas.length > 0 ? (
        <section className={estilos.secao} aria-labelledby="titulo-permissoes-evento">
          <h3 className={estilos.tituloSecao} id="titulo-permissoes-evento">
            Permissões
          </h3>
          <dl className={estilos.pares}>
            {permissoes.concedidas.length > 0 ? (
              <div>
                <dt>{evento.tipo === 'CONTA_CRIADA' ? 'Iniciais' : 'Concedidas'}</dt>
                <dd>{permissoes.concedidas.join(', ')}</dd>
              </div>
            ) : null}
            {permissoes.revogadas.length > 0 ? (
              <div>
                <dt>{evento.tipo === 'CONTA_EXCLUIDA' ? 'Que a conta tinha' : 'Revogadas'}</dt>
                <dd>{permissoes.revogadas.join(', ')}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className={estilos.secao} aria-labelledby="titulo-tecnico-evento">
        <h3 className={estilos.tituloSecao} id="titulo-tecnico-evento">
          Informações técnicas
        </h3>
        <dl className={estilos.pares}>
          {motivo ? (
            <div>
              <dt>Detalhe</dt>
              <dd>{motivo}</dd>
            </div>
          ) : null}
          {evento.requisicao ? (
            <div>
              <dt>Requisição</dt>
              <dd className="codigo">
                {evento.requisicao.metodo} {evento.requisicao.caminho}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Endereço IP</dt>
            <dd>{evento.origem.ip ?? (simulada ? 'Não disponível na simulação' : 'Não registrado')}</dd>
          </div>
          <div>
            <dt>Navegador</dt>
            <dd>{evento.origem.navegador ?? 'Não identificado'}</dd>
          </div>
          <div>
            <dt>Identificador do evento</dt>
            <dd className="codigo">{evento.id}</dd>
          </div>
        </dl>
        <p className={locais.protegido}>
          <ShieldCheck size={14} strokeWidth={2} aria-hidden="true" />
          Eventos de auditoria não podem ser editados nem apagados pela interface. Senhas, códigos e tokens nunca são registrados.
        </p>
      </section>
    </div>
  );
}
