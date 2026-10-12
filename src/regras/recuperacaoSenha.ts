import { validarCampoAcesso } from './validacaoAcesso';

export type EtapaRecuperacao = 'EMAIL' | 'CODIGO' | 'SENHA';

export interface CamposNovaSenha {
  senha: string;
  confirmacao: string;
}

export type CampoNovaSenha = keyof CamposNovaSenha;
export type CampoRecuperacao = 'email' | 'codigo' | CampoNovaSenha;
export type ErrosRecuperacao = Partial<Record<CampoRecuperacao, string>>;

export const ETAPAS_RECUPERACAO: EtapaRecuperacao[] = ['EMAIL', 'CODIGO', 'SENHA'];

export const TAMANHO_CODIGO = 6;
export const VALIDADE_CODIGO_MINUTOS = 10;
export const LIMITE_TENTATIVAS_CODIGO = 5;
export const ESPERA_REENVIO_SEGUNDOS = 60;
export const TAMANHO_MINIMO_SENHA = 8;
export const TAMANHO_MAXIMO_SENHA = 128;

export const CAMPOS_NOVA_SENHA_INICIAIS: CamposNovaSenha = {
  senha: '',
  confirmacao: '',
};

const ORDEM_CAMPOS_NOVA_SENHA: CampoNovaSenha[] = ['senha', 'confirmacao'];
const TAMANHO_GRUPO_CODIGO = 3;

export function contarCaracteres(texto: string): number {
  return [...texto].length;
}

export function numeroDaEtapa(etapa: EtapaRecuperacao): number {
  return ETAPAS_RECUPERACAO.indexOf(etapa) + 1;
}

export function validarEmailRecuperacao(email: string): string | undefined {
  return validarCampoAcesso('email', email);
}

export function limparCodigo(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, TAMANHO_CODIGO);
}

export function codigoCompleto(codigo: string): boolean {
  return limparCodigo(codigo).length === TAMANHO_CODIGO && codigo.length === TAMANHO_CODIGO;
}

export function agruparCodigo(codigo: string): string {
  const grupos: string[] = [];
  for (let inicio = 0; inicio < codigo.length; inicio += TAMANHO_GRUPO_CODIGO) {
    grupos.push(codigo.slice(inicio, inicio + TAMANHO_GRUPO_CODIGO));
  }
  return grupos.join(' ');
}

export function validarCodigo(codigo: string): string | undefined {
  const digitos = limparCodigo(codigo).length;
  if (digitos === 0) return `Informe o código de ${TAMANHO_CODIGO} dígitos que chegou por e-mail.`;
  if (digitos < TAMANHO_CODIGO) {
    const faltam = TAMANHO_CODIGO - digitos;
    return faltam === 1
      ? `O código tem ${TAMANHO_CODIGO} dígitos. Falta 1.`
      : `O código tem ${TAMANHO_CODIGO} dígitos. Faltam ${faltam}.`;
  }
  return undefined;
}

export function validarNovaSenha(senha: string): string | undefined {
  if (!senha) return 'Crie uma senha.';
  const tamanho = contarCaracteres(senha);
  if (tamanho < TAMANHO_MINIMO_SENHA) {
    const faltam = TAMANHO_MINIMO_SENHA - tamanho;
    return `Use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres. ${faltam === 1 ? 'Falta 1' : `Faltam ${faltam}`}.`;
  }
  if (tamanho > TAMANHO_MAXIMO_SENHA) return `A senha pode ter até ${TAMANHO_MAXIMO_SENHA} caracteres.`;
  return undefined;
}

export function validarConfirmacao(senha: string, confirmacao: string): string | undefined {
  if (!confirmacao) return 'Digite a senha de novo para confirmar.';
  if (confirmacao !== senha) return 'As duas senhas não são iguais.';
  return undefined;
}

export function validarCampoNovaSenha(campo: CampoNovaSenha, campos: CamposNovaSenha): string | undefined {
  switch (campo) {
    case 'senha':
      return validarNovaSenha(campos.senha);
    case 'confirmacao':
      return validarConfirmacao(campos.senha, campos.confirmacao);
  }
}

export function validarCamposNovaSenha(campos: CamposNovaSenha): ErrosRecuperacao {
  const erros: ErrosRecuperacao = {};
  for (const campo of ORDEM_CAMPOS_NOVA_SENHA) {
    const erro = validarCampoNovaSenha(campo, campos);
    if (erro) erros[campo] = erro;
  }
  return erros;
}

export function primeiroCampoNovaSenhaComErro(erros: ErrosRecuperacao): CampoNovaSenha | null {
  return ORDEM_CAMPOS_NOVA_SENHA.find((campo) => erros[campo]) ?? null;
}

export function segundosAteReenvio(liberadoEm: number | null, agora: number): number {
  if (liberadoEm === null) return 0;
  return Math.max(0, Math.ceil((liberadoEm - agora) / 1000));
}

export function formatarEspera(segundos: number): string {
  const total = Math.max(0, Math.ceil(segundos));
  const minutos = Math.floor(total / 60);
  const resto = String(total % 60).padStart(2, '0');
  return `${minutos}:${resto}`;
}
