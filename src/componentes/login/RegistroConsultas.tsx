import type { CSSProperties } from 'react';
import { SquareTerminal } from 'lucide-react';
import type { DesempenhoConsulta } from '@/modelos/dashboard';
import { formatarDuracaoMs } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { CartaoCena, TituloCena } from './CartaoCena';
import { REGISTROS_NA_CENA } from './roteiroCena';
import type { RegistroCena } from './roteiroCena';
import estilos from './RegistroConsultas.module.css';

interface RegistroConsultasProps {
  registros: RegistroCena[];
  className?: string;
}

const classeDoDesempenho: Record<DesempenhoConsulta, string | undefined> = {
  RAPIDA: estilos.rapida,
  MODERADA: estilos.moderada,
  LENTA: estilos.lenta,
};

export function RegistroConsultas({ registros, className }: RegistroConsultasProps) {
  return (
    <CartaoCena className={juntarClasses(estilos.registro, className)}>
      <div className={estilos.cabecalho}>
        <TituloCena icone={SquareTerminal}>Consultas agora</TituloCena>
        <span className={estilos.vivo}>
          <span className={estilos.pulso} />
          Ao vivo
        </span>
      </div>

      <div className={estilos.lista} style={{ '--linhas': REGISTROS_NA_CENA - 1 } as CSSProperties}>
        {registros.map((registro, indice) => (
          <div
            key={registro.id}
            className={juntarClasses(estilos.linha, classeDoDesempenho[registro.desempenho])}
            style={{ '--indice': indice } as CSSProperties}
            data-saindo={indice === REGISTROS_NA_CENA - 1 || undefined}
          >
            <span className={estilos.marca} />
            <span className={estilos.sql}>{registro.sql}</span>
            <span className={estilos.duracao}>{formatarDuracaoMs(registro.duracaoMs)}</span>
          </div>
        ))}
      </div>
    </CartaoCena>
  );
}
