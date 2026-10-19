import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import type {
  EventoGatilho,
  FuncaoDTO,
  GatilhoDaFuncaoDTO,
  GatilhoDaTabelaDTO,
  ListaFuncoesDTO,
  ModoParametro,
  MomentoGatilho,
  NivelGatilho,
  ParametroFuncaoDTO,
  RastreamentoFuncoes,
  TipoFuncao,
  UsoDaFuncaoDTO,
  VolatilidadeFuncao,
} from '@/modelos/objetos';
import { PERIODO_DAS_FUNCOES, idDaFuncao, linguagemMedida } from '@/regras/funcoes';
import { idDoObjeto } from '@/regras/visoes';
import { gerarConsultasDetalhadas } from './consultas';
import { indicesFicticios, inicioDaColeta, linhasGravadas, tabelasFicticias } from './indices';
import type { TipoDaGravacao } from './indices';

type Parametro = [nome: string | null, tipo: string, modo?: ModoParametro, padrao?: string];

type Chamadas =
  | { tipo: 'GRAVACOES'; tabelas: [tabela: string, gravacao: TipoDaGravacao][] }
  | { tipo: 'EXECUCOES'; consulta: string }
  | { tipo: 'NENHUMA' };

interface TempoFicticio {
  parteDaConsulta?: { consulta: string; parte: number };
  porChamadaMs?: number;
  parteDaPropria: number;
}

interface FuncaoFicticia {
  esquema: string;
  nome: string;
  tipo: TipoFuncao;
  linguagem: string;
  parametros: Parametro[];
  retorno: string | null;
  volatilidade: VolatilidadeFuncao;
  estrita?: boolean;
  segurancaDefinidor?: boolean;
  configuracoes?: string[];
  dono?: string;
  descricao: string | null;
  corpo: string;
  chamadas: Chamadas;
  tempo?: TempoFicticio;
  chamadaPor?: string;
  citadaPor?: string[];
  criadaHaDias?: number;
}

interface GatilhoFicticio {
  nome: string;
  tabela: string;
  funcao: string;
  momento: MomentoGatilho;
  eventos: EventoGatilho[];
  nivel: NivelGatilho;
  ativo?: boolean;
}

const DONO_PADRAO = 'loja_app';
const HORA_DA_CRIACAO_RECENTE = 16;
const MINUTO_DA_CRIACAO_RECENTE = 40;

const palavraDaVolatilidade: Record<VolatilidadeFuncao, string> = {
  IMUTAVEL: 'IMMUTABLE',
  ESTAVEL: 'STABLE',
  VOLATIL: 'VOLATILE',
};

