import { useId } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipProps } from 'recharts';
import estilos from '@/componentes/relatorios/GraficoEvolucao.module.css';
import type { PontoDeCrescimentoDTO } from '@/modelos/objetos';
import { escalaDoCrescimento } from '@/regras/tabelas';
import { formatarDecimal, formatarDiaMes, formatarNumero, formatarTamanho, pluralizar } from '@/utilitarios/formatacao';
import { prefereMovimentoReduzido } from '@/utilitarios/graficos';
import proprios from './GraficoCrescimento.module.css';

interface GraficoCrescimentoProps {
  pontos: PontoDeCrescimentoDTO[];
}

const ALTURA_PX = 150;
const LARGURA_EIXO_PX = 48;
const margem = { top: 8, right: 16, bottom: 0, left: 0 };
const formatadorDaDica = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

function dataDoDia(dia: string): Date {
  return new Date(`${dia}T12:00:00`);
}

function DicaCrescimento({ active, payload }: TooltipProps<number, string>) {
  const ponto = payload?.[0]?.payload as PontoDeCrescimentoDTO | undefined;
  if (!active || !ponto) return null;

  return (
    <div className={estilos.dica}>
      <span className={estilos.dicaRotulo}>{formatadorDaDica.format(dataDoDia(ponto.dia))}</span>
      <span className={estilos.dicaLinha}>
        <span className={estilos.dicaMarca} aria-hidden="true" />
        <span className={estilos.dicaValor}>{formatarTamanho(ponto.tamanhoBytes)}</span>
      </span>
      <span className={estilos.dicaLinha}>
        <span className={estilos.dicaValor}>{formatarNumero(ponto.linhas)}</span>{' '}
        {pluralizar(ponto.linhas, 'linha', 'linhas')}
      </span>
    </div>
  );
}

export function GraficoCrescimento({ pontos }: GraficoCrescimentoProps) {
  const idResumo = useId();
  const primeiro = pontos[0];
  const ultimo = pontos.at(-1);
  if (!primeiro || !ultimo) return null;

  const escala = escalaDoCrescimento(pontos.map((ponto) => ponto.tamanhoBytes));
  const marcasDoDia = pontos.filter((_, posicao) => (pontos.length - 1 - posicao) % 7 === 0).map((ponto) => ponto.dia);

  return (
    <figure className={estilos.grafico} aria-describedby={idResumo}>
      <figcaption className="visualmente-oculto" id={idResumo}>
        Tamanho total da tabela por dia. Em {formatadorDaDica.format(dataDoDia(primeiro.dia))}: {formatarTamanho(primeiro.tamanhoBytes)}.
        Em {formatadorDaDica.format(dataDoDia(ultimo.dia))}: {formatarTamanho(ultimo.tamanhoBytes)}.
      </figcaption>
      <p className={estilos.titulo}>Tamanho total, em {escala.unidade}</p>
      <div className={estilos.area} style={{ height: ALTURA_PX }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pontos} margin={margem}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="dia"
              axisLine={false}
              tickLine={false}
              ticks={marcasDoDia}
              tickFormatter={(dia: string) => formatarDiaMes(`${dia}T12:00:00`)}
              interval="preserveEnd"
              minTickGap={16}
              tickMargin={10}
              height={30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              ticks={escala.marcas}
              domain={[escala.marcas[0] ?? 'auto', escala.marcas.at(-1) ?? 'auto']}
              tickFormatter={(valor: number) => formatarDecimal(valor / escala.divisor, escala.casas)}
              width={LARGURA_EIXO_PX}
              tickMargin={6}
            />
            <Tooltip cursor={{ className: estilos.linhaCursor }} content={<DicaCrescimento />} isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="tamanhoBytes"
              name="Tamanho total"
              strokeWidth={2}
              className={proprios.linha}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, className: estilos.marcador }}
              isAnimationActive={!prefereMovimentoReduzido()}
              animationDuration={480}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
