import { Fragment } from 'react';
import type { ConexaoDTO } from '@/modelos/conexao';
import { rotuloTipoBanco } from '@/modelos/rotulos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './ResumoConexao.module.css';

interface ResumoConexaoProps {
  conexao: ConexaoDTO;
  className?: string;
}

function comQuebrasNosSeparadores(texto: string) {
  return texto.split(/(?<=\.)|(?=:)/).map((trecho, indice) => (
    <Fragment key={indice}>
      {indice > 0 ? <wbr /> : null}
      {trecho}
    </Fragment>
  ));
}

export function ResumoConexao({ conexao, className }: ResumoConexaoProps) {
  const itens = [
    { termo: 'Nome', valor: conexao.nome, codigo: false },
    { termo: 'Usuário', valor: conexao.usuario, codigo: true },
    { termo: 'Servidor', valor: `${conexao.host}:${conexao.porta}`, codigo: true },
    { termo: 'Tipo de banco', valor: rotuloTipoBanco[conexao.tipoBanco], codigo: false },
    { termo: 'Banco de dados', valor: conexao.banco, codigo: true },
  ];

  return (
    <dl className={juntarClasses(estilos.resumo, className)}>
      {itens.map((item) => (
        <div className={estilos.item} key={item.termo}>
          <dt className={estilos.termo}>{item.termo}</dt>
          <dd className={juntarClasses(estilos.valor, item.codigo && 'codigo')}>
            {item.codigo ? comQuebrasNosSeparadores(item.valor) : item.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}
