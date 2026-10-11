import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { MarcaOrynt } from '@/componentes/comum/MarcaOrynt';
import { NomeOrynt } from '@/componentes/comum/NomeOrynt';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import { navegacaoPrincipal, navegacaoRodape } from '@/configuracoes/navegacao';
import type { ItemNavegacao } from '@/configuracoes/navegacao';
import { caminhos } from '@/rotas/caminhos';
import { manterTabDentro } from '@/utilitarios/foco';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './MenuLateral.module.css';

interface MenuLateralProps {
  recolhido: boolean;
  emGaveta: boolean;
  abertoEmGaveta: boolean;
  aoAlternarRecolhido: () => void;
  aoFecharGaveta: () => void;
}

export function MenuLateral({ recolhido, emGaveta, abertoEmGaveta, aoAlternarRecolhido, aoFecharGaveta }: MenuLateralProps) {
  const menuRef = useRef<HTMLElement>(null);
  const botaoFecharRef = useRef<HTMLButtonElement>(null);
  const recolhidoVisivel = recolhido && !emGaveta;
  const oculto = emGaveta && !abertoEmGaveta;

  useEffect(() => {
    if (!abertoEmGaveta) return;
    const menu = menuRef.current;
    const origem = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    botaoFecharRef.current?.focus();

    const aoPressionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        aoFecharGaveta();
        return;
      }
      if (menu) manterTabDentro(evento, menu);
    };
    document.addEventListener('keydown', aoPressionar);

    return () => {
      document.removeEventListener('keydown', aoPressionar);
      const focado = document.activeElement;
      const focoFicouNoMenu = !focado || focado === document.body || Boolean(menu?.contains(focado));
      if (focoFicouNoMenu && origem && !menu?.contains(origem)) origem.focus();
    };
  }, [abertoEmGaveta, aoFecharGaveta]);

  return (
    <>
      <div
        className={juntarClasses(estilos.veu, abertoEmGaveta && estilos.veuVisivel)}
        onClick={aoFecharGaveta}
        aria-hidden="true"
      />

      <aside
        ref={menuRef}
        id="menu-lateral"
        className={juntarClasses(
          estilos.menu,
          recolhidoVisivel && estilos.recolhido,
          abertoEmGaveta && estilos.abertoEmGaveta,
        )}
        aria-label="Navegação principal"
        aria-hidden={oculto || undefined}
        {...(abertoEmGaveta ? { role: 'dialog', 'aria-modal': true } : {})}
      >
        <div className={estilos.marca}>
          <Link to={caminhos.dashboard} className={estilos.linkMarca} aria-label={`${NOME_APLICACAO}, ir para o Dashboard`}>
            <span className={estilos.simbolo}>
              <MarcaOrynt tamanho={32} />
            </span>
            <span className={estilos.textosMarca}>
              <NomeOrynt className={estilos.nome} />
            </span>
          </Link>
          <button
            ref={botaoFecharRef}
            type="button"
            className={estilos.fecharGaveta}
            onClick={aoFecharGaveta}
            aria-label="Fechar menu"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <nav className={estilos.navegacao} aria-label="Seções">
          {navegacaoPrincipal.map((secao, indice) => (
            <div className={estilos.secao} key={secao.titulo ?? `secao-${indice}`}>
              {secao.titulo ? (
                recolhidoVisivel ? (
                  <span className={estilos.divisor} aria-hidden="true" />
                ) : (
                  <p className={estilos.tituloSecao} aria-hidden="true">
                    {secao.titulo}
                  </p>
                )
              ) : null}
              <ul className={estilos.itens}>
                {secao.itens.map((item) => (
                  <li key={item.destino}>
                    <ItemMenu item={item} recolhido={recolhidoVisivel} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className={estilos.rodape}>
          <ItemMenu item={navegacaoRodape} recolhido={recolhidoVisivel} />
          {!emGaveta ? (
            <button
              type="button"
              className={estilos.recolher}
              onClick={aoAlternarRecolhido}
              aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
              aria-expanded={!recolhido}
              aria-controls="menu-lateral"
              title={recolhido ? 'Expandir menu' : 'Recolher menu'}
            >
              {recolhido ? (
                <PanelLeftOpen size={18} strokeWidth={2} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={18} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function ItemMenu({ item, recolhido }: { item: ItemNavegacao; recolhido: boolean }) {
  const Icone = item.icone;
  const rotuloCompleto = item.planejado ? `${item.rotulo} (em breve)` : item.rotulo;

  return (
    <NavLink
      to={item.destino}
      end
      title={recolhido ? rotuloCompleto : undefined}
      aria-label={rotuloCompleto}
      className={({ isActive }) => juntarClasses(estilos.item, isActive && estilos.itemAtivo)}
    >
      <Icone className={estilos.iconeItem} size={18} strokeWidth={2} aria-hidden="true" />
      <span className={estilos.rotuloItem}>{item.rotulo}</span>
    </NavLink>
  );
}
