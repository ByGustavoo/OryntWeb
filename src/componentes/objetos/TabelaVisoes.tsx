import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, MouseEvent, ReactNode } from 'react';
import { ChevronRight, Clock, DatabaseZap, EyeOff } from 'lucide-react';
import { CampoSelecao, Esqueleto, Selo } from '@/componentes/ui';
import type { DirecaoOrdenacao } from '@/modelos/consultas';
import type { OrdenacaoVisoes, VisaoDTO } from '@/modelos/objetos';
import { leiturasDaVisao, situacaoDaMaterializada } from '@/regras/visoes';
import type { ContextoDasVisoes } from '@/regras/visoes';
import { formatarDataHoraCompleta, formatarNumero, formatarTamanho, formatarTempoRelativo } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { NomeObjeto } from './NomeObjeto';
import { SeloTipoVisao } from './SeloTipoVisao';
import { BotaoOrdenar, ESMAECIMENTO_DO_ESQUELETO, NaoSeAplica, ordemAria } from './TabelaObjetos';
import type { ColunaOrdenavel } from './TabelaObjetos';
import estilos from './TabelaObjetos.module.css';

interface OrdenacaoDaTabelaProps {
  ordenacao: OrdenacaoVisoes;
  direcao: DirecaoOrdenacao;
  aoAlternarOrdenacao: (ordenacao: OrdenacaoVisoes) => void;
  aoEscolherOrdenacao: (ordenacao: OrdenacaoVisoes) => void;
}

interface TabelaVisoesProps extends OrdenacaoDaTabelaProps {
  visoes: VisaoDTO[];
  contexto: ContextoDasVisoes;
  idAberta: string | null;
  rolarAteAberta: boolean;
  aoAbrir: (visao: VisaoDTO) => void;
}

interface EsqueletoVisoesProps extends OrdenacaoDaTabelaProps {
  linhas: number;
  imediato?: boolean;
}

const colunaDoNome: ColunaOrdenavel<OrdenacaoVisoes> = { ordenacao: 'NOME', rotulo: 'Visão', rotuloOrdenacao: 'Nome' };

const colunasNumericas: ColunaOrdenavel<OrdenacaoVisoes>[] = [
  { ordenacao: 'LEITURAS', rotulo: 'Leituras em 30 dias', rotuloOrdenacao: 'Mais leituras' },
  { ordenacao: 'TAMANHO', rotulo: 'Tamanho', rotuloOrdenacao: 'Maior tamanho' },
  { ordenacao: 'ATUALIZACAO', rotulo: 'Última atualização', rotuloOrdenacao: 'Atualização mais antiga' },
];

const opcoesOrdenacao = [colunaDoNome, ...colunasNumericas].map(({ ordenacao, rotuloOrdenacao }) => ({
  valor: ordenacao,
  rotulo: rotuloOrdenacao,
}));

function MolduraDaTabela({
  ordenacao,
  direcao,
  aoAlternarOrdenacao,
  aoEscolherOrdenacao,
  children,
}: OrdenacaoDaTabelaProps & { children: ReactNode }) {
  return (
    <div className={estilos.conteiner}>
      <CampoSelecao
        id="ordenacao-visoes"
        rotulo="Ordenar por"
        className={estilos.ordenacaoCompacta}
        opcoes={opcoesOrdenacao}
        valor={ordenacao}
        aoMudar={(escolhida) => escolhida && aoEscolherOrdenacao(escolhida)}
      />

      <table className={estilos.tabela}>
        <caption className="visualmente-oculto">
          Visões do banco. Use os cabeçalhos para mudar a ordenação e abra uma visão para ver a definição, as dependências e
          as consultas que a leem.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={estilos.colunaVisao} aria-sort={ordemAria(ordenacao === 'NOME', direcao)}>
              <BotaoOrdenar
                coluna={colunaDoNome}
                ordenacao={ordenacao}
                direcao={direcao}
                aoAlternarOrdenacao={aoAlternarOrdenacao}
              />
            </th>
            <th scope="col" className={estilos.colunaTipo}>
              Tipo
            </th>
            {colunasNumericas.map((coluna) => (
              <th
                key={coluna.ordenacao}
                scope="col"
                className={estilos.colunaNumerica}
                aria-sort={ordemAria(ordenacao === coluna.ordenacao, direcao)}
              >
                <BotaoOrdenar coluna={coluna} ordenacao={ordenacao} direcao={direcao} aoAlternarOrdenacao={aoAlternarOrdenacao} />
              </th>
            ))}
            <td className={estilos.colunaSeta} aria-hidden="true" />
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

function CelulaLeituras({ visao, semLeitura }: { visao: VisaoDTO; semLeitura: boolean }) {
  if (semLeitura) {
    return (
      <Selo tom="aviso" icone={EyeOff} titulo="Nenhuma consulta leu esta visão nos últimos 30 dias">
        Sem leitura
      </Selo>
    );
  }
  const leituras = leiturasDaVisao(visao);
  if (leituras === 0) return <span className={estilos.secundario}>Por outra visão</span>;
  return <span className="numeros">{formatarNumero(leituras)}</span>;
}

function CelulaAtualizacao({ visao, geradoEm }: { visao: VisaoDTO; geradoEm: string }) {
  const situacao = situacaoDaMaterializada(visao, geradoEm);
  const ultima = visao.materializacao?.ultimaAtualizacao ?? null;
  if (situacao === null) return <NaoSeAplica />;

  if (situacao === 'NAO_POPULADA') {
    return (
      <Selo tom="erro" icone={DatabaseZap} titulo="A visão está sem dados até o próximo REFRESH">
        Sem dados
      </Selo>
    );
  }

  const quando = ultima ? formatarTempoRelativo(ultima, new Date(geradoEm)) : 'Sem registro';
  const completo = ultima ? formatarDataHoraCompleta(new Date(ultima)) : 'Nenhuma atualização nos últimos 30 dias';

  if (situacao === 'DESATUALIZADA') {
    return (
      <Selo tom="aviso" icone={Clock} titulo={`Desatualizada. ${completo}`}>
        <span className="visualmente-oculto">Desatualizada, </span>
        {quando}
      </Selo>
    );
  }
  return <span title={completo}>{quando}</span>;
}

export function EsqueletoVisoes({ linhas, imediato = false, ...ordenacaoDaTabela }: EsqueletoVisoesProps) {
  return (
    <>
      <span className="visualmente-oculto" role="status">
        Carregando as visões…
      </span>
      <MolduraDaTabela {...ordenacaoDaTabela}>
        <tbody aria-hidden="true">
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) }}>
              <td className={estilos.celulaVisao}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${46 - ((indice * 11) % 18)}%`} altura={12} imediato={imediato} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${72 - ((indice * 17) % 30)}%`} altura={10} imediato={imediato} />
                </span>
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Tipo">
                <Esqueleto largura={indice % 3 === 2 ? 112 : 76} altura={22} raio="var(--raio-sm)" imediato={imediato} />
              </td>
              {colunasNumericas.map((coluna) => (
                <td key={coluna.ordenacao} className={estilos.celulaNumerica} data-rotulo={coluna.rotulo}>
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={48} altura={12} imediato={imediato} />
                  </span>
                </td>
              ))}
              <td className={estilos.celulaSeta}>
                <span className={estilos.lugarDaSeta} />
              </td>
            </tr>
          ))}
        </tbody>
      </MolduraDaTabela>
    </>
  );
}

