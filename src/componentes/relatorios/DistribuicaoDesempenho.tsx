import { useState } from 'react';
import { CabecalhoPainel, Painel } from '@/componentes/ui';
import type { DesempenhoConsulta } from '@/modelos/dashboard';
import type { FaixaDesempenhoDTO } from '@/modelos/relatorios';
import { rotuloFaixaDesempenho } from '@/modelos/rotulos';
import { resumirDesempenho } from '@/regras/destaquesRelatorio';
import { formatarNumero, formatarPercentual } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { DesempenhoEmEspera, PainelEmEspera } from './EsqueletoRelatorio';
import estilos from './DistribuicaoDesempenho.module.css';

const TITULO = 'Desempenho das consultas';
const DESCRICAO = 'Como as execuções e o tempo do banco se dividem entre consultas rápidas, moderadas e lentas';

interface DistribuicaoDesempenhoProps {
  faixas: FaixaDesempenhoDTO[];
}

interface BarraProps {
  titulo: string;
  faixas: FaixaDesempenhoDTO[];
  ler: (faixa: FaixaDesempenhoDTO) => number;
  foco: DesempenhoConsulta | null;
  aoFocar: (faixa: DesempenhoConsulta | null) => void;
}

const corDaFaixa: Record<DesempenhoConsulta, string | undefined> = {
  RAPIDA: estilos.rapida,
  MODERADA: estilos.moderada,
  LENTA: estilos.lenta,
};

export function eventosDoFoco(
  faixa: DesempenhoConsulta,
  foco: DesempenhoConsulta | null,
  aoFocar: (faixa: DesempenhoConsulta | null) => void,
) {
  return {
    onPointerEnter: (evento: { pointerType: string }) => {
      if (evento.pointerType !== 'touch') aoFocar(faixa);
    },
    onPointerLeave: (evento: { pointerType: string }) => {
      if (evento.pointerType !== 'touch') aoFocar(null);
    },
    onClick: () => aoFocar(foco === faixa ? null : faixa),
  };
}

function Barra({ titulo, faixas, ler, foco, aoFocar }: BarraProps) {
  return (
    <div className={estilos.linha}>
      <span className={estilos.tituloBarra}>{titulo}</span>
      <div className={estilos.barra}>
        {faixas
          .filter((faixa) => ler(faixa) > 0)
          .map((faixa) => (
            <span
              key={faixa.desempenho}
              className={juntarClasses(
                estilos.segmento,
                corDaFaixa[faixa.desempenho],
                foco !== null && foco !== faixa.desempenho && estilos.apagado,
              )}
              style={{ flexGrow: ler(faixa) }}
              {...eventosDoFoco(faixa.desempenho, foco, aoFocar)}
            />
          ))}
      </div>
    </div>
  );
}

export function DistribuicaoDesempenho({ faixas }: DistribuicaoDesempenhoProps) {
  const leitura = resumirDesempenho(faixas);
  const [foco, setFoco] = useState<DesempenhoConsulta | null>(null);

  return (
    <Painel aria-labelledby="titulo-desempenho">
      <CabecalhoPainel
        titulo={<span id="titulo-desempenho">{TITULO}</span>}
        descricao={DESCRICAO}
      />

      <div className={estilos.conteiner}>
        <div className={estilos.corpo}>
          <div className={estilos.grafico}>
            {leitura ? <p className={estilos.leitura}>{leitura}</p> : null}
            <div className={estilos.barras} aria-hidden="true">
              <Barra
                titulo="Execuções"
                faixas={faixas}
                ler={(faixa) => faixa.percentualExecucoes}
                foco={foco}
                aoFocar={setFoco}
              />
              <Barra
                titulo="Tempo do banco"
                faixas={faixas}
                ler={(faixa) => faixa.percentualTempoTotal}
                foco={foco}
                aoFocar={setFoco}
              />
            </div>
          </div>

          <table className={estilos.tabela}>
            <caption className="visualmente-oculto">
              Consultas distintas, execuções e tempo do banco em cada faixa de desempenho
            </caption>
            <thead>
              <tr>
                <th scope="col">Faixa</th>
                <th scope="col" className={estilos.numerica}>
                  Consultas distintas
                </th>
                <th scope="col" className={estilos.numerica}>
                  Execuções
                </th>
                <th scope="col" className={estilos.numerica}>
                  Tempo do banco
                </th>
              </tr>
            </thead>
            <tbody>
              {faixas.map((faixa) => (
                <tr
                  key={faixa.desempenho}
                  className={juntarClasses(foco !== null && foco !== faixa.desempenho && estilos.linhaApagada)}
                  {...eventosDoFoco(faixa.desempenho, foco, setFoco)}
                >
                  <th scope="row">
                    <span className={estilos.faixa}>
                      <span className={juntarClasses(estilos.amostra, corDaFaixa[faixa.desempenho])} aria-hidden="true" />
                      {rotuloFaixaDesempenho[faixa.desempenho]}
                    </span>
                  </th>
                  <td className={`${estilos.numerica} numeros`} data-rotulo="Consultas">
                    {formatarNumero(faixa.consultasDistintas)}
                  </td>
                  <td className={`${estilos.numerica} numeros`} data-rotulo="Execuções">
                    {formatarPercentual(faixa.percentualExecucoes)}
                  </td>
                  <td className={`${estilos.numerica} numeros`} data-rotulo="Tempo do banco">
                    {formatarPercentual(faixa.percentualTempoTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Painel>
  );
}

export function EsqueletoDistribuicao() {
  return (
    <PainelEmEspera titulo={TITULO} descricao={DESCRICAO}>
      <DesempenhoEmEspera barras={2} frases={2} alturaMinima={168} />
    </PainelEmEspera>
  );
}
