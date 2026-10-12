import { forwardRef } from 'react';
import type { ClipboardEvent, InputHTMLAttributes, SyntheticEvent } from 'react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { EstruturaCampo } from './EstruturaCampo';
import type { PropriedadesMensagensCampo } from './EstruturaCampo';
import estilos from './CampoCodigo.module.css';

export interface CampoCodigoProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type' | 'value' | 'onChange' | 'maxLength'>,
    PropriedadesMensagensCampo {
  valor: string;
  tamanho?: number;
  aoMudar: (valor: string) => void;
}

function somenteDigitos(texto: string, tamanho: number): string {
  return texto.replace(/\D/g, '').slice(0, tamanho);
}

function manterCursorNoFim(evento: SyntheticEvent<HTMLInputElement>): void {
  const controle = evento.currentTarget;
  const fim = controle.value.length;
  if (controle.selectionStart !== fim || controle.selectionEnd !== fim) controle.setSelectionRange(fim, fim);
}

export const CampoCodigo = forwardRef<HTMLInputElement, CampoCodigoProps>(function CampoCodigo(
  { rotulo, dica, erro, sucesso, className, id, valor, tamanho = 6, aoMudar, ...resto },
  ref,
) {
  const casaAtiva = Math.min(valor.length, tamanho - 1);

  const colar = (evento: ClipboardEvent<HTMLInputElement>) => {
    evento.preventDefault();
    if (evento.currentTarget.readOnly) return;
    const colado = somenteDigitos(evento.clipboardData.getData('text'), tamanho);
    if (colado) aoMudar(colado);
  };

  return (
    <EstruturaCampo id={id} rotulo={rotulo} dica={dica} erro={erro} sucesso={sucesso} className={className}>
      {({ idControle, idDescricao }) => (
        <div className={juntarClasses(estilos.codigo, erro && estilos.comErro)}>
          <input
            ref={ref}
            id={idControle}
            className={estilos.entrada}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={valor}
            aria-invalid={erro ? true : undefined}
            aria-describedby={idDescricao}
            onChange={(evento) => aoMudar(somenteDigitos(evento.target.value, tamanho))}
            onPaste={colar}
            onSelect={manterCursorNoFim}
            {...resto}
          />
          <div className={estilos.casas} aria-hidden="true">
            {Array.from({ length: tamanho }, (_, indice) => {
              const digito = valor[indice];
              return (
                <span key={indice} className={estilos.casa} data-ativa={indice === casaAtiva || undefined}>
                  {digito ? (
                    <span className={estilos.digito}>{digito}</span>
                  ) : indice === casaAtiva ? (
                    <span className={estilos.cursor} />
                  ) : null}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </EstruturaCampo>
  );
});
