import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { CabecalhoAcesso } from '@/componentes/login/CabecalhoAcesso';
import { FormularioAcesso } from '@/componentes/login/FormularioAcesso';
import type { AvisoSenhaRedefinida } from '@/componentes/login/FormularioAcesso';
import { focarCampoAcesso, selecionarCampoAcesso } from '@/componentes/login/identificadores';
import { ambiente } from '@/configuracoes/ambiente';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import { useFluxoAcesso } from '@/ganchos/useFluxoAcesso';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useContextoAcesso } from '@/layouts/contextoAcesso';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import type { CamposAcesso } from '@/regras/validacaoAcesso';
import estilos from './PaginaLogin.module.css';

const AcessoDemonstracao = ambiente.dadosSimulados ? lazy(() => import('@/componentes/login/AcessoDemonstracao')) : null;

const AVISO_SENHA_REDEFINIDA: AvisoSenhaRedefinida = ambiente.dadosSimulados ? 'DEMONSTRACAO' : 'REAL';

export default function PaginaLogin() {
  useTituloDocumento('Entrar');
  const { registrarUsuario } = useAutenticacao();
  const { emailLembrado, senhaRedefinida, lembrarEmail } = useContextoAcesso();
  const [avisoSenhaRedefinida, setAvisoSenhaRedefinida] = useState<AvisoSenhaRedefinida | null>(null);

  const aoRecusarCredenciais = useCallback(() => selecionarCampoAcesso('senha'), []);

  const fluxo = useFluxoAcesso({
    emailInicial: emailLembrado,
    aoEntrar: registrarUsuario,
    aoEncontrarCampoInvalido: focarCampoAcesso,
    aoRecusarCredenciais,
  });

  useEffect(() => {
    if (!senhaRedefinida) return;
    setAvisoSenhaRedefinida(AVISO_SENHA_REDEFINIDA);
    focarCampoAcesso('senha');
  }, [senhaRedefinida]);

  const preencherDemonstracao = (campos: CamposAcesso) => {
    fluxo.preencher(campos);
    focarCampoAcesso('senha');
  };

  return (
    <>
      <CabecalhoAcesso titulo={`Bem-vindo ao ${NOME_APLICACAO}`}>
        Entre para acompanhar o desempenho das consultas do seu PostgreSQL e encontrar o que as deixa lentas.
      </CabecalhoAcesso>

      <FormularioAcesso
        campos={fluxo.campos}
        erros={fluxo.erros}
        enviando={fluxo.enviando}
        falha={fluxo.fase.tipo === 'ERRO' ? fluxo.fase.falha : null}
        senhaRedefinida={avisoSenhaRedefinida}
        aoAlterar={fluxo.alterarCampo}
        aoSair={fluxo.validarAoSair}
        aoEntrar={fluxo.entrar}
        aoPedirRecuperacao={() => lembrarEmail(fluxo.campos.email)}
      />

      {AcessoDemonstracao ? (
        <Suspense fallback={<div className={estilos.reservaDemonstracao} aria-hidden="true" />}>
          <AcessoDemonstracao desabilitado={fluxo.enviando} aoPreencher={preencherDemonstracao} />
        </Suspense>
      ) : null}
    </>
  );
}
