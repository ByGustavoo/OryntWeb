import type { CSSProperties } from 'react';
import { Crosshair, ScanSearch } from 'lucide-react';
import { SeloDesempenho } from '@/componentes/dashboard/SeloDesempenho';
import { Esqueleto, IndicadorGiratorio } from '@/componentes/ui';
import { formatarDuracaoMs, formatarNumero } from '@/utilitarios/formatacao';
import { destacarSql } from '@/utilitarios/sql';
import { CartaoCena, TituloCena } from './CartaoCena';
import type { OrigemCena } from './roteiroCena';
import estilos from './CartaoOrigem.module.css';

interface CartaoOrigemProps {
  origem: OrigemCena;
  rastreando: boolean;
  className?: string;
}

const LARGURAS_DO_RASTREIO = ['74%', '42%', '88%'];

export function CartaoOrigem({ origem, rastreando, className }: CartaoOrigemProps) {
  return (
    <CartaoCena destaque className={className}>
      <div key={rastreando ? 'rastreio' : origem.id} className={estilos.conteudo} data-rastreando={rastreando || undefined}>
        <div className={estilos.cabecalho}>
          <TituloCena icone={rastreando ? ScanSearch : Crosshair}>
            {rastreando ? 'Rastreando a origem…' : 'Origem do pico'}
          </TituloCena>
          {rastreando ? (
            <IndicadorGiratorio tamanho={14} className={estilos.giro} />
          ) : (
            <SeloDesempenho desempenho="LENTA" />
          )}
        </div>

        <div className={estilos.consulta}>
          {rastreando
            ? LARGURAS_DO_RASTREIO.map((largura) => (
                <span key={largura} className={estilos.linhaRastreio}>
                  <Esqueleto largura={largura} altura={10} imediato />
                </span>
              ))
            : origem.linhas.map((linha, indice) => (
                <span key={linha} className={estilos.linha} style={{ '--ordem': indice } as CSSProperties}>
                  {destacarSql(linha).map((trecho, posicao) =>
                    trecho.palavraChave ? <b key={posicao}>{trecho.texto}</b> : trecho.texto,
                  )}
                </span>
              ))}
        </div>

        <div className={estilos.medidas}>
          <div className={estilos.medida}>
            <span className={estilos.valor}>{rastreando ? '—' : `${origem.percentualTempoTotal}%`}</span>
            <span className={estilos.legenda}>do tempo total do banco</span>
            <span className={estilos.trilho}>
              <span
                className={estilos.fatia}
                style={{ '--fatia': rastreando ? 0 : origem.percentualTempoTotal / 100 } as CSSProperties}
              />
            </span>
          </div>
          <div className={estilos.medida}>
            <span className={estilos.valor}>{rastreando ? '—' : formatarDuracaoMs(origem.tempoMedioMs)}</span>
            <span className={estilos.legenda}>tempo médio</span>
          </div>
          <div className={estilos.medida}>
            <span className={estilos.valor}>{rastreando ? '—' : formatarNumero(origem.execucoes)}</span>
            <span className={estilos.legenda}>execuções</span>
          </div>
        </div>
      </div>
    </CartaoCena>
  );
}
