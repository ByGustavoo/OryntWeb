import type { CSSProperties, ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Painel } from '@/componentes/ui';
import type { NoPlanoDTO, PlanoExecucaoDTO } from '@/modelos/planos';
import {
  BYTES_POR_BLOCO,
  alvoDoNo,
  buffersProprios,
  estimativaErrada,
  explicarNo,
  fatorDaEstimativa,
  linhasDescartadas,
  linhasDevolvidas,
  linhasEsperadas,
  linhasLidas,
  nomeDoNo,
  rotuloDaCondicao,
  rotuloDoMetodo,
  tamanhoDosBlocos,
  tempoDoNoMs,
  tempoProprioMs,
} from '@/regras/planoExecucao';
import { formatarDecimal, formatarDuracaoMs, formatarNumero, formatarPercentual, formatarTamanho, pluralizar } from '@/utilitarios/formatacao';
import estilos from './DetalheEtapa.module.css';

interface DetalheEtapaProps {
  plano: PlanoExecucaoDTO;
  no: NoPlanoDTO;
  abaixoDeLimite: boolean;
  posicao: number;
  total: number;
}

const BYTES_POR_KB = 1024;

function blocos(quantidade: number): ReactNode {
  return (
    <>
      <span className="numeros">{formatarNumero(quantidade)}</span>{' '}
      <span className={estilos.unidade}>
        {pluralizar(quantidade, 'bloco', 'blocos')} · {tamanhoDosBlocos(quantidade)}
      </span>
    </>
  );
}

