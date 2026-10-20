const ALGORITMO = 'pbkdf2-sha256';
const ITERACOES = 210_000;
const BYTES_DO_SAL = 16;
const BITS_DO_HASH = 256;

function paraBase64(bytes: Uint8Array): string {
  let binario = '';
  bytes.forEach((byte) => {
    binario += String.fromCharCode(byte);
  });
  return btoa(binario);
}

function deBase64(texto: string): Uint8Array<ArrayBuffer> {
  const binario = atob(texto);
  return Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
}

async function derivar(senha: string, sal: Uint8Array<ArrayBuffer>, iteracoes: number): Promise<Uint8Array> {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha.normalize('NFKC')), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes }, chave, BITS_DO_HASH);
  return new Uint8Array(bits);
}

function iguaisEmTempoConstante(primeiro: Uint8Array, segundo: Uint8Array): boolean {
  if (primeiro.length !== segundo.length) return false;
  let diferenca = 0;
  for (let indice = 0; indice < primeiro.length; indice += 1) diferenca |= (primeiro[indice] ?? 0) ^ (segundo[indice] ?? 0);
  return diferenca === 0;
}

export async function gerarHashDeSenha(senha: string, iteracoes = ITERACOES): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(BYTES_DO_SAL));
  const hash = await derivar(senha, sal, iteracoes);
  return `${ALGORITMO}$${iteracoes}$${paraBase64(sal)}$${paraBase64(hash)}`;
}

export async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  const [algoritmo, iteracoes, sal, hash] = guardado.split('$');
  const numero = Number(iteracoes);
  if (algoritmo !== ALGORITMO || !Number.isInteger(numero) || numero < 1 || !sal || !hash) return false;
  try {
    const calculado = await derivar(senha, deBase64(sal), numero);
    return iguaisEmTempoConstante(calculado, deBase64(hash));
  } catch {
    return false;
  }
}

export async function resumoDoToken(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return paraBase64(new Uint8Array(bytes));
}

export function gerarToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return paraBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
