import { Fragment, useId } from 'react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './MarcaOrynt.module.css';

interface MarcaOryntProps {
  tamanho?: number;
  animada?: boolean;
  className?: string;
}

type Parada = readonly [posicao: number, tom: string];

interface Anel {
  nome: string;
  cx: number;
  cy: number;
  destacado?: boolean;
  topo: readonly Parada[];
  lateral: readonly Parada[];
  interior: readonly Parada[];
}

const RAIO = 168;
const FURO = 84;
const ACHATAMENTO = 0.42;
const ESPESSURA = 50;
const RAIO_VERTICAL = RAIO * ACHATAMENTO;
const FURO_VERTICAL = FURO * ACHATAMENTO;
const MEIA_CORDA_DO_FURO = FURO * Math.sqrt(1 - (ESPESSURA / 2 / FURO_VERTICAL) ** 2);

const ANEIS: readonly Anel[] = [
  {
    nome: 'base',
    cx: 232,
    cy: 308,
    topo: [
      [0, 'tom400'],
      [1, 'tom700'],
    ],
    lateral: [
      [0, 'tom700'],
      [0.2, 'tom600'],
      [0.58, 'tom800'],
      [1, 'tom950'],
    ],
    interior: [
      [0, 'tom950'],
      [1, 'tom800'],
    ],
  },
  {
    nome: 'meio',
    cx: 280,
    cy: 232,
    destacado: true,
    topo: [
      [0, 'luz'],
      [1, 'tom200'],
    ],
    lateral: [
      [0, 'tom100'],
      [0.2, 'luz'],
      [0.58, 'tom200'],
      [1, 'tom400'],
    ],
    interior: [
      [0, 'tom600'],
      [1, 'tom300'],
    ],
  },
  {
    nome: 'alto',
    cx: 232,
    cy: 156,
    topo: [
      [0, 'tom200'],
      [1, 'tom500'],
    ],
    lateral: [
      [0, 'tom500'],
      [0.2, 'tom400'],
      [0.58, 'tom600'],
      [1, 'tom900'],
    ],
    interior: [
      [0, 'tom950'],
      [1, 'tom700'],
    ],
  },
];

function elipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
}

function faceSuperior({ cx, cy }: Anel): string {
  return elipse(cx, cy, RAIO, RAIO_VERTICAL) + elipse(cx, cy, FURO, FURO_VERTICAL);
}

function faceLateral({ cx, cy }: Anel): string {
  const base = cy + ESPESSURA;
  return `M${cx - RAIO} ${cy}V${base}A${RAIO} ${RAIO_VERTICAL} 0 0 0 ${cx + RAIO} ${base}V${cy}A${RAIO} ${RAIO_VERTICAL} 0 0 1 ${cx - RAIO} ${cy}Z`;
}

function faceInterior({ cx, cy }: Anel): string {
  const esquerda = cx - MEIA_CORDA_DO_FURO;
  const direita = cx + MEIA_CORDA_DO_FURO;
  const altura = cy + ESPESSURA / 2;
  return `M${esquerda} ${altura}A${FURO} ${FURO_VERTICAL} 0 1 1 ${direita} ${altura}A${FURO} ${FURO_VERTICAL} 0 0 0 ${esquerda} ${altura}Z`;
}

function paradas(lista: readonly Parada[]) {
  return lista.map(([posicao, tom]) => <stop key={posicao} offset={posicao} className={estilos[tom]} />);
}

export function MarcaOrynt({ tamanho = 32, animada = false, className }: MarcaOryntProps) {
  const prefixo = useId().replace(/:/g, '');
  const gradiente = (anel: Anel, face: string) => `${prefixo}-${anel.nome}-${face}`;

  return (
    <svg
      className={juntarClasses(estilos.marca, animada && estilos.animada, className)}
      width={tamanho}
      height={tamanho}
      viewBox="56 57 400 400"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {ANEIS.map((anel) => (
          <Fragment key={anel.nome}>
            <linearGradient
              id={gradiente(anel, 'topo')}
              gradientUnits="userSpaceOnUse"
              x1={anel.cx - RAIO * 0.8}
              y1={anel.cy - RAIO_VERTICAL}
              x2={anel.cx + RAIO * 0.8}
              y2={anel.cy + RAIO_VERTICAL}
            >
              {paradas(anel.topo)}
            </linearGradient>
            <linearGradient
              id={gradiente(anel, 'lateral')}
              gradientUnits="userSpaceOnUse"
              x1={anel.cx - RAIO}
              y1={0}
              x2={anel.cx + RAIO}
              y2={0}
            >
              {paradas(anel.lateral)}
            </linearGradient>
            <linearGradient
              id={gradiente(anel, 'interior')}
              gradientUnits="userSpaceOnUse"
              x1={anel.cx - FURO}
              y1={0}
              x2={anel.cx + FURO}
              y2={0}
            >
              {paradas(anel.interior)}
            </linearGradient>
          </Fragment>
        ))}
      </defs>
      {ANEIS.map((anel) => (
        <g key={anel.nome} className={anel.destacado ? estilos.destacado : undefined}>
          <path d={faceInterior(anel)} fill={`url(#${gradiente(anel, 'interior')})`} />
          <path d={faceLateral(anel)} fill={`url(#${gradiente(anel, 'lateral')})`} />
          <path d={faceSuperior(anel)} fill={`url(#${gradiente(anel, 'topo')})`} fillRule="evenodd" />
        </g>
      ))}
    </svg>
  );
}
