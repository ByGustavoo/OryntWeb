import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  FlaskConical,
  History,
  KeyRound,
  Layers,
  ListTree,
  OctagonAlert,
  TriangleAlert,
  Waypoints,
  Zap,
} from 'lucide-react';
import { Botao, BotaoIcone, Modal, Nota, Selo } from '@/componentes/ui';
import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import type { IndiceDaTabelaDTO, ParticaoDTO, TabelaDTO, TipoObjetoBanco } from '@/modelos/objetos';
import { descreverDisparo } from '@/regras/funcoes';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { colunasDoIndice, rotuloRestricaoIndice } from '@/regras/indices';
import {
  autovacuumDesligado,
  avisosDaTabela,
  composicaoDasGravacoes,
  comandoDaTabela,
  comandoQueRestauraOsAjustes,
  descreverAjuste,
  descreverLeitura,
  fraseDoCrescimento,
  maisRecente,
  parteDoLimite,
  resumirCrescimento,
  situacoesDaTabela,
  tamanhoTotal,
  tipoCurto,
} from '@/regras/tabelas';
import type { ContextoDasTabelas } from '@/regras/tabelas';
import { idDoObjeto, rotuloTipoObjeto } from '@/regras/visoes';
import {
  formatarComSinal,
  formatarDataHoraCompleta,
  formatarNumero,
  formatarQuantidade,
  formatarTamanho,
  formatarTempoRelativo,
  iniciarComMaiuscula,
  pluralizar,
} from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { DonoDoObjeto, ItemConsulta, Medida, SecaoCopiavel } from './DetalheObjeto';
import estilos from './DetalheObjeto.module.css';
import { GraficoCrescimento } from './GraficoCrescimento';
import { NomeObjeto } from './NomeObjeto';
import { SeloSituacaoTabela } from './SeloSituacaoTabela';
import proprios from './DetalheTabela.module.css';

interface AcoesDoDetalhe {
  aoVerHistorico: (consulta: ConsultaDetalhadaDTO) => void;
  aoVerPlano: (consulta: ConsultaDetalhadaDTO) => void;
  aoAbrirIndice: (indice: IndiceDaTabelaDTO, tabela: TabelaDTO) => void;
  aoVerIndices: (tabela: TabelaDTO) => void;
  aoAbrirVisao: (id: string) => void;
  aoAbrirFuncao: (id: string) => void;
  aoAbrirPapel: (nome: string) => void;
  quemAcessa?: (id: string) => ReactNode;
}

interface DetalheTabelaProps extends AcoesDoDetalhe {
  tabela: TabelaDTO | null;
  contexto: ContextoDasTabelas;
  simulada: boolean;
  posicao: number | null;
  total: number;
  aoPercorrer: (sentido: SentidoDoPasso) => void;
  aoFechar: () => void;
  focoAoFechar: () => HTMLElement | null;
}

const iconeDaVisao: Record<Exclude<TipoObjetoBanco, 'TABELA'>, LucideIcon> = {
  VISAO: Eye,
  VISAO_MATERIALIZADA: Layers,
};

export function DetalheTabela({
  tabela,
  contexto,
  simulada,
  posicao,
  total,
  aoPercorrer,
  aoFechar,
  focoAoFechar,
  ...acoes
}: DetalheTabelaProps) {
  const [exibida, setExibida] = useState(tabela);
  if (tabela && tabela !== exibida) setExibida(tabela);

  const temAnterior = posicao !== null && posicao > 1;
  const temSeguinte = posicao !== null && posicao < total;

  return (
    <Modal
      aberto={tabela !== null}
      aoFechar={aoFechar}
      titulo="Detalhes da tabela"
      descricao={exibida ? descreverTabela(exibida) : undefined}
      tamanho="lg"
      focoAoFechar={focoAoFechar}
      rodape={
        <div className={estilos.navegacao}>
          <div className={estilos.passos} role="group" aria-label="Percorrer as tabelas da lista">
            <BotaoIcone
              icone={ChevronUp}
              rotulo="Tabela anterior"
              variante="secundario"
              aria-disabled={temAnterior ? undefined : true}
              onClick={() => temAnterior && aoPercorrer(-1)}
            />
            <BotaoIcone
              icone={ChevronDown}
              rotulo="Próxima tabela"
              variante="secundario"
              aria-disabled={temSeguinte ? undefined : true}
              onClick={() => temSeguinte && aoPercorrer(1)}
            />
          </div>
          <p className={estilos.posicao} role="status">
            {posicao !== null ? (
              <>
                <span className={estilos.palavraDaPosicao}>Tabela </span>
                <span className="numeros">{formatarNumero(posicao)}</span> de <span className="numeros">{formatarNumero(total)}</span>
              </>
            ) : (
              'Fora dos filtros da lista'
            )}
          </p>
        </div>
      }
    >
      {exibida ? <CorpoDetalhe key={exibida.id} tabela={exibida} contexto={contexto} simulada={simulada} {...acoes} /> : null}
    </Modal>
  );
}

