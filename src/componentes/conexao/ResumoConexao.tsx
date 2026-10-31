import { Fragment } from 'react';
import { Esqueleto } from '@/componentes/ui';
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

const LINHAS_DO_ESQUELETO = [
  { termo: 'Nome', largura: 72 },
  { termo: 'Usuário', largura: 64 },
  { termo: 'Servidor', largura: 104 },
  { termo: 'Tipo de banco', largura: 80 },
  { termo: 'Banco de dados', largura: 48 },
];

export function EsqueletoResumoConexao() {
  return (
    <dl className={estilos.resumo} aria-hidden="true">
      {LINHAS_DO_ESQUELETO.map((linha) => (
        <div className={estilos.item} key={linha.termo}>
          <dt className={estilos.termo}>{linha.termo}</dt>
          <dd className={estilos.valor}>
            <Esqueleto largura={linha.largura} altura={12} />
          </dd>
        </div>
      ))}
    </dl>
  );
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
