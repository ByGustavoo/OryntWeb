import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MarcaOrynt } from '@/componentes/comum/MarcaOrynt';
import { NomeOrynt } from '@/componentes/comum/NomeOrynt';
import { ID_CONTEUDO_PRINCIPAL } from '@/configuracoes/aplicacao';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { caminhos } from '@/rotas/caminhos';
import estilos from './PaginaNaoEncontrada.module.css';

export default function PaginaNaoEncontrada() {
  useTituloDocumento('Página não encontrada');
  const { pathname } = useLocation();
  const { situacao } = useAutenticacao();
  const destino =
    situacao === 'AUTENTICADA'
      ? { caminho: caminhos.dashboard, rotulo: 'Ir para o Dashboard' }
      : { caminho: caminhos.login, rotulo: 'Ir para a tela de login' };

  return (
    <div className={estilos.pagina}>
      <Link to={caminhos.inicio} className={estilos.marca} aria-label="Orynt, ir para o início">
        <MarcaOrynt tamanho={32} />
        <NomeOrynt className={estilos.nome} />
      </Link>

      <main className={estilos.conteudo} id={ID_CONTEUDO_PRINCIPAL}>
        <p className={`${estilos.consulta} codigo`}>
          <span className={estilos.palavra}>SELECT</span> pagina <span className={estilos.palavra}>FROM</span> orynt{' '}
          <span className={estilos.palavra}>WHERE</span> caminho = <span className={estilos.caminho}>'{pathname}'</span>;
        </p>
        <p className={`${estilos.resultado} codigo`}>(0 linhas)</p>
        <h1 className={estilos.titulo}>Esta página não existe</h1>
        <p className={estilos.descricao}>
          O endereço pode ter sido digitado errado ou a tela ainda não foi criada. Nenhum dado foi afetado.
        </p>
        <Link to={destino.caminho} className={estilos.acao}>
          {destino.rotulo}
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
      </main>
    </div>
  );
}
