import type { LucideIcon } from 'lucide-react';
import { CircleCheck, CornerDownRight, Filter, Gauge, HardDrive, Repeat, Ruler, ScanLine } from 'lucide-react';
import { CabecalhoPainel, Painel } from '@/componentes/ui';
import { LinhaEmEspera, PainelEmEspera } from '@/componentes/relatorios/EsqueletoRelatorio';
import { Esqueleto } from '@/componentes/ui';
import type { Achado, TipoAchado } from '@/regras/planoExecucao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import destaques from '@/componentes/relatorios/DestaquesRelatorio.module.css';
import estilos from './DiagnosticoPlano.module.css';

interface DiagnosticoPlanoProps {
  achados: Achado[];
  nomeDaEtapa: (id: number) => string;
  aoIrParaEtapa: (id: number) => void;
  comLigacoes: boolean;
}

const TITULO = 'Diagnóstico';
const DESCRICAO = 'O que o plano revela, em poucas frases';

const icones: Record<TipoAchado, LucideIcon> = {
  ETAPA: Gauge,
  VARREDURA: ScanLine,
  FILTRO: Filter,
  ESTIMATIVA: Ruler,
  DISCO: HardDrive,
  LACO: Repeat,
  SAUDAVEL: CircleCheck,
};

export function DiagnosticoPlano({ achados, nomeDaEtapa, aoIrParaEtapa, comLigacoes }: DiagnosticoPlanoProps) {
  return (
    <Painel aria-labelledby="titulo-diagnostico-plano" className={destaques.painel}>
      <CabecalhoPainel titulo={<span id="titulo-diagnostico-plano">{TITULO}</span>} descricao={DESCRICAO} />
      <ul className={juntarClasses(destaques.lista, estilos.lista)}>
        {achados.map((achado, posicao) => {
          const Icone = icones[achado.tipo];
          const ligada =
            comLigacoes && achado.no !== null && achados.findIndex((outro) => outro.no === achado.no) === posicao;
          return (
            <li className={destaques.item} key={achado.tipo + String(achado.no)}>
              <span className={juntarClasses(destaques.icone, destaques[achado.tom])} aria-hidden="true">
                <Icone size={15} strokeWidth={2.25} />
              </span>
              <div className={destaques.textos}>
                <p className={destaques.frase}>{achado.texto}</p>
                {ligada && achado.no !== null ? (
                  <button type="button" className={estilos.irPara} onClick={() => achado.no !== null && aoIrParaEtapa(achado.no)}>
                    <CornerDownRight size={13} strokeWidth={2.25} aria-hidden="true" />
                    Ver {nomeDaEtapa(achado.no)} na árvore
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Painel>
  );
}

export function EsqueletoDiagnostico({ frases = 3 }: { frases?: number }) {
  return (
    <PainelEmEspera titulo={TITULO} descricao={DESCRICAO} className={destaques.painel}>
      <ul className={juntarClasses(destaques.lista, estilos.lista)}>
        {Array.from({ length: frases }, (_, indice) => (
          <li className={destaques.item} key={indice}>
            <Esqueleto largura={26} altura={26} raio="var(--raio-sm)" />
            <div className={juntarClasses(destaques.textos, destaques.textosEmEspera)}>
              <span className={juntarClasses(destaques.frase, destaques.fraseEmEspera)}>
                <LinhaEmEspera largura="94%" />
                <LinhaEmEspera largura={`${44 - indice * 9}%`} />
              </span>
              <LinhaEmEspera largura={140} className={estilos.irParaEmEspera} />
            </div>
          </li>
        ))}
      </ul>
    </PainelEmEspera>
  );
}
