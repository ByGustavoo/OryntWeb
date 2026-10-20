export const ITERACOES_SCRAM = 4096;

const TAMANHO_DO_SAL = 16;
const TAMANHO_DA_CHAVE_BITS = 256;
const CODIFICADOR = new TextEncoder();

const MAPEADOS_PARA_NADA = /[\u00AD\u034F\u1806\u180B-\u180D\u200B-\u200D\u2060\uFE00-\uFE0F\uFEFF]/g;
const ESPACOS_NAO_ASCII = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;
const PROIBIDOS = /[\u0000-\u001F\u007F-\u009F\u06DD\u070F\u180E\u200E\u200F\u2028-\u202E\u206A-\u206F\uFFF9-\uFFFD\uE000-\uF8FF]/;

export function prepararSenha(senha: string): string {
  if (/^[\x20-\x7E]*$/.test(senha)) return senha;
  const normalizada = senha.replace(MAPEADOS_PARA_NADA, '').replace(ESPACOS_NAO_ASCII, ' ').normalize('NFKC');
  return PROIBIDOS.test(normalizada) ? senha : normalizada;
}

function emBase64(bytes: Uint8Array): string {
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario);
}

async function assinar(chave: ArrayBuffer, texto: string): Promise<ArrayBuffer> {
  const chaveHmac = await crypto.subtle.importKey('raw', chave, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', chaveHmac, CODIFICADOR.encode(texto));
}

export async function verificadorScram(
  senha: string,
  sal: Uint8Array<ArrayBuffer> = crypto.getRandomValues(new Uint8Array(TAMANHO_DO_SAL)),
  iteracoes = ITERACOES_SCRAM,
): Promise<string> {
  const base = await crypto.subtle.importKey('raw', CODIFICADOR.encode(prepararSenha(senha)), 'PBKDF2', false, ['deriveBits']);
  const salgada = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes },
    base,
    TAMANHO_DA_CHAVE_BITS,
  );
  const chaveDoCliente = await assinar(salgada, 'Client Key');
  const chaveGuardada = await crypto.subtle.digest('SHA-256', chaveDoCliente);
  const chaveDoServidor = await assinar(salgada, 'Server Key');
  return `SCRAM-SHA-256$${iteracoes}:${emBase64(sal)}$${emBase64(new Uint8Array(chaveGuardada))}:${emBase64(new Uint8Array(chaveDoServidor))}`;
}
