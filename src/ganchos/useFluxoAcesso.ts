import { useCallback, useEffect, useRef, useState } from 'react';
import { ehCancelamento } from '@/api/ErroApi';
import { errosDeCampo } from '@/api/tratamentoErros';
import type { UsuarioDTO } from '@/modelos/autenticacao';
import { interpretarFalhaAcesso } from '@/regras/falhaAcesso';
import type { FalhaAcesso } from '@/regras/falhaAcesso';
import {
  CAMPOS_ACESSO_INICIAIS,
  montarCredenciaisAcesso,
  primeiroCampoAcessoComErro,
  validarAcesso,
  validarCampoAcesso,
} from '@/regras/validacaoAcesso';
import type { CampoAcesso, CamposAcesso, ErrosAcesso } from '@/regras/validacaoAcesso';
import { servicoAutenticacao } from '@/servicos';

export type FaseAcesso = { tipo: 'INICIAL' } | { tipo: 'ENVIANDO' } | { tipo: 'ERRO'; falha: FalhaAcesso };

interface OpcoesFluxoAcesso {
  emailInicial?: string;
  aoEntrar: (usuario: UsuarioDTO) => void;
  aoEncontrarCampoInvalido: (campo: CampoAcesso) => void;
  aoRecusarCredenciais: () => void;
}

const INICIAL: FaseAcesso = { tipo: 'INICIAL' };
const ENVIANDO: FaseAcesso = { tipo: 'ENVIANDO' };

export function useFluxoAcesso({ emailInicial = '', aoEntrar, aoEncontrarCampoInvalido, aoRecusarCredenciais }: OpcoesFluxoAcesso) {
  const [campos, setCampos] = useState<CamposAcesso>({ ...CAMPOS_ACESSO_INICIAIS, email: emailInicial });
  const [erros, setErros] = useState<ErrosAcesso>({});
  const [fase, setFase] = useState<FaseAcesso>(INICIAL);
  const controlador = useRef<AbortController | null>(null);
  const emAndamento = useRef(false);

  useEffect(() => () => controlador.current?.abort(), []);

  const alterarCampo = useCallback((campo: CampoAcesso, valor: string) => {
    setCampos((anteriores) => ({ ...anteriores, [campo]: valor }));
    setErros((anteriores) =>
      anteriores[campo] ? { ...anteriores, [campo]: validarCampoAcesso(campo, valor) } : anteriores,
    );
  }, []);

  const validarAoSair = useCallback((campo: CampoAcesso, valor: string) => {
    if (!valor) return;
    setErros((anteriores) => ({ ...anteriores, [campo]: validarCampoAcesso(campo, valor) }));
  }, []);

  const preencher = useCallback((novos: CamposAcesso) => {
    if (emAndamento.current) return;
    setCampos(novos);
    setErros({});
    setFase(INICIAL);
  }, []);

  const entrar = useCallback(async () => {
    if (emAndamento.current) return;

    const errosDeValidacao = validarAcesso(campos);
    setErros(errosDeValidacao);
    const invalido = primeiroCampoAcessoComErro(errosDeValidacao);
    if (invalido) {
      setFase(INICIAL);
      aoEncontrarCampoInvalido(invalido);
      return;
    }

    const tentativa = new AbortController();
    controlador.current = tentativa;
    emAndamento.current = true;
    setFase(ENVIANDO);

    try {
      const usuario = await servicoAutenticacao.entrar(montarCredenciaisAcesso(campos), tentativa.signal);
      if (tentativa.signal.aborted) return;
      setCampos((anteriores) => ({ ...anteriores, senha: '' }));
      aoEntrar(usuario);
    } catch (erro) {
      emAndamento.current = false;
      if (tentativa.signal.aborted || ehCancelamento(erro)) return;
      const falha = interpretarFalhaAcesso(erro);
      setErros(errosDeCampo<CampoAcesso>(erro));
      setFase({ tipo: 'ERRO', falha });
      if (falha.motivo === 'CREDENCIAIS_INCORRETAS') aoRecusarCredenciais();
    }
  }, [campos, aoEntrar, aoEncontrarCampoInvalido, aoRecusarCredenciais]);

  return {
    campos,
    erros,
    fase,
    enviando: fase.tipo === 'ENVIANDO',
    alterarCampo,
    validarAoSair,
    preencher,
    entrar,
  };
}
