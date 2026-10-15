import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Copy,
  Gauge,
  SquareTerminal,
  Timer,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { TrechoSql } from '@/componentes/comum/TrechoSql';
import { Botao, CabecalhoPainel, Esqueleto, Painel } from '@/componentes/ui';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { textoDosDestaques } from '@/regras/destaquesRelatorio';
import type { Destaque, TipoDestaque } from '@/regras/destaquesRelatorio';
import { copiarTexto } from '@/utilitarios/areaTransferencia';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { LinhaEmEspera, PainelEmEspera } from './EsqueletoRelatorio';
import estilos from './DestaquesRelatorio.module.css';

interface TextosDosDestaques {
  titulo: string;
  descricao: string;
  copiado: string;
  falhaAoCopiar: string;
}

interface DestaquesRelatorioProps {
  destaques: Destaque[];
  cabecalhoDaCopia: string;
  textos?: TextosDosDestaques;
}

const textosDoResumo: TextosDosDestaques = {
  titulo: 'Destaques',
  descricao: 'O que marcou o período, em poucas frases',
  copiado: 'Destaques copiados para a área de transferência.',
  falhaAoCopiar: 'Não foi possível copiar os destaques',
};

const DURACAO_CONFIRMACAO_MS = 2400;

const icones: Record<TipoDestaque, LucideIcon> = {
  VOLUME: Activity,
  CALENDARIO: CalendarDays,
  TEMPO: Timer,
  PICO: TrendingUp,
  LENTAS: TriangleAlert,
  LENTIDAO: Gauge,
  CONSULTA: SquareTerminal,
  PIORA: ArrowUpRight,
  MELHORA: ArrowDownRight,
};

export function DestaquesRelatorio({ destaques, cabecalhoDaCopia, textos = textosDoResumo }: DestaquesRelatorioProps) {
  const notificacoes = useNotificacoes();
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const temporizador = window.setTimeout(() => setCopiado(false), DURACAO_CONFIRMACAO_MS);
    return () => window.clearTimeout(temporizador);
  }, [copiado]);

  const copiar = async () => {
    const copiou = await copiarTexto(textoDosDestaques(cabecalhoDaCopia, destaques));
    if (copiou) {
      setCopiado(true);
      return;
    }
    notificacoes.erro(
      textos.falhaAoCopiar,
      'O navegador bloqueou a área de transferência. Selecione o texto na tela e copie por lá.',
    );
  };

  return (
    <Painel aria-labelledby="titulo-destaques" className={estilos.painel}>
      <CabecalhoPainel
        titulo={<span id="titulo-destaques">{textos.titulo}</span>}
        descricao={textos.descricao}
        acao={
          <Botao
            variante="secundario"
            tamanho="sm"
            icone={copiado ? Check : Copy}
            className="nao-imprimir"
            onClick={() => void copiar()}
          >
            {copiado ? 'Copiado' : 'Copiar'}
          </Botao>
        }
      />
      <span className="visualmente-oculto" role="status">
        {copiado ? textos.copiado : ''}
      </span>

      <ul className={estilos.lista}>
        {destaques.map((destaque) => {
          const Icone = icones[destaque.tipo];
          return (
            <li className={estilos.item} key={destaque.tipo}>
              <span
                className={juntarClasses(estilos.icone, destaque.tipo === 'PIORA' ? estilos.piora : estilos[destaque.tom])}
                aria-hidden="true"
              >
                <Icone size={15} strokeWidth={2.25} />
              </span>
              <div className={estilos.textos}>
                <p className={estilos.frase}>{destaque.texto}</p>
                {destaque.sql ? <TrechoSql sql={destaque.sql} className={estilos.sql} /> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Painel>
  );
}

interface EsqueletoDestaquesProps {
  linhasPorFrase: number[];
  textos?: TextosDosDestaques;
}

export function EsqueletoDestaques({ linhasPorFrase, textos = textosDoResumo }: EsqueletoDestaquesProps) {
  return (
    <PainelEmEspera titulo={textos.titulo} descricao={textos.descricao} larguraDaAcao={90} className={estilos.painel}>
      <ul className={estilos.lista}>
        {linhasPorFrase.map((linhas, indice) => (
          <li className={estilos.item} key={indice}>
            <Esqueleto largura={26} altura={26} raio="var(--raio-sm)" />
            <div className={juntarClasses(estilos.textos, estilos.textosEmEspera)}>
              <span className={juntarClasses(estilos.frase, estilos.fraseEmEspera)}>
                <LinhaEmEspera largura={`${linhas > 1 ? 96 : 78 - ((indice * 17) % 26)}%`} />
                {linhas > 1 ? <LinhaEmEspera largura={`${linhas > 2 ? 22 : 46}%`} /> : null}
              </span>
              {linhas > 2 ? <LinhaEmEspera largura="58%" className={estilos.sqlEmEspera} /> : null}
            </div>
          </li>
        ))}
      </ul>
    </PainelEmEspera>
  );
}
