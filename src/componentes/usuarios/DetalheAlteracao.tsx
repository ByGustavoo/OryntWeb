import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, FlaskConical, OctagonAlert, Undo2 } from 'lucide-react';
import { SecaoCopiavel } from '@/componentes/objetos/DetalheObjeto';
import estilos from '@/componentes/objetos/DetalheObjeto.module.css';
import { BotaoIcone, Modal, Nota, Selo } from '@/componentes/ui';
import type { AlteracaoDTO } from '@/modelos/alteracoes';
import type { Capacidade } from '@/regras/capacidadeAlteracoes';
import { descreverOperacao, rotuloOrigemAlteracao, tituloDaAlteracao } from '@/regras/descricaoAlteracoes';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { estadoDaAlteracao, podeDesfazer } from '@/regras/historicoAlteracoes';
import { TEXTO_DA_SENHA_OCULTA } from '@/regras/sqlAlteracoes';
import { formatarInstante, formatarNumero } from '@/utilitarios/formatacao';
import { BotaoDeAlteracao } from './BotaoDeAlteracao';
import { SeloEstadoAlteracao } from './SeloEstadoAlteracao';
import locais from './DetalheAlteracao.module.css';

interface DetalheAlteracaoProps {
  alteracao: AlteracaoDTO | null;
  todas: AlteracaoDTO[];
  simulada: boolean;
  posicao: number | null;
  total: number;
  capacidadeDeDesfazer: (alteracao: AlteracaoDTO) => Capacidade | null;
  aoDesfazer: (alteracao: AlteracaoDTO) => void;
  aoAbrirAlteracao: (id: string) => void;
  aoPercorrer: (sentido: SentidoDoPasso) => void;
  aoFechar: () => void;
  focoAoFechar: () => HTMLElement | null;
}

export function DetalheAlteracao({
  alteracao,
  todas,
  simulada,
  posicao,
  total,
  capacidadeDeDesfazer,
  aoDesfazer,
  aoAbrirAlteracao,
  aoPercorrer,
  aoFechar,
  focoAoFechar,
}: DetalheAlteracaoProps) {
  const [exibida, setExibida] = useState(alteracao);
  if (alteracao && alteracao !== exibida) setExibida(alteracao);
  const temAnterior = posicao !== null && posicao > 1;
  const temSeguinte = posicao !== null && posicao < total;

  return (
    <Modal
      aberto={alteracao !== null}
      aoFechar={aoFechar}
      titulo="Detalhes da alteração"
      descricao={exibida ? `Feita em ${formatarInstante(exibida.feitaEm)}` : undefined}
      tamanho="lg"
      focoAoFechar={focoAoFechar}
      rodape={
        <div className={estilos.navegacao}>
          <div className={estilos.passos} role="group" aria-label="Percorrer as alterações da lista">
            <BotaoIcone
              icone={ChevronUp}
              rotulo="Alteração anterior"
              variante="secundario"
              aria-disabled={temAnterior ? undefined : true}
              onClick={() => temAnterior && aoPercorrer(-1)}
            />
            <BotaoIcone
              icone={ChevronDown}
              rotulo="Próxima alteração"
              variante="secundario"
              aria-disabled={temSeguinte ? undefined : true}
              onClick={() => temSeguinte && aoPercorrer(1)}
            />
          </div>
          <p className={estilos.posicao} role="status">
            {posicao !== null ? (
              <>
                <span className={estilos.palavraDaPosicao}>Alteração </span>
                <span className="numeros">{formatarNumero(posicao)}</span> de <span className="numeros">{formatarNumero(total)}</span>
              </>
            ) : (
              'Fora dos filtros da lista'
            )}
          </p>
          {exibida && podeDesfazer(exibida) ? (
            <BotaoDeAlteracao
              variante="secundario"
              icone={Undo2}
              className={locais.desfazer}
              capacidade={capacidadeDeDesfazer(exibida)}
              onClick={() => aoDesfazer(exibida)}
            >
              Desfazer
            </BotaoDeAlteracao>
          ) : null}
        </div>
      }
    >
      {exibida ? (
        <CorpoDetalhe key={exibida.id} alteracao={exibida} todas={todas} simulada={simulada} aoAbrirAlteracao={aoAbrirAlteracao} />
      ) : null}
    </Modal>
  );
}

interface CorpoDetalheProps {
  alteracao: AlteracaoDTO;
  todas: AlteracaoDTO[];
  simulada: boolean;
  aoAbrirAlteracao: (id: string) => void;
}

