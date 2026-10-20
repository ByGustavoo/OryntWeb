import type { AtributosDoPapelDTO, OperacaoDTO } from '@/modelos/alteracoes';
import type { ParticipacaoDTO } from '@/modelos/papeis';
import type { ObjetoComPermissoesDTO, Privilegio } from '@/modelos/permissoes';
import { objetosDoAlvo } from './aplicacaoAlteracoes';
import { acessoDe, PUBLICO } from './permissoes';
import type { IndiceDasPermissoes } from './permissoes';

export const PAPEL_QUE_ENCERRA_SESSOES = 'pg_signal_backend';

export interface PapelParaCapacidade {
  nome: string;
  inicial?: boolean;
  superusuario: boolean;
  criaBancos?: boolean;
  criaPapeis?: boolean;
  replicacao?: boolean;
  ignoraRls?: boolean;
  membroDe: ParticipacaoDTO[];
}

export interface ContextoDaCapacidade {
  ator: string;
  papeis: PapelParaCapacidade[];
}

export interface Capacidade {
  permitido: boolean;
  motivo: string | null;
}

const PERMITIDO: Capacidade = { permitido: true, motivo: null };

function negado(motivo: string): Capacidade {
  return { permitido: false, motivo };
}

function papelDoAtor(contexto: ContextoDaCapacidade): PapelParaCapacidade | null {
  return contexto.papeis.find((papel) => papel.nome === contexto.ator) ?? null;
}

function alcanca(
  contexto: ContextoDaCapacidade,
  origem: string,
  alvo: string,
  passa: (participacao: ParticipacaoDTO) => boolean,
): boolean {
  if (origem === alvo) return true;
  const porNome = new Map(contexto.papeis.map((papel) => [papel.nome, papel]));
  const visitados = new Set([origem]);
  const fila = [origem];
  for (let atual = fila.shift(); atual !== undefined; atual = fila.shift()) {
    for (const participacao of porNome.get(atual)?.membroDe ?? []) {
      if (!passa(participacao) || visitados.has(participacao.papel)) continue;
      if (participacao.papel === alvo) return true;
      visitados.add(participacao.papel);
      fila.push(participacao.papel);
    }
  }
  return false;
}

export function ehSuperusuarioNoContexto(contexto: ContextoDaCapacidade): boolean {
  return papelDoAtor(contexto)?.superusuario ?? false;
}

export function herdaDoPapel(contexto: ContextoDaCapacidade, alvo: string): boolean {
  return alcanca(contexto, contexto.ator, alvo, (participacao) => participacao.herda);
}

export function alcancaOPapel(contexto: ContextoDaCapacidade, alvo: string): boolean {
  return alcanca(contexto, contexto.ator, alvo, (participacao) => participacao.herda || participacao.assume);
}

function administra(contexto: ContextoDaCapacidade, grupo: string): boolean {
  return papelDoAtor(contexto)?.membroDe.some((participacao) => participacao.papel === grupo && participacao.administra) ?? false;
}

const atributosQueExigem: Partial<Record<keyof AtributosDoPapelDTO, keyof PapelParaCapacidade>> = {
  criaBancos: 'criaBancos',
  replicacao: 'replicacao',
  ignoraRls: 'ignoraRls',
};

const palavraDoAtributo: Record<keyof AtributosDoPapelDTO, string> = {
  login: 'LOGIN',
  superusuario: 'SUPERUSER',
  criaBancos: 'CREATEDB',
  criaPapeis: 'CREATEROLE',
  replicacao: 'REPLICATION',
  ignoraRls: 'BYPASSRLS',
  herda: 'INHERIT',
};

export function podeCriarPapeis(contexto: ContextoDaCapacidade): Capacidade {
  const ator = papelDoAtor(contexto);
  if (ator?.superusuario || ator?.criaPapeis) return PERMITIDO;
  return negado(`${contexto.ator}, o papel com que o Orynt está conectado, não tem CREATEROLE nem é superusuário.`);
}

export function motivoDoAtributo(contexto: ContextoDaCapacidade, atributo: keyof AtributosDoPapelDTO): string | null {
  const ator = papelDoAtor(contexto);
  if (ator?.superusuario) return null;
  if (atributo === 'superusuario') return 'Só um superusuário concede ou tira SUPERUSER.';
  const exigido = atributosQueExigem[atributo];
  if (exigido && !ator?.[exigido]) {
    return `${contexto.ator} só concede ou tira ${palavraDoAtributo[atributo]} quando também tem esse atributo.`;
  }
  return null;
}