function descreverTabela(tabela: TabelaDTO): string {
  return `Tabela ${tabela.id}, com ${formatarNumero(tabela.linhas)} ${pluralizar(tabela.linhas, 'linha', 'linhas')} e ${formatarTamanho(tamanhoTotal(tabela))}.`;
}

interface CorpoDetalheProps extends AcoesDoDetalhe {
  tabela: TabelaDTO;
  contexto: ContextoDasTabelas;
  simulada: boolean;
}

function CorpoDetalhe({ tabela, contexto, simulada, ...acoes }: CorpoDetalheProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const avisos = avisosDaTabela(tabela, contexto);
  const comando = comandoDaTabela(tabela);
  const particoes = tabela.particionamento?.particoes.length ?? 0;

  useLayoutEffect(() => {
    raiz.current?.parentElement?.scrollTo({ top: 0 });
  }, []);

  return (
    <div ref={raiz} className={estilos.detalhe}>
      <header className={estilos.identidade}>
        <p className={`${estilos.nome} codigo`}>
          <NomeObjeto esquema={tabela.esquema} nome={tabela.nome} classeEsquema={estilos.esquema} />
        </p>
        <p className={juntarClasses(estilos.descricao, !tabela.descricao && estilos.semDescricao)}>
          {tabela.descricao ?? 'O banco não tem uma descrição para esta tabela.'}
        </p>
        <DonoDoObjeto dono={tabela.dono} aoAbrir={acoes.aoAbrirPapel} />
        <div className={estilos.selos}>
          {particoes > 0 ? (
            <Selo tom="neutro" icone={Layers}>
              Particionada em {formatarNumero(particoes)}
            </Selo>
          ) : null}
          {situacoesDaTabela(tabela).map((situacao) => (
            <SeloSituacaoTabela key={situacao} situacao={situacao} />
          ))}
          {simulada ? (
            <Selo tom="aviso" icone={FlaskConical}>
              Dados demonstrativos
            </Selo>
          ) : null}
        </div>
      </header>

      {avisos.map((aviso) => (
        <Nota key={aviso.texto} tom={aviso.tom} icone={aviso.tom === 'erro' ? OctagonAlert : TriangleAlert}>
          {aviso.texto}
        </Nota>
      ))}

      {comando ? (
        <SecaoCopiavel
          id="titulo-comando-tabela"
          titulo={comando.rotulo}
          texto={comando.comando}
          copiado="Copiado"
          anuncio="Comando copiado para a área de transferência."
          tituloDoErro="Não foi possível copiar o comando"
          descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto do comando e copie por lá."
        >
          <p className={estilos.leitura}>{comando.explicacao}</p>
        </SecaoCopiavel>
      ) : null}

      {tabela.indicesSugeridos.map((sugestao, posicao) => (
        <SecaoCopiavel
          key={sugestao.comando}
          id={`titulo-sugestao-tabela-${posicao}`}
          titulo={`Índice sugerido em (${sugestao.colunas.join(', ')})`}
          texto={sugestao.comando}
          copiado="Copiado"
          anuncio="Comando copiado para a área de transferência."
          tituloDoErro="Não foi possível copiar o comando"
          descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto do comando e copie por lá."
        >
          <p className={estilos.leitura}>
            Os planos de execução das consultas que leem {tabela.nome} inteira pedem este índice.
            {sugestao.extensao ? ` Ele precisa da extensão ${sugestao.extensao}.` : ''} CONCURRENTLY cria o índice sem bloquear
            as gravações. O Orynt não executa nada no banco.
          </p>
        </SecaoCopiavel>
      ))}

      <SecaoCrescimento tabela={tabela} />
      <SecaoEspaco tabela={tabela} />
      <SecaoManutencao tabela={tabela} contexto={contexto} />
      <SecaoAutovacuum tabela={tabela} />
      <SecaoUso tabela={tabela} />
      <SecaoConsultas tabela={tabela} aoVerHistorico={acoes.aoVerHistorico} aoVerPlano={acoes.aoVerPlano} />
      {tabela.particionamento ? <SecaoParticoes tabela={tabela} contexto={contexto} /> : null}
      <SecaoColunas tabela={tabela} />
      <SecaoIndices tabela={tabela} aoAbrirIndice={acoes.aoAbrirIndice} aoVerIndices={acoes.aoVerIndices} />
      <SecaoGatilhos tabela={tabela} aoAbrirFuncao={acoes.aoAbrirFuncao} />
      <SecaoVisoes tabela={tabela} aoAbrirVisao={acoes.aoAbrirVisao} />
      {acoes.quemAcessa?.(tabela.id)}
    </div>
  );
}

