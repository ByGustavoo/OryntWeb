import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CircleDashed, CircleDot } from 'lucide-react';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { Painel, Selo } from '@/componentes/ui';
import type { FuncionalidadePlanejada, TelaPlanejada } from '@/configuracoes/navegacao';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { caminhos } from '@/rotas/caminhos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaFuncionalidadePlanejada.module.css';

interface PaginaFuncionalidadePlanejadaProps {
  funcionalidade: FuncionalidadePlanejada;
  tela: TelaPlanejada;
}

export default function PaginaFuncionalidadePlanejada({ funcionalidade, tela }: PaginaFuncionalidadePlanejadaProps) {
  useTituloDocumento(`${funcionalidade.rotulo}: ${tela.rotulo}`);
  const Icone = funcionalidade.icone;

  return (
    <>
      <CabecalhoPagina titulo={funcionalidade.rotulo} descricao={funcionalidade.descricao} />

      <Painel className={estilos.painel}>
        <span className={estilos.icone} aria-hidden="true">
          <Icone size={24} strokeWidth={1.75} />
        </span>

        <div className={estilos.textos}>
          <Selo tom="info" icone={CalendarClock}>
            Funcionalidade planejada
          </Selo>
          <h2 className={estilos.titulo}>Esta tela ainda não foi construída</h2>
          <p className={estilos.descricao}>
            Ela faz parte das próximas fases do Orynt. Nada aqui é simulado: quando existir, vai mostrar dados do seu
            banco.
          </p>
        </div>

        <nav className={estilos.previsto} aria-labelledby="titulo-previsto">
          <h3 className={estilos.tituloPrevisto} id="titulo-previsto">
            O que está previsto
          </h3>
          <ul className={estilos.lista}>
            {funcionalidade.filhos.map((filho) => {
              const atual = filho.destino === tela.destino;
              const Marcador = atual ? CircleDot : CircleDashed;

              return (
                <li key={filho.destino}>
                  <Link
                    to={filho.destino}
                    className={juntarClasses(estilos.item, atual && estilos.itemAtual)}
                    aria-current={atual ? 'page' : undefined}
                  >
                    <Marcador size={16} strokeWidth={2} aria-hidden="true" className={estilos.marcador} />
                    <span className={estilos.textosItem}>
                      <span className={estilos.rotuloItem}>{filho.rotulo}</span>
                      <span className={estilos.descricaoItem}>{filho.descricao}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Link to={caminhos.dashboard} className={estilos.voltar}>
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          Voltar ao Dashboard
        </Link>
      </Painel>
    </>
  );
}