function CorpoDetalhe({ alteracao, todas, simulada, aoAbrirAlteracao }: CorpoDetalheProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const desfeitaPor = alteracao.desfeitaPor ? todas.find((item) => item.id === alteracao.desfeitaPor) : undefined;
  const desfaz = alteracao.desfaz ? todas.find((item) => item.id === alteracao.desfaz) : undefined;
  const estado = estadoDaAlteracao(alteracao);
  const comSenha = alteracao.comandos.some((comando) => comando.includes(TEXTO_DA_SENHA_OCULTA));
  const notaDosComandos = [
    alteracao.inversas === null && estado === 'APLICADA'
      ? 'Esta alteração não tem desfazer: uma exclusão ou uma troca de senha não voltam pelo comando inverso.'
      : '',
    comSenha ? 'A senha definida aparece como marcador: o histórico nunca guarda o verificador.' : '',
  ]
    .filter(Boolean)
    .join(' ');

  useLayoutEffect(() => {
    raiz.current?.parentElement?.scrollTo({ top: 0 });
  }, []);

  return (
    <div ref={raiz} className={estilos.detalhe}>
      <header className={estilos.identidade}>
        <p className={estilos.nome}>{tituloDaAlteracao(alteracao.operacoes, 'PASSADO')}</p>
        <div className={estilos.selos}>
          <SeloEstadoAlteracao estado={estado} />
          <Selo tom="neutro">{rotuloOrigemAlteracao[alteracao.origem]}</Selo>
          {simulada ? (
            <Selo tom="aviso" icone={FlaskConical}>
              Dados demonstrativos
            </Selo>
          ) : null}
        </div>
      </header>

      {alteracao.falha ? (
        <Nota tom="erro" icone={OctagonAlert} titulo="O banco recusou.">
          Nada foi mudado: os comandos rodam numa transação só. A resposta foi <span className="codigo">{alteracao.falha.mensagem}</span>{' '}
          (SQLSTATE <span className="codigo">{alteracao.falha.codigo}</span>).
        </Nota>
      ) : null}

      {desfeitaPor || desfaz ? (
        <div className={locais.vinculos}>
          {desfeitaPor ? (
            <button type="button" className={locais.vinculo} onClick={() => aoAbrirAlteracao(desfeitaPor.id)}>
              <Undo2 size={16} strokeWidth={2} aria-hidden="true" />
              <span>Desfeita em {formatarInstante(desfeitaPor.feitaEm)}, pelos comandos inversos.</span>
              <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className={locais.seta} />
            </button>
          ) : null}
          {desfaz ? (
            <button type="button" className={locais.vinculo} onClick={() => aoAbrirAlteracao(desfaz.id)}>
              <Undo2 size={16} strokeWidth={2} aria-hidden="true" />
              <span>Desfaz {tituloDaAlteracao(desfaz.operacoes, 'PASSADO').replace(/^./, (letra) => letra.toLowerCase())}, de {formatarInstante(desfaz.feitaEm)}.</span>
              <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className={locais.seta} />
            </button>
          ) : null}
        </div>
      ) : null}

      <section className={estilos.secao} aria-labelledby="titulo-autoria-alteracao">
        <h3 className={estilos.tituloSecao} id="titulo-autoria-alteracao">
          Quem e onde
        </h3>
        <dl className={estilos.pares}>
          <div>
            <dt>Conta do Orynt</dt>
            <dd className={alteracao.conta ? 'codigo' : undefined}>{alteracao.conta || 'Não informada'}</dd>
          </div>
          <div>
            <dt>Papel no banco</dt>
            <dd className="codigo">{alteracao.papelDaConexao}</dd>
          </div>
          <div>
            <dt>Banco</dt>
            <dd className="codigo">{alteracao.banco}</dd>
          </div>
          <div>
            <dt>Comandos</dt>
            <dd className="numeros">{formatarNumero(alteracao.comandos.length)}</dd>
          </div>
        </dl>
      </section>

      {alteracao.operacoes.length > 1 ? (
        <section className={estilos.secao} aria-labelledby="titulo-passos-alteracao">
          <h3 className={estilos.tituloSecao} id="titulo-passos-alteracao">
            O que foi pedido
          </h3>
          <ol className={locais.passos}>
            {alteracao.operacoes.map((operacao, indice) => (
              <li key={indice}>{descreverOperacao(operacao, 'PASSADO')}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <SecaoCopiavel
        id="titulo-comandos-historico"
        titulo={alteracao.comandos.length === 1 ? 'Comando' : 'Comandos'}
        texto={alteracao.comandos.join('\n')}
        copiado="Copiado"
        anuncio="Comandos copiados para a área de transferência."
        tituloDoErro="Não foi possível copiar os comandos"
        descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto dos comandos e copie por lá."
      >
        {notaDosComandos ? <p className={estilos.leitura}>{notaDosComandos}</p> : null}
      </SecaoCopiavel>
    </div>
  );
}
