import type { AtributosDoPapelDTO, OperacaoDTO } from '@/modelos/alteracoes';
import type { ListaPapeisDTO, PapelDTO } from '@/modelos/papeis';
import type { ListaPermissoesDTO, Privilegio } from '@/modelos/permissoes';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { aplicarAosPapeis, aplicarAsPermissoes, objetosDoAlvo } from './aplicacaoAlteracoes';
import { papeisDaAlteracao } from './descricaoAlteracoes';
import { formatarData, participacoesComSetRole, rotuloAtributo } from './papeis';
import {
  acessoDe,
  fraseDaOrigem,
  indexarPermissoes,
  nomeCompleto,
  privilegiosDoTipo,
  PUBLICO,
} from './permissoes';
import type { IndiceDasPermissoes } from './permissoes';

export type TomDoEfeito = 'GANHA' | 'PERDE' | 'MANTEM' | 'NEUTRO';

export interface LinhaDoEfeito {
  chave: string;
  tom: TomDoEfeito;
  texto: string;
}

export interface AvisoDoEfeito {
  tom: 'aviso' | 'erro' | 'info';
  texto: string;
}

export interface EfeitoDaAlteracao {
  linhas: LinhaDoEfeito[];
  avisos: AvisoDoEfeito[];
}

export interface EstadoParaEfeito {
  papeis: ListaPapeisDTO | null;
  permissoes: ListaPermissoesDTO | null;
}

const NOMES_NA_FRASE = 3;

const efeitoDoAtributoLigado: Record<keyof AtributosDoPapelDTO, string> = {
  login: 'passa a fazer login',
  superusuario: 'passa a ser superusuário: pode tudo no servidor, sem depender de nenhuma permissão',
  criaBancos: 'passa a criar bancos',
  criaPapeis: 'passa a criar, alterar e excluir os papéis que administra',
  replicacao: 'passa a abrir conexões de replicação',
  ignoraRls: 'passa a ignorar as políticas de segurança por linha',
  herda: 'volta a herdar as permissões dos grupos de que participa',
};

const efeitoDoAtributoDesligado: Record<keyof AtributosDoPapelDTO, string> = {
  login: 'deixa de fazer login',
  superusuario: 'deixa de ser superusuário: passa a depender das permissões que tem',
  criaBancos: 'deixa de criar bancos',
  criaPapeis: 'deixa de criar e administrar papéis',
  replicacao: 'deixa de abrir conexões de replicação',
  ignoraRls: 'deixa de ignorar as políticas de segurança por linha',
  herda: 'deixa de herdar as permissões dos grupos: elas passam a valer só depois de SET ROLE',
};

const ordemDosAtributos: (keyof AtributosDoPapelDTO)[] = [
  'login',
  'superusuario',
  'criaBancos',
  'criaPapeis',
  'replicacao',
  'ignoraRls',
  'herda',
];

export function listarNomes(nomes: string[]): string {
  const visiveis = nomes.slice(0, NOMES_NA_FRASE);
  const restantes = nomes.length - visiveis.length;
  if (restantes > 0) return `${visiveis.join(', ')} e mais ${formatarNumero(restantes)}`;
  if (visiveis.length <= 1) return visiveis[0] ?? '';
  return `${visiveis.slice(0, -1).join(', ')} e ${visiveis.at(-1) ?? ''}`;
}

function textoDoLimite(limite: number | null): string {
  return limite === null ? 'sem limite' : `${formatarNumero(limite)} ${pluralizar(limite, 'conexão', 'conexões')}`;
}

function textoDaValidade(validade: string | null): string {
  return validade === null ? 'sem validade' : `até ${formatarData(validade)}`;
}

function valorDaConfiguracao(papel: PapelDTO, parametro: string): string | null {
  const encontrada = papel.configuracoes.find((configuracao) => configuracao.split('=')[0] === parametro);
  return encontrada ? encontrada.slice(parametro.length + 1) : null;
}

