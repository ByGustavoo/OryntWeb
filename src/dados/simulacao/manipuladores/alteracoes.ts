import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { PROBLEMAS_ALTERACAO } from '@/modelos/alteracoes';
import type {
  AlteracaoDTO,
  AlvoDaConcessaoDTO,
  AtributosDoPapelDTO,
  ListaAlteracoesDTO,
  OperacaoDTO,
  OrigemDaAlteracao,
  PedidoAlteracaoDTO,
  ProblemaAlteracao,
  SenhaDaOperacaoDTO,
} from '@/modelos/alteracoes';
import type { ConexaoDTO } from '@/modelos/conexao';
import type { ListaPapeisDTO } from '@/modelos/papeis';
import type { ListaPermissoesDTO, Privilegio, TipoObjetoPermissao, TipoPrivilegioPadrao } from '@/modelos/permissoes';
import { aplicarAosPapeis, aplicarAsPermissoes, objetosDoAlvo } from '@/regras/aplicacaoAlteracoes';
import {
  motivoDoAtributo,
  podeAdministrarPapel,
  podeConcederNoObjeto,
  podeCriarPapeis,
  podeDefinirPadrao,
  podeEncerrarSessoes,
  podeExcluirPapel,
  podeMudarParticipacao,
  podeReatribuirObjetos,
  podeRenomearPapel,
  podeRevogarConcessoes,
} from '@/regras/capacidadeAlteracoes';
import type { ContextoDaCapacidade } from '@/regras/capacidadeAlteracoes';
import { validarNomeDoPapel } from '@/regras/formularioPapel';
import { lerNomeDoPapel } from '@/regras/papeis';
import { indexarPermissoes, PUBLICO, tiposObjetoPermissao } from '@/regras/permissoes';
import { comandosDasOperacoes, ocultarSenhas } from '@/regras/sqlAlteracoes';
import { tituloDaAlteracao } from '@/regras/descricaoAlteracoes';
import { registrarEvento } from '../auditoriaSimulada';
import type { ContextoSimulado } from '../autorizacaoSimulada';
import { autorDaConta } from '../contasSimuladas';
import {
  alteracoesDaConexao,
  marcarDesfeita,
  papeisComAlteracoes,
  permissoesComAlteracoes,
  recusaConfigurada,
  registrarAlteracao,
} from '../alteracoesSimuladas';
import { dadosVazios } from '../controles';
import { gerarPapeis } from '../papeis';
import { gerarPermissoes } from '../permissoes';
import { criado, dadosInvalidos, naoAutorizado, ok, problema } from '../resposta';
import { lerSessaoSimulada } from '../sessaoSimulada';

interface Estado {
  papeis: ListaPapeisDTO;
  permissoes: ListaPermissoesDTO;
}

interface Recusa {
  problema: ProblemaAlteracao;
  codigo: string;
  mensagem: string;
}

const codigoDoProblema: Record<ProblemaAlteracao, string> = {
  permissaoNegada: '42501',
  dependencias: '2BP01',
  duplicado: '42710',
  inexistente: '42704',
  participacaoInvalida: '0LP01',
  emUso: '55006',
  recusado: 'XX000',
};

const tituloDoProblema: Record<ProblemaAlteracao, string> = {
  permissaoNegada: 'Permissão negada pelo banco!',
  dependencias: 'Há objetos que dependem do papel!',
  duplicado: 'O papel já existe!',
  inexistente: 'O papel ou o objeto não existe!',
  participacaoInvalida: 'Participação inválida!',
  emUso: 'O papel está em uso!',
  recusado: 'Comando recusado pelo banco!',
};

const origens: OrigemDaAlteracao[] = ['FORMULARIO', 'MODELO', 'PONTO_DE_ATENCAO', 'LOTE', 'DESFAZER', 'DETALHE'];
const privilegiosValidos = new Set<Privilegio>([
  'CONNECT',
  'CREATE',
  'TEMPORARY',
  'USAGE',
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'TRUNCATE',
  'REFERENCES',
  'TRIGGER',
  'MAINTAIN',
  'EXECUTE',
]);
const tiposDePadrao: TipoPrivilegioPadrao[] = ['TABELAS', 'SEQUENCIAS', 'FUNCOES'];
const chavesDosAtributos: (keyof AtributosDoPapelDTO)[] = [
  'login',
  'superusuario',
  'criaBancos',
  'criaPapeis',
  'replicacao',
  'ignoraRls',
  'herda',
];
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const PARAMETRO = /^[a-z_][a-z0-9_.]*$/;

