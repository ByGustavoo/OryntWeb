import type { ExcluirPapelDTO } from '@/modelos/alteracoes';
import type { PapelDTO } from '@/modelos/papeis';
import type { ListaPermissoesDTO } from '@/modelos/permissoes';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { contarObjetosPorTipo } from './papeis';
import { nomeCompleto } from './permissoes';

export interface VinculosDoPapel {
  objetos: number;
  textoDosObjetos: string;
  concessoes: number;
  objetosComConcessoes: string[];
  concessoesFeitas: number;
  padroes: number;
  gruposDeQueParticipa: string[];
  membros: string[];
  sessoes: number;
}

const plural = {
  TABELA: ['tabela', 'tabelas'],
  VISAO: ['visão', 'visões'],
  VISAO_MATERIALIZADA: ['visão materializada', 'visões materializadas'],
  FUNCAO: ['função', 'funções'],
  PROCEDIMENTO: ['procedimento', 'procedimentos'],
} as const;

export function vinculosDoPapel(papel: PapelDTO, permissoes: ListaPermissoesDTO | null): VinculosDoPapel {
  const objetosComConcessoes =
    permissoes?.objetos.filter((objeto) => objeto.concessoes.some((concessao) => concessao.beneficiario === papel.nome)) ?? [];
  const concessoes =
    permissoes?.objetos.reduce(
      (soma, objeto) => soma + objeto.concessoes.filter((concessao) => concessao.beneficiario === papel.nome).length,
      0,
    ) ?? 0;
  const concessoesFeitas =
    permissoes?.objetos.reduce(
      (soma, objeto) =>
        soma +
        objeto.concessoes.filter((concessao) => concessao.concedente === papel.nome && objeto.dono !== papel.nome).length,
      0,
    ) ?? 0;
  const padroes =
    permissoes?.privilegiosPadrao.filter((padrao) => padrao.criador === papel.nome || padrao.beneficiario === papel.nome).length ?? 0;

  return {
    objetos: papel.objetos.length,
    textoDosObjetos: contarObjetosPorTipo(papel)
      .map(({ tipo, quantidade }) => `${formatarNumero(quantidade)} ${pluralizar(quantidade, plural[tipo][0], plural[tipo][1])}`)
      .join(', '),
    concessoes,
    objetosComConcessoes: objetosComConcessoes.map(nomeCompleto),
    concessoesFeitas,
    padroes,
    gruposDeQueParticipa: papel.membroDe.map((participacao) => participacao.papel),
    membros: papel.membros.map((participacao) => participacao.papel),
    sessoes: papel.sessoes,
  };
}

export function precisaDeHerdeiro(vinculos: VinculosDoPapel): boolean {
  return vinculos.objetos > 0;
}

export function precisaRemoverPermissoes(vinculos: VinculosDoPapel): boolean {
  return vinculos.concessoes > 0 || vinculos.concessoesFeitas > 0 || vinculos.padroes > 0 || vinculos.objetos > 0;
}

export function herdeirosPossiveis(papel: PapelDTO, papeis: PapelDTO[]): PapelDTO[] {
  return papeis.filter((candidato) => candidato.nome !== papel.nome);
}

export function herdeiroInicial(papel: PapelDTO, papeis: PapelDTO[], papelDaConexao: string | null): string | null {
  const possiveis = herdeirosPossiveis(papel, papeis);
  if (papelDaConexao && possiveis.some((candidato) => candidato.nome === papelDaConexao)) return papelDaConexao;
  return possiveis.find((candidato) => candidato.inicial)?.nome ?? possiveis[0]?.nome ?? null;
}

export function operacaoDeExclusao(
  papel: PapelDTO,
  vinculos: VinculosDoPapel,
  herdeiro: string | null,
  encerrarSessoes: boolean,
): ExcluirPapelDTO {
  return {
    tipo: 'EXCLUIR_PAPEL',
    papel: papel.nome,
    herdeiro: precisaDeHerdeiro(vinculos) ? herdeiro : null,
    removerPermissoes: precisaRemoverPermissoes(vinculos),
    encerrarSessoes: encerrarSessoes && vinculos.sessoes > 0,
  };
}
