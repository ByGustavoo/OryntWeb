import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FocusEvent, ReactNode } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './Notificacao.module.css';

export type VarianteNotificacao = 'sucesso' | 'erro' | 'aviso' | 'informacao';

export interface AcaoNotificacao {
  rotulo: string;
  aoExecutar: () => void;
}

export interface MensagemNotificacao {
  id: string;
  titulo: string;
  descricao?: string;
  acao?: AcaoNotificacao;
  variante: VarianteNotificacao;
  duracao: number;
  versao: number;
  saindo: boolean;
}

const iconePorVariante: Record<VarianteNotificacao, LucideIcon> = {
  sucesso: Check,
  erro: X,
  aviso: AlertTriangle,
  informacao: Info,
};

const rotuloPorVariante: Record<VarianteNotificacao, string> = {
  sucesso: 'Sucesso',
  erro: 'Erro',
  aviso: 'Atenção',
  informacao: 'Informação',
};

interface ItemNotificacaoProps {
  notificacao: MensagemNotificacao;
  pausado: boolean;
  aoDispensar: (id: string) => void;
}

export function ItemNotificacao({ notificacao, pausado, aoDispensar }: ItemNotificacaoProps) {
  const { id, titulo, descricao, acao, variante, duracao, versao, saindo } = notificacao;
  const Icone = iconePorVariante[variante];
  const restante = useRef(duracao);
  const parado = pausado || saindo;

  useEffect(() => {
    restante.current = duracao;
  }, [versao, duracao]);

  useEffect(() => {
    if (parado) return undefined;
    const inicio = performance.now();
    const temporizador = window.setTimeout(() => aoDispensar(id), Math.max(restante.current, 0));
    return () => {
      window.clearTimeout(temporizador);
      restante.current -= performance.now() - inicio;
    };
  }, [parado, versao, id, aoDispensar]);

  return (
    <li className={juntarClasses(estilos.item, saindo && estilos.saindo)}>
      <div className={estilos.recorte}>
        <div
          className={juntarClasses(estilos.notificacao, estilos[variante])}
          role={variante === 'erro' ? 'alert' : 'status'}
          aria-atomic="true"
        >
          <span className={estilos.icone} aria-hidden="true">
            <Icone size={14} strokeWidth={2.75} />
          </span>
          <div className={estilos.textos}>
            <p className={estilos.titulo}>
              <span className="visualmente-oculto">{rotuloPorVariante[variante]}: </span>
              {titulo}
            </p>
            {descricao ? <p className={estilos.descricao}>{descricao}</p> : null}
          </div>
          {acao ? (
            <button
              type="button"
              className={estilos.acao}
              onClick={() => {
                acao.aoExecutar();
                aoDispensar(id);
              }}
              tabIndex={saindo ? -1 : undefined}
            >
              {acao.rotulo}
            </button>
          ) : null}
          <button
            type="button"
            className={estilos.fechar}
            onClick={() => aoDispensar(id)}
            aria-label="Fechar notificação"
            tabIndex={saindo ? -1 : undefined}
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <span
            key={versao}
            className={juntarClasses(estilos.progresso, parado && estilos.progressoPausado)}
            style={{ animationDuration: `${duracao}ms` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </li>
  );
}

interface AreaNotificacoesProps {
  children: ReactNode;
  quantidade: number;
  aoPausar: (pausado: boolean) => void;
}

export function AreaNotificacoes({ children, quantidade, aoPausar }: AreaNotificacoesProps) {
  const areaRef = useRef<HTMLElement>(null);
  const [comPonteiro, setComPonteiro] = useState(false);
  const [comFoco, setComFoco] = useState(false);
  const [abaOculta, setAbaOculta] = useState(() => document.visibilityState === 'hidden');

  useEffect(() => {
    const atualizar = () => setAbaOculta(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', atualizar);
    return () => document.removeEventListener('visibilitychange', atualizar);
  }, []);

  useEffect(() => {
    if (quantidade === 0) setComPonteiro(false);
    setComFoco(Boolean(areaRef.current?.contains(document.activeElement)));
  }, [quantidade]);

  const pausado = comPonteiro || comFoco || abaOculta;

  useEffect(() => {
    aoPausar(pausado);
  }, [pausado, aoPausar]);

  const aoPerderFoco = (evento: FocusEvent<HTMLElement>) => {
    if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setComFoco(false);
  };

  return createPortal(
    <section
      ref={areaRef}
      className={estilos.area}
      aria-label="Notificações"
      onPointerEnter={(evento) => evento.pointerType === 'mouse' && setComPonteiro(true)}
      onPointerLeave={(evento) => evento.pointerType === 'mouse' && setComPonteiro(false)}
      onFocus={() => setComFoco(true)}
      onBlur={aoPerderFoco}
    >
      <ol className={estilos.lista} aria-live="polite" aria-relevant="additions">
        {children}
      </ol>
    </section>,
    document.body,
  );
}
