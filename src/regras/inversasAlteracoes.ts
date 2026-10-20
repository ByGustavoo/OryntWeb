import type {
  AlterarPapelDTO,
  ConcederPrivilegiosDTO,
  OperacaoDTO,
  ReferenciaObjetoDTO,
  RevogarPrivilegiosDTO,
} from '@/modelos/alteracoes';
import type { ListaPapeisDTO } from '@/modelos/papeis';
import type { ConcessaoDTO, ListaPermissoesDTO, ObjetoComPermissoesDTO, PrivilegioPadraoDTO } from '@/modelos/permissoes';
import { aplicarAosPapeis, aplicarAsPermissoes, dataDaValidade, objetosDoAlvo } from './aplicacaoAlteracoes';
import { privilegiosDoTipo } from './permissoes';

export interface EstadoParaInversas {
  papeis: ListaPapeisDTO;
  permissoes: ListaPermissoesDTO;
}

function referencia(objeto: ObjetoComPermissoesDTO): ReferenciaObjetoDTO {
  return { id: objeto.id, tipo: objeto.tipo, esquema: objeto.esquema, nome: objeto.nome };
}

function chaveDaConcessao(concessao: ConcessaoDTO): string {
  return `${concessao.beneficiario}\u0000${concessao.privilegio}\u0000${concessao.concedente}`;
}

function inversasDoPapel(operacao: OperacaoDTO, papeis: ListaPapeisDTO): OperacaoDTO[] | null {
  const atual = (nome: string) => papeis.papeis.find((papel) => papel.nome === nome);
  switch (operacao.tipo) {
    case 'CRIAR_PAPEL':
      return [{ tipo: 'EXCLUIR_PAPEL', papel: operacao.papel, herdeiro: null, removerPermissoes: true, encerrarSessoes: false }];
    case 'EXCLUIR_PAPEL':
      return null;
    case 'ALTERAR_PAPEL': {
      const papel = atual(operacao.papel);
      if (!papel) return null;
      const atributos: AlterarPapelDTO['atributos'] = {};
      for (const chave of Object.keys(operacao.atributos) as (keyof AlterarPapelDTO['atributos'])[]) {
        if (operacao.atributos[chave] !== undefined) atributos[chave] = papel[chave];
      }
      const inversa: AlterarPapelDTO = { tipo: 'ALTERAR_PAPEL', papel: operacao.papel, atributos };
      if (operacao.limiteConexoes !== undefined) inversa.limiteConexoes = papel.limiteConexoes;
      if (operacao.validadeSenha !== undefined) {
        inversa.validadeSenha = papel.validadeSenha === null ? null : dataDaValidade(papel.validadeSenha);
      }
      const vazia = Object.keys(atributos).length === 0 && inversa.limiteConexoes === undefined && inversa.validadeSenha === undefined;
      return vazia ? [] : [inversa];
    }
    case 'RENOMEAR_PAPEL':
      return [{ tipo: 'RENOMEAR_PAPEL', papel: operacao.novoNome, novoNome: operacao.papel }];
    case 'DESCREVER_PAPEL': {
      const papel = atual(operacao.papel);
      return papel ? [{ tipo: 'DESCREVER_PAPEL', papel: operacao.papel, descricao: papel.descricao }] : null;
    }
    case 'CONFIGURAR_PAPEL': {
      const papel = atual(operacao.papel);
      if (!papel) return null;
      const anterior = papel.configuracoes.find((configuracao) => configuracao.split('=')[0] === operacao.parametro);
      return [
        {
          tipo: 'CONFIGURAR_PAPEL',
          papel: operacao.papel,
          parametro: operacao.parametro,
          valor: anterior === undefined ? null : anterior.slice(operacao.parametro.length + 1),
        },
      ];
    }
    case 'CONCEDER_PARTICIPACAO': {
      const existia = atual(operacao.membro)?.membroDe.some((item) => item.papel === operacao.grupo) ?? false;
      return existia ? [] : [{ tipo: 'REVOGAR_PARTICIPACAO', grupo: operacao.grupo, membro: operacao.membro }];
    }
    case 'REVOGAR_PARTICIPACAO': {
      const existente = atual(operacao.membro)?.membroDe.find((item) => item.papel === operacao.grupo);
      if (!existente) return [];
      return [
        {
          tipo: 'CONCEDER_PARTICIPACAO',
          grupo: operacao.grupo,
          membro: operacao.membro,
          herda: existente.herda,
          assume: existente.assume,
          administra: existente.administra,
        },
      ];
    }
    default:
      return [];
  }
}