function recusa(problemaDaRecusa: ProblemaAlteracao, mensagem: string): Recusa {
  return { problema: problemaDaRecusa, codigo: codigoDoProblema[problemaDaRecusa], mensagem };
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>) : null;
}

function nome(valor: unknown): string | null {
  return lerNomeDoPapel(valor);
}

function beneficiario(valor: unknown): string | null {
  return valor === PUBLICO ? PUBLICO : lerNomeDoPapel(valor);
}

function booleano(valor: unknown): valor is boolean {
  return typeof valor === 'boolean';
}

function privilegios(valor: unknown): Privilegio[] | null {
  if (!Array.isArray(valor) || valor.length === 0) return null;
  return valor.every((item) => privilegiosValidos.has(item as Privilegio)) ? (valor as Privilegio[]) : null;
}

function colunas(valor: unknown): string[] | null | undefined {
  if (valor === null) return null;
  if (!Array.isArray(valor) || !valor.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 63)) return undefined;
  return valor as string[];
}

function senha(valor: unknown): SenhaDaOperacaoDTO | null | undefined {
  if (valor === null) return null;
  const bruto = objeto(valor);
  if (!bruto) return undefined;
  if (bruto.tipo === 'NENHUMA') return { tipo: 'NENHUMA' };
  if (bruto.tipo === 'VERIFICADOR' && typeof bruto.valor === 'string' && bruto.valor.startsWith('SCRAM-SHA-256$')) {
    return { tipo: 'VERIFICADOR', valor: bruto.valor };
  }
  return undefined;
}

function validade(valor: unknown): string | null | undefined {
  if (valor === null) return null;
  return typeof valor === 'string' && DATA.test(valor) ? valor : undefined;
}

function limite(valor: unknown): number | null | undefined {
  if (valor === null) return null;
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= 10_000 ? valor : undefined;
}

function alvo(valor: unknown): AlvoDaConcessaoDTO | null {
  const bruto = objeto(valor);
  if (!bruto) return null;
  if (bruto.tipo === 'TODOS_DO_ESQUEMA') {
    const esquema = typeof bruto.esquema === 'string' ? bruto.esquema : null;
    const tipoDeObjeto = tiposDePadrao.find((tipo) => tipo === bruto.tipoDeObjeto);
    return esquema && tipoDeObjeto ? { tipo: 'TODOS_DO_ESQUEMA', esquema, tipoDeObjeto } : null;
  }
  const referencia = objeto(bruto.objeto);
  if (bruto.tipo !== 'OBJETO' || !referencia) return null;
  const tipo = tiposObjetoPermissao.find((candidato) => candidato === referencia.tipo) as TipoObjetoPermissao | undefined;
  if (typeof referencia.id !== 'string' || typeof referencia.nome !== 'string' || !tipo) return null;
  const esquema = referencia.esquema === null || typeof referencia.esquema === 'string' ? referencia.esquema : undefined;
  if (esquema === undefined) return null;
  return { tipo: 'OBJETO', objeto: { id: referencia.id, tipo, esquema, nome: referencia.nome } };
}

function atributos(valor: unknown, completos: boolean): Partial<AtributosDoPapelDTO> | null {
  const bruto = objeto(valor);
  if (!bruto) return null;
  const lidos: Partial<AtributosDoPapelDTO> = {};
  for (const chave of chavesDosAtributos) {
    if (bruto[chave] === undefined) {
      if (completos) return null;
      continue;
    }
    if (!booleano(bruto[chave])) return null;
    lidos[chave] = bruto[chave] as boolean;
  }
  return lidos;
}

