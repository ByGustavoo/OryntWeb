import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Check, Copy, UserRound } from 'lucide-react';
import { TrechoSql } from '@/componentes/comum/TrechoSql';
import { SeloDesempenho } from '@/componentes/dashboard/SeloDesempenho';
import { Botao, Dica } from '@/componentes/ui';
import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { copiarTexto } from '@/utilitarios/areaTransferencia';
import { prefereMovimentoReduzido } from '@/utilitarios/graficos';
import { formatarDuracaoMs, formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './DetalheObjeto.module.css';

const DURACAO_CONFIRMACAO_MS = 2400;

interface ItemConsultaProps {
  consulta: ConsultaDetalhadaDTO;
  etapa?: ReactNode;
  children: ReactNode;
}

export function ItemConsulta({ consulta, etapa, children }: ItemConsultaProps) {
  return (
    <div className={estilos.consulta}>
      {etapa ? <p className={estilos.etapaConsulta}>{etapa}</p> : null}
      <TrechoSql sql={consulta.sql} className={estilos.sqlConsulta} />
      <div className={estilos.rodapeConsulta}>
        <p className={estilos.numerosConsulta}>
          <span className="numeros">{formatarNumero(consulta.quantidadeExecucoes)}</span>{' '}
          {pluralizar(consulta.quantidadeExecucoes, 'execução', 'execuções')} ·{' '}
          <span className="numeros">{formatarDuracaoMs(consulta.tempoMedioMs)}</span> em média
        </p>
        <SeloDesempenho desempenho={consulta.desempenho} />
        <div className={estilos.acoesConsulta}>{children}</div>
      </div>
    </div>
  );
}

export function DonoDoObjeto({ dono, aoAbrir }: { dono: string; aoAbrir: (dono: string) => void }) {
  return (
    <p className={estilos.dono}>
      <UserRound size={14} strokeWidth={2} aria-hidden="true" />
      <span>Dono</span>
      <button type="button" className={`${estilos.linkDono} codigo`} onClick={() => aoAbrir(dono)}>
        {dono}
        <span className="visualmente-oculto">. Abrir este papel em Papéis</span>
      </button>
    </p>
  );
}

export function Medida({ rotulo, valor, dica }: { rotulo: string; valor: string; dica?: string }) {
  return (
    <div className={estilos.medida}>
      <dt className={estilos.rotuloMedida}>{rotulo}</dt>
      <Dica conteudo={dica}>
        <dd className={`${estilos.valorMedida} numeros`}>
          {valor}
        </dd>
      </Dica>
    </div>
  );
}

interface SecaoCopiavelProps {
  id: string;
  titulo: string;
  texto: string;
  copiado: string;
  anuncio: string;
  tituloDoErro: string;
  descricaoDoErro: string;
  acao?: ReactNode;
  indice?: string;
  children?: ReactNode;
}

export function SecaoCopiavel({
  id,
  titulo,
  texto,
  copiado,
  anuncio,
  tituloDoErro,
  descricaoDoErro,
  acao,
  indice,
  children,
}: SecaoCopiavelProps) {
  const notificacoes = useNotificacoes();
  const [copiou, setCopiou] = useState(false);

  useEffect(() => {
    if (!copiou) return;
    const temporizador = window.setTimeout(() => setCopiou(false), DURACAO_CONFIRMACAO_MS);
    return () => window.clearTimeout(temporizador);
  }, [copiou]);

  const copiar = async () => {
    if (await copiarTexto(texto)) {
      setCopiou(true);
      return;
    }
    notificacoes.erro(tituloDoErro, descricaoDoErro);
  };

  return (
    <section className={estilos.secao} aria-labelledby={id} data-indice={indice}>
      <div className={estilos.cabecalhoSecao}>
        <h3 className={estilos.tituloSecao} id={id}>
          {titulo}
        </h3>
        <div className={estilos.acoesSecao}>
          {acao}
          <Botao variante="secundario" tamanho="sm" icone={copiou ? Check : Copy} onClick={() => void copiar()}>
            {copiou ? copiado : 'Copiar'}
          </Botao>
        </div>
        <span className="visualmente-oculto" role="status">
          {copiou ? anuncio : ''}
        </span>
      </div>
      <div className={estilos.sql}>
        <TrechoSql sql={texto} inteiro dica={false} />
      </div>
      {children}
    </section>
  );
}

interface EntradaDoIndice {
  chave: string;
  rotulo: string;
  secao: HTMLElement;
}

const MINIMO_DE_SECOES = 4;
const FOLGA_DA_ROLAGEM = 12;

function lerSecoes(raiz: HTMLElement): EntradaDoIndice[] {
  return [...raiz.querySelectorAll<HTMLElement>(':scope > [data-indice]')].map((secao, posicao) => ({
    chave: `${posicao}-${secao.dataset.indice ?? ''}`,
    rotulo: secao.dataset.indice ?? '',
    secao,
  }));
}

function mesmasSecoes(a: EntradaDoIndice[], b: EntradaDoIndice[]): boolean {
  return a.length === b.length && a.every((entrada, posicao) => entrada.secao === b[posicao]?.secao && entrada.rotulo === b[posicao]?.rotulo);
}

export function IndiceDoDetalhe({ raiz }: { raiz: RefObject<HTMLElement | null> }) {
  const navegacao = useRef<HTMLElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const [entradas, setEntradas] = useState<EntradaDoIndice[]>([]);
  const [corte, setCorte] = useState({ inicio: false, fim: false });
  const [ativa, setAtiva] = useState<string | null>(null);
  const [fixo, setFixo] = useState(false);

  useLayoutEffect(() => {
    const elemento = raiz.current;
    if (!elemento) return;
    const atualizar = () => setEntradas((atuais) => {
      const novas = lerSecoes(elemento);
      return mesmasSecoes(atuais, novas) ? atuais : novas;
    });
    atualizar();
    const observador = new MutationObserver(atualizar);
    observador.observe(elemento, { childList: true });
    return () => observador.disconnect();
  }, [raiz]);

  const visivel = entradas.length >= MINIMO_DE_SECOES;

  useEffect(() => {
    const conteiner = raiz.current?.parentElement;
    const nav = navegacao.current;
    if (!visivel || !conteiner || !nav) return;
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      const topo = conteiner.getBoundingClientRect().top;
      const linha = topo + nav.offsetHeight + FOLGA_DA_ROLAGEM * 2;
      const noFim = conteiner.scrollTop + conteiner.clientHeight >= conteiner.scrollHeight - 2;
      let atual: string | null = null;
      for (const entrada of entradas) {
        if (entrada.secao.getBoundingClientRect().top <= linha) atual = entrada.chave;
      }
      if (noFim && conteiner.scrollTop > 0) atual = entradas[entradas.length - 1]?.chave ?? atual;
      setAtiva(atual);
      setFixo(nav.getBoundingClientRect().top <= topo + 1 && conteiner.scrollTop > 0);
    };
    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };
    medir();
    conteiner.addEventListener('scroll', agendar, { passive: true });
    return () => {
      conteiner.removeEventListener('scroll', agendar);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [entradas, raiz, visivel]);

  useEffect(() => {
    const elemento = lista.current;
    if (!visivel || !elemento) return;
    const medirCorte = () =>
      setCorte((atual) => {
        const inicio = elemento.scrollLeft > 1;
        const fim = elemento.scrollLeft + elemento.clientWidth < elemento.scrollWidth - 1;
        return atual.inicio === inicio && atual.fim === fim ? atual : { inicio, fim };
      });
    medirCorte();
    const observador = new ResizeObserver(medirCorte);
    observador.observe(elemento);
    elemento.addEventListener('scroll', medirCorte, { passive: true });
    return () => {
      observador.disconnect();
      elemento.removeEventListener('scroll', medirCorte);
    };
  }, [entradas, visivel]);

  useEffect(() => {
    if (!ativa) return;
    const elemento = lista.current;
    const atual = elemento?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!elemento || !atual) return;
    const esquerda = atual.offsetLeft - elemento.offsetLeft;
    const direita = esquerda + atual.offsetWidth;
    if (esquerda < elemento.scrollLeft) elemento.scrollTo({ left: esquerda - 24 });
    else if (direita > elemento.scrollLeft + elemento.clientWidth) elemento.scrollTo({ left: direita - elemento.clientWidth + 24 });
  }, [ativa]);

  if (!visivel) return null;

  const irPara = (entrada: EntradaDoIndice) => {
    const conteiner = raiz.current?.parentElement;
    if (!conteiner) return;
    const alturaDaNavegacao = navegacao.current?.offsetHeight ?? 0;
    const destino =
      conteiner.scrollTop +
      entrada.secao.getBoundingClientRect().top -
      conteiner.getBoundingClientRect().top -
      alturaDaNavegacao -
      FOLGA_DA_ROLAGEM;
    conteiner.scrollTo({ top: destino, behavior: prefereMovimentoReduzido() ? 'auto' : 'smooth' });
    const titulo = entrada.secao.querySelector<HTMLElement>('h3, h4');
    if (titulo) {
      titulo.tabIndex = -1;
      titulo.focus({ preventScroll: true });
    }
  };

  return (
    <nav ref={navegacao} aria-label="Seções do detalhe" className={juntarClasses(estilos.indice, fixo && estilos.indiceFixo)}>
      <ul
        ref={lista}
        className={juntarClasses(
          estilos.listaDoIndice,
          corte.inicio && estilos.cortadaNoInicio,
          corte.fim && estilos.cortadaNoFim,
        )}
      >
        {entradas.map((entrada) => (
          <li key={entrada.chave}>
            <button
              type="button"
              className={estilos.entradaDoIndice}
              aria-current={entrada.chave === ativa ? 'true' : undefined}
              onClick={() => irPara(entrada)}
            >
              {entrada.rotulo}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
