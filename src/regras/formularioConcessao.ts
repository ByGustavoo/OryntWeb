import type { AlvoDaConcessaoDTO, OperacaoDTO, TipoTodosDoEsquema } from '@/modelos/alteracoes';
import type { ConcessaoDTO, ObjetoComPermissoesDTO, Privilegio, TipoPrivilegioPadrao } from '@/modelos/permissoes';
import { objetosDoAlvo } from './aplicacaoAlteracoes';
import type { ErrosPapel } from './formularioPapel';
import { concessaoDe, privilegiosDoTipo, PUBLICO, referenciaDoObjeto } from './permissoes';
import type { IndiceDasPermissoes } from './permissoes';

export type AcaoDaConcessao = 'CONCEDER' | 'REVOGAR';
export type AlcanceDaConcessao = 'OBJETO' | 'ESQUEMA';

export const tiposDeTodos: TipoTodosDoEsquema[] = ['TABELAS', 'SEQUENCIAS', 'FUNCOES'];

export const rotuloTipoDeTodos: Record<TipoTodosDoEsquema, string> = {
  TABELAS: 'Tabelas e visões',
  SEQUENCIAS: 'Sequências',
  FUNCOES: 'Funções',
};

export const tiposDePadrao: TipoPrivilegioPadrao[] = ['TABELAS', 'SEQUENCIAS', 'FUNCOES'];

const privilegiosDeTodos: Record<TipoTodosDoEsquema, Privilegio[]> = {
  TABELAS: privilegiosDoTipo.TABELA,
  SEQUENCIAS: privilegiosDoTipo.SEQUENCIA,
  FUNCOES: privilegiosDoTipo.FUNCAO,
};

const PRIVILEGIOS_POR_COLUNA: Privilegio[] = ['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'];

export interface CamposConcessao {
  acao: AcaoDaConcessao;
  beneficiario: string | null;
  alcance: AlcanceDaConcessao;
  objeto: string | null;
  esquema: string | null;
  tipoDeObjeto: TipoTodosDoEsquema;
  privilegios: Privilegio[];
  porColuna: boolean;
  colunas: string[];
  repassavel: boolean;
  usageNoEsquema: boolean;
}

export function camposDaConcessao(inicial: Partial<CamposConcessao> = {}): CamposConcessao {
  return {
    acao: 'CONCEDER',
    beneficiario: null,
    alcance: 'OBJETO',
    objeto: null,
    esquema: null,
    tipoDeObjeto: 'TABELAS',
    privilegios: [],
    porColuna: false,
    colunas: [],
    repassavel: false,
    usageNoEsquema: true,
    ...inicial,
  };
}

export function alvoDosCampos(campos: CamposConcessao, indice: IndiceDasPermissoes): AlvoDaConcessaoDTO | null {
  if (campos.alcance === 'ESQUEMA') {
    return campos.esquema ? { tipo: 'TODOS_DO_ESQUEMA', esquema: campos.esquema, tipoDeObjeto: campos.tipoDeObjeto } : null;
  }
  const objeto = campos.objeto ? indice.objetos.get(campos.objeto) : undefined;
  return objeto ? { tipo: 'OBJETO', objeto: referenciaDoObjeto(objeto) } : null;
}

export function privilegiosDisponiveis(campos: CamposConcessao, indice: IndiceDasPermissoes): Privilegio[] {
  if (campos.alcance === 'ESQUEMA') return privilegiosDeTodos[campos.tipoDeObjeto];
  const objeto = campos.objeto ? indice.objetos.get(campos.objeto) : undefined;
  return objeto ? privilegiosDoTipo[objeto.tipo] : [];
}

export function colunasDisponiveis(campos: CamposConcessao, indice: IndiceDasPermissoes): string[] {
  if (campos.alcance !== 'OBJETO') return [];
  const objeto = campos.objeto ? indice.objetos.get(campos.objeto) : undefined;
  return objeto?.colunas ?? [];
}

