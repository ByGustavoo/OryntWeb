import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CircleDashed } from 'lucide-react';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { Painel, Selo } from '@/componentes/ui';
import type { FuncionalidadePlanejada } from '@/configuracoes/navegacao';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { caminhos } from '@/rotas/caminhos';
import estilos from './PaginaFuncionalidadePlanejada.module.css';

interface PaginaFuncionalidadePlanejadaProps {
  funcionalidade: FuncionalidadePlanejada;
}

export default function PaginaFuncionalidadePlanejada({ funcionalidade }: PaginaFuncionalidadePlanejadaProps) {
  useTituloDocumento(funcionalidade.rotulo);
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

        <div className={estilos.previsto}>
          <h3 className={estilos.tituloPrevisto}>O que está previsto</h3>
          <ul className={estilos.lista}>
            {funcionalidade.previsto.map((item) => (
              <li className={estilos.item} key={item}>
                <CircleDashed size={16} strokeWidth={2} aria-hidden="true" className={estilos.marcador} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <Link to={caminhos.dashboard} className={estilos.voltar}>
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          Voltar ao Dashboard
        </Link>
      </Painel>
    </>
  );
}
