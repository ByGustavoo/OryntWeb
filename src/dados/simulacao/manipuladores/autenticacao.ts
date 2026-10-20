import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { PROBLEMAS_ADMINISTRACAO } from '@/modelos/administracao';
import { PROBLEMAS_AUTENTICACAO } from '@/modelos/autenticacao';
import { MINUTOS_DE_BLOQUEIO } from '@/regras/contas';
import { telaDoCaminho } from '@/regras/permissoesConta';
import { ORDEM_CAMPOS_ACESSO, validarAcesso } from '@/regras/validacaoAcesso';
import type { CamposAcesso } from '@/regras/validacaoAcesso';
import { encerrarAcessoSimulado, gravarAcessoSimulado, lerAcessoSimulado } from '../acessoSimulado';
import { registrarEvento } from '../auditoriaSimulada';
import type { ContextoSimulado } from '../autorizacaoSimulada';
import { semAcessoAutenticado, semPermissao } from '../autorizacaoSimulada';
import type { ContaSimulada } from '../contasSimuladas';
import {
  SENHA_DA_DEMONSTRACAO,
  abrirSessaoDaConta,
  autorDaConta,
  bloqueioDoEmail,
  contaPorEmail,
  contaPorId,
  encerrarSessaoDaConta,
  limparTentativasDeLogin,
  paraUsuarioDTO,
  registrarFalhaDeLogin,
} from '../contasSimuladas';
import { CREDENCIAIS_DEMONSTRACAO } from '../credenciaisDemonstracao';
import { conferirSenha } from '../hashSenhaSimulada';
import { dadosInvalidos, ok, problema, semConteudo } from '../resposta';
import { encerrarSessaoSimulada } from '../sessaoSimulada';

const ESPERA_MINIMA_MS = 700;
const ESPERA_MAXIMA_MS = 1100;

type MotivoDaFalha = 'SENHA_INCORRETA' | 'CONTA_INEXISTENTE' | 'CONTA_DESATIVADA' | 'CONVITE_PENDENTE' | 'BLOQUEADA';

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function camposDoCorpo(corpo: unknown): CamposAcesso {
  const bruto = corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : {};
  return { email: texto(bruto.email), senha: texto(bruto.senha) };
}

export function acessoNaoAutenticado(): RespostaTransporte {
  return semAcessoAutenticado();
}

export function esperaDoAcesso(): number {
  return ESPERA_MINIMA_MS + Math.random() * (ESPERA_MAXIMA_MS - ESPERA_MINIMA_MS);
}

function credenciaisInvalidas(): RespostaTransporte {
  return problema(
    401,
    'Credenciais inválidas!',
    PROBLEMAS_AUTENTICACAO.credenciaisInvalidas,
    'O e-mail ou a senha não correspondem a uma conta.',
  );
}

function muitasTentativas(bloqueadoAte: number, agora: Date): RespostaTransporte {
  const minutos = Math.max(1, Math.ceil((bloqueadoAte - agora.getTime()) / 60_000));
  return problema(
    429,
    'Muitas tentativas!',
    PROBLEMAS_ADMINISTRACAO.muitasTentativas,
    `O login deste e-mail está bloqueado por mais ${minutos} min depois de várias tentativas erradas.`,
  );
}

async function senhaConfere(conta: ContaSimulada, senha: string): Promise<boolean> {
  if (conta.senha === null) return false;
  if (conta.senha === SENHA_DA_DEMONSTRACAO) return senha === CREDENCIAIS_DEMONSTRACAO.senha;
  return conferirSenha(senha, conta.senha);
}

function registrarFalha(email: string, conta: ContaSimulada | null, motivo: MotivoDaFalha, agora: Date): void {
  registrarEvento(
    {
      tipo: 'LOGIN_FALHOU',
      resultado: 'FALHA',
      conta: conta ? autorDaConta(conta) : null,
      emailInformado: email.trim().toLowerCase(),
      motivo,
    },
    agora,
  );
}

