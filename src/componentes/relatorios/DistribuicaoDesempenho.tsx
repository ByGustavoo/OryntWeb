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
  complemento: string;
  faixas: FaixaDesempenhoDTO[];
  ler: (faixa: FaixaDesempenhoDTO) => number;
}

const corDaFaixa: Record<DesempenhoConsulta, string | undefined> = {
  RAPIDA: estilos.rapida,
  MODERADA: estilos.moderada,
  LENTA: estilos.lenta,
};

function Barra({ titulo, complemento, faixas, ler }: BarraProps) {
  return (
    <div className={estilos.linha}>
      <span className={estilos.tituloBarra}>{titulo}</span>
      <div className={estilos.barra}>
        {faixas
          .filter((faixa) => ler(faixa) > 0)
          .map((faixa) => (
            <span
              key={faixa.desempenho}
              className={juntarClasses(estilos.segmento, corDaFaixa[faixa.desempenho])}
              style={{ flexGrow: ler(faixa) }}
              title={`${rotuloFaixaDesempenho[faixa.desempenho]}: ${formatarPercentual(ler(faixa))} ${complemento}`}
            />
          ))}
      </div>
    </div>
  );
}

export function DistribuicaoDesempenho({ faixas }: DistribuicaoDesempenhoProps) {
  const leitura = resumirDesempenho(faixas);

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
              <Barra titulo="Execuções" complemento="das execuções" faixas={faixas} ler={(faixa) => faixa.percentualExecucoes} />
              <Barra
                titulo="Tempo do banco"
                complemento="do tempo do banco"
                faixas={faixas}
                ler={(faixa) => faixa.percentualTempoTotal}
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
                <tr key={faixa.desempenho}>
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
