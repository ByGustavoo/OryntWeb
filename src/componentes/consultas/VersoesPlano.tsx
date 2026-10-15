import { GitCompareArrows } from 'lucide-react';
import { VariacaoIndicador } from '@/componentes/dashboard/VariacaoIndicador';
import { Botao, CabecalhoPainel, Painel, Selo } from '@/componentes/ui';
import type { VersaoPlanoDTO } from '@/modelos/planos';
import { descreverVersoes, periodoDaVersao, rotuloDaVersao, variacaoEntreVersoes } from '@/regras/planoExecucao';
import { formatarDuracaoMs, formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './VersoesPlano.module.css';

interface VersoesPlanoProps {
  versoes: VersaoPlanoDTO[];
  exibidas: string[];
  aoEscolher: (id: string) => void;
  aoComparar?: () => void;
}

export function VersoesPlano({ versoes, exibidas, aoEscolher, aoComparar }: VersoesPlanoProps) {
  const unica = versoes.length === 1;

  return (
    <Painel aria-labelledby="titulo-versoes-plano" className={estilos.painel}>
      <CabecalhoPainel
        titulo={<span id="titulo-versoes-plano">Mudanças de plano</span>}
        descricao={descreverVersoes(versoes)}
        acao={
          !unica && aoComparar ? (
            <Botao variante="secundario" tamanho="sm" icone={GitCompareArrows} onClick={aoComparar}>
              Comparar planos
            </Botao>
          ) : undefined
        }
      />
      <ul className={estilos.lista}>
        {versoes.map((versao, indice) => {
          const atual = indice === 0;
          const emTela = exibidas.includes(versao.id);
          const conteudo = (
            <>
              <span className={estilos.topo}>
                <span className={estilos.nome}>{rotuloDaVersao(versao, indice)}</span>
                {emTela && !unica ? <Selo tom="destaque">Na tela</Selo> : null}
              </span>
              <span className={estilos.periodo}>{periodoDaVersao(versao, atual)}</span>
              <span className={estilos.numeros}>
                <span>
                  <span className="numeros">{formatarNumero(versao.quantidadeExecucoes)}</span>{' '}
                  {pluralizar(versao.quantidadeExecucoes, 'execução', 'execuções')} nos últimos 30 dias
                </span>
                <span>
                  <span className="numeros">{formatarDuracaoMs(versao.tempoMedioMs)}</span> em média
                </span>
              </span>
              {!unica && versoes[indice + 1] ? (
                <span className={estilos.variacao}>
                  <VariacaoIndicador
                    valor={variacaoEntreVersoes(versao, versoes[indice + 1])}
                    favoravel="QUEDA"
                    referencia="ao plano anterior"
                  />
                </span>
              ) : null}
            </>
          );

          return (
            <li key={versao.id}>
              {unica ? (
                <div className={estilos.versao}>{conteudo}</div>
              ) : (
                <button
                  type="button"
                  className={juntarClasses(estilos.versao, estilos.escolhivel, emTela && estilos.emTela)}
                  aria-pressed={emTela}
                  onClick={() => aoEscolher(versao.id)}
                >
                  {conteudo}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Painel>
  );
}
