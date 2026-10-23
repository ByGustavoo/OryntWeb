import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, MouseEvent, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { NomeObjeto } from '@/componentes/objetos/NomeObjeto';
import { ESMAECIMENTO_DO_ESQUELETO } from '@/componentes/objetos/TabelaObjetos';
import estilos from '@/componentes/objetos/TabelaObjetos.module.css';
import { Dica, Esqueleto, Selo } from '@/componentes/ui';
import type { ModoPermissoes, Privilegio } from '@/modelos/permissoes';
import {
  origensDistintas,
  PUBLICO,
  resumoDasOrigens,
  rotuloSituacaoPermissao,
  rotuloTipoObjetoPermissao,
  textoDosPrivilegios,
} from '@/regras/permissoes';
import type { Acesso, IndiceDasPermissoes, LinhaComparacao, LinhaPermissao } from '@/regras/permissoes';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { SeloNivel, SeloSituacaoPermissao } from './SeloSituacaoPermissao';
import proprios from './TabelaPermissoes.module.css';

type ModoDaLista = Exclude<ModoPermissoes, 'COMPARACAO'>;

interface TabelaPermissoesProps {
  modo: ModoDaLista;
  linhas: LinhaPermissao[];
  indice: IndiceDasPermissoes;
  papelDaConexao: string;
  chaveAberta: string | null;
  rolarAteAberta: boolean;
  aoAbrir: (linha: LinhaPermissao) => void;
}

const legenda: Record<ModoDaLista, string> = {
  PAPEL:
    'Objetos do banco e o que o papel em análise pode fazer em cada um. Abra uma linha para ver de onde vem cada privilégio e como tirá-lo.',
  OBJETO:
    'Papéis que alcançam o objeto em análise, com PUBLIC na primeira linha. Abra uma linha para ver de onde vem cada privilégio e como tirá-lo.',
};

function Moldura({ modo, children }: { modo: ModoDaLista; children: ReactNode }) {
  return (
    <div className={estilos.conteiner}>
      <table className={juntarClasses(estilos.tabela, proprios.tabela)}>
        <caption className="visualmente-oculto">{legenda[modo]}</caption>
        <thead>
          <tr>
            <th scope="col" className={estilos.colunaVisao}>
              <span className={proprios.cabecalho}>{modo === 'PAPEL' ? 'Objeto' : 'Papel'}</span>
            </th>
            <th scope="col" className={estilos.colunaSituacao}>
              Situação
            </th>
            <th scope="col" className={proprios.colunaAcesso}>
              Acesso
            </th>
            <th scope="col" className={proprios.colunaOrigem}>
              Origem
            </th>
            <td className={estilos.colunaSeta} aria-hidden="true" />
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

export function CelulaSituacoes({ linha }: { linha: LinhaPermissao }) {
  const [principal, ...outras] = linha.situacoes;
  if (!principal) return <span className={estilos.secundario}>Em dia</span>;
  return (
    <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
      <SeloSituacaoPermissao situacao={principal} />
      {outras.length > 0 ? (
        <Dica conteudo={outras.map((situacao) => rotuloSituacaoPermissao[situacao]).join(', ')}>
          <span className={estilos.textoSecundario}>
            e mais {formatarNumero(outras.length)} {pluralizar(outras.length, 'ponto', 'pontos')}
          </span>
        </Dica>
      ) : null}
    </span>
  );
}

export function CelulaAcesso({ acesso, destaque }: { acesso: Acesso; destaque?: Privilegio[] }) {
  const largura = destaque ? proprios.larguraDoLado : proprios.larguraDoAcesso;
  if (acesso.nivel === 'NENHUM') return <span className={juntarClasses(estilos.secundario, largura)}>Sem acesso</span>;
  return (
    <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio, largura)}>
      <SeloNivel acesso={acesso} />
      {acesso.nivel === 'TOTAL' ? (
        <span className={estilos.textoSecundario}>Todos os privilégios</span>
      ) : destaque ? (
        <span className={`${proprios.privilegios} codigo`}>
          {acesso.privilegios.map((item, posicao) => (
            <span key={item.privilegio}>
              {posicao > 0 ? ', ' : ''}
              {destaque.includes(item.privilegio) ? (
                <mark className={proprios.diferente}>
                  {item.privilegio}
                  <span className="visualmente-oculto"> (só neste papel)</span>
                </mark>
              ) : (
                item.privilegio
              )}
            </span>
          ))}
        </span>
      ) : (
        <span className={`${proprios.privilegios} codigo`}>{textoDosPrivilegios(acesso)}</span>
      )}
    </span>
  );
}

