import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import type {
  AjusteAutovacuumDTO,
  ColunaTabelaDTO,
  IndiceDTO,
  LeituraDaTabelaDTO,
  ListaTabelasDTO,
  ParticaoDTO,
  ParticionamentoDTO,
  PontoDeCrescimentoDTO,
  ReferenciaObjetoDTO,
  TabelaDTO,
} from '@/modelos/objetos';
import type { NoPlanoDTO, PlanosConsultaDTO } from '@/modelos/planos';
import { PERIODO_DO_USO } from '@/regras/indices';
import { idDoObjeto } from '@/regras/visoes';
import { gerarConsultasDetalhadas } from './consultas';
import { gatilhosDaTabela } from './funcoes';
import { gerarIndices, inicioDaColeta, linhasGravadas, planosDasConsultas, tabelasFicticias } from './indices';
import type { TabelaFicticia } from './indices';
import { ultimaExecucao, visoesFicticias } from './visoes';

type Coluna = [nome: string, tipo: string, anulavel?: boolean, padrao?: string];

interface ParticionamentoFicticio {
  chave: string;
  idades: number[];
  autovacuumEmDias: (number | null)[];
}

interface TabelaDetalhadaFicticia {
  descricao: string | null;
  dono?: string;
  colunas: Coluna[];
  toastBytes?: number;
  mortas: number;
  alteracoes: number;
  vacuumEmHoras?: number;
  autovacuumEmHoras: number | null;
  analyze?: number | string;
  autoanalyzeEmHoras: number | null;
  idade: number;
  autovacuum?: [parametro: string, valor: string, padrao: string][];
  particionamento?: ParticionamentoFicticio;
}

const KB = 1024;
const MB = 1024 * KB;
const MS_POR_HORA = 3_600_000;
const DIAS_DO_CRESCIMENTO = 30;
const LIMITE_DE_CONGELAMENTO = 200_000_000;
const PESO_DO_SABADO = 0.7;
const PESO_DO_DOMINGO = 0.6;
const DONO_PADRAO = 'loja_app';

const criadoEm: Coluna = ['criado_em', 'timestamp with time zone', false, 'now()'];

function chave(tabela: string): Coluna {
  return ['id', 'bigint', false, `nextval('${tabela}_id_seq'::regclass)`];
}

