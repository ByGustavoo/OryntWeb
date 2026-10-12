import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { MarcaOrynt } from '@/componentes/comum/MarcaOrynt';
import { NomeOrynt } from '@/componentes/comum/NomeOrynt';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import {
  contemCaminho,
  destinoInicial,
  itemPlanejado,
  navegacaoPrincipal,
  navegacaoRodape,
  secaoPlanejada,
} from '@/configuracoes/navegacao';
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
                  <div className={estilos.cabecalhoSecao} aria-hidden="true">
                    <p className={estilos.tituloSecao}>{secao.titulo}</p>
                    {secaoPlanejada(secao) ? <span className={estilos.marcaSecao}>Em breve</span> : null}
                  </div>
                )
              ) : null}
              <ul className={estilos.itens} aria-label={secao.titulo}>
                {secao.itens.map((item) => (
                  <li key={item.destino}>
                    <ItemMenu item={item} recolhido={recolhidoVisivel} marcarPlanejados={!secaoPlanejada(secao)} />
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

interface ItemMenuProps {
  item: ItemNavegacao;
  recolhido: boolean;
  marcarPlanejados?: boolean;
}

function ItemMenu({ item, recolhido, marcarPlanejados = false }: ItemMenuProps) {
  const { pathname } = useLocation();
  const idFilhos = useId();
  const filhos = item.filhos ?? [];
  const ativo = contemCaminho(item, pathname);
  const [aberto, setAberto] = useState(ativo);
  const Icone = item.icone;
  const planejado = itemPlanejado(item);
  const rotuloCompleto = planejado ? `${item.rotulo} (em breve)` : item.rotulo;
  const filhosVisiveis = aberto && !recolhido;

  useEffect(() => {
    if (ativo) setAberto(true);
  }, [ativo]);

  if (filhos.length === 0) {
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

  return (
    <>
      {recolhido ? (
        <Link
          to={destinoInicial(item)}
          title={rotuloCompleto}
          aria-label={rotuloCompleto}
          aria-current={ativo ? 'page' : undefined}
          className={juntarClasses(estilos.item, ativo && estilos.itemAtivo)}
        >
          <Icone className={estilos.iconeItem} size={18} strokeWidth={2} aria-hidden="true" />
          <span className={estilos.rotuloItem}>{item.rotulo}</span>
        </Link>
      ) : (
        <button
          type="button"
          className={juntarClasses(estilos.item, estilos.gatilho, ativo && estilos.itemAtivo)}
          onClick={() => setAberto((valor) => !valor)}
          aria-label={rotuloCompleto}
          aria-expanded={aberto}
          aria-controls={idFilhos}
        >
          <Icone className={estilos.iconeItem} size={18} strokeWidth={2} aria-hidden="true" />
          <span className={estilos.rotuloItem}>{item.rotulo}</span>
          {planejado && marcarPlanejados ? <span className={estilos.marcaPlanejado}>Em breve</span> : null}
          <ChevronDown
            className={juntarClasses(estilos.seta, aberto && estilos.setaAberta)}
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      )}

      <div id={idFilhos} className={juntarClasses(estilos.filhos, filhosVisiveis && estilos.filhosAbertos)}>
        <div className={estilos.recorteFilhos}>
          <ul className={estilos.listaFilhos} aria-label={item.rotulo}>
            {filhos.map((filho) => (
              <li key={filho.destino}>
                <NavLink
                  to={filho.destino}
                  end
                  className={({ isActive }) => juntarClasses(estilos.filho, isActive && estilos.filhoAtivo)}
                >
                  <span className={estilos.rotuloFilho}>{filho.rotulo}</span>
                  {filho.planejado && marcarPlanejados && !planejado ? (
                    <span className={estilos.marcaPlanejado}>Em breve</span>
                  ) : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
