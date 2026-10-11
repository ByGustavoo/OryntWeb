import { Suspense, lazy, useCallback } from 'react';
import { MarcaOrynt } from '@/componentes/comum/MarcaOrynt';
import { NomeOrynt } from '@/componentes/comum/NomeOrynt';
import { BotaoTema } from '@/componentes/layout/BotaoTema';
import { FormularioAcesso } from '@/componentes/login/FormularioAcesso';
import { PainelMonitoramento } from '@/componentes/login/PainelMonitoramento';
import { focarCampoAcesso, selecionarCampoAcesso } from '@/componentes/login/identificadores';
import { ambiente } from '@/configuracoes/ambiente';
import { ID_CONTEUDO_PRINCIPAL, NOME_APLICACAO } from '@/configuracoes/aplicacao';
import { useConsultaMidia } from '@/ganchos/useConsultaMidia';
import { useFluxoAcesso } from '@/ganchos/useFluxoAcesso';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import type { CamposAcesso } from '@/regras/validacaoAcesso';
import estilos from './PaginaLogin.module.css';

const AcessoDemonstracao = ambiente.dadosSimulados ? lazy(() => import('@/componentes/login/AcessoDemonstracao')) : null;

const CONSULTA_PAINEL_COM_CENA = '(min-width: 640px)';

export default function PaginaLogin() {
  useTituloDocumento('Entrar');
  const { registrarUsuario } = useAutenticacao();
  const painelComCena = useConsultaMidia(CONSULTA_PAINEL_COM_CENA);

  const aoRecusarCredenciais = useCallback(() => selecionarCampoAcesso('senha'), []);

  const fluxo = useFluxoAcesso({
    aoEntrar: registrarUsuario,
    aoEncontrarCampoInvalido: focarCampoAcesso,
    aoRecusarCredenciais,
  });

  const preencherDemonstracao = (campos: CamposAcesso) => {
    fluxo.preencher(campos);
    focarCampoAcesso('senha');
  };

  return (
    <div className={estilos.pagina}>
      <a className="link-pular" href={`#${ID_CONTEUDO_PRINCIPAL}`}>
        Pular para o formulário
      </a>

      <div className={estilos.tema}>
        <BotaoTema />
      </div>

      <main className={estilos.area} id={ID_CONTEUDO_PRINCIPAL} tabIndex={-1}>
        <div className={estilos.coluna}>
          <div className={estilos.marca}>
            <MarcaOrynt tamanho={32} animada />
            <NomeOrynt className={estilos.nome} />
          </div>

          <header className={estilos.cabecalho}>
            <h1 className={estilos.titulo}>Bem-vindo ao {NOME_APLICACAO}</h1>
            <p className={estilos.descricao}>
              Entre para acompanhar o desempenho das consultas do seu PostgreSQL e encontrar o que as deixa lentas.
            </p>
          </header>

          <FormularioAcesso
            campos={fluxo.campos}
            erros={fluxo.erros}
            enviando={fluxo.enviando}
            falha={fluxo.fase.tipo === 'ERRO' ? fluxo.fase.falha : null}
            aoAlterar={fluxo.alterarCampo}
            aoSair={fluxo.validarAoSair}
            aoEntrar={fluxo.entrar}
          />

          {AcessoDemonstracao ? (
            <Suspense fallback={<div className={estilos.reservaDemonstracao} aria-hidden="true" />}>
              <AcessoDemonstracao desabilitado={fluxo.enviando} aoPreencher={preencherDemonstracao} />
            </Suspense>
          ) : null}
        </div>
      </main>

      <PainelMonitoramento comCena={painelComCena} />
    </div>
  );
}
