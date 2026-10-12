import { CabecalhoPainel, Painel } from '@/componentes/ui';
import type { DesempenhoConsulta } from '@/modelos/dashboard';
import { rotuloFaixaDesempenho } from '@/modelos/rotulos';
import { resumirMudancaDeDesempenho } from '@/regras/comparacaoRelatorio';
import type { FaixaComparada, RotulosDaComparacao, ValorComparado } from '@/regras/comparacaoRelatorio';
import { formatarPercentual, formatarPontosPercentuais } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilosFaixas from './DistribuicaoDesempenho.module.css';
import estilos from './DesempenhoComparado.module.css';

interface DesempenhoComparadoProps {
  faixas: FaixaComparada[];
  rotulos: RotulosDaComparacao;
  titulos: RotulosDaComparacao;
  referencia: string;
}

interface GrupoDeBarrasProps {
  titulo: string;
  complemento: string;
  faixas: FaixaComparada[];
  rotulos: RotulosDaComparacao;
  titulos: RotulosDaComparacao;
  ler: (faixa: FaixaComparada) => ValorComparado;
}

type Lado = 'principal' | 'base';

const lados: Lado[] = ['principal', 'base'];

const corDaFaixa: Record<DesempenhoConsulta, string | undefined> = {
  RAPIDA: estilosFaixas.rapida,
  MODERADA: estilosFaixas.moderada,
  LENTA: estilosFaixas.lenta,
};

function GrupoDeBarras({ titulo, complemento, faixas, rotulos, titulos, ler }: GrupoDeBarrasProps) {
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
                    className={juntarClasses(estilosFaixas.segmento, corDaFaixa[faixa.desempenho])}
                    style={{ flexGrow: ler(faixa)[lado] }}
                    title={`${rotuloFaixaDesempenho[faixa.desempenho]}: ${formatarPercentual(ler(faixa)[lado])} ${complemento} em ${rotulos[lado]}`}
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

  return (
    <Painel aria-labelledby="titulo-desempenho-comparado">
      <CabecalhoPainel
        titulo={<span id="titulo-desempenho-comparado">Desempenho das consultas</span>}
        descricao="A divisão das execuções e do tempo do banco entre as faixas, em cada período"
      />

      <div className={estilos.conteiner}>
        <div className={estilos.corpo}>
          <div className={estilos.grafico}>
            {leitura ? <p className={estilosFaixas.leitura}>{leitura}</p> : null}
            <div className={estilos.barras} aria-hidden="true">
              <GrupoDeBarras
                titulo="Execuções"
                complemento="das execuções"
                faixas={faixas}
                rotulos={rotulos}
                titulos={titulos}
                ler={(faixa) => faixa.execucoes}
              />
              <GrupoDeBarras
                titulo="Tempo do banco"
                complemento="do tempo do banco"
                faixas={faixas}
                rotulos={rotulos}
                titulos={titulos}
                ler={(faixa) => faixa.tempo}
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
                  <tr key={faixa.desempenho}>
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
