import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { ChevronRight, TriangleAlert } from 'lucide-react';
import { Dica, Esqueleto, Selo } from '@/componentes/ui';
import type { PlanoExecucaoDTO } from '@/modelos/planos';
import {
  alvoDoNo,
  ancestraisDaEtapa,
  condicaoPrincipal,
  estimativaErrada,
  linhasDevolvidas,
  linhasDoPlano,
  linhasEsperadas,
  linhasVisiveis,
  nomeDoNo,
  quantasEtapasAbaixo,
  trilhaAte,
} from '@/regras/planoExecucao';
import type { GuiaDaArvore, LinhaDoPlano, TrilhaDaEtapa } from '@/regras/planoExecucao';
import { formatarDuracaoMs, formatarNumero, formatarPercentual, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './ArvorePlano.module.css';

interface ArvorePlanoProps {
  plano: PlanoExecucaoDTO;
  selecionado?: number | null;
  aoSelecionar?: (id: number) => void;
  alteradas?: number[];
  rotulo?: string;
}

const classeDaGuia: Record<GuiaDaArvore, string | undefined> = {
  VAZIA: undefined,
  LINHA: estilos.guiaLinha,
  RAMO: estilos.guiaRamo,
  ULTIMO: estilos.guiaUltimo,
};

const SEM_RECOLHIDAS: ReadonlySet<number> = new Set();

type Movimento = { tipo: 'IR'; id: number } | { tipo: 'RECOLHER'; id: number } | { tipo: 'EXPANDIR'; id: number };

function movimentoDaTecla(
  linhas: LinhaDoPlano[],
  recolhidas: ReadonlySet<number>,
  atual: number,
  tecla: string,
): Movimento | null {
  const indice = linhas.findIndex((linha) => linha.no.id === atual);
  const linha = linhas[indice];
  if (!linha) return null;
  const ir = (id: number | null | undefined): Movimento | null => (id === null || id === undefined ? null : { tipo: 'IR', id });
  const temFilhos = linha.no.filhos.length > 0;
  const recolhida = recolhidas.has(linha.no.id);
  if (tecla === 'ArrowDown') return ir(linhas[indice + 1]?.no.id);
  if (tecla === 'ArrowUp') return ir(linhas[indice - 1]?.no.id);
  if (tecla === 'Home') return ir(linhas[0]?.no.id);
  if (tecla === 'End') return ir(linhas[linhas.length - 1]?.no.id);
  if (tecla === 'ArrowRight') {
    if (temFilhos && recolhida) return { tipo: 'EXPANDIR', id: linha.no.id };
    return ir(linha.no.filhos[0]?.id);
  }
  if (tecla === 'ArrowLeft') {
    if (temFilhos && !recolhida) return { tipo: 'RECOLHER', id: linha.no.id };
    return ir(linha.idDoPai);
  }
  return null;
}

export function idDaEtapa(id: number): string {
  return `etapa-do-plano-${id}`;
}

function semIds(conjunto: ReadonlySet<number>, ids: number[]): ReadonlySet<number> {
  const novo = new Set(conjunto);
  ids.forEach((id) => novo.delete(id));
  return novo;
}

export function ArvorePlano({
  plano,
  selecionado = null,
  aoSelecionar,
  alteradas = [],
  rotulo = 'Etapas do plano',
}: ArvorePlanoProps) {
  const arvore = useRef<HTMLDivElement>(null);
  const todas = useMemo(() => linhasDoPlano(plano), [plano]);
  const interativa = aoSelecionar !== undefined;
  const [recolhidas, setRecolhidas] = useState<ReadonlySet<number>>(SEM_RECOLHIDAS);
  const [revelada, setRevelada] = useState<number | null>(null);
  const [selecaoVista, setSelecaoVista] = useState(selecionado);

  if (selecionado !== selecaoVista) {
    setSelecaoVista(selecionado);
    if (selecionado !== null) {
      const ancestrais = ancestraisDaEtapa(todas, selecionado);
      if (ancestrais.some((id) => recolhidas.has(id))) setRecolhidas(semIds(recolhidas, ancestrais));
    }
  }

  const linhas = interativa ? linhasVisiveis(todas, recolhidas) : todas;
  const trilha = interativa && selecionado !== null ? trilhaAte(linhas, selecionado) : null;
  const posicaoDaRevelada = revelada === null ? -1 : linhas.findIndex((linha) => linha.no.id === revelada);

  const focar = (id: number) => arvore.current?.querySelector<HTMLElement>(`#${idDaEtapa(id)}`)?.focus();

  const recolher = (id: number) => {
    setRecolhidas((atuais) => new Set(atuais).add(id));
    if (selecionado !== null && selecionado !== id && ancestraisDaEtapa(todas, selecionado).includes(id)) {
      aoSelecionar?.(id);
      requestAnimationFrame(() => focar(id));
    }
  };

  const expandir = (id: number) => {
    setRecolhidas((atuais) => semIds(atuais, [id]));
    setRevelada(id);
  };

  const alternar = (id: number) => (recolhidas.has(id) ? expandir(id) : recolher(id));

  const andar = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (!aoSelecionar || selecionado === null) return;
    if (evento.key.startsWith('Arrow') || evento.key === 'Home' || evento.key === 'End') evento.preventDefault();
    const movimento = movimentoDaTecla(linhas, recolhidas, selecionado, evento.key);
    if (!movimento) return;
    if (movimento.tipo === 'RECOLHER') return recolher(movimento.id);
    if (movimento.tipo === 'EXPANDIR') return expandir(movimento.id);
    if (movimento.id === selecionado) return;
    aoSelecionar(movimento.id);
    focar(movimento.id);
  };

  return (
    <div className={estilos.conteiner}>
      <div className={estilos.cabecalho} aria-hidden="true">
        <span>Etapa</span>
        <span className={estilos.colunaTempo}>Tempo próprio</span>
        <span className={estilos.colunaLinhas}>Linhas</span>
      </div>

      <div
        ref={arvore}
        role={interativa ? 'tree' : 'list'}
        aria-label={rotulo}
        className={estilos.arvore}
        onKeyDown={interativa ? andar : undefined}
      >
        {linhas.map((linha, posicao) => (
          <Etapa
            key={linha.no.id}
            linha={linha}
            ordem={posicaoDaRevelada >= 0 && posicao > posicaoDaRevelada ? posicao - posicaoDaRevelada - 1 : posicao}
            selecionada={linha.no.id === selecionado}
            alterada={alteradas.includes(linha.no.id)}
            recolhida={recolhidas.has(linha.no.id)}
            trilha={trilha?.get(linha.no.id) ?? null}
            aoSelecionar={aoSelecionar}
            aoAlternar={interativa ? alternar : undefined}
          />
        ))}
      </div>
    </div>
  );
}