export function aceitaColunas(campos: CamposConcessao, indice: IndiceDasPermissoes): boolean {
  return (
    colunasDisponiveis(campos, indice).length > 0 &&
    campos.privilegios.length > 0 &&
    campos.privilegios.every((privilegio) => PRIVILEGIOS_POR_COLUNA.includes(privilegio))
  );
}

export function ajustarAoAlvo(campos: CamposConcessao, indice: IndiceDasPermissoes): CamposConcessao {
  const disponiveis = privilegiosDisponiveis(campos, indice);
  const privilegios = campos.privilegios.filter((privilegio) => disponiveis.includes(privilegio));
  const colunas = colunasDisponiveis(campos, indice);
  const ajustados = { ...campos, privilegios, colunas: campos.colunas.filter((coluna) => colunas.includes(coluna)) };
  return aceitaColunas(ajustados, indice) ? ajustados : { ...ajustados, porColuna: false, colunas: [] };
}

function esquemaDoAlvo(campos: CamposConcessao, indice: IndiceDasPermissoes): ObjetoComPermissoesDTO | null {
  const nome = campos.alcance === 'ESQUEMA' ? campos.esquema : (campos.objeto ? indice.objetos.get(campos.objeto)?.esquema : null);
  if (!nome) return null;
  const objeto = campos.alcance === 'OBJETO' && campos.objeto ? indice.objetos.get(campos.objeto) : undefined;
  if (objeto?.tipo === 'ESQUEMA') return null;
  return indice.esquemas.get(nome) ?? null;
}

export function faltaUsageNoEsquema(campos: CamposConcessao, indice: IndiceDasPermissoes): string | null {
  if (campos.acao !== 'CONCEDER' || !campos.beneficiario || campos.beneficiario === PUBLICO) return null;
  const esquema = esquemaDoAlvo(campos, indice);
  if (!esquema) return null;
  const papel = indice.papeis.get(campos.beneficiario);
  if (papel?.superusuario) return null;
  const herdados = indice.herdados.get(campos.beneficiario);
  const usa =
    esquema.dono === campos.beneficiario ||
    (herdados?.has(esquema.dono) ?? false) ||
    esquema.concessoes.some(
      (concessao) =>
        concessao.privilegio === 'USAGE' &&
        (concessao.beneficiario === campos.beneficiario ||
          concessao.beneficiario === PUBLICO ||
          (herdados?.has(concessao.beneficiario) ?? false)),
    );
  return usa ? null : esquema.nome;
}

export function validarConcessao(campos: CamposConcessao, indice: IndiceDasPermissoes): ErrosPapel {
  const erros: ErrosPapel = {};
  if (!campos.beneficiario) erros.beneficiario = 'Escolha o papel.';
  if (campos.alcance === 'OBJETO' && !campos.objeto) erros.objeto = 'Escolha o objeto.';
  if (campos.alcance === 'ESQUEMA' && !campos.esquema) erros.esquema = 'Escolha o esquema.';
  if (campos.privilegios.length === 0) erros.privilegios = 'Marque ao menos um privilégio.';
  if (campos.porColuna && campos.colunas.length === 0) erros.colunas = 'Marque ao menos uma coluna, ou desligue a escolha por coluna.';
  if (campos.acao === 'REVOGAR' && !erros.beneficiario && !erros.objeto && !erros.esquema && !erros.privilegios) {
    const alvo = alvoDosCampos(campos, indice);
    if (alvo && concessoesAlcancadas(campos, alvo, indice).length === 0) {
      erros.privilegios = `${campos.beneficiario} não recebeu esses privilégios direto neste alvo: não há o que revogar.`;
    }
  }
  return erros;
}

function concessoesAlcancadas(campos: CamposConcessao, alvo: AlvoDaConcessaoDTO, indice: IndiceDasPermissoes): { objeto: ObjetoComPermissoesDTO; concessao: ConcessaoDTO }[] {
  return objetosDoAlvo(indice.dados, alvo).flatMap((objeto) =>
    objeto.concessoes
      .filter((concessao) => concessao.beneficiario === campos.beneficiario && campos.privilegios.includes(concessao.privilegio))
      .map((concessao) => ({ objeto, concessao })),
  );
}

