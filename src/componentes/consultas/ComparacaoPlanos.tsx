import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Equal, Minus, Rows3, ScanLine, Timer, X } from 'lucide-react';
import { Botao, CabecalhoPainel, Painel } from '@/componentes/ui';
import { RAZAO_EM_VEZES, etapasAlteradas, frasesDaComparacao, medidasDaComparacao } from '@/regras/comparacaoPlanos';
import type { LadoDaComparacao, MedidaComparada, TipoFraseDaComparacao } from '@/regras/comparacaoPlanos';
import { periodoDaVersao } from '@/regras/planoExecucao';
import { formatarNumero, formatarVariacao } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import destaques from '@/componentes/relatorios/DestaquesRelatorio.module.css';
import variacoes from '@/componentes/dashboard/VariacaoIndicador.module.css';
import { ArvorePlano } from './ArvorePlano';
import estilos from './ComparacaoPlanos.module.css';

export interface LadoExibido extends LadoDaComparacao {
  atual: boolean;
}

interface ComparacaoPlanosProps {
  principal: LadoExibido;
  base: LadoExibido;
  aoInverter: () => void;
  aoFechar: () => void;
  aoAbrir: (versao: string) => void;
}

const icones: Record<TipoFraseDaComparacao, LucideIcon> = {
  TEMPO: Timer,
  ACESSO: ScanLine,
  LEITURA: Rows3,
  IGUAIS: Equal,
};

function minuscula(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

function Diferenca({ medida }: { medida: MedidaComparada }) {
  if (medida.variacao === null) return <span className={estilos.semDiferenca}>—</span>;
  const Icone = medida.variacao > 0 ? ArrowUpRight : medida.variacao < 0 ? ArrowDownRight : Minus;
  const julgada = medida.favoravel !== null && medida.variacao !== 0;
  const melhor = julgada && medida.variacao > 0 === (medida.favoravel === 'ALTA');
  const tom = !julgada ? undefined : melhor ? variacoes.melhora : variacoes.piora;

  return (
    <span className={estilos.diferenca}>
      <Icone size={14} strokeWidth={2.5} aria-hidden="true" className={juntarClasses(variacoes.seta, tom)} />
      <span className={juntarClasses(variacoes.valor, tom)}>
        {medida.razao !== null && medida.razao >= RAZAO_EM_VEZES ? (
          <>
            {formatarNumero(Math.round(medida.razao))}×<span className="visualmente-oculto"> vezes</span>
          </>
        ) : (
          formatarVariacao(medida.variacao)
        )}
      </span>
    </span>
  );
}

export function ComparacaoPlanos({ principal, base, aoInverter, aoFechar, aoAbrir }: ComparacaoPlanosProps) {
  const frases = frasesDaComparacao(principal, base);
  const medidas = medidasDaComparacao(principal, base);
  const alteradas = etapasAlteradas(principal.plano, base.plano);

  return (
    <div className={estilos.comparacao}>
      <Painel aria-labelledby="titulo-comparacao-planos" className={estilos.resumo}>
        <CabecalhoPainel
          titulo={<span id="titulo-comparacao-planos">Comparação dos planos</span>}
          descricao={`${principal.rotulo} e ${minuscula(base.rotulo)} da mesma consulta, lado a lado`}
          acao={
            <div className={estilos.acoes}>
              <Botao variante="secundario" tamanho="sm" icone={ArrowLeftRight} onClick={aoInverter}>
                Inverter
              </Botao>
              <Botao variante="secundario" tamanho="sm" icone={X} onClick={aoFechar}>
                Fechar comparação
              </Botao>
            </div>
          }
        />

        <div className={estilos.corpo}>
          <ul className={juntarClasses(destaques.lista, estilos.frases)}>
            {frases.map((frase, indice) => {
              const Icone = icones[frase.tipo];
              return (
                <li className={destaques.item} key={`${frase.tipo}-${indice}`}>
                  <span className={juntarClasses(destaques.icone, destaques[frase.tom])} aria-hidden="true">
                    <Icone size={15} strokeWidth={2.25} />
                  </span>
                  <div className={destaques.textos}>
                    <p className={destaques.frase}>{frase.texto}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className={estilos.conteinerTabela}>
            <table className={estilos.tabela}>
              <caption className="visualmente-oculto">
                Medidas do {minuscula(principal.rotulo)} e do {minuscula(base.rotulo)}, com a diferença do primeiro em relação
                ao segundo.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Medida</th>
                  <th scope="col" className={estilos.numerica}>
                    {principal.rotulo}
                  </th>
                  <th scope="col" className={estilos.numerica}>
                    {base.rotulo}
                  </th>
                  <th scope="col" className={estilos.numerica}>
                    Diferença
                  </th>
                </tr>
              </thead>
              <tbody>
                {medidas.map((medida) => (
                  <tr key={medida.rotulo}>
                    <th scope="row">{medida.rotulo}</th>
                    <td className={`${estilos.numerica} numeros`} data-rotulo={principal.rotulo}>
                      {medida.principal}
                    </td>
                    <td className={`${estilos.numerica} ${estilos.base} numeros`} data-rotulo={base.rotulo}>
                      {medida.base}
                    </td>
                    <td className={`${estilos.numerica} numeros`} data-rotulo="Diferença">
                      <Diferenca medida={medida} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Painel>

      <div className={estilos.lados}>
        {[
          { lado: principal, etapas: alteradas.principal },
          { lado: base, etapas: alteradas.base },
        ].map(({ lado, etapas }) => (
          <Painel key={lado.versao.id} espacamento="nenhum" aria-labelledby={`titulo-lado-${lado.versao.id}`} className={estilos.lado}>
            <div className={estilos.cabecalhoLado}>
              <CabecalhoPainel
                nivel={3}
                titulo={<span id={`titulo-lado-${lado.versao.id}`}>{lado.rotulo}</span>}
                descricao={periodoDaVersao(lado.versao, lado.atual)}
                acao={
                  <Botao variante="secundario" tamanho="sm" onClick={() => aoAbrir(lado.versao.id)}>
                    Abrir este plano
                  </Botao>
                }
              />
            </div>
            <ArvorePlano plano={lado.plano} alteradas={etapas} rotulo={`Etapas do ${minuscula(lado.rotulo)}`} />
          </Painel>
        ))}
      </div>
    </div>
  );
}
