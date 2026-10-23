import { useMemo } from 'react';
import { ArrowLeft, ArrowRight, LayoutDashboard } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TelaDeErroHttp } from '@/componentes/comum/TelaDeErroHttp';
import { TerminalPsql } from '@/componentes/comum/TerminalPsql';
import type { LinhaDoTerminal } from '@/componentes/comum/TerminalPsql';
import { Botao } from '@/componentes/ui';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { CodigoPermissao } from '@/modelos/administracao';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import type { TelaDoOrynt } from '@/regras/permissoesConta';
import { telasPermitidas } from '@/regras/permissoesConta';
import { caminhos } from '@/rotas/caminhos';
import estilos from '@/componentes/comum/MolduraDeErro.module.css';

interface SemAcessoNaTelaProps {
  tela: TelaDoOrynt;
}

const ESPERA_DO_ERRO_MS = 520;
const ESPERA_DO_DETALHE_MS = 260;
const ESPERA_DA_DICA_MS = 420;

const TABELA_DA_PERMISSAO: Partial<Record<CodigoPermissao, string>> = {
  DASHBOARD_VER: 'painel',
  RELATORIOS_VER: 'relatorios',
  CONSULTAS_VER: 'consultas',
  OBJETOS_VER: 'objetos',
  BANCO_ACESSOS_VER: 'acessos_do_banco',
  ADMIN_USUARIOS: 'contas',
  ADMIN_AUDITORIA: 'auditoria',
};

function ultimoNivel(rotulo: string): string {
  return rotulo.split(' › ').pop() ?? rotulo;
}

function linhasDaTentativa(tabela: string, conta: string): LinhaDoTerminal[] {
  return [
    {
      tipo: 'COMANDO',
      prompt: 'orynt=>',
      trechos: [
        { texto: 'SELECT', tipo: 'palavra' },
        { texto: ' * ' },
        { texto: 'FROM', tipo: 'palavra' },
        { texto: ` orynt.${tabela};` },
      ],
    },
    {
      tipo: 'SAIDA',
      espera: ESPERA_DO_ERRO_MS,
      espacoAntes: true,
      trechos: [{ texto: 'ERRO:', tipo: 'erro' }, { texto: '  permissão negada para tabela ' }, { texto: tabela, tipo: 'forte' }],
    },
    {
      tipo: 'SAIDA',
      espera: ESPERA_DO_DETALHE_MS,
      trechos: [
        { texto: 'DETALHE:', tipo: 'apagado' },
        { texto: '  a conta ' },
        { texto: conta, tipo: 'forte' },
        { texto: ' não tem permissão para abrir esta tela.' },
      ],
    },
    {
      tipo: 'SAIDA',
      espera: ESPERA_DA_DICA_MS,
      espacoAntes: true,
      trechos: [
        { texto: 'DICA:', tipo: 'aviso' },
        { texto: `  peça a quem administra o ${NOME_APLICACAO} para liberar o acesso.` },
      ],
    },
  ];
}

export function SemAcessoNaTela({ tela }: SemAcessoNaTelaProps) {
  const { usuario } = useAutenticacao();
  const navegar = useNavigate();
  const { key } = useLocation();
  useTituloDocumento(`${tela.rotulo}: sem acesso`);

  const permitidas = telasPermitidas(usuario);
  const veODashboard = permitidas.some((permitida) => permitida.caminho === caminhos.dashboard);
  const destino = permitidas[0];
  const tabela = (tela.permissao && TABELA_DA_PERMISSAO[tela.permissao]) || 'telas';
  const conta = usuario?.email ?? 'sua conta';
  const linhas = useMemo(() => linhasDaTentativa(tabela, conta), [tabela, conta]);
  const podeVoltar = key !== 'default';

  return (
    <TelaDeErroHttp
      terminal={<TerminalPsql key={tela.caminho} linhas={linhas} codigo="403" tom="erro" />}
      sobretitulo="Erro 403"
      titulo="Sem acesso a esta tela"
      descricao={
        <>
          Sua conta não tem permissão para abrir <strong className={estilos.nomeDaTela}>{tela.rotulo}</strong>. Quem
          administra o {NOME_APLICACAO} na sua equipe pode liberar o acesso. A tentativa ficou registrada na auditoria.
        </>
      }
      acoes={
        <>
          {veODashboard ? (
            <Botao icone={LayoutDashboard} onClick={() => navegar(caminhos.dashboard)}>
              Ir para o Dashboard
            </Botao>
          ) : destino ? (
            <Botao iconeDireita={ArrowRight} className={estilos.abrirSugestao} onClick={() => navegar(destino.caminho)}>
              Abrir {ultimoNivel(destino.rotulo)}
            </Botao>
          ) : null}
          {podeVoltar ? (
            <Botao variante="secundario" icone={ArrowLeft} onClick={() => navegar(-1)}>
              Voltar
            </Botao>
          ) : null}
        </>
      }
    />
  );
}
