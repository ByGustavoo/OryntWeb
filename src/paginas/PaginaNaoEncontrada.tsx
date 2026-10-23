import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LayoutDashboard, LogIn } from 'lucide-react';
import { TelaDeErroHttp } from '@/componentes/comum/TelaDeErroHttp';
import { TerminalPsql } from '@/componentes/comum/TerminalPsql';
import type { LinhaDoTerminal } from '@/componentes/comum/TerminalPsql';
import { Botao } from '@/componentes/ui';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { telasPermitidas } from '@/regras/permissoesConta';
import { sugerirTela } from '@/regras/sugestaoDeTela';
import { caminhos } from '@/rotas/caminhos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from '@/componentes/comum/MolduraDeErro.module.css';

const ESPERA_DA_EXECUCAO_MS = 460;
const ESPERA_DA_DICA_MS = 520;

function decodificar(endereco: string): string {
  try {
    return decodeURIComponent(endereco);
  } catch {
    return endereco;
  }
}

function linhasDaBusca(endereco: string, sugestao: { caminho: string; rotulo: string } | null): LinhaDoTerminal[] {
  const dica: LinhaDoTerminal[] = sugestao
    ? [
        {
          tipo: 'SAIDA',
          espera: ESPERA_DA_DICA_MS,
          espacoAntes: true,
          trechos: [
            { texto: 'DICA:', tipo: 'aviso' },
            { texto: ' você quis dizer ' },
            { texto: `'${sugestao.caminho}'`, tipo: 'literal' },
            { texto: '?' },
          ],
        },
        { tipo: 'SAIDA', recuo: '6ch', trechos: [{ texto: sugestao.rotulo, tipo: 'apagado' }] },
      ]
    : [
        {
          tipo: 'SAIDA',
          espera: ESPERA_DA_DICA_MS,
          espacoAntes: true,
          trechos: [{ texto: 'DICA:', tipo: 'aviso' }, { texto: ' confira o endereço ou volte para o Dashboard.' }],
        },
      ];

  return [
    {
      tipo: 'COMANDO',
      prompt: 'orynt=>',
      trechos: [
        { texto: 'SELECT', tipo: 'palavra' },
        { texto: ' caminho, titulo ' },
        { texto: 'FROM', tipo: 'palavra' },
        { texto: ' telas' },
      ],
    },
    {
      tipo: 'COMANDO',
      prompt: 'orynt->',
      trechos: [
        { texto: ' ' },
        { texto: 'WHERE', tipo: 'palavra' },
        { texto: ' caminho = ' },
        { texto: `'${endereco}'`, tipo: 'literal' },
        { texto: ';' },
      ],
    },
    {
      tipo: 'SAIDA',
      espera: ESPERA_DA_EXECUCAO_MS,
      espacoAntes: true,
      trechos: [{ texto: ' caminho | titulo', tipo: 'forte' }],
    },
    { tipo: 'SAIDA', trechos: [{ texto: '---------+--------', tipo: 'apagado' }] },
    { tipo: 'SAIDA', trechos: [{ texto: '(0 linhas)', tipo: 'apagado' }] },
    ...dica,
  ];
}

export default function PaginaNaoEncontrada() {
  useTituloDocumento('Página não encontrada');
  const navegar = useNavigate();
  const { pathname, key } = useLocation();
  const { situacao, usuario } = useAutenticacao();
  const autenticada = situacao === 'AUTENTICADA';
  const podeVoltar = key !== 'default';
  const endereco = decodificar(pathname);

  const sugestao = autenticada ? sugerirTela(endereco, telasPermitidas(usuario)) : null;
  const linhas = useMemo(() => linhasDaBusca(endereco, sugestao), [endereco, sugestao]);

  return (
    <TelaDeErroHttp
      terminal={<TerminalPsql key={endereco} linhas={linhas} codigo="404" />}
      sobretitulo="Erro 404"
      titulo="Página não encontrada"
      descricao={
        <>
          Nenhuma tela do {NOME_APLICACAO} responde pelo endereço{' '}
          <code className={juntarClasses(estilos.endereco, 'codigo')}>{endereco}</code>.{' '}
          {sugestao ? (
            <>
              A mais parecida é <strong className={estilos.nomeDaTela}>{sugestao.rotulo}</strong>.
            </>
          ) : (
            'Ele pode ter sido digitado com um erro ou pertencer a uma tela que mudou de lugar.'
          )}
        </>
      }
      acoes={
        <>
          {sugestao ? (
            <Botao iconeDireita={ArrowRight} className={estilos.abrirSugestao} onClick={() => navegar(sugestao.caminho)}>
              Abrir {sugestao.rotulo}
            </Botao>
          ) : null}
          {autenticada ? (
            <Botao
              variante={sugestao ? 'secundario' : 'primario'}
              icone={LayoutDashboard}
              onClick={() => navegar(caminhos.dashboard)}
            >
              Ir para o Dashboard
            </Botao>
          ) : (
            <Botao icone={LogIn} onClick={() => navegar(caminhos.login)}>
              Ir para a tela de login
            </Botao>
          )}
          {podeVoltar ? (
            <Botao variante={sugestao ? 'terciario' : 'secundario'} icone={ArrowLeft} onClick={() => navegar(-1)}>
              Voltar
            </Botao>
          ) : null}
        </>
      }
    />
  );
}