export function lerOperacao(valor: unknown): OperacaoDTO | null {
  const bruto = objeto(valor);
  if (!bruto) return null;
  switch (bruto.tipo) {
    case 'CRIAR_PAPEL': {
      const papel = nome(bruto.papel);
      const lidos = atributos(bruto.atributos, true);
      const limiteLido = limite(bruto.limiteConexoes);
      const validadeLida = validade(bruto.validadeSenha);
      const senhaLida = senha(bruto.senha);
      if (!papel || !lidos || limiteLido === undefined || validadeLida === undefined || senhaLida === undefined) return null;
      return {
        tipo: 'CRIAR_PAPEL',
        papel,
        atributos: lidos as AtributosDoPapelDTO,
        limiteConexoes: limiteLido,
        validadeSenha: validadeLida,
        senha: senhaLida,
      };
    }
    case 'ALTERAR_PAPEL': {
      const papel = nome(bruto.papel);
      const lidos = atributos(bruto.atributos, false);
      if (!papel || !lidos) return null;
      const operacao: Extract<OperacaoDTO, { tipo: 'ALTERAR_PAPEL' }> = { tipo: 'ALTERAR_PAPEL', papel, atributos: lidos };
      if (bruto.limiteConexoes !== undefined) {
        const lido = limite(bruto.limiteConexoes);
        if (lido === undefined) return null;
        operacao.limiteConexoes = lido;
      }
      if (bruto.validadeSenha !== undefined) {
        const lida = validade(bruto.validadeSenha);
        if (lida === undefined) return null;
        operacao.validadeSenha = lida;
      }
      if (bruto.senha !== undefined) {
        const lida = senha(bruto.senha);
        if (!lida) return null;
        operacao.senha = lida;
      }
      return operacao;
    }
    case 'RENOMEAR_PAPEL': {
      const papel = nome(bruto.papel);
      const novoNome = nome(bruto.novoNome);
      return papel && novoNome ? { tipo: 'RENOMEAR_PAPEL', papel, novoNome } : null;
    }
    case 'DESCREVER_PAPEL': {
      const papel = nome(bruto.papel);
      const descricao = bruto.descricao === null ? null : typeof bruto.descricao === 'string' ? bruto.descricao.slice(0, 1000) : undefined;
      return papel && descricao !== undefined ? { tipo: 'DESCREVER_PAPEL', papel, descricao } : null;
    }
    case 'CONFIGURAR_PAPEL': {
      const papel = nome(bruto.papel);
      const parametro = typeof bruto.parametro === 'string' && PARAMETRO.test(bruto.parametro) ? bruto.parametro : null;
      const valorLido = bruto.valor === null ? null : typeof bruto.valor === 'string' && bruto.valor.trim() ? bruto.valor : undefined;
      return papel && parametro && valorLido !== undefined ? { tipo: 'CONFIGURAR_PAPEL', papel, parametro, valor: valorLido } : null;
    }
    case 'EXCLUIR_PAPEL': {
      const papel = nome(bruto.papel);
      const herdeiro = bruto.herdeiro === null ? null : nome(bruto.herdeiro);
      if (!papel || (bruto.herdeiro !== null && !herdeiro) || !booleano(bruto.removerPermissoes) || !booleano(bruto.encerrarSessoes)) {
        return null;
      }
      return { tipo: 'EXCLUIR_PAPEL', papel, herdeiro, removerPermissoes: bruto.removerPermissoes, encerrarSessoes: bruto.encerrarSessoes };
    }
    case 'CONCEDER_PARTICIPACAO': {
      const grupo = nome(bruto.grupo);
      const membro = nome(bruto.membro);
      if (!grupo || !membro || !booleano(bruto.herda) || !booleano(bruto.assume) || !booleano(bruto.administra)) return null;
      return { tipo: 'CONCEDER_PARTICIPACAO', grupo, membro, herda: bruto.herda, assume: bruto.assume, administra: bruto.administra };
    }
    case 'REVOGAR_PARTICIPACAO': {
      const grupo = nome(bruto.grupo);
      const membro = nome(bruto.membro);
      return grupo && membro ? { tipo: 'REVOGAR_PARTICIPACAO', grupo, membro } : null;
    }
    case 'CONCEDER': {
      const alvoLido = alvo(bruto.alvo);
      const quem = beneficiario(bruto.beneficiario);
      const lidos = privilegios(bruto.privilegios);
      const colunasLidas = colunas(bruto.colunas);
      if (!alvoLido || !quem || !lidos || colunasLidas === undefined || !booleano(bruto.repassavel)) return null;
      return { tipo: 'CONCEDER', alvo: alvoLido, beneficiario: quem, privilegios: lidos, colunas: colunasLidas, repassavel: bruto.repassavel };
    }
    case 'REVOGAR': {
      const alvoLido = alvo(bruto.alvo);
      const quem = beneficiario(bruto.beneficiario);
      const lidos = privilegios(bruto.privilegios);
      const colunasLidas = colunas(bruto.colunas);
      const concedentes = Array.isArray(bruto.concedentes) ? bruto.concedentes.map(nome) : null;
      if (
        !alvoLido ||
        !quem ||
        !lidos ||
        colunasLidas === undefined ||
        !concedentes ||
        concedentes.some((item) => item === null) ||
        !booleano(bruto.soRepasse) ||
        !booleano(bruto.cascata)
      ) {
        return null;
      }
      return {
        tipo: 'REVOGAR',
        alvo: alvoLido,
        beneficiario: quem,
        privilegios: lidos,
        colunas: colunasLidas,
        soRepasse: bruto.soRepasse,
        concedentes: concedentes as string[],
        cascata: bruto.cascata,
      };
    }
    case 'PRIVILEGIO_PADRAO': {
      const criador = nome(bruto.criador);
      const quem = beneficiario(bruto.beneficiario);
      const lidos = privilegios(bruto.privilegios);
      const tipoDeObjeto = tiposDePadrao.find((tipo) => tipo === bruto.tipoDeObjeto);
      const esquema = bruto.esquema === null ? null : typeof bruto.esquema === 'string' ? bruto.esquema : undefined;
      if (!criador || !quem || !lidos || !tipoDeObjeto || esquema === undefined) return null;
      if (bruto.acao !== 'CONCEDER' && bruto.acao !== 'REVOGAR') return null;
      return { tipo: 'PRIVILEGIO_PADRAO', acao: bruto.acao, criador, esquema, tipoDeObjeto, beneficiario: quem, privilegios: lidos };
    }
    default:
      return null;
  }
}

