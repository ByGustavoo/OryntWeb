import { Fragment, Suspense, lazy, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CabecalhoAcesso } from '@/componentes/login/CabecalhoAcesso';
import estilosLink from '@/componentes/login/LinkAcesso.module.css';
import { EtapaCodigo } from '@/componentes/recuperacao/EtapaCodigo';
import { EtapaEmail } from '@/componentes/recuperacao/EtapaEmail';
import { EtapaNovaSenha } from '@/componentes/recuperacao/EtapaNovaSenha';
import { focarCampoRecuperacao } from '@/componentes/recuperacao/identificadores';
import { ambiente } from '@/configuracoes/ambiente';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import { useFluxoRecuperacaoSenha } from '@/ganchos/useFluxoRecuperacaoSenha';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useContextoAcesso } from '@/layouts/contextoAcesso';
import { ETAPAS_RECUPERACAO, numeroDaEtapa } from '@/regras/recuperacaoSenha';
import type { CampoRecuperacao, EtapaRecuperacao } from '@/regras/recuperacaoSenha';
import { caminhos } from '@/rotas/caminhos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaRecuperacaoSenha.module.css';

const DemonstracaoRecuperacao = ambiente.dadosSimulados
  ? lazy(() => import('@/componentes/recuperacao/DemonstracaoRecuperacao'))
  : null;

const CAMPO_INICIAL: Record<EtapaRecuperacao, CampoRecuperacao> = {
  EMAIL: 'email',
  CODIGO: 'codigo',
  SENHA: 'senha',
};

const TITULO: Record<EtapaRecuperacao, string> = {
  EMAIL: 'Recupere o seu acesso',
  CODIGO: 'Confira o seu e-mail',
  SENHA: 'Crie uma nova senha',
};

const ANUNCIO: Record<EtapaRecuperacao, string> = {
  EMAIL: '',
  CODIGO: 'Pedido enviado. Etapa 2 de 3: informe o código de verificação.',
  SENHA: 'Código validado. Etapa 3 de 3: crie uma nova senha.',
};

export default function PaginaRecuperacaoSenha() {
  useTituloDocumento('Recuperar senha');
  const navegar = useNavigate();
  const { emailLembrado, lembrarEmail, registrarSenhaRedefinida, dispensarSenhaRedefinida } = useContextoAcesso();

  const aoConcluir = useCallback(
    (email: string) => {
      registrarSenhaRedefinida(email);
      navegar(caminhos.login, { replace: true });
    },
    [registrarSenhaRedefinida, navegar],
  );

  const fluxo = useFluxoRecuperacaoSenha({
    emailInicial: emailLembrado,
    aoConcluir,
    aoPedirFoco: focarCampoRecuperacao,
  });

  useEffect(() => dispensarSenhaRedefinida(), [dispensarSenhaRedefinida]);

  useEffect(() => {
    focarCampoRecuperacao(CAMPO_INICIAL[fluxo.etapa]);
  }, [fluxo.etapa]);

  const preencherEmail = (email: string) => {
    fluxo.alterarEmail(email);
    focarCampoRecuperacao('email');
  };

  const ocupado = fluxo.operacao !== null;
  const emailInformado = fluxo.email.trim();

  return (
    <>
      <Fragment key={fluxo.etapa}>
        <CabecalhoAcesso
          titulo={TITULO[fluxo.etapa]}
          progresso={{ atual: numeroDaEtapa(fluxo.etapa), total: ETAPAS_RECUPERACAO.length }}
        >
          {fluxo.etapa === 'EMAIL' ? (
            'Informe o e-mail da sua conta para receber um código de verificação e criar uma nova senha.'
          ) : fluxo.etapa === 'CODIGO' ? (
            <>
              Se <strong>{emailInformado}</strong> estiver cadastrado, você vai receber uma mensagem com o código de
              verificação e o passo a passo para recuperar a senha.
            </>
          ) : (
            `Código validado. Escolha a senha que você vai usar para entrar no ${NOME_APLICACAO}.`
          )}
        </CabecalhoAcesso>

        {fluxo.etapa === 'EMAIL' ? (
          <EtapaEmail
            email={fluxo.email}
            erro={fluxo.erros.email}
            enviando={fluxo.operacao === 'SOLICITAR'}
            falha={fluxo.falha}
            aoAlterar={fluxo.alterarEmail}
            aoSair={fluxo.validarEmailAoSair}
            aoEnviar={fluxo.solicitarCodigo}
          />
        ) : fluxo.etapa === 'CODIGO' ? (
          <EtapaCodigo
            codigo={fluxo.codigo}
            erro={fluxo.erros.codigo}
            verificando={fluxo.operacao === 'VERIFICAR'}
            reenviando={fluxo.operacao === 'REENVIAR'}
            reenviado={fluxo.reenviado}
            reenvioLiberadoEm={fluxo.reenvioLiberadoEm}
            falha={fluxo.falha}
            aoAlterar={fluxo.alterarCodigo}
            aoVerificar={fluxo.verificarCodigo}
            aoReenviar={fluxo.reenviarCodigo}
            aoTrocarEmail={fluxo.trocarEmail}
          />
        ) : (
          <EtapaNovaSenha
            email={emailInformado}
            senhas={fluxo.senhas}
            erros={fluxo.erros}
            salvando={fluxo.operacao === 'REDEFINIR'}
            falha={fluxo.falha}
            aoAlterar={fluxo.alterarSenha}
            aoSair={fluxo.validarSenhaAoSair}
            aoSalvar={fluxo.redefinirSenha}
          />
        )}
      </Fragment>

      <p className="visualmente-oculto" role="status">
        {ANUNCIO[fluxo.etapa]}
      </p>

      <Link
        className={juntarClasses(estilosLink.link, estilos.voltar)}
        to={caminhos.login}
        onClick={() => lembrarEmail(emailInformado)}
      >
        <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
        Voltar para o login
      </Link>

      {DemonstracaoRecuperacao ? (
        <Suspense fallback={<div className={estilos.reservaDemonstracao} aria-hidden="true" />}>
          <DemonstracaoRecuperacao
            etapa={fluxo.etapa}
            desabilitado={ocupado}
            aoPreencherEmail={preencherEmail}
            aoUsarCodigo={fluxo.alterarCodigo}
          />
        </Suspense>
      ) : null}
    </>
  );
}
