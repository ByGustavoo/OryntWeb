import { PREFIXO_ARMAZENAMENTO } from '@/configuracoes/aplicacao';
import type { AlteracaoDTO, OperacaoDTO } from '@/modelos/alteracoes';
import type { ListaPapeisDTO } from '@/modelos/papeis';
import type { ListaPermissoesDTO } from '@/modelos/permissoes';
import { aplicarAosPapeis, aplicarAsPermissoes, donoDepois } from '@/regras/aplicacaoAlteracoes';
import { PAPEL_DO_RESTO_DAS_SESSOES } from './papeis';
import { conexoesNoInstante } from './series';

const CHAVE_ALTERACOES = `${PREFIXO_ARMAZENAMENTO}simulacao:alteracoes`;
const CHAVE_RECUSA = `${PREFIXO_ARMAZENAMENTO}simulacao:recusar-alteracoes`;

interface AlteracaoGuardada {
  conexao: string;
  alteracao: AlteracaoDTO;
}

function guardadaValida(valor: unknown): valor is AlteracaoGuardada {
  if (!valor || typeof valor !== 'object') return false;
  const bruto = valor as { conexao?: unknown; alteracao?: unknown };
  if (typeof bruto.conexao !== 'string' || !bruto.alteracao || typeof bruto.alteracao !== 'object') return false;
  const alteracao = bruto.alteracao as Partial<AlteracaoDTO>;
  return (
    typeof alteracao.id === 'string' &&
    typeof alteracao.feitaEm === 'string' &&
    Array.isArray(alteracao.operacoes) &&
    Array.isArray(alteracao.comandos) &&
    (alteracao.resultado === 'APLICADA' || alteracao.resultado === 'RECUSADA')
  );
}

function lerTodas(): AlteracaoGuardada[] {
  try {
    const salvo: unknown = JSON.parse(window.localStorage.getItem(CHAVE_ALTERACOES) ?? '[]');
    return Array.isArray(salvo) ? salvo.filter(guardadaValida) : [];
  } catch {
    return [];
  }
}

function gravarTodas(lista: AlteracaoGuardada[]): void {
  try {
    window.localStorage.setItem(CHAVE_ALTERACOES, JSON.stringify(lista));
  } catch {
    return;
  }
}

export function alteracoesDaConexao(conexao: string): AlteracaoDTO[] {
  return lerTodas()
    .filter((item) => item.conexao === conexao)
    .map((item) => item.alteracao);
}

export function registrarAlteracao(conexao: string, alteracao: AlteracaoDTO): void {
  gravarTodas([...lerTodas(), { conexao, alteracao }]);
}

export function marcarDesfeita(conexao: string, id: string, por: string): void {
  gravarTodas(
    lerTodas().map((item) =>
      item.conexao === conexao && item.alteracao.id === id ? { ...item, alteracao: { ...item.alteracao, desfeitaPor: por } } : item,
    ),
  );
}

export function restaurarPapeisSimulados(): void {
  gravarTodas([]);
}

export function recusaConfigurada(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_RECUSA) === 'true';
  } catch {
    return false;
  }
}

export function definirRecusaDeAlteracoes(recusar: boolean): void {
  try {
    if (recusar) window.localStorage.setItem(CHAVE_RECUSA, 'true');
    else window.localStorage.removeItem(CHAVE_RECUSA);
  } catch {
    return;
  }
}

function aplicadas(conexao: string): AlteracaoDTO[] {
  return alteracoesDaConexao(conexao)
    .filter((alteracao) => alteracao.resultado === 'APLICADA')
    .sort((a, b) => a.feitaEm.localeCompare(b.feitaEm));
}

export function operacoesAplicadas(conexao: string): OperacaoDTO[] {
  return aplicadas(conexao).flatMap((alteracao) => alteracao.operacoes);
}

function equilibrarSessoes(lista: ListaPapeisDTO, agora: Date): ListaPapeisDTO {
  const resto = lista.papeis.find((papel) => papel.nome === PAPEL_DO_RESTO_DAS_SESSOES);
  if (!resto) return lista;
  const outras = lista.papeis
    .filter((papel) => papel !== resto)
    .reduce((soma, papel) => soma + papel.sessoes, 0);
  const sessoes = Math.max(0, conexoesNoInstante(agora) - outras);
  return {
    ...lista,
    papeis: lista.papeis.map((papel) => (papel === resto ? { ...papel, sessoes, vistoPorUltimo: sessoes > 0 ? lista.geradoEm : papel.vistoPorUltimo } : papel)),
  };
}

export function papeisComAlteracoes(base: ListaPapeisDTO, conexao: string, agora: Date): ListaPapeisDTO {
  const lista = aplicadas(conexao);
  if (lista.length === 0 || base.papeis.length === 0) return base;
  const alterada = lista.reduce((atual, alteracao) => aplicarAosPapeis(atual, alteracao.operacoes, alteracao.feitaEm), base);
  return equilibrarSessoes(alterada, agora);
}

export function permissoesComAlteracoes(base: ListaPermissoesDTO, conexao: string): ListaPermissoesDTO {
  if (base.papeis.length === 0) return base;
  return aplicarAsPermissoes(base, operacoesAplicadas(conexao));
}

export function donoComAlteracoes(conexao: string): (dono: string) => string {
  return donoDepois(operacoesAplicadas(conexao));
}

export function renomeacoesAplicadas(conexao: string): Map<string, string> {
  const atuais = new Map<string, string>();
  for (const operacao of operacoesAplicadas(conexao)) {
    if (operacao.tipo !== 'RENOMEAR_PAPEL') continue;
    const original = [...atuais.entries()].find(([, atual]) => atual === operacao.papel)?.[0] ?? operacao.papel;
    atuais.set(original, operacao.novoNome);
  }
  return atuais;
}
