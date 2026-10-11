import { Fragment } from 'react';
import type { CSSProperties } from 'react';
import { NOME_APLICACAO, SLOGAN_APLICACAO } from '@/configuracoes/aplicacao';
import { CenaMonitoramento } from './CenaMonitoramento';
import estilos from './PainelMonitoramento.module.css';

interface PainelMonitoramentoProps {
  comCena: boolean;
}

const PALAVRAS_DO_SLOGAN = SLOGAN_APLICACAO.split(' ');

export function PainelMonitoramento({ comCena }: PainelMonitoramentoProps) {
  return (
    <aside className={estilos.painel} aria-label={`O que o ${NOME_APLICACAO} faz`}>
      <div className={estilos.luz} aria-hidden="true" />

      <div className={estilos.conteudo}>
        <div className={estilos.apresentacao}>
          <p className={estilos.sobretitulo}>
            <span className={estilos.sinal} aria-hidden="true" />
            Monitoramento de consultas PostgreSQL
          </p>
          <p className={estilos.slogan}>
            {PALAVRAS_DO_SLOGAN.map((palavra, indice) => (
              <Fragment key={indice}>
                {indice > 0 ? ' ' : null}
                <span className={estilos.palavra}>
                  <span style={{ '--ordem': indice } as CSSProperties}>{palavra}</span>
                </span>
              </Fragment>
            ))}
          </p>
          <p className={estilos.descricao}>
            O {NOME_APLICACAO} rastreia cada pico de latência até a consulta que o causou e mostra quanto ela pesa no seu
            banco.
          </p>
        </div>

        {comCena ? <CenaMonitoramento /> : null}
      </div>
    </aside>
  );
}
