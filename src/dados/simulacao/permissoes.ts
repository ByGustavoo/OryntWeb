import type { ConexaoDTO } from '@/modelos/conexao';
import type {
  ConcessaoDTO,
  ListaPermissoesDTO,
  ObjetoComPermissoesDTO,
  Privilegio,
  PrivilegioPadraoDTO,
} from '@/modelos/permissoes';
import { idDoBanco, idDoEsquema, PUBLICO } from '@/regras/permissoes';
import { gerarFuncoes } from './funcoes';
import { gerarPapeis } from './papeis';
import { gerarTabelas } from './tabelas';
import { gerarVisoes } from './visoes';

type Esboco = Omit<ObjetoComPermissoesDTO, 'concessoes'>;

interface ConcessaoFicticia {
  objetos: (objeto: Esboco) => boolean;
  beneficiario: string;
  privilegios: Privilegio[];
  concedente?: string;
  repassavel?: boolean;
  colunas?: string[];
}

const DONO_DO_BANCO = 'postgres';

const ESQUEMAS: { nome: string; dono: string }[] = [
  { nome: 'public', dono: 'postgres' },
  { nome: 'relatorios', dono: 'loja_admin' },
  { nome: 'auditoria', dono: 'loja_auditoria' },
];

const FUNCOES_SEM_EXECUCAO_PUBLICA = new Set(['auditoria.registrar_alteracao()']);

const SEQUENCIA_DO_PADRAO = /^nextval\('([\w$.]+)'::regclass\)$/;

function eh(id: string): (objeto: Esboco) => boolean {
  return (objeto) => objeto.id === id;
}

function relacaoDe(dono: string, esquema: string): (objeto: Esboco) => boolean {
  return (objeto) =>
    objeto.dono === dono &&
    objeto.esquema === esquema &&
    (objeto.tipo === 'TABELA' || objeto.tipo === 'VISAO' || objeto.tipo === 'VISAO_MATERIALIZADA');
}

function tabelaDe(dono: string, esquema: string): (objeto: Esboco) => boolean {
  return (objeto) => objeto.dono === dono && objeto.esquema === esquema && objeto.tipo === 'TABELA';
}

export const concessoesFicticias: ConcessaoFicticia[] = [
  { objetos: (objeto) => objeto.tipo === 'BANCO', beneficiario: PUBLICO, privilegios: ['CONNECT', 'TEMPORARY'] },
  { objetos: (objeto) => objeto.tipo === 'BANCO', beneficiario: 'loja_admin', privilegios: ['CREATE'] },
  { objetos: eh(idDoEsquema('public')), beneficiario: PUBLICO, privilegios: ['USAGE', 'CREATE'] },
  { objetos: eh(idDoEsquema('relatorios')), beneficiario: 'leitura', privilegios: ['USAGE'] },
  { objetos: eh(idDoEsquema('relatorios')), beneficiario: 'loja_analise', privilegios: ['USAGE', 'CREATE'] },
  { objetos: eh(idDoEsquema('relatorios')), beneficiario: 'relatorios_antigos', privilegios: ['USAGE'] },
  { objetos: relacaoDe('loja_app', 'public'), beneficiario: 'leitura', privilegios: ['SELECT'] },
  {
    objetos: (objeto) => objeto.id === 'relatorios.vendas_diarias' || objeto.id === 'relatorios.resumo_avaliacoes',
    beneficiario: 'leitura',
    privilegios: ['SELECT'],
  },
  { objetos: eh('public.produtos'), beneficiario: 'leitura', privilegios: ['UPDATE'], concedente: 'migracao' },
  { objetos: tabelaDe('loja_app', 'public'), beneficiario: 'loja_admin', privilegios: ['MAINTAIN'] },
  { objetos: eh('public.pedidos'), beneficiario: 'fila_pedidos', privilegios: ['SELECT', 'UPDATE'] },
  { objetos: eh('public.itens_pedido'), beneficiario: 'fila_pedidos', privilegios: ['SELECT'] },
  { objetos: eh('public.pagamentos'), beneficiario: 'fila_pedidos', privilegios: ['SELECT'] },
  { objetos: eh('public.estoque'), beneficiario: 'fila_pedidos', privilegios: ['SELECT', 'UPDATE'] },
  {
    objetos: (objeto) => objeto.id === 'public.pedidos' || objeto.id === 'public.pagamentos',
    beneficiario: 'integracao_erp',
    privilegios: ['SELECT'],
    repassavel: true,
  },
  { objetos: eh('auditoria.acoes_recentes'), beneficiario: 'relatorio_bi', privilegios: ['SELECT'] },
  { objetos: eh('public.auditoria'), beneficiario: 'loja_auditoria', privilegios: ['SELECT'] },
  {
    objetos: eh('public.usuarios'),
    beneficiario: 'suporte_dba',
    privilegios: ['SELECT'],
    colunas: ['id', 'email', 'criado_em'],
  },
  {
    objetos: (objeto) =>
      (objeto.tipo === 'FUNCAO' || objeto.tipo === 'PROCEDIMENTO') && !FUNCOES_SEM_EXECUCAO_PUBLICA.has(objeto.id),
    beneficiario: PUBLICO,
    privilegios: ['EXECUTE'],
  },
];

