import { describe, expect, it } from 'vitest';
import { ErroApi } from './ErroApi';
import { descreverFalha, ehErroApi, errosDeCampo, lerErrorResponse } from './tratamentoErros';

const respostaValidacao = {
  status: 400,
  title: 'Erro de Validação!',
  instance: '/api/tarefas',
  type: '/api/problems/validation-error',
  detail: 'A requisição contém dados inválidos!',
  errors: [
    { campo: 'titulo', mensagem: 'Informe um título para a tarefa.' },
    { campo: 'recorrencia.dataFim', mensagem: 'O término precisa ser depois do início.' },
  ],
};

describe('lerErrorResponse', () => {
  it('lê os cinco campos do ErrorResponseDTO e os erros de campo', () => {
    const lida = lerErrorResponse(respostaValidacao, 400);
    expect(lida).toEqual({ ...respostaValidacao });
  });

  it('aceita a resposta sem a lista de erros de campo', () => {
    const lida = lerErrorResponse(
      { status: 404, title: 'Registro não encontrado!', instance: '/api/tarefas/15', type: '/api/problems/entity-not-found', detail: 'A tarefa não existe.' },
      404,
    );
    expect(lida?.errors).toEqual([]);
    expect(lida?.detail).toBe('A tarefa não existe.');
  });

  it('usa o status HTTP quando o corpo não traz status', () => {
    expect(lerErrorResponse({ title: 'Conflito', detail: 'Nome repetido.' }, 409)?.status).toBe(409);
  });

  it('descarta corpos que não são um ErrorResponseDTO', () => {
    expect(lerErrorResponse('<html>Bad Gateway</html>', 502)).toBeNull();
    expect(lerErrorResponse(undefined, 500)).toBeNull();
    expect(lerErrorResponse([{ campo: 'x' }], 400)).toBeNull();
    expect(lerErrorResponse({ status: 500 }, 500)).toBeNull();
  });

  it('ignora itens malformados na lista de erros', () => {
    const lida = lerErrorResponse({ ...respostaValidacao, errors: [{ campo: 'titulo' }, null, { campo: 'data', mensagem: 'Data inválida.' }] }, 400);
    expect(lida?.errors).toEqual([{ campo: 'data', mensagem: 'Data inválida.' }]);
  });
});

describe('errosDeCampo', () => {
  it('indexa pelo nome do campo e pelo último trecho de campos aninhados', () => {
    const erro = new ErroApi('VALIDACAO', 'Inválido', 400, lerErrorResponse(respostaValidacao, 400));
    expect(errosDeCampo(erro)).toEqual({
      titulo: 'Informe um título para a tarefa.',
      'recorrencia.dataFim': 'O término precisa ser depois do início.',
      dataFim: 'O término precisa ser depois do início.',
    });
  });

  it('devolve vazio para erros que não vieram da API', () => {
    expect(errosDeCampo(new Error('falhou'))).toEqual({});
  });
});

describe('descreverFalha', () => {
  const com = (tipo: ConstructorParameters<typeof ErroApi>[0], detail = 'Detalhe escrito pelo backend.') =>
    new ErroApi(tipo, detail, 0, { status: 0, title: 'Título', instance: '/api/x', type: '/api/problems/x', detail });

  it('mostra o detail da API em validação, não encontrado e conflito', () => {
    expect(descreverFalha(com('VALIDACAO'))).toBe('Detalhe escrito pelo backend.');
    expect(descreverFalha(com('NAO_ENCONTRADO'))).toBe('Detalhe escrito pelo backend.');
    expect(descreverFalha(com('CONFLITO'))).toBe('Detalhe escrito pelo backend.');
  });

  it('não expõe o detail técnico de erros do servidor', () => {
    expect(descreverFalha(com('SERVIDOR', 'NullPointerException em TarefaService'))).toBe(
      'O servidor encontrou um problema. Tente de novo daqui a pouco.',
    );
  });

  it('explica falhas de rede e de tempo esgotado sem resposta da API', () => {
    expect(descreverFalha(new ErroApi('REDE', 'x'))).toBe('Verifique a conexão e tente de novo.');
    expect(descreverFalha(new ErroApi('TEMPO_ESGOTADO', 'x'))).toBe('O servidor demorou demais para responder. Tente de novo.');
  });

  it('usa um texto padrão quando a API não informa o detail', () => {
    expect(descreverFalha(new ErroApi('NAO_ENCONTRADO', 'x', 404))).toBe(
      'O registro não existe mais. Ele pode ter sido excluído em outra tela.',
    );
  });

  it('trata erros inesperados de JavaScript', () => {
    expect(descreverFalha(new TypeError('x is undefined'))).toBe('Algo inesperado aconteceu. Tente de novo.');
  });
});

describe('ehErroApi', () => {
  it('confere o tipo quando informado', () => {
    const erro = new ErroApi('CONFLITO', 'x', 409);
    expect(ehErroApi(erro)).toBe(true);
    expect(ehErroApi(erro, 'CONFLITO', 'VALIDACAO')).toBe(true);
    expect(ehErroApi(erro, 'NAO_ENCONTRADO')).toBe(false);
    expect(ehErroApi(new Error('x'))).toBe(false);
  });
});
