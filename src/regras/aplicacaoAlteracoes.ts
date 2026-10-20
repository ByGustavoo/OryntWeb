import type {
  AlvoDaConcessaoDTO,
  ConcederPrivilegiosDTO,
  OperacaoDTO,
  PrivilegioPadraoOperacaoDTO,
  RevogarPrivilegiosDTO,
  SenhaDaOperacaoDTO,
} from '@/modelos/alteracoes';
import type { ListaPapeisDTO, MetodoSenha, PapelDTO, ParticipacaoDTO } from '@/modelos/papeis';
import type {
  ConcessaoDTO,
  ListaPermissoesDTO,
  ObjetoComPermissoesDTO,
  PapelDasPermissoesDTO,
  PrivilegioPadraoDTO,
  TipoObjetoPermissao,
} from '@/modelos/permissoes';
import { PUBLICO, privilegiosDoTipo } from './permissoes';

const tiposDeTodos: Record<'TABELAS' | 'SEQUENCIAS' | 'FUNCOES', TipoObjetoPermissao[]> = {
  TABELAS: ['TABELA', 'VISAO', 'VISAO_MATERIALIZADA'],
  SEQUENCIAS: ['SEQUENCIA'],
  FUNCOES: ['FUNCAO'],
};

export function instanteDaValidade(validade: string): string {
  const [ano, mes, dia] = validade.split('-').map(Number);
  return new Date(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1).toISOString();
}

