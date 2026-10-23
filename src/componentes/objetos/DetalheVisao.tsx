import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  Clock,
  DatabaseZap,
  Eye,
  EyeOff,
  History,
  Layers,
  ListTree,
  OctagonAlert,
  Table2,
  TriangleAlert,
} from 'lucide-react';
import { Botao, BotaoIcone, Modal, Nota, Selo } from '@/componentes/ui';
import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import type { ReferenciaObjetoDTO, TipoObjetoBanco, VisaoDTO } from '@/modelos/objetos';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { avisosDaVisao, definicaoLegivel, idDoObjeto, rotuloTipoObjeto, situacaoDaMaterializada } from '@/regras/visoes';
import type { ContextoDasVisoes } from '@/regras/visoes';
import {
  formatarDataHoraCompleta,
  formatarNumero,
  formatarTamanho,
  formatarTempoRelativo,
  iniciarComMaiuscula,
} from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { DonoDoObjeto, IndiceDoDetalhe, ItemConsulta, Medida, SecaoCopiavel } from './DetalheObjeto';
import estilos from './DetalheObjeto.module.css';
import { NomeObjeto } from './NomeObjeto';
import { SeloTipoVisao } from './SeloTipoVisao';

const iconeDoObjeto: Record<TipoObjetoBanco, LucideIcon> = {
  TABELA: Table2,
  VISAO: Eye,
  VISAO_MATERIALIZADA: Layers,
};

interface DetalheVisaoProps {
  visao: VisaoDTO | null;
  contexto: ContextoDasVisoes;
  conhecidas: ReadonlySet<string>;
  posicao: number | null;
  total: number;
  aoPercorrer: (sentido: SentidoDoPasso) => void;
  aoAbrirObjeto: (id: string) => void;
  aoAbrirPapel: (nome: string) => void;
  aoVerHistorico: (consulta: ConsultaDetalhadaDTO) => void;
  aoVerPlano: (consulta: ConsultaDetalhadaDTO) => void;
  quemAcessa?: (id: string) => ReactNode;
  aoFechar: () => void;
  focoAoFechar: () => HTMLElement | null;
}

interface AcoesDasConsultas {
  aoVerHistorico: (consulta: ConsultaDetalhadaDTO) => void;
  aoVerPlano: (consulta: ConsultaDetalhadaDTO) => void;
}

export function DetalheVisao({
  visao,
  contexto,
  conhecidas,
  posicao,
  total,
  aoPercorrer,
  aoAbrirObjeto,
  aoAbrirPapel,
  aoVerHistorico,
  aoVerPlano,
  quemAcessa,
  aoFechar,
  focoAoFechar,
}: DetalheVisaoProps) {
  const [exibida, setExibida] = useState(visao);
  if (visao && visao !== exibida) setExibida(visao);

  const temAnterior = posicao !== null && posicao > 1;
  const temSeguinte = posicao !== null && posicao < total;

  return (
    <Modal
      aberto={visao !== null}
      aoFechar={aoFechar}
      titulo="Detalhes da view"
      descricao={exibida ? descreverVisao(exibida) : undefined}
      tamanho="lg"
      focoAoFechar={focoAoFechar}
      rodape={
        <div className={estilos.navegacao}>
          <div className={estilos.passos} role="group" aria-label="Percorrer as views da lista">
            <BotaoIcone
              icone={ChevronUp}
              rotulo="View anterior"
              variante="secundario"
              aria-disabled={temAnterior ? undefined : true}
              onClick={() => temAnterior && aoPercorrer(-1)}
            />
            <BotaoIcone
              icone={ChevronDown}
              rotulo="Próxima view"
              variante="secundario"
              aria-disabled={temSeguinte ? undefined : true}
              onClick={() => temSeguinte && aoPercorrer(1)}
            />
          </div>
          <p className={estilos.posicao} role="status">
            {posicao !== null ? (
              <>
                <span className={estilos.palavraDaPosicao}>View </span>
                <span className="numeros">{formatarNumero(posicao)}</span> de <span className="numeros">{formatarNumero(total)}</span>
              </>
            ) : (
              'Fora dos filtros da lista'
            )}
          </p>
        </div>
      }
    >
      {exibida ? (
        <CorpoDetalhe
          key={exibida.id}
          visao={exibida}
          contexto={contexto}
          conhecidas={conhecidas}
          aoAbrirObjeto={aoAbrirObjeto}
          aoAbrirPapel={aoAbrirPapel}
          aoVerHistorico={aoVerHistorico}
          aoVerPlano={aoVerPlano}
          quemAcessa={quemAcessa}
        />
      ) : null}
    </Modal>
  );
}

function descreverVisao(visao: VisaoDTO): string {
  const tipo = visao.tipo === 'MATERIALIZADA' ? 'View materializada' : 'View comum';
  return `${tipo} do esquema ${visao.esquema}, de ${visao.dono}.`;
}

interface CorpoDetalheProps extends AcoesDasConsultas {
  visao: VisaoDTO;
  contexto: ContextoDasVisoes;
  conhecidas: ReadonlySet<string>;
  aoAbrirObjeto: (id: string) => void;
  aoAbrirPapel: (nome: string) => void;
  quemAcessa?: (id: string) => ReactNode;
}