function efeitosDoPapel(antes: PapelDTO, depois: PapelDTO | undefined, papeisDepois: PapelDTO[]): LinhaDoEfeito[] {
  if (!depois) return [];
  const linhas: LinhaDoEfeito[] = [];
  const nome = depois.nome;
  const adicionar = (chave: string, tom: TomDoEfeito, texto: string) => linhas.push({ chave: `${nome}-${chave}`, tom, texto });

  if (antes.nome !== depois.nome) {
    adicionar(
      'nome',
      'NEUTRO',
      `${antes.nome} passa a se chamar ${depois.nome}. Aplicações, scripts e regras do pg_hba.conf que citam o nome antigo deixam de achá-lo.`,
    );
  }
  for (const atributo of ordemDosAtributos) {
    if (antes[atributo] === depois[atributo]) continue;
    const texto = depois[atributo] ? efeitoDoAtributoLigado[atributo] : efeitoDoAtributoDesligado[atributo];
    const sessoes =
      atributo === 'login' && !depois.login && antes.sessoes > 0
        ? `; ${pluralizar(antes.sessoes, 'a sessão aberta continua', `as ${formatarNumero(antes.sessoes)} sessões abertas continuam`)} até desconectar`
        : '';
    adicionar(atributo, depois[atributo] ? 'GANHA' : 'PERDE', `${nome} ${texto}${sessoes}.`);
  }
  if (antes.limiteConexoes !== depois.limiteConexoes) {
    adicionar(
      'limite',
      'NEUTRO',
      `O limite de ${nome} passa de ${textoDoLimite(antes.limiteConexoes)} para ${textoDoLimite(depois.limiteConexoes)}.`,
    );
  }
  if (antes.validadeSenha !== depois.validadeSenha) {
    adicionar('validade', 'NEUTRO', `A senha de ${nome} passa a valer ${textoDaValidade(depois.validadeSenha)}.`);
  }
  if (antes.metodoSenha !== depois.metodoSenha && depois.login) {
    if (depois.metodoSenha === 'SEM_SENHA') {
      adicionar(
        'senha',
        antes.metodoSenha === 'MD5' && antes.nome !== depois.nome ? 'PERDE' : 'NEUTRO',
        antes.metodoSenha === 'MD5' && antes.nome !== depois.nome
          ? `A senha em MD5 de ${nome} é apagada, porque o MD5 usa o nome como sal: defina outra para ele voltar a entrar com senha.`
          : `${nome} fica sem senha: só entra pelos métodos do pg_hba.conf que não pedem senha.`,
      );
    } else if (depois.metodoSenha === 'SCRAM') {
      adicionar('senha', 'NEUTRO', `A senha de ${nome} passa a ser guardada em SCRAM-SHA-256.`);
    }
  }
  if (antes.descricao !== depois.descricao) {
    adicionar(
      'descricao',
      'NEUTRO',
      depois.descricao === null ? `${nome} fica sem descrição.` : `A descrição de ${nome} passa a ser “${depois.descricao}”.`,
    );
  }
  const parametros = new Set([...antes.configuracoes, ...depois.configuracoes].map((item) => item.split('=')[0] ?? ''));
  for (const parametro of parametros) {
    const anterior = valorDaConfiguracao(antes, parametro);
    const novo = valorDaConfiguracao(depois, parametro);
    if (anterior === novo) continue;
    const texto =
      novo === null
        ? `${nome} deixa de ter ${parametro} próprio e volta ao valor do banco e do servidor`
        : anterior === null
          ? `${nome} passa a ter ${parametro} = ${novo}`
          : `${parametro} de ${nome} passa de ${anterior} para ${novo}`;
    adicionar(`configuracao-${parametro}`, 'NEUTRO', `${texto}, a partir das próximas sessões.`);
  }

  const atributosAntes = new Set(participacoesComSetRole(antes, papeisDepois).map((item) => item.atributo));
  for (const item of participacoesComSetRole(depois, papeisDepois)) {
    if (atributosAntes.has(item.atributo)) continue;
    adicionar(
      `assume-${item.atributo}`,
      item.atributo === 'SUPERUSUARIO' ? 'PERDE' : 'GANHA',
      `${nome} ganha ${rotuloAtributo[item.atributo].toLowerCase()} quando faz SET ROLE ${item.caminho.at(-1) ?? ''}.`,
    );
  }
  return linhas;
}