function Medida({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className={estilos.medida}>
      <dt>{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={estilos.secao}>
      <h3 className={estilos.tituloSecao}>{titulo}</h3>
      {children}
    </section>
  );
}

export function DetalheEtapa({ plano, no, abaixoDeLimite, posicao, total }: DetalheEtapaProps) {
  const proprio = tempoProprioMs(no);
  const parte = plano.tempoExecucaoMs > 0 ? (proprio / plano.tempoExecucaoMs) * 100 : 0;
  const alvo = alvoDoNo(no);
  const buffers = buffersProprios(no);
  const descartadas = linhasDescartadas(no);
  const errada = estimativaErrada(no, abaixoDeLimite);
  const temLeituras = Object.values(buffers).some((valor) => valor > 0);

  return (
    <Painel aria-labelledby="titulo-etapa-do-plano" className={estilos.painel}>
      <header className={estilos.cabecalho}>
        <p className={estilos.posicao}>
          Etapa <span className="numeros">{posicao}</span> de <span className="numeros">{total}</span>
        </p>
        <h2 className={estilos.nome} id="titulo-etapa-do-plano">
          {nomeDoNo(no)}
        </h2>
        {alvo ? <p className={estilos.alvo}>{alvo}</p> : null}
        <p className={estilos.explicacao}>{explicarNo(no)}</p>
      </header>

      <div className={estilos.tempo}>
        <p className={estilos.valorTempo}>
          <span className="numeros">{formatarDuracaoMs(proprio)}</span>
          <span className={estilos.legendaTempo}>
            na própria etapa, <span className="numeros">{formatarPercentual(parte)}</span> do tempo de execução
          </span>
        </p>
        <span className={estilos.barra} aria-hidden="true">
          <span style={{ '--parte': `${Math.min(100, parte)}%` } as CSSProperties} />
        </span>
      </div>

      <Secao titulo="Linhas">
        <dl className={estilos.medidas}>
          <Medida rotulo="Devolvidas">
            <span className="numeros">{formatarNumero(linhasDevolvidas(no))}</span>
          </Medida>
          <Medida rotulo="Esperadas pelo planejador">
            <span className={errada ? estilos.errada : undefined}>
              {errada ? <TriangleAlert size={13} strokeWidth={2.25} aria-hidden="true" /> : null}
              <span className="numeros">{formatarNumero(linhasEsperadas(no))}</span>
            </span>
          </Medida>
          {errada ? (
            <Medida rotulo="Erro da estimativa">
              <span className="numeros">{formatarNumero(Math.round(fatorDaEstimativa(no)))}</span> vezes
            </Medida>
          ) : null}
          {no.linhasRemovidasPeloFiltro !== null ? (
            <>
              <Medida rotulo="Lidas">
                <span className="numeros">{formatarNumero(linhasLidas(no))}</span>
              </Medida>
              <Medida rotulo="Descartadas pelo filtro">
                <span className="numeros">{formatarNumero(descartadas)}</span>
              </Medida>
            </>
          ) : null}
          {no.lacos > 1 ? (
            <Medida rotulo="Execuções da etapa">
              <span className="numeros">{formatarNumero(no.lacos)}</span>
            </Medida>
          ) : null}
        </dl>
      </Secao>

      {no.condicoes.length > 0 ? (
        <Secao titulo="Condições">
          <dl className={estilos.condicoes}>
            {no.condicoes.map((condicao, indice) => (
              <div key={indice} className={estilos.condicao}>
                <dt>{rotuloDaCondicao[condicao.tipo]}</dt>
                <dd>
                  <code>{condicao.expressao}</code>
                </dd>
              </div>
            ))}
          </dl>
        </Secao>
      ) : null}

      {temLeituras ? (
        <Secao titulo="Leituras desta etapa">
          <dl className={estilos.medidas}>
            {buffers.emCache > 0 ? <Medida rotulo="Do cache">{blocos(buffers.emCache)}</Medida> : null}
            {buffers.lidos > 0 ? <Medida rotulo="Do disco">{blocos(buffers.lidos)}</Medida> : null}
            {buffers.temporariosEscritos > 0 ? (
              <Medida rotulo="Gravados em arquivo temporário">{blocos(buffers.temporariosEscritos)}</Medida>
            ) : null}
            {buffers.temporariosLidos > 0 ? (
              <Medida rotulo="Lidos de arquivo temporário">{blocos(buffers.temporariosLidos)}</Medida>
            ) : null}
          </dl>
        </Secao>
      ) : null}

      {no.ordenacao || no.memoria ? (
        <Secao titulo="Memória">
          <dl className={estilos.medidas}>
            {no.ordenacao ? (
              <>
                <Medida rotulo="Método">{rotuloDoMetodo[no.ordenacao.metodo]}</Medida>
                <Medida rotulo={no.ordenacao.emDisco ? 'Espaço em disco' : 'Espaço em memória'}>
                  <span className="numeros">{formatarTamanho(no.ordenacao.espacoKb * BYTES_POR_KB)}</span>
                </Medida>
              </>
            ) : null}
            {no.memoria ? (
              <>
                <Medida rotulo="Memória usada">
                  <span className="numeros">{formatarTamanho(no.memoria.memoriaKb * BYTES_POR_KB)}</span>
                </Medida>
                <Medida rotulo="Lotes">
                  <span className={no.memoria.lotes > 1 ? estilos.errada : undefined}>
                    {no.memoria.lotes > 1 ? <TriangleAlert size={13} strokeWidth={2.25} aria-hidden="true" /> : null}
                    <span className="numeros">{formatarNumero(no.memoria.lotes)}</span>
                  </span>
                </Medida>
                {no.memoria.discoKb ? (
                  <Medida rotulo="Espaço em disco">
                    <span className="numeros">{formatarTamanho(no.memoria.discoKb * BYTES_POR_KB)}</span>
                  </Medida>
                ) : null}
              </>
            ) : null}
          </dl>
        </Secao>
      ) : null}

      <Secao titulo="Mais medidas">
        <dl className={estilos.medidas}>
          <Medida rotulo="Com as etapas abaixo">
            <span className="numeros">{formatarDuracaoMs(tempoDoNoMs(no))}</span>
          </Medida>
          <Medida rotulo="Até a primeira linha">
            <span className="numeros">{formatarDuracaoMs(no.tempoInicialMs)}</span>
          </Medida>
          <Medida rotulo="Custo estimado">
            <span className="numeros">
              {formatarDecimal(no.custoInicial, 2)} a {formatarDecimal(no.custoTotal, 2)}
            </span>
          </Medida>
          <Medida rotulo="Largura média da linha">
            <span className="numeros">{formatarTamanho(no.larguraBytes)}</span>
          </Medida>
        </dl>
      </Secao>

      <p className={estilos.nota}>
        {no.lacos > 1
          ? `Os números somam as ${formatarNumero(no.lacos)} execuções da etapa, menos o tempo até a primeira linha, que é o de cada uma. `
          : ''}
        Um bloco tem {formatarTamanho(BYTES_POR_BLOCO)}.
      </p>
    </Painel>
  );
}
