import { createHash, createHmac, pbkdf2Sync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ITERACOES_SCRAM, prepararSenha, verificadorScram } from './scram';

function esperado(senha: string, sal: Uint8Array<ArrayBuffer>, iteracoes: number): string {
  const salgada = pbkdf2Sync(senha, sal, iteracoes, 32, 'sha256');
  const chaveDoCliente = createHmac('sha256', salgada).update('Client Key').digest();
  const chaveGuardada = createHash('sha256').update(chaveDoCliente).digest('base64');
  const chaveDoServidor = createHmac('sha256', salgada).update('Server Key').digest('base64');
  return `SCRAM-SHA-256$${iteracoes}:${Buffer.from(sal).toString('base64')}$${chaveGuardada}:${chaveDoServidor}`;
}

describe('verificadorScram', () => {
  const sal = Uint8Array.from({ length: 16 }, (_, indice) => indice * 7 + 3);

  it('monta o verificador no formato do PostgreSQL, igual ao calculado por outra implementação', async () => {
    expect(await verificadorScram('pencil', sal)).toBe(esperado('pencil', sal, ITERACOES_SCRAM));
    expect(await verificadorScram('Senh@ forte 2026', sal, 10)).toBe(esperado('Senh@ forte 2026', sal, 10));
  });

  it('usa um sal novo a cada chamada, então a mesma senha não gera o mesmo texto', async () => {
    const [primeiro, segundo] = await Promise.all([verificadorScram('igual', undefined, 5), verificadorScram('igual', undefined, 5)]);
    expect(primeiro).toMatch(/^SCRAM-SHA-256\$5:[A-Za-z0-9+/]{22}==\$[A-Za-z0-9+/]{43}=:[A-Za-z0-9+/]{43}=$/);
    expect(primeiro).not.toBe(segundo);
  });

  it('nunca deixa a senha no texto', async () => {
    expect(await verificadorScram('minha-senha-secreta', sal, 5)).not.toContain('minha-senha-secreta');
  });
});

describe('prepararSenha', () => {
  it('não mexe numa senha só com ASCII visível', () => {
    expect(prepararSenha('Abc 123 !@#')).toBe('Abc 123 !@#');
  });

  it('aplica o SASLprep: tira o hífen discreto, troca espaços não ASCII e normaliza em NFKC', () => {
    expect(prepararSenha('I­X')).toBe('IX');
    expect(prepararSenha('a b')).toBe('a b');
    expect(prepararSenha('Ⅸ')).toBe('IX');
    expect(prepararSenha('ção')).toBe('ção');
  });

  it('usa a senha como veio quando o SASLprep a recusaria, como o PostgreSQL', () => {
    expect(prepararSenha('a\u0007ç')).toBe('a\u0007ç');
  });
});
