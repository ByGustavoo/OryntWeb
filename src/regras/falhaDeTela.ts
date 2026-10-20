export type MotivoFalhaDeTela = 'CARREGAMENTO' | 'EXECUCAO';

export type AlcanceFalhaDeTela = 'TELA' | 'APLICACAO';

export interface FalhaDeTela {
  motivo: MotivoFalhaDeTela;
  titulo: string;
  tituloDaAba: string;
  descricao: string;
  linhaDoErro: string;
}

const MENSAGENS_DE_CARREGAMENTO = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
  /loading (css )?chunk [\w-]+ failed/i,
];

function mensagemDoErro(erro: unknown): string {
  if (erro instanceof Error) return `${erro.name} ${erro.message}`;
  return typeof erro === 'string' ? erro : '';
}

export function motivoDaFalhaDeTela(erro: unknown): MotivoFalhaDeTela {
  const mensagem = mensagemDoErro(erro);
  if (erro instanceof Error && erro.name === 'ChunkLoadError') return 'CARREGAMENTO';
  return MENSAGENS_DE_CARREGAMENTO.some((padrao) => padrao.test(mensagem)) ? 'CARREGAMENTO' : 'EXECUCAO';
}

export function interpretarFalhaDeTela(erro: unknown, alcance: AlcanceFalhaDeTela): FalhaDeTela {
  const motivo = motivoDaFalhaDeTela(erro);
  const sujeito = alcance === 'TELA' ? 'Esta tela' : 'O Orynt';

  if (motivo === 'CARREGAMENTO') {
    return {
      motivo,
      titulo: `${sujeito} não carregou`,
      tituloDaAba: alcance === 'TELA' ? 'Esta tela não carregou' : 'Não carregou',
      descricao:
        'Uma parte do Orynt não chegou ao navegador. Isso costuma acontecer quando sai uma versão nova com a página aberta ou quando a rede cai por um instante. Recarregar a página resolve.',
      linhaDoErro: 'não foi possível carregar o módulo da tela',
    };
  }

  return {
    motivo,
    titulo: `${sujeito} parou de funcionar`,
    tituloDaAba: alcance === 'TELA' ? 'Esta tela parou de funcionar' : 'Parou de funcionar',
    descricao:
      alcance === 'TELA'
        ? 'Algo deu errado ao montar esta tela. Recarregue a página para tentar de novo; se o erro continuar, as outras telas seguem pelo menu.'
        : 'Algo deu errado ao montar a aplicação. Recarregue a página para tentar de novo.',
    linhaDoErro: 'falha ao montar a tela',
  };
}
