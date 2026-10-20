import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties, MouseEvent, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { ESMAECIMENTO_DO_ESQUELETO } from '@/componentes/objetos/TabelaObjetos';
import estilos from '@/componentes/objetos/TabelaObjetos.module.css';
import { Esqueleto } from '@/componentes/ui';
import type { EventoAuditoriaDTO } from '@/modelos/administracao';
import { descreverEvento, responsavelDoEvento, rotuloCategoriaAuditoria, rotuloModuloAuditoria } from '@/regras/auditoria';
import { formatarInstante, formatarTempoRelativo } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { SeloResultadoAuditoria } from './SeloResultadoAuditoria';
import proprios from './TabelaAuditoria.module.css';

interface TabelaAuditoriaProps {
  eventos: EventoAuditoriaDTO[];
  geradoEm: string;
  idAberto: string | null;
  aoAbrir: (evento: EventoAuditoriaDTO) => void;
}

function MolduraDaTabela({ children }: { children: ReactNode }) {
  return (
    <div className={estilos.conteiner}>
      <table className={estilos.tabela}>
        <caption className="visualmente-oculto">
          Eventos registrados no Orynt, do mais recente ao mais antigo. Abra um para ver todos os detalhes.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={estilos.colunaVisao}>
              Evento
            </th>
            <th scope="col" className={estilos.colunaTipo}>
              Resultado
            </th>
            <th scope="col" className={proprios.colunaConta}>
              Usuário
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

export function EsqueletoAuditoria({ linhas }: { linhas: number }) {
  return (
    <>
      <span className="visualmente-oculto" role="status">
        Carregando os eventos…
      </span>
      <MolduraDaTabela>
        <tbody aria-hidden="true">
          {Array.from({ length: linhas }, (_, indice) => (
            <tr key={indice} style={{ opacity: 1 - indice * (ESMAECIMENTO_DO_ESQUELETO / linhas) }}>
              <td className={estilos.celulaVisao}>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${54 - ((indice * 13) % 20)}%`} altura={12} />
                </span>
                <span className={estilos.linhaEmEspera}>
                  <Esqueleto largura={`${30 - ((indice * 7) % 10)}%`} altura={10} />
                </span>
              </td>
              <td className={estilos.celulaTipo} data-rotulo="Resultado">
                <Esqueleto largura={78} altura={22} raio="var(--raio-sm)" />
              </td>
              <td className={juntarClasses(estilos.celulaTipo, proprios.celulaConta)} data-rotulo="Usuário">
                <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
                  <span className={estilos.linhaEmEspera}>
                    <Esqueleto largura={110} altura={12} />
                  </span>
                  <span className={juntarClasses(estilos.linhaEmEspera, estilos.textoSecundario)}>
                    <Esqueleto largura={130} altura={10} />
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

export function TabelaAuditoria({ eventos, geradoEm, idAberto, aoAbrir }: TabelaAuditoriaProps) {
  const corpo = useRef<HTMLTableSectionElement>(null);
  const [entrando, setEntrando] = useState(true);
  const agora = new Date(geradoEm);

  useEffect(() => {
    if (idAberto === null) return;
    corpo.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [idAberto, eventos]);

  const abrir = (evento: MouseEvent<HTMLTableRowElement>, item: EventoAuditoriaDTO) => {
    evento.currentTarget.querySelector('button')?.focus({ preventScroll: true });
    aoAbrir(item);
  };

  const encerrarEntrada = (evento: AnimationEvent<HTMLTableRowElement>) => {
    if (evento.target === evento.currentTarget) setEntrando(false);
  };

  return (
    <MolduraDaTabela>
      <tbody ref={corpo}>
        {eventos.map((item, posicao) => (
          <tr
            key={item.id}
            className={juntarClasses(estilos.linha, entrando && 'item-em-cascata')}
            data-evento={item.id}
            aria-current={item.id === idAberto ? 'true' : undefined}
            style={{ '--indice': posicao } as CSSProperties}
            onClick={(evento) => abrir(evento, item)}
            onAnimationEnd={posicao === eventos.length - 1 ? encerrarEntrada : undefined}
          >
            <td className={estilos.celulaVisao}>
              <button type="button" className={estilos.abrir} aria-haspopup="dialog">
                <span className={proprios.evento}>{descreverEvento(item)}</span>
                <span className={estilos.descricao}>
                  {rotuloModuloAuditoria[item.modulo]} · {rotuloCategoriaAuditoria[item.categoria]}
                </span>
                <span className="visualmente-oculto">. Ver os detalhes do evento</span>
              </button>
            </td>
            <td className={estilos.celulaTipo} data-rotulo="Resultado">
              <SeloResultadoAuditoria resultado={item.resultado} />
            </td>
            <td className={juntarClasses(estilos.celulaTipo, proprios.celulaConta)} data-rotulo="Usuário">
              <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoInicio)}>
                <span className={proprios.conta}>{responsavelDoEvento(item)}</span>
                <span className={juntarClasses(estilos.textoSecundario, proprios.conta, 'codigo')}>
                  {item.conta ? item.conta.email : 'sem conta'}
                </span>
              </span>
            </td>
            <td className={estilos.celulaNumerica} data-rotulo="Quando">
              <span className={juntarClasses(estilos.celulaEmLinhas, estilos.alinhadaAoFim)}>
                <span>{formatarInstante(item.ocorridoEm)}</span>
                <span className={estilos.textoSecundario}>{formatarTempoRelativo(item.ocorridoEm, agora)}</span>
              </span>
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