export const funcoesFicticias: FuncaoFicticia[] = [
  {
    esquema: 'public',
    nome: 'definir_atualizado_em',
    tipo: 'GATILHO',
    linguagem: 'plpgsql',
    parametros: [],
    retorno: 'trigger',
    volatilidade: 'VOLATIL',
    descricao: 'Preenche atualizado_em com o instante da gravação, antes de cada atualização.',
    corpo: `BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;`,
    chamadas: {
      tipo: 'GRAVACOES',
      tabelas: [
        ['public.pedidos', 'ATUALIZACAO'],
        ['public.estoque', 'ATUALIZACAO'],
      ],
    },
    tempo: { porChamadaMs: 0.012, parteDaPropria: 1 },
  },
  {
    esquema: 'public',
    nome: 'validar_estoque',
    tipo: 'GATILHO',
    linguagem: 'plpgsql',
    parametros: [],
    retorno: 'trigger',
    volatilidade: 'VOLATIL',
    descricao: 'Impede que a quantidade em estoque fique negativa.',
    corpo: `BEGIN
  IF NEW.quantidade < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente para o produto %', NEW.produto_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;`,
    chamadas: { tipo: 'GRAVACOES', tabelas: [['public.estoque', 'ATUALIZACAO']] },
    tempo: { porChamadaMs: 0.018, parteDaPropria: 1 },
  },
  {
    esquema: 'public',
    nome: 'avisar_sessoes_expiradas',
    tipo: 'GATILHO',
    linguagem: 'plpgsql',
    parametros: [],
    retorno: 'trigger',
    volatilidade: 'VOLATIL',
    descricao: 'Avisa o serviço de autenticação de cada sessão removida pela limpeza, para derrubar os acessos abertos.',
    corpo: `DECLARE
  sessao record;
BEGIN
  FOR sessao IN
    SELECT usuario_id, token FROM removidas
  LOOP
    PERFORM pg_notify(
      'sessoes_expiradas',
      json_build_object('usuario', sessao.usuario_id, 'token', sessao.token)::text
    );
  END LOOP;
  RETURN NULL;
END;`,
    chamadas: { tipo: 'EXECUCOES', consulta: 'q-sessoes-limpeza' },
    tempo: { parteDaConsulta: { consulta: 'q-sessoes-limpeza', parte: 0.46 }, parteDaPropria: 1 },
  },
  {
    esquema: 'public',
    nome: 'calcular_total_pedido',
    tipo: 'FUNCAO',
    linguagem: 'plpgsql',
    parametros: [['pedido', 'bigint']],
    retorno: 'numeric',
    volatilidade: 'ESTAVEL',
    descricao: 'Soma os itens do pedido, o frete e o desconto do cupom, no valor que vai para o pagamento.',
    corpo: `DECLARE
  itens numeric;
  frete numeric;
  desconto numeric;
BEGIN
  SELECT coalesce(sum(i.quantidade * i.preco_unitario), 0)
    INTO itens
    FROM itens_pedido i
   WHERE i.pedido_id = pedido;

  SELECT calcular_frete(e.cep, sum(i.quantidade * pr.peso))
    INTO frete
    FROM pedidos p
    JOIN enderecos e ON e.cliente_id = p.cliente_id AND e.principal
    JOIN itens_pedido i ON i.pedido_id = p.id
    JOIN produtos pr ON pr.id = i.produto_id
   WHERE p.id = pedido
   GROUP BY e.cep;

  SELECT coalesce(c.desconto, 0)
    INTO desconto
    FROM pedidos p
    LEFT JOIN cupons c ON c.id = p.cupom_id
   WHERE p.id = pedido;

  RETURN itens + coalesce(frete, 0) - coalesce(desconto, 0);
END;`,
    chamadas: { tipo: 'EXECUCOES', consulta: 'q-pagamento-novo' },
    tempo: { parteDaConsulta: { consulta: 'q-pagamento-novo', parte: 0.42 }, parteDaPropria: 0.58 },
    citadaPor: ['q-pagamento-novo'],
  },
  {
    esquema: 'public',
    nome: 'calcular_frete',
    tipo: 'FUNCAO',
    linguagem: 'plpgsql',
    parametros: [
      ['cep', 'text'],
      ['peso', 'numeric'],
    ],
    retorno: 'numeric',
    volatilidade: 'ESTAVEL',
    descricao: 'O frete comum de um pedido, pela faixa do CEP e pelo peso em quilos.',
    corpo: `DECLARE
  faixa record;
BEGIN
  SELECT preco_base, preco_por_quilo
    INTO faixa
    FROM faixas_de_frete
   WHERE cep BETWEEN cep_inicial AND cep_final;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CEP % fora das faixas de entrega', cep;
  END IF;

  RETURN faixa.preco_base + faixa.preco_por_quilo * peso;
END;`,
    chamadas: { tipo: 'EXECUCOES', consulta: 'q-pagamento-novo' },
    chamadaPor: 'calcular_total_pedido',
  },
  {
    esquema: 'public',
    nome: 'calcular_frete',
    tipo: 'FUNCAO',
    linguagem: 'plpgsql',
    parametros: [
      ['cep', 'text'],
      ['peso', 'numeric'],
      ['expresso', 'boolean'],
    ],
    retorno: 'numeric',
    volatilidade: 'ESTAVEL',
    descricao: 'O frete de um pedido com a opção de entrega expressa, que custa 60% a mais.',
    corpo: `BEGIN
  IF expresso THEN
    RETURN round(calcular_frete(cep, peso) * 1.6, 2);
  END IF;
  RETURN calcular_frete(cep, peso);
END;`,
    chamadas: { tipo: 'NENHUMA' },
    criadaHaDias: 4,
  },
  {
    esquema: 'public',
    nome: 'somente_digitos',
    tipo: 'FUNCAO',
    linguagem: 'sql',
    parametros: [['texto', 'text']],
    retorno: 'text',
    volatilidade: 'IMUTAVEL',
    estrita: true,
    descricao: 'Tira pontos, traços e espaços de um documento, para comparar CPFs e CNPJs digitados de jeitos diferentes.',
    corpo: `SELECT regexp_replace(texto, '[^0-9]', '', 'g')`,
    chamadas: { tipo: 'GRAVACOES', tabelas: [['public.clientes', 'INSERCAO']] },
  },
  {
    esquema: 'public',
    nome: 'preco_com_desconto',
    tipo: 'FUNCAO',
    linguagem: 'sql',
    parametros: [
      ['preco', 'numeric'],
      ['percentual', 'numeric'],
    ],
    retorno: 'numeric',
    volatilidade: 'IMUTAVEL',
    estrita: true,
    descricao: 'O preço depois de um desconto em porcentagem, arredondado em centavos.',
    corpo: `SELECT round(preco * (1 - percentual / 100), 2)`,
    chamadas: { tipo: 'NENHUMA' },
  },
  {
    esquema: 'public',
    nome: 'gerar_slug',
    tipo: 'FUNCAO',
    linguagem: 'plpgsql',
    parametros: [['texto', 'text']],
    retorno: 'text',
    volatilidade: 'IMUTAVEL',
    estrita: true,
    descricao: null,
    corpo: `DECLARE
  slug text;
BEGIN
  slug := lower(translate(texto,
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'));
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  RETURN trim(BOTH '-' FROM slug);
END;`,
    chamadas: { tipo: 'NENHUMA' },
  },
  {
    esquema: 'public',
    nome: 'copiar_cliente_para_legado',
    tipo: 'GATILHO',
    linguagem: 'plpgsql',
    parametros: [],
    retorno: 'trigger',
    volatilidade: 'VOLATIL',
    dono: 'migracao',
    descricao: 'Copiava cada cliente novo para a plataforma antiga enquanto as duas rodavam juntas, na migração.',
    corpo: `BEGIN
  INSERT INTO importacoes_legado (documento, nome, email, origem)
  VALUES (NEW.documento, NEW.nome, NEW.email, 'loja-nova');
  RETURN NEW;
END;`,
    chamadas: { tipo: 'GRAVACOES', tabelas: [['public.clientes', 'INSERCAO']] },
  },
  {
    esquema: 'public',
    nome: 'arquivar_pedidos_antigos',
    tipo: 'PROCEDIMENTO',
    linguagem: 'plpgsql',
    parametros: [['dias', 'integer', 'IN', '365']],
    retorno: null,
    volatilidade: 'VOLATIL',
    segurancaDefinidor: true,
    dono: 'postgres',
    descricao: 'Move para o esquema arquivo os pedidos entregues há mais dias do que o informado.',
    corpo: `BEGIN
  INSERT INTO arquivo.pedidos
  SELECT *
    FROM pedidos
   WHERE status = 'ENTREGUE'
     AND atualizado_em < now() - make_interval(days => dias);

  DELETE FROM pedidos
   WHERE status = 'ENTREGUE'
     AND atualizado_em < now() - make_interval(days => dias);

  COMMIT;
END;`,
    chamadas: { tipo: 'NENHUMA' },
  },
  {
    esquema: 'auditoria',
    nome: 'registrar_alteracao',
    tipo: 'GATILHO',
    linguagem: 'plpgsql',
    parametros: [],
    retorno: 'trigger',
    volatilidade: 'VOLATIL',
    segurancaDefinidor: true,
    configuracoes: ['search_path=auditoria, pg_temp'],
    dono: 'loja_auditoria',
    descricao: 'Registra na auditoria quem inseriu, alterou ou removeu uma linha, com os valores antigos e novos.',
    corpo: `BEGIN
  INSERT INTO auditoria.alteracoes (tabela, operacao, usuario, antes, depois)
  VALUES (
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    TG_OP,
    session_user,
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END
  );
  RETURN NULL;
END;`,
    chamadas: { tipo: 'GRAVACOES', tabelas: [['public.importacoes_legado', 'INSERCAO']] },
  },
  {
    esquema: 'relatorios',
    nome: 'faturamento_por_categoria',
    tipo: 'FUNCAO',
    linguagem: 'sql',
    parametros: [
      ['inicio', 'date'],
      ['fim', 'date'],
      ['categoria_id', 'bigint', 'OUT'],
      ['faturamento', 'numeric', 'OUT'],
    ],
    retorno: 'TABLE(categoria_id bigint, faturamento numeric)',
    volatilidade: 'ESTAVEL',
    dono: 'loja_analise',
    descricao: 'O faturamento de cada categoria entre duas datas, lido da visão de vendas diárias.',
    corpo: `SELECT v.categoria_id, sum(v.faturamento)
  FROM relatorios.vendas_diarias v
 WHERE v.dia >= inicio AND v.dia < fim + 1
 GROUP BY v.categoria_id`,
    chamadas: { tipo: 'NENHUMA' },
  },
];