export async function entrar(requisicao: RequisicaoTransporte, agora: Date): Promise<RespostaTransporte> {
  const campos = camposDoCorpo(requisicao.corpo);
  const erros = validarAcesso(campos);
  const errosCampos = ORDEM_CAMPOS_ACESSO.flatMap((campo) => {
    const mensagem = erros[campo];
    return mensagem ? [{ campo, mensagem }] : [];
  });
  if (errosCampos.length > 0) return dadosInvalidos(errosCampos);

  const conta = contaPorEmail(campos.email);
  const bloqueado = bloqueioDoEmail(campos.email, agora);
  if (bloqueado !== null) {
    registrarFalha(campos.email, conta, 'BLOQUEADA', agora);
    return muitasTentativas(bloqueado, agora);
  }

  const confere = conta ? await senhaConfere(conta, campos.senha) : false;
  if (!conta || !confere) {
    registrarFalha(campos.email, conta, conta ? (conta.senha === null ? 'CONVITE_PENDENTE' : 'SENHA_INCORRETA') : 'CONTA_INEXISTENTE', agora);
    const bloqueadoAte = registrarFalhaDeLogin(campos.email, agora);
    if (bloqueadoAte !== null) {
      registrarEvento(
        {
          tipo: 'LOGIN_BLOQUEADO',
          resultado: 'FALHA',
          conta: conta ? autorDaConta(conta) : null,
          emailInformado: campos.email.trim().toLowerCase(),
          motivo: `Login bloqueado por ${MINUTOS_DE_BLOQUEIO} minutos.`,
        },
        agora,
      );
      return muitasTentativas(bloqueadoAte, agora);
    }
    return credenciaisInvalidas();
  }

  if (!conta.ativa) {
    registrarFalha(campos.email, conta, 'CONTA_DESATIVADA', agora);
    return problema(
      403,
      'Conta desativada!',
      PROBLEMAS_ADMINISTRACAO.contaDesativada,
      'Esta conta foi desativada. Fale com quem administra o Orynt na sua equipe.',
    );
  }

  limparTentativasDeLogin(campos.email);
  encerrarSessaoSimulada();
  const sessao = abrirSessaoDaConta(conta, agora);
  gravarAcessoSimulado({ conta: conta.id, sessao });
  registrarEvento({ tipo: 'LOGIN', resultado: 'SUCESSO', conta: autorDaConta(conta) }, agora);
  return ok(paraUsuarioDTO(contaPorId(conta.id) ?? conta));
}

export function buscarUsuarioAtual(
  _requisicao: RequisicaoTransporte,
  _agora: Date,
  _parametros: Record<string, string>,
  contexto: ContextoSimulado,
): RespostaTransporte {
  if (!contexto.conta) {
    if (lerAcessoSimulado()) encerrarAcessoSimulado();
    return acessoNaoAutenticado();
  }
  return ok(paraUsuarioDTO(contexto.conta));
}

export function sairDoAcessoSimulado(): void {
  const acesso = lerAcessoSimulado();
  if (acesso) encerrarSessaoDaConta(acesso.conta, acesso.sessao);
  encerrarAcessoSimulado();
  encerrarSessaoSimulada();
}

export function sair(
  _requisicao: RequisicaoTransporte,
  agora: Date,
  _parametros: Record<string, string>,
  contexto: ContextoSimulado,
): RespostaTransporte {
  if (contexto.conta) registrarEvento({ tipo: 'LOGOUT', resultado: 'SUCESSO', conta: autorDaConta(contexto.conta) }, agora);
  sairDoAcessoSimulado();
  return semConteudo();
}

export function registrarAcessoATela(
  requisicao: RequisicaoTransporte,
  agora: Date,
  _parametros: Record<string, string>,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return acessoNaoAutenticado();
  const bruto = requisicao.corpo && typeof requisicao.corpo === 'object' ? (requisicao.corpo as Record<string, unknown>) : {};
  const tela = telaDoCaminho(texto(bruto.tela));
  if (!tela) return dadosInvalidos([{ campo: 'tela', mensagem: 'A tela informada não existe no Orynt.' }]);

  const permitida = tela.permissao === null || conta.permissoes.includes(tela.permissao);
  registrarEvento(
    {
      tipo: permitida ? 'TELA_ACESSADA' : 'ACESSO_NEGADO',
      resultado: permitida ? 'SUCESSO' : 'NEGADO',
      conta: autorDaConta(conta),
      categoria: 'NAVEGACAO',
      modulo: tela.modulo,
      alvo: { tipo: 'TELA', id: tela.caminho, rotulo: tela.rotulo },
      motivo: permitida ? null : 'A conta não tem a permissão da tela.',
    },
    agora,
  );
  return permitida ? semConteudo() : semPermissao('A sua conta não tem a permissão desta tela.');
}
