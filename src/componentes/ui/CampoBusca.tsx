import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import { aceitaDigitacao, haCamadaAberta } from '@/utilitarios/foco';
import { classesControle } from './classesControle';
import { Dica } from './Dica';
import { EstruturaCampo } from './EstruturaCampo';
import estilosCampo from './Campo.module.css';
import estilos from './CampoBusca.module.css';

export interface CampoBuscaProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type' | 'value' | 'onChange'> {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  rotuloLimpar?: string;
  atalho?: string;
  className?: string;
}

export const CampoBusca = forwardRef<HTMLInputElement, CampoBuscaProps>(function CampoBusca(
  { rotulo, valor, aoMudar, rotuloLimpar = 'Limpar a busca', atalho, className, id, ...resto },
  ref,
) {
  const entrada = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => entrada.current as HTMLInputElement, []);

  useEffect(() => {
    if (!atalho) return;
    const aoPressionar = (evento: KeyboardEvent) => {
      if (evento.key !== atalho || evento.ctrlKey || evento.metaKey || evento.altKey || evento.defaultPrevented) return;
      if (aceitaDigitacao(evento.target) || haCamadaAberta()) return;
      evento.preventDefault();
      entrada.current?.focus();
      entrada.current?.select();
    };
    document.addEventListener('keydown', aoPressionar);
    return () => document.removeEventListener('keydown', aoPressionar);
  }, [atalho]);

  const limpar = () => {
    aoMudar('');
    entrada.current?.focus();
  };

  return (
    <EstruturaCampo id={id} rotulo={rotulo} rotuloOculto className={className}>
      {({ idControle }) => (
        <div className={classesControle()}>
          <Search className={estilosCampo.icone} size={16} strokeWidth={2} aria-hidden="true" />
          <input
            ref={entrada}
            id={idControle}
            type="search"
            className={estilosCampo.entrada}
            value={valor}
            onChange={(evento) => aoMudar(evento.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-keyshortcuts={atalho}
            {...resto}
          />
          {valor !== '' ? (
            <Dica conteudo={rotuloLimpar}>
              <button type="button" className={estilos.limpar} onClick={limpar} aria-label={rotuloLimpar}>
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </Dica>
          ) : atalho ? (
            <Dica conteudo={`Pressione ${atalho} para buscar`}>
              <kbd className={estilos.atalho} aria-hidden="true">
                {atalho}
              </kbd>
            </Dica>
          ) : null}
        </div>
      )}
    </EstruturaCampo>
  );
});
