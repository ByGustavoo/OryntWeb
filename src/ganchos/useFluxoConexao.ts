import { useCallback, useEffect, useRef, useState } from 'react';
import { ehCancelamento } from '@/api/ErroApi';
import { errosDeCampo } from '@/api/tratamentoErros';
import type { ConexaoDTO, CredenciaisConexaoDTO, TesteConexaoDTO } from '@/modelos/conexao';
import { REVISAO_DO_CAMPO, interpretarFalhaConexao } from '@/regras/falhaConexao';
import type { FalhaConexao } from '@/regras/falhaConexao';
import {
  CAMPOS_CONEXAO_INICIAIS,
  montarCredenciais,
  primeiroCampoComErro,
  validarCampo,
  validarConexao,
} from '@/regras/validacaoConexao';
import type { CampoConexao, CamposConexao, ErrosConexao } from '@/regras/validacaoConexao';
import { servicoConexao } from '@/servicos';

export type OperacaoConexao = 'CONECTAR' | 'TESTAR';

export type FaseConexao =
  | { tipo: 'INICIAL' }
  | { tipo: 'ENVIANDO'; operacao: OperacaoConexao }
  | { tipo: 'ERRO'; operacao: OperacaoConexao; falha: FalhaConexao }
  | { tipo: 'SUCESSO'; conexao: ConexaoDTO };

interface OpcoesFluxoConexao {
  aoConectar: (conexao: ConexaoDTO) => void;
  aoEncontrarCampoInvalido: (campo: CampoConexao) => void;
}

const INICIAL: FaseConexao = { tipo: 'INICIAL' };

function errosDaFalha(falha: FalhaConexao, erro: unknown): ErrosConexao {
  const erros: ErrosConexao = errosDeCampo<CampoConexao>(erro);
  for (const campo of falha.campos) erros[campo] ??= REVISAO_DO_CAMPO[campo];
  return erros;
}

export function useFluxoConexao({ aoConectar, aoEncontrarCampoInvalido }: OpcoesFluxoConexao) {
  const [campos, setCampos] = useState<CamposConexao>(CAMPOS_CONEXAO_INICIAIS);
  const [erros, setErros] = useState<ErrosConexao>({});
  const [fase, setFase] = useState<FaseConexao>(INICIAL);
  const [teste, setTeste] = useState<TesteConexaoDTO | null>(null);
  const controlador = useRef<AbortController | null>(null);

  useEffect(() => () => controlador.current?.abort(), []);

  const alterarCampo = useCallback((campo: CampoConexao, valor: string) => {
    setCampos((anteriores) => ({ ...anteriores, [campo]: valor }));
    setErros((anteriores) => (anteriores[campo] ? { ...anteriores, [campo]: validarCampo(campo, valor) } : anteriores));
    setTeste(null);
  }, []);

  const validarAoSair = useCallback((campo: CampoConexao, valor: string) => {
    setErros((anteriores) => ({ ...anteriores, [campo]: validarCampo(campo, valor) }));
  }, []);

  const preencher = useCallback((novos: Partial<CamposConexao>) => {
    setCampos((anteriores) => ({ ...anteriores, ...novos }));
    setErros({});
    setTeste(null);
    setFase(INICIAL);
  }, []);

  const executar = useCallback(
    async (operacao: OperacaoConexao) => {
      const errosDeValidacao = validarConexao(campos);
      setErros(errosDeValidacao);
      const invalido = primeiroCampoComErro(errosDeValidacao);
      if (invalido) {
        setFase(INICIAL);
        aoEncontrarCampoInvalido(invalido);
        return;
      }

      const credenciais: CredenciaisConexaoDTO = montarCredenciais(campos);
      controlador.current?.abort();
      const tentativa = new AbortController();
      controlador.current = tentativa;
      setTeste(null);
      setFase({ tipo: 'ENVIANDO', operacao });

      try {
        if (operacao === 'TESTAR') {
          const resultado = await servicoConexao.testarConexao(credenciais, tentativa.signal);
          if (tentativa.signal.aborted) return;
          setTeste(resultado);
          setFase(INICIAL);
          return;
        }
        const conexao = await servicoConexao.conectar(credenciais, tentativa.signal);
        if (tentativa.signal.aborted) return;
        setCampos((anteriores) => ({ ...anteriores, senha: '' }));
        setFase({ tipo: 'SUCESSO', conexao });
        aoConectar(conexao);
      } catch (erro) {
        if (tentativa.signal.aborted || ehCancelamento(erro)) return;
        const falha = interpretarFalhaConexao(erro, credenciais);
        setErros(errosDaFalha(falha, erro));
        setFase({ tipo: 'ERRO', operacao, falha });
      }
    },
    [campos, aoConectar, aoEncontrarCampoInvalido],
  );

  const cancelarTentativa = useCallback(() => {
    controlador.current?.abort();
    setFase(INICIAL);
  }, []);

  const descartarSenha = useCallback(() => {
    setCampos((anteriores) => (anteriores.senha ? { ...anteriores, senha: '' } : anteriores));
  }, []);

  const reiniciar = useCallback(() => {
    controlador.current?.abort();
    setCampos(CAMPOS_CONEXAO_INICIAIS);
    setErros({});
    setTeste(null);
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
    conectar: () => executar('CONECTAR'),
    testar: () => executar('TESTAR'),
    cancelarTentativa,
    descartarSenha,
    reiniciar,
  };
}
