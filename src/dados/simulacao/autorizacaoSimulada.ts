import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import type { CodigoPermissao, ModuloAuditoria } from '@/modelos/administracao';
import { PROBLEMAS_ADMINISTRACAO } from '@/modelos/administracao';
import { categoriaDoMetodo } from '@/regras/auditoria';
import { possui, rotuloDaPermissao } from '@/regras/permissoesConta';
import { encerrarAcessoSimulado, lerAcessoSimulado } from './acessoSimulado';
import { registrarEvento } from './auditoriaSimulada';
import type { ContaSimulada } from './contasSimuladas';
import { autorDaConta, contaDaSessaoSimulada, tocarSessaoSimulada } from './contasSimuladas';
import { problema } from './resposta';
import { PROBLEMAS_AUTENTICACAO } from '@/modelos/autenticacao';

export interface ContextoSimulado {
  conta: ContaSimulada | null;
}

export type ExigenciaDaRota = 'PUBLICA' | 'AUTENTICADA' | readonly CodigoPermissao[] | ((requisicao: RequisicaoTransporte) => CodigoPermissao[]);

export type ResultadoDaAutorizacao = { contexto: ContextoSimulado } | { recusa: RespostaTransporte };

const MODULOS_POR_PREFIXO: [string, ModuloAuditoria][] = [
  ['/dashboard', 'DASHBOARD'],
  ['/relatorios', 'RELATORIOS'],
  ['/consultas', 'CONSULTAS'],
  ['/objetos', 'OBJETOS'],
  ['/usuarios', 'BANCO'],
  ['/conexoes', 'CONEXOES'],
  ['/backup', 'BACKUP'],
  ['/administracao', 'ADMINISTRACAO'],
  ['/auditoria', 'ADMINISTRACAO'],
  ['/sistema', 'CONFIGURACOES'],
];

export function moduloDoCaminho(caminho: string): ModuloAuditoria {
  return MODULOS_POR_PREFIXO.find(([prefixo]) => caminho.startsWith(prefixo))?.[1] ?? 'ACESSO';
}

export function semAcessoAutenticado(): RespostaTransporte {
  return problema(401, 'Acesso não autenticado!', PROBLEMAS_AUTENTICACAO.naoAutenticado, 'Não há um acesso ativo nesta sessão.');
}

export function semPermissao(detalhe: string): RespostaTransporte {
  return problema(403, 'Sem permissão!', PROBLEMAS_ADMINISTRACAO.semPermissao, detalhe);
}

function permissoesExigidas(exigencia: ExigenciaDaRota, requisicao: RequisicaoTransporte): readonly CodigoPermissao[] {
  if (exigencia === 'PUBLICA' || exigencia === 'AUTENTICADA') return [];
  return typeof exigencia === 'function' ? exigencia(requisicao) : exigencia;
}

export function autorizar(
  requisicao: RequisicaoTransporte,
  exigencia: ExigenciaDaRota,
  descricao: string | undefined,
  agora: Date,
): ResultadoDaAutorizacao {
  const conta = contaDaSessaoSimulada(agora);
  if (exigencia === 'PUBLICA') return { contexto: { conta } };

  if (!conta) {
    if (lerAcessoSimulado()) encerrarAcessoSimulado();
    return { recusa: semAcessoAutenticado() };
  }

  tocarSessaoSimulada(conta, agora);
  const faltando = permissoesExigidas(exigencia, requisicao).filter((codigo) => !possui(conta, codigo));
  if (faltando.length === 0) return { contexto: { conta } };

  const nomes = faltando.map((codigo) => `“${rotuloDaPermissao(codigo)}”`).join(' e ');
  registrarEvento(
    {
      tipo: 'ACESSO_NEGADO',
      resultado: 'NEGADO',
      conta: autorDaConta(conta),
      categoria: categoriaDoMetodo(requisicao.metodo),
      modulo: moduloDoCaminho(requisicao.caminho),
      alvo: { tipo: 'ROTA', id: requisicao.caminho, rotulo: descricao ?? `${requisicao.metodo} ${requisicao.caminho}` },
      motivo: `A conta não tem ${nomes}.`,
      requisicao: { metodo: requisicao.metodo, caminho: requisicao.caminho },
    },
    agora,
  );
  return { recusa: semPermissao(`A sua conta não tem a permissão ${nomes}.`) };
}
