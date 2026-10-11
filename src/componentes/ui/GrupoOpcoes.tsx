import { useId } from 'react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './GrupoOpcoes.module.css';

export interface OpcaoGrupo<T extends string> {
  valor: T;
  rotulo: string;
}

export interface GrupoOpcoesProps<T extends string> {
  rotulo: string;
  opcoes: OpcaoGrupo<T>[];
  valor: T;
  aoMudar: (valor: T) => void;
  tamanho?: 'sm' | 'md';
  className?: string;
}

export function GrupoOpcoes<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  tamanho = 'md',
  className,
}: GrupoOpcoesProps<T>) {
  const nome = useId();

  return (
    <div role="radiogroup" aria-label={rotulo} className={juntarClasses(estilos.grupo, estilos[tamanho], className)}>
      {opcoes.map((opcao) => (
        <label key={opcao.valor} className={estilos.opcao}>
          <input
            type="radio"
            name={nome}
            value={opcao.valor}
            checked={valor === opcao.valor}
            onChange={() => aoMudar(opcao.valor)}
            className={estilos.entrada}
          />
          <span className={estilos.rotulo}>{opcao.rotulo}</span>
        </label>
      ))}
    </div>
  );
}
