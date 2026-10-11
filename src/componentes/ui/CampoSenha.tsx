import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { classesControle } from './classesControle';
import { EstruturaCampo } from './EstruturaCampo';
import type { PropriedadesMensagensCampo } from './EstruturaCampo';
import estilosCampo from './Campo.module.css';
import estilos from './CampoSenha.module.css';

export interface CampoSenhaProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type' | 'autoComplete'>,
    PropriedadesMensagensCampo {
  preenchimentoAutomatico?: 'current-password' | 'new-password';
}

export const CampoSenha = forwardRef<HTMLInputElement, CampoSenhaProps>(function CampoSenha(
  { rotulo, dica, erro, sucesso, className, id, disabled, preenchimentoAutomatico, ...resto },
  ref,
) {
  const [visivel, setVisivel] = useState(false);
  const rotuloAlternar = visivel ? 'Ocultar senha' : 'Mostrar senha';
  const bloqueioDeGerenciadores = preenchimentoAutomatico
    ? {}
    : { 'data-1p-ignore': '', 'data-lpignore': 'true', 'data-bwignore': '' };

  return (
    <EstruturaCampo id={id} rotulo={rotulo} dica={dica} erro={erro} sucesso={sucesso} className={className}>
      {({ idControle, idDescricao }) => (
        <div className={classesControle(erro, sucesso)}>
          <input
            ref={ref}
            id={idControle}
            type={visivel ? 'text' : 'password'}
            className={estilosCampo.entrada}
            disabled={disabled}
            autoComplete={preenchimentoAutomatico ?? 'off'}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            {...bloqueioDeGerenciadores}
            aria-invalid={erro ? true : undefined}
            aria-describedby={idDescricao}
            {...resto}
          />
          <button
            type="button"
            className={estilos.alternar}
            onClick={() => setVisivel(!visivel)}
            disabled={disabled}
            aria-label={rotuloAlternar}
            aria-pressed={visivel}
            aria-controls={idControle}
            title={rotuloAlternar}
          >
            {visivel ? (
              <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Eye size={16} strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </EstruturaCampo>
  );
});
