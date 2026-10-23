import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Unplug } from 'lucide-react';
import { descreverFalha } from '@/api/tratamentoErros';
import { ResumoConexao } from '@/componentes/conexao/ResumoConexao';
import {
  Botao,
  CabecalhoPainel,
  DialogoConfirmacao,
  EstadoErro,
  EstadoVazio,
  IndicadorGiratorio,
  Painel,
} from '@/componentes/ui';
import { useConexao } from '@/provedores/ProvedorConexao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { caminhos } from '@/rotas/caminhos';
import { formatarInstante } from '@/utilitarios/formatacao';
import estilos from './SecaoConexao.module.css';

export function SecaoConexao() {
  const { situacao, conexao, alvo, salvas, erroVerificacao, verificandoDeNovo, encerrarConexao, verificarNovamente } =
    useConexao();
  const notificacoes = useNotificacoes();
  const navegar = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);

  const desconectar = async () => {
    setDesconectando(true);
    try {
      await encerrarConexao();
      navegar(caminhos.dashboard);
    } catch (erro) {
      setDesconectando(false);
      setConfirmando(false);
      notificacoes.erro('Não foi possível desconectar.', descreverFalha(erro));
    }
  };

  return (
    <Painel aria-labelledby="titulo-secao-conexao" className={estilos.secao}>
      <CabecalhoPainel
        titulo={<span id="titulo-secao-conexao">Conexão em uso</span>}
        descricao={
          conexao
            ? `${conexao.versaoServidor} · conectada em ${formatarInstante(conexao.conectadaEm)}`
            : 'O banco que o Orynt mostra no dashboard.'
        }
      />

      {conexao ? (
        <>
          <ResumoConexao conexao={conexao} />

          <div className={estilos.acoes}>
            <Botao variante="secundario" icone={Unplug} onClick={() => setConfirmando(true)}>
              Desconectar
            </Botao>
          </div>

          <DialogoConfirmacao
            aberto={confirmando}
            titulo={`Desconectar de ${conexao.nome}?`}
            descricao="Você volta para o dashboard sem um banco conectado. A conexão continua salva e nada é alterado no banco de dados."
            textoConfirmar="Desconectar"
            carregando={desconectando}
            aoConfirmar={desconectar}
            aoCancelar={() => setConfirmando(false)}
          />
        </>
      ) : situacao === 'INDISPONIVEL' ? (
        <EstadoErro
          compacto
          titulo="Não foi possível verificar a conexão"
          erro={erroVerificacao}
          aoTentarNovamente={verificarNovamente}
          tentando={verificandoDeNovo}
        />
      ) : alvo ? (
        <p className={estilos.conectando} role="status">
          <IndicadorGiratorio tamanho={16} />
          Conectando a {alvo.nome}…
        </p>
      ) : (
        <EstadoVazio
          compacto
          className={estilos.vazio}
          icone={Unplug}
          titulo="Nenhum banco conectado"
          descricao={
            salvas.length > 0
              ? 'Escolha uma das conexões salvas ou cadastre outra.'
              : 'Cadastre uma conexão para começar.'
          }
        />
      )}
    </Painel>
  );
}
