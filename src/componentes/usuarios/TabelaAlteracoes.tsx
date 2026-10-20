import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, MouseEvent, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { ESMAECIMENTO_DO_ESQUELETO } from '@/componentes/objetos/TabelaObjetos';
import estilos from '@/componentes/objetos/TabelaObjetos.module.css';
import { Esqueleto } from '@/componentes/ui';
import type { AlteracaoDTO } from '@/modelos/alteracoes';
import { tituloDaAlteracao } from '@/regras/descricaoAlteracoes';
import { estadoDaAlteracao } from '@/regras/historicoAlteracoes';
import { formatarInstante, formatarNumero, formatarTempoRelativo, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { SeloEstadoAlteracao } from './SeloEstadoAlteracao';
import proprios from './TabelaAlteracoes.module.css';

interface TabelaAlteracoesProps {
  alteracoes: AlteracaoDTO[];
  geradoEm: string;
  idAberta: string | null;
  rolarAteAberta: boolean;
  aoAbrir: (alteracao: AlteracaoDTO) => void;
}

function MolduraDaTabela({ children }: { children: ReactNode }) {
  return (
    <div className={estilos.conteiner}>
      <table className={estilos.tabela}>
        <caption className="visualmente-oculto">
          Alterações feitas pelo Orynt nos papéis e nas permissões deste servidor, da mais recente à mais antiga. Abra uma para ver
          os comandos e desfazê-la.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={estilos.colunaVisao}>
              Alteração
            </th>
            <th scope="col" className={estilos.colunaSituacao}>
              Resultado
            </th>
            <th scope="col" className={estilos.colunaTipo}>
              Quem
            </th>
            <th scope="col" className={juntarClasses(estilos.colunaNumerica, proprios.colunaQuando)}>
              Quando
            </th>
            <td className={estilos.colunaSeta} aria-hidden="true" />
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

function textoDosComandos(alteracao: AlteracaoDTO): string {
  const [primeiro] = alteracao.comandos;
  if (alteracao.comandos.length <= 1) return primeiro ?? '';
  return `${primeiro ?? ''} e mais ${formatarNumero(alteracao.comandos.length - 1)} ${pluralizar(alteracao.comandos.length - 1, 'comando', 'comandos')}`;
}

export function EsqueletoAlteracoes({ linhas }: { linhas: number }) {
  return (
    <>
      <span className="visualmente-oculto" role="status">
        Carregando as alterações…
      </span>
      <MolduraDaTabela>
        <tbody aria-hidden="true">
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) }}>
              <td className={estilos.celulaVisao}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${46 - ((indice * 13) % 18)}%`} altura={12} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${68 - ((indice * 17) % 22)}%`} altura={10} />
                </span>
              </td>
              <td className={juntarClasses(estilos.celulaTipo, estilos.celulaLarga)} data-rotulo="Resultado">
                <Esqueleto largura={84} altura={22} raio="var(--raio-sm)" />
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Quem">
                <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={112} altura={12} />
                  </span>
                  <span className={juntarClasses(estilos.linhaEmEspera, estilos.textoSecundario)}>
                    <Esqueleto largura={64} altura={10} />
                  </span>
                </span>
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Quando">
                <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoFim)}>
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={92} altura={12} />
                  </span>
                  <span className={juntarClasses(estilos.linhaEmEspera, estilos.textoSecundario)}>
                    <Esqueleto largura={52} altura={10} />
                  </span>
                </span>
              </td>
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

export function TabelaAlteracoes({ alteracoes, geradoEm, idAberta, rolarAteAberta, aoAbrir }: TabelaAlteracoesProps) {
  const corpo = useRef<HTMLTableSectionElement>(null);
  const [entrando, setEntrando] = useState(true);
  const agora = new Date(geradoEm);

  useEffect(() => {
    if (idAberta === null || !rolarAteAberta) return;
    corpo.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [idAberta, rolarAteAberta, alteracoes]);

  const abrir = (evento: MouseEvent<HTMLTableRowElement>, alteracao: AlteracaoDTO) => {
    evento.currentTarget.querySelector('button')?.focus({ preventScroll: true });
    aoAbrir(alteracao);
  };

  const encerrarEntrada = (evento: AnimationEvent<HTMLTableRowElement>) => {
    if (evento.target === evento.currentTarget) setEntrando(false);
  };

  return (
    <MolduraDaTabela>
      <tbody ref={corpo}>
        {alteracoes.map((alteracao, posicao) => {
          const titulo = tituloDaAlteracao(alteracao.operacoes, 'PASSADO');
          return (
            <tr
              key={alteracao.id}
              className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
              data-alteracao={alteracao.id}
              aria-current={alteracao.id === idAberta ? 'true' : undefined}
              style={{ '--indice': posicao } as CSSProperties}
              onClick={(evento) => abrir(evento, alteracao)}
              onAnimationEnd={posicao === alteracoes.length - 1 ? encerrarEntrada : undefined}
            >
              <td className={estilos.celulaVisao}>
                <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                  <span className={proprios.titulo}>{titulo}</span>
                  <span className={`${estilos.descricao} codigo`} title={alteracao.comandos.join('\n')}>
                    {textoDosComandos(alteracao)}
                  </span>
                  <span className="visualmente-oculto">. Ver os comandos desta alteração</span>
                </button>
              </td>
              <td className={juntarClasses(estilos.celulaTipo, estilos.celulaLarga)} data-rotulo="Resultado">
                <SeloEstadoAlteracao estado={estadoDaAlteracao(alteracao)} />
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Quem">
                <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
                  <span className={proprios.conta}>{alteracao.conta || 'Conta não informada'}</span>
                  <span className={`${estilos.textoSecundario} codigo`}>como {alteracao.papelDaConexao}</span>
                </span>
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Quando">
                <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoFim)}>
                  <span>{formatarInstante(alteracao.feitaEm)}</span>
                  <span className={estilos.textoSecundario}>{formatarTempoRelativo(alteracao.feitaEm, agora)}</span>
                </span>
              </td>
              <td className={estilos.celulaSeta} aria-hidden="true">
                <ChevronRight size={16} strokeWidth={2} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </MolduraDaTabela>
  );
}