function lerPedido(corpo: unknown): PedidoAlteracaoDTO | null {
  const bruto = objeto(corpo);
  if (!bruto || !Array.isArray(bruto.operacoes) || bruto.operacoes.length === 0 || bruto.operacoes.length > 200) return null;
  const operacoes = bruto.operacoes.map(lerOperacao);
  if (operacoes.some((operacao) => operacao === null)) return null;
  const inversas = bruto.inversas === null ? null : Array.isArray(bruto.inversas) ? bruto.inversas.map(lerOperacao) : undefined;
  if (inversas === undefined || (inversas && inversas.some((operacao) => operacao === null))) return null;
  const origem = origens.find((item) => item === bruto.origem);
  const desfaz = bruto.desfaz === null ? null : typeof bruto.desfaz === 'string' ? bruto.desfaz : undefined;
  if (!origem || desfaz === undefined) return null;
  return { operacoes: operacoes as OperacaoDTO[], inversas: inversas as OperacaoDTO[] | null, desfaz, origem };
}

function estadoAtual(agora: Date, sessao: ConexaoDTO): Estado {
  return {
    papeis: papeisComAlteracoes(gerarPapeis(agora, sessao.usuario, dadosVazios()), sessao.id, agora),
    permissoes: permissoesComAlteracoes(gerarPermissoes(agora, sessao, dadosVazios()), sessao.id),
  };
}

function contexto(estado: Estado): ContextoDaCapacidade {
  return { ator: estado.papeis.papelDaConexao, papeis: estado.papeis.papeis };
}

function existe(estado: Estado, papel: string): boolean {
  return estado.papeis.papeis.some((candidato) => candidato.nome === papel);
}

function semPapel(papel: string): Recusa {
  return recusa('inexistente', `role "${papel}" does not exist`);
}

