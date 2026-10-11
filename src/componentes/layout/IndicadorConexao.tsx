import { Database, FlaskConical } from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { ConexaoDTO } from '@/modelos/conexao';
import { rotuloTipoBanco } from '@/modelos/rotulos';
import estilos from './IndicadorConexao.module.css';

interface IndicadorConexaoProps {
  conexao: ConexaoDTO;
}

export function IndicadorConexao({ conexao }: IndicadorConexaoProps) {
  const endereco = `${conexao.usuario}@${conexao.host}:${conexao.porta}/${conexao.banco}`;

  return (
    <div className={estilos.indicador} title={endereco}>
      <span className={estilos.icone} aria-hidden="true">
        <Database size={16} strokeWidth={2} />
      </span>
      <p className={estilos.textos}>
        <span className="visualmente-oculto">Conexão ativa: </span>
        <span className={estilos.nome}>{conexao.nome}</span>
        <span className={estilos.tipo}>
          <span className="visualmente-oculto">, </span>
          {rotuloTipoBanco[conexao.tipoBanco]}
        </span>
      </p>
      {conexao.simulada ? (
        <>
          <Selo
            tom="aviso"
            icone={FlaskConical}
            className={estilos.estado}
            titulo="Conexão simulada: nenhum banco real está sendo acessado."
          >
            <span className="visualmente-oculto">Estado: </span>
            Demonstração
          </Selo>
          <span className={estilos.estadoCompacto} role="img" aria-label="Estado: demonstração, conexão simulada">
            <FlaskConical size={14} strokeWidth={2.25} aria-hidden="true" />
          </span>
        </>
      ) : (
        <Selo tom="sucesso" ponto>
          <span className="visualmente-oculto">Estado: </span>
          Conectada
        </Selo>
      )}
    </div>
  );
}