export const gatilhosFicticios: GatilhoFicticio[] = [
  {
    nome: 'pedidos_definir_atualizado_em',
    tabela: 'public.pedidos',
    funcao: 'public.definir_atualizado_em()',
    momento: 'ANTES',
    eventos: ['ATUALIZACAO'],
    nivel: 'LINHA',
  },
  {
    nome: 'estoque_definir_atualizado_em',
    tabela: 'public.estoque',
    funcao: 'public.definir_atualizado_em()',
    momento: 'ANTES',
    eventos: ['ATUALIZACAO'],
    nivel: 'LINHA',
  },
  {
    nome: 'estoque_validar_quantidade',
    tabela: 'public.estoque',
    funcao: 'public.validar_estoque()',
    momento: 'ANTES',
    eventos: ['ATUALIZACAO'],
    nivel: 'LINHA',
  },
  {
    nome: 'sessoes_avisar_expiradas',
    tabela: 'public.sessoes',
    funcao: 'public.avisar_sessoes_expiradas()',
    momento: 'DEPOIS',
    eventos: ['EXCLUSAO'],
    nivel: 'COMANDO',
  },
  {
    nome: 'clientes_copiar_para_legado',
    tabela: 'public.clientes',
    funcao: 'public.copiar_cliente_para_legado()',
    momento: 'DEPOIS',
    eventos: ['INSERCAO'],
    nivel: 'LINHA',
    ativo: false,
  },
  {
    nome: 'importacoes_legado_auditoria',
    tabela: 'public.importacoes_legado',
    funcao: 'auditoria.registrar_alteracao()',
    momento: 'DEPOIS',
    eventos: ['INSERCAO', 'ATUALIZACAO', 'EXCLUSAO'],
    nivel: 'LINHA',
  },
];

