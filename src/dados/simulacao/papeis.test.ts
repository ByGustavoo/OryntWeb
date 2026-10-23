import { describe, expect, it } from 'vitest';
import type { ListaPapeisDTO, PapelDTO } from '@/modelos/papeis';
import { estadoDoUsoDoPapel, papelDoSistema, situacoesDoPapel } from '@/regras/papeis';
import type { ContextoDosPapeis } from '@/regras/papeis';
import { gerarFuncoes } from './funcoes';
import { gerarPapeis } from './papeis';
import { conexoesNoInstante } from './series';
import { gerarTabelas } from './tabelas';
import { gerarVisoes } from './visoes';

const agora = new Date(2026, 9, 19, 15, 0);
const lista = gerarPapeis(agora, 'loja_app');

function contextoDe(origem: ListaPapeisDTO): ContextoDosPapeis {
  return { geradoEm: origem.geradoEm, coletaDesde: origem.coletaDesde, papelDaConexao: origem.papelDaConexao };
}

function papel(nome: string, origem: ListaPapeisDTO = lista): PapelDTO {
  const encontrado = origem.papeis.find((candidato) => candidato.nome === nome);
  if (!encontrado) throw new Error(`Papel ${nome} não simulado.`);
  return encontrado;
}

function totalDeSessoes(origem: ListaPapeisDTO): number {
  return origem.papeis.reduce((soma, item) => soma + item.sessoes, 0);
}

describe('gerarPapeis', () => {
  it('soma nas sessões dos papéis as conexões ativas do Dashboard', () => {
    expect(totalDeSessoes(lista)).toBe(conexoesNoInstante(agora));
    const madrugada = new Date(2026, 9, 19, 4, 0);
    expect(totalDeSessoes(gerarPapeis(madrugada, 'loja_app'))).toBe(conexoesNoInstante(madrugada));
  });

  it('acrescenta o papel da conexão quando ele não está entre os simulados, com a sessão do Orynt', () => {
    const outra = gerarPapeis(agora, 'ana_dev');
    expect(papel('ana_dev', outra)).toMatchObject({ login: true, sessoes: 1 });
    expect(totalDeSessoes(outra)).toBe(conexoesNoInstante(agora));
    expect(gerarPapeis(agora, 'migracao').papeis).toHaveLength(lista.papeis.length);
    expect(papel('migracao', gerarPapeis(agora, 'migracao')).sessoes).toBe(1);
  });

  it('dá a cada dono de Tabelas, Views e Funções um papel, com os objetos dele', () => {
    const donos = [
      ...gerarTabelas(agora).tabelas.map((item) => [item.dono, item.id]),
      ...gerarVisoes(agora).visoes.map((item) => [item.dono, item.id]),
      ...gerarFuncoes(agora).funcoes.map((item) => [item.dono, item.id]),
    ];
    for (const [dono = '', id] of donos) {
      expect(papel(dono).objetos.map((objeto) => objeto.id)).toContain(id);
    }
    const contados = lista.papeis.reduce((soma, item) => soma + item.objetos.length, 0);
    expect(contados).toBe(donos.length);
  });

  it('mantém as participações simétricas e cita como externos só os papéis do sistema', () => {
    const nomes = new Set(lista.papeis.map((item) => item.nome));
    for (const membro of lista.papeis) {
      for (const participacao of membro.membroDe) {
        if (papelDoSistema(participacao.papel)) continue;
        expect(nomes.has(participacao.papel)).toBe(true);
        expect(papel(participacao.papel).membros.map((item) => item.papel)).toContain(membro.nome);
      }
    }
  });

  it('desenha um caso para cada situação', () => {
    const contexto = contextoDe(lista);
    const situacoes = Object.fromEntries(lista.papeis.map((item) => [item.nome, situacoesDoPapel(item, contexto)]));

    expect(situacoes).toMatchObject({
      postgres: [],
      migracao: ['SUPERUSUARIO'],
      relatorio_bi: ['VALIDADE_DA_SENHA'],
      loja_analise: ['VALIDADE_DA_SENHA'],
      auditoria_app: ['SENHA_MD5'],
      fila_pedidos: ['PERTO_DO_LIMITE'],
      integracao_erp: ['SEM_USO'],
      relatorios_antigos: ['GRUPO_VAZIO'],
      loja_app: [],
      leitura: [],
      loja_admin: [],
      loja_auditoria: [],
      exportacao_temp: [],
    });
    expect(estadoDoUsoDoPapel(papel('exportacao_temp'), contexto)).toBe('EM_OBSERVACAO');
  });

  it('esvazia a lista quando pedido', () => {
    expect(gerarPapeis(agora, 'loja_app', true).papeis).toEqual([]);
  });
});
