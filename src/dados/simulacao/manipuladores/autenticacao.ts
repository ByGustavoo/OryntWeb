import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { PROBLEMAS_AUTENTICACAO } from '@/modelos/autenticacao';
import { ORDEM_CAMPOS_ACESSO, mesmoEmail, validarAcesso } from '@/regras/validacaoAcesso';
import type { CamposAcesso } from '@/regras/validacaoAcesso';
import { encerrarAcessoSimulado, gravarAcessoSimulado, lerAcessoSimulado } from '../acessoSimulado';
import { CREDENCIAIS_DEMONSTRACAO, USUARIO_DEMONSTRACAO } from '../credenciaisDemonstracao';
import { dadosInvalidos, ok, problema, semConteudo } from '../resposta';
import { encerrarSessaoSimulada } from '../sessaoSimulada';

const ESPERA_MINIMA_MS = 700;
const ESPERA_MAXIMA_MS = 1100;

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function camposDoCorpo(corpo: unknown): CamposAcesso {
  const bruto = corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : {};
  return { email: texto(bruto.email), senha: texto(bruto.senha) };
}

export function acessoNaoAutenticado(): RespostaTransporte {
  return problema(
    401,
    'Acesso não autenticado!',
    PROBLEMAS_AUTENTICACAO.naoAutenticado,
    'Não há um acesso ativo nesta sessão.',
  );
}

export function esperaDoAcesso(): number {
  return ESPERA_MINIMA_MS + Math.random() * (ESPERA_MAXIMA_MS - ESPERA_MINIMA_MS);
}

export function entrar(requisicao: RequisicaoTransporte): RespostaTransporte {
  const campos = camposDoCorpo(requisicao.corpo);
  const erros = validarAcesso(campos);
  const errosCampos = ORDEM_CAMPOS_ACESSO.flatMap((campo) => {
    const mensagem = erros[campo];
    return mensagem ? [{ campo, mensagem }] : [];
  });
  if (errosCampos.length > 0) return dadosInvalidos(errosCampos);

  const credenciaisConferem =
    mesmoEmail(campos.email, CREDENCIAIS_DEMONSTRACAO.email) && campos.senha === CREDENCIAIS_DEMONSTRACAO.senha;
  if (!credenciaisConferem) {
    return problema(
      401,
      'Credenciais inválidas!',
      PROBLEMAS_AUTENTICACAO.credenciaisInvalidas,
      'O e-mail ou a senha não correspondem a uma conta.',
    );
  }

  encerrarSessaoSimulada();
  gravarAcessoSimulado(USUARIO_DEMONSTRACAO);
  return ok(USUARIO_DEMONSTRACAO);
}

export function buscarUsuarioAtual(): RespostaTransporte {
  const usuario = lerAcessoSimulado();
  return usuario ? ok(usuario) : acessoNaoAutenticado();
}

export function sairDoAcessoSimulado(): void {
  encerrarAcessoSimulado();
  encerrarSessaoSimulada();
}

export function sair(): RespostaTransporte {
  sairDoAcessoSimulado();
  return semConteudo();
}
