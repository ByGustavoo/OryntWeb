import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BotaoIcone } from '@/componentes/ui';
import estilos from './PassosPeriodo.module.css';

interface PassosPeriodoProps {
  rotulo: string;
  rotuloAnterior: string;
  rotuloSeguinte: string;
  aoVoltar: (() => void) | null;
  aoAvancar: (() => void) | null;
}

export function PassosPeriodo({ rotulo, rotuloAnterior, rotuloSeguinte, aoVoltar, aoAvancar }: PassosPeriodoProps) {
  return (
    <div className={`${estilos.passos} nao-imprimir`} role="group" aria-label={rotulo}>
      <BotaoIcone
        icone={ChevronLeft}
        rotulo={rotuloAnterior}
        variante="secundario"
        aria-disabled={aoVoltar ? undefined : true}
        onClick={() => aoVoltar?.()}
      />
      <BotaoIcone
        icone={ChevronRight}
        rotulo={rotuloSeguinte}
        variante="secundario"
        aria-disabled={aoAvancar ? undefined : true}
        onClick={() => aoAvancar?.()}
      />
    </div>
  );
}