const detalhesFicticios: Record<string, TabelaDetalhadaFicticia> = {
  usuarios: {
    descricao: 'As contas de quem entra na loja.',
    colunas: [
      chave('usuarios'),
      ['nome', 'text', false],
      ['email', 'text', false],
      ['senha_hash', 'text', false],
      criadoEm,
      ['ultimo_acesso_em', 'timestamp with time zone', true],
    ],
    mortas: 1_920,
    alteracoes: 2_310,
    autovacuumEmHoras: 31,
    autoanalyzeEmHoras: 31,
    idade: 61_400_000,
  },
  clientes: {
    descricao: 'Os dados de cadastro de quem compra, ligados à conta.',
    colunas: [
      chave('clientes'),
      ['usuario_id', 'bigint', false],
      ['nome', 'text', false],
      ['email', 'text', false],
      ['telefone', 'text', true],
      ['documento', 'text', false],
      criadoEm,
    ],
    mortas: 0,
    alteracoes: 0,
    autovacuumEmHoras: 44 * 24 + 6,
    autoanalyzeEmHoras: 44 * 24 + 6,
    idade: 88_200_000,
  },
  pedidos: {
    descricao: 'Um pedido por compra, com a situação e o total.',
    colunas: [
      chave('pedidos'),
      ['cliente_id', 'bigint', false],
      ['status', 'text', false, "'novo'::text"],
      ['total', 'numeric(12,2)', false],
      criadoEm,
      ['atualizado_em', 'timestamp with time zone', true],
    ],
    toastBytes: 8 * KB,
    mortas: 8_940,
    alteracoes: 14_120,
    autovacuumEmHoras: 19,
    analyze: 'q-estatisticas-pedidos',
    autoanalyzeEmHoras: 3 * 24 + 2,
    idade: 42_300_000,
  },
  itens_pedido: {
    descricao: 'Os produtos de cada pedido, com o preço da hora da compra.',
    colunas: [
      chave('itens_pedido'),
      ['pedido_id', 'bigint', false],
      ['produto_id', 'bigint', false],
      ['quantidade', 'integer', false],
      ['preco_unitario', 'numeric(12,2)', false],
    ],
    mortas: 1_210,
    alteracoes: 41_380,
    autovacuumEmHoras: 7,
    autoanalyzeEmHoras: 7,
    idade: 23_100_000,
    autovacuum: [
      ['autovacuum_vacuum_scale_factor', '0.02', '0.2'],
      ['autovacuum_analyze_scale_factor', '0.01', '0.1'],
    ],
  },
  produtos: {
    descricao: 'O catálogo, com os produtos desativados.',
    colunas: [
      chave('produtos'),
      ['nome', 'text', false],
      ['preco', 'numeric(12,2)', false],
      ['categoria_id', 'bigint', false],
      ['ativo', 'boolean', false, 'true'],
      ['descricao', 'text', true],
      criadoEm,
    ],
    toastBytes: 9 * MB,
    mortas: 0,
    alteracoes: 0,
    autovacuumEmHoras: 26 * 24 + 3,
    autoanalyzeEmHoras: 26 * 24 + 3,
    idade: 74_800_000,
  },
  categorias: {
    descricao: null,
    colunas: [
      chave('categorias'),
      ['nome', 'text', false],
      ['slug', 'text', false],
      ['posicao', 'integer', false, '0'],
      ['ativa', 'boolean', false, 'true'],
    ],
    mortas: 0,
    alteracoes: 0,
    autovacuumEmHoras: null,
    autoanalyzeEmHoras: null,
    idade: 74_800_000,
  },
  estoque: {
    descricao: 'A quantidade disponível de cada produto.',
    colunas: [
      chave('estoque'),
      ['produto_id', 'bigint', false],
      ['quantidade', 'integer', false, '0'],
      ['atualizado_em', 'timestamp with time zone', true],
    ],
    mortas: 6_120,
    alteracoes: 9_840,
    autovacuumEmHoras: 2,
    autoanalyzeEmHoras: 5,
    idade: 15_600_000,
  },
  carrinhos: {
    descricao: null,
    colunas: [chave('carrinhos'), ['usuario_id', 'bigint', false], criadoEm],
    mortas: 0,
    alteracoes: 0,
    autovacuumEmHoras: 12 * 24 + 4,
    autoanalyzeEmHoras: 12 * 24 + 4,
    idade: 70_100_000,
  },
  itens_carrinho: {
    descricao: 'O que está em cada carrinho antes de virar pedido.',
    colunas: [
      ['carrinho_id', 'bigint', false],
      ['produto_id', 'bigint', false],
      ['quantidade', 'integer', false, '1'],
    ],
    mortas: 3_380,
    alteracoes: 6_210,
    autovacuumEmHoras: 9,
    autoanalyzeEmHoras: 9,
    idade: 19_200_000,
  },
  pagamentos: {
    descricao: 'As cobranças de cada pedido e o retorno do meio de pagamento.',
    colunas: [
      chave('pagamentos'),
      ['pedido_id', 'bigint', false],
      ['metodo', 'text', false],
      ['valor', 'numeric(12,2)', false],
      ['situacao', 'text', false],
      criadoEm,
    ],
    mortas: 0,
    alteracoes: 9_120,
    autovacuumEmHoras: 3 * 24 + 11,
    autoanalyzeEmHoras: 3 * 24 + 11,
    idade: 33_700_000,
  },
  enderecos: {
    descricao: 'Os endereços de entrega de cada cliente.',
    colunas: [
      chave('enderecos'),
      ['cliente_id', 'bigint', false],
      ['logradouro', 'text', false],
      ['cidade', 'text', false],
      ['cep', 'text', false],
      ['principal', 'boolean', false, 'false'],
    ],
    mortas: 0,
    alteracoes: 0,
    autovacuumEmHoras: 37 * 24 + 15,
    autoanalyzeEmHoras: 37 * 24 + 15,
    idade: 70_100_000,
  },
  cupons: {
    descricao: 'Os cupons de desconto e quantas vezes cada um foi usado.',
    colunas: [
      chave('cupons'),
      ['codigo', 'text', false],
      ['desconto', 'numeric(5,2)', false],
      ['valido_ate', 'timestamp with time zone', false],
      ['usos', 'integer', false, '0'],
    ],
    mortas: 120,
    alteracoes: 210,
    autovacuumEmHoras: 14,
    autoanalyzeEmHoras: 14,
    idade: 9_800_000,
  },
  avaliacoes: {
    descricao: 'As notas e os comentários dos produtos.',
    colunas: [
      chave('avaliacoes'),
      ['produto_id', 'bigint', false],
      ['usuario_id', 'bigint', false],
      ['nota', 'smallint', false],
      ['comentario', 'text', true],
      criadoEm,
    ],
    toastBytes: 46 * MB,
    mortas: 0,
    alteracoes: 5_134,
    autovacuumEmHoras: 9 * 24 + 2,
    autoanalyzeEmHoras: 9 * 24 + 2,
    idade: 51_900_000,
  },
  favoritos: {
    descricao: null,
    colunas: [['usuario_id', 'bigint', false], ['produto_id', 'bigint', false], criadoEm],
    mortas: 2_140,
    alteracoes: 3_870,
    autovacuumEmHoras: 2 * 24 + 7,
    autoanalyzeEmHoras: 2 * 24 + 7,
    idade: 28_400_000,
  },
  notificacoes: {
    descricao: 'Os avisos mostrados a cada usuário e quando foram lidos.',
    colunas: [
      chave('notificacoes'),
      ['usuario_id', 'bigint', false],
      ['titulo', 'text', false],
      ['corpo', 'text', false],
      ['criada_em', 'timestamp with time zone', false, 'now()'],
      ['lida_em', 'timestamp with time zone', true],
    ],
    toastBytes: 94 * MB,
    mortas: 1_236_000,
    alteracoes: 1_198_000,
    autovacuumEmHoras: null,
    autoanalyzeEmHoras: null,
    idade: 87_400_000,
    autovacuum: [['autovacuum_enabled', 'false', 'true']],
  },
  sessoes: {
    descricao: 'As sessões abertas, apagadas quando expiram.',
    colunas: [
      chave('sessoes'),
      ['usuario_id', 'bigint', false],
      ['token', 'text', false],
      ['expira_em', 'timestamp with time zone', false],
      criadoEm,
    ],
    mortas: 21_700,
    alteracoes: 58_300,
    autovacuumEmHoras: 22,
    autoanalyzeEmHoras: 9 * 24 + 4,
    idade: 21_900_000,
    autovacuum: [['autovacuum_analyze_scale_factor', '0.2', '0.1']],
  },
  auditoria: {
    descricao: 'O registro de cada ação feita no painel administrativo, particionado por ano.',
    dono: 'auditoria_app',
    colunas: [
      chave('auditoria'),
      ['usuario_id', 'bigint', true],
      ['acao', 'text', false],
      ['alvo', 'text', false],
      ['detalhes', 'jsonb', true],
      criadoEm,
    ],
    toastBytes: 312 * MB,
    mortas: 0,
    alteracoes: 0,
    autovacuumEmHoras: null,
    autoanalyzeEmHoras: null,
    idade: 0,
    particionamento: {
      chave: 'criado_em',
      idades: [128_600_000, 96_300_000, 81_700_000, 64_200_000, 47_900_000, 31_500_000, 12_400_000],
      autovacuumEmDias: [null, 211, 176, 139, 97, 58, 1],
    },
  },
  entregas: {
    descricao: 'As entregas de cada pedido, com a previsão e a data em que chegaram.',
    colunas: [
      chave('entregas'),
      ['pedido_id', 'bigint', false],
      ['situacao', 'text', false],
      ['previsao', 'date', false],
      ['entregue_em', 'timestamp with time zone', true],
    ],
    mortas: 0,
    alteracoes: 0,
    autovacuumEmHoras: 21 * 24 + 8,
    autoanalyzeEmHoras: 21 * 24 + 8,
    idade: 52_600_000,
  },
  importacoes_legado: {
    descricao: 'Cópia dos clientes da plataforma antiga, carregada na migração.',
    dono: 'migracao',
    colunas: [
      ['documento', 'text', true],
      ['nome', 'text', false],
      ['email', 'text', true],
      ['origem', 'text', false],
      ['importado_em', 'timestamp with time zone', false, 'now()'],
    ],
    mortas: 0,
    alteracoes: 0,
    autovacuumEmHoras: 58 * 24 + 2,
    autoanalyzeEmHoras: 58 * 24 + 2,
    idade: 91_300_000,
  },
};

