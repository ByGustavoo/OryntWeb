import { useCallback, useEffect, useRef, useState } from 'react';
import { ehCancelamento } from '@/api/ErroApi';
import { errosDeCampo } from '@/api/tratamentoErros';
import { interpretarFalhaRecuperacao } from '@/regras/falhaRecuperacao';
import type { FalhaRecuperacao } from '@/regras/falhaRecuperacao';
import {
  CAMPOS_NOVA_SENHA_INICIAIS,
  ESPERA_REENVIO_SEGUNDOS,
  codigoCompleto,
  limparCodigo,
  primeiroCampoNovaSenhaComErro,
  validarCampoNovaSenha,
  validarCamposNovaSenha,
  validarCodigo,
  validarEmailRecuperacao,
} from '@/regras/recuperacaoSenha';
import type {
  CampoNovaSenha,
  CampoRecuperacao,
  CamposNovaSenha,
  ErrosRecuperacao,
  EtapaRecuperacao,
} from '@/regras/recuperacaoSenha';
import { servicoAutenticacao } from '@/servicos';

export type OperacaoRecuperacao = 'SOLICITAR' | 'REENVIAR' | 'VERIFICAR' | 'REDEFINIR';

export type FaseRecuperacao =
  | { tipo: 'INICIAL' }
  | { tipo: 'ENVIANDO'; operacao: OperacaoRecuperacao }
  | { tipo: 'ERRO'; falha: FalhaRecuperacao };

interface OpcoesFluxoRecuperacao {
  emailInicial: string;
  aoConcluir: (email: string) => void;
  aoPedirFoco: (campo: CampoRecuperacao) => void;
}

const INICIAL: FaseRecuperacao = { tipo: 'INICIAL' };