interface EtapaProps {
  linha: LinhaDoPlano;
  ordem: number;
  selecionada: boolean;
  alterada: boolean;
  recolhida: boolean;
  trilha: TrilhaDaEtapa | null;
  aoSelecionar?: (id: number) => void;
  aoAlternar?: (id: number) => void;
}

function Etapa({ linha, ordem, selecionada, alterada, recolhida, trilha, aoSelecionar, aoAlternar }: EtapaProps) {
  const { no, guias, profundidade, parteDoTempo, tempoProprioMs, abaixoDeLimite } = linha;
  const alvo = alvoDoNo(no);
  const condicao = condicaoPrincipal(no);
  const errada = estimativaErrada(no, abaixoDeLimite);
  const temFilhos = no.filhos.length > 0;
  const ocultas = recolhida ? quantasEtapasAbaixo(no) : 0;
  const ultimaGuia = guias.length - 1;

  const alternar = (evento: MouseEvent<HTMLSpanElement>) => {
    evento.stopPropagation();
    aoAlternar?.(no.id);
  };

  return (
    <div
      id={aoSelecionar ? idDaEtapa(no.id) : undefined}
      role={aoSelecionar ? 'treeitem' : 'listitem'}
      aria-level={profundidade + 1}
      aria-selected={aoSelecionar ? selecionada : undefined}
      aria-expanded={aoSelecionar && temFilhos ? !recolhida : undefined}
      tabIndex={aoSelecionar ? (selecionada ? 0 : -1) : undefined}
      className={juntarClasses(
        estilos.etapa,
        selecionada && estilos.selecionada,
        temFilhos && !recolhida && estilos.comFilhos,
        aoAlternar && temFilhos && estilos.alternavel,
        trilha?.desce && estilos.desceNaTrilha,
        !aoSelecionar && estilos.estatica,
        alterada && estilos.alterada,
      )}
      style={{ '--ordem': ordem } as CSSProperties}
      onClick={aoSelecionar ? () => aoSelecionar(no.id) : undefined}
    >
      <span className={estilos.guias} aria-hidden="true">
        {guias.map((guia, nivel) => (
          <span
            key={nivel}
            className={juntarClasses(
              estilos.guia,
              classeDaGuia[guia],
              trilha?.passagens.includes(nivel) && estilos.passagemDaTrilha,
              trilha?.chegada && nivel === ultimaGuia && estilos.chegadaDaTrilha,
            )}
          />
        ))}
      </span>

      <span className={estilos.conteudo}>
        {aoAlternar && temFilhos ? (
          <Dica conteudo={recolhida ? 'Mostrar as etapas abaixo' : 'Recolher as etapas abaixo'}>
            <span
              className={juntarClasses(estilos.alternador, recolhida && estilos.alternadorRecolhido)}
              aria-hidden="true"
              onClick={alternar}
            >
              <ChevronRight size={12} strokeWidth={2.5} />
            </span>
          </Dica>
        ) : null}
        <span className={estilos.textos}>
          <span className={estilos.cabecaDaEtapa}>
            <span className={estilos.nome}>{nomeDoNo(no)}</span>
            {alterada ? (
              <Selo tom="info" className={estilos.seloDaEtapa}>
                Mudou
              </Selo>
            ) : null}
            {ocultas > 0 ? (
              <span className={estilos.ocultas}>
                <span className="numeros">{formatarNumero(ocultas)}</span>{' '}
                {pluralizar(ocultas, 'etapa recolhida', 'etapas recolhidas')}
              </span>
            ) : null}
          </span>
          {alvo || no.lacos > 1 ? (
            <span className={estilos.alvo}>
              {alvo}
              {alvo && no.lacos > 1 ? ' · ' : null}
              {no.lacos > 1 ? (
                <>
                  executada <span className="numeros">{formatarNumero(no.lacos)}</span> vezes
                </>
              ) : null}
            </span>
          ) : null}
          {condicao ? (
            <span className={estilos.condicao}>
              <span className={estilos.rotuloCondicao}>{condicao.rotulo}</span> <code>{condicao.expressao}</code>
            </span>
          ) : null}
        </span>

        <span className={estilos.tempo}>
          <span className="visualmente-oculto">, tempo próprio </span>
          <span className={estilos.barra} aria-hidden="true">
            <span style={{ '--parte': `${Math.min(100, parteDoTempo)}%` } as CSSProperties} />
          </span>
          <span className={`${estilos.duracao} numeros`}>{formatarDuracaoMs(tempoProprioMs)}</span>
          <span className={`${estilos.parte} numeros`}>
            {formatarPercentual(parteDoTempo)}
            <span className="visualmente-oculto"> do tempo de execução</span>
          </span>
        </span>

        <span className={estilos.linhas}>
          <span className="visualmente-oculto">, </span>
          <span className={`${estilos.devolvidas} numeros`}>
            {formatarNumero(linhasDevolvidas(no))}
            <span className={estilos.unidade}> {pluralizar(linhasDevolvidas(no), 'linha', 'linhas')}</span>
          </span>
          <span className={juntarClasses(estilos.esperadas, errada && estilos.errada)}>
            {errada ? <TriangleAlert size={12} strokeWidth={2.25} aria-hidden="true" /> : null}
            esperava <span className="numeros">{formatarNumero(linhasEsperadas(no))}</span>
          </span>
        </span>
      </span>
    </div>
  );
}

