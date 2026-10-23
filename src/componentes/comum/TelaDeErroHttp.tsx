import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import { destinoInicial, navegacaoDaConta } from '@/configuracoes/navegacao';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { caminhos } from '@/rotas/caminhos';
import { ConteudoDaMarcaDeErro, MolduraDeErro, classeDaMarcaDeErro } from './MolduraDeErro';
import estilos from './MolduraDeErro.module.css';

interface TelaDeErroHttpProps {
  terminal: ReactNode;
  sobretitulo: string;
  titulo: string;
  descricao: ReactNode;
  acoes: ReactNode;
}

export function TelaDeErroHttp(props: TelaDeErroHttpProps) {
  const { situacao, usuario } = useAutenticacao();

  const atalhos =
    situacao === 'AUTENTICADA'
      ? navegacaoDaConta(usuario)
          .flatMap((secao) => secao.itens)
          .filter((item) => item.destino !== caminhos.dashboard)
          .map((item) => ({ rotulo: item.rotulo, destino: destinoInicial(item) }))
          .sort((a, b) => a.rotulo.length - b.rotulo.length)
      : [];

  return (
    <MolduraDeErro
      {...props}
      marca={
        <Link className={classeDaMarcaDeErro} to={caminhos.inicio} aria-label={`${NOME_APLICACAO}, ir para o início`}>
          <ConteudoDaMarcaDeErro />
        </Link>
      }
      rodape={
        atalhos.length > 0 ? (
          <nav aria-label="Atalhos">
            <span className={estilos.rotuloAtalhos}>Talvez você procure</span>
            <ul className={estilos.links}>
              {atalhos.map(({ rotulo, destino }) => (
                <li key={destino}>
                  <Link className={estilos.link} to={destino}>
                    {rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : undefined
      }
    />
  );
}