function horasAntes(agora: Date, horas: number | null | undefined): string | null {
  if (horas === null || horas === undefined) return null;
  return new Date(agora.getTime() - horas * MS_POR_HORA).toISOString();
}

function maisRecente(...instantes: (string | null)[]): string | null {
  return instantes.reduce<string | null>((recente, instante) => {
    if (instante === null) return recente;
    if (recente === null) return instante;
    return instante > recente ? instante : recente;
  }, null);
}

function diaLocal(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function coluna([nome, tipo, anulavel = true, padrao]: Coluna): ColunaTabelaDTO {
  return { nome, tipo, anulavel, padrao: padrao ?? null };
}

function etapasComRelacao(no: NoPlanoDTO): { no: NoPlanoDTO; indice: string | null }[] {
  const indiceDosFilhos = no.filhos.find((filho) => filho.tipo === 'Bitmap Index Scan')?.indice ?? null;
  const propria = no.relacao && no.tipo !== 'ModifyTable' ? [{ no, indice: no.indice ?? indiceDosFilhos }] : [];
  return [...propria, ...no.filhos.flatMap(etapasComRelacao)];
}

interface LeituraDoPlano {
  leitura: LeituraDaTabelaDTO;
  execucoes: number;
  linhasPorExecucao: number;
}

function leiturasDaTabela(nome: string, planos: PlanosConsultaDTO[]): LeituraDoPlano[] {
  return planos.flatMap(({ consulta, plano, versoes }) => {
    const execucoes = versoes[0]?.quantidadeExecucoes ?? 0;
    if (!plano) return [];
    return etapasComRelacao(plano.raiz)
      .filter(({ no }) => no.relacao === nome)
      .map(({ no, indice }) => ({
        execucoes,
        linhasPorExecucao: (no.linhasReais + (no.linhasRemovidasPeloFiltro ?? 0)) * no.lacos,
        leitura: { consulta, etapa: no.tipo, indice: no.tipo === 'Seq Scan' ? null : indice, leiturasPorExecucao: no.lacos },
      }));
  });
}

function ordenarLeituras(leituras: LeituraDaTabelaDTO[]): LeituraDaTabelaDTO[] {
  return [...leituras].sort(
    (a, b) =>
      Number(b.etapa === 'Seq Scan') - Number(a.etapa === 'Seq Scan') ||
      b.consulta.percentualTempoTotal - a.consulta.percentualTempoTotal,
  );
}

function usadaPor(id: string): ReferenciaObjetoDTO[] {
  return visoesFicticias
    .filter((visao) => visao.dependeDe.some(([tipo, esquema, nome]) => tipo === 'TABELA' && idDoObjeto({ esquema, nome }) === id))
    .map((visao) => ({
      tipo: visao.tipo === 'MATERIALIZADA' ? 'VISAO_MATERIALIZADA' : 'VISAO',
      esquema: visao.esquema,
      nome: visao.nome,
    }));
}

function pesoDoDia(data: Date): number {
  const dia = data.getDay();
  if (dia === 0) return PESO_DO_DOMINGO;
  if (dia === 6) return PESO_DO_SABADO;
  return 1;
}

export function gerarCrescimento(
  agora: Date,
  atual: { tamanhoBytes: number; linhas: number },
  liquidoEm30Dias: number,
  inchacoEm30Dias: number,
): PontoDeCrescimentoDTO[] {
  const dias = Array.from({ length: DIAS_DO_CRESCIMENTO + 1 }, (_, posicao) => {
    const data = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - DIAS_DO_CRESCIMENTO + posicao, 12);
    return { data, peso: posicao === 0 ? 0 : pesoDoDia(data) };
  });
  const pesoTotal = dias.reduce((soma, dia) => soma + dia.peso, 0);
  const bytesPorLinha = atual.linhas > 0 ? (atual.tamanhoBytes - inchacoEm30Dias) / atual.linhas : 0;
  let acumulado = 0;

  return dias.map(({ data, peso }) => {
    acumulado += peso;
    const parte = pesoTotal > 0 ? acumulado / pesoTotal : 1;
    const linhas = Math.max(0, Math.round(atual.linhas - liquidoEm30Dias * (1 - parte)));
    const tamanhoBytes = Math.round(linhas * bytesPorLinha + inchacoEm30Dias * parte);
    return { dia: diaLocal(data), tamanhoBytes, linhas };
  });
}