const ETAPAS_EM_ESPERA = [0, 1, 2, 2, 1];

export function EsqueletoArvore({ etapas = ETAPAS_EM_ESPERA.length }: { etapas?: number }) {
  return (
    <div className={estilos.conteiner} aria-hidden="true">
      <div className={estilos.cabecalho}>
        <span>Etapa</span>
        <span className={estilos.colunaTempo}>Tempo próprio</span>
        <span className={estilos.colunaLinhas}>Linhas</span>
      </div>
      <div className={estilos.arvore}>
        {Array.from({ length: etapas }, (_, indice) => (
          <div key={indice} className={juntarClasses(estilos.etapa, estilos.etapaEmEspera)}>
            <span className={estilos.guias}>
              {Array.from({ length: ETAPAS_EM_ESPERA[indice % ETAPAS_EM_ESPERA.length] ?? 0 }, (_, nivel) => (
                <span key={nivel} className={estilos.guia} />
              ))}
            </span>
            <span className={estilos.conteudo}>
              <span className={estilos.textos}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={92 + ((indice * 37) % 60)} altura={14} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={70 + ((indice * 23) % 50)} altura={11} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${58 - ((indice * 13) % 24)}%`} altura={11} />
                </span>
              </span>
              <span className={estilos.tempo}>
                <Esqueleto altura={6} raio="var(--raio-pilula)" />
                <Esqueleto largura={48} altura={12} />
                <Esqueleto largura={38} altura={12} />
              </span>
              <span className={estilos.linhas}>
                <Esqueleto largura={64} altura={12} />
                <Esqueleto largura={78} altura={11} />
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
