import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleCheck, MailX } from 'lucide-react';
import { CabecalhoAcesso } from '@/componentes/login/CabecalhoAcesso';
import estilosLink from '@/componentes/login/LinkAcesso.module.css';
import { EtapaNovaSenha } from '@/componentes/recuperacao/EtapaNovaSenha';
import { focarCampoRecuperacao } from '@/componentes/recuperacao/identificadores';
import { Nota } from '@/componentes/ui';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useContextoAcesso } from '@/layouts/contextoAcesso';
import type { ConviteValidoDTO } from '@/modelos/autenticacao';
import { interpretarFalhaRecuperacao } from '@/regras/falhaRecuperacao';
import type { FalhaRecuperacao } from '@/regras/falhaRecuperacao';
import {
  CAMPOS_NOVA_SENHA_INICIAIS,
  primeiroCampoNovaSenhaComErro,
  validarCampoNovaSenha,
  validarCamposNovaSenha,
} from '@/regras/recuperacaoSenha';
import type { CampoNovaSenha, CamposNovaSenha, ErrosRecuperacao } from '@/regras/recuperacaoSenha';
import { caminhos } from '@/rotas/caminhos';
import { servicoAutenticacao } from '@/servicos';
import { formatarInstante } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaAtivarConta.module.css';

type Etapa = { tipo: 'VERIFICANDO' } | { tipo: 'INVALIDO' } | { tipo: 'SENHA'; convite: ConviteValidoDTO } | { tipo: 'CONCLUIDO'; email: string };

const PREFIXO_DO_CONVITE = '#convite=';

function lerTokenDoEndereco(): string | null {
  const { hash } = window.location;
  if (!hash.startsWith(PREFIXO_DO_CONVITE)) return null;
  try {
    return decodeURIComponent(hash.slice(PREFIXO_DO_CONVITE.length)) || null;
  } catch {
    return null;
  }
}

export default function PaginaAtivarConta() {
  useTituloDocumento('Ativar conta');
  const { lembrarEmail } = useContextoAcesso();
  const [token] = useState(lerTokenDoEndereco);
  const [etapa, setEtapa] = useState<Etapa>(token ? { tipo: 'VERIFICANDO' } : { tipo: 'INVALIDO' });
  const [senhas, setSenhas] = useState<CamposNovaSenha>(CAMPOS_NOVA_SENHA_INICIAIS);
  const [erros, setErros] = useState<ErrosRecuperacao>({});
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<FalhaRecuperacao | null>(null);

  useEffect(() => {
    if (!window.location.hash) return;
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, '', `${pathname}${search}`);
  }, []);

  useEffect(() => {
    if (!token) return;
    const controlador = new AbortController();
    servicoAutenticacao
      .verificarConvite({ token }, controlador.signal)
      .then((convite) => setEtapa({ tipo: 'SENHA', convite }))
      .catch(() => {
        if (!controlador.signal.aborted) setEtapa({ tipo: 'INVALIDO' });
      });
    return () => controlador.abort();
  }, [token]);

  useEffect(() => {
    if (etapa.tipo === 'SENHA') focarCampoRecuperacao('senha');
  }, [etapa.tipo]);

  const alterar = (campo: CampoNovaSenha, valor: string) => {
    const novas = { ...senhas, [campo]: valor };
    setSenhas(novas);
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: validarCampoNovaSenha(campo, novas) }));
  };

  const sair = (campo: CampoNovaSenha) => {
    if (!senhas[campo]) return;
    setErros((atuais) => ({ ...atuais, [campo]: validarCampoNovaSenha(campo, senhas) }));
  };

  const salvar = async () => {
    if (etapa.tipo !== 'SENHA' || !token || salvando) return;
    const encontrados = validarCamposNovaSenha(senhas);
    setErros(encontrados);
    const primeiro = primeiroCampoNovaSenhaComErro(encontrados);
    if (primeiro) {
      focarCampoRecuperacao(primeiro);
      return;
    }
    setSalvando(true);
    setFalha(null);
    try {
      await servicoAutenticacao.aceitarConvite({ token, senha: senhas.senha });
      setSenhas(CAMPOS_NOVA_SENHA_INICIAIS);
      lembrarEmail(etapa.convite.email);
      setEtapa({ tipo: 'CONCLUIDO', email: etapa.convite.email });
    } catch (erro) {
      setFalha(interpretarFalhaRecuperacao(erro, 'SENHA'));
      setSalvando(false);
    }
  };

  if (etapa.tipo === 'VERIFICANDO') {
    return (
      <CabecalhoAcesso titulo="Conferindo o convite">
        Um instante enquanto o {NOME_APLICACAO} confere o link.
      </CabecalhoAcesso>
    );
  }

  if (etapa.tipo === 'INVALIDO') {
    return (
      <>
        <CabecalhoAcesso titulo="Este convite não vale mais">
          O link expirou, já foi usado ou foi substituído por um convite mais novo.
        </CabecalhoAcesso>
        <Nota tom="aviso" icone={MailX} className={estilos.nota}>
          Peça a quem administra o {NOME_APLICACAO} na sua equipe para reenviar o convite. O link novo chega no mesmo e-mail.
        </Nota>
        <Link className={juntarClasses(estilosLink.link, estilos.link)} to={caminhos.login}>
          Ir para o login
          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </>
    );
  }

  if (etapa.tipo === 'CONCLUIDO') {
    return (
      <>
        <CabecalhoAcesso titulo="Conta ativada">
          A senha de <strong>{etapa.email}</strong> foi definida. Entre com ela para começar.
        </CabecalhoAcesso>
        <Nota tom="sucesso" icone={CircleCheck} className={estilos.nota} role="status">
          Se outra conta estiver aberta neste navegador, saia dela antes de entrar com esta.
        </Nota>
        <Link className={juntarClasses(estilosLink.link, estilos.link)} to={caminhos.login}>
          Ir para o login
          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </>
    );
  }

  return (
    <>
      <CabecalhoAcesso titulo="Defina a sua senha">
        Olá, {etapa.convite.nome}. Escolha a senha de <strong>{etapa.convite.email}</strong> para entrar no {NOME_APLICACAO}. O convite
        vale até {formatarInstante(etapa.convite.expiraEm)}.
      </CabecalhoAcesso>
      <EtapaNovaSenha
        email={etapa.convite.email}
        senhas={senhas}
        erros={erros}
        salvando={salvando}
        falha={falha}
        aoAlterar={alterar}
        aoSair={sair}
        aoSalvar={() => void salvar()}
        observacao="Só você conhece esta senha: quem administra o Orynt não a vê em nenhum momento."
        textoDoBotao="Ativar a conta"
      />
    </>
  );
}
