import { PREFIXO_ARMAZENAMENTO } from '@/configuracoes/aplicacao';

export type CenarioConexao = 'SUCESSO' | 'SENHA_INCORRETA' | 'SERVIDOR_INACESSIVEL' | 'BANCO_INEXISTENTE' | 'TEMPO_ESGOTADO';

export interface OpcaoCenarioConexao {
  valor: CenarioConexao;
  rotulo: string;
  descricao: string;
}

export const cenariosConexao: OpcaoCenarioConexao[] = [
  { valor: 'SUCESSO', rotulo: 'Sucesso', descricao: 'A conexão é aceita.' },
  { valor: 'SENHA_INCORRETA', rotulo: 'Senha incorreta', descricao: 'O banco recusa o usuário ou a senha.' },
  { valor: 'SERVIDOR_INACESSIVEL', rotulo: 'Servidor inacessível', descricao: 'Ninguém responde no host e na porta.' },
  { valor: 'BANCO_INEXISTENTE', rotulo: 'Banco inexistente', descricao: 'O servidor responde, mas o banco não existe.' },
  { valor: 'TEMPO_ESGOTADO', rotulo: 'Tempo esgotado', descricao: 'O servidor demora até a tentativa ser interrompida.' },
];

const PREFIXO_SIMULACAO = `${PREFIXO_ARMAZENAMENTO}simulacao:`;
const CHAVE_CENARIO_CONEXAO = `${PREFIXO_SIMULACAO}cenario-conexao`;
const CHAVE_FALHAS = `${PREFIXO_SIMULACAO}falhas`;
const CHAVE_LATENCIA = `${PREFIXO_SIMULACAO}latencia`;
const CHAVE_DADOS_VAZIOS = `${PREFIXO_SIMULACAO}dados-vazios`;

export const EVENTO_CENARIO_ALTERADO = 'orynt:cenario-alterado';

function ler(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string | null): void {
  try {
    if (valor === null) window.localStorage.removeItem(chave);
    else window.localStorage.setItem(chave, valor);
  } catch {
    return;
  }
}

function ehCenarioConexao(valor: string | null): valor is CenarioConexao {
  return cenariosConexao.some((cenario) => cenario.valor === valor);
}

export function lerCenarioConexao(): CenarioConexao {
  const salvo = ler(CHAVE_CENARIO_CONEXAO);
  return ehCenarioConexao(salvo) ? salvo : 'SUCESSO';
}

export function definirCenarioConexao(cenario: CenarioConexao): void {
  gravar(CHAVE_CENARIO_CONEXAO, ehCenarioConexao(cenario) && cenario !== 'SUCESSO' ? cenario : null);
  window.dispatchEvent(new Event(EVENTO_CENARIO_ALTERADO));
}

export function deveFalhar(caminho: string): boolean {
  const configuracao = ler(CHAVE_FALHAS);
  if (!configuracao) return false;
  return configuracao === '*' || configuracao.split(',').some((trecho) => trecho && caminho.startsWith(trecho.trim()));
}

export function definirFalhas(rotas: string | false): void {
  gravar(CHAVE_FALHAS, rotas || null);
}

export function latenciaConfigurada(): number | null {
  const valor = Number(ler(CHAVE_LATENCIA));
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

export function definirLatencia(milissegundos: number | false): void {
  gravar(CHAVE_LATENCIA, milissegundos ? String(milissegundos) : null);
}

export function dadosVazios(): boolean {
  return ler(CHAVE_DADOS_VAZIOS) === 'true';
}

export function definirDadosVazios(vazios: boolean): void {
  gravar(CHAVE_DADOS_VAZIOS, vazios ? 'true' : null);
}