function inversasDoObjeto(antes: ObjetoComPermissoesDTO, depois: ObjetoComPermissoesDTO): OperacaoDTO[] {
  const anteriores = new Map(antes.concessoes.map((concessao) => [chaveDaConcessao(concessao), concessao]));
  const atuais = new Map(depois.concessoes.map((concessao) => [chaveDaConcessao(concessao), concessao]));
  const revogar = new Map<string, RevogarPrivilegiosDTO>();
  const conceder = new Map<string, ConcederPrivilegiosDTO>();

  const juntarRevogacao = (concessao: ConcessaoDTO, colunas: string[] | null, soRepasse: boolean) => {
    const chave = `${concessao.beneficiario}|${concessao.concedente}|${soRepasse}|${colunas?.join(',') ?? ''}`;
    const existente = revogar.get(chave);
    if (existente) existente.privilegios.push(concessao.privilegio);
    else {
      revogar.set(chave, {
        tipo: 'REVOGAR',
        alvo: { tipo: 'OBJETO', objeto: referencia(antes) },
        beneficiario: concessao.beneficiario,
        privilegios: [concessao.privilegio],
        colunas,
        soRepasse,
        concedentes: [concessao.concedente],
        cascata: false,
      });
    }
  };
  const juntarConcessao = (concessao: ConcessaoDTO, colunas: string[] | null, repassavel: boolean) => {
    const chave = `${concessao.beneficiario}|${repassavel}|${colunas?.join(',') ?? ''}`;
    const existente = conceder.get(chave);
    if (existente) existente.privilegios.push(concessao.privilegio);
    else {
      conceder.set(chave, {
        tipo: 'CONCEDER',
        alvo: { tipo: 'OBJETO', objeto: referencia(antes) },
        beneficiario: concessao.beneficiario,
        privilegios: [concessao.privilegio],
        colunas,
        repassavel,
      });
    }
  };

  for (const [chave, atual] of atuais) {
    const anterior = anteriores.get(chave);
    if (!anterior) {
      juntarRevogacao(atual, atual.colunas, false);
      continue;
    }
    if (atual.repassavel && !anterior.repassavel) juntarRevogacao(atual, null, true);
    if (anterior.colunas !== null && (atual.colunas === null || atual.colunas.length > anterior.colunas.length)) {
      const extras = atual.colunas === null ? null : atual.colunas.filter((coluna) => !anterior.colunas?.includes(coluna));
      if (extras === null) juntarConcessao(anterior, anterior.colunas, anterior.repassavel);
      else juntarRevogacao(atual, extras, false);
    }
  }
  for (const [chave, anterior] of anteriores) {
    const atual = atuais.get(chave);
    if (!atual) {
      juntarConcessao(anterior, anterior.colunas, anterior.repassavel);
      continue;
    }
    if (anterior.repassavel && !atual.repassavel) juntarConcessao(anterior, anterior.colunas, true);
    if (atual.colunas !== null && (anterior.colunas === null || anterior.colunas.length > atual.colunas.length)) {
      juntarConcessao(anterior, anterior.colunas === null ? null : anterior.colunas.filter((coluna) => !atual.colunas?.includes(coluna)), anterior.repassavel);
    }
  }

  const ordem = privilegiosDoTipo[antes.tipo];
  const ordenar = <T extends { privilegios: ConcessaoDTO['privilegio'][] }>(operacao: T): T => ({
    ...operacao,
    privilegios: ordem.filter((privilegio) => operacao.privilegios.includes(privilegio)),
  });
  return [...[...revogar.values()].map(ordenar), ...[...conceder.values()].map(ordenar)];
}

function juntarPorEsquema(operacao: OperacaoDTO, inversas: OperacaoDTO[], antes: ListaPermissoesDTO): OperacaoDTO[] {
  if ((operacao.tipo !== 'CONCEDER' && operacao.tipo !== 'REVOGAR') || operacao.alvo.tipo !== 'TODOS_DO_ESQUEMA') return inversas;
  const alvos = objetosDoAlvo(antes, operacao.alvo);
  const primeira = inversas[0];
  if (!primeira || inversas.length !== alvos.length || alvos.length < 2) return inversas;
  const assinatura = (item: OperacaoDTO) =>
    item.tipo === 'REVOGAR'
      ? `R|${item.beneficiario}|${item.privilegios.join(',')}|${item.soRepasse}|${item.concedentes.join(',')}|${item.colunas?.join(',') ?? ''}`
      : item.tipo === 'CONCEDER'
        ? `C|${item.beneficiario}|${item.privilegios.join(',')}|${item.repassavel}|${item.colunas?.join(',') ?? ''}`
        : '';
  const unica = assinatura(primeira);
  if (!inversas.every((item) => assinatura(item) === unica)) return inversas;
  if (primeira.tipo !== 'REVOGAR' && primeira.tipo !== 'CONCEDER') return inversas;
  return [{ ...primeira, alvo: operacao.alvo }];
}

