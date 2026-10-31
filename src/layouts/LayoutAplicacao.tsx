import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AcompanhamentoBackup } from '@/componentes/backup/AcompanhamentoBackup';
import { LimiteDeErro } from '@/componentes/comum/LimiteDeErro';
import { Cabecalho } from '@/componentes/layout/Cabecalho';
import { EsqueletoPagina } from '@/componentes/layout/EsqueletoPagina';
import { FalhaNaTela } from '@/componentes/layout/FalhaNaTela';
import { GuardaDaTela, deveDesviarDaTela, telaNegada } from '@/componentes/layout/GuardaDaTela';
import { MenuLateral } from '@/componentes/layout/MenuLateral';
import { SemAcessoNaTela } from '@/componentes/layout/SemAcessoNaTela';
import { CHAVE_MENU_RECOLHIDO, ID_CONTEUDO_PRINCIPAL } from '@/configuracoes/aplicacao';
import { useArmazenamentoLocal } from '@/ganchos/useArmazenamentoLocal';
import { useMenuEmGaveta } from '@/ganchos/useConsultaMidia';
import { useRegistroDaTela } from '@/ganchos/useRegistroDaTela';
import { useTravarRolagem } from '@/ganchos/useTravarRolagem';
import { ProvedorAlteracoes } from '@/provedores/ProvedorAlteracoes';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { ProvedorBackupLocal } from '@/provedores/ProvedorBackupLocal';
import { ProvedorNovaConexao } from '@/provedores/ProvedorNovaConexao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './LayoutAplicacao.module.css';

export function LayoutAplicacao() {
  return (
    <ProvedorBackupLocal>
      <CascaDaAplicacao />
    </ProvedorBackupLocal>
  );
}

function CascaDaAplicacao() {
  const [recolhido, setRecolhido] = useArmazenamentoLocal(CHAVE_MENU_RECOLHIDO, false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const emGaveta = useMenuEmGaveta();
  const localizacao = useLocation();
  const botaoMenuRef = useRef<HTMLButtonElement>(null);
  const primeiraRenderizacao = useRef(true);
  const { usuario } = useAutenticacao();
  useRegistroDaTela(!deveDesviarDaTela(usuario, localizacao.pathname));

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

  const negada = telaNegada(usuario, localizacao.pathname);
  if (negada) return <SemAcessoNaTela key={negada.caminho} tela={negada} />;

  return (
    <ProvedorNovaConexao>
      <ProvedorAlteracoes>
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
                <LimiteDeErro alternativa={(erro) => <FalhaNaTela erro={erro} />}>
                  <Suspense fallback={<EsqueletoPagina rotulo="Carregando a página…" />}>
                    <GuardaDaTela>
                      <Outlet />
                    </GuardaDaTela>
                  </Suspense>
                </LimiteDeErro>
              </div>
            </main>
            <AcompanhamentoBackup />
          </div>
        </div>
      </ProvedorAlteracoes>
    </ProvedorNovaConexao>
  );
}
