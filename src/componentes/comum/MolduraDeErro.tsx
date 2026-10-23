import type { CSSProperties, ReactNode } from 'react';
import { ID_CONTEUDO_PRINCIPAL, SLOGAN_APLICACAO } from '@/configuracoes/aplicacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { MarcaOrynt } from './MarcaOrynt';
import { NomeOrynt } from './NomeOrynt';
import estilos from './MolduraDeErro.module.css';

interface MolduraDeErroProps {
  marca: ReactNode;
  terminal: ReactNode;
  sobretitulo: string;
  titulo: string;
  descricao: ReactNode;
  acoes: ReactNode;
  rodape?: ReactNode;
  alerta?: boolean;
}

const PULSOS: ReadonlyArray<{ direcao: 'linha' | 'coluna'; posicao: number; duracao: number; atraso: number }> = [
  { direcao: 'linha', posicao: 4, duracao: 11, atraso: 0 },
  { direcao: 'linha', posicao: 13, duracao: 15, atraso: 4.5 },
  { direcao: 'linha', posicao: 22, duracao: 12, atraso: 2 },
  { direcao: 'linha', posicao: 30, duracao: 17, atraso: 7 },
  { direcao: 'coluna', posicao: 6, duracao: 13, atraso: 1.5 },
  { direcao: 'coluna', posicao: 18, duracao: 16, atraso: 6 },
  { direcao: 'coluna', posicao: 54, duracao: 14, atraso: 3 },
  { direcao: 'coluna', posicao: 67, duracao: 12, atraso: 8.5 },
];

export const classeDaMarcaDeErro = estilos.marca;

export function ConteudoDaMarcaDeErro() {
  return (
    <>
      <span className={estilos.linhaMarca}>
        <MarcaOrynt tamanho={32} animada />
        <NomeOrynt className={estilos.nome} />
      </span>
      <span className={estilos.slogan}>{SLOGAN_APLICACAO}</span>
    </>
  );
}

function FundoAnimado() {
  return (
    <div className={estilos.fundoAnimado} aria-hidden="true">
      <span className={estilos.grade} />
      <span className={juntarClasses(estilos.brilho, estilos.brilhoAcima)} />
      <span className={juntarClasses(estilos.brilho, estilos.brilhoAbaixo)} />
      <span className={estilos.trilhas}>
        {PULSOS.map(({ direcao, posicao, duracao, atraso }) => (
          <span
            key={`${direcao}-${posicao}`}
            className={direcao === 'linha' ? estilos.pulsoNaLinha : estilos.pulsoNaColuna}
            style={{ '--posicao': posicao, '--duracao': `${duracao}s`, '--atraso': `${atraso}s` } as CSSProperties}
          />
        ))}
      </span>
    </div>
  );
}

function comIndice(indice: number): CSSProperties {
  return { '--indice': indice } as CSSProperties;
}

export function MolduraDeErro({ marca, terminal, sobretitulo, titulo, descricao, acoes, rodape, alerta = false }: MolduraDeErroProps) {
  return (
    <div className={estilos.tela}>
      <FundoAnimado />

      {marca}

      <main className={estilos.cartao} id={ID_CONTEUDO_PRINCIPAL} role={alerta ? 'alert' : undefined}>
        <div className={estilos.palco} aria-hidden="true">
          {terminal}
        </div>

        <div className={estilos.conteudo}>
          <p className={juntarClasses(estilos.sobretitulo, 'codigo', 'item-em-cascata')} style={comIndice(0)}>
            {sobretitulo}
          </p>
          <h1 className={juntarClasses(estilos.titulo, 'item-em-cascata')} style={comIndice(1)}>
            {titulo}
          </h1>

          <p className={juntarClasses(estilos.descricao, 'item-em-cascata')} style={comIndice(2)}>
            {descricao}
          </p>

          <div className={juntarClasses(estilos.acoes, 'item-em-cascata')} style={comIndice(4)}>
            {acoes}
          </div>

          {rodape ? (
            <div className={juntarClasses(estilos.rodape, 'item-em-cascata')} style={comIndice(6)}>
              {rodape}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
