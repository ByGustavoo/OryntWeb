import { describe, expect, it } from 'vitest';
import { interpretarFalhaDeTela, motivoDaFalhaDeTela } from './falhaDeTela';

describe('motivoDaFalhaDeTela', () => {
  it('reconhece um módulo que não chegou ao navegador no Chrome, no Firefox e no Safari', () => {
    const mensagens = [
      'Failed to fetch dynamically imported module: http://localhost:5176/src/paginas/PaginaRecuperacaoSenha.tsx',
      'error loading dynamically imported module: https://orynt.app/assets/PaginaPapeis-CZXB.js',
      'Importing a module script failed.',
      'Unable to preload CSS for /assets/PaginaTabelas-Cfrh.css',
    ];
    for (const mensagem of mensagens) {
      expect(motivoDaFalhaDeTela(new TypeError(mensagem))).toBe('CARREGAMENTO');
    }
  });

  it('reconhece o erro de chunk pelo nome', () => {
    const erro = new Error('Loading chunk 42 failed.');
    erro.name = 'ChunkLoadError';
    expect(motivoDaFalhaDeTela(erro)).toBe('CARREGAMENTO');
  });

  it('trata qualquer outro erro como falha ao montar a tela', () => {
    expect(motivoDaFalhaDeTela(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe('EXECUCAO');
    expect(motivoDaFalhaDeTela('texto solto')).toBe('EXECUCAO');
    expect(motivoDaFalhaDeTela(null)).toBe('EXECUCAO');
  });
});

describe('interpretarFalhaDeTela', () => {
  it('fala da tela dentro da aplicação e do Orynt na tela inteira', () => {
    const erro = new TypeError('Failed to fetch dynamically imported module: /x.js');
    expect(interpretarFalhaDeTela(erro, 'TELA').titulo).toBe('Esta tela não carregou');
    expect(interpretarFalhaDeTela(erro, 'APLICACAO').titulo).toBe('O Orynt não carregou');
    expect(interpretarFalhaDeTela(new Error('x'), 'TELA').titulo).toBe('Esta tela parou de funcionar');
  });

  it('não repete o nome do Orynt no título da aba da tela inteira', () => {
    const erro = new TypeError('Failed to fetch dynamically imported module: /x.js');
    expect(interpretarFalhaDeTela(erro, 'APLICACAO').tituloDaAba).toBe('Não carregou');
    expect(interpretarFalhaDeTela(new Error('x'), 'APLICACAO').tituloDaAba).toBe('Parou de funcionar');
    expect(interpretarFalhaDeTela(erro, 'TELA').tituloDaAba).toBe('Esta tela não carregou');
  });

  it('não expõe o detalhe técnico do erro', () => {
    const falha = interpretarFalhaDeTela(new Error('stack interna'), 'APLICACAO');
    expect(falha.descricao).not.toContain('stack interna');
    expect(falha.linhaDoErro).not.toContain('stack interna');
  });
});
