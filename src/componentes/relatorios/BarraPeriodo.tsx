import { ChevronsRight } from 'lucide-react';
import { Botao, GrupoOpcoes } from '@/componentes/ui';
import type { PeriodoRelatorio } from '@/modelos/relatorios';
import { passoAnterior, passoSeguinte, rotuloGranularidade } from '@/modelos/rotulos';
import {
  ehPrimeiroPeriodoDisponivel,
  ehUltimoPeriodoFechado,
  granularidadesRelatorio,
  inicioDoPeriodo,
  nomeDoDia,
  periodoVizinho,
  rotuloDoPeriodo,
  trocarGranularidade,
  ultimoPeriodoFechado,
} from '@/regras/periodoRelatorio';
import { iniciarComMaiuscula } from '@/utilitarios/formatacao';
import { PassosPeriodo } from './PassosPeriodo';
import estilos from './BarraPeriodo.module.css';

interface BarraPeriodoProps {
  periodo: PeriodoRelatorio;
  hoje: Date;
  aoMudar: (periodo: PeriodoRelatorio) => void;
}

const opcoesGranularidade = granularidadesRelatorio.map((granularidade) => ({
  valor: granularidade,
  rotulo: rotuloGranularidade[granularidade],
}));

export function BarraPeriodo({ periodo, hoje, aoMudar }: BarraPeriodoProps) {
  const { granularidade } = periodo;
  const noInicio = ehPrimeiroPeriodoDisponivel(periodo, hoje);
  const noFim = ehUltimoPeriodoFechado(periodo, hoje);
  const anterior = periodoVizinho(periodo, -1);
  const rotulo = rotuloDoPeriodo(periodo);

  return (
    <div className={estilos.barra}>
      <GrupoOpcoes
        rotulo="Tamanho do período"
        opcoes={opcoesGranularidade}
        valor={granularidade}
        aoMudar={(proxima) => aoMudar(trocarGranularidade(periodo, proxima, hoje))}
        className="nao-imprimir"
      />

      <div className={estilos.periodo}>
        <PassosPeriodo
          rotulo="Trocar de período"
          rotuloAnterior={passoAnterior[granularidade]}
          rotuloSeguinte={passoSeguinte[granularidade]}
          aoVoltar={noInicio ? null : () => aoMudar(anterior)}
          aoAvancar={noFim ? null : () => aoMudar(periodoVizinho(periodo, 1))}
        />

        <div className={estilos.textos}>
          <p className={estilos.rotulo} role="status">
            {iniciarComMaiuscula(rotulo)}
            {granularidade === 'DIA' ? (
              <>
                <span className="visualmente-oculto">, </span>
                <span className={estilos.dia}>{nomeDoDia(inicioDoPeriodo(periodo))}</span>
              </>
            ) : null}
          </p>
          <p className={estilos.comparacao}>Comparado com {rotuloDoPeriodo(anterior)}</p>
        </div>
      </div>

      {noFim ? null : (
        <Botao
          variante="terciario"
          tamanho="sm"
          iconeDireita={ChevronsRight}
          className={`${estilos.recente} nao-imprimir`}
          onClick={() => aoMudar(ultimoPeriodoFechado(granularidade, hoje))}
        >
          Mais recente
        </Botao>
      )}
    </div>
  );
}
