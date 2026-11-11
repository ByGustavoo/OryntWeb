import { describe, expect, it } from 'vitest';
import { navegacaoDaConta, navegacaoPrincipal } from '@/configuracoes/navegacao';
import { caminhos } from '@/rotas/caminhos';
import { telasDoOrynt } from './permissoesConta';
import {
  caminhoDaTela,
  codigosTela,
  ehCodigoTela,
  gruposDeTelas,
  listarRotulosDasTelas,
  navegacaoVisivel,
  normalizarTelas,
  rotuloDaTela,
  telaDoDestino,
} from './telasOcultas';

function ocultando(...codigos: string[]) {
  return (destino: string) => {
    const codigo = telaDoDestino(destino);
    return codigo !== null && codigos.includes(codigo);
  };
}

describe('caminhoDaTela', () => {
  it('cobre toda tela do Orynt, menos o Dashboard e Configurações', () => {
    const esperados = telasDoOrynt
      .map((tela) => tela.caminho)
      .filter((caminho) => caminho !== caminhos.dashboard && caminho !== caminhos.configuracoes);
    expect(codigosTela.map((codigo) => caminhoDaTela[codigo]).sort()).toEqual([...esperados].sort());
  });

  it('cobre toda tela do menu, menos o Dashboard', () => {
    const doMenu = navegacaoPrincipal
      .flatMap((secao) => secao.itens)
      .flatMap((item) => (item.filhos ? item.filhos.map((filho) => filho.destino) : [item.destino]))
      .filter((destino) => destino !== caminhos.dashboard);
    expect(doMenu.every((destino) => telaDoDestino(destino) !== null)).toBe(true);
  });
});

describe('telaDoDestino', () => {
  it('ignora a busca, o fragmento e a barra final', () => {
    expect(telaDoDestino(`${caminhos.consultasPlanos}?consulta=7#topo`)).toBe('CONSULTAS_PLANOS');
    expect(telaDoDestino(`${caminhos.backupHistorico}/`)).toBe('BACKUP_HISTORICO');
  });

  it('não reconhece o Dashboard, Configurações nem um caminho de grupo', () => {
    expect(telaDoDestino(caminhos.dashboard)).toBeNull();
    expect(telaDoDestino(caminhos.configuracoes)).toBeNull();
    expect(telaDoDestino(caminhos.consultas)).toBeNull();
  });
});

describe('ehCodigoTela', () => {
  it('aceita só os códigos conhecidos', () => {
    expect(ehCodigoTela('OBJETOS_INDICES')).toBe(true);
    expect(ehCodigoTela('DASHBOARD')).toBe(false);
    expect(ehCodigoTela('toString')).toBe(false);
    expect(ehCodigoTela(3)).toBe(false);
  });
});

describe('normalizarTelas e listarRotulosDasTelas', () => {
  it('tira as repetições e segue a ordem do menu', () => {
    expect(normalizarTelas(['ADMINISTRACAO_AUDITORIA', 'RELATORIOS_RESUMO', 'ADMINISTRACAO_AUDITORIA'])).toEqual([
      'RELATORIOS_RESUMO',
      'ADMINISTRACAO_AUDITORIA',
    ]);
  });

  it('junta os rótulos completos com vírgula e "e"', () => {
    expect(rotuloDaTela('BACKUP_RESUMO')).toBe('Backup › Resumo');
    expect(listarRotulosDasTelas(['CONSULTAS_TODAS'])).toBe('Consultas SQL › Todas');
    expect(listarRotulosDasTelas(['OBJETOS_FUNCOES', 'RELATORIOS_RESUMO', 'CONSULTAS_TODAS'])).toBe(
      'Relatórios › Resumo, Consultas SQL › Todas e Objetos do banco › Funções',
    );
  });
});

describe('navegacaoVisivel', () => {
  it('tira a tela oculta do grupo e mantém as outras', () => {
    const secoes = navegacaoVisivel(navegacaoPrincipal, ocultando('CONSULTAS_TODAS'));
    const consultas = secoes.flatMap((secao) => secao.itens).find((item) => item.destino === caminhos.consultas);
    expect(consultas?.filhos?.map((filho) => filho.destino)).toEqual([caminhos.consultasHistorico, caminhos.consultasPlanos]);
  });

  it('tira o grupo sem telas e a seção sem itens', () => {
    const secoes = navegacaoVisivel(
      navegacaoPrincipal,
      ocultando('RELATORIOS_RESUMO', 'RELATORIOS_EXPORTACAO', 'RELATORIOS_COMPARACAO', 'ADMINISTRACAO_USUARIOS', 'ADMINISTRACAO_AUDITORIA'),
    );
    const titulos = secoes.map((secao) => secao.titulo);
    expect(titulos).not.toContain('Administração');
    const analise = secoes.find((secao) => secao.titulo === 'Análise');
    expect(analise?.itens.map((item) => item.rotulo)).toEqual(['Consultas SQL']);
  });

  it('mantém o Dashboard sempre', () => {
    const todas = new Set<string>(codigosTela);
    const secoes = navegacaoVisivel(navegacaoPrincipal, (destino) => todas.has(telaDoDestino(destino) ?? ''));
    expect(secoes.flatMap((secao) => secao.itens).map((item) => item.destino)).toEqual([caminhos.dashboard]);
  });
});

describe('gruposDeTelas', () => {
  it('segue os grupos do menu e junta a Administração num grupo só', () => {
    const grupos = gruposDeTelas(navegacaoPrincipal);
    expect(grupos.map((grupo) => grupo.titulo)).toEqual([
      'Relatórios',
      'Consultas SQL',
      'Backup',
      'Objetos do banco',
      'Usuários e permissões',
      'Administração',
    ]);
    expect(grupos.flatMap((grupo) => grupo.telas)).toHaveLength(codigosTela.length);
    expect(grupos.at(-1)?.telas.map((tela) => tela.rotulo)).toEqual(['Usuários', 'Auditoria']);
  });

  it('mostra só as telas que a conta pode abrir', () => {
    const grupos = gruposDeTelas(navegacaoDaConta({ permissoes: ['CONSULTAS_VER', 'ADMIN_AUDITORIA'] }));
    expect(grupos).toEqual([
      {
        titulo: 'Consultas SQL',
        telas: [
          { codigo: 'CONSULTAS_TODAS', rotulo: 'Todas' },
          { codigo: 'CONSULTAS_HISTORICO', rotulo: 'Histórico' },
          { codigo: 'CONSULTAS_PLANOS', rotulo: 'Planos de execução' },
        ],
      },
      { titulo: 'Administração', telas: [{ codigo: 'ADMINISTRACAO_AUDITORIA', rotulo: 'Auditoria' }] },
    ]);
  });
});