export function useFluxoRecuperacaoSenha({ emailInicial, aoConcluir, aoPedirFoco }: OpcoesFluxoRecuperacao) {
  const [etapa, setEtapa] = useState<EtapaRecuperacao>('EMAIL');
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState('');
  const [senhas, setSenhas] = useState<CamposNovaSenha>(CAMPOS_NOVA_SENHA_INICIAIS);
  const [erros, setErros] = useState<ErrosRecuperacao>({});
  const [fase, setFase] = useState<FaseRecuperacao>(INICIAL);
  const [reenvioLiberadoEm, setReenvioLiberadoEm] = useState<number | null>(null);
  const [reenviado, setReenviado] = useState(false);
  const controlador = useRef<AbortController | null>(null);
  const emAndamento = useRef(false);
  const tokenRedefinicao = useRef<string | null>(null);

  useEffect(() => () => controlador.current?.abort(), []);

  const iniciar = useCallback((operacao: OperacaoRecuperacao): AbortController => {
    const tentativa = new AbortController();
    controlador.current = tentativa;
    emAndamento.current = true;
    setFase({ tipo: 'ENVIANDO', operacao });
    return tentativa;
  }, []);

  const alterarEmail = useCallback((valor: string) => {
    setEmail(valor);
    setErros((anteriores) => (anteriores.email ? { ...anteriores, email: validarEmailRecuperacao(valor) } : anteriores));
  }, []);

  const validarEmailAoSair = useCallback((valor: string) => {
    if (!valor) return;
    setErros((anteriores) => ({ ...anteriores, email: validarEmailRecuperacao(valor) }));
  }, []);

  const pedirCodigo = useCallback(
    async (operacao: 'SOLICITAR' | 'REENVIAR') => {
      if (emAndamento.current) return;

      const erroDoEmail = validarEmailRecuperacao(email);
      if (erroDoEmail) {
        setErros({ email: erroDoEmail });
        setFase(INICIAL);
        aoPedirFoco('email');
        return;
      }

      const tentativa = iniciar(operacao);
      try {
        await servicoAutenticacao.solicitarRecuperacao({ email: email.trim() }, tentativa.signal);
        if (tentativa.signal.aborted) return;
        emAndamento.current = false;
        setCodigo('');
        setErros({});
        setReenvioLiberadoEm(Date.now() + ESPERA_REENVIO_SEGUNDOS * 1000);
        setReenviado(operacao === 'REENVIAR');
        setEtapa('CODIGO');
        setFase(INICIAL);
        if (operacao === 'REENVIAR') aoPedirFoco('codigo');
      } catch (erro) {
        if (tentativa.signal.aborted || ehCancelamento(erro)) return;
        emAndamento.current = false;
        setErros(operacao === 'SOLICITAR' ? errosDeCampo<CampoRecuperacao>(erro) : {});
        setFase({ tipo: 'ERRO', falha: interpretarFalhaRecuperacao(erro, 'EMAIL') });
      }
    },
    [email, iniciar, aoPedirFoco],
  );

  const solicitarCodigo = useCallback(() => pedirCodigo('SOLICITAR'), [pedirCodigo]);

  const reenviarCodigo = useCallback(() => {
    if (reenvioLiberadoEm !== null && Date.now() < reenvioLiberadoEm) return Promise.resolve();
    return pedirCodigo('REENVIAR');
  }, [pedirCodigo, reenvioLiberadoEm]);

  const verificarCodigo = useCallback(
    async (codigoInformado?: string) => {
      if (emAndamento.current) return;

      const valor = codigoInformado ?? codigo;
      const erroDoCodigo = validarCodigo(valor);
      if (erroDoCodigo) {
        setErros({ codigo: erroDoCodigo });
        setFase(INICIAL);
        aoPedirFoco('codigo');
        return;
      }

      const tentativa = iniciar('VERIFICAR');
      setReenviado(false);
      try {
        const liberada = await servicoAutenticacao.verificarCodigoRecuperacao(
          { email: email.trim(), codigo: valor },
          tentativa.signal,
        );
        if (tentativa.signal.aborted) return;
        emAndamento.current = false;
        tokenRedefinicao.current = liberada.tokenRedefinicao;
        setCodigo('');
        setErros({});
        setSenhas(CAMPOS_NOVA_SENHA_INICIAIS);
        setEtapa('SENHA');
        setFase(INICIAL);
      } catch (erro) {
        if (tentativa.signal.aborted || ehCancelamento(erro)) return;
        emAndamento.current = false;
        const falha = interpretarFalhaRecuperacao(erro, 'CODIGO');
        if (falha.motivo === 'CODIGO_INVALIDO') {
          setCodigo('');
          setErros({ codigo: `${falha.titulo}. ${falha.descricao}` });
          setFase(INICIAL);
        } else {
          if (falha.motivo === 'TENTATIVAS_ESGOTADAS') setCodigo('');
          setErros({});
          setFase({ tipo: 'ERRO', falha });
        }
        aoPedirFoco('codigo');
      }
    },
    [codigo, email, iniciar, aoPedirFoco],
  );

  const alterarCodigo = useCallback(
    (valor: string) => {
      if (emAndamento.current) return;
      const limpo = limparCodigo(valor);
      if (limpo === codigo) return;
      setCodigo(limpo);
      setErros((anteriores) => (anteriores.codigo ? { ...anteriores, codigo: undefined } : anteriores));
      if (codigoCompleto(limpo)) void verificarCodigo(limpo);
    },
    [codigo, verificarCodigo],
  );

  const trocarEmail = useCallback(() => {
    controlador.current?.abort();
    emAndamento.current = false;
    tokenRedefinicao.current = null;
    setCodigo('');
    setErros({});
    setReenviado(false);
    setEtapa('EMAIL');
    setFase(INICIAL);
  }, []);

  const alterarSenha = useCallback(
    (campo: CampoNovaSenha, valor: string) => {
      const novas = { ...senhas, [campo]: valor };
      setSenhas(novas);
      setErros((anteriores) => ({
        ...anteriores,
        senha: anteriores.senha ? validarCampoNovaSenha('senha', novas) : undefined,
        confirmacao: anteriores.confirmacao ? validarCampoNovaSenha('confirmacao', novas) : undefined,
      }));
    },
    [senhas],
  );

  const validarSenhaAoSair = useCallback(
    (campo: CampoNovaSenha) => {
      if (!senhas[campo]) return;
      setErros((anteriores) => ({
        ...anteriores,
        [campo]: validarCampoNovaSenha(campo, senhas),
        confirmacao:
          campo === 'confirmacao' || senhas.confirmacao ? validarCampoNovaSenha('confirmacao', senhas) : anteriores.confirmacao,
      }));
    },
    [senhas],
  );

  const redefinirSenha = useCallback(async () => {
    if (emAndamento.current) return;

    const errosDeValidacao = validarCamposNovaSenha(senhas);
    const invalido = primeiroCampoNovaSenhaComErro(errosDeValidacao);
    if (invalido) {
      setErros(errosDeValidacao);
      setFase(INICIAL);
      aoPedirFoco(invalido);
      return;
    }

    const tentativa = iniciar('REDEFINIR');
    try {
      await servicoAutenticacao.redefinirSenha(
        { tokenRedefinicao: tokenRedefinicao.current ?? '', senha: senhas.senha },
        tentativa.signal,
      );
      if (tentativa.signal.aborted) return;
      emAndamento.current = false;
      tokenRedefinicao.current = null;
      setSenhas(CAMPOS_NOVA_SENHA_INICIAIS);
      setFase(INICIAL);
      aoConcluir(email.trim());
    } catch (erro) {
      if (tentativa.signal.aborted || ehCancelamento(erro)) return;
      emAndamento.current = false;
      const falha = interpretarFalhaRecuperacao(erro, 'SENHA');
      if (falha.motivo === 'REDEFINICAO_EXPIRADA') {
        tokenRedefinicao.current = null;
        setSenhas(CAMPOS_NOVA_SENHA_INICIAIS);
        setErros({});
        setEtapa('EMAIL');
        setFase({ tipo: 'ERRO', falha });
        return;
      }
      const errosDoServidor = errosDeCampo<CampoRecuperacao>(erro);
      setErros(errosDoServidor);
      setFase({ tipo: 'ERRO', falha });
      if (errosDoServidor.senha) aoPedirFoco('senha');
    }
  }, [senhas, email, iniciar, aoConcluir, aoPedirFoco]);

  return {
    etapa,
    email,
    codigo,
    senhas,
    erros,
    fase,
    falha: fase.tipo === 'ERRO' ? fase.falha : null,
    operacao: fase.tipo === 'ENVIANDO' ? fase.operacao : null,
    reenvioLiberadoEm,
    reenviado,
    alterarEmail,
    validarEmailAoSair,
    solicitarCodigo,
    reenviarCodigo,
    alterarCodigo,
    verificarCodigo,
    trocarEmail,
    alterarSenha,
    validarSenhaAoSair,
    redefinirSenha,
  };
}
