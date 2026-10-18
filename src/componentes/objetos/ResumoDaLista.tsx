import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Botao, Esqueleto } from '@/componentes/ui';
import { formatarNumero } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './ResumoDaLista.module.css';

export interface AtalhoDaLista {
  chave: string;
  icone: LucideIcon;
  tom: 'aviso' | 'erro';
  quantidade: number;
  texto: string;
  ativo: boolean;
  aoAlternar: () => void;
}

interface ResumoDaListaProps {
  contagem: string;
  complemento?: ReactNode;
  emEspera: boolean;
  rotuloDosAtalhos: string;
  atalhos: AtalhoDaLista[];
  acao?: ReactNode;
  mostrarLimpar: boolean;
  aoLimpar: () => void;
}

export function ResumoDaLista({
  contagem,
  complemento,
  emEspera,
  rotuloDosAtalhos,
  atalhos,
  acao,
  mostrarLimpar,
  aoLimpar,
}: ResumoDaListaProps) {
  const visiveis = atalhos.filter((atalho) => atalho.quantidade > 0);

  return (
    <div className={estilos.resumo}>
      <div className={estilos.textos}>
        <p className={estilos.contagem} role="status">
          {emEspera ? <Esqueleto largura={96} altura={12} /> : contagem}
        </p>
        {complemento && !emEspera ? complemento : null}
      </div>
      <div className={estilos.acoes}>
        {visiveis.length > 0 ? (
          <div className={estilos.atalhos} role="group" aria-label={rotuloDosAtalhos}>
            {visiveis.map((atalho) => {
              const Icone = atalho.icone;
              return (
                <button
                  key={atalho.chave}
                  type="button"
                  className={juntarClasses(estilos.atalho, estilos[atalho.tom], atalho.ativo && estilos.atalhoAtivo)}
                  aria-pressed={atalho.ativo}
                  onClick={atalho.aoAlternar}
                >
                  <Icone size={14} strokeWidth={2} aria-hidden="true" />
                  <span className="numeros">{formatarNumero(atalho.quantidade)}</span>
                  {atalho.texto}
                </button>
              );
            })}
          </div>
        ) : null}
        {acao}
        {mostrarLimpar ? (
          <Botao variante="terciario" tamanho="sm" onClick={aoLimpar}>
            Limpar filtros
          </Botao>
        ) : null}
      </div>
    </div>
  );
}
