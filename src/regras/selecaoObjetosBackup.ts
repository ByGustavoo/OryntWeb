import type { ObjetoBackupDTO, SelecaoObjetos, TipoBackup, TipoObjetoBackup } from '@/modelos/backup';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { correspondeABusca, termosDaBusca } from './buscaConsultas';

export const tiposDeObjeto: TipoObjetoBackup[] = ['TABELA', 'VISAO', 'VISAO_MATERIALIZADA', 'FUNCAO', 'PROCEDIMENTO', 'SEQUENCIA'];

export const rotuloTipoObjetoBackup: Record<TipoObjetoBackup, [singular: string, plural: string]> = {
  TABELA: ['Tabela', 'Tabelas'],
  VISAO: ['View', 'Views'],
  VISAO_MATERIALIZADA: ['View materializada', 'Views materializadas'],
  FUNCAO: ['Função', 'Funções'],
  PROCEDIMENTO: ['Procedimento', 'Procedimentos'],
  SEQUENCIA: ['Sequência', 'Sequências'],
};

const TIPOS_COM_DADOS: readonly TipoObjetoBackup[] = ['TABELA', 'SEQUENCIA'];

export function tipoAceitaNoBackup(tipoDoObjeto: TipoObjetoBackup, tipoDoBackup: TipoBackup): boolean {
  return tipoDoBackup !== 'DADOS' || TIPOS_COM_DADOS.includes(tipoDoObjeto);
}

export const MOTIVO_SEM_DADOS = 'Não guarda dados: só entra em backups com a estrutura.';

export function objetosAceitos(objetos: readonly ObjetoBackupDTO[], tipoDoBackup: TipoBackup): ObjetoBackupDTO[] {
  return objetos.filter((objeto) => tipoAceitaNoBackup(objeto.tipo, tipoDoBackup));
}

export function ajustarSelecaoAoTipo(selecao: SelecaoObjetos, objetos: readonly ObjetoBackupDTO[], tipoDoBackup: TipoBackup): SelecaoObjetos {
  if (selecao.modo === 'BANCO_INTEIRO') return selecao;
  const aceitos = new Set(objetosAceitos(objetos, tipoDoBackup).map((objeto) => objeto.id));
  return { modo: 'ESCOLHIDOS', objetos: selecao.objetos.filter((id) => aceitos.has(id)) };
}

export function quantidadeNaSelecao(selecao: SelecaoObjetos, objetos: readonly ObjetoBackupDTO[], tipoDoBackup: TipoBackup): number {
  return selecao.modo === 'BANCO_INTEIRO' ? objetosAceitos(objetos, tipoDoBackup).length : selecao.objetos.length;
}

export type EstadoDaMarcacao = 'MARCADA' | 'PARCIAL' | 'VAZIA';

export function estadoDaMarcacao(ids: readonly string[], marcados: ReadonlySet<string>): EstadoDaMarcacao {
  const quantos = ids.filter((id) => marcados.has(id)).length;
  if (quantos === 0) return 'VAZIA';
  return quantos === ids.length ? 'MARCADA' : 'PARCIAL';
}

export function alternarIds(marcados: readonly string[], ids: readonly string[], marcar: boolean): string[] {
  if (marcar) return [...new Set([...marcados, ...ids])];
  const retirar = new Set(ids);
  return marcados.filter((id) => !retirar.has(id));
}

export interface GrupoDoTipo {
  tipo: TipoObjetoBackup;
  objetos: ObjetoBackupDTO[];
}

export interface GrupoDoEsquema {
  esquema: string;
  tipos: GrupoDoTipo[];
  objetos: ObjetoBackupDTO[];
}

export function agruparObjetos(objetos: readonly ObjetoBackupDTO[]): GrupoDoEsquema[] {
  const esquemas = [...new Set(objetos.map((objeto) => objeto.esquema))].sort((a, b) => {
    if (a === 'public') return -1;
    if (b === 'public') return 1;
    return a.localeCompare(b, 'pt-BR');
  });
  return esquemas.map((esquema) => {
    const doEsquema = objetos.filter((objeto) => objeto.esquema === esquema);
    return {
      esquema,
      objetos: doEsquema,
      tipos: tiposDeObjeto.flatMap((tipo) => {
        const doTipo = doEsquema.filter((objeto) => objeto.tipo === tipo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        return doTipo.length > 0 ? [{ tipo, objetos: doTipo }] : [];
      }),
    };
  });
}

export function filtrarObjetos(objetos: readonly ObjetoBackupDTO[], busca: string): ObjetoBackupDTO[] {
  const termos = termosDaBusca(busca);
  if (termos.length === 0) return [...objetos];
  return objetos.filter((objeto) => correspondeABusca(`${objeto.esquema}.${objeto.nome}`, termos));
}

export function descreverQuantidadesPorTipo(ids: readonly string[], objetos: readonly ObjetoBackupDTO[]): string {
  const marcados = new Set(ids);
  const partes = tiposDeObjeto.flatMap((tipo) => {
    const quantidade = objetos.filter((objeto) => objeto.tipo === tipo && marcados.has(objeto.id)).length;
    if (quantidade === 0) return [];
    const [singular, plural] = rotuloTipoObjetoBackup[tipo];
    return [`${formatarNumero(quantidade)} ${pluralizar(quantidade, singular, plural).toLowerCase()}`];
  });
  return partes.join(', ');
}

export function descreverSelecao(selecao: SelecaoObjetos): string {
  if (selecao.modo === 'BANCO_INTEIRO') return 'Banco inteiro';
  const quantidade = selecao.objetos.length;
  return `${formatarNumero(quantidade)} ${pluralizar(quantidade, 'objeto', 'objetos')}`;
}

export function tamanhoDaSelecao(selecao: SelecaoObjetos, objetos: readonly ObjetoBackupDTO[], tipoDoBackup: TipoBackup): number {
  const marcados = selecao.modo === 'ESCOLHIDOS' ? new Set(selecao.objetos) : null;
  return objetosAceitos(objetos, tipoDoBackup)
    .filter((objeto) => !marcados || marcados.has(objeto.id))
    .reduce((soma, objeto) => soma + (objeto.tamanhoBytes ?? 0), 0);
}