function negada(motivo: string | null, padrao: string): Recusa {
  return recusa('permissaoNegada', motivo ? `${padrao}: ${motivo}` : padrao);
}

function participa(estado: Estado, origem: string, alvoDaBusca: string): boolean {
  const porNome = new Map(estado.papeis.papeis.map((papel) => [papel.nome, papel]));
  const visitados = new Set<string>();
  const fila = [origem];
  for (let atual = fila.shift(); atual !== undefined; atual = fila.shift()) {
    if (atual === alvoDaBusca) return true;
    if (visitados.has(atual)) continue;
    visitados.add(atual);
    fila.push(...(porNome.get(atual)?.membroDe.map((item) => item.papel) ?? []));
  }
  return false;
}

function recusaDaOperacao(operacao: OperacaoDTO, estado: Estado): Recusa | null {
  const capacidade = contexto(estado);
  const ator = capacidade.ator;
  switch (operacao.tipo) {
    case 'CRIAR_PAPEL': {
      if (existe(estado, operacao.papel)) return recusa('duplicado', `role "${operacao.papel}" already exists`);
      const invalido = validarNomeDoPapel(operacao.papel, [], null);
      if (invalido) return recusa('recusado', `invalid role name "${operacao.papel}"`);
      const criar = podeCriarPapeis(capacidade);
      if (!criar.permitido) return negada(criar.motivo, 'permission denied to create role');
      for (const chave of chavesDosAtributos) {
        const ligado = operacao.atributos[chave];
        if (chave === 'login' || chave === 'herda' || !ligado) continue;
        const motivo = motivoDoAtributo(capacidade, chave);
        if (motivo) return negada(motivo, 'permission denied to create role');
      }
      return null;
    }
    case 'ALTERAR_PAPEL': {
      if (!existe(estado, operacao.papel)) return semPapel(operacao.papel);
      const soSenha = Object.keys(operacao.atributos).length === 0 && operacao.limiteConexoes === undefined && operacao.validadeSenha === undefined;
      if (soSenha && operacao.papel === ator) return null;
      const alterar = podeAdministrarPapel(capacidade, operacao.papel);
      if (!alterar.permitido) return negada(alterar.motivo, `permission denied to alter role "${operacao.papel}"`);
      for (const chave of chavesDosAtributos) {
        if (operacao.atributos[chave] === undefined || chave === 'login' || chave === 'herda') continue;
        const motivo = motivoDoAtributo(capacidade, chave);
        if (motivo) return negada(motivo, `permission denied to alter role "${operacao.papel}"`);
      }
      return null;
    }
    case 'RENOMEAR_PAPEL': {
      if (!existe(estado, operacao.papel)) return semPapel(operacao.papel);
      if (operacao.papel === ator) return recusa('emUso', 'session user cannot be renamed');
      if (existe(estado, operacao.novoNome)) return recusa('duplicado', `role "${operacao.novoNome}" already exists`);
      const renomear = podeRenomearPapel(capacidade, operacao.papel);
      return renomear.permitido ? null : negada(renomear.motivo, `permission denied to rename role "${operacao.papel}"`);
    }
    case 'DESCREVER_PAPEL':
    case 'CONFIGURAR_PAPEL': {
      if (!existe(estado, operacao.papel)) return semPapel(operacao.papel);
      const alterar = podeAdministrarPapel(capacidade, operacao.papel);
      return alterar.permitido ? null : negada(alterar.motivo, `permission denied to alter role "${operacao.papel}"`);
    }
    case 'EXCLUIR_PAPEL': {
      const papel = estado.papeis.papeis.find((candidato) => candidato.nome === operacao.papel);
      if (!papel) return semPapel(operacao.papel);
      if (operacao.papel === ator) return recusa('emUso', 'current user cannot be dropped');
      if (papel.inicial) return recusa('dependencias', `cannot drop role ${operacao.papel} because it is required by the database system`);
      const excluir = podeExcluirPapel(capacidade, operacao.papel);
      if (!excluir.permitido) return negada(excluir.motivo, `permission denied to drop role "${operacao.papel}"`);
      if (papel.objetos.length > 0 && !operacao.herdeiro) {
        return recusa('dependencias', `role "${operacao.papel}" cannot be dropped because some objects depend on it`);
      }
      if (operacao.herdeiro) {
        if (!existe(estado, operacao.herdeiro)) return semPapel(operacao.herdeiro);
        const reatribuir = podeReatribuirObjetos(capacidade, operacao.papel, operacao.herdeiro);
        if (!reatribuir.permitido) return negada(reatribuir.motivo, 'permission denied to reassign objects');
      }
      const referenciado =
        estado.permissoes.objetos.some((item) =>
          item.concessoes.some((concessao) => concessao.beneficiario === operacao.papel || concessao.concedente === operacao.papel),
        ) || estado.permissoes.privilegiosPadrao.some((padrao) => padrao.criador === operacao.papel || padrao.beneficiario === operacao.papel);
      if (referenciado && !operacao.removerPermissoes) {
        return recusa('dependencias', `role "${operacao.papel}" cannot be dropped because some objects depend on it`);
      }
      if (operacao.encerrarSessoes) {
        const encerrar = podeEncerrarSessoes(capacidade, operacao.papel);
        if (!encerrar.permitido) return negada(encerrar.motivo, 'permission denied to terminate process');
      }
      return null;
    }
    case 'CONCEDER_PARTICIPACAO': {
      if (!existe(estado, operacao.grupo)) return semPapel(operacao.grupo);
      if (!existe(estado, operacao.membro)) return semPapel(operacao.membro);
      if (operacao.grupo === operacao.membro || participa(estado, operacao.grupo, operacao.membro)) {
        return recusa('participacaoInvalida', `role "${operacao.grupo}" is a member of role "${operacao.membro}"`);
      }
      const mudar = podeMudarParticipacao(capacidade, operacao.grupo);
      return mudar.permitido ? null : negada(mudar.motivo, `permission denied to grant role "${operacao.grupo}"`);
    }
    case 'REVOGAR_PARTICIPACAO': {
      if (!existe(estado, operacao.grupo)) return semPapel(operacao.grupo);
      if (!existe(estado, operacao.membro)) return semPapel(operacao.membro);
      const mudar = podeMudarParticipacao(capacidade, operacao.grupo);
      return mudar.permitido ? null : negada(mudar.motivo, `permission denied to revoke role "${operacao.grupo}"`);
    }
    case 'CONCEDER':
    case 'REVOGAR': {
      if (operacao.beneficiario !== PUBLICO && !existe(estado, operacao.beneficiario)) return semPapel(operacao.beneficiario);
      const objetos = objetosDoAlvo(estado.permissoes, operacao.alvo);
      if (operacao.alvo.tipo === 'OBJETO' && objetos.length === 0) {
        return recusa('inexistente', `object "${operacao.alvo.objeto.nome}" does not exist`);
      }
      const { alvo: alvoDoComando } = operacao;
      if (
        alvoDoComando.tipo === 'TODOS_DO_ESQUEMA' &&
        !estado.permissoes.objetos.some((item) => item.tipo === 'ESQUEMA' && item.nome === alvoDoComando.esquema)
      ) {
        return recusa('inexistente', `schema "${alvoDoComando.esquema}" does not exist`);
      }
      const indice = indexarPermissoes(estado.permissoes);
      if (operacao.tipo === 'CONCEDER') {
        for (const concedido of objetos) {
          const conceder = podeConcederNoObjeto(indice, concedido, operacao.privilegios);
          if (!conceder.permitido) return negada(conceder.motivo, `no privileges were granted for "${concedido.nome}"`);
        }
        return null;
      }
      const revogar = podeRevogarConcessoes(indice, operacao.concedentes);
      return revogar.permitido ? null : negada(revogar.motivo, 'permission denied to revoke privileges');
    }
    case 'PRIVILEGIO_PADRAO': {
      if (!existe(estado, operacao.criador)) return semPapel(operacao.criador);
      if (operacao.beneficiario !== PUBLICO && !existe(estado, operacao.beneficiario)) return semPapel(operacao.beneficiario);
      const definir = podeDefinirPadrao(indexarPermissoes(estado.permissoes), operacao.criador);
      return definir.permitido ? null : negada(definir.motivo, `permission denied to change default privileges of "${operacao.criador}"`);
    }
  }
}

