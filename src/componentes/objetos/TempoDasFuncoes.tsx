import type { CSSProperties } from 'react';
import { Gauge } from 'lucide-react';
import { LinhaEmEspera, PainelEmEspera } from '@/componentes/relatorios/EsqueletoRelatorio';
import { CabecalhoPainel, Dica, Esqueleto, Painel } from '@/componentes/ui';
import type { FuncaoDTO } from '@/modelos/objetos';
import {
  formatarTempoPorChamada,
  rotuloSituacaoFuncao,
  situacoesDaFuncao,
  tempoMedioPorChamada,
  tomDaSituacaoFuncao,
} from '@/regras/funcoes';
import type { ContextoDasFuncoes } from '@/regras/funcoes';
import { formatarDuracaoExtensa, formatarNumero, formatarNumeroCompacto, iniciarComMinuscula, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { iconeDaSituacaoFuncao } from './SeloSituacaoFuncao';
import estilos from './FiguraDoPanorama.module.css';
import proprios from './TempoDasFuncoes.module.css';

const TITULO = 'Onde vai o tempo das funções';
const DESCRICAO = 'As que mais gastaram tempo em 30 dias, separando o tempo delas do tempo nas funções que chamam';
const FUNCOES_NA_FIGURA = 6;

const partes = [
  { chave: 'propria', rotulo: 'Dentro dela', cor: 'var(--categoria-1)' },
  { chave: 'chamadas', rotulo: 'Em funções que ela chama', cor: 'var(--categoria-2)' },
] as const;

interface TempoDasFuncoesProps {
  funcoes: FuncaoDTO[];
  contexto: ContextoDasFuncoes;
  aoAbrir: (funcao: FuncaoDTO) => void;
}

export function TempoDasFuncoes({ funcoes, contexto, aoAbrir }: TempoDasFuncoesProps) {
  const medidas = funcoes.filter((funcao) => funcao.uso !== null);
  const naoMedidas = funcoes.length - medidas.length;
  const comTempo = medidas
    .filter((funcao) => (funcao.uso?.tempoTotalMs ?? 0) > 0)
    .sort((a, b) => (b.uso?.tempoTotalMs ?? 0) - (a.uso?.tempoTotalMs ?? 0));
  const maiores = comTempo.slice(0, FUNCOES_NA_FIGURA);
  const maior = maiores[0]?.uso?.tempoTotalMs ?? 0;
  const tempoProprio = medidas.reduce((soma, funcao) => soma + (funcao.uso?.tempoProprioMs ?? 0), 0);
  const chamadas = medidas.reduce((soma, funcao) => soma + (funcao.uso?.chamadas ?? 0), 0);
  const restantes = comTempo.length - maiores.length;

  return (
    <Painel aria-labelledby="titulo-tempo-funcoes">
      <CabecalhoPainel titulo={<span id="titulo-tempo-funcoes">{TITULO}</span>} descricao={DESCRICAO} />
      {medidas.length === 0 ? (
        <div className={proprios.semMedida}>
          <Gauge size={20} strokeWidth={2} aria-hidden="true" />
          <p>
            O servidor não mede nenhuma destas funções, então ainda não há tempo para mostrar. A nota acima traz o comando
            que liga a medida.
          </p>
        </div>
      ) : (
        <div className={estilos.figura}>
          <div className={estilos.manchete}>
            <p className={estilos.numeroPrincipal}>
              <span className={estilos.valor}>{formatarDuracaoExtensa(tempoProprio)}</span>
              <span className={estilos.legendaDoValor}>
                em {formatarNumeroCompacto(chamadas)} {pluralizar(chamadas, 'chamada', 'chamadas')} de{' '}
                {formatarNumero(medidas.length)} {pluralizar(medidas.length, 'função medida', 'funções medidas')}
              </span>
            </p>
            <ul className={estilos.legenda} aria-label="Partes do tempo">
              {partes.map((parte) => (
                <li key={parte.chave} className={estilos.itemLegenda}>
                  <span className={estilos.amostra} style={{ '--cor-amostra': parte.cor } as CSSProperties} aria-hidden="true" />
                  {parte.rotulo}
                </li>
              ))}
            </ul>
          </div>

          {maiores.length > 0 ? (
            <ul className={juntarClasses(estilos.linhas, proprios.linhas)}>
              {maiores.map((funcao, ordem) => {
                const uso = funcao.uso;
                if (!uso) return null;
                const situacao = situacoesDaFuncao(funcao, contexto)[0];
                const Icone = situacao ? iconeDaSituacaoFuncao[situacao] : null;
                const nasChamadas = Math.max(0, uso.tempoTotalMs - uso.tempoProprioMs);
                const medio = tempoMedioPorChamada(uso);
                const valores = { propria: uso.tempoProprioMs, chamadas: nasChamadas };
                const preenchidas = maior > 0 ? partes.filter((parte) => valores[parte.chave] > 0) : [];
                return (
                  <li key={funcao.id}>
                    <Dica
                      lado="direita"
                      titulo={`${funcao.nome}(${funcao.argumentos})`}
                      conteudo={
                        <>
                          {situacao ? <span className={estilos.situacaoNaDica}>{rotuloSituacaoFuncao[situacao]}</span> : null}
                          <span>
                            <strong>{formatarNumero(uso.chamadas)}</strong> {pluralizar(uso.chamadas, 'chamada', 'chamadas')}
                            {medio !== null ? (
                              <>
                                , <strong>{formatarTempoPorChamada(medio)}</strong> por chamada
                              </>
                            ) : null}
                          </span>
                          <span className={estilos.itemLegenda}>
                            <span className={estilos.amostra} style={{ '--cor-amostra': partes[0].cor } as CSSProperties} />
                            {partes[0].rotulo} <strong>{formatarDuracaoExtensa(uso.tempoProprioMs)}</strong>
                          </span>
                          {nasChamadas > 0 ? (
                            <span className={estilos.itemLegenda}>
                              <span className={estilos.amostra} style={{ '--cor-amostra': partes[1].cor } as CSSProperties} />
                              {partes[1].rotulo} <strong>{formatarDuracaoExtensa(nasChamadas)}</strong>
                            </span>
                          ) : null}
                        </>
                      }
                    >
                      <button
                        type="button"
                        className={estilos.linha}
                        onClick={() => aoAbrir(funcao)}
                        aria-label={`${funcao.esquema}.${funcao.nome}(${funcao.argumentos}): ${formatarDuracaoExtensa(uso.tempoTotalMs)} em ${formatarNumero(uso.chamadas)} ${pluralizar(uso.chamadas, 'chamada', 'chamadas')}${situacao ? `, ${iniciarComMinuscula(rotuloSituacaoFuncao[situacao])}` : ''}. Abrir a função`}
                      >
                        <span className={estilos.nome}>
                          {Icone && situacao ? (
                            <span className={juntarClasses(estilos.marcaSituacao, estilos[tomDaSituacaoFuncao(situacao)])}>
                              <Icone size={12} strokeWidth={2.25} aria-hidden="true" />
                            </span>
                          ) : null}
                          <span className={juntarClasses('codigo', proprios.assinatura)}>
                            <span className={estilos.esquema}>{funcao.esquema}.</span>
                            {funcao.nome}
                            <span className={estilos.esquema}>({funcao.argumentos})</span>
                          </span>
                        </span>
                        <span className={estilos.barra} data-dica-limite aria-hidden="true">
                          <span className={estilos.trilha}>
                            {preenchidas.map((parte, indice) => (
                              <span
                                key={parte.chave}
                                className={estilos.segmento}
                                data-dica-ancora={indice === preenchidas.length - 1 ? '' : undefined}
                                style={
                                  {
                                    flexBasis: `${(valores[parte.chave] / maior) * 100}%`,
                                    '--cor-segmento': parte.cor,
                                    '--ordem': ordem,
                                  } as CSSProperties
                                }
                              />
                            ))}
                          </span>
                        </span>
                        <span className={estilos.valorDaLinha} aria-hidden="true">
                          {formatarDuracaoExtensa(uso.tempoTotalMs)}
                        </span>
                      </button>
                    </Dica>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={proprios.semTempo}>Nenhuma função medida foi chamada nos últimos 30 dias.</p>
          )}

          {restantes > 0 || naoMedidas > 0 ? (
            <p className={estilos.rodape}>
              {restantes > 0
                ? `E mais ${formatarNumero(restantes)} ${pluralizar(restantes, 'função chamada', 'funções chamadas')} com menos tempo. `
                : ''}
              {naoMedidas > 0
                ? `${formatarNumero(naoMedidas)} ${pluralizar(naoMedidas, 'função fica', 'funções ficam')} de fora porque o servidor não ${pluralizar(naoMedidas, 'a mede', 'as mede')}.`
                : ''}
            </p>
          ) : null}
        </div>
      )}
    </Painel>
  );
}

export function EsqueletoTempoDasFuncoes() {
  return (
    <PainelEmEspera titulo={TITULO} descricao={DESCRICAO}>
      <div className={estilos.figura} aria-hidden="true">
        <div className={estilos.manchete}>
          <span className={estilos.numeroPrincipal}>
            <LinhaEmEspera largura={110} altura={22} className={estilos.valor} />
            <LinhaEmEspera largura={220} className={estilos.legendaDoValor} />
          </span>
          <LinhaEmEspera largura={240} className={estilos.legenda} />
        </div>
        <ul className={juntarClasses(estilos.linhas, proprios.linhas)}>
          {Array.from({ length: FUNCOES_NA_FIGURA }, (_, indice) => (
            <li key={indice} className={estilos.linha}>
              <LinhaEmEspera largura={`${84 - ((indice * 13) % 30)}%`} className={estilos.nome} />
              <span className={estilos.barra}><Esqueleto largura={`${Math.max(4, 94 - indice * 17)}%`} altura={10} /></span>
              <LinhaEmEspera largura="80%" className={estilos.valorDaLinha} />
            </li>
          ))}
        </ul>
        <LinhaEmEspera largura="56%" className={estilos.rodape} />
      </div>
    </PainelEmEspera>
  );
}
