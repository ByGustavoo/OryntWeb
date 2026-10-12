import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { TransitionEvent } from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { BotaoIcone } from '@/componentes/ui';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { copiarTexto } from '@/utilitarios/areaTransferencia';
import { prefereMovimentoReduzido } from '@/utilitarios/graficos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { TrechoSql } from './TrechoSql';
import estilos from './ConsultaSql.module.css';

const DURACAO_CONFIRMACAO_MS = 2400;
const DURACAO_ABERTURA_MS = 240;
const CURVA_ABERTURA = 'cubic-bezier(0.22, 1, 0.36, 1)';

type FaseCopia = 'PARADA' | 'CONFIRMANDO' | 'LIBERADA';

function botaoSempreVisivel(): boolean {
  return !window.matchMedia('(hover: hover)').matches;
}

interface ConsultaSqlProps {
  sql: string;
  classeAcoes?: string;
}

export function ConsultaSql({ sql, classeAcoes }: ConsultaSqlProps) {
  const idTrecho = useId();
  const notificacoes = useNotificacoes();
  const moldura = useRef<HTMLDivElement>(null);
  const trecho = useRef<HTMLElement>(null);
  const alturaAnterior = useRef<number | null>(null);
  const [cortada, setCortada] = useState(false);
  const [expandida, setExpandida] = useState(false);
  const [faseCopia, setFaseCopia] = useState<FaseCopia>('PARADA');

  useLayoutEffect(() => {
    const elemento = trecho.current;
    if (!elemento || expandida) return;
    let ativo = true;
    const medir = () => {
      if (ativo) setCortada(elemento.scrollHeight > elemento.clientHeight + 1);
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    void document.fonts.ready.then(medir);
    return () => {
      ativo = false;
      observador.disconnect();
    };
  }, [sql, expandida]);

  useLayoutEffect(() => {
    const elemento = moldura.current;
    const alturaInicial = alturaAnterior.current;
    alturaAnterior.current = null;
    if (!elemento || alturaInicial === null || prefereMovimentoReduzido()) return;
    const alturaFinal = elemento.getBoundingClientRect().height;
    if (Math.abs(alturaFinal - alturaInicial) < 1) return;
    const animacao = elemento.animate(
      { height: [`${alturaInicial}px`, `${alturaFinal}px`] },
      { duration: DURACAO_ABERTURA_MS, easing: CURVA_ABERTURA },
    );
    return () => animacao.cancel();
  }, [expandida]);

  useEffect(() => {
    if (faseCopia !== 'CONFIRMANDO') return;
    const temporizador = window.setTimeout(
      () => setFaseCopia(botaoSempreVisivel() ? 'PARADA' : 'LIBERADA'),
      DURACAO_CONFIRMACAO_MS,
    );
    return () => window.clearTimeout(temporizador);
  }, [faseCopia]);

  const alternar = () => {
    alturaAnterior.current = moldura.current?.getBoundingClientRect().height ?? null;
    setExpandida((atual) => !atual);
  };

  const copiar = async () => {
    if (await copiarTexto(sql)) {
      setFaseCopia('CONFIRMANDO');
      return;
    }
    notificacoes.erro(
      'Não foi possível copiar a consulta',
      'O navegador bloqueou a área de transferência. Mostre a consulta inteira, selecione o texto e copie por lá.',
    );
  };

  const encerrarConfirmacao = (evento: TransitionEvent<HTMLSpanElement>) => {
    if (faseCopia !== 'LIBERADA' || evento.target !== evento.currentTarget || evento.propertyName !== 'opacity') return;
    if (window.getComputedStyle(evento.currentTarget).opacity === '0') setFaseCopia('PARADA');
  };

  const abrivel = cortada && !expandida;
  const confirmando = faseCopia === 'CONFIRMANDO';
  const comConfirmacao = faseCopia !== 'PARADA';

  return (
    <div className={estilos.consulta}>
      <div className={estilos.moldura} ref={moldura}>
        <TrechoSql
          id={idTrecho}
          ref={trecho}
          sql={sql}
          inteiro={expandida}
          dica={false}
          className={abrivel ? estilos.abrivel : undefined}
          onClick={abrivel ? alternar : undefined}
        />
      </div>
      <div className={juntarClasses(estilos.acoes, classeAcoes, 'nao-imprimir')}>
        {cortada || expandida ? (
          <BotaoIcone
            icone={ChevronDown}
            tamanho="sm"
            rotulo={expandida ? 'Recolher a consulta' : 'Mostrar a consulta inteira'}
            aria-expanded={expandida}
            aria-controls={idTrecho}
            className={estilos.alternar}
            onClick={alternar}
          />
        ) : null}
        <span
          className={juntarClasses(estilos.copia, comConfirmacao && estilos.confirmada, confirmando && estilos.fixada)}
          onTransitionEnd={encerrarConfirmacao}
        >
          <BotaoIcone
            icone={comConfirmacao ? Check : Copy}
            tamanho="sm"
            rotulo={confirmando ? 'Consulta copiada' : 'Copiar a consulta'}
            onClick={() => void copiar()}
          />
        </span>
      </div>
      <span className="visualmente-oculto" role="status">
        {confirmando ? 'Consulta copiada para a área de transferência.' : ''}
      </span>
    </div>
  );
}
