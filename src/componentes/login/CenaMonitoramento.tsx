import { useRef } from 'react';
import { useCenaMonitoramento } from '@/ganchos/useCenaMonitoramento';
import { CartaoOrigem } from './CartaoOrigem';
import { FaixaIndicadores } from './FaixaIndicadores';
import { GraficoTempoMedio } from './GraficoTempoMedio';
import { RegistroConsultas } from './RegistroConsultas';
import { RotaCena } from './RotaCena';
import estilos from './CenaMonitoramento.module.css';

const DESCRICAO_DA_CENA =
  'Ilustração animada com dados fictícios: um pico no tempo médio de execução é rastreado até a consulta SQL que o causou.';

export function CenaMonitoramento() {
  const palcoRef = useRef<HTMLDivElement>(null);
  const cena = useCenaMonitoramento(palcoRef);

  return (
    <div
      ref={palcoRef}
      className={estilos.cena}
      data-fase={cena.fase}
      role="img"
      aria-label={DESCRICAO_DA_CENA}
    >
      <FaixaIndicadores cena={cena} className={estilos.indicadores} />

      <div className={estilos.topo}>
        <GraficoTempoMedio cena={cena} className={estilos.grafico} />
        <RegistroConsultas registros={cena.registros} className={estilos.registro} />
      </div>

      <RotaCena fase={cena.fase} rastreio={cena.rastreio} className={estilos.rota} />

      <CartaoOrigem origem={cena.origem} rastreando={cena.fase === 'RASTREANDO'} className={estilos.origem} />
    </div>
  );
}
