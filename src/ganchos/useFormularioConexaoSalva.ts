import { useCallback, useEffect, useRef, useState } from 'react';
import { ehCancelamento } from '@/api/ErroApi';
import { errosDeCampo } from '@/api/tratamentoErros';
import type { ConexaoSalvaDTO, EdicaoConexaoDTO, TesteConexaoDTO } from '@/modelos/conexao';
import { REVISAO_DO_CAMPO, interpretarFalhaConexao } from '@/regras/falhaConexao';
import type { FalhaConexao } from '@/regras/falhaConexao';
import { CAMPOS_CONEXAO_INICIAIS, montarCredenciais, primeiroCampoComErro, validarCampo, validarConexao } from '@/regras/validacaoConexao';
import type { CampoConexao, CamposConexao, ErrosConexao } from '@/regras/validacaoConexao';
import { servicoConexao } from '@/servicos';

export type OperacaoConexaoSalva = 'TESTAR' | 'SALVAR';

type Fase =
  | { tipo: 'INICIAL' }
  | { tipo: 'ENVIANDO'; operacao: OperacaoConexaoSalva }
  | { tipo: 'ERRO'; operacao: OperacaoConexaoSalva; falha: FalhaConexao };

const INICIAL: Fase = { tipo: 'INICIAL' };

interface OpcoesDoFormulario {
  conexao: ConexaoSalvaDTO | null;
  aoSalvar: (salva: ConexaoSalvaDTO) => void;
  aoEncontrarCampoInvalido: (campo: CampoConexao) => void;
}

function camposDaConexao(conexao: ConexaoSalvaDTO | null): CamposConexao {
  if (!conexao) return CAMPOS_CONEXAO_INICIAIS;
  return { nome: conexao.nome, host: conexao.host, porta: String(conexao.porta), banco: conexao.banco, usuario: conexao.usuario, senha: '' };
}

function errosDaFalha(falha: FalhaConexao, erro: unknown): ErrosConexao {
  const erros: ErrosConexao = errosDeCampo<CampoConexao>(erro);
  for (const campo of falha.campos) erros[campo] ??= REVISAO_DO_CAMPO[campo];
  return erros;
}

export function useFormularioConexaoSalva({ conexao, aoSalvar, aoEncontrarCampoInvalido }: OpcoesDoFormulario) {
  const [campos, setCampos] = useState<CamposConexao>(() => camposDaConexao(conexao));
  const [erros, setErros] = useState<ErrosConexao>({});
  const [fase, setFase] = useState<Fase>(INICIAL);
  const [teste, setTeste] = useState<TesteConexaoDTO | null>(null);
  const controlador = useRef<AbortController | null>(null);
  const editando = conexao !== null;

  useEffect(() => () => controlador.current?.abort(), []);

  const validarUm = useCallback(
    (campo: CampoConexao, valor: string) => (campo === 'senha' && editando && !valor ? undefined : validarCampo(campo, valor)),
    [editando],
  );

  const alterarCampo = useCallback(
    (campo: CampoConexao, valor: string) => {
      setCampos((anteriores) => ({ ...anteriores, [campo]: valor }));
      setErros((anteriores) => (anteriores[campo] ? { ...anteriores, [campo]: validarUm(campo, valor) } : anteriores));
      setTeste(null);
    },
    [validarUm],
  );

  const validarAoSair = useCallback(
    (campo: CampoConexao, valor: string) => setErros((anteriores) => ({ ...anteriores, [campo]: validarUm(campo, valor) })),
    [validarUm],
  );

  const preencher = useCallback((novos: Partial<CamposConexao>) => {
    setCampos((anteriores) => ({ ...anteriores, ...novos }));
    setErros({});
    setTeste(null);
    setFase(INICIAL);
  }, []);

  const executar = useCallback(
    async (operacao: OperacaoConexaoSalva) => {
      const encontrados = validarConexao(campos);
      if (editando && !campos.senha) delete encontrados.senha;
      setErros(encontrados);
      const invalido = primeiroCampoComErro(encontrados);
      if (invalido) {
        setFase(INICIAL);
        aoEncontrarCampoInvalido(invalido);
        return;
      }

      const credenciais = montarCredenciais(campos);
      const edicao: EdicaoConexaoDTO = {
        nome: credenciais.nome,
        host: credenciais.host,
        porta: credenciais.porta,
        banco: credenciais.banco,
        usuario: credenciais.usuario,
        senha: credenciais.senha || null,
      };
      controlador.current?.abort();
      const tentativa = new AbortController();
      controlador.current = tentativa;
      setTeste(null);
      setFase({ tipo: 'ENVIANDO', operacao });

      try {
        if (operacao === 'TESTAR') {
          const resultado = conexao
            ? await servicoConexao.testarConexaoSalva(conexao.id, edicao, tentativa.signal)
            : await servicoConexao.testarConexao(credenciais, tentativa.signal);
          if (tentativa.signal.aborted) return;
          setTeste(resultado);
          setFase(INICIAL);
          return;
        }
        const salva = conexao
          ? await servicoConexao.editarConexao(conexao.id, edicao, tentativa.signal)
          : await servicoConexao.salvarConexao(credenciais, tentativa.signal);
        if (tentativa.signal.aborted) return;
        setCampos((anteriores) => ({ ...anteriores, senha: '' }));
        setFase(INICIAL);
        aoSalvar(salva);
      } catch (erro) {
        if (tentativa.signal.aborted || ehCancelamento(erro)) return;
        const falha = interpretarFalhaConexao(erro, credenciais);
        setErros(errosDaFalha(falha, erro));
        setFase({ tipo: 'ERRO', operacao, falha });
      }
    },
    [campos, conexao, editando, aoSalvar, aoEncontrarCampoInvalido],
  );

  const cancelarTentativa = useCallback(() => {
    controlador.current?.abort();
    setFase(INICIAL);
  }, []);

  return {
    campos,
    erros,
    fase,
    teste,
    enviando: fase.tipo === 'ENVIANDO',
    alterarCampo,
    validarAoSair,
    preencher,
    salvar: () => executar('SALVAR'),
    testar: () => executar('TESTAR'),
    cancelarTentativa,
  };
}
