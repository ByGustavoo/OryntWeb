import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Plus, Unplug } from 'lucide-react';
import { descreverFalha } from '@/api/tratamentoErros';
import { ResumoConexao } from '@/componentes/conexao/ResumoConexao';
import { Botao, CabecalhoPainel, DialogoConfirmacao, Nota, Painel } from '@/componentes/ui';
import { useConexao, useConexaoAtiva } from '@/provedores/ProvedorConexao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { caminhos } from '@/rotas/caminhos';
import { formatarInstante } from '@/utilitarios/formatacao';
import estilos from './SecaoConexao.module.css';

export function SecaoConexao() {
  const conexao = useConexaoAtiva();
  const { encerrarConexao } = useConexao();
  const notificacoes = useNotificacoes();
  const navegar = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);

  const desconectar = async () => {
    setDesconectando(true);
    try {
      await encerrarConexao();
    } catch (erro) {
      setDesconectando(false);
      setConfirmando(false);
      notificacoes.erro('Não foi possível desconectar.', descreverFalha(erro));
    }
  };

  return (
    <Painel aria-labelledby="titulo-secao-conexao" className={estilos.secao}>
      <CabecalhoPainel
        titulo={<span id="titulo-secao-conexao">Conexão</span>}
        descricao={`${conexao.versaoServidor} · conectada em ${formatarInstante(conexao.conectadaEm)}`}
      />

      {conexao.simulada ? (
        <Nota tom="aviso" icone={FlaskConical} titulo="Conexão simulada.">
          Os dados abaixo são os que você informou, mas nenhum banco real está sendo acessado nesta versão.
        </Nota>
      ) : null}

      <ResumoConexao conexao={conexao} />

      <div className={estilos.acoes}>
        <Botao variante="secundario" icone={Plus} onClick={() => navegar(caminhos.conexao)}>
          Nova conexão
        </Botao>
        <Botao variante="terciario" icone={Unplug} onClick={() => setConfirmando(true)}>
          Desconectar
        </Botao>
      </div>

      <DialogoConfirmacao
        aberto={confirmando}
        titulo={`Desconectar de ${conexao.nome}?`}
        descricao="Você volta para a tela de conexão. Nada é alterado no banco de dados."
        textoConfirmar="Desconectar"
        carregando={desconectando}
        aoConfirmar={desconectar}
        aoCancelar={() => setConfirmando(false)}
      />
    </Painel>
  );
}
