import { useState } from 'react';
import type { CSSProperties } from 'react';
import estilosCabecalho from '@/componentes/layout/Cabecalho.module.css';
import { EsqueletoPagina } from '@/componentes/layout/EsqueletoPagina';
import estilosMenu from '@/componentes/layout/MenuLateral.module.css';
import { Esqueleto } from '@/componentes/ui';
import { CHAVE_MENU_RECOLHIDO, DESCRICAO_DA_MARCA } from '@/configuracoes/aplicacao';
import { navegacaoPrincipal, navegacaoRodape } from '@/configuracoes/navegacao';
import type { ItemNavegacao } from '@/configuracoes/navegacao';
import { useArmazenamentoLocal } from '@/ganchos/useArmazenamentoLocal';
import { useMenuEmGaveta } from '@/ganchos/useConsultaMidia';
import estilosLayout from '@/layouts/LayoutAplicacao.module.css';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { MarcaOrynt } from './MarcaOrynt';
import { NomeOrynt } from './NomeOrynt';
import estilos from './EsqueletoAplicacao.module.css';

const ESPERA_DA_ABERTURA_MS = 800;
const LARGURA_POR_LETRA_DO_MENU = 7;

function ItemDoMenu({ item }: { item: ItemNavegacao }) {
  return (
    <div className={estilosMenu.item}>
      <Esqueleto className={estilosMenu.iconeItem} largura={18} altura={18} />
      <span className={estilosMenu.rotuloItem}>
        <Esqueleto largura={item.rotulo.length * LARGURA_POR_LETRA_DO_MENU} altura={12} />
      </span>
    </div>
  );
}

function MenuDoEsqueleto({ recolhido }: { recolhido: boolean }) {
  return (
    <div className={juntarClasses(estilosMenu.menu, recolhido && estilosMenu.recolhido)} aria-hidden="true">
      <div className={estilosMenu.marca}>
        <div className={estilosMenu.linkMarca}>
          <span className={estilosMenu.simbolo}>
            <MarcaOrynt tamanho={26} />
          </span>
          <span className={estilosMenu.textosMarca}>
            <NomeOrynt className={estilosMenu.nome} />
            <span className={estilosMenu.descricaoMarca}>{DESCRICAO_DA_MARCA}</span>
          </span>
        </div>
      </div>

      <div className={estilosMenu.navegacao}>
        {navegacaoPrincipal.map((secao, indice) => (
          <div className={estilosMenu.secao} key={secao.titulo ?? `secao-${indice}`}>
            {secao.titulo ? (
              recolhido ? (
                <span className={estilosMenu.divisor} />
              ) : (
                <div className={estilosMenu.cabecalhoSecao}>
                  <Esqueleto largura={secao.titulo.length * LARGURA_POR_LETRA_DO_MENU} altura={10} />
                </div>
              )
            ) : null}
            <div className={estilosMenu.itens}>
              {secao.itens.map((item) => (
                <ItemDoMenu item={item} key={item.destino} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={estilosMenu.rodape}>
        <ItemDoMenu item={navegacaoRodape} />
        <div className={estilosMenu.recolher}>
          <Esqueleto largura={18} altura={18} />
        </div>
      </div>
    </div>
  );
}

interface EsqueletoAplicacaoProps {
  rotulo: string;
}

export function EsqueletoAplicacao({ rotulo }: EsqueletoAplicacaoProps) {
  const [recolhido] = useArmazenamentoLocal(CHAVE_MENU_RECOLHIDO, false);
  const emGaveta = useMenuEmGaveta();
  const [espera] = useState(() => Math.max(0, ESPERA_DA_ABERTURA_MS - performance.now()));
  const recolhidoVisivel = recolhido && !emGaveta;

  return (
    <div
      className={juntarClasses(
        estilosLayout.casca,
        recolhidoVisivel && estilosLayout.cascaRecolhida,
        estilos.aplicacao,
        espera > 0 && estilos.surgindo,
      )}
      style={{ '--espera-abertura': `${espera}ms` } as CSSProperties}
    >
      {emGaveta ? null : <MenuDoEsqueleto recolhido={recolhidoVisivel} />}

      <div className={estilosLayout.principal}>
        <div className={estilosCabecalho.cabecalho} aria-hidden="true">
          <div className={estilosCabecalho.interno}>
            {emGaveta ? (
              <div className={estilosCabecalho.inicio}>
                <Esqueleto largura="var(--lado-botao)" altura="var(--lado-botao)" raio="var(--raio-md)" />
                <span className={estilosCabecalho.marca}>
                  <MarcaOrynt tamanho={24} />
                </span>
              </div>
            ) : null}
            <div className={estilosCabecalho.acoes}>
              <Esqueleto
                className={estilos.novaConexao}
                largura="var(--largura-nova-conexao)"
                altura="var(--altura-nova-conexao)"
                raio="var(--raio-md)"
              />
              <Esqueleto largura="var(--lado-botao)" altura="var(--lado-botao)" raio="var(--raio-md)" />
              <Esqueleto largura="var(--lado-botao)" altura="var(--lado-botao)" raio="var(--raio-md)" />
              <Esqueleto className={estilos.conta} largura="var(--lado-botao)" altura="var(--lado-botao)" raio="var(--raio-pilula)" />
            </div>
          </div>
        </div>

        <main className={estilosLayout.conteudo}>
          <div className={estilos.limite}>
            <EsqueletoPagina rotulo={rotulo} />
          </div>
        </main>
      </div>
    </div>
  );
}
