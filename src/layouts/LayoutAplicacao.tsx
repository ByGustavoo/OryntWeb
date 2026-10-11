import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Cabecalho } from '@/componentes/layout/Cabecalho';
import { MenuLateral } from '@/componentes/layout/MenuLateral';
import { EsqueletoLista } from '@/componentes/ui';
import { CHAVE_MENU_RECOLHIDO, ID_CONTEUDO_PRINCIPAL } from '@/configuracoes/aplicacao';
import { useArmazenamentoLocal } from '@/ganchos/useArmazenamentoLocal';
import { useMenuEmGaveta } from '@/ganchos/useConsultaMidia';
import { useTravarRolagem } from '@/ganchos/useTravarRolagem';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './LayoutAplicacao.module.css';

export function LayoutAplicacao() {
  const [recolhido, setRecolhido] = useArmazenamentoLocal(CHAVE_MENU_RECOLHIDO, false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const emGaveta = useMenuEmGaveta();
  const localizacao = useLocation();
  const botaoMenuRef = useRef<HTMLButtonElement>(null);
  const primeiraRenderizacao = useRef(true);

  const fecharGaveta = useCallback(() => setGavetaAberta(false), []);

  useEffect(() => {
    setGavetaAberta(false);
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    document.getElementById(ID_CONTEUDO_PRINCIPAL)?.focus({ preventScroll: true });
  }, [localizacao.pathname]);

  useEffect(() => {
    if (!emGaveta) setGavetaAberta(false);
  }, [emGaveta]);

  useTravarRolagem(gavetaAberta && emGaveta);

  return (
    <div className={juntarClasses(estilos.casca, recolhido && estilos.cascaRecolhida)}>
      <a className="link-pular" href={`#${ID_CONTEUDO_PRINCIPAL}`}>
        Pular para o conteúdo
      </a>

      <MenuLateral
        recolhido={recolhido}
        emGaveta={emGaveta}
        abertoEmGaveta={gavetaAberta && emGaveta}
        aoAlternarRecolhido={() => setRecolhido(!recolhido)}
        aoFecharGaveta={fecharGaveta}
      />

      <div className={estilos.principal}>
        <Cabecalho
          ref={botaoMenuRef}
          emGaveta={emGaveta}
          gavetaAberta={gavetaAberta}
          aoAbrirMenu={() => setGavetaAberta(true)}
        />
        <main className={estilos.conteudo} id={ID_CONTEUDO_PRINCIPAL} tabIndex={-1}>
          <div className={estilos.limite} key={localizacao.pathname}>
            <Suspense fallback={<EsqueletoLista linhas={5} rotulo="Carregando a página…" />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
