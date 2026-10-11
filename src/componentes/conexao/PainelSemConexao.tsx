import { Plus, Unplug } from 'lucide-react';
import { Botao, EstadoErro, EstadoVazio, IndicadorGiratorio, Painel } from '@/componentes/ui';
import { useConexao } from '@/provedores/ProvedorConexao';
import { useNovaConexao } from '@/provedores/ProvedorNovaConexao';
import { enderecoConexao } from '@/regras/conexoesSalvas';
import { ListaConexoesSalvas } from './ListaConexoesSalvas';
import estilos from './PainelSemConexao.module.css';

export function PainelSemConexao() {
  const { situacao, salvas, alvo, falhaReconexao, erroVerificacao, verificandoDeNovo, ativarConexao, verificarNovamente } =
    useConexao();
  const { abrir: abrirNovaConexao } = useNovaConexao();

  if (situacao === 'INDISPONIVEL') {
    return (
      <Painel aria-label="Conexão com o banco">
        <EstadoErro
          titulo="Não foi possível verificar a conexão"
          erro={erroVerificacao}
          aoTentarNovamente={verificarNovamente}
          tentando={verificandoDeNovo}
        />
      </Painel>
    );
  }

  if (situacao !== 'DESCONECTADA') {
    return (
      <Painel aria-label="Conexão com o banco">
        <div className={estilos.conectando} role="status">
          <span className={estilos.girando} aria-hidden="true">
            <IndicadorGiratorio tamanho={22} />
          </span>
          <div className={estilos.textos}>
            <p className={estilos.titulo}>{alvo ? `Conectando a ${alvo.nome}…` : 'Verificando a conexão…'}</p>
            {alvo ? <p className={`${estilos.endereco} codigo`}>{enderecoConexao(alvo)}</p> : null}
          </div>
        </div>
      </Painel>
    );
  }

  const temSalvas = salvas.length > 0;

  return (
    <Painel aria-label="Conexão com o banco" className={estilos.painel}>
      {falhaReconexao ? (
        <EstadoErro
          className={estilos.estado}
          titulo={`Não foi possível reconectar a ${falhaReconexao.conexao.nome}`}
          descricao={`${falhaReconexao.falha.descricao} ${falhaReconexao.falha.orientacao}`}
          aoTentarNovamente={() => void ativarConexao(falhaReconexao.conexao)}
        />
      ) : (
        <EstadoVazio
          className={temSalvas ? estilos.estado : undefined}
          icone={Unplug}
          titulo="Nenhum banco conectado"
          descricao={
            temSalvas
              ? 'Escolha uma das conexões salvas ou cadastre outra para ver como o banco está se comportando.'
              : 'Cadastre a conexão com o seu PostgreSQL para ver como o banco está se comportando.'
          }
          acao={
            temSalvas ? undefined : (
              <Botao icone={Plus} onClick={abrirNovaConexao}>
                Conectar ao banco
              </Botao>
            )
          }
        />
      )}

      {temSalvas ? (
        <>
          <div className={estilos.salvas}>
            <p className={estilos.tituloSalvas}>Conexões salvas</p>
            <ListaConexoesSalvas
              rotulo="Conexões salvas"
              conexoes={salvas}
              idAtiva={null}
              idConectando={alvo?.id ?? null}
              aoEscolher={(salva) => void ativarConexao(salva)}
            />
          </div>
          <div className={estilos.acoes}>
            <Botao variante="secundario" icone={Plus} onClick={abrirNovaConexao}>
              Nova conexão
            </Botao>
          </div>
        </>
      ) : null}
    </Painel>
  );
}