export function podeAdministrarPapel(contexto: ContextoDaCapacidade, alvo: string): Capacidade {
  const ator = papelDoAtor(contexto);
  const papel = contexto.papeis.find((candidato) => candidato.nome === alvo);
  if (ator?.superusuario) return PERMITIDO;
  if (papel?.superusuario) return negado(`Só um superusuário altera ${alvo}, que é superusuário.`);
  if (alvo === contexto.ator) return PERMITIDO;
  if (ator?.criaPapeis && administra(contexto, alvo)) return PERMITIDO;
  return negado(
    `Para alterar ${alvo}, ${contexto.ator} precisa de CREATEROLE e da opção ADMIN sobre ele, ou ser superusuário. Quem cria um papel com CREATEROLE recebe essa opção sozinho.`,
  );
}

export function podeAlterarAtributosDoPapel(contexto: ContextoDaCapacidade, alvo: string): Capacidade {
  if (alvo === contexto.ator && !ehSuperusuarioNoContexto(contexto) && !papelDoAtor(contexto)?.criaPapeis) {
    return negado(`${contexto.ator} só muda a própria senha; os atributos pedem CREATEROLE ou superusuário.`);
  }
  return podeAdministrarPapel(contexto, alvo);
}

export function podeRenomearPapel(contexto: ContextoDaCapacidade, alvo: string): Capacidade {
  if (alvo === contexto.ator) return negado('O PostgreSQL não renomeia o papel da sessão em uso, que é o do Orynt.');
  return podeAdministrarPapel(contexto, alvo);
}

export function podeExcluirPapel(contexto: ContextoDaCapacidade, alvo: string): Capacidade {
  const papel = contexto.papeis.find((candidato) => candidato.nome === alvo);
  if (alvo === contexto.ator) return negado('Não dá para excluir o papel com que o Orynt está conectado.');
  if (papel?.inicial) return negado('O superusuário criado na instalação não pode ser excluído: o servidor depende dele.');
  return podeAdministrarPapel(contexto, alvo);
}

export function podeMudarParticipacao(contexto: ContextoDaCapacidade, grupo: string): Capacidade {
  if (ehSuperusuarioNoContexto(contexto) || administra(contexto, grupo)) return PERMITIDO;
  return negado(`Para mudar quem participa de ${grupo}, ${contexto.ator} precisa da opção ADMIN sobre ele ou ser superusuário.`);
}

export function podeEncerrarSessoes(contexto: ContextoDaCapacidade, alvo: string): Capacidade {
  if (ehSuperusuarioNoContexto(contexto)) return PERMITIDO;
  if (herdaDoPapel(contexto, PAPEL_QUE_ENCERRA_SESSOES) || herdaDoPapel(contexto, alvo)) return PERMITIDO;
  return negado(`${contexto.ator} não pode encerrar sessões de outros papéis: isso pede superusuário ou ${PAPEL_QUE_ENCERRA_SESSOES}.`);
}

export function podeReatribuirObjetos(contexto: ContextoDaCapacidade, alvo: string, herdeiro: string): Capacidade {
  if (ehSuperusuarioNoContexto(contexto)) return PERMITIDO;
  if (!herdaDoPapel(contexto, alvo)) return negado(`REASSIGN OWNED pede que ${contexto.ator} tenha os privilégios de ${alvo}.`);
  if (!herdaDoPapel(contexto, herdeiro)) return negado(`REASSIGN OWNED pede que ${contexto.ator} tenha os privilégios de ${herdeiro}.`);
  return PERMITIDO;
}

export function contextoDasPermissoes(indice: IndiceDasPermissoes): ContextoDaCapacidade {
  return { ator: indice.dados.papelDaConexao, papeis: indice.dados.papeis };
}

export function podeConcederNoObjeto(
  indice: IndiceDasPermissoes,
  objeto: ObjetoComPermissoesDTO,
  privilegios: Privilegio[],
): Capacidade {
  const ator = indice.dados.papelDaConexao;
  const acesso = acessoDe(ator, objeto, indice);
  if (acesso.nivel === 'TOTAL') return PERMITIDO;
  const faltam = privilegios.filter(
    (privilegio) => !acesso.privilegios.some((item) => item.privilegio === privilegio && item.repassavel),
  );
  if (faltam.length === 0) return PERMITIDO;
  return negado(
    `Só o dono de ${objeto.nome} (${objeto.dono}), quem herda dele, um superusuário ou quem recebeu ${faltam.join(', ')} com WITH GRANT OPTION concede esse acesso.`,
  );
}

export function podeRevogarConcessoes(indice: IndiceDasPermissoes, concedentes: string[]): Capacidade {
  const contexto = contextoDasPermissoes(indice);
  if (ehSuperusuarioNoContexto(contexto)) return PERMITIDO;
  const alheios = concedentes.filter((concedente) => !herdaDoPapel(contexto, concedente));
  if (alheios.length === 0) return PERMITIDO;
  return negado(
    `O acesso foi concedido por ${alheios.join(', ')}: só quem concedeu, quem herda dele ou um superusuário o retira.`,
  );
}