function SecaoCrescimento({ tabela }: { tabela: TabelaDTO }) {
  const resumo = resumirCrescimento(tabela);
  return (
    <section className={estilos.secao} aria-labelledby="titulo-crescimento-tabela">
      <h3 className={estilos.tituloSecao} id="titulo-crescimento-tabela">
        Crescimento em 30 dias
      </h3>
      {resumo ? (
        <dl className={estilos.medidas}>
          <Medida rotulo="Tamanho hoje" valor={formatarTamanho(resumo.tamanhoFinal)} />
          <Medida rotulo="No período" valor={formatarComSinal(resumo.variacaoBytes, formatarTamanho)} />
          <Medida rotulo="Linhas hoje" valor={formatarNumero(resumo.linhasFinais)} />
          <Medida
            rotulo="Linhas no período"
            valor={formatarComSinal(resumo.variacaoLinhas, formatarNumero)}
          />
        </dl>
      ) : null}
      <p className={estilos.leitura}>{fraseDoCrescimento(tabela)}</p>
      {resumo ? <GraficoCrescimento pontos={tabela.crescimento} /> : null}
    </section>
  );
}

function SecaoEspaco({ tabela }: { tabela: TabelaDTO }) {
  return (
    <section className={estilos.secao} aria-labelledby="titulo-espaco-tabela">
      <h3 className={estilos.tituloSecao} id="titulo-espaco-tabela">
        Espaço em disco
      </h3>
      <dl className={estilos.medidas}>
        <Medida rotulo="Total" valor={formatarTamanho(tamanhoTotal(tabela))} />
        <Medida rotulo="Dados" valor={formatarTamanho(tabela.tamanhoDadosBytes)} />
        <Medida rotulo="Índices" valor={formatarTamanho(tabela.tamanhoIndicesBytes)} />
        <Medida rotulo="TOAST" valor={formatarTamanho(tabela.tamanhoToastBytes)} />
      </dl>
      <p className={estilos.leitura}>
        O TOAST guarda à parte os valores grandes, como textos longos e JSON.
      </p>
    </section>
  );
}

function instanteOuSemRegistro(instante: string | null, geradoEm: string): { valor: string; dica?: string } {
  if (!instante) return { valor: 'Sem registro' };
  return {
    valor: iniciarComMaiuscula(formatarTempoRelativo(instante, new Date(geradoEm))),
    dica: formatarDataHoraCompleta(new Date(instante)),
  };
}

