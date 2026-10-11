import { ambiente } from '@/configuracoes/ambiente';
import type { RequisicaoTransporte, RespostaTransporte, ValorConsulta } from './transporte';

function montarUrl(caminho: string, consulta: Record<string, ValorConsulta>): string {
  const url = new URL(`${ambiente.urlApi.replace(/\/$/, '')}${caminho}`);
  for (const [chave, valor] of Object.entries(consulta)) {
    if (valor === undefined || valor === null || valor === '') continue;
    if (Array.isArray(valor)) valor.forEach((item) => url.searchParams.append(chave, String(item)));
    else url.searchParams.set(chave, String(valor));
  }
  return url.toString();
}

async function lerCorpo(resposta: Response): Promise<unknown> {
  if (resposta.status === 204) return undefined;
  const texto = await resposta.text();
  if (!texto) return undefined;
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

export async function transporteFetch(requisicao: RequisicaoTransporte): Promise<RespostaTransporte> {
  const comCorpo = requisicao.corpo !== undefined;
  const resposta = await fetch(montarUrl(requisicao.caminho, requisicao.consulta), {
    method: requisicao.metodo,
    signal: requisicao.signal,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(comCorpo ? { 'Content-Type': 'application/json' } : {}),
      ...requisicao.cabecalhos,
    },
    body: comCorpo ? JSON.stringify(requisicao.corpo) : undefined,
  });
  return { status: resposta.status, corpo: await lerCorpo(resposta) };
}