function efeitosDosPapeis(antes: ListaPapeisDTO, depois: ListaPapeisDTO, operacoes: OperacaoDTO[]): LinhaDoEfeito[] {
  const linhas: LinhaDoEfeito[] = [];
  const renomeado = (nome: string) =>
    operacoes.reduce((atual, operacao) => (operacao.tipo === 'RENOMEAR_PAPEL' && operacao.papel === atual ? operacao.novoNome : atual), nome);

  for (const operacao of operacoes) {
    if (operacao.tipo === 'CRIAR_PAPEL') {
      const novo = depois.papeis.find((papel) => papel.nome === operacao.papel);
      if (!novo) continue;
      const partes = [
        novo.login ? 'faz login' : 'não faz login',
        novo.login
          ? novo.limiteConexoes === null
            ? 'sem limite de conexões'
            : `até ${formatarNumero(novo.limiteConexoes)} ${pluralizar(novo.limiteConexoes, 'conexão', 'conexões')}`
          : null,
        novo.login ? (novo.metodoSenha === 'SCRAM' ? 'com senha em SCRAM-SHA-256' : 'sem senha') : null,
        novo.login && novo.validadeSenha ? `que vale ${textoDaValidade(novo.validadeSenha)}` : null,
      ].filter(Boolean);
      linhas.push({
        chave: `criar-${novo.nome}`,
        tom: 'GANHA',
        texto: `${novo.nome} passa a existir como ${novo.login ? 'usuário' : 'grupo'}: ${partes.join(', ')}. Começa só com o que PUBLIC dá a todos.`,
      });
    }
    if (operacao.tipo === 'EXCLUIR_PAPEL') {
      const excluido = antes.papeis.find((papel) => papel.nome === operacao.papel);
      if (!excluido) continue;
      const partes: string[] = [];
      if (excluido.objetos.length > 0 && operacao.herdeiro) {
        partes.push(
          `${pluralizar(excluido.objetos.length, 'o objeto de que é dono passa', `os ${formatarNumero(excluido.objetos.length)} objetos de que é dono passam`)} para ${operacao.herdeiro}`,
        );
      }
      if (excluido.membroDe.length > 0) {
        partes.push(`sai de ${listarNomes(excluido.membroDe.map((item) => item.papel))}`);
      }
      if (excluido.membros.length > 0) {
        partes.push(
          `${pluralizar(excluido.membros.length, 'o membro perde', `os ${formatarNumero(excluido.membros.length)} membros perdem`)} o que ele dava`,
        );
      }
      if (excluido.sessoes > 0) {
        partes.push(
          operacao.encerrarSessoes
            ? `${pluralizar(excluido.sessoes, 'a sessão aberta é encerrada', `as ${formatarNumero(excluido.sessoes)} sessões abertas são encerradas`)}`
            : `${pluralizar(excluido.sessoes, 'a sessão aberta continua', `as ${formatarNumero(excluido.sessoes)} sessões abertas continuam`)} até desconectar`,
        );
      }
      linhas.push({
        chave: `excluir-${excluido.nome}`,
        tom: 'PERDE',
        texto: `${excluido.nome} deixa de existir${partes.length > 0 ? `: ${partes.join('; ')}` : ''}.`,
      });
    }
  }

  const tocados = new Set(
    operacoes.flatMap((operacao) => {
      if (operacao.tipo === 'CONCEDER_PARTICIPACAO' || operacao.tipo === 'REVOGAR_PARTICIPACAO') return [operacao.membro];
      if ('papel' in operacao && operacao.tipo !== 'CRIAR_PAPEL' && operacao.tipo !== 'EXCLUIR_PAPEL') return [operacao.papel];
      return [];
    }),
  );
  for (const nome of tocados) {
    const anterior = antes.papeis.find((papel) => papel.nome === nome);
    if (!anterior) continue;
    linhas.push(...efeitosDoPapel(anterior, depois.papeis.find((papel) => papel.nome === renomeado(nome)), depois.papeis));
  }
  return linhas;
}

interface Mudanca {
  sujeito: string;
  tom: 'GANHA' | 'PERDE';
  privilegios: Privilegio[];
  objetos: string[];
}

function privilegiosDe(sujeito: string, objetoId: string, indice: IndiceDasPermissoes): Set<Privilegio> {
  const objeto = indice.objetos.get(objetoId);
  if (!objeto || (sujeito !== PUBLICO && !indice.papeis.has(sujeito))) return new Set();
  return new Set(acessoDe(sujeito, objeto, indice).privilegios.map((item) => item.privilegio));
}

