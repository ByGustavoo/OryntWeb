import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Copy,
  SquareTerminal,
  Timer,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { TrechoSql } from '@/componentes/comum/TrechoSql';
import { Botao, CabecalhoPainel, Painel } from '@/componentes/ui';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { textoDosDestaques } from '@/regras/destaquesRelatorio';
import type { Destaque, TipoDestaque } from '@/regras/destaquesRelatorio';
import { copiarTexto } from '@/utilitarios/areaTransferencia';
import { juntarClasses } from '@/utilitarios/juntarClasses';
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
              <span className={juntarClasses(estilos.icone, estilos[destaque.tom])} aria-hidden="true">
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
