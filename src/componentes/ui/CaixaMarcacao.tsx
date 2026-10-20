import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './CaixaMarcacao.module.css';

interface CaixaMarcacaoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'children'> {
  marcada: boolean;
  aoMudar: (marcada: boolean) => void;
  descricao?: ReactNode;
  motivoDesabilitada?: string | null;
  codigo?: boolean;
  children: ReactNode;
}

export function CaixaMarcacao({
  marcada,
  aoMudar,
  descricao,
  motivoDesabilitada,
  codigo = false,
  disabled,
  className,
  children,
  ...resto
}: CaixaMarcacaoProps) {
  const id = useId();
  const desabilitada = disabled || Boolean(motivoDesabilitada);
  const textoAuxiliar = motivoDesabilitada ?? descricao;

  return (
    <label className={juntarClasses(estilos.caixa, desabilitada && estilos.desabilitada, className)}>
      <input
        type="checkbox"
        className={estilos.entrada}
        checked={marcada}
        disabled={desabilitada}
        aria-describedby={textoAuxiliar ? `${id}-auxiliar` : undefined}
        onChange={(evento) => aoMudar(evento.target.checked)}
        {...resto}
      />
      <span className={estilos.textos}>
        <span className={juntarClasses(estilos.rotulo, codigo && 'codigo')}>{children}</span>
        {textoAuxiliar ? (
          <span className={estilos.descricao} id={`${id}-auxiliar`}>
            {textoAuxiliar}
          </span>
        ) : null}
      </span>
    </label>
  );
}
