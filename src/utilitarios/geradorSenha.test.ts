import { describe, expect, it } from 'vitest';
import { avaliarForcaSenha } from '@/regras/forcaSenha';
import { gerarSenha, TAMANHO_DA_SENHA_GERADA } from './geradorSenha';

describe('gerarSenha', () => {
  it('gera uma senha forte do tamanho pedido, com minúscula, maiúscula, dígito e símbolo', () => {
    for (let vez = 0; vez < 50; vez += 1) {
      const senha = gerarSenha();
      expect(senha).toHaveLength(TAMANHO_DA_SENHA_GERADA);
      expect(senha).toMatch(/[a-z]/);
      expect(senha).toMatch(/[A-Z]/);
      expect(senha).toMatch(/[2-9]/);
      expect(senha).toMatch(/[-_.!@#%+=]/);
      expect(avaliarForcaSenha(senha)?.nivel).toBe('FORTE');
    }
  });

  it('não usa caracteres que se confundem nem aspas, que atrapalham ao colar num comando', () => {
    const senhas = Array.from({ length: 200 }, () => gerarSenha()).join('');
    expect(senhas).not.toMatch(/[0O1lI'"\\` ]/);
  });

  it('descarta os sorteios acima do último múltiplo inteiro, para não favorecer os primeiros caracteres', () => {
    const valores = [0xffff_ffff, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let posicao = 0;
    const senha = gerarSenha(4, () => valores[posicao++ % valores.length] ?? 0);
    expect(senha).toHaveLength(4);
  });
});
