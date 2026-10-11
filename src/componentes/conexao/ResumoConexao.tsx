import type { ConexaoDTO } from '@/modelos/conexao';
import { rotuloTipoBanco } from '@/modelos/rotulos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './ResumoConexao.module.css';

interface ResumoConexaoProps {
  conexao: ConexaoDTO;
  className?: string;
}

export function ResumoConexao({ conexao, className }: ResumoConexaoProps) {
  const itens = [
    { termo: 'Nome', valor: conexao.nome, codigo: false },
    { termo: 'Tipo de banco', valor: rotuloTipoBanco[conexao.tipoBanco], codigo: false },
    { termo: 'Servidor', valor: `${conexao.host}:${conexao.porta}`, codigo: true },
    { termo: 'Banco de dados', valor: conexao.banco, codigo: true },
    { termo: 'Usuário', valor: conexao.usuario, codigo: true },
  ];

  return (
    <dl className={juntarClasses(estilos.resumo, className)}>
      {itens.map((item) => (
        <div className={estilos.item} key={item.termo}>
          <dt className={estilos.termo}>{item.termo}</dt>
          <dd className={juntarClasses(estilos.valor, item.codigo && 'codigo')}>{item.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