function inversasDasPermissoes(operacao: OperacaoDTO, antes: ListaPermissoesDTO, depois: ListaPermissoesDTO): OperacaoDTO[] {
  const porId = new Map(depois.objetos.map((objeto) => [objeto.id, objeto]));
  const inversas = antes.objetos.flatMap((objeto) => {
    const atual = porId.get(objeto.id);
    return atual ? inversasDoObjeto(objeto, atual) : [];
  });
  return juntarPorEsquema(operacao, inversas, antes);
}

function chaveDoPadrao(padrao: PrivilegioPadraoDTO): string {
  return `${padrao.criador}|${padrao.esquema ?? ''}|${padrao.tipoDeObjeto}|${padrao.beneficiario}`;
}

function inversasDosPadroes(antes: ListaPermissoesDTO, depois: ListaPermissoesDTO): OperacaoDTO[] {
  const anteriores = new Map(antes.privilegiosPadrao.map((padrao) => [chaveDoPadrao(padrao), padrao]));
  const atuais = new Map(depois.privilegiosPadrao.map((padrao) => [chaveDoPadrao(padrao), padrao]));
  const inversas: OperacaoDTO[] = [];
  for (const chave of new Set([...anteriores.keys(), ...atuais.keys()])) {
    const anterior = anteriores.get(chave);
    const atual = atuais.get(chave);
    const base = anterior ?? atual;
    if (!base) continue;
    const ganhos = (atual?.privilegios ?? []).filter((privilegio) => !anterior?.privilegios.includes(privilegio));
    const perdas = (anterior?.privilegios ?? []).filter((privilegio) => !atual?.privilegios.includes(privilegio));
    const { criador, esquema, tipoDeObjeto, beneficiario } = base;
    if (ganhos.length > 0) {
      inversas.push({ tipo: 'PRIVILEGIO_PADRAO', acao: 'REVOGAR', criador, esquema, tipoDeObjeto, beneficiario, privilegios: ganhos });
    }
    if (perdas.length > 0) {
      inversas.push({ tipo: 'PRIVILEGIO_PADRAO', acao: 'CONCEDER', criador, esquema, tipoDeObjeto, beneficiario, privilegios: perdas });
    }
  }
  return inversas;
}

function citaPapel(operacao: OperacaoDTO, nome: string): boolean {
  switch (operacao.tipo) {
    case 'CONCEDER':
    case 'REVOGAR':
      return operacao.beneficiario === nome;
    case 'PRIVILEGIO_PADRAO':
      return operacao.beneficiario === nome || operacao.criador === nome;
    case 'CONCEDER_PARTICIPACAO':
    case 'REVOGAR_PARTICIPACAO':
      return operacao.membro === nome || operacao.grupo === nome;
    case 'RENOMEAR_PAPEL':
      return operacao.papel === nome;
    default:
      return 'papel' in operacao && operacao.papel === nome;
  }
}

export function inversasDe(operacoes: OperacaoDTO[], estado: EstadoParaInversas): OperacaoDTO[] | null {
  const criados = new Set(operacoes.flatMap((operacao) => (operacao.tipo === 'CRIAR_PAPEL' ? [operacao.papel] : [])));
  let papeis = estado.papeis;
  let permissoes = estado.permissoes;
  const inversas: OperacaoDTO[][] = [];

  for (const operacao of operacoes) {
    const doPapel = inversasDoPapel(operacao, papeis);
    if (doPapel === null) return null;
    const subsumida = operacao.tipo !== 'CRIAR_PAPEL' && [...criados].some((nome) => citaPapel(operacao, nome));
    const depois = aplicarAsPermissoes(permissoes, [operacao]);
    if (!subsumida) {
      inversas.push(doPapel);
      if (operacao.tipo === 'CONCEDER' || operacao.tipo === 'REVOGAR') inversas.push(inversasDasPermissoes(operacao, permissoes, depois));
      if (operacao.tipo === 'PRIVILEGIO_PADRAO') inversas.push(inversasDosPadroes(permissoes, depois));
    }
    papeis = aplicarAosPapeis(papeis, [operacao]);
    permissoes = depois;
  }

  const lista = inversas.reverse().flat();
  return lista.length > 0 ? lista : null;
}
