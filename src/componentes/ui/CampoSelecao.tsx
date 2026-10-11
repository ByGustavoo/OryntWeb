import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { classesControle } from './classesControle';
import { EstruturaCampo } from './EstruturaCampo';
import type { PropriedadesMensagensCampo } from './EstruturaCampo';
import { Flutuante } from './Flutuante';
import estilosCampo from './Campo.module.css';
import estilos from './CampoSelecao.module.css';

export interface OpcaoSelecao<T extends string = string> {
  valor: T;
  rotulo: string;
  descricao?: string;
  icone?: LucideIcon;
  cor?: string;
  desabilitada?: boolean;
}

export interface CampoSelecaoProps<T extends string> extends PropriedadesMensagensCampo {
  opcoes: OpcaoSelecao<T>[];
  valor: T | null;
  aoMudar: (valor: T | null) => void;
  textoVazio?: string;
  permitirVazio?: boolean;
  desabilitado?: boolean;
  id?: string;
}

const TEMPO_BUSCA_POR_DIGITACAO_MS = 600;

export function CampoSelecao<T extends string>({
  rotulo,
  dica,
  erro,
  sucesso,
  obrigatorio,
  className,
  opcoes,
  valor,
  aoMudar,
  textoVazio = 'Selecionar',
  permitirVazio = false,
  desabilitado = false,
  id,
}: CampoSelecaoProps<T>) {
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const idLista = useId();
  const [aberto, setAberto] = useState(false);
  const [ativa, setAtiva] = useState(-1);
  const busca = useRef({ texto: '', temporizador: 0 });

  const itens: (OpcaoSelecao<T> | null)[] = permitirVazio ? [null, ...opcoes] : opcoes;
  const indiceSelecionado = itens.findIndex((item) => (item ? item.valor === valor : valor === null));
  const selecionada = opcoes.find((opcao) => opcao.valor === valor) ?? null;
  const habilitada = (indice: number) => !itens[indice]?.desabilitada;

  const fechar = useCallback((devolverFoco: boolean) => {
    setAberto(false);
    if (devolverFoco) gatilhoRef.current?.focus();
  }, []);

  const abrir = (indiceInicial?: number) => {
    setAtiva(indiceInicial ?? (indiceSelecionado >= 0 ? indiceSelecionado : itens.findIndex((_, indice) => habilitada(indice))));
    setAberto(true);
  };

  const escolher = (indice: number) => {
    if (!habilitada(indice)) return;
    const item = itens[indice];
    aoMudar(item ? item.valor : null);
    fechar(true);
  };

  useEffect(() => {
    if (!aberto || ativa < 0) return;
    listaRef.current?.querySelector(`[data-indice="${ativa}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [aberto, ativa]);

  const proximaHabilitada = (inicio: number, passo: number) => {
    for (let indice = inicio + passo; indice >= 0 && indice < itens.length; indice += passo) {
      if (habilitada(indice)) return indice;
    }
    return inicio;
  };

  const buscarPorDigitacao = (tecla: string) => {
    window.clearTimeout(busca.current.temporizador);
    busca.current.texto += tecla.toLowerCase();
    busca.current.temporizador = window.setTimeout(() => {
      busca.current.texto = '';
    }, TEMPO_BUSCA_POR_DIGITACAO_MS);
    const encontrado = itens.findIndex(
      (item, indice) => habilitada(indice) && (item?.rotulo ?? textoVazio).toLowerCase().startsWith(busca.current.texto),
    );
    return encontrado;
  };

  const aoTeclar = (evento: KeyboardEvent<HTMLButtonElement>) => {
    const tecla = evento.key;

    if (!aberto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(tecla)) {
        evento.preventDefault();
        abrir();
      } else if (tecla.length === 1 && /\S/.test(tecla)) {
        const encontrado = buscarPorDigitacao(tecla);
        if (encontrado >= 0) {
          const item = itens[encontrado];
          aoMudar(item ? item.valor : null);
        }
      }
      return;
    }

    const acoes: Record<string, () => void> = {
      ArrowDown: () => setAtiva((atual) => proximaHabilitada(atual, 1)),
      ArrowUp: () => setAtiva((atual) => proximaHabilitada(atual, -1)),
      Home: () => setAtiva(proximaHabilitada(-1, 1)),
      End: () => setAtiva(proximaHabilitada(itens.length, -1)),
      Enter: () => escolher(ativa),
      ' ': () => escolher(ativa),
      Escape: () => fechar(true),
      Tab: () => fechar(false),
    };
    const acao = acoes[tecla];
    if (acao) {
      if (tecla !== 'Tab') evento.preventDefault();
      if (tecla === 'Escape') evento.nativeEvent.stopPropagation();
      acao();
      return;
    }
    if (tecla.length === 1 && /\S/.test(tecla)) {
      const encontrado = buscarPorDigitacao(tecla);
      if (encontrado >= 0) setAtiva(encontrado);
    }
  };

  const idOpcao = (indice: number) => `${idLista}-opcao-${indice}`;
  const IconeSelecionado = selecionada?.icone;

  return (
    <EstruturaCampo
      id={id}
      rotulo={rotulo}
      dica={dica}
      erro={erro}
      sucesso={sucesso}
      obrigatorio={obrigatorio}
      className={className}
    >
      {({ idControle, idDescricao }) => (
        <>
          <button
            ref={gatilhoRef}
            id={idControle}
            type="button"
            role="combobox"
            className={classesControle(erro, sucesso, juntarClasses(estilosCampo.gatilho, aberto && estilosCampo.gatilhoAberto))}
            aria-haspopup="listbox"
            aria-expanded={aberto}
            aria-controls={idLista}
            aria-activedescendant={aberto && ativa >= 0 ? idOpcao(ativa) : undefined}
            aria-describedby={idDescricao}
            aria-invalid={erro ? true : undefined}
            aria-required={obrigatorio || undefined}
            disabled={desabilitado}
            onClick={() => (aberto ? fechar(false) : abrir())}
            onKeyDown={aoTeclar}
          >
            <span className={juntarClasses(estilosCampo.valorGatilho, !selecionada && estilosCampo.textoVazio)}>
              {IconeSelecionado ? (
                <IconeSelecionado
                  size={15}
                  strokeWidth={2.25}
                  aria-hidden="true"
                  style={{ color: selecionada?.cor, flexShrink: 0 }}
                />
              ) : null}
              <span className={estilosCampo.textoGatilho}>{selecionada?.rotulo ?? textoVazio}</span>
            </span>
            <ChevronDown className={estilosCampo.setaGatilho} size={16} strokeWidth={2} aria-hidden="true" />
          </button>

          <Flutuante aberto={aberto} ancora={gatilhoRef} aoFechar={fechar} papel="listbox" larguraMinimaDaAncora>
            <ul ref={listaRef} id={idLista} role="listbox" aria-label={rotulo} className={estilos.lista} tabIndex={-1}>
              {itens.map((item, indice) => {
                const Icone = item?.icone;
                const estaSelecionada = indice === indiceSelecionado;
                return (
                  <li
                    key={item?.valor ?? '__vazio'}
                    id={idOpcao(indice)}
                    data-indice={indice}
                    role="option"
                    aria-selected={estaSelecionada}
                    aria-disabled={item?.desabilitada || undefined}
                    className={juntarClasses(
                      estilos.opcao,
                      indice === ativa && estilos.ativa,
                      estaSelecionada && estilos.selecionada,
                      item?.desabilitada && estilos.desabilitada,
                      !item && estilos.vazia,
                    )}
                    onPointerMove={() => habilitada(indice) && setAtiva(indice)}
                    onPointerDown={(evento) => evento.preventDefault()}
                    onClick={() => escolher(indice)}
                  >
                    {Icone ? (
                      <Icone size={15} strokeWidth={2.25} aria-hidden="true" style={{ color: item?.cor }} className={estilos.icone} />
                    ) : null}
                    <span className={estilos.textos}>
                      <span>{item?.rotulo ?? textoVazio}</span>
                      {item?.descricao ? <span className={estilos.descricao}>{item.descricao}</span> : null}
                    </span>
                    <Check
                      size={15}
                      strokeWidth={2.5}
                      aria-hidden="true"
                      className={juntarClasses(estilos.marca, estaSelecionada && estilos.marcaVisivel)}
                    />
                  </li>
                );
              })}
            </ul>
          </Flutuante>
        </>
      )}
    </EstruturaCampo>
  );
}