function CorpoDetalhe({
  visao,
  contexto,
  conhecidas,
  aoAbrirObjeto,
  aoAbrirPapel,
  aoVerHistorico,
  aoVerPlano,
  quemAcessa,
}: CorpoDetalheProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const avisos = avisosDaVisao(visao, contexto);
  const semLeitura = contexto.semLeitura.has(visao.id);

  useLayoutEffect(() => {
    raiz.current?.parentElement?.scrollTo({ top: 0 });
  }, []);

  return (
    <div ref={raiz} className={estilos.detalhe}>
      <header className={estilos.identidade}>
        <p className={`${estilos.nome} codigo`}>
          <NomeObjeto esquema={visao.esquema} nome={visao.nome} classeEsquema={estilos.esquema} />
        </p>
        <p className={juntarClasses(estilos.descricao, !visao.descricao && estilos.semDescricao)}>
          {visao.descricao ?? 'O banco não tem uma descrição para esta view.'}
        </p>
        <DonoDoObjeto dono={visao.dono} aoAbrir={aoAbrirPapel} />
        <div className={estilos.selos}>
          <SeloTipoVisao tipo={visao.tipo} />
          <SeloSituacao visao={visao} geradoEm={contexto.geradoEm} />
          {semLeitura ? (
            <Selo tom="aviso" icone={EyeOff}>
              Sem leitura em 30 dias
            </Selo>
          ) : null}
        </div>
      </header>

      <IndiceDoDetalhe raiz={raiz} />

      {avisos.map((aviso) => (
        <Nota key={aviso.texto} tom={aviso.tom} icone={aviso.tom === 'erro' ? OctagonAlert : TriangleAlert}>
          {aviso.texto}
        </Nota>
      ))}

      {visao.materializacao ? (
        <SecaoMaterializacao visao={visao} geradoEm={contexto.geradoEm} aoVerHistorico={aoVerHistorico} aoVerPlano={aoVerPlano} />
      ) : null}

      <SecaoDefinicao visao={visao} />

      <section className={estilos.secao} aria-labelledby="titulo-colunas-visao" data-indice="Colunas">
        <h3 className={estilos.tituloSecao} id="titulo-colunas-visao">
          Colunas <span className={`${estilos.contagem} numeros`}>{formatarNumero(visao.colunas.length)}</span>
        </h3>
        <dl className={estilos.colunas}>
          {visao.colunas.map((coluna) => (
            <div key={coluna.nome} className={estilos.coluna}>
              <dt className={`${estilos.nomeColuna} codigo`}>{coluna.nome}</dt>
              <dd className={`${estilos.tipoColuna} codigo`}>{coluna.tipo}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-dependencias-visao" data-indice="Dependências">
        <h3 className={estilos.tituloSecao} id="titulo-dependencias-visao">
          Dependências
        </h3>
        <div className={estilos.dependencias}>
          <ListaDeObjetos
            titulo="Depende de"
            objetos={visao.dependeDe}
            vazio="A view não lê nenhuma tabela ou view."
            conhecidas={conhecidas}
            aoAbrirObjeto={aoAbrirObjeto}
          />
          <ListaDeObjetos
            titulo="Usada por"
            objetos={visao.usadaPor}
            vazio="Nenhuma view depende desta. Ela pode ser alterada sem quebrar outra view."
            conhecidas={conhecidas}
            aoAbrirObjeto={aoAbrirObjeto}
          />
        </div>
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-consultas-visao" data-indice="Consultas">
        <h3 className={estilos.tituloSecao} id="titulo-consultas-visao">
          Consultas que leem a view{' '}
          <span className={`${estilos.contagem} numeros`}>{formatarNumero(visao.consultas.length)}</span>
        </h3>
        {visao.consultas.length > 0 ? (
          <ul className={estilos.consultas}>
            {visao.consultas.map((consulta) => (
              <li key={consulta.id}>
                <ConsultaDaVisao consulta={consulta} aoVerHistorico={aoVerHistorico} aoVerPlano={aoVerPlano} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={estilos.leitura}>
            {semLeitura
              ? 'Nenhuma consulta leu esta view nos últimos 30 dias.'
              : 'Nenhuma consulta leu esta view diretamente nos últimos 30 dias. Ela é lida por meio de outra view, listada em “Usada por”.'}
          </p>
        )}
      </section>
      {quemAcessa?.(visao.id)}
    </div>
  );
}

function SeloSituacao({ visao, geradoEm }: { visao: VisaoDTO; geradoEm: string }) {
  const situacao = situacaoDaMaterializada(visao, geradoEm);
  if (situacao === null) return null;
  if (situacao === 'NAO_POPULADA') {
    return (
      <Selo tom="erro" icone={DatabaseZap}>
        Sem dados
      </Selo>
    );
  }
  if (situacao === 'DESATUALIZADA') {
    return (
      <Selo tom="aviso" icone={Clock}>
        Desatualizada
      </Selo>
    );
  }
  return (
    <Selo tom="sucesso" icone={CircleCheck}>
      Atualizada
    </Selo>
  );
}

function SecaoMaterializacao({
  visao,
  geradoEm,
  aoVerHistorico,
  aoVerPlano,
}: AcoesDasConsultas & { visao: VisaoDTO; geradoEm: string }) {
  const materializacao = visao.materializacao;
  if (!materializacao) return null;
  const ultima = materializacao.ultimaAtualizacao;
  const atualizacao = materializacao.atualizacao;
  const atualizacoes = atualizacao?.quantidadeExecucoes ?? 0;

  return (
    <section className={estilos.secao} aria-labelledby="titulo-materializacao-visao" data-indice="Dados guardados">
      <h3 className={estilos.tituloSecao} id="titulo-materializacao-visao">
        Dados guardados
      </h3>
      <dl className={estilos.medidas}>
        <Medida rotulo="Tamanho" valor={formatarTamanho(materializacao.tamanhoBytes)} />
        <Medida rotulo="Linhas" valor={formatarNumero(materializacao.linhas)} />
        <Medida
          rotulo="Última atualização"
          valor={
            !materializacao.populada
              ? 'Sem dados'
              : ultima
                ? iniciarComMaiuscula(formatarTempoRelativo(ultima, new Date(geradoEm)))
                : 'Sem registro'
          }
          dica={ultima ? formatarDataHoraCompleta(new Date(ultima)) : undefined}
        />
        <Medida rotulo="Atualizações em 30 dias" valor={formatarNumero(atualizacoes)} />
      </dl>
      {atualizacao ? (
        <div className={estilos.comando}>
          <p className={estilos.rotuloComando}>Comando que a atualiza</p>
          <ConsultaDaVisao consulta={atualizacao} aoVerHistorico={aoVerHistorico} aoVerPlano={aoVerPlano} semPlano />
        </div>
      ) : (
        <p className={estilos.leitura}>
          Nenhum comando REFRESH desta view apareceu nos últimos 30 dias. Se ela é atualizada por um agendamento, confira se
          ele ainda roda.
        </p>
      )}
    </section>
  );
}

function SecaoDefinicao({ visao }: { visao: VisaoDTO }) {
  return (
    <SecaoCopiavel
      id="titulo-definicao-visao"
        indice="Definição"
      titulo="Definição"
      texto={definicaoLegivel(visao.definicao)}
      copiado="Copiada"
      anuncio="Definição copiada para a área de transferência."
      tituloDoErro="Não foi possível copiar a definição"
      descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto da definição e copie por lá."
    />
  );
}

interface ListaDeObjetosProps {
  titulo: string;
  objetos: ReferenciaObjetoDTO[];
  vazio: string;
  conhecidas: ReadonlySet<string>;
  aoAbrirObjeto: (id: string) => void;
}

function ListaDeObjetos({ titulo, objetos, vazio, conhecidas, aoAbrirObjeto }: ListaDeObjetosProps) {
  return (
    <div className={estilos.grupoObjetos}>
      <p className={estilos.rotuloGrupo}>{titulo}</p>
      {objetos.length === 0 ? (
        <p className={estilos.leitura}>{vazio}</p>
      ) : (
        <ul className={estilos.objetos}>
          {objetos.map((objeto) => {
            const id = idDoObjeto(objeto);
            const Icone = iconeDoObjeto[objeto.tipo];
            const conteudo = (
              <>
                <Icone className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                <span className={estilos.textosObjeto}>
                  <span className={`${estilos.nomeObjeto} codigo`}>
                    <NomeObjeto esquema={objeto.esquema} nome={objeto.nome} classeEsquema={estilos.esquema} />
                  </span>
                  <span className={estilos.tipoObjeto}>{rotuloTipoObjeto[objeto.tipo]}</span>
                </span>
              </>
            );
            return (
              <li key={id}>
                {objeto.tipo === 'TABELA' || conhecidas.has(id) ? (
                  <button
                    type="button"
                    className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)}
                    onClick={() => aoAbrirObjeto(id)}
                  >
                    {conteudo}
                    <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                    <span className="visualmente-oculto">
                      {objeto.tipo === 'TABELA' ? '. Abrir esta tabela em Tabelas' : '. Abrir esta view'}
                    </span>
                  </button>
                ) : (
                  <div className={estilos.objeto}>{conteudo}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ConsultaDaVisao({
  consulta,
  aoVerHistorico,
  aoVerPlano,
  semPlano = false,
}: AcoesDasConsultas & { consulta: ConsultaDetalhadaDTO; semPlano?: boolean }) {
  return (
    <ItemConsulta consulta={consulta}>
      {semPlano ? null : (
        <Botao variante="terciario" tamanho="sm" icone={ListTree} onClick={() => aoVerPlano(consulta)}>
          Ver plano
        </Botao>
      )}
      <Botao variante="terciario" tamanho="sm" icone={History} onClick={() => aoVerHistorico(consulta)}>
        Ver histórico
      </Botao>
    </ItemConsulta>
  );
}
