import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { DirecaoOrdenacao } from '@/modelos/consultas';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './TabelaObjetos.module.css';

export interface ColunaOrdenavel<T extends string> {
  ordenacao: T;
  rotulo: string;
  rotuloOrdenacao: string;
}

export const ESMAECIMENTO_DO_ESQUELETO = 0.6;

interface BotaoOrdenarProps<T extends string> {
  coluna: ColunaOrdenavel<T>;
  ordenacao: T;
  direcao: DirecaoOrdenacao;
  aoAlternarOrdenacao: (ordenacao: T) => void;
}

export function BotaoOrdenar<T extends string>({ coluna, ordenacao, direcao, aoAlternarOrdenacao }: BotaoOrdenarProps<T>) {
  const ativa = ordenacao === coluna.ordenacao;
  const Icone = !ativa ? ArrowUpDown : direcao === 'DESC' ? ArrowDown : ArrowUp;

  return (
    <button
      type="button"
      className={juntarClasses(estilos.ordenar, ativa && estilos.ordenarAtivo)}
      onClick={() => aoAlternarOrdenacao(coluna.ordenacao)}
    >
      {coluna.rotulo}
      <Icone size={14} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

export function ordemAria(ativa: boolean, direcao: DirecaoOrdenacao) {
  if (!ativa) return 'none';
  return direcao === 'DESC' ? 'descending' : 'ascending';
}

export function NaoSeAplica() {
  return (
    <>
      <span className={estilos.vazio} aria-hidden="true">
        —
      </span>
      <span className="visualmente-oculto">Não se aplica</span>
    </>
  );
}