function argumentos(funcao: FuncaoFicticia): string {
  return funcao.parametros
    .filter(([, , modo = 'IN']) => modo !== 'OUT')
    .map(([, tipo]) => tipo)
    .join(', ');
}

export function idDaFuncaoFicticia(funcao: FuncaoFicticia): string {
  return idDaFuncao({ esquema: funcao.esquema, nome: funcao.nome, argumentos: argumentos(funcao) });
}

function parametro([nome, tipo, modo = 'IN', padrao]: Parametro): ParametroFuncaoDTO {
  return { nome, tipo, modo, padrao: padrao ?? null };
}

function cabecalho(funcao: FuncaoFicticia): string {
  const entradas = funcao.parametros
    .filter(([, , modo = 'IN']) => modo !== 'OUT' || funcao.retorno === null)
    .map(([nome, tipo, modo = 'IN', padrao]) => {
      const prefixo = funcao.tipo === 'PROCEDIMENTO' || modo !== 'IN' ? `${modo} ` : '';
      return `${prefixo}${nome ? `${nome} ` : ''}${tipo}${padrao ? ` DEFAULT ${padrao}` : ''}`;
    })
    .join(', ');
  const tipo = funcao.tipo === 'PROCEDIMENTO' ? 'PROCEDURE' : 'FUNCTION';
  return `CREATE OR REPLACE ${tipo} ${funcao.esquema}.${funcao.nome}(${entradas})`;
}