function particoesDaTabela(
  tabela: TabelaFicticia,
  particionamento: ParticionamentoFicticio,
  tamanhoBytes: number,
  insercoesEm30Dias: number,
  agora: Date,
): ParticaoDTO[] {
  const porDia = insercoesEm30Dias / DIAS_DO_CRESCIMENTO;
  const ano = agora.getFullYear();
  const inicioDoAno = new Date(ano, 0, 1);
  const diasNoAno = Math.floor((agora.getTime() - inicioDoAno.getTime()) / (24 * MS_POR_HORA));
  const quantidade = particionamento.idades.length;
  const anoCheio = Math.round(porDia * 365);
  const doAnoAtual = Math.round(porDia * diasNoAno);
  const doPrimeiro = Math.max(0, tabela.linhas - doAnoAtual - anoCheio * (quantidade - 2));

  return particionamento.idades.map((idade, posicao) => {
    const anoDaParticao = ano - (quantidade - 1) + posicao;
    const linhas = posicao === 0 ? doPrimeiro : posicao === quantidade - 1 ? doAnoAtual : anoCheio;
    const nome = `${tabela.nome}_${anoDaParticao}`;
    const autovacuum = particionamento.autovacuumEmDias[posicao] ?? null;
    return {
      id: idDoObjeto({ esquema: tabela.esquema, nome }),
      esquema: tabela.esquema,
      nome,
      limites: `FOR VALUES FROM ('${anoDaParticao}-01-01') TO ('${anoDaParticao + 1}-01-01')`,
      tamanhoBytes: Math.round((tamanhoBytes * linhas) / tabela.linhas),
      linhas,
      linhasMortas: 0,
      idadeTransacoes: idade,
      ultimoVacuum: null,
      ultimoAutovacuum: autovacuum === null ? null : horasAntes(agora, autovacuum * 24),
    };
  });
}

