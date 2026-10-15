import { useEffect, useState } from 'react';
import { Check, Copy, CornerDownRight, Info } from 'lucide-react';
import { Botao, CabecalhoPainel, Painel } from '@/componentes/ui';
import type { PlanoExecucaoDTO, SugestaoIndiceDTO } from '@/modelos/planos';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { descreverNo, encontrarNo, motivoDaSugestao } from '@/regras/planoExecucao';
import { copiarTexto } from '@/utilitarios/areaTransferencia';
import diagnostico from './DiagnosticoPlano.module.css';
import estilos from './IndicesSugeridos.module.css';

interface IndicesSugeridosProps {
  plano: PlanoExecucaoDTO;
  aoIrParaEtapa: ((id: number) => void) | null;
}

const DURACAO_CONFIRMACAO_MS = 2400;

export function IndicesSugeridos({ plano, aoIrParaEtapa }: IndicesSugeridosProps) {
  return (
    <Painel aria-labelledby="titulo-indices-sugeridos" className={estilos.painel}>
      <CabecalhoPainel
        titulo={<span id="titulo-indices-sugeridos">Índices sugeridos</span>}
        descricao="Comandos para avaliar e executar por conta própria: o Orynt não altera nada no banco"
      />
      <ul className={estilos.lista}>
        {plano.sugestoes.map((sugestao) => (
          <Sugestao
            key={sugestao.comando}
            sugestao={sugestao}
            etapa={encontrarNo(plano, sugestao.no)}
            aoIrParaEtapa={aoIrParaEtapa}
          />
        ))}
      </ul>
      <p className={estilos.observacao}>
        <Info size={14} strokeWidth={2.25} aria-hidden="true" />
        <span>
          <code>CONCURRENTLY</code> cria o índice sem bloquear as gravações na tabela, mas leva mais tempo e não pode
          rodar dentro de uma transação. Todo índice novo também deixa as gravações um pouco mais lentas.
        </span>
      </p>
    </Painel>
  );
}

interface SugestaoProps {
  sugestao: SugestaoIndiceDTO;
  etapa: ReturnType<typeof encontrarNo>;
  aoIrParaEtapa: ((id: number) => void) | null;
}

function Sugestao({ sugestao, etapa, aoIrParaEtapa }: SugestaoProps) {
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
      <p className={estilos.motivo}>{motivoDaSugestao(sugestao, etapa)}</p>
      <div className={estilos.comando}>
        <code>{sugestao.comando}</code>
        <Botao variante="secundario" tamanho="sm" icone={copiado ? Check : Copy} onClick={() => void copiar()}>
          {copiado ? 'Copiado' : 'Copiar'}
        </Botao>
      </div>
      <span className="visualmente-oculto" role="status">
        {copiado ? 'Comando copiado para a área de transferência.' : ''}
      </span>
      {sugestao.extensao ? (
        <p className={estilos.extensao}>
          Precisa da extensão {sugestao.extensao}, que se instala com{' '}
          <code>CREATE EXTENSION IF NOT EXISTS {sugestao.extensao};</code>
        </p>
      ) : null}
      {etapa && aoIrParaEtapa ? (
        <button type="button" className={diagnostico.irPara} onClick={() => aoIrParaEtapa(etapa.id)}>
          <CornerDownRight size={13} strokeWidth={2.25} aria-hidden="true" />
          Ver {descreverNo(etapa)} na árvore
        </button>
      ) : null}
    </li>
  );
}
