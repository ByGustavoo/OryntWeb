import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import { ehCancelamento } from '@/api/ErroApi';
import { TrechoSql } from '@/componentes/comum/TrechoSql';
import { SeloDesempenho } from '@/componentes/dashboard/SeloDesempenho';
import { CampoBusca, Flutuante, IndicadorGiratorio } from '@/componentes/ui';
import type { ConsultaDetalhadaDTO, PaginaConsultasDTO } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import { TAMANHO_MAXIMO_BUSCA, limparBusca, termosDaBusca } from '@/regras/buscaConsultas';
import { servicoConsultas } from '@/servicos';
import { formatarDuracaoMs, formatarNumero, formatarPercentual, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './SeletorConsulta.module.css';

interface SeletorConsultaProps {
  periodo: PeriodoDashboard;
  idAtual: string | null;
  aoEscolher: (consulta: ConsultaDetalhadaDTO) => void;
  className?: string;
}

interface Sugestoes {
  chave: string;
  busca: string;
  pagina: PaginaConsultasDTO;
}

const ESPERA_DA_BUSCA_MS = 250;

function resumir({ pagina, busca }: Sugestoes): string {
  if (pagina.totalDoPeriodo === 0) return 'Nenhuma consulta registrada no período.';
  if (pagina.totalItens === 0) return `Nenhuma consulta do período contém “${busca}”.`;

  const mostradas = pagina.itens.length;
  if (busca !== '') {
    const encontradas = `${formatarNumero(pagina.totalItens)} ${pluralizar(pagina.totalItens, 'consulta encontrada', 'consultas encontradas')}`;
    return mostradas < pagina.totalItens ? `${encontradas}. Refine a busca para ver as demais.` : `${encontradas}.`;
  }
  return mostradas < pagina.totalItens
    ? `As ${formatarNumero(mostradas)} que mais pesam, de ${formatarNumero(pagina.totalItens)} consultas. Digite para buscar as demais.`
    : `${formatarNumero(pagina.totalItens)} ${pluralizar(pagina.totalItens, 'consulta', 'consultas')} no período.`;
}

export function SeletorConsulta({ periodo, idAtual, aoEscolher, className }: SeletorConsultaProps) {
  const idLista = useId();
  const ancora = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const jaBuscou = useRef(false);
  const [texto, setTexto] = useState('');
  const [aberto, setAberto] = useState(false);
  const [abertura, setAbertura] = useState(0);
  const [ativa, setAtiva] = useState(0);
  const [sugestoes, setSugestoes] = useState<Sugestoes | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const busca = limparBusca(texto);
  const chave = `${abertura}|${periodo}|${busca}`;
  const atualizadas = sugestoes?.chave === chave;
  const itens = sugestoes?.pagina.itens ?? [];
  const termos = useMemo(() => termosDaBusca(sugestoes?.busca ?? ''), [sugestoes?.busca]);

  useEffect(() => {
    if (!aberto) return;
    const controlador = new AbortController();
    setBuscando(true);
    setFalhou(false);

    const temporizador = window.setTimeout(
      () => {
        jaBuscou.current = true;
        servicoConsultas
          .sugerir(periodo, busca, controlador.signal)
          .then((pagina) => {
            if (controlador.signal.aborted) return;
            setSugestoes({ chave, busca, pagina });
            setAtiva(0);
            setBuscando(false);
          })
          .catch((erro: unknown) => {
            if (controlador.signal.aborted || ehCancelamento(erro)) return;
            setFalhou(true);
            setBuscando(false);
          });
      },
      jaBuscou.current ? ESPERA_DA_BUSCA_MS : 0,
    );

    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [aberto, chave, periodo, busca]);

  useEffect(() => {
    if (!aberto) return;
    lista.current?.querySelector(`[data-indice="${ativa}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [aberto, ativa]);

  const abrir = () => {
    if (aberto) return;
    jaBuscou.current = false;
    setAbertura((atual) => atual + 1);
    setAberto(true);
  };

  const fechar = () => setAberto(false);

  const escolher = (consulta: ConsultaDetalhadaDTO) => {
    setTexto('');
    fechar();
    aoEscolher(consulta);
  };

  const digitar = (valor: string) => {
    setTexto(valor);
    abrir();
  };

  const aoTeclar = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (!aberto) {
        abrir();
        return;
      }
      if (itens.length === 0) return;
      const passo = evento.key === 'ArrowDown' ? 1 : -1;
      setAtiva((atual) => (atual + passo + itens.length) % itens.length);
      return;
    }
    if (!aberto) return;

    if (evento.key === 'Enter') {
      evento.preventDefault();
      const consulta = itens[ativa];
      if (consulta && atualizadas) escolher(consulta);
    } else if (evento.key === 'Escape') {
      evento.preventDefault();
      evento.nativeEvent.stopPropagation();
      fechar();
    } else if (evento.key === 'Tab') {
      fechar();
    }
  };

  const idOpcao = (indice: number) => `${idLista}-opcao-${indice}`;
  const temOpcaoAtiva = aberto && itens[ativa] !== undefined;

  return (
    <div ref={ancora} className={juntarClasses(estilos.seletor, className)}>
      <CampoBusca
        id="seletor-consulta"
        rotulo="Buscar outra consulta pelo texto do SQL"
        placeholder="Buscar outra consulta"
        valor={texto}
        aoMudar={digitar}
        maxLength={TAMANHO_MAXIMO_BUSCA}
        atalho="/"
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-activedescendant={temOpcaoAtiva ? idOpcao(ativa) : undefined}
        onClick={abrir}
        onKeyDown={aoTeclar}
        onBlur={fechar}
      />

      <Flutuante aberto={aberto} ancora={ancora} aoFechar={fechar} papel="listbox" larguraMinimaDaAncora className={estilos.painel}>
        <div onPointerDown={(evento) => evento.preventDefault()}>
          <ul
            ref={lista}
            id={idLista}
            role="listbox"
            aria-label="Consultas do período"
            aria-busy={buscando}
            className={juntarClasses(estilos.lista, buscando && sugestoes !== null && estilos.desatualizada)}
          >
            {itens.map((consulta, indice) => {
              const atual = consulta.id === idAtual;
              return (
                <li
                  key={consulta.id}
                  id={idOpcao(indice)}
                  data-indice={indice}
                  role="option"
                  aria-selected={atual}
                  className={juntarClasses(estilos.opcao, indice === ativa && estilos.ativa)}
                  onPointerMove={() => setAtiva(indice)}
                  onClick={() => escolher(consulta)}
                >
                  <span className={estilos.textos}>
                    <TrechoSql sql={consulta.sql} termos={termos} dica={false} className={estilos.sql} />
                    <span className={estilos.medidas}>
                      <span className="numeros">{formatarDuracaoMs(consulta.tempoMedioMs)}</span> de tempo médio ·{' '}
                      <span className="numeros">{formatarPercentual(consulta.percentualTempoTotal)}</span> do tempo do banco
                    </span>
                  </span>
                  <span className={estilos.lateral}>
                    <SeloDesempenho desempenho={consulta.desempenho} />
                    {atual ? (
                      <span className={estilos.atual}>
                        <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                        Em análise
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className={estilos.rodape} role="status">
            {falhou ? (
              'Não foi possível buscar as consultas. Tente de novo em instantes.'
            ) : sugestoes === null || (buscando && itens.length === 0) ? (
              <>
                <IndicadorGiratorio tamanho={14} />
                Buscando as consultas…
              </>
            ) : (
              resumir(sugestoes)
            )}
          </p>
        </div>
      </Flutuante>
    </div>
  );
}