export function TabelaVisoes({
  visoes,
  contexto,
  ordenacao,
  direcao,
  idAberta,
  rolarAteAberta,
  aoAlternarOrdenacao,
  aoEscolherOrdenacao,
  aoAbrir,
}: TabelaVisoesProps) {
  const corpo = useRef<HTMLTableSectionElement>(null);
  const [entrando, setEntrando] = useState(true);

  useEffect(() => {
    if (idAberta === null || !rolarAteAberta) return;
    corpo.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [idAberta, rolarAteAberta]);

  const abrir = (evento: MouseEvent<HTMLTableRowElement>, visao: VisaoDTO) => {
    evento.currentTarget.querySelector('button')?.focus({ preventScroll: true });
    aoAbrir(visao);
  };

  const encerrarEntrada = (evento: AnimationEvent<HTMLTableRowElement>) => {
    if (evento.target === evento.currentTarget) setEntrando(false);
  };

  return (
    <MolduraDaTabela
      ordenacao={ordenacao}
      direcao={direcao}
      aoAlternarOrdenacao={aoAlternarOrdenacao}
      aoEscolherOrdenacao={aoEscolherOrdenacao}
    >
      <tbody ref={corpo}>
        {visoes.map((visao, indice) => (
          <tr
            key={visao.id}
            className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
            data-visao={visao.id}
            aria-current={visao.id === idAberta ? 'true' : undefined}
            style={{ '--indice': indice } as CSSProperties}
            onClick={(evento) => abrir(evento, visao)}
            onAnimationEnd={indice === visoes.length - 1 ? encerrarEntrada : undefined}
          >
            <td className={estilos.celulaVisao}>
              <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                <span className={`${estilos.nome} codigo`}>
                  <NomeObjeto esquema={visao.esquema} nome={visao.nome} classeEsquema={estilos.esquema} />
                </span>
                <span
                  className={juntarClasses(estilos.descricao, !visao.descricao && estilos.semDescricao)}
                  title={visao.descricao ?? undefined}
                >
                  {visao.descricao ?? 'Sem descrição no banco'}
                </span>
                <span className="visualmente-oculto">. Ver os detalhes desta visão</span>
              </button>
            </td>
            <td className={estilos.celulaTipo} data-rotulo="Tipo">
              <SeloTipoVisao tipo={visao.tipo} />
            </td>
            <td className={estilos.celulaNumerica} data-rotulo="Leituras em 30 dias">
              <CelulaLeituras visao={visao} semLeitura={contexto.semLeitura.has(visao.id)} />
            </td>
            <td className={estilos.celulaNumerica} data-rotulo="Tamanho">
              {visao.materializacao ? (
                <span className="numeros">{formatarTamanho(visao.materializacao.tamanhoBytes)}</span>
              ) : (
                <NaoSeAplica />
              )}
            </td>
            <td className={estilos.celulaNumerica} data-rotulo="Última atualização">
              <CelulaAtualizacao visao={visao} geradoEm={contexto.geradoEm} />
            </td>
            <td className={estilos.celulaSeta} aria-hidden="true">
              <ChevronRight size={16} strokeWidth={2} />
            </td>
          </tr>
        ))}
      </tbody>
    </MolduraDaTabela>
  );
}
