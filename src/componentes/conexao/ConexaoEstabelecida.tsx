import { forwardRef } from 'react';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { Botao } from '@/componentes/ui';
import type { ConexaoDTO } from '@/modelos/conexao';
import { ResumoConexao } from './ResumoConexao';
import estilos from './ConexaoEstabelecida.module.css';

interface ConexaoEstabelecidaProps {
  conexao: ConexaoDTO;
  aoAcessarDashboard: () => void;
  aoConfigurarOutra: () => void;
}

export const ConexaoEstabelecida = forwardRef<HTMLHeadingElement, ConexaoEstabelecidaProps>(function ConexaoEstabelecida(
  { conexao, aoAcessarDashboard, aoConfigurarOutra },
  tituloRef,
) {
  return (
    <section className={estilos.painel} aria-labelledby="titulo-conexao-estabelecida">
      <span className={estilos.icone} aria-hidden="true">
        <CircleCheck size={26} strokeWidth={2} />
      </span>

      <div className={estilos.textos}>
        <h1 className={estilos.titulo} id="titulo-conexao-estabelecida" tabIndex={-1} ref={tituloRef}>
          {conexao.simulada ? 'Conexão simulada estabelecida' : 'Conexão estabelecida'}
        </h1>
        <p className={estilos.descricao} role="status">
          {conexao.simulada
            ? 'Tudo certo para explorar o Orynt. Nesta versão a conexão é uma simulação: nenhum banco real foi acessado e os números que você vai ver são fictícios.'
            : `O Orynt está ligado a ${conexao.versaoServidor}.`}
        </p>
      </div>

      <ResumoConexao conexao={conexao} />

      <div className={estilos.acoes}>
        <Botao tamanho="lg" iconeDireita={ArrowRight} onClick={aoAcessarDashboard}>
          Acessar o dashboard
        </Botao>
        <Botao tamanho="lg" variante="terciario" onClick={aoConfigurarOutra}>
          Configurar outra conexão
        </Botao>
      </div>
    </section>
  );
});