export function dataDaValidade(instante: string): string {
  const data = new Date(instante);
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function metodoDaSenha(senha: SenhaDaOperacaoDTO | null | undefined, atual: MetodoSenha | null): MetodoSenha {
  if (senha === undefined) return atual ?? 'SEM_SENHA';
  if (senha === null || senha.tipo === 'NENHUMA') return 'SEM_SENHA';
  return 'SCRAM';
}

function trocarConfiguracao(configuracoes: string[], parametro: string, valor: string | null): string[] {
  const restantes = configuracoes.filter((configuracao) => configuracao.split('=')[0] !== parametro);
  return valor === null ? restantes : [...restantes, `${parametro}=${valor}`];
}

function participacao(origem: { herda: boolean; assume: boolean; administra: boolean }, papel: string): ParticipacaoDTO {
  return { papel, herda: origem.herda, assume: origem.assume, administra: origem.administra };
}

function renomearNaLista(participacoes: ParticipacaoDTO[], de: string, para: string): ParticipacaoDTO[] {
  return participacoes.map((item) => (item.papel === de ? { ...item, papel: para } : item));
}

function semPapel(participacoes: ParticipacaoDTO[], nome: string): ParticipacaoDTO[] {
  return participacoes.filter((item) => item.papel !== nome);
}

function comParticipacao(participacoes: ParticipacaoDTO[], nova: ParticipacaoDTO): ParticipacaoDTO[] {
  return participacoes.some((item) => item.papel === nova.papel)
    ? participacoes.map((item) => (item.papel === nova.papel ? nova : item))
    : [...participacoes, nova];
}

function aplicarAoPapel(papel: PapelDTO, operacao: OperacaoDTO): PapelDTO {
  if (operacao.tipo === 'ALTERAR_PAPEL' && operacao.papel === papel.nome) {
    const login = operacao.atributos.login ?? papel.login;
    return {
      ...papel,
      ...operacao.atributos,
      limiteConexoes: operacao.limiteConexoes === undefined ? papel.limiteConexoes : operacao.limiteConexoes,
      validadeSenha:
        operacao.validadeSenha === undefined
          ? papel.validadeSenha
          : operacao.validadeSenha === null
            ? null
            : instanteDaValidade(operacao.validadeSenha),
      metodoSenha: login || papel.metodoSenha !== null ? metodoDaSenha(operacao.senha, papel.metodoSenha) : null,
    };
  }
  if (operacao.tipo === 'RENOMEAR_PAPEL') {
    const renomeado = {
      ...papel,
      membroDe: renomearNaLista(papel.membroDe, operacao.papel, operacao.novoNome),
      membros: renomearNaLista(papel.membros, operacao.papel, operacao.novoNome),
    };
    if (papel.nome !== operacao.papel) return renomeado;
    return { ...renomeado, nome: operacao.novoNome, metodoSenha: papel.metodoSenha === 'MD5' ? 'SEM_SENHA' : papel.metodoSenha };
  }
  if (operacao.tipo === 'DESCREVER_PAPEL' && operacao.papel === papel.nome) return { ...papel, descricao: operacao.descricao };
  if (operacao.tipo === 'CONFIGURAR_PAPEL' && operacao.papel === papel.nome) {
    return { ...papel, configuracoes: trocarConfiguracao(papel.configuracoes, operacao.parametro, operacao.valor) };
  }
  if (operacao.tipo === 'CONCEDER_PARTICIPACAO') {
    if (papel.nome === operacao.membro) return { ...papel, membroDe: comParticipacao(papel.membroDe, participacao(operacao, operacao.grupo)) };
    if (papel.nome === operacao.grupo) return { ...papel, membros: comParticipacao(papel.membros, participacao(operacao, operacao.membro)) };
    return papel;
  }
  if (operacao.tipo === 'REVOGAR_PARTICIPACAO') {
    if (papel.nome === operacao.membro) return { ...papel, membroDe: semPapel(papel.membroDe, operacao.grupo) };
    if (papel.nome === operacao.grupo) return { ...papel, membros: semPapel(papel.membros, operacao.membro) };
    return papel;
  }
  if (operacao.tipo === 'EXCLUIR_PAPEL') {
    return { ...papel, membroDe: semPapel(papel.membroDe, operacao.papel), membros: semPapel(papel.membros, operacao.papel) };
  }
  return papel;
}

function papelNovo(operacao: Extract<OperacaoDTO, { tipo: 'CRIAR_PAPEL' }>, agora: string): PapelDTO {
  return {
    nome: operacao.papel,
    descricao: null,
    inicial: false,
    ...operacao.atributos,
    limiteConexoes: operacao.limiteConexoes,
    validadeSenha: operacao.validadeSenha === null ? null : instanteDaValidade(operacao.validadeSenha),
    metodoSenha: operacao.atributos.login ? metodoDaSenha(operacao.senha, null) : null,
    configuracoes: [],
    membroDe: [],
    membros: [],
    sessoes: 0,
    ociosasEmTransacao30Dias: 0,
    vistoPorUltimo: null,
    observadoDesde: agora,
    objetos: [],
  };
}

function aplicarUmaAosPapeis(papeis: PapelDTO[], operacao: OperacaoDTO, agora: string): PapelDTO[] {
  if (operacao.tipo === 'CRIAR_PAPEL') return [...papeis, papelNovo(operacao, agora)];
  if (operacao.tipo === 'EXCLUIR_PAPEL') {
    const excluido = papeis.find((papel) => papel.nome === operacao.papel);
    return papeis
      .filter((papel) => papel.nome !== operacao.papel)
      .map((papel) => {
        const ajustado = aplicarAoPapel(papel, operacao);
        if (!excluido || operacao.herdeiro !== papel.nome) return ajustado;
        return { ...ajustado, objetos: [...ajustado.objetos, ...excluido.objetos] };
      });
  }
  return papeis.map((papel) => aplicarAoPapel(papel, operacao));
}

export function aplicarAosPapeis(lista: ListaPapeisDTO, operacoes: OperacaoDTO[], agora: string = lista.geradoEm): ListaPapeisDTO {
  let papeis = lista.papeis;
  let papelDaConexao = lista.papelDaConexao;
  for (const operacao of operacoes) {
    papeis = aplicarUmaAosPapeis(papeis, operacao, agora);
    if (operacao.tipo === 'RENOMEAR_PAPEL' && operacao.papel === papelDaConexao) papelDaConexao = operacao.novoNome;
  }
  return { ...lista, papelDaConexao, papeis };
}

function herdaDe(papeis: PapelDasPermissoesDTO[], sujeito: string, alvo: string): boolean {
  if (sujeito === alvo) return true;
  const porNome = new Map(papeis.map((papel) => [papel.nome, papel]));
  const visitados = new Set([sujeito]);
  const fila = [sujeito];
  for (let atual = fila.shift(); atual !== undefined; atual = fila.shift()) {
    for (const item of porNome.get(atual)?.membroDe ?? []) {
      if (!item.herda || visitados.has(item.papel)) continue;
      if (item.papel === alvo) return true;
      visitados.add(item.papel);
      fila.push(item.papel);
    }
  }
  return false;
}

export function concedenteEfetivo(lista: ListaPermissoesDTO, ator: string, objeto: ObjetoComPermissoesDTO): string {
  const papel = lista.papeis.find((candidato) => candidato.nome === ator);
  if (papel?.superusuario || herdaDe(lista.papeis, ator, objeto.dono)) return objeto.dono;
  return ator;
}

export function objetosDoAlvo(lista: Pick<ListaPermissoesDTO, 'objetos'>, alvo: AlvoDaConcessaoDTO): ObjetoComPermissoesDTO[] {
  if (alvo.tipo === 'OBJETO') return lista.objetos.filter((objeto) => objeto.id === alvo.objeto.id);
  const tipos = tiposDeTodos[alvo.tipoDeObjeto];
  return lista.objetos.filter((objeto) => objeto.esquema === alvo.esquema && tipos.includes(objeto.tipo));
}

function mesmaConcessao(a: ConcessaoDTO, b: Pick<ConcessaoDTO, 'beneficiario' | 'privilegio' | 'concedente'>): boolean {
  return a.beneficiario === b.beneficiario && a.privilegio === b.privilegio && a.concedente === b.concedente;
}

function juntarColunas(atual: string[] | null, novas: string[] | null): string[] | null {
  if (atual === null || novas === null) return null;
  return [...new Set([...atual, ...novas])];
}

function conceder(lista: ListaPermissoesDTO, operacao: ConcederPrivilegiosDTO, ator: string): ObjetoComPermissoesDTO[] {
  const alvos = new Set(objetosDoAlvo(lista, operacao.alvo).map((objeto) => objeto.id));
  const colunas = operacao.colunas && operacao.colunas.length > 0 ? operacao.colunas : null;
  return lista.objetos.map((objeto) => {
    if (!alvos.has(objeto.id)) return objeto;
    const concedente = concedenteEfetivo(lista, ator, objeto);
    let concessoes = objeto.concessoes;
    for (const privilegio of operacao.privilegios) {
      if (!privilegiosDoTipo[objeto.tipo].includes(privilegio)) continue;
      const chave = { beneficiario: operacao.beneficiario, privilegio, concedente };
      const existente = concessoes.find((concessao) => mesmaConcessao(concessao, chave));
      concessoes = existente
        ? concessoes.map((concessao) =>
            concessao === existente
              ? {
                  ...concessao,
                  repassavel: concessao.repassavel || operacao.repassavel,
                  colunas: juntarColunas(concessao.colunas, colunas),
                }
              : concessao,
          )
        : [...concessoes, { ...chave, repassavel: operacao.repassavel, colunas }];
    }
    return { ...objeto, concessoes };
  });
}

function revogar(lista: ListaPermissoesDTO, operacao: RevogarPrivilegiosDTO, ator: string): ObjetoComPermissoesDTO[] {
  const alvos = new Set(objetosDoAlvo(lista, operacao.alvo).map((objeto) => objeto.id));
  return lista.objetos.map((objeto) => {
    if (!alvos.has(objeto.id)) return objeto;
    const concedentes = operacao.concedentes.length > 0 ? operacao.concedentes : [concedenteEfetivo(lista, ator, objeto)];
    const alcancada = (concessao: ConcessaoDTO) =>
      concessao.beneficiario === operacao.beneficiario &&
      operacao.privilegios.includes(concessao.privilegio) &&
      concedentes.includes(concessao.concedente);

    const concessoes = objeto.concessoes.flatMap((concessao): ConcessaoDTO[] => {
      if (operacao.cascata && concessao.concedente === operacao.beneficiario && operacao.privilegios.includes(concessao.privilegio)) {
        return [];
      }
      if (!alcancada(concessao)) return [concessao];
      if (operacao.soRepasse) return [{ ...concessao, repassavel: false }];
      if (operacao.colunas === null || operacao.colunas.length === 0) return [];
      if (concessao.colunas === null) return [concessao];
      const restantes = concessao.colunas.filter((coluna) => !operacao.colunas?.includes(coluna));
      return restantes.length === 0 ? [] : [{ ...concessao, colunas: restantes }];
    });
    return { ...objeto, concessoes };
  });
}

function mesmoPadrao(a: PrivilegioPadraoDTO, b: PrivilegioPadraoOperacaoDTO): boolean {
  return a.criador === b.criador && a.esquema === b.esquema && a.tipoDeObjeto === b.tipoDeObjeto && a.beneficiario === b.beneficiario;
}

function definirPadrao(padroes: PrivilegioPadraoDTO[], operacao: PrivilegioPadraoOperacaoDTO): PrivilegioPadraoDTO[] {
  const existente = padroes.find((padrao) => mesmoPadrao(padrao, operacao));
  if (operacao.acao === 'CONCEDER') {
    if (!existente) {
      const { criador, esquema, tipoDeObjeto, beneficiario, privilegios } = operacao;
      return [...padroes, { criador, esquema, tipoDeObjeto, beneficiario, privilegios: [...privilegios] }];
    }
    return padroes.map((padrao) =>
      padrao === existente ? { ...padrao, privilegios: [...new Set([...padrao.privilegios, ...operacao.privilegios])] } : padrao,
    );
  }
  if (!existente) return padroes;
  const privilegios = existente.privilegios.filter((privilegio) => !operacao.privilegios.includes(privilegio));
  return privilegios.length === 0
    ? padroes.filter((padrao) => padrao !== existente)
    : padroes.map((padrao) => (padrao === existente ? { ...padrao, privilegios } : padrao));
}

function renomearConcessao(concessao: ConcessaoDTO, de: string, para: string): ConcessaoDTO {
  return {
    ...concessao,
    beneficiario: concessao.beneficiario === de ? para : concessao.beneficiario,
    concedente: concessao.concedente === de ? para : concessao.concedente,
  };
}

function aplicarUmaAsPermissoes(lista: ListaPermissoesDTO, operacao: OperacaoDTO): ListaPermissoesDTO {
  const ator = lista.papelDaConexao;
  switch (operacao.tipo) {
    case 'CRIAR_PAPEL':
      return {
        ...lista,
        papeis: [
          ...lista.papeis,
          {
            nome: operacao.papel,
            descricao: null,
            login: operacao.atributos.login,
            superusuario: operacao.atributos.superusuario,
            membroDe: [],
          },
        ],
      };
    case 'ALTERAR_PAPEL':
      return {
        ...lista,
        papeis: lista.papeis.map((papel) =>
          papel.nome === operacao.papel
            ? {
                ...papel,
                login: operacao.atributos.login ?? papel.login,
                superusuario: operacao.atributos.superusuario ?? papel.superusuario,
              }
            : papel,
        ),
      };
    case 'DESCREVER_PAPEL':
      return {
        ...lista,
        papeis: lista.papeis.map((papel) => (papel.nome === operacao.papel ? { ...papel, descricao: operacao.descricao } : papel)),
      };
    case 'RENOMEAR_PAPEL': {
      const { papel: de, novoNome: para } = operacao;
      return {
        ...lista,
        papelDaConexao: lista.papelDaConexao === de ? para : lista.papelDaConexao,
        papeis: lista.papeis.map((papel) => ({
          ...papel,
          nome: papel.nome === de ? para : papel.nome,
          membroDe: renomearNaLista(papel.membroDe, de, para),
        })),
        objetos: lista.objetos.map((objeto) => ({
          ...objeto,
          dono: objeto.dono === de ? para : objeto.dono,
          concessoes: objeto.concessoes.map((concessao) => renomearConcessao(concessao, de, para)),
        })),
        privilegiosPadrao: lista.privilegiosPadrao.map((padrao) => ({
          ...padrao,
          criador: padrao.criador === de ? para : padrao.criador,
          beneficiario: padrao.beneficiario === de ? para : padrao.beneficiario,
        })),
      };
    }
    case 'EXCLUIR_PAPEL': {
      const { papel: nome, herdeiro, removerPermissoes } = operacao;
      const objetos = lista.objetos.map((objeto) => {
        if (!herdeiro || objeto.dono !== nome) return objeto;
        return {
          ...objeto,
          dono: herdeiro,
          concessoes: objeto.concessoes
            .filter((concessao) => concessao.beneficiario !== herdeiro || concessao.concedente !== nome)
            .map((concessao) => (concessao.concedente === nome ? { ...concessao, concedente: herdeiro } : concessao)),
        };
      });
      return {
        ...lista,
        papeis: lista.papeis
          .filter((papel) => papel.nome !== nome)
          .map((papel) => ({ ...papel, membroDe: semPapel(papel.membroDe, nome) })),
        objetos: removerPermissoes
          ? objetos.map((objeto) => ({
              ...objeto,
              concessoes: objeto.concessoes.filter(
                (concessao) => concessao.beneficiario !== nome && concessao.concedente !== nome,
              ),
            }))
          : objetos,
        privilegiosPadrao: removerPermissoes
          ? lista.privilegiosPadrao.filter((padrao) => padrao.criador !== nome && padrao.beneficiario !== nome)
          : lista.privilegiosPadrao.map((padrao) => (herdeiro && padrao.criador === nome ? { ...padrao, criador: herdeiro } : padrao)),
      };
    }
    case 'CONCEDER_PARTICIPACAO':
      return {
        ...lista,
        papeis: lista.papeis.map((papel) =>
          papel.nome === operacao.membro
            ? { ...papel, membroDe: comParticipacao(papel.membroDe, participacao(operacao, operacao.grupo)) }
            : papel,
        ),
      };
    case 'REVOGAR_PARTICIPACAO':
      return {
        ...lista,
        papeis: lista.papeis.map((papel) =>
          papel.nome === operacao.membro ? { ...papel, membroDe: semPapel(papel.membroDe, operacao.grupo) } : papel,
        ),
      };
    case 'CONCEDER':
      return { ...lista, objetos: conceder(lista, operacao, ator) };
    case 'REVOGAR':
      return { ...lista, objetos: revogar(lista, operacao, ator) };
    case 'PRIVILEGIO_PADRAO':
      return { ...lista, privilegiosPadrao: definirPadrao(lista.privilegiosPadrao, operacao) };
    case 'CONFIGURAR_PAPEL':
      return lista;
  }
}

export function aplicarAsPermissoes(lista: ListaPermissoesDTO, operacoes: OperacaoDTO[]): ListaPermissoesDTO {
  return operacoes.reduce(aplicarUmaAsPermissoes, lista);
}

export function donoDepois(operacoes: OperacaoDTO[]): (dono: string) => string {
  return (dono) =>
    operacoes.reduce((atual, operacao) => {
      if (operacao.tipo === 'RENOMEAR_PAPEL' && operacao.papel === atual) return operacao.novoNome;
      if (operacao.tipo === 'EXCLUIR_PAPEL' && operacao.papel === atual && operacao.herdeiro) return operacao.herdeiro;
      return atual;
    }, dono);
}

export function papelExiste(nome: string, papeis: { nome: string }[]): boolean {
  return nome === PUBLICO || papeis.some((papel) => papel.nome === nome);
}
