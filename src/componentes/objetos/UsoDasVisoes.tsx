import type { CSSProperties } from 'react';
import { LinhaEmEspera, PainelEmEspera } from '@/componentes/relatorios/EsqueletoRelatorio';
import { CabecalhoPainel, Dica, Esqueleto, Painel } from '@/componentes/ui';
import type { VisaoDTO } from '@/modelos/objetos';
import { HORAS_ATE_DESATUALIZAR, leiturasDaVisao, situacaoDaMaterializada } from '@/regras/visoes';
import type { ContextoDasVisoes } from '@/regras/visoes';
import { formatarNumero, formatarNumeroCompacto, formatarTempoRelativo, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './FiguraDoPanorama.module.css';
import proprios from './UsoDasVisoes.module.css';

const TITULO = 'Frescor e leitura';
const DESCRICAO = 'Há quanto tempo cada materializada foi atualizada e quantas vezes cada view foi lida em 30 dias';
const HORAS_NA_ESCALA = HORAS_ATE_DESATUALIZAR * 3;
const MS_POR_HORA = 3_600_000;

interface UsoDasVisoesProps {
  visoes: VisaoDTO[];
  contexto: ContextoDasVisoes;
  aoAbrir: (visao: VisaoDTO) => void;
}

function Nome({ visao }: { visao: VisaoDTO }) {
  return (
    <span className={estilos.nome}>
      <Dica conteudo={`${visao.esquema}.${visao.nome}`} soSeCortado>
        <span className="codigo">
          <span className={estilos.esquema}>{visao.esquema}.</span>
          {visao.nome}
        </span>
      </Dica>
    </span>
  );
}

export function UsoDasVisoes({ visoes, contexto, aoAbrir }: UsoDasVisoesProps) {
  const materializadas = visoes.filter((visao) => visao.materializacao !== null);
  const porLeitura = [...visoes].sort((a, b) => leiturasDaVisao(b) - leiturasDaVisao(a));
  const maisLida = porLeitura[0] ? leiturasDaVisao(porLeitura[0]) : 0;
  const posicaoDoLimite = (HORAS_ATE_DESATUALIZAR / HORAS_NA_ESCALA) * 100;

  return (
    <Painel aria-labelledby="titulo-uso-visoes">
      <CabecalhoPainel titulo={<span id="titulo-uso-visoes">{TITULO}</span>} descricao={DESCRICAO} />
      <div className={juntarClasses(estilos.figura, proprios.figura)}>
        {materializadas.length > 0 ? (
          <section className={proprios.bloco} aria-labelledby="titulo-frescor-visoes">
            <h3 className={proprios.subtitulo} id="titulo-frescor-visoes">
              Dados guardados das materializadas
            </h3>
            <ul className={estilos.linhas}>
              {materializadas.map((visao, ordem) => {
                const situacao = situacaoDaMaterializada(visao, contexto.geradoEm);
                const ultima = visao.materializacao?.ultimaAtualizacao ?? null;
                const horas =
                  ultima === null
                    ? null
                    : (new Date(contexto.geradoEm).getTime() - new Date(ultima).getTime()) / MS_POR_HORA;
                const texto =
                  situacao === 'NAO_POPULADA'
                    ? 'Sem dados'
                    : ultima === null
                      ? 'Sem registro'
                      : formatarTempoRelativo(ultima, new Date(contexto.geradoEm));
                const alem = horas !== null && horas > HORAS_NA_ESCALA;
                return (
                  <li key={visao.id}>
                    <button
                      type="button"
                      className={juntarClasses(estilos.linha, proprios.linhaFrescor)}
                      onClick={() => aoAbrir(visao)}
                      aria-label={`${visao.esquema}.${visao.nome}: ${situacao === 'NAO_POPULADA' ? 'sem dados' : `atualizada ${texto}`}. Abrir a view`}
                    >
                      <Nome visao={visao} />
                      <span className={proprios.escala} aria-hidden="true">
                        <span className={proprios.limite} style={{ left: `${posicaoDoLimite}%` }} />
                        {horas !== null && situacao !== 'NAO_POPULADA' ? (
                          <span
                            className={juntarClasses(
                              estilos.segmento,
                              proprios.idade,
                              situacao === 'DESATUALIZADA' && proprios.velha,
                              alem && proprios.alem,
                            )}
                            style={
                              {
                                width: `${Math.max(1.5, Math.min(100, (horas / HORAS_NA_ESCALA) * 100))}%`,
                                '--ordem': ordem,
                              } as CSSProperties
                            }
                          />
                        ) : (
                          <span className={proprios.vazia} />
                        )}
                      </span>
                      <span
                        className={juntarClasses(
                          estilos.valorDaLinha,
                          proprios.textoDaIdade,
                          situacao === 'NAO_POPULADA' && proprios.textoErro,
                          situacao === 'DESATUALIZADA' && proprios.textoAviso,
                        )}
                        aria-hidden="true"
                      >
                        {texto}
                      </span>
                    </button>
                  </li>
                );
              })}
              <li className={juntarClasses(estilos.linha, proprios.linhaFrescor, proprios.linhaEixo)} aria-hidden="true">
                <span />
                <span className={proprios.eixo}>
                  <span>agora</span>
                  <span className={proprios.marcaDoLimite} style={{ left: `${posicaoDoLimite}%` }}>
                    {HORAS_ATE_DESATUALIZAR} h
                  </span>
                  <span>{HORAS_NA_ESCALA} h+</span>
                </span>
                <span />
              </li>
            </ul>
          </section>
        ) : null}

        <section className={proprios.bloco} aria-labelledby="titulo-leitura-visoes">
          <h3 className={proprios.subtitulo} id="titulo-leitura-visoes">
            Leituras em 30 dias
          </h3>
          <ul className={estilos.linhas}>
            {porLeitura.map((visao, ordem) => {
              const leituras = leiturasDaVisao(visao);
              const semLeitura = contexto.semLeitura.has(visao.id);
              const texto = leituras > 0 ? formatarNumeroCompacto(leituras) : semLeitura ? 'Sem leitura' : 'Por outra view';
              return (
                <li key={visao.id}>
                  <button
                    type="button"
                    className={juntarClasses(estilos.linha, proprios.linhaLeitura)}
                    onClick={() => aoAbrir(visao)}
                    aria-label={`${visao.esquema}.${visao.nome}: ${leituras > 0 ? `${formatarNumero(leituras)} ${pluralizar(leituras, 'leitura', 'leituras')}` : texto.toLowerCase()}. Abrir a view`}
                  >
                    <Nome visao={visao} />
                    <span className={estilos.barra} aria-hidden="true">
                      {leituras > 0 && maisLida > 0 ? (
                        <span className={estilos.trilha}>
                          <span
                            className={estilos.segmento}
                            style={{ flexBasis: `${(leituras / maisLida) * 100}%`, '--ordem': ordem } as CSSProperties}
                          />
                        </span>
                      ) : (
                        <span className={proprios.vazia} />
                      )}
                    </span>
                    <span
                      className={juntarClasses(estilos.valorDaLinha, leituras === 0 && proprios.textoSemLeitura, semLeitura && proprios.textoAviso)}
                      aria-hidden="true"
                    >
                      {texto}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </Painel>
  );
}

export function EsqueletoUsoDasVisoes() {
  return (
    <PainelEmEspera titulo={TITULO} descricao={DESCRICAO}>
      <div className={juntarClasses(estilos.figura, proprios.figura)} aria-hidden="true">
        <div className={proprios.bloco}>
          <LinhaEmEspera largura={200} className={proprios.subtitulo} />
          <ul className={estilos.linhas}>
            {Array.from({ length: 3 }, (_, indice) => (
              <li key={indice} className={juntarClasses(estilos.linha, proprios.linhaFrescor)}>
                <LinhaEmEspera largura={`${80 - indice * 10}%`} className={estilos.nome} />
                <span className={estilos.barra}><Esqueleto largura={`${30 + indice * 25}%`} altura={10} /></span>
                <LinhaEmEspera largura="70%" className={estilos.valorDaLinha} />
              </li>
            ))}
            <li className={juntarClasses(estilos.linha, proprios.linhaFrescor, proprios.linhaEixo)}>
              <span />
              <LinhaEmEspera largura="100%" className={proprios.eixo} />
              <span />
            </li>
          </ul>
        </div>
        <div className={proprios.bloco}>
          <LinhaEmEspera largura={140} className={proprios.subtitulo} />
          <ul className={estilos.linhas}>
            {Array.from({ length: 9 }, (_, indice) => (
              <li key={indice} className={juntarClasses(estilos.linha, proprios.linhaLeitura)}>
                <LinhaEmEspera largura={`${84 - ((indice * 11) % 30)}%`} className={estilos.nome} />
                <span className={estilos.barra}><Esqueleto largura={`${Math.max(4, 96 - indice * 14)}%`} altura={10} /></span>
                <LinhaEmEspera largura="60%" className={estilos.valorDaLinha} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PainelEmEspera>
  );
}
