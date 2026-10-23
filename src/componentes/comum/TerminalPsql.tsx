import { useEffect, useMemo, useState } from 'react';
import { useConsultaMidia } from '@/ganchos/useConsultaMidia';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './TerminalPsql.module.css';

export type TipoDoTrecho = 'palavra' | 'literal' | 'forte' | 'apagado' | 'aviso' | 'erro';

export interface TrechoDoTerminal {
  texto: string;
  tipo?: TipoDoTrecho;
}

export type LinhaDoTerminal =
  | { tipo: 'COMANDO'; prompt: string; trechos: TrechoDoTerminal[] }
  | { tipo: 'SAIDA'; trechos: TrechoDoTerminal[]; espera?: number; recuo?: string; espacoAntes?: boolean };

interface TerminalPsqlProps {
  linhas: LinhaDoTerminal[];
  codigo: string;
  tom?: 'destaque' | 'erro';
  titulo?: string;
  prompt?: string;
}

const CONSULTA_SEM_MOVIMENTO = '(prefers-reduced-motion: reduce)';
const ESPERA_ANTES_DE_DIGITAR_MS = 650;
const ESPERA_DA_QUEBRA_DE_LINHA_MS = 280;
const ESPERA_DO_NOVO_PROMPT_MS = 360;
const TEMPO_TOTAL_DE_DIGITACAO_MS = 1900;

function tamanhoDe(trechos: TrechoDoTerminal[]): number {
  return trechos.reduce((soma, trecho) => soma + trecho.texto.length, 0);
}

function ruido(semente: number): number {
  const valor = Math.sin(semente * 127.1 + 311.7) * 43758.5453;
  return valor - Math.floor(valor);
}

interface Roteiro {
  esperas: number[];
  inicioDaLinha: number[];
  fimDaLinha: number[];
}

function montarRoteiro(linhas: LinhaDoTerminal[]): Roteiro {
  const caracteres = linhas.reduce((soma, linha) => soma + (linha.tipo === 'COMANDO' ? tamanhoDe(linha.trechos) : 0), 0);
  const porCaractere = Math.min(42, Math.max(16, TEMPO_TOTAL_DE_DIGITACAO_MS / Math.max(1, caracteres)));
  const esperas: number[] = [];
  const inicioDaLinha: number[] = [];
  const fimDaLinha: number[] = [];
  let comandosAntes = 0;

  linhas.forEach((linha, indiceDaLinha) => {
    inicioDaLinha.push(esperas.length);
    if (linha.tipo === 'COMANDO') {
      const primeira = comandosAntes === 0 ? ESPERA_ANTES_DE_DIGITAR_MS : ESPERA_DA_QUEBRA_DE_LINHA_MS;
      for (let indice = 0; indice < tamanhoDe(linha.trechos); indice += 1) {
        esperas.push(indice === 0 ? primeira : Math.round(porCaractere * (0.55 + ruido(indiceDaLinha * 97 + indice) * 0.9)));
      }
      comandosAntes += 1;
    } else {
      esperas.push(linha.espera ?? 0);
    }
    fimDaLinha.push(esperas.length);
  });

  esperas.push(ESPERA_DO_NOVO_PROMPT_MS);
  return { esperas, inicioDaLinha, fimDaLinha };
}

function useRoteiro(esperas: number[], instantaneo: boolean): number {
  const [passo, setPasso] = useState(instantaneo ? esperas.length : 0);

  useEffect(() => {
    if (instantaneo) {
      setPasso(esperas.length);
      return undefined;
    }
    setPasso(0);
    let atual = 0;
    let relogio = 0;
    const avancar = () => {
      atual += 1;
      while (atual < esperas.length && esperas[atual] === 0) atual += 1;
      setPasso(atual);
      if (atual < esperas.length) relogio = window.setTimeout(avancar, esperas[atual]);
    };
    relogio = window.setTimeout(avancar, esperas[0]);
    return () => window.clearTimeout(relogio);
  }, [esperas, instantaneo]);

  return passo;
}