function particionamentoDaTabela(
  tabela: TabelaFicticia,
  detalhes: TabelaDetalhadaFicticia,
  insercoes: number,
  agora: Date,
): ParticionamentoDTO | null {
  if (!detalhes.particionamento) return null;
  return {
    estrategia: 'RANGE',
    chave: detalhes.particionamento.chave,
    particoes: particoesDaTabela(
      tabela,
      detalhes.particionamento,
      tabela.tamanhoBytes + (detalhes.toastBytes ?? 0),
      insercoes,
      agora,
    ),
  };
}

function ajustes(detalhes: TabelaDetalhadaFicticia): AjusteAutovacuumDTO[] {
  return (detalhes.autovacuum ?? []).map(([parametro, valor, padrao]) => ({ parametro, valor, padrao }));
}

function limiteDaTabela(ajustesDaTabela: AjusteAutovacuumDTO[]): number {
  const proprio = ajustesDaTabela.find((ajuste) => ajuste.parametro === 'autovacuum_freeze_max_age');
  return proprio ? Number(proprio.valor) : LIMITE_DE_CONGELAMENTO;
}

function autovacuumDesligado(ajustesDaTabela: AjusteAutovacuumDTO[]): boolean {
  return ajustesDaTabela.some((ajuste) => ajuste.parametro === 'autovacuum_enabled' && ajuste.valor === 'false');
}

function analyzeDaTabela(detalhes: TabelaDetalhadaFicticia, agora: Date): string | null {
  if (typeof detalhes.analyze === 'string') return ultimaExecucao(detalhes.analyze, agora);
  return horasAntes(agora, detalhes.analyze);
}

