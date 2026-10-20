import type { AlteracaoDTO, FiltroResultadoAlteracao, FiltrosAlteracoes } from '@/modelos/alteracoes';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { correspondeABusca, limparBusca, termosDaBusca } from './buscaConsultas';
import { descreverOperacao, papeisDaAlteracao, tituloDaAlteracao } from './descricaoAlteracoes';
import { lerPagina, paginaAposMudanca } from './paginacaoLocal';
import { lerNomeDoPapel } from './papeis';

export const filtrosResultadoAlteracao: FiltroResultadoAlteracao[] = ['APLICADA', 'DESFEITA', 'RECUSADA'];

export const rotuloFiltroResultadoAlteracao: Record<FiltroResultadoAlteracao, string> = {
  APLICADA: 'Aplicadas',
  DESFEITA: 'Desfeitas',
  RECUSADA: 'Recusadas',
};

export const filtrosAlteracoesIniciais: FiltrosAlteracoes = { busca: '', resultado: null, papel: null, pagina: 1 };

export type EstadoDaAlteracao = 'APLICADA' | 'DESFEITA' | 'RECUSADA';

export const rotuloEstadoDaAlteracao: Record<EstadoDaAlteracao, string> = {
  APLICADA: 'Aplicada',
  DESFEITA: 'Desfeita',
  RECUSADA: 'Recusada',
};

export function lerFiltrosAlteracoes(valor: unknown): FiltrosAlteracoes {
  if (!valor || typeof valor !== 'object') return filtrosAlteracoesIniciais;
  const guardado = valor as Record<string, unknown>;
  return {
    busca: typeof guardado.busca === 'string' ? limparBusca(guardado.busca) : '',
    resultado: filtrosResultadoAlteracao.find((item) => item === guardado.resultado) ?? null,
    papel: lerNomeDoPapel(guardado.papel),
    pagina: lerPagina(guardado.pagina),
  };
}

export function aplicarMudancaAlteracoes(filtros: FiltrosAlteracoes, mudanca: Partial<FiltrosAlteracoes>): FiltrosAlteracoes {
  return lerFiltrosAlteracoes({ ...filtros, ...mudanca, pagina: paginaAposMudanca(filtros, mudanca) });
}

export function temFiltroAtivoAlteracoes(filtros: FiltrosAlteracoes): boolean {
  return filtros.busca !== '' || filtros.resultado !== null || filtros.papel !== null;
}

export function semFiltrosAlteracoes(): Pick<FiltrosAlteracoes, 'busca' | 'resultado' | 'papel'> {
  return { busca: '', resultado: null, papel: null };
}

export function estadoDaAlteracao(alteracao: AlteracaoDTO): EstadoDaAlteracao {
  if (alteracao.resultado === 'RECUSADA') return 'RECUSADA';
  return alteracao.desfeitaPor ? 'DESFEITA' : 'APLICADA';
}

export function podeDesfazer(alteracao: AlteracaoDTO): boolean {
  return alteracao.resultado === 'APLICADA' && alteracao.desfeitaPor === null && alteracao.inversas !== null;
}

function textoParaBusca(alteracao: AlteracaoDTO): string {
  return [
    tituloDaAlteracao(alteracao.operacoes, 'PASSADO'),
    ...alteracao.operacoes.map((operacao) => descreverOperacao(operacao, 'PASSADO')),
    ...alteracao.comandos,
    alteracao.conta,
    alteracao.papelDaConexao,
    alteracao.falha?.mensagem ?? '',
  ].join('\n');
}

export function filtrarAlteracoes(alteracoes: AlteracaoDTO[], filtros: FiltrosAlteracoes): AlteracaoDTO[] {
  const termos = termosDaBusca(filtros.busca);
  return [...alteracoes]
    .filter((alteracao) => filtros.resultado === null || estadoDaAlteracao(alteracao) === filtros.resultado)
    .filter((alteracao) => filtros.papel === null || papeisDaAlteracao(alteracao.operacoes).includes(filtros.papel))
    .filter((alteracao) => termos.length === 0 || correspondeABusca(textoParaBusca(alteracao), termos))
    .sort((a, b) => b.feitaEm.localeCompare(a.feitaEm));
}

export function papeisDoHistorico(alteracoes: AlteracaoDTO[]): string[] {
  return [...new Set(alteracoes.flatMap((alteracao) => papeisDaAlteracao(alteracao.operacoes)))]
    .filter((nome) => lerNomeDoPapel(nome) !== null)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function contarPorEstado(alteracoes: AlteracaoDTO[]): Record<EstadoDaAlteracao, number> {
  const contagem: Record<EstadoDaAlteracao, number> = { APLICADA: 0, DESFEITA: 0, RECUSADA: 0 };
  for (const alteracao of alteracoes) contagem[estadoDaAlteracao(alteracao)] += 1;
  return contagem;
}

export function resumirAlteracoes(total: number, encontradas: number, filtros: FiltrosAlteracoes): string {
  const palavra = pluralizar(total, 'alteração', 'alterações');
  if (!temFiltroAtivoAlteracoes(filtros)) return `${formatarNumero(total)} ${palavra}`;
  return `${formatarNumero(encontradas)} de ${formatarNumero(total)} ${palavra}`;
}

export function descreverFiltrosAlteracoes(filtros: FiltrosAlteracoes): string[] {
  const partes: string[] = [];
  if (filtros.busca) partes.push(`busca “${filtros.busca}”`);
  if (filtros.resultado) partes.push(rotuloFiltroResultadoAlteracao[filtros.resultado].toLowerCase());
  if (filtros.papel) partes.push(`papel ${filtros.papel}`);
  return partes;
}
