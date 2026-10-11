import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './EstadoMensagem.module.css';

export interface EstadoVazioProps {
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  compacto?: boolean;
  className?: string;
}

export function EstadoVazio({ icone: Icone, titulo, descricao, acao, compacto = false, className }: EstadoVazioProps) {
  return (
    <div className={juntarClasses(estilos.estado, compacto && estilos.compacto, className)}>
      <span className={estilos.icone} aria-hidden="true">
        <Icone size={compacto ? 18 : 22} strokeWidth={1.75} />
      </span>
      <div className={estilos.textos}>
        <p className={estilos.titulo}>{titulo}</p>
        {descricao ? <p className={estilos.descricao}>{descricao}</p> : null}
      </div>
      {acao ? <div className={estilos.acoes}>{acao}</div> : null}
    </div>
  );
}
