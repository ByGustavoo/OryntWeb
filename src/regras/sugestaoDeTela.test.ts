import { describe, expect, it } from 'vitest';
import { telasDoOrynt } from './permissoesConta';
import { distanciaDeEdicao, sugerirTela } from './sugestaoDeTela';

function sugestao(endereco: string) {
  return sugerirTela(endereco, telasDoOrynt)?.caminho ?? null;
}

describe('distanciaDeEdicao', () => {
  it('conta inserções, remoções e trocas', () => {
    expect(distanciaDeEdicao('dashbord', 'dashboard')).toBe(1);
    expect(distanciaDeEdicao('indexes', 'indices')).toBe(2);
    expect(distanciaDeEdicao('', 'abc')).toBe(3);
    expect(distanciaDeEdicao('igual', 'igual')).toBe(0);
  });
});

describe('sugerirTela', () => {
  it('corrige um erro de digitação no caminho inteiro', () => {
    expect(sugestao('/consulta/todas')).toBe('/consultas/todas');
    expect(sugestao('/dashbord')).toBe('/dashboard');
    expect(sugestao('/relatorios/resumoo')).toBe('/relatorios/resumo');
  });

  it('acha a tela pelo último trecho quando falta o grupo', () => {
    expect(sugestao('/tabelas')).toBe('/objetos/tabelas');
    expect(sugestao('/sessoes')).toBe('/usuarios-e-permissoes/sessoes');
    expect(sugestao('/auditoria')).toBe('/administracao/auditoria');
  });

  it('ignora acentos, maiúsculas, barras repetidas e a barra final', () => {
    expect(sugestao('/Objetos/Funções/')).toBe('/objetos/funcoes');
    expect(sugestao('//consultas//historico')).toBe('/consultas/historico');
    expect(sugestao('/sessões')).toBe('/usuarios-e-permissoes/sessoes');
  });

  it('tolera um nome parecido no último trecho', () => {
    expect(sugestao('/objetos/indexes')).toBe('/objetos/indices');
  });

  it('não sugere nada quando nenhuma tela se parece com o endereço', () => {
    expect(sugestao('/qualquer/coisa')).toBeNull();
    expect(sugestao('/x/404-teste')).toBeNull();
    expect(sugestao('/financeiro')).toBeNull();
  });

  it('só sugere entre as telas recebidas', () => {
    const semObjetos = telasDoOrynt.filter((tela) => !tela.caminho.startsWith('/objetos'));
    expect(sugerirTela('/tabelas', semObjetos)).toBeNull();
    expect(sugerirTela('/tabelas', [])).toBeNull();
  });
});