export function gerarTabelas(agora: Date, vazio = false): ListaTabelasDTO {
  const geradoEm = agora.toISOString();
  const coletaDesde = inicioDaColeta(agora).toISOString();
  if (vazio) return { geradoEm, coletaDesde, tabelas: [] };

  const lista = gerarConsultasDetalhadas(PERIODO_DO_USO, agora);
  const consultas = new Map<string, ConsultaDetalhadaDTO>(lista.map((consulta) => [consulta.id, consulta]));
  const planos = planosDasConsultas(lista, agora);
  const { indices, sugestoes } = gerarIndices(agora);

  const tabelas = tabelasFicticias.flatMap((tabela): TabelaDTO[] => {
    const detalhes = detalhesFicticios[tabela.nome];
    if (tabela.tipo !== 'TABELA' || !detalhes) return [];
    const id = idDoObjeto(tabela);
    const daTabela = indices.filter((indice: IndiceDTO) => idDoObjeto(indice.tabela) === id);
    const chavePrimaria = daTabela.find((indice) => indice.restricao === 'CHAVE_PRIMARIA')?.colunas ?? null;
    const insercoes = linhasGravadas(tabela, consultas, 'INSERCAO');
    const atualizacoes = linhasGravadas(tabela, consultas, 'ATUALIZACAO');
    const exclusoes = linhasGravadas(tabela, consultas, 'EXCLUSAO');
    const atualizacoesHot = Math.round(atualizacoes * tabela.partesHot);
    const doPlano = leiturasDaTabela(tabela.nome, planos);
    const sequenciais = doPlano.filter(({ leitura }) => leitura.etapa === 'Seq Scan');
    const ajustesDaTabela = ajustes(detalhes);
    const particionamento = particionamentoDaTabela(tabela, detalhes, insercoes, agora);
    const particoes = particionamento?.particoes ?? [];
    const tamanhoIndicesBytes = daTabela.reduce((soma, indice) => soma + indice.tamanhoBytes, 0);
    const tamanhoToastBytes = detalhes.toastBytes ?? 0;
    const tamanhoTotal = tabela.tamanhoBytes + tamanhoIndicesBytes + tamanhoToastBytes;
    const inchaco = autovacuumDesligado(ajustesDaTabela)
      ? Math.round((atualizacoes - atualizacoesHot + exclusoes) * (tabela.tamanhoBytes / (tabela.linhas + detalhes.mortas)))
      : 0;
    const ultimoAutovacuum =
      particoes.length > 0
        ? maisRecente(...particoes.map((particao) => particao.ultimoAutovacuum))
        : horasAntes(agora, detalhes.autovacuumEmHoras);

    return [
      {
        id,
        esquema: tabela.esquema,
        nome: tabela.nome,
        dono: detalhes.dono ?? DONO_PADRAO,
        descricao: detalhes.descricao,
        colunas: detalhes.colunas.map(coluna),
        chavePrimaria,
        tamanhoDadosBytes: tabela.tamanhoBytes,
        tamanhoIndicesBytes,
        tamanhoToastBytes,
        linhas: tabela.linhas,
        linhasMortas: detalhes.mortas,
        alteracoesDesdeAnalyze: detalhes.alteracoes,
        insercoes,
        atualizacoes,
        atualizacoesHot,
        exclusoes,
        leiturasSequenciais: sequenciais.reduce((soma, { execucoes, leitura }) => soma + execucoes * leitura.leiturasPorExecucao, 0),
        linhasLidasSequencialmente: Math.round(
          sequenciais.reduce((soma, { execucoes, linhasPorExecucao }) => soma + execucoes * linhasPorExecucao, 0),
        ),
        leiturasPorIndice: daTabela.reduce((soma, indice) => soma + indice.leituras, 0),
        linhasLidasPorIndice: daTabela.reduce((soma, indice) => soma + indice.linhasLidas, 0),
        ultimoVacuum: horasAntes(agora, detalhes.vacuumEmHoras),
        ultimoAutovacuum,
        ultimoAnalyze: analyzeDaTabela(detalhes, agora),
        ultimoAutoanalyze: horasAntes(agora, detalhes.autoanalyzeEmHoras),
        idadeTransacoes:
          particoes.length > 0 ? Math.max(...particoes.map((particao) => particao.idadeTransacoes)) : detalhes.idade,
        limiteCongelamento: limiteDaTabela(ajustesDaTabela),
        autovacuum: ajustesDaTabela,
        particionamento,
        indices: daTabela.map((indice) => ({
          id: indice.id,
          nome: indice.nome,
          colunas: indice.colunas,
          restricao: indice.restricao,
          unico: indice.unico,
          valido: indice.valido,
          tamanhoBytes: indice.tamanhoBytes,
          leituras: indice.leituras,
        })),
        indicesSugeridos: sugestoes
          .filter((sugestao) => sugestao.tabela === id)
          .map(({ colunas, comando, extensao }) => ({ colunas, comando, extensao })),
        usadaPor: usadaPor(id),
        gatilhos: gatilhosDaTabela(id),
        leituras: ordenarLeituras(doPlano.map(({ leitura }) => leitura)),
        crescimento: gerarCrescimento(agora, { tamanhoBytes: tamanhoTotal, linhas: tabela.linhas }, insercoes - exclusoes, inchaco),
      },
    ];
  });

  return { geradoEm, coletaDesde, tabelas };
}