function Cursor({ piscando = false }: { piscando?: boolean }) {
  return <span className={juntarClasses(estilos.cursor, piscando && estilos.piscando)} />;
}

function Trechos({ trechos }: { trechos: TrechoDoTerminal[] }) {
  return (
    <>
      {trechos.map((trecho, indice) => (
        <span key={indice} className={trecho.tipo ? estilos[trecho.tipo] : undefined}>
          {trecho.texto}
        </span>
      ))}
    </>
  );
}

function Digitada({ trechos, digitados, cursor }: { trechos: TrechoDoTerminal[]; digitados: number; cursor: boolean }) {
  let restante = digitados;
  const visiveis: TrechoDoTerminal[] = [];
  const pendentes: TrechoDoTerminal[] = [];
  for (const trecho of trechos) {
    const parte = Math.max(0, Math.min(trecho.texto.length, restante));
    restante -= parte;
    if (parte > 0) visiveis.push({ ...trecho, texto: trecho.texto.slice(0, parte) });
    if (parte < trecho.texto.length) pendentes.push({ ...trecho, texto: trecho.texto.slice(parte) });
  }

  return (
    <>
      <Trechos trechos={visiveis} />
      {cursor ? <Cursor /> : null}
      <span className={estilos.pendente}>
        <Trechos trechos={pendentes} />
      </span>
    </>
  );
}

export function TerminalPsql({ linhas, codigo, tom = 'destaque', titulo = 'psql · orynt', prompt = 'orynt=>' }: TerminalPsqlProps) {
  const semMovimento = useConsultaMidia(CONSULTA_SEM_MOVIMENTO);
  const roteiro = useMemo(() => montarRoteiro(linhas), [linhas]);
  const passo = useRoteiro(roteiro.esperas, semMovimento);
  const ultimoComando = linhas.reduce((ultimo, linha, indice) => (linha.tipo === 'COMANDO' ? indice : ultimo), -1);
  const executou = passo > (roteiro.fimDaLinha[ultimoComando] ?? 0);

  return (
    <div className={estilos.terminal}>
      <div className={estilos.barra}>
        <span className={juntarClasses(estilos.titulo, 'codigo')}>{titulo}</span>
        <span
          className={juntarClasses(estilos.codigoDaResposta, tom === 'erro' ? estilos.tomErro : estilos.tomDestaque, 'codigo')}
        >
          {codigo}
        </span>
      </div>

      <div className={juntarClasses(estilos.saida, 'codigo')}>
        {linhas.map((linha, indice) => {
          const inicio = roteiro.inicioDaLinha[indice] ?? 0;
          const fim = roteiro.fimDaLinha[indice] ?? 0;
          const apareceu = linha.tipo === 'COMANDO' ? passo >= inicio || indice === 0 : passo >= fim;

          if (linha.tipo === 'COMANDO') {
            const digitando = passo >= inicio && (passo < fim || (indice === ultimoComando && !executou));
            return (
              <p key={indice} className={apareceu ? undefined : estilos.oculta}>
                <span className={estilos.prompt}>{linha.prompt}</span>{' '}
                <Digitada trechos={linha.trechos} digitados={passo - inicio} cursor={digitando} />
              </p>
            );
          }

          return (
            <p
              key={indice}
              className={juntarClasses(linha.espacoAntes && estilos.espacoAntes, apareceu ? estilos.surgiu : estilos.oculta)}
              style={linha.recuo ? { paddingLeft: linha.recuo } : undefined}
            >
              <Trechos trechos={linha.trechos} />
            </p>
          );
        })}

        <p className={juntarClasses(estilos.espacoAntes, passo >= roteiro.esperas.length ? undefined : estilos.oculta)}>
          <span className={estilos.prompt}>{prompt}</span> <Cursor piscando />
        </p>
      </div>
    </div>
  );
}
