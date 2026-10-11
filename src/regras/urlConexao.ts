import { PORTA_PADRAO } from './validacaoConexao';
import type { CamposConexao } from './validacaoConexao';

export type CamposDaUrl = Pick<CamposConexao, 'host' | 'porta' | 'banco' | 'usuario' | 'senha'>;

export type ResultadoUrlConexao = { valida: true; campos: CamposDaUrl } | { valida: false; mensagem: string };

const ESQUEMAS_ACEITOS = ['postgresql:', 'postgres:'];
const EXEMPLO = 'postgresql://usuario:senha@servidor:5432/banco';

function decodificar(trecho: string): string {
  try {
    return decodeURIComponent(trecho);
  } catch {
    return trecho;
  }
}

export function interpretarUrlConexao(texto: string): ResultadoUrlConexao {
  const bruta = texto.trim();
  if (!bruta) return { valida: false, mensagem: 'Cole a URL de conexão para preencher os campos.' };

  let url: URL;
  try {
    url = new URL(bruta);
  } catch {
    return { valida: false, mensagem: `Não foi possível ler essa URL. O formato esperado é ${EXEMPLO}.` };
  }

  if (!ESQUEMAS_ACEITOS.includes(url.protocol)) {
    return { valida: false, mensagem: 'A URL precisa começar com postgresql:// ou postgres://.' };
  }
  if (!url.hostname) {
    return { valida: false, mensagem: `A URL não tem o endereço do servidor. O formato esperado é ${EXEMPLO}.` };
  }

  return {
    valida: true,
    campos: {
      host: url.hostname,
      porta: url.port || PORTA_PADRAO,
      banco: decodificar(url.pathname.replace(/^\//, '')),
      usuario: decodificar(url.username),
      senha: decodificar(url.password),
    },
  };
}