function SecaoManutencao({ tabela, contexto }: { tabela: TabelaDTO; contexto: ContextoDasTabelas }) {
  const parte = parteDoLimite(tabela.idadeTransacoes, tabela.limiteCongelamento);
  const percentualDaIdade = `${formatarNumero(Math.round(parte * 100))}%`;
  const mortas = tabela.linhas > 0 ? tabela.linhasMortas / tabela.linhas : 0;
  const marcos: [string, string | null][] = [
    ['VACUUM manual', tabela.ultimoVacuum],
    ['VACUUM automático', tabela.ultimoAutovacuum],
    ['ANALYZE manual', tabela.ultimoAnalyze],
    ['ANALYZE automático', tabela.ultimoAutoanalyze],
  ];
  const ultimoAnalyze = maisRecente(tabela.ultimoAnalyze, tabela.ultimoAutoanalyze);

  return (
    <section className={estilos.secao} aria-labelledby="titulo-manutencao-tabela">
      <h3 className={estilos.tituloSecao} id="titulo-manutencao-tabela">
        Linhas e manutenção
      </h3>
      <dl className={estilos.medidas}>
        <Medida rotulo="Linhas vivas" valor={formatarNumero(tabela.linhas)} />
        <Medida
          rotulo="Linhas mortas"
          valor={formatarNumero(tabela.linhasMortas)}
          dica={`${formatarNumero(Math.round(mortas * 100))}% das vivas`}
        />
        <Medida
          rotulo="Linhas alteradas"
          valor={formatarNumero(tabela.alteracoesDesdeAnalyze)}
          dica="Desde o último ANALYZE"
        />
        <Medida
          rotulo="Idade das transações"
          valor={percentualDaIdade}
          dica={`${formatarNumero(tabela.idadeTransacoes)} de ${formatarNumero(tabela.limiteCongelamento)}`}
        />
      </dl>
      <dl className={estilos.colunas}>
        {marcos.map(([rotulo, instante]) => {
          const { valor, dica } = instanteOuSemRegistro(instante, contexto.geradoEm);
          return (
            <div key={rotulo} className={estilos.coluna}>
              <dt className={estilos.nomeColuna}>{rotulo}</dt>
              <dd className={juntarClasses(estilos.tipoColuna, 'numeros')} title={dica}>
                {valor}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className={estilos.leitura}>
        A idade das transações é a distância até o limite em que o autovacuum congela a tabela à força: {percentualDaIdade} do
        limite de {formatarQuantidade(tabela.limiteCongelamento)}.
        {ultimoAnalyze
          ? ` O último ANALYZE, que atualiza as estatísticas do planejador, foi ${formatarTempoRelativo(ultimoAnalyze, new Date(contexto.geradoEm))}.`
          : ' Não há registro de ANALYZE nesta tabela.'}
      </p>
    </section>
  );
}

function SecaoAutovacuum({ tabela }: { tabela: TabelaDTO }) {
  const restaurar = comandoQueRestauraOsAjustes(tabela);

  return (
    <section className={estilos.secao} aria-labelledby="titulo-autovacuum-tabela">
      <h3 className={estilos.tituloSecao} id="titulo-autovacuum-tabela">
        Autovacuum desta tabela
      </h3>
      {tabela.autovacuum.length === 0 ? (
        <p className={estilos.leitura}>A tabela segue a configuração de autovacuum do servidor.</p>
      ) : (
        <>
          <dl className={proprios.ajustes}>
            {tabela.autovacuum.map((ajuste) => {
              const { rotulo, efeito } = descreverAjuste(ajuste);
              return (
                <div key={ajuste.parametro} className={proprios.ajuste}>
                  <dt className={proprios.rotuloAjuste}>
                    {rotulo}
                    <span className={`${proprios.parametro} codigo`}>
                      {ajuste.parametro} = {ajuste.valor}
                    </span>
                  </dt>
                  <dd className={proprios.efeitoAjuste}>{efeito}</dd>
                </div>
              );
            })}
          </dl>
          {restaurar ? (
            <SecaoCopiavel
              id="titulo-restaurar-autovacuum"
              titulo="Comando que volta ao padrão do servidor"
              texto={restaurar}
              copiado="Copiado"
              anuncio="Comando copiado para a área de transferência."
              tituloDoErro="Não foi possível copiar o comando"
              descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto do comando e copie por lá."
            >
              <p className={estilos.leitura}>
                {autovacuumDesligado(tabela)
                  ? 'Liga de novo o autovacuum nesta tabela. Antes, confira por que ele foi desligado: às vezes foi de propósito, durante uma carga grande. O Orynt não executa nada no banco.'
                  : 'Apaga os ajustes desta tabela, que passa a seguir a configuração do servidor. O Orynt não executa nada no banco.'}
              </p>
            </SecaoCopiavel>
          ) : null}
        </>
      )}
    </section>
  );
}

function SecaoUso({ tabela }: { tabela: TabelaDTO }) {
  const foraDoHot = Math.max(0, tabela.atualizacoes - tabela.atualizacoesHot);
  const gravacoes = tabela.insercoes + tabela.atualizacoes + tabela.exclusoes;
  const composicao = composicaoDasGravacoes(tabela);
  const linhasLidas = tabela.linhasLidasSequencialmente + tabela.linhasLidasPorIndice;

  return (
    <section className={estilos.secao} aria-labelledby="titulo-uso-tabela">
      <h3 className={estilos.tituloSecao} id="titulo-uso-tabela">
        Uso nos últimos 30 dias
      </h3>
      <dl className={estilos.medidas}>
        <Medida
          rotulo="Leituras inteiras"
          valor={formatarQuantidade(tabela.leiturasSequenciais)}
          dica={formatarNumero(tabela.leiturasSequenciais)}
        />
        <Medida
          rotulo="Leituras por índice"
          valor={formatarQuantidade(tabela.leiturasPorIndice)}
          dica={formatarNumero(tabela.leiturasPorIndice)}
        />
        <Medida rotulo="Linhas lidas" valor={formatarQuantidade(linhasLidas)} dica={formatarNumero(linhasLidas)} />
        <Medida rotulo="Gravações" valor={formatarQuantidade(gravacoes)} dica={composicao ?? undefined} />
      </dl>
      <p className={estilos.leitura}>
        {composicao ? `No período foram ${composicao}.` : 'Nenhuma linha foi gravada nos últimos 30 dias.'}
        {tabela.atualizacoes > 0
          ? ` ${formatarNumero(foraDoHot)} ${pluralizar(foraDoHot, 'atualização gravou', 'atualizações gravaram')} também nos índices: a HOT só é possível quando nenhuma coluna indexada muda.`
          : ''}
      </p>
    </section>
  );
}

function SecaoConsultas({
  tabela,
  aoVerHistorico,
  aoVerPlano,
}: Pick<AcoesDoDetalhe, 'aoVerHistorico' | 'aoVerPlano'> & { tabela: TabelaDTO }) {
  return (
    <section className={estilos.secao} aria-labelledby="titulo-consultas-tabela">
      <h3 className={estilos.tituloSecao} id="titulo-consultas-tabela">
        Consultas cujo plano lê a tabela{' '}
        <span className={`${estilos.contagem} numeros`}>{formatarNumero(tabela.leituras.length)}</span>
      </h3>
      {tabela.leituras.length > 0 ? (
        <ul className={estilos.consultas}>
          {tabela.leituras.map((leitura) => (
            <li key={`${leitura.consulta.id}-${leitura.etapa}-${leitura.indice ?? ''}`}>
              <ItemConsulta
                consulta={leitura.consulta}
                etapa={
                  <>
                    <span className="codigo">{leitura.etapa}</span>
                    {leitura.indice ? (
                      <>
                        {' '}
                        em <span className="codigo">{leitura.indice}</span>
                      </>
                    ) : null}{' '}
                    · {descreverLeitura(leitura.etapa, leitura.leiturasPorExecucao)}
                  </>
                }
              >
                <Botao variante="terciario" tamanho="sm" icone={ListTree} onClick={() => aoVerPlano(leitura.consulta)}>
                  Ver plano
                </Botao>
                <Botao variante="terciario" tamanho="sm" icone={History} onClick={() => aoVerHistorico(leitura.consulta)}>
                  Ver histórico
                </Botao>
              </ItemConsulta>
            </li>
          ))}
        </ul>
      ) : (
        <p className={estilos.leitura}>Nenhum plano registrado nos últimos 30 dias lê esta tabela.</p>
      )}
    </section>
  );
}

function SecaoParticoes({ tabela, contexto }: { tabela: TabelaDTO; contexto: ContextoDasTabelas }) {
  const particionamento = tabela.particionamento;
  if (!particionamento) return null;
  const estrategia = { RANGE: 'faixas', LIST: 'listas de valores', HASH: 'hash' }[particionamento.estrategia];

  return (
    <section className={estilos.secao} aria-labelledby="titulo-particoes-tabela">
      <h3 className={estilos.tituloSecao} id="titulo-particoes-tabela">
        Partições <span className={`${estilos.contagem} numeros`}>{formatarNumero(particionamento.particoes.length)}</span>
      </h3>
      <p className={estilos.leitura}>
        Dividida por {estrategia} de <span className="codigo">{particionamento.chave}</span>. Os números da tabela são a soma das
        partições, e a porcentagem à direita é a idade das transações de cada uma em relação ao limite de congelamento.
      </p>
      <ul className={estilos.objetos}>
        {particionamento.particoes.map((particao) => (
          <li key={particao.id}>
            <ItemParticao particao={particao} limite={tabela.limiteCongelamento} geradoEm={contexto.geradoEm} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ItemParticao({ particao, limite, geradoEm }: { particao: ParticaoDTO; limite: number; geradoEm: string }) {
  const parte = parteDoLimite(particao.idadeTransacoes, limite);
  const alta = parte > 0.5;
  const autovacuum = particao.ultimoAutovacuum
    ? `autovacuum ${formatarTempoRelativo(particao.ultimoAutovacuum, new Date(geradoEm))}`
    : 'sem registro de autovacuum';

  return (
    <div className={estilos.objeto}>
      <Layers className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
      <span className={estilos.textosObjeto}>
        <span className={`${estilos.nomeObjeto} codigo`}>{particao.nome}</span>
        <span className={estilos.tipoObjeto}>
          <span className="numeros">{formatarNumero(particao.linhas)}</span> linhas ·{' '}
          <span className="numeros">{formatarTamanho(particao.tamanhoBytes)}</span> · {autovacuum}
        </span>
      </span>
      <span
        className={juntarClasses(proprios.idade, alta && proprios.idadeAlta, 'numeros')}
        title={`Idade das transações: ${formatarNumero(particao.idadeTransacoes)} de ${formatarNumero(limite)}`}
      >
        {formatarNumero(Math.round(parte * 100))}%<span className="visualmente-oculto"> do limite de congelamento</span>
      </span>
    </div>
  );
}

function SecaoColunas({ tabela }: { tabela: TabelaDTO }) {
  const chave = new Set(tabela.chavePrimaria ?? []);

  return (
    <section className={estilos.secao} aria-labelledby="titulo-colunas-tabela">
      <h3 className={estilos.tituloSecao} id="titulo-colunas-tabela">
        Colunas <span className={`${estilos.contagem} numeros`}>{formatarNumero(tabela.colunas.length)}</span>
      </h3>
      <dl className={estilos.colunas}>
        {tabela.colunas.map((coluna) => (
          <div key={coluna.nome} className={estilos.coluna}>
            <dt className={`${estilos.nomeColuna} ${proprios.nomeColuna} codigo`}>
              {chave.has(coluna.nome) ? (
                <KeyRound className={proprios.chave} size={13} strokeWidth={2.25} aria-label="Chave primária" />
              ) : null}
              {coluna.nome}
            </dt>
            <dd
              className={`${estilos.tipoColuna} codigo`}
              title={[coluna.tipo, coluna.padrao ? `padrão ${coluna.padrao}` : null].filter(Boolean).join(', ')}
            >
              {tipoCurto(coluna.tipo)}
              {coluna.anulavel ? '' : ' not null'}
            </dd>
          </div>
        ))}
      </dl>
      {tabela.chavePrimaria === null ? (
        <p className={estilos.leitura}>A tabela não tem chave primária.</p>
      ) : (
        <p className={estilos.leitura}>
          Chave primária em <span className="codigo">({tabela.chavePrimaria.join(', ')})</span>.
        </p>
      )}
    </section>
  );
}

function SecaoIndices({
  tabela,
  aoAbrirIndice,
  aoVerIndices,
}: Pick<AcoesDoDetalhe, 'aoAbrirIndice' | 'aoVerIndices'> & { tabela: TabelaDTO }) {
  return (
    <section className={estilos.secao} aria-labelledby="titulo-indices-tabela">
      <div className={estilos.cabecalhoSecao}>
        <h3 className={estilos.tituloSecao} id="titulo-indices-tabela">
          Índices <span className={`${estilos.contagem} numeros`}>{formatarNumero(tabela.indices.length)}</span>
        </h3>
        {tabela.indices.length > 0 ? (
          <Botao variante="terciario" tamanho="sm" iconeDireita={ChevronRight} onClick={() => aoVerIndices(tabela)}>
            Ver em Índices
          </Botao>
        ) : null}
      </div>
      {tabela.indices.length > 0 ? (
        <ul className={estilos.objetos}>
          {tabela.indices.map((indice) => (
            <li key={indice.id}>
              <button
                type="button"
                className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)}
                onClick={() => aoAbrirIndice(indice, tabela)}
              >
                <Waypoints className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                <span className={estilos.textosObjeto}>
                  <span className={`${estilos.nomeObjeto} codigo`}>{indice.nome}</span>
                  <span className={estilos.tipoObjeto}>
                    <span className="codigo">({colunasDoIndice(indice)})</span> · {descreverIndice(indice)}
                  </span>
                </span>
                <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                <span className="visualmente-oculto">. Abrir este índice em Índices</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={estilos.leitura}>A tabela não tem nenhum índice: toda busca nela lê a tabela inteira.</p>
      )}
    </section>
  );
}

function descreverIndice(indice: IndiceDaTabelaDTO): string {
  const partes = [
    indice.restricao ? rotuloRestricaoIndice[indice.restricao] : indice.unico ? 'Único' : null,
    indice.valido ? null : 'Inválido',
    formatarTamanho(indice.tamanhoBytes),
    `${formatarQuantidade(indice.leituras)} ${pluralizar(indice.leituras, 'leitura', 'leituras')}`,
  ];
  return partes.filter((parte): parte is string => parte !== null).join(' · ');
}

function SecaoGatilhos({ tabela, aoAbrirFuncao }: Pick<AcoesDoDetalhe, 'aoAbrirFuncao'> & { tabela: TabelaDTO }) {
  return (
    <section className={estilos.secao} aria-labelledby="titulo-gatilhos-tabela">
      <h3 className={estilos.tituloSecao} id="titulo-gatilhos-tabela">
        Gatilhos <span className={`${estilos.contagem} numeros`}>{formatarNumero(tabela.gatilhos.length)}</span>
      </h3>
      {tabela.gatilhos.length > 0 ? (
        <ul className={estilos.objetos}>
          {tabela.gatilhos.map((gatilho) => (
            <li key={gatilho.nome}>
              <button
                type="button"
                className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)}
                onClick={() => aoAbrirFuncao(gatilho.funcao)}
              >
                <Zap className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                <span className={estilos.textosObjeto}>
                  <span className={`${estilos.nomeObjeto} codigo`}>{gatilho.nome}</span>
                  <span className={estilos.tipoObjeto}>
                    {descreverDisparo(gatilho)} · chama <span className="codigo">{gatilho.funcao}</span>
                  </span>
                  {gatilho.ativo ? null : (
                    <Selo tom="aviso" className={proprios.seloNaLista}>
                      Desativado
                    </Selo>
                  )}
                </span>
                <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                <span className="visualmente-oculto">. Abrir esta função em Funções</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={estilos.leitura}>A tabela não tem gatilhos: nenhuma gravação nela dispara uma função.</p>
      )}
    </section>
  );
}

function SecaoVisoes({ tabela, aoAbrirVisao }: Pick<AcoesDoDetalhe, 'aoAbrirVisao'> & { tabela: TabelaDTO }) {
  return (
    <section className={estilos.secao} aria-labelledby="titulo-visoes-tabela">
      <h3 className={estilos.tituloSecao} id="titulo-visoes-tabela">
        Visões que dependem dela <span className={`${estilos.contagem} numeros`}>{formatarNumero(tabela.usadaPor.length)}</span>
      </h3>
      {tabela.usadaPor.length > 0 ? (
        <ul className={estilos.objetos}>
          {tabela.usadaPor.map((visao) => {
            const id = idDoObjeto(visao);
            const Icone = iconeDaVisao[visao.tipo === 'VISAO_MATERIALIZADA' ? 'VISAO_MATERIALIZADA' : 'VISAO'];
            return (
              <li key={id}>
                <button
                  type="button"
                  className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)}
                  onClick={() => aoAbrirVisao(id)}
                >
                  <Icone className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                  <span className={estilos.textosObjeto}>
                    <span className={`${estilos.nomeObjeto} codigo`}>
                      <NomeObjeto esquema={visao.esquema} nome={visao.nome} classeEsquema={estilos.esquema} />
                    </span>
                    <span className={estilos.tipoObjeto}>{rotuloTipoObjeto[visao.tipo]}</span>
                  </span>
                  <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                  <span className="visualmente-oculto">. Abrir esta visão em Visões</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={estilos.leitura}>Nenhuma visão lê esta tabela. Ela pode ser alterada sem quebrar uma visão.</p>
      )}
    </section>
  );
}