export function podeDefinirPadrao(indice: IndiceDasPermissoes, criador: string): Capacidade {
  const contexto = contextoDasPermissoes(indice);
  if (ehSuperusuarioNoContexto(contexto) || alcancaOPapel(contexto, criador)) return PERMITIDO;
  return negado(`Só ${criador}, quem participa dele ou um superusuário define os privilégios padrão dos objetos que ele cria.`);
}

export function nomeParaConfirmar(operacoes: OperacaoDTO[], ator: string): string | null {
  for (const operacao of operacoes) {
    if (operacao.tipo === 'EXCLUIR_PAPEL') return operacao.papel;
    if (operacao.tipo === 'ALTERAR_PAPEL' && operacao.atributos.superusuario === false) return operacao.papel;
    if (operacao.tipo === 'REVOGAR' && operacao.beneficiario === PUBLICO && !operacao.soRepasse) return PUBLICO;
  }
  for (const operacao of operacoes) {
    if (operacao.tipo === 'REVOGAR' && operacao.beneficiario === ator) return ator;
    if (operacao.tipo === 'REVOGAR_PARTICIPACAO' && operacao.membro === ator) return ator;
    if (
      operacao.tipo === 'ALTERAR_PAPEL' &&
      operacao.papel === ator &&
      (operacao.atributos.criaPapeis === false || operacao.atributos.login === false)
    ) {
      return ator;
    }
  }
  return null;
}

function primeiraNegada(capacidades: Capacidade[]): Capacidade {
  return capacidades.find((capacidade) => !capacidade.permitido) ?? PERMITIDO;
}

function capacidadeDaOperacao(operacao: OperacaoDTO, contexto: ContextoDaCapacidade, indice: IndiceDasPermissoes | null): Capacidade {
  switch (operacao.tipo) {
    case 'CRIAR_PAPEL': {
      const atributos = (Object.keys(operacao.atributos) as (keyof AtributosDoPapelDTO)[]).filter(
        (atributo) => atributo !== 'login' && atributo !== 'herda' && operacao.atributos[atributo],
      );
      const motivo = atributos.map((atributo) => motivoDoAtributo(contexto, atributo)).find(Boolean);
      return primeiraNegada([podeCriarPapeis(contexto), motivo ? negado(motivo) : PERMITIDO]);
    }
    case 'ALTERAR_PAPEL': {
      const soSenha =
        Object.keys(operacao.atributos).length === 0 && operacao.limiteConexoes === undefined && operacao.validadeSenha === undefined;
      if (soSenha && operacao.papel === contexto.ator) return PERMITIDO;
      const atributos = (Object.keys(operacao.atributos) as (keyof AtributosDoPapelDTO)[]).filter(
        (atributo) => atributo !== 'login' && atributo !== 'herda',
      );
      const motivo = atributos.map((atributo) => motivoDoAtributo(contexto, atributo)).find(Boolean);
      return primeiraNegada([podeAlterarAtributosDoPapel(contexto, operacao.papel), motivo ? negado(motivo) : PERMITIDO]);
    }
    case 'RENOMEAR_PAPEL':
      return podeRenomearPapel(contexto, operacao.papel);
    case 'DESCREVER_PAPEL':
    case 'CONFIGURAR_PAPEL':
      return podeAdministrarPapel(contexto, operacao.papel);
    case 'EXCLUIR_PAPEL':
      return primeiraNegada([
        podeExcluirPapel(contexto, operacao.papel),
        operacao.herdeiro ? podeReatribuirObjetos(contexto, operacao.papel, operacao.herdeiro) : PERMITIDO,
        operacao.encerrarSessoes ? podeEncerrarSessoes(contexto, operacao.papel) : PERMITIDO,
      ]);
    case 'CONCEDER_PARTICIPACAO':
    case 'REVOGAR_PARTICIPACAO':
      return podeMudarParticipacao(contexto, operacao.grupo);
    case 'CONCEDER': {
      if (!indice) return PERMITIDO;
      const objetos = objetosDoAlvo(indice.dados, operacao.alvo);
      return primeiraNegada(objetos.map((objeto) => podeConcederNoObjeto(indice, objeto, operacao.privilegios)));
    }
    case 'REVOGAR':
      return indice ? podeRevogarConcessoes(indice, operacao.concedentes) : PERMITIDO;
    case 'PRIVILEGIO_PADRAO':
      return indice ? podeDefinirPadrao(indice, operacao.criador) : PERMITIDO;
  }
}

export function capacidadeDasOperacoes(
  operacoes: OperacaoDTO[],
  contexto: ContextoDaCapacidade,
  indice: IndiceDasPermissoes | null = null,
): Capacidade {
  return primeiraNegada(operacoes.map((operacao) => capacidadeDaOperacao(operacao, contexto, indice)));
}
