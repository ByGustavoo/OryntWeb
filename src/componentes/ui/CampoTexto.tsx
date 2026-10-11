import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { classesControle } from './classesControle';
import { EstruturaCampo } from './EstruturaCampo';
import type { PropriedadesMensagensCampo } from './EstruturaCampo';
import estilos from './Campo.module.css';

export interface CampoTextoProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'>,
    PropriedadesMensagensCampo {
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  icone?: LucideIcon;
}

export const CampoTexto = forwardRef<HTMLInputElement, CampoTextoProps>(function CampoTexto(
  { rotulo, dica, erro, sucesso, className, icone: Icone, id, required, ...resto },
  ref,
) {
  return (
    <EstruturaCampo
      id={id}
      rotulo={rotulo}
      dica={dica}
      erro={erro}
      sucesso={sucesso}
      obrigatorio={required}
      className={className}
    >
      {({ idControle, idDescricao }) => (
        <div className={classesControle(erro, sucesso)}>
          {Icone ? <Icone className={estilos.icone} size={16} strokeWidth={2} aria-hidden="true" /> : null}
          <input
            ref={ref}
            id={idControle}
            className={estilos.entrada}
            required={required}
            aria-invalid={erro ? true : undefined}
            aria-describedby={idDescricao}
            {...resto}
          />
        </div>
      )}
    </EstruturaCampo>
  );
});