function definicao(funcao: FuncaoFicticia): string {
  const delimitador = funcao.tipo === 'PROCEDIMENTO' ? '$procedure$' : '$function$';
  const atributos = [
    funcao.retorno ? ` RETURNS ${funcao.retorno}` : null,
    ` LANGUAGE ${funcao.linguagem}`,
    funcao.tipo === 'PROCEDIMENTO' || funcao.volatilidade === 'VOLATIL'
      ? null
      : ` ${palavraDaVolatilidade[funcao.volatilidade]}${funcao.estrita ? ' STRICT' : ''}`,
    funcao.segurancaDefinidor ? ' SECURITY DEFINER' : null,
    ...(funcao.configuracoes ?? []).map((configuracao) => {
      const [nome = '', valor = ''] = configuracao.split('=');
      return ` SET ${nome} TO ${valor
        .split(',')
        .map((parte) => `'${parte.trim()}'`)
        .join(', ')}`;
    }),
  ].filter((linha): linha is string => linha !== null);
  return [cabecalho(funcao), ...atributos, `AS ${delimitador}`, funcao.corpo, delimitador].join('\n');
}

function criadaEm(funcao: FuncaoFicticia, agora: Date): Date {
  if (funcao.criadaHaDias === undefined) return inicioDaColeta(agora);
  return new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate() - funcao.criadaHaDias,
    HORA_DA_CRIACAO_RECENTE,
    MINUTO_DA_CRIACAO_RECENTE,
  );
}

function quantasChamadas(funcao: FuncaoFicticia, consultas: Map<string, ConsultaDetalhadaDTO>): number {
  const { chamadas } = funcao;
  if (chamadas.tipo === 'NENHUMA') return 0;
  if (chamadas.tipo === 'EXECUCOES') return consultas.get(chamadas.consulta)?.quantidadeExecucoes ?? 0;
  return chamadas.tabelas.reduce((soma, [id, gravacao]) => {
    const tabela = tabelasFicticias.find((candidata) => idDoObjeto(candidata) === id);
    return tabela ? soma + linhasGravadas(tabela, consultas, gravacao) : soma;
  }, 0);
}

function tempoPorChamada(tempo: TempoFicticio | undefined, consultas: Map<string, ConsultaDetalhadaDTO>): number {
  if (!tempo) return 0;
  if (tempo.parteDaConsulta) {
    const consulta = consultas.get(tempo.parteDaConsulta.consulta);
    return (consulta?.tempoMedioMs ?? 0) * tempo.parteDaConsulta.parte;
  }
  return tempo.porChamadaMs ?? 0;
}

function arredondar(valor: number): number {
  return Math.round(valor * 1000) / 1000;
}

function usoDasFuncoes(consultas: Map<string, ConsultaDetalhadaDTO>): Map<FuncaoFicticia, UsoDaFuncaoDTO> {
  const usos = new Map<FuncaoFicticia, UsoDaFuncaoDTO>();

  for (const funcao of funcoesFicticias) {
    if (funcao.chamadaPor) continue;
    const chamadas = quantasChamadas(funcao, consultas);
    const tempoTotalMs = chamadas * tempoPorChamada(funcao.tempo, consultas);
    const parteDaPropria = funcao.tempo?.parteDaPropria ?? 1;
    usos.set(funcao, { chamadas, tempoTotalMs: arredondar(tempoTotalMs), tempoProprioMs: arredondar(tempoTotalMs * parteDaPropria) });
  }

  for (const funcao of funcoesFicticias) {
    if (!funcao.chamadaPor) continue;
    const quemChama = funcoesFicticias.find((candidata) => candidata.nome === funcao.chamadaPor);
    const daQuemChama = quemChama ? usos.get(quemChama) : undefined;
    const tempo = daQuemChama ? daQuemChama.tempoTotalMs - daQuemChama.tempoProprioMs : 0;
    usos.set(funcao, {
      chamadas: daQuemChama?.chamadas ?? 0,
      tempoTotalMs: arredondar(tempo),
      tempoProprioMs: arredondar(tempo),
    });
  }

  return usos;
}