function mudancasDeAcesso(antes: IndiceDasPermissoes, depois: IndiceDasPermissoes, renomeado: (nome: string) => string): Mudanca[] {
  const brutas = new Map<string, Mudanca>();
  const sujeitos = [PUBLICO, ...antes.dados.papeis.map((papel) => papel.nome)];
  for (const papel of depois.dados.papeis) if (!sujeitos.some((nome) => renomeado(nome) === papel.nome)) sujeitos.push(papel.nome);

  for (const sujeito of sujeitos) {
    const novoNome = renomeado(sujeito);
    const existiaAntes = sujeito === PUBLICO || antes.papeis.has(sujeito);
    const existeDepois = novoNome === PUBLICO || depois.papeis.has(novoNome);
    if (!existeDepois) continue;
    if (antes.papeis.get(sujeito)?.superusuario && depois.papeis.get(novoNome)?.superusuario) continue;
    for (const objeto of depois.ordenados) {
      const anteriores = privilegiosDe(existiaAntes ? sujeito : PUBLICO, objeto.id, antes);
      const atuais = privilegiosDe(novoNome, objeto.id, depois);
      const ganhos = [...atuais].filter((privilegio) => !anteriores.has(privilegio));
      const perdas = [...anteriores].filter((privilegio) => !atuais.has(privilegio));
      for (const [tom, privilegios] of [
        ['GANHA', ganhos],
        ['PERDE', perdas],
      ] as const) {
        if (privilegios.length === 0) continue;
        const ordenados = privilegiosDoTipo[objeto.tipo].filter((privilegio) => privilegios.includes(privilegio));
        const chave = `${novoNome}|${tom}|${ordenados.join(',')}`;
        const atual = brutas.get(chave);
        if (atual) atual.objetos.push(nomeCompleto(objeto));
        else brutas.set(chave, { sujeito: novoNome, tom, privilegios: ordenados, objetos: [nomeCompleto(objeto)] });
      }
    }
  }
  return [...brutas.values()];
}

function textoDosObjetos(objetos: string[]): string {
  if (objetos.length === 1) return objetos[0] ?? '';
  return `${formatarNumero(objetos.length)} objetos (${listarNomes(objetos)})`;
}

function agruparPorSujeitos(mudancas: Mudanca[], citados: string[]): LinhaDoEfeito[] {
  const prioridade = (sujeito: string) => {
    const posicao = citados.indexOf(sujeito);
    return posicao < 0 ? citados.length : posicao;
  };
  const grupos = new Map<string, { sujeitos: string[]; mudanca: Mudanca }>();
  for (const mudanca of mudancas) {
    const chave = `${mudanca.tom}|${mudanca.privilegios.join(',')}|${mudanca.objetos.join(',')}`;
    const grupo = grupos.get(chave);
    if (grupo) grupo.sujeitos.push(mudanca.sujeito);
    else grupos.set(chave, { sujeitos: [mudanca.sujeito], mudanca });
  }
  return [...grupos.entries()].map(([chave, grupo]) => {
    const { mudanca } = grupo;
    const sujeitos = [...grupo.sujeitos].sort((a, b) => prioridade(a) - prioridade(b));
    const publico = sujeitos.includes(PUBLICO);
    const outros = sujeitos.filter((sujeito) => sujeito !== PUBLICO);
    const verbo = mudanca.tom === 'GANHA' ? (sujeitos.length > 1 ? 'passam a ter' : 'passa a ter') : sujeitos.length > 1 ? 'perdem' : 'perde';
    const quem = publico
      ? outros.length === 0
        ? 'PUBLIC'
        : `PUBLIC e, com ele, ${formatarNumero(outros.length)} ${pluralizar(outros.length, 'papel', 'papéis')} sem outro caminho (${listarNomes(outros)})`
      : listarNomes(sujeitos);
    return {
      chave,
      tom: mudanca.tom,
      texto: `${quem} ${verbo} ${mudanca.privilegios.join(', ')} em ${textoDosObjetos(mudanca.objetos)}.`,
    };
  });
}

