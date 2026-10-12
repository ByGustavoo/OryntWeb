import { PONTOS_MAXIMOS_FORCA } from '@/regras/forcaSenha';
import type { ForcaSenha } from '@/regras/forcaSenha';
import estilos from './MedidorForcaSenha.module.css';

interface MedidorForcaSenhaProps {
  forca: ForcaSenha | null;
}

export function MedidorForcaSenha({ forca }: MedidorForcaSenhaProps) {
  const pontos = forca?.pontos ?? 0;

  return (
    <div className={estilos.medidor} data-nivel={forca?.nivel}>
      <div className={estilos.barras} aria-hidden="true">
        {Array.from({ length: PONTOS_MAXIMOS_FORCA }, (_, indice) => (
          <span key={indice} className={estilos.barra} data-ativa={indice < pontos || undefined} />
        ))}
      </div>

      <p className="visualmente-oculto" role="status">
        {forca ? `Força da senha: ${forca.rotulo.toLowerCase()}.` : ''}
      </p>
    </div>
  );
}
