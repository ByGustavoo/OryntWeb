import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatarNumero } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { BotaoIcone } from './BotaoIcone';
import estilos from './Paginacao.module.css';

export interface PaginacaoProps {
  rotulo: string;
  resumo: string;
  pagina: number;
  totalPaginas: number;
  aoMudar: (pagina: number) => void;
  className?: string;
}

export function Paginacao({ rotulo, resumo, pagina, totalPaginas, aoMudar, className }: PaginacaoProps) {
  const temAnterior = pagina > 1;
  const temSeguinte = pagina < totalPaginas;

  return (
    <nav className={juntarClasses(estilos.paginacao, className)} aria-label={rotulo}>
      <p className={`${estilos.resumo} numeros`}>{resumo}</p>
      {totalPaginas > 1 ? (
        <div className={estilos.controles}>
          <BotaoIcone
            icone={ChevronLeft}
            rotulo="Página anterior"
            variante="secundario"
            tamanho="sm"
            aria-disabled={temAnterior ? undefined : true}
            onClick={() => temAnterior && aoMudar(pagina - 1)}
          />
          <span className={estilos.posicao}>
            Página <span className="numeros">{formatarNumero(pagina)}</span> de{' '}
            <span className="numeros">{formatarNumero(totalPaginas)}</span>
          </span>
          <BotaoIcone
            icone={ChevronRight}
            rotulo="Próxima página"
            variante="secundario"
            tamanho="sm"
            aria-disabled={temSeguinte ? undefined : true}
            onClick={() => temSeguinte && aoMudar(pagina + 1)}
          />
        </div>
      ) : null}
    </nav>
  );
}