function permanencias(operacoes: OperacaoDTO[], depois: ListaPermissoesDTO, indice: IndiceDasPermissoes): LinhaDoEfeito[] {
  const linhas: LinhaDoEfeito[] = [];
  for (const operacao of operacoes) {
    if (operacao.tipo !== 'REVOGAR' || operacao.soRepasse) continue;
    for (const objeto of objetosDoAlvo(depois, operacao.alvo)) {
      const efetivo = indice.objetos.get(objeto.id);
      if (!efetivo) continue;
      const acesso = acessoDe(operacao.beneficiario, efetivo, indice);
      for (const privilegio of operacao.privilegios) {
        const item = acesso.privilegios.find((candidato) => candidato.privilegio === privilegio);
        const origem = item?.origens[0];
        if (!origem) continue;
        linhas.push({
          chave: `mantem-${operacao.beneficiario}-${objeto.id}-${privilegio}`,
          tom: 'MANTEM',
          texto: `${operacao.beneficiario} continua com ${privilegio} em ${nomeCompleto(objeto)}. ${fraseDaOrigem(origem, operacao.beneficiario)}`,
        });
      }
    }
  }
  return linhas;
}

function efeitosDosPadroes(operacoes: OperacaoDTO[]): LinhaDoEfeito[] {
  return operacoes.flatMap((operacao): LinhaDoEfeito[] => {
    if (operacao.tipo !== 'PRIVILEGIO_PADRAO') return [];
    const objetos = { TABELAS: 'As tabelas e views', SEQUENCIAS: 'As sequências', FUNCOES: 'As funções' }[operacao.tipoDeObjeto];
    const onde = operacao.esquema === null ? 'em qualquer esquema' : `em ${operacao.esquema}`;
    const quem = operacao.beneficiario === PUBLICO ? 'todos os papéis (PUBLIC)' : operacao.beneficiario;
    return [
      {
        chave: `padrao-${operacao.criador}-${operacao.esquema ?? ''}-${operacao.tipoDeObjeto}-${operacao.beneficiario}`,
        tom: operacao.acao === 'CONCEDER' ? 'GANHA' : 'PERDE',
        texto:
          operacao.acao === 'CONCEDER'
            ? `${objetos} que ${operacao.criador} criar ${onde} passam a nascer com ${operacao.privilegios.join(', ')} para ${quem}. O que já existe não muda.`
            : `${objetos} que ${operacao.criador} criar ${onde} deixam de nascer com ${operacao.privilegios.join(', ')} para ${quem}. O que já existe não muda.`,
      },
    ];
  });
}