export const privilegiosPadraoFicticios: PrivilegioPadraoDTO[] = [
  { criador: 'loja_app', esquema: 'public', tipoDeObjeto: 'TABELAS', beneficiario: 'leitura', privilegios: ['SELECT'] },
  { criador: 'loja_app', esquema: 'public', tipoDeObjeto: 'TABELAS', beneficiario: 'loja_admin', privilegios: ['MAINTAIN'] },
];

function esbocos(agora: Date, banco: string): Esboco[] {
  const tabelas = gerarTabelas(agora).tabelas;
  const base: Esboco = { id: '', tipo: 'BANCO', esquema: null, nome: '', dono: '', segurancaDefinidor: false, colunas: [] };

  const sequencias = tabelas.flatMap((tabela) =>
    tabela.colunas.flatMap((coluna): Esboco[] => {
      const nome = SEQUENCIA_DO_PADRAO.exec(coluna.padrao ?? '')?.[1];
      if (!nome) return [];
      return [{ ...base, id: `${tabela.esquema}.${nome}`, tipo: 'SEQUENCIA', esquema: tabela.esquema, nome, dono: tabela.dono }];
    }),
  );

  return [
    { ...base, id: idDoBanco(banco), nome: banco, dono: DONO_DO_BANCO },
    ...ESQUEMAS.map((esquema): Esboco => ({ ...base, id: idDoEsquema(esquema.nome), tipo: 'ESQUEMA', ...esquema })),
    ...tabelas.map((tabela): Esboco => ({
      ...base,
      id: tabela.id,
      tipo: 'TABELA',
      esquema: tabela.esquema,
      nome: tabela.nome,
      dono: tabela.dono,
      colunas: tabela.colunas.map((coluna) => coluna.nome),
    })),
    ...gerarVisoes(agora).visoes.map((visao): Esboco => ({
      ...base,
      id: visao.id,
      tipo: visao.tipo === 'MATERIALIZADA' ? 'VISAO_MATERIALIZADA' : 'VISAO',
      esquema: visao.esquema,
      nome: visao.nome,
      dono: visao.dono,
      colunas: visao.colunas.map((coluna) => coluna.nome),
    })),
    ...sequencias,
    ...gerarFuncoes(agora).funcoes.map((funcao): Esboco => ({
      ...base,
      id: funcao.id,
      tipo: funcao.tipo === 'PROCEDIMENTO' ? 'PROCEDIMENTO' : 'FUNCAO',
      esquema: funcao.esquema,
      nome: `${funcao.nome}(${funcao.argumentos})`,
      dono: funcao.dono,
      segurancaDefinidor: funcao.segurancaDefinidor,
    })),
  ];
}

function concessoesDoObjeto(objeto: Esboco): ConcessaoDTO[] {
  return concessoesFicticias.flatMap((ficticia) =>
    ficticia.objetos(objeto)
      ? ficticia.privilegios.map((privilegio) => ({
          beneficiario: ficticia.beneficiario,
          privilegio,
          concedente: ficticia.concedente ?? objeto.dono,
          repassavel: ficticia.repassavel ?? false,
          colunas: ficticia.colunas ?? null,
        }))
      : [],
  );
}

export function gerarPermissoes(
  agora: Date,
  conexao: Pick<ConexaoDTO, 'usuario' | 'banco'>,
  vazio = false,
): ListaPermissoesDTO {
  const geradoEm = agora.toISOString();
  const papelDaConexao = conexao.usuario;
  if (vazio) {
    return { geradoEm, banco: conexao.banco, papelDaConexao, papeis: [], objetos: [], privilegiosPadrao: [] };
  }

  const papeis = gerarPapeis(agora, papelDaConexao, false, false).papeis.map((papel) => ({
    nome: papel.nome,
    descricao: papel.descricao,
    login: papel.login,
    superusuario: papel.superusuario,
    membroDe: papel.membroDe,
  }));

  return {
    geradoEm,
    banco: conexao.banco,
    papelDaConexao,
    papeis,
    objetos: esbocos(agora, conexao.banco).map((objeto) => ({ ...objeto, concessoes: concessoesDoObjeto(objeto) })),
    privilegiosPadrao: privilegiosPadraoFicticios,
  };
}
