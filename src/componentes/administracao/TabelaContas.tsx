import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, MouseEvent, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { ESMAECIMENTO_DO_ESQUELETO } from '@/componentes/objetos/TabelaObjetos';
import estilos from '@/componentes/objetos/TabelaObjetos.module.css';
import { Esqueleto, Selo } from '@/componentes/ui';
import type { ContaDTO } from '@/modelos/administracao';
import { situacaoDaConta } from '@/regras/contas';
import { personalizada, rotuloDoPerfil } from '@/regras/permissoesConta';
import { formatarDataOpcional, formatarInstante, formatarTempoRelativo } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { SeloSituacaoConta } from './SeloSituacaoConta';
import proprios from './TabelaContas.module.css';

interface TabelaContasProps {
  contas: ContaDTO[];
  geradoEm: string;
  contaAtual: string;
  idAberta: string | null;
  rolarAteAberta: boolean;
  aoAbrir: (conta: ContaDTO) => void;
}

function MolduraDaTabela({ children }: { children: ReactNode }) {
  return (
    <div className={estilos.conteiner}>
      <table className={estilos.tabela}>
        <caption className="visualmente-oculto">
          Contas que entram no Orynt, com o perfil, a situação e o último acesso. Abra uma para ver os dados e mudar as permissões.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={estilos.colunaVisao}>
              Usuário
            </th>
            <th scope="col" className={estilos.colunaTipo}>
              Perfil
            </th>
            <th scope="col" className={estilos.colunaSituacao}>
              Situação
            </th>
            <th scope="col" className={juntarClasses(estilos.colunaNumerica, proprios.colunaData)}>
              Último acesso
            </th>
            <th scope="col" className={juntarClasses(estilos.colunaNumerica, proprios.colunaData)}>
              Criada em
            </th>
            <td className={estilos.colunaSeta} aria-hidden="true" />
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

export function EsqueletoContas({ linhas }: { linhas: number }) {
  return (
    <>
      <span className="visualmente-oculto" role="status">
        Carregando os usuários…
      </span>
      <MolduraDaTabela>
        <tbody aria-hidden="true">
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) }}>
              <td className={estilos.celulaVisao}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${38 - ((indice * 11) % 14)}%`} altura={12} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${52 - ((indice * 13) % 18)}%`} altura={10} />
                </span>
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Perfil">
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={82} altura={12} />
                </span>
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Situação">
                <Esqueleto largura={92} altura={22} raio="var(--raio-sm)" />
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Último acesso">
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={70} altura={12} />
                </span>
              </td>
              <td className={estilos.celulaNumerica} data-rotulo="Criada em">
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={78} altura={12} />
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

export function TabelaContas({ contas, geradoEm, contaAtual, idAberta, rolarAteAberta, aoAbrir }: TabelaContasProps) {
  const corpo = useRef<HTMLTableSectionElement>(null);
  const [entrando, setEntrando] = useState(true);
  const agora = new Date(geradoEm);

  useEffect(() => {
    if (idAberta === null || !rolarAteAberta) return;
    corpo.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [idAberta, rolarAteAberta, contas]);

  const abrir = (evento: MouseEvent<HTMLTableRowElement>, conta: ContaDTO) => {
    evento.currentTarget.querySelector('button')?.focus({ preventScroll: true });
    aoAbrir(conta);
  };

  const encerrarEntrada = (evento: AnimationEvent<HTMLTableRowElement>) => {
    if (evento.target === evento.currentTarget) setEntrando(false);
  };

  return (
    <MolduraDaTabela>
      <tbody ref={corpo}>
        {contas.map((conta, posicao) => (
          <tr
            key={conta.id}
            className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
            data-conta={conta.id}
            aria-current={conta.id === idAberta ? 'true' : undefined}
            style={{ '--indice': posicao } as CSSProperties}
            onClick={(evento) => abrir(evento, conta)}
            onAnimationEnd={posicao === contas.length - 1 ? encerrarEntrada : undefined}
          >
            <td className={estilos.celulaVisao}>
              <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                <span className={proprios.nome}>
                  <span className={estilos.nome}>{conta.nome}</span>
                  {conta.id === contaAtual ? (
                    <Selo tom="destaque" className={proprios.voce}>
                      Você
                    </Selo>
                  ) : null}
                </span>
                <span className={`${estilos.descricao} codigo`}>{conta.email}</span>
                <span className="visualmente-oculto">. Ver os dados e as permissões</span>
              </button>
            </td>
            <td className={estilos.celulaTipo} data-rotulo="Perfil">
              <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
                <span>{rotuloDoPerfil(conta.perfil)}</span>
                {personalizada(conta.perfil, conta.permissoes) ? <span className={estilos.textoSecundario}>personalizado</span> : null}
              </span>
            </td>
            <td className={estilos.celulaTipo} data-rotulo="Situação">
              <SeloSituacaoConta situacao={situacaoDaConta(conta, agora)} />
            </td>
            <td className={estilos.celulaNumerica} data-rotulo="Último acesso">
              <span title={conta.ultimoAcessoEm ? formatarInstante(conta.ultimoAcessoEm) : undefined}>
                {conta.ultimoAcessoEm ? formatarTempoRelativo(conta.ultimoAcessoEm, agora) : <span className={estilos.vazio}>Nunca</span>}
              </span>
            </td>
            <td className={estilos.celulaNumerica} data-rotulo="Criada em">
              {formatarDataOpcional(conta.criadaEm) ?? '—'}
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