function gatilhoDaFuncao(gatilho: GatilhoFicticio): GatilhoDaFuncaoDTO {
  const [esquema = '', nome = ''] = gatilho.tabela.split('.');
  return {
    nome: gatilho.nome,
    tabela: { tipo: 'TABELA', esquema, nome },
    momento: gatilho.momento,
    eventos: gatilho.eventos,
    nivel: gatilho.nivel,
    ativo: gatilho.ativo ?? true,
  };
}

export function gatilhosDaTabela(id: string): GatilhoDaTabelaDTO[] {
  return gatilhosFicticios
    .filter((gatilho) => gatilho.tabela === id)
    .map((gatilho) => ({
      nome: gatilho.nome,
      funcao: gatilho.funcao,
      momento: gatilho.momento,
      eventos: gatilho.eventos,
      nivel: gatilho.nivel,
      ativo: gatilho.ativo ?? true,
    }));
}

function indicesDaFuncao(funcao: FuncaoFicticia): FuncaoDTO['indices'] {
  const id = idDaFuncaoFicticia(funcao);
  return indicesFicticios
    .filter((indice) => indice.funcoes?.includes(id))
    .map((indice) => {
      const [esquema = ''] = indice.tabela.split('.');
      return { id: idDoObjeto({ esquema, nome: indice.nome }), nome: indice.nome, tabela: indice.tabela };
    });
}

export function gerarFuncoes(agora: Date, vazio = false, rastreamento: RastreamentoFuncoes = 'PL'): ListaFuncoesDTO {
  const geradoEm = agora.toISOString();
  const coletaDesde = inicioDaColeta(agora).toISOString();
  if (vazio) return { geradoEm, coletaDesde, rastreamento, funcoes: [] };

  const consultas = new Map(gerarConsultasDetalhadas(PERIODO_DAS_FUNCOES, agora).map((consulta) => [consulta.id, consulta]));
  const usos = usoDasFuncoes(consultas);

  const funcoes = funcoesFicticias.map((funcao): FuncaoDTO => {
    const id = idDaFuncaoFicticia(funcao);
    return {
      id,
      esquema: funcao.esquema,
      nome: funcao.nome,
      argumentos: argumentos(funcao),
      tipo: funcao.tipo,
      linguagem: funcao.linguagem,
      retorno: funcao.retorno,
      parametros: funcao.parametros.map(parametro),
      volatilidade: funcao.volatilidade,
      estrita: funcao.estrita ?? false,
      segurancaDefinidor: funcao.segurancaDefinidor ?? false,
      configuracoes: funcao.configuracoes ?? [],
      dono: funcao.dono ?? DONO_PADRAO,
      descricao: funcao.descricao,
      definicao: definicao(funcao),
      observadaDesde: criadaEm(funcao, agora).toISOString(),
      uso: linguagemMedida(funcao.linguagem, rastreamento) ? (usos.get(funcao) ?? null) : null,
      gatilhos: gatilhosFicticios.filter((gatilho) => gatilho.funcao === id).map(gatilhoDaFuncao),
      indices: indicesDaFuncao(funcao),
      visoes: [],
      consultas: (funcao.citadaPor ?? [])
        .map((consulta) => consultas.get(consulta))
        .filter((consulta): consulta is ConsultaDetalhadaDTO => consulta !== undefined),
    };
  });

  return { geradoEm, coletaDesde, rastreamento, funcoes };
}
