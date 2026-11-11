import type { ItemNavegacao, SecaoNavegacao } from '@/configuracoes/navegacao';
import type { CodigoTela } from '@/modelos/telas';
import { caminhos } from '@/rotas/caminhos';
import { telaDoCaminho } from './permissoesConta';

export const caminhoDaTela: Record<CodigoTela, string> = {
  RELATORIOS_RESUMO: caminhos.relatoriosResumo,
  RELATORIOS_EXPORTACAO: caminhos.relatoriosExportacao,
  RELATORIOS_COMPARACAO: caminhos.relatoriosComparacao,
  CONSULTAS_TODAS: caminhos.consultasTodas,
  CONSULTAS_HISTORICO: caminhos.consultasHistorico,
  CONSULTAS_PLANOS: caminhos.consultasPlanos,
  BACKUP_RESUMO: caminhos.backupResumo,
  BACKUP_HISTORICO: caminhos.backupHistorico,
  BACKUP_AGENDAMENTOS: caminhos.backupAgendamentos,
  OBJETOS_VIEWS: caminhos.objetosVisoes,
  OBJETOS_INDICES: caminhos.objetosIndices,
  OBJETOS_TABELAS: caminhos.objetosTabelas,
  OBJETOS_FUNCOES: caminhos.objetosFuncoes,
  USUARIOS_PAPEIS: caminhos.usuariosPapeis,
  USUARIOS_SESSOES: caminhos.usuariosSessoes,
  USUARIOS_ALTERACOES: caminhos.usuariosAlteracoes,
  USUARIOS_PERMISSOES: caminhos.usuariosPermissoes,
  ADMINISTRACAO_USUARIOS: caminhos.administracaoUsuarios,
  ADMINISTRACAO_AUDITORIA: caminhos.administracaoAuditoria,
};

export const codigosTela = Object.keys(caminhoDaTela) as CodigoTela[];

const telaPorCaminho = new Map(codigosTela.map((codigo) => [caminhoDaTela[codigo], codigo]));

export function ehCodigoTela(valor: unknown): valor is CodigoTela {
  return typeof valor === 'string' && Object.prototype.hasOwnProperty.call(caminhoDaTela, valor);
}

export function telaDoDestino(destino: string): CodigoTela | null {
  const caminho = (destino.split(/[?#]/)[0] ?? '').replace(/\/+$/, '');
  return telaPorCaminho.get(caminho) ?? null;
}

export function rotuloDaTela(codigo: CodigoTela): string {
  return telaDoCaminho(caminhoDaTela[codigo])?.rotulo ?? codigo;
}

export function normalizarTelas(telas: readonly CodigoTela[]): CodigoTela[] {
  const escolhidas = new Set(telas);
  return codigosTela.filter((codigo) => escolhidas.has(codigo));
}

export function listarRotulosDasTelas(telas: readonly CodigoTela[]): string {
  const rotulos = normalizarTelas(telas).map(rotuloDaTela);
  const ultimo = rotulos.pop();
  return rotulos.length > 0 ? `${rotulos.join(', ')} e ${ultimo ?? ''}` : (ultimo ?? '');
}

function itemVisivel(item: ItemNavegacao, estaOculta: (destino: string) => boolean): ItemNavegacao[] {
  if (!item.filhos) return estaOculta(item.destino) ? [] : [item];
  const filhos = item.filhos.filter((filho) => !estaOculta(filho.destino));
  return filhos.length > 0 ? [{ ...item, filhos }] : [];
}

export function navegacaoVisivel(secoes: SecaoNavegacao[], estaOculta: (destino: string) => boolean): SecaoNavegacao[] {
  return secoes
    .map((secao) => ({ ...secao, itens: secao.itens.flatMap((item) => itemVisivel(item, estaOculta)) }))
    .filter((secao) => secao.itens.length > 0);
}

export interface OpcaoDeTela {
  codigo: CodigoTela;
  rotulo: string;
}

export interface GrupoDeTelas {
  titulo: string;
  telas: OpcaoDeTela[];
}

function opcaoDoDestino(destino: string, rotulo: string): OpcaoDeTela[] {
  const codigo = telaDoDestino(destino);
  return codigo ? [{ codigo, rotulo }] : [];
}

export function gruposDeTelas(secoes: SecaoNavegacao[]): GrupoDeTelas[] {
  return secoes
    .flatMap((secao): GrupoDeTelas[] => {
      const comTelas = secao.itens
        .filter((item) => item.filhos)
        .map((item) => ({
          titulo: item.rotulo,
          telas: (item.filhos ?? []).flatMap((filho) => opcaoDoDestino(filho.destino, filho.rotulo)),
        }));
      const avulsas = secao.itens.filter((item) => !item.filhos).flatMap((item) => opcaoDoDestino(item.destino, item.rotulo));
      return avulsas.length > 0 ? [...comTelas, { titulo: secao.titulo ?? 'Outras telas', telas: avulsas }] : comTelas;
    })
    .filter((grupo) => grupo.telas.length > 0);
}
