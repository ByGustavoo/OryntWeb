import { TAMANHO_MINIMO_SENHA, contarCaracteres } from './recuperacaoSenha';

export type NivelForcaSenha = 'FRACA' | 'RAZOAVEL' | 'BOA' | 'FORTE';

export interface ForcaSenha {
  nivel: NivelForcaSenha;
  pontos: number;
  rotulo: string;
  orientacao: string;
}

export const PONTOS_MAXIMOS_FORCA = 4;

const NIVEIS: NivelForcaSenha[] = ['FRACA', 'RAZOAVEL', 'BOA', 'FORTE'];

const ROTULOS: Record<NivelForcaSenha, string> = {
  FRACA: 'Fraca',
  RAZOAVEL: 'Razoável',
  BOA: 'Boa',
  FORTE: 'Forte',
};

const TERMOS_COMUNS = [
  'password',
  'postgres',
  'iloveyou',
  'welcome',
  'letmein',
  'usuario',
  'qwerty',
  'asdfgh',
  'zxcvbn',
  'brasil',
  'senha',
  'admin',
  'orynt',
  'teste',
  'mudar',
  'root',
  'demo',
];

const TAMANHO_MINIMO_TERMO = 3;
const TAMANHO_MINIMO_SEQUENCIA = 3;
const COMPRIMENTO_SEM_PONTOS = 6;
const COMPRIMENTO_RAZOAVEL = 9;
const COMPRIMENTO_BOM = 12;
const COMPRIMENTO_FORTE = 16;
const COMPRIMENTO_DE_FRASE = 12;

function removerTermos(texto: string, termos: string[]): string {
  return termos.reduce((restante, termo) => restante.split(termo).join(''), texto);
}

function reduzirRepeticoes(texto: string): string {
  return texto.replace(/(.)\1{2,}/gu, '$1');
}

function reduzirSequencias(texto: string): string {
  const codigos = [...texto].map((caractere) => caractere.codePointAt(0) ?? 0);
  const mantidos: number[] = [];
  let inicio = 0;

  while (inicio < codigos.length) {
    const passo = (codigos[inicio + 1] ?? Number.NaN) - (codigos[inicio] ?? 0);
    let fim = inicio;
    if (passo === 1 || passo === -1) {
      while (fim + 1 < codigos.length && (codigos[fim + 1] ?? 0) - (codigos[fim] ?? 0) === passo) fim += 1;
    }
    mantidos.push(codigos[inicio] ?? 0);
    inicio = fim - inicio + 1 >= TAMANHO_MINIMO_SEQUENCIA ? fim + 1 : inicio + 1;
  }

  return String.fromCodePoint(...mantidos);
}

function contarVariedade(senha: string): number {
  const classes = [/\p{Ll}/u, /\p{Lu}/u, /\p{Nd}/u, /[^\p{L}\p{Nd}]/u];
  return classes.filter((classe) => classe.test(senha)).length;
}

function termosValidos(termos: string[]): string[] {
  return termos.map((termo) => termo.trim().toLowerCase()).filter((termo) => termo.length >= TAMANHO_MINIMO_TERMO);
}

function pontuar(comprimentoEfetivo: number, variedade: number): number {
  if (comprimentoEfetivo < COMPRIMENTO_SEM_PONTOS) return 1;
  const base =
    comprimentoEfetivo >= COMPRIMENTO_FORTE ? 4 : comprimentoEfetivo >= COMPRIMENTO_BOM ? 3 : comprimentoEfetivo >= COMPRIMENTO_RAZOAVEL ? 2 : 1;
  const ajuste = variedade >= 3 ? 1 : variedade === 1 ? -1 : 0;
  return Math.min(PONTOS_MAXIMOS_FORCA, Math.max(1, base + ajuste));
}

export function termosDoEmail(email: string): string[] {
  const [usuario = ''] = email.trim().toLowerCase().split('@');
  const termos = [usuario, ...usuario.split(/[^\p{L}\p{Nd}]+/u)].filter((termo) => termo.length >= TAMANHO_MINIMO_TERMO);
  return [...new Set(termos)];
}

export function avaliarForcaSenha(senha: string, termosPessoais: string[] = []): ForcaSenha | null {
  if (!senha) return null;

  const comprimento = contarCaracteres(senha);
  if (comprimento < TAMANHO_MINIMO_SENHA) {
    const faltam = TAMANHO_MINIMO_SENHA - comprimento;
    return {
      nivel: 'FRACA',
      pontos: 1,
      rotulo: ROTULOS.FRACA,
      orientacao:
        faltam === 1
          ? `Falta 1 caractere para o mínimo de ${TAMANHO_MINIMO_SENHA}.`
          : `Faltam ${faltam} caracteres para o mínimo de ${TAMANHO_MINIMO_SENHA}.`,
    };
  }

  const minuscula = senha.toLowerCase();
  const pessoais = termosValidos(termosPessoais);
  const semPessoais = removerTermos(minuscula, pessoais);
  const semComuns = removerTermos(semPessoais, TERMOS_COMUNS);
  const semPadroes = reduzirSequencias(reduzirRepeticoes(semComuns));
  const comprimentoEfetivo = contarCaracteres(semPadroes);

  const variedade = contarVariedade(senha);
  const pontos = pontuar(comprimentoEfetivo, variedade);
  const nivel = NIVEIS[pontos - 1] ?? 'FRACA';

  const usaEmail = semPessoais.length < minuscula.length;
  const previsivel = comprimentoEfetivo < contarCaracteres(semPessoais);

  let orientacao = 'Difícil de adivinhar.';
  if (pontos < PONTOS_MAXIMOS_FORCA) {
    if (usaEmail) orientacao = 'Evite usar partes do seu e-mail.';
    else if (previsivel) orientacao = 'Evite palavras comuns, sequências e repetições.';
    else if (comprimento < COMPRIMENTO_DE_FRASE) orientacao = 'Uma frase com algumas palavras fica mais forte.';
    else if (variedade < 3) orientacao = 'Misture letras, números e símbolos para reforçar.';
    else orientacao = 'Mais alguns caracteres deixam a senha forte.';
  }

  return { nivel, pontos, rotulo: ROTULOS[nivel], orientacao };
}