function CelulaOrigem({ acesso }: { acesso: Acesso }) {
  if (acesso.nivel === 'NENHUM') return <span className={juntarClasses(estilos.secundario, proprios.larguraDaOrigem)}>—</span>;
  return (
    <Dica conteudo={origensDistintas(acesso).join(', ')}>
      <span className={juntarClasses(proprios.origem, proprios.larguraDaOrigem)}>
        {resumoDasOrigens(acesso)}
      </span>
    </Dica>
  );
}

function CelulaObjeto({ linha }: { linha: { acesso: Acesso } }) {
  const { objeto } = linha.acesso;
  return (
    <>
      <Dica conteudo={objeto.esquema ? `${objeto.esquema}.${objeto.nome}` : objeto.nome} soSeCortado>
        <span className={`${estilos.nome} codigo`}>
          <NomeObjeto esquema={objeto.esquema} nome={objeto.nome} classeEsquema={estilos.esquema} />
        </span>
      </Dica>
      <span className={estilos.descricao}>
        {rotuloTipoObjetoPermissao[objeto.tipo]} · dono {objeto.dono}
      </span>
    </>
  );
}

function CelulaPapel({
  sujeito,
  indice,
  papelDaConexao,
}: {
  sujeito: string;
  indice: IndiceDasPermissoes;
  papelDaConexao: string;
}) {
  const papel = indice.papeis.get(sujeito);
  const descricao = sujeito === PUBLICO ? 'Todos os papéis do servidor' : (papel?.descricao ?? null);
  return (
    <>
      <span className={proprios.linhaDoNome}>
        <Dica conteudo={sujeito} soSeCortado>
          <span className={`${estilos.nome} codigo`}>
            <NomeObjeto esquema={null} nome={sujeito} />
          </span>
        </Dica>
        {sujeito === papelDaConexao ? (
          <Selo tom="destaque" className={proprios.voce} titulo="O papel com que o Orynt está conectado">
            Você
          </Selo>
        ) : null}
      </span>
      <Dica conteudo={descricao ?? undefined} soSeCortado>
        <span className={juntarClasses(estilos.descricao, !descricao && estilos.semDescricao)}>
          {descricao ?? `${papel?.login ? 'Usuário' : 'Grupo'} sem descrição no banco`}
        </span>
      </Dica>
    </>
  );
}

function useEntrada() {
  const [entrando, setEntrando] = useState(true);
  const encerrar = (evento: AnimationEvent<HTMLTableRowElement>) => {
    if (evento.target === evento.currentTarget) setEntrando(false);
  };
  return { entrando, encerrar };
}

function abrirPelaLinha(evento: MouseEvent<HTMLTableRowElement>, abrir: () => void) {
  evento.currentTarget.querySelector('button')?.focus({ preventScroll: true });
  abrir();
}

