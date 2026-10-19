import { useEffect, useState } from 'react';
import { Check, Copy, History, Info, ListTree } from 'lucide-react';
import sugeridos from '@/componentes/consultas/IndicesSugeridos.module.css';
import { Botao, EsqueletoLista } from '@/componentes/ui';
import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import type { SugestaoDeIndiceDTO } from '@/modelos/objetos';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { copiarTexto } from '@/utilitarios/areaTransferencia';
import { ItemConsulta } from './DetalheObjeto';
import estilos from './SugestoesDeIndices.module.css';

const DURACAO_CONFIRMACAO_MS = 2400;

interface AcoesDasConsultas {
  aoVerPlano: (consulta: ConsultaDetalhadaDTO) => void;
  aoVerHistorico: (consulta: ConsultaDetalhadaDTO) => void;
}

interface SugestoesDeIndicesProps extends AcoesDasConsultas {
  sugestoes: SugestaoDeIndiceDTO[];
}

export function SugestoesDeIndices({ sugestoes, aoVerPlano, aoVerHistorico }: SugestoesDeIndicesProps) {
  return (
    <div className={estilos.corpo}>
      <h2 className="visualmente-oculto">Índices sugeridos pelos planos</h2>
      <p className={estilos.introducao}>
        Os índices que faltam segundo os planos de execução dos últimos 30 dias, para avaliar e criar por conta própria.
      </p>
      <ul className={estilos.lista}>
        {sugestoes.map((sugestao) => (
          <Sugestao key={sugestao.comando} sugestao={sugestao} aoVerPlano={aoVerPlano} aoVerHistorico={aoVerHistorico} />
        ))}
      </ul>
      <p className={sugeridos.observacao}>
        <Info size={14} strokeWidth={2.25} aria-hidden="true" />
        <span>
          <code>CONCURRENTLY</code> cria o índice sem bloquear as gravações na tabela, mas leva mais tempo e não pode
          rodar dentro de uma transação. Todo índice novo também deixa as gravações um pouco mais lentas.
        </span>
      </p>
    </div>
  );
}

export function EsqueletoSugestoesDeIndices() {
  return (
    <div className={estilos.corpo}>
      <EsqueletoLista linhas={3} rotulo="Carregando os índices sugeridos…" />
    </div>
  );
}

function Sugestao({ sugestao, aoVerPlano, aoVerHistorico }: AcoesDasConsultas & { sugestao: SugestaoDeIndiceDTO }) {
  const notificacoes = useNotificacoes();
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const temporizador = window.setTimeout(() => setCopiado(false), DURACAO_CONFIRMACAO_MS);
    return () => window.clearTimeout(temporizador);
  }, [copiado]);

  const copiar = async () => {
    if (await copiarTexto(sugestao.comando)) {
      setCopiado(true);
      return;
    }
    notificacoes.erro(
      'Não foi possível copiar o comando',
      'O navegador bloqueou a área de transferência. Selecione o texto do comando e copie por lá.',
    );
  };

  return (
    <li className={estilos.sugestao}>
      <p className={estilos.alvo}>
        <span className="codigo">{sugestao.tabela}</span>
        <span className={estilos.colunas}>
          <span className="codigo">({sugestao.colunas.join(', ')})</span>
        </span>
      </p>
      <div className={sugeridos.comando}>
        <code>{sugestao.comando}</code>
        <Botao variante="secundario" tamanho="sm" icone={copiado ? Check : Copy} onClick={() => void copiar()}>
          {copiado ? 'Copiado' : 'Copiar'}
        </Botao>
      </div>
      <span className="visualmente-oculto" role="status">
        {copiado ? 'Comando copiado para a área de transferência.' : ''}
      </span>
      {sugestao.extensao ? (
        <p className={sugeridos.extensao}>
          Precisa da extensão {sugestao.extensao}, que se instala com{' '}
          <code>CREATE EXTENSION IF NOT EXISTS {sugestao.extensao};</code>
        </p>
      ) : null}
      <ul className={estilos.consultas} aria-label="Consultas cujo plano pede este índice">
        {sugestao.consultas.map((consulta) => (
          <li key={consulta.id}>
            <ItemConsulta consulta={consulta} etapa="Pedido pelo plano desta consulta">
              <Botao variante="terciario" tamanho="sm" icone={ListTree} onClick={() => aoVerPlano(consulta)}>
                Ver plano
              </Botao>
              <Botao variante="terciario" tamanho="sm" icone={History} onClick={() => aoVerHistorico(consulta)}>
                Ver histórico
              </Botao>
            </ItemConsulta>
          </li>
        ))}
      </ul>
    </li>
  );
}