function avaliar(operacoes: OperacaoDTO[], estado: Estado): Recusa | null {
  let atual = estado;
  for (const operacao of operacoes) {
    const encontrada = recusaDaOperacao(operacao, atual);
    if (encontrada) return encontrada;
    atual = {
      papeis: aplicarAosPapeis(atual.papeis, [operacao]),
      permissoes: aplicarAsPermissoes(atual.permissoes, [operacao]),
    };
  }
  return null;
}

export function listarAlteracoes(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const sessao = lerSessaoSimulada();
  if (!sessao) return naoAutorizado();
  const lista: ListaAlteracoesDTO = {
    geradoEm: agora.toISOString(),
    papelDaConexao: sessao.usuario,
    alteracoes: dadosVazios() ? [] : [...alteracoesDaConexao(sessao.id)].sort((a, b) => b.feitaEm.localeCompare(a.feitaEm)),
  };
  return ok(lista);
}

export function aplicarAlteracao(
  requisicao: RequisicaoTransporte,
  agora: Date,
  _parametros: Record<string, string> = {},
  { conta: contaDaSessao }: ContextoSimulado = { conta: null },
): RespostaTransporte {
  const sessao = lerSessaoSimulada();
  if (!sessao) return naoAutorizado();
  const pedido = lerPedido(requisicao.corpo);
  if (!pedido) return dadosInvalidos([{ campo: 'operacoes', mensagem: 'As operações não estão no formato do contrato.' }]);

  if (pedido.desfaz !== null) {
    const alvoDoDesfazer = alteracoesDaConexao(sessao.id).find((alteracao) => alteracao.id === pedido.desfaz);
    if (!alvoDoDesfazer || alvoDoDesfazer.resultado !== 'APLICADA' || alvoDoDesfazer.desfeitaPor !== null) {
      return problema(409, 'Alteração já desfeita!', '/problems/conflict', 'Essa alteração não existe mais ou já foi desfeita.');
    }
  }

  const operacoes = ocultarSenhas(pedido.operacoes);
  const estado = estadoAtual(agora, sessao);
  const encontrada = recusaConfigurada()
    ? recusa('permissaoNegada', `permission denied: the simulated role "${estado.papeis.papelDaConexao}" cannot change roles`)
    : avaliar(pedido.operacoes, estado);

  const alteracao: AlteracaoDTO = {
    id: crypto.randomUUID(),
    feitaEm: agora.toISOString(),
    conta: contaDaSessao?.email ?? '',
    papelDaConexao: estado.papeis.papelDaConexao,
    banco: sessao.banco,
    origem: pedido.origem,
    operacoes,
    comandos: comandosDasOperacoes(operacoes),
    resultado: encontrada ? 'RECUSADA' : 'APLICADA',
    falha: encontrada ? { codigo: encontrada.codigo, mensagem: encontrada.mensagem } : null,
    inversas: encontrada ? null : pedido.inversas,
    desfaz: pedido.desfaz,
    desfeitaPor: null,
  };
  registrarAlteracao(sessao.id, alteracao);
  if (contaDaSessao) {
    registrarEvento(
      {
        tipo: 'BANCO_ALTERADO',
        resultado: encontrada ? 'FALHA' : 'SUCESSO',
        conta: autorDaConta(contaDaSessao),
        alvo: { tipo: 'ALTERACAO', id: alteracao.id, rotulo: tituloDaAlteracao(operacoes, 'PASSADO') },
        motivo: encontrada ? encontrada.mensagem : `Banco ${sessao.banco}, como ${estado.papeis.papelDaConexao}.`,
      },
      agora,
    );
  }

  if (encontrada) {
    return problema(422, tituloDoProblema[encontrada.problema], PROBLEMAS_ALTERACAO[encontrada.problema], encontrada.mensagem);
  }
  if (pedido.desfaz !== null) marcarDesfeita(sessao.id, pedido.desfaz, alteracao.id);
  return criado(alteracao);
}