export function operacoesDaConcessao(campos: CamposConcessao, indice: IndiceDasPermissoes): OperacaoDTO[] {
  const alvo = alvoDosCampos(campos, indice);
  if (!alvo || !campos.beneficiario || campos.privilegios.length === 0) return [];
  const colunas = campos.porColuna && campos.colunas.length > 0 ? campos.colunas : null;
  const ordem = privilegiosDisponiveis(campos, indice);
  const privilegios = ordem.filter((privilegio) => campos.privilegios.includes(privilegio));

  if (campos.acao === 'CONCEDER') {
    const operacoes: OperacaoDTO[] = [];
    const semUsage = faltaUsageNoEsquema(campos, indice);
    const esquema = semUsage ? indice.esquemas.get(semUsage) : undefined;
    if (campos.usageNoEsquema && esquema) operacoes.push(concessaoDe(esquema, campos.beneficiario, ['USAGE']));
    operacoes.push({ tipo: 'CONCEDER', alvo, beneficiario: campos.beneficiario, privilegios, colunas, repassavel: campos.repassavel });
    return operacoes;
  }

  const alcancadas = concessoesAlcancadas(campos, alvo, indice);
  const concedentes = [...new Set(alcancadas.map(({ concessao }) => concessao.concedente))].sort();
  const soDoDono = alcancadas.every(({ objeto, concessao }) => concessao.concedente === objeto.dono);
  const repassou = objetosDoAlvo(indice.dados, alvo).some((objeto) =>
    objeto.concessoes.some((concessao) => concessao.concedente === campos.beneficiario && privilegios.includes(concessao.privilegio)),
  );
  return [
    {
      tipo: 'REVOGAR',
      alvo,
      beneficiario: campos.beneficiario,
      privilegios,
      colunas,
      soRepasse: false,
      concedentes: soDoDono ? [] : concedentes,
      cascata: repassou,
    },
  ];
}

export interface CamposPadrao {
  acao: AcaoDaConcessao;
  criador: string | null;
  esquema: string | null;
  tipoDeObjeto: TipoPrivilegioPadrao;
  beneficiario: string | null;
  privilegios: Privilegio[];
}

export function camposDoPadrao(inicial: Partial<CamposPadrao> = {}): CamposPadrao {
  return { acao: 'CONCEDER', criador: null, esquema: null, tipoDeObjeto: 'TABELAS', beneficiario: null, privilegios: [], ...inicial };
}

export function privilegiosDoPadrao(tipo: TipoPrivilegioPadrao): Privilegio[] {
  return privilegiosDeTodos[tipo];
}

export function validarPadrao(campos: CamposPadrao): ErrosPapel {
  const erros: ErrosPapel = {};
  if (!campos.criador) erros.criador = 'Escolha quem cria os objetos.';
  if (!campos.beneficiario) erros.beneficiario = 'Escolha quem recebe o privilégio.';
  if (campos.privilegios.length === 0) erros.privilegios = 'Marque ao menos um privilégio.';
  return erros;
}

export function operacoesDoPadrao(campos: CamposPadrao): OperacaoDTO[] {
  if (!campos.criador || !campos.beneficiario || campos.privilegios.length === 0) return [];
  const ordem = privilegiosDeTodos[campos.tipoDeObjeto];
  return [
    {
      tipo: 'PRIVILEGIO_PADRAO',
      acao: campos.acao,
      criador: campos.criador,
      esquema: campos.esquema,
      tipoDeObjeto: campos.tipoDeObjeto,
      beneficiario: campos.beneficiario,
      privilegios: ordem.filter((privilegio) => campos.privilegios.includes(privilegio)),
    },
  ];
}

export function operacaoQueRetiraOPadrao(padrao: {
  criador: string;
  esquema: string | null;
  tipoDeObjeto: TipoPrivilegioPadrao;
  beneficiario: string;
  privilegios: Privilegio[];
}): OperacaoDTO {
  return { tipo: 'PRIVILEGIO_PADRAO', acao: 'REVOGAR', ...padrao };
}
