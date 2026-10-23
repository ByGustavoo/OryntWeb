import { useState } from 'react';
import { CabecalhoPainel, Painel } from '@/componentes/ui';
import type { DesempenhoConsulta } from '@/modelos/dashboard';
import { rotuloFaixaDesempenho } from '@/modelos/rotulos';
import { resumirMudancaDeDesempenho } from '@/regras/comparacaoRelatorio';
import type { FaixaComparada, RotulosDaComparacao, ValorComparado } from '@/regras/comparacaoRelatorio';
import { formatarPercentual, formatarPontosPercentuais } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { eventosDoFoco } from './DistribuicaoDesempenho';
import estilosFaixas from './DistribuicaoDesempenho.module.css';
import { DesempenhoEmEspera, PainelEmEspera } from './EsqueletoRelatorio';
import estilos from './DesempenhoComparado.module.css';

const TITULO = 'Desempenho das consultas';
const DESCRICAO = 'A divisão das execuções e do tempo do banco entre as faixas, em cada período';

interface DesempenhoComparadoProps {
  faixas: FaixaComparada[];
  rotulos: RotulosDaComparacao;
  titulos: RotulosDaComparacao;
  referencia: string;
}

interface GrupoDeBarrasProps {
  titulo: string;
  faixas: FaixaComparada[];
  titulos: RotulosDaComparacao;
  ler: (faixa: FaixaComparada) => ValorComparado;
  foco: DesempenhoConsulta | null;
  aoFocar: (faixa: DesempenhoConsulta | null) => void;
}

type Lado = 'principal' | 'base';

const lados: Lado[] = ['principal', 'base'];

const corDaFaixa: Record<DesempenhoConsulta, string | undefined> = {
  RAPIDA: estilosFaixas.rapida,
  MODERADA: estilosFaixas.moderada,
  LENTA: estilosFaixas.lenta,
};

function GrupoDeBarras({ titulo, faixas, titulos, ler, foco, aoFocar }: GrupoDeBarrasProps) {
  return (
    <div className={estilos.grupo}>
      <span className={estilosFaixas.tituloBarra}>{titulo}</span>
      <div className={estilos.pares}>
        {lados.map((lado) => (
          <div className={estilos.par} key={lado}>
            <span className={juntarClasses(estilos.rotuloBarra, lado === 'principal' && estilos.rotuloPrincipal, 'numeros')}>
              {titulos[lado]}
            </span>
            <div className={estilosFaixas.barra}>
              {faixas
                .filter((faixa) => ler(faixa)[lado] > 0)
                .map((faixa) => (
                  <span
                    key={faixa.desempenho}
                    className={juntarClasses(
                      estilosFaixas.segmento,
                      corDaFaixa[faixa.desempenho],
                      foco !== null && foco !== faixa.desempenho && estilosFaixas.apagado,
                    )}
                    style={{ flexGrow: ler(faixa)[lado] }}
                    {...eventosDoFoco(faixa.desempenho, foco, aoFocar)}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DesempenhoComparado({ faixas, rotulos, titulos, referencia }: DesempenhoComparadoProps) {
  const leitura = resumirMudancaDeDesempenho(faixas, referencia);
  const [foco, setFoco] = useState<DesempenhoConsulta | null>(null);

  return (
    <Painel aria-labelledby="titulo-desempenho-comparado">
      <CabecalhoPainel
        titulo={<span id="titulo-desempenho-comparado">{TITULO}</span>}
        descricao={DESCRICAO}
      />

      <div className={estilos.conteiner}>
        <div className={estilos.corpo}>
          <div className={estilos.grafico}>
            {leitura ? <p className={estilosFaixas.leitura}>{leitura}</p> : null}
            <div className={estilos.barras} aria-hidden="true">
              <GrupoDeBarras
                titulo="Execuções"
                faixas={faixas}
                titulos={titulos}
                ler={(faixa) => faixa.execucoes}
                foco={foco}
                aoFocar={setFoco}
              />
              <GrupoDeBarras
                titulo="Tempo do banco"
                faixas={faixas}
                titulos={titulos}
                ler={(faixa) => faixa.tempo}
                foco={foco}
                aoFocar={setFoco}
              />
            </div>
          </div>

          <table className={estilos.tabela}>
              <caption className="visualmente-oculto">
                Fatia das execuções e do tempo do banco em cada faixa de desempenho, em {rotulos.principal} e em{' '}
                {rotulos.base}, com a diferença do tempo em pontos percentuais
              </caption>
              <thead>
                <tr>
                  <th scope="col" rowSpan={2} className={estilos.colunaFaixa}>
                    Faixa
                  </th>
                  <th scope="colgroup" colSpan={2} className={estilos.grupoColunas}>
                    Execuções
                  </th>
                  <th scope="colgroup" colSpan={3} className={estilos.grupoColunas}>
                    Tempo do banco
                  </th>
                </tr>
                <tr>
                  <th scope="col" className={juntarClasses(estilos.numerica, estilos.inicioGrupo)}>
                    {titulos.principal}
                  </th>
                  <th scope="col" className={estilos.numerica}>
                    {titulos.base}
                  </th>
                  <th scope="col" className={juntarClasses(estilos.numerica, estilos.inicioGrupo)}>
                    {titulos.principal}
                  </th>
                  <th scope="col" className={estilos.numerica}>
                    {titulos.base}
                  </th>
                  <th scope="col" className={estilos.numerica}>
                    Diferença
                  </th>
                </tr>
              </thead>
              <tbody>
                {faixas.map((faixa) => (
                  <tr
                    key={faixa.desempenho}
                    className={juntarClasses(foco !== null && foco !== faixa.desempenho && estilosFaixas.linhaApagada)}
                    {...eventosDoFoco(faixa.desempenho, foco, setFoco)}
                  >
                    <th scope="row" className={estilos.colunaFaixa}>
                      <span className={estilosFaixas.faixa}>
                        <span className={juntarClasses(estilosFaixas.amostra, corDaFaixa[faixa.desempenho])} aria-hidden="true" />
                        {rotuloFaixaDesempenho[faixa.desempenho]}
                      </span>
                    </th>
                    <td
                      className={juntarClasses(estilos.numerica, estilos.inicioGrupo, 'numeros')}
                      data-rotulo={`Execuções em ${rotulos.principal}`}
                    >
                      {formatarPercentual(faixa.execucoes.principal)}
                    </td>
                    <td
                      className={juntarClasses(estilos.numerica, estilos.daBase, 'numeros')}
                      data-rotulo={`Execuções em ${rotulos.base}`}
                    >
                      {formatarPercentual(faixa.execucoes.base)}
                    </td>
                    <td
                      className={juntarClasses(estilos.numerica, estilos.inicioGrupo, 'numeros')}
                      data-rotulo={`Tempo do banco em ${rotulos.principal}`}
                    >
                      {formatarPercentual(faixa.tempo.principal)}
                    </td>
                    <td
                      className={juntarClasses(estilos.numerica, estilos.daBase, 'numeros')}
                      data-rotulo={`Tempo do banco em ${rotulos.base}`}
                    >
                      {formatarPercentual(faixa.tempo.base)}
                    </td>
                    <td className={juntarClasses(estilos.numerica, estilos.diferenca, 'numeros')} data-rotulo="Diferença do tempo do banco">
                      {formatarPontosPercentuais(faixa.tempo.diferenca)}
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

export function EsqueletoDesempenhoComparado() {
  return (
    <PainelEmEspera titulo={TITULO} descricao={DESCRICAO}>
      <DesempenhoEmEspera barras={4} frases={2} alturaMinima={230} />
    </PainelEmEspera>
  );
}