export function TabelaPermissoes({
  modo,
  linhas,
  indice,
  papelDaConexao,
  chaveAberta,
  rolarAteAberta,
  aoAbrir,
}: TabelaPermissoesProps) {
  const corpo = useRef<HTMLTableSectionElement>(null);
  const { entrando, encerrar } = useEntrada();

  useEffect(() => {
    if (chaveAberta === null || !rolarAteAberta) return;
    corpo.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [chaveAberta, rolarAteAberta, linhas]);

  return (
    <Moldura modo={modo}>
      <tbody ref={corpo}>
        {linhas.map((linha, posicao) => (
          <tr
            key={linha.chave}
            className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
            data-chave={linha.chave}
            aria-current={linha.chave === chaveAberta ? 'true' : undefined}
            style={{ '--indice': posicao } as CSSProperties}
            onClick={(evento) => abrirPelaLinha(evento, () => aoAbrir(linha))}
            onAnimationEnd={posicao === linhas.length - 1 ? encerrar : undefined}
          >
            <td className={estilos.celulaVisao}>
              <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                {modo === 'PAPEL' ? (
                  <CelulaObjeto linha={linha} />
                ) : (
                  <CelulaPapel sujeito={linha.acesso.sujeito} indice={indice} papelDaConexao={papelDaConexao} />
                )}
                <span className="visualmente-oculto">. Ver de onde vem este acesso</span>
              </button>
            </td>
            <td className={juntarClasses(estilos.celulaTipo, estilos.celulaLarga)} data-rotulo="Situação">
              <CelulaSituacoes linha={linha} />
            </td>
            <td className={proprios.celulaAcesso} data-rotulo="Acesso">
              <CelulaAcesso acesso={linha.acesso} />
            </td>
            <td className={proprios.celulaOrigem} data-rotulo="Origem">
              <CelulaOrigem acesso={linha.acesso} />
            </td>
            <td className={estilos.celulaSeta} aria-hidden="true">
              <ChevronRight size={16} strokeWidth={2} />
            </td>
          </tr>
        ))}
      </tbody>
    </Moldura>
  );
}

export function EsqueletoPermissoes({ modo, linhas }: { modo: ModoDaLista; linhas: number }) {
  return (
    <>
      <span className="visualmente-oculto" role="status">
        Carregando as permissões…
      </span>
      <Moldura modo={modo}>
        <tbody aria-hidden="true">
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) }}>
              <td className={estilos.celulaVisao}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${32 - ((indice * 11) % 12)}%`} altura={12} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${40 - ((indice * 17) % 16)}%`} altura={10} />
                </span>
              </td>
              <td className={juntarClasses(estilos.celulaTipo, estilos.celulaLarga)} data-rotulo="Situação">
                {indice % 4 === 1 ? (
                  <Esqueleto largura={112} altura={22} raio="var(--raio-sm)" />
                ) : (
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={44} altura={12} />
                  </span>
                )}
              </td>
              <td className={proprios.celulaAcesso} data-rotulo="Acesso">
                <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio, proprios.larguraDoAcesso)}>
                  <Esqueleto largura={indice % 3 === 0 ? 52 : 72} altura={22} raio="var(--raio-sm)" />
                  <span className={juntarClasses(estilos.linhaEmEspera, estilos.textoSecundario)}>
                    <Esqueleto largura={indice % 3 === 0 ? 48 : 112} altura={10} />
                  </span>
                </span>
              </td>
              <td className={proprios.celulaOrigem} data-rotulo="Origem">
                <span className={juntarClasses(estilos.linhaEmEspera, proprios.larguraDaOrigem)}>
                  <Esqueleto largura={indice % 2 === 0 ? 40 : 104} altura={12} />
                </span>
              </td>
              <td className={estilos.celulaSeta}>
                <span className={estilos.lugarDaSeta} />
              </td>
            </tr>
          ))}
        </tbody>
      </Moldura>
    </>
  );
}

interface TabelaComparacaoProps {
  linhas: LinhaComparacao[];
  papelA: string;
  papelB: string;
  chaveAberta: string | null;
  rolarAteAberta: boolean;
  aoAbrir: (linha: LinhaComparacao) => void;
}

export function TabelaComparacao({ linhas, papelA, papelB, chaveAberta, rolarAteAberta, aoAbrir }: TabelaComparacaoProps) {
  const corpo = useRef<HTMLTableSectionElement>(null);
  const { entrando, encerrar } = useEntrada();

  useEffect(() => {
    if (chaveAberta === null || !rolarAteAberta) return;
    corpo.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [chaveAberta, rolarAteAberta, linhas]);

  return (
    <div className={estilos.conteiner}>
      <table className={juntarClasses(estilos.tabela, proprios.tabela)}>
        <caption className="visualmente-oculto">
          O acesso de {papelA} e de {papelB} a cada objeto. Os privilégios que só um dos dois tem aparecem marcados.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={estilos.colunaVisao}>
              <span className={proprios.cabecalho}>Objeto</span>
            </th>
            <th scope="col" className={proprios.colunaLado}>
              <span className={`${proprios.nomeDoLado} codigo`}>{papelA}</span>
            </th>
            <th scope="col" className={proprios.colunaLado}>
              <span className={`${proprios.nomeDoLado} codigo`}>{papelB}</span>
            </th>
            <td className={estilos.colunaSeta} aria-hidden="true" />
          </tr>
        </thead>
        <tbody ref={corpo}>
          {linhas.map((linha, posicao) => (
            <tr
              key={linha.chave}
              className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
              data-chave={linha.chave}
              aria-current={linha.chave === chaveAberta ? 'true' : undefined}
              style={{ '--indice': posicao } as CSSProperties}
              onClick={(evento) => abrirPelaLinha(evento, () => aoAbrir(linha))}
              onAnimationEnd={posicao === linhas.length - 1 ? encerrar : undefined}
            >
              <td className={estilos.celulaVisao}>
                <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                  <CelulaObjeto linha={{ acesso: linha.a }} />
                  <span className="visualmente-oculto">. Ver o acesso de cada papel</span>
                </button>
              </td>
              <td className={proprios.celulaLado} data-rotulo={papelA}>
                <CelulaAcesso acesso={linha.a} destaque={linha.soEmA} />
              </td>
              <td className={proprios.celulaLado} data-rotulo={papelB}>
                <CelulaAcesso acesso={linha.b} destaque={linha.soEmB} />
              </td>
              <td className={estilos.celulaSeta} aria-hidden="true">
                <ChevronRight size={16} strokeWidth={2} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
