import { Suspense, lazy, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { TelaVerificacao } from '@/componentes/comum/TelaVerificacao';
import { ConexaoEstabelecida } from '@/componentes/conexao/ConexaoEstabelecida';
import { ConexoesRecentes } from '@/componentes/conexao/ConexoesRecentes';
import { FormularioConexao } from '@/componentes/conexao/FormularioConexao';
import { PainelIdentidade } from '@/componentes/conexao/PainelIdentidade';
import { focarCampoConexao } from '@/componentes/conexao/identificadores';
import { BotaoTema } from '@/componentes/layout/BotaoTema';
import { Nota } from '@/componentes/ui';
import { ambiente } from '@/configuracoes/ambiente';
import { ID_CONTEUDO_PRINCIPAL } from '@/configuracoes/aplicacao';
import { useConexoesRecentes } from '@/ganchos/useConexoesRecentes';
import { useFluxoConexao } from '@/ganchos/useFluxoConexao';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { ConexaoDTO, ConexaoRecente } from '@/modelos/conexao';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { CamposDaUrl } from '@/regras/urlConexao';
import { caminhos } from '@/rotas/caminhos';
import estilos from './PaginaConexao.module.css';

const PainelSimulacao = ambiente.simulacaoControlavel ? lazy(() => import('@/componentes/conexao/PainelSimulacao')) : null;

export default function PaginaConexao() {
  const { situacao, conexao: conexaoAtiva, registrarConexao } = useConexao();
  const { recentes, registrar: registrarRecente, remover: removerRecente } = useConexoesRecentes();
  const navegar = useNavigate();
  const alertaRef = useRef<HTMLDivElement>(null);
  const tituloSucessoRef = useRef<HTMLHeadingElement>(null);

  const aoConectar = useCallback(
    (conexao: ConexaoDTO) => {
      registrarConexao(conexao);
      registrarRecente(conexao);
    },
    [registrarConexao, registrarRecente],
  );

  const fluxo = useFluxoConexao({ aoConectar, aoEncontrarCampoInvalido: focarCampoConexao });
  const { fase } = fluxo;
  const conectado = fase.tipo === 'SUCESSO';

  useTituloDocumento(conectado ? 'Conexão estabelecida' : 'Conectar ao banco');

  useEffect(() => {
    if (fase.tipo === 'ERRO') alertaRef.current?.focus();
    if (fase.tipo === 'SUCESSO') tituloSucessoRef.current?.focus();
  }, [fase]);

  if (situacao === 'VERIFICANDO') return <TelaVerificacao />;

  const escolherRecente = (recente: ConexaoRecente) => {
    fluxo.preencher({
      nome: recente.nome ?? '',
      host: recente.host,
      porta: String(recente.porta),
      banco: recente.banco,
      usuario: recente.usuario,
      senha: '',
    });
    focarCampoConexao('senha');
  };

  const preencherPelaUrl = (campos: CamposDaUrl) => {
    fluxo.preencher({ ...campos, nome: '' });
    focarCampoConexao(campos.senha ? 'nome' : 'senha');
  };

  const substituindoConexao = conexaoAtiva !== null && !conectado;

  return (
    <div className={estilos.pagina}>
      <a className="link-pular" href={`#${ID_CONTEUDO_PRINCIPAL}`}>
        Pular para o formulário
      </a>

      <PainelIdentidade demonstracao={ambiente.dadosSimulados} />

      <main className={estilos.area} id={ID_CONTEUDO_PRINCIPAL} tabIndex={-1}>
        <div className={estilos.barra}>
          <BotaoTema />
        </div>

        <div className={estilos.coluna}>
          {fase.tipo === 'SUCESSO' ? (
            <ConexaoEstabelecida
              ref={tituloSucessoRef}
              conexao={fase.conexao}
              aoAcessarDashboard={() => navegar(caminhos.dashboard)}
              aoConfigurarOutra={fluxo.reiniciar}
            />
          ) : (
            <>
              <header className={estilos.cabecalho}>
                <h1 className={estilos.titulo}>{substituindoConexao ? 'Nova conexão' : 'Conectar ao banco de dados'}</h1>
                <p className={estilos.descricao}>
                  Informe os dados de acesso do seu PostgreSQL. Se preferir, cole a URL de conexão e os campos são
                  preenchidos para você.
                </p>
              </header>

              {ambiente.dadosSimulados ? (
                <Nota tom="aviso" icone={FlaskConical} titulo="Conexão simulada.">
                  Nesta versão o Orynt ainda não acessa bancos reais. Qualquer dado válido conecta, e o que aparece
                  depois é demonstrativo.
                </Nota>
              ) : null}

              {substituindoConexao && conexaoAtiva ? (
                <Nota tom="info">
                  Você está conectado a <strong>{conexaoAtiva.nome}</strong>. Conectar a outro banco encerra essa conexão.
                </Nota>
              ) : null}

              <ConexoesRecentes
                recentes={recentes}
                desabilitado={fluxo.enviando}
                aoEscolher={escolherRecente}
                aoRemover={removerRecente}
              />

              <FormularioConexao
                campos={fluxo.campos}
                erros={fluxo.erros}
                operacaoEmAndamento={fase.tipo === 'ENVIANDO' ? fase.operacao : null}
                falha={fase.tipo === 'ERRO' ? { falha: fase.falha, operacao: fase.operacao } : null}
                teste={fluxo.teste}
                podeVoltar={conexaoAtiva !== null}
                alertaRef={alertaRef}
                aoAlterar={fluxo.alterarCampo}
                aoSair={fluxo.validarAoSair}
                aoPreencherPelaUrl={preencherPelaUrl}
                aoConectar={fluxo.conectar}
                aoTestar={fluxo.testar}
                aoCancelarTentativa={fluxo.cancelarTentativa}
                aoVoltar={() => navegar(caminhos.dashboard)}
                aoLimpar={fluxo.reiniciar}
              >
                {PainelSimulacao ? (
                  <Suspense fallback={null}>
                    <PainelSimulacao />
                  </Suspense>
                ) : null}
              </FormularioConexao>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