function avisosDasOperacoes(operacoes: OperacaoDTO[], estado: EstadoParaEfeito, indiceDepois: IndiceDasPermissoes | null): AvisoDoEfeito[] {
  const avisos: AvisoDoEfeito[] = [];
  const ator = estado.permissoes?.papelDaConexao ?? estado.papeis?.papelDaConexao ?? null;
  const existentes = estado.papeis?.papeis.map((papel) => papel.nome) ?? estado.permissoes?.papeis.map((papel) => papel.nome) ?? null;
  if (existentes) {
    const criados = new Set(operacoes.flatMap((operacao) => (operacao.tipo === 'CRIAR_PAPEL' ? [operacao.papel] : [])));
    const renomeados = new Set(operacoes.flatMap((operacao) => (operacao.tipo === 'RENOMEAR_PAPEL' ? [operacao.novoNome] : [])));
    const ausentes = papeisDaAlteracao(operacoes).filter(
      (nome) => nome !== PUBLICO && !existentes.includes(nome) && !criados.has(nome) && !renomeados.has(nome),
    );
    if (ausentes.length > 0) {
      avisos.push({
        tom: 'erro',
        texto: `${listarNomes(ausentes)} não ${ausentes.length === 1 ? 'existe' : 'existem'} mais neste servidor: o banco vai recusar o comando.`,
      });
    }
  }
  const papel = (nome: string) => estado.papeis?.papeis.find((candidato) => candidato.nome === nome);

  for (const operacao of operacoes) {
    if (
      (operacao.tipo === 'CRIAR_PAPEL' && operacao.atributos.superusuario) ||
      (operacao.tipo === 'ALTERAR_PAPEL' && operacao.atributos.superusuario === true)
    ) {
      avisos.push({
        tom: 'erro',
        texto: `${operacao.papel} vai ser superusuário: passa por cima de todas as permissões, lê e altera qualquer dado e muda o servidor. Prefira conceder só o que ele precisa.`,
      });
    }
    if (operacao.tipo === 'CONCEDER' && operacao.repassavel && operacao.beneficiario !== PUBLICO) {
      avisos.push({
        tom: 'aviso',
        texto: `Com WITH GRANT OPTION, ${operacao.beneficiario} pode repassar ${operacao.privilegios.join(', ')} a quem quiser, sem passar por quem administra o banco.`,
      });
    }
    if (operacao.tipo === 'REVOGAR' && operacao.beneficiario === PUBLICO && !operacao.soRepasse) {
      avisos.push({
        tom: 'aviso',
        texto: 'Revogar de PUBLIC tira o acesso de todos os papéis que não o recebem por outro caminho, inclusive aplicações em uso.',
      });
    }
    if (operacao.tipo === 'EXCLUIR_PAPEL') {
      avisos.push({
        tom: 'info',
        texto: `REASSIGN OWNED e DROP OWNED valem só neste banco. Se ${operacao.papel} tiver objetos ou permissões em outros bancos do servidor, o DROP ROLE falha até eles saírem: rode os dois comandos em cada banco antes.`,
      });
    }
    if (operacao.tipo === 'RENOMEAR_PAPEL' && papel(operacao.papel)?.metodoSenha === 'MD5') {
      avisos.push({
        tom: 'aviso',
        texto: `${operacao.papel} guarda a senha em MD5, que usa o nome como sal: ao renomear, o PostgreSQL apaga a senha.`,
      });
    }
    if (ator && operacao.tipo === 'ALTERAR_PAPEL' && operacao.papel === ator) {
      if (operacao.atributos.login === false) {
        avisos.push({ tom: 'erro', texto: `${ator} é o papel do Orynt: sem LOGIN, a próxima conexão do Orynt com este banco falha.` });
      }
      if (operacao.atributos.criaPapeis === false || operacao.atributos.superusuario === false) {
        avisos.push({
          tom: 'erro',
          texto: `${ator} é o papel do Orynt: sem esse atributo, o Orynt deixa de poder administrar papéis por esta conexão.`,
        });
      }
    }
    if (ator && operacao.tipo === 'REVOGAR_PARTICIPACAO' && operacao.membro === ator) {
      avisos.push({ tom: 'aviso', texto: `${ator} é o papel do Orynt: ao sair de ${operacao.grupo}, o Orynt perde o que o grupo dava.` });
    }
    if (operacao.tipo === 'CONCEDER' && indiceDepois && operacao.beneficiario !== PUBLICO) {
      const esquema = operacao.alvo.tipo === 'TODOS_DO_ESQUEMA' ? operacao.alvo.esquema : operacao.alvo.objeto.esquema;
      const tipo = operacao.alvo.tipo === 'OBJETO' ? operacao.alvo.objeto.tipo : null;
      const objetoDoEsquema = esquema ? indiceDepois.esquemas.get(esquema) : undefined;
      if (objetoDoEsquema && tipo !== 'ESQUEMA' && !privilegiosDe(operacao.beneficiario, objetoDoEsquema.id, indiceDepois).has('USAGE')) {
        avisos.push({
          tom: 'aviso',
          texto: `${operacao.beneficiario} não tem USAGE no esquema ${esquema}: sem ele, o PostgreSQL recusa o acesso antes de olhar os privilégios do objeto.`,
        });
      }
    }
  }
  return avisos;
}

export function calcularEfeito(operacoes: OperacaoDTO[], estado: EstadoParaEfeito): EfeitoDaAlteracao {
  const linhas: LinhaDoEfeito[] = [];
  const renomeado = (nome: string) =>
    operacoes.reduce((atual, operacao) => (operacao.tipo === 'RENOMEAR_PAPEL' && operacao.papel === atual ? operacao.novoNome : atual), nome);

  if (estado.papeis) linhas.push(...efeitosDosPapeis(estado.papeis, aplicarAosPapeis(estado.papeis, operacoes), operacoes));

  let indiceDepois: IndiceDasPermissoes | null = null;
  if (estado.permissoes) {
    const antes = indexarPermissoes(estado.permissoes);
    const depois = aplicarAsPermissoes(estado.permissoes, operacoes);
    indiceDepois = indexarPermissoes(depois);
    linhas.push(...agruparPorSujeitos(mudancasDeAcesso(antes, indiceDepois, renomeado), papeisDaAlteracao(operacoes).map(renomeado)));
    linhas.push(...permanencias(operacoes, depois, indiceDepois));
  }
  linhas.push(...efeitosDosPadroes(operacoes));

  return { linhas, avisos: avisosDasOperacoes(operacoes, estado, indiceDepois) };
}

