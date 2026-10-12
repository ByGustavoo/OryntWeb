import { useId } from 'react';
import { ArrowLeftRight, ChevronsRight } from 'lucide-react';
import { Botao, BotaoIcone, GrupoOpcoes } from '@/componentes/ui';
import type { PeriodoRelatorio } from '@/modelos/relatorios';
import { passoAnterior, passoSeguinte, rotuloGranularidade } from '@/modelos/rotulos';
import {
  acompanharPeriodo,
  atalhoEmUso,
  atalhosDeBase,
  baseDoAtalho,
  inverterPeriodos,
  rotulosDoSeletor,
  vizinhaDaBase,
} from '@/regras/comparacaoRelatorio';
import type { ParDePeriodos } from '@/regras/comparacaoRelatorio';
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
import { juntarClasses } from '@/utilitarios/juntarClasses';
import type { AcaoPeriodo } from './BarraPeriodo';
import { PassosPeriodo } from './PassosPeriodo';
import estilos from './SeletorComparacao.module.css';

interface SeletorComparacaoProps {
  par: ParDePeriodos;
  hoje: Date;
  aoMudar: (par: ParDePeriodos) => void;
  acoes?: AcaoPeriodo[];
}

const opcoesGranularidade = granularidadesRelatorio.map((granularidade) => ({
  valor: granularidade,
  rotulo: rotuloGranularidade[granularidade],
}));

function RotuloDoPeriodo({ periodo, rotulo }: { periodo: PeriodoRelatorio; rotulo: string }) {
  const dia = periodo.granularidade === 'DIA' ? nomeDoDia(inicioDoPeriodo(periodo)) : null;
  const porExtenso = iniciarComMaiuscula(rotuloDoPeriodo(periodo));

  return (
    <p className={estilos.rotulo} role="status">
      <span className="visualmente-oculto">{dia ? `${porExtenso}, ${dia}` : porExtenso}</span>
      <span aria-hidden="true">{rotulo}</span>
      {dia ? (
        <span className={estilos.dia} aria-hidden="true">
          {dia}
        </span>
      ) : null}
    </p>
  );
}

export function SeletorComparacao({ par, hoje, aoMudar, acoes = [] }: SeletorComparacaoProps) {
  const idPeriodo = useId();
  const idBase = useId();
  const { periodo, base } = par;
  const { granularidade } = periodo;
  const noInicio = ehPrimeiroPeriodoDisponivel(periodo, hoje);
  const noFim = ehUltimoPeriodoFechado(periodo, hoje);
  const baseAnterior = vizinhaDaBase(par, -1, hoje);
  const baseSeguinte = vizinhaDaBase(par, 1, hoje);
  const emUso = atalhoEmUso(par);
  const rotulos = rotulosDoSeletor(par);
  const mudarPeriodo = (proximo: PeriodoRelatorio) => aoMudar(acompanharPeriodo(par, proximo, hoje));
  const mudarBase = (proxima: PeriodoRelatorio) => aoMudar({ periodo, base: proxima });

  return (
    <div className={`${estilos.seletor} nao-imprimir`}>
      <div className={estilos.topo}>
        <GrupoOpcoes
          rotulo="Tamanho dos períodos"
          opcoes={opcoesGranularidade}
          valor={granularidade}
          aoMudar={(proxima) => mudarPeriodo(trocarGranularidade(periodo, proxima, hoje))}
        />

        {acoes.length > 0 ? (
          <div className={estilos.acoes}>
            {acoes.map((acao) => (
              <Botao
                key={acao.rotulo}
                variante="secundario"
                icone={acao.icone}
                carregando={acao.carregando}
                onClick={acao.aoAcionar}
              >
                {acao.rotulo}
              </Botao>
            ))}
          </div>
        ) : null}
      </div>

      <div className={estilos.lados}>
        <div className={estilos.lado} role="group" aria-labelledby={idPeriodo}>
          <p className={estilos.papel} id={idPeriodo}>
            <span className={juntarClasses(estilos.traco, estilos.tracoPrincipal)} aria-hidden="true" />
            Período
          </p>
          <div className={estilos.linha}>
            <PassosPeriodo
              rotulo="Trocar o período"
              rotuloAnterior={passoAnterior[granularidade]}
              rotuloSeguinte={passoSeguinte[granularidade]}
              aoVoltar={noInicio ? null : () => mudarPeriodo(periodoVizinho(periodo, -1))}
              aoAvancar={noFim ? null : () => mudarPeriodo(periodoVizinho(periodo, 1))}
            />
            <RotuloDoPeriodo periodo={periodo} rotulo={rotulos.principal} />
          </div>
          <div className={estilos.complemento}>
            {noFim ? (
              <p className={estilos.observacao}>É o período fechado mais recente.</p>
            ) : (
              <Botao
                variante="terciario"
                tamanho="sm"
                iconeDireita={ChevronsRight}
                className={estilos.recente}
                onClick={() => mudarPeriodo(ultimoPeriodoFechado(granularidade, hoje))}
              >
                Mais recente
              </Botao>
            )}
          </div>
        </div>

        <div className={estilos.troca}>
          <BotaoIcone
            icone={ArrowLeftRight}
            rotulo="Inverter os períodos"
            variante="secundario"
            className={estilos.inverter}
            onClick={() => aoMudar(inverterPeriodos(par))}
          />
        </div>

        <div className={estilos.lado} role="group" aria-labelledby={idBase}>
          <p className={estilos.papel} id={idBase}>
            <span className={juntarClasses(estilos.traco, estilos.tracoBase)} aria-hidden="true" />
            Comparar com
          </p>
          <div className={estilos.linha}>
            <PassosPeriodo
              rotulo="Trocar o período de comparação"
              rotuloAnterior={passoAnterior[granularidade]}
              rotuloSeguinte={passoSeguinte[granularidade]}
              aoVoltar={baseAnterior ? () => mudarBase(baseAnterior) : null}
              aoAvancar={baseSeguinte ? () => mudarBase(baseSeguinte) : null}
            />
            <RotuloDoPeriodo periodo={base} rotulo={rotulos.base} />
          </div>
          <div className={estilos.complemento} role="group" aria-label="Atalhos de comparação">
            {atalhosDeBase[granularidade].map((atalho) => {
              const destino = baseDoAtalho(periodo, atalho, hoje);
              return (
                <button
                  key={atalho.passos}
                  type="button"
                  className={estilos.atalho}
                  aria-pressed={emUso?.passos === atalho.passos}
                  aria-disabled={destino ? undefined : true}
                  title={destino ? undefined : 'Fora dos 12 meses de histórico'}
                  onClick={() => {
                    if (destino) mudarBase(destino);
                  }}
                >
                  {atalho.rotulo}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
