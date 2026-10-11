import { SecaoAparencia } from '@/componentes/configuracoes/SecaoAparencia';
import { SecaoConexao } from '@/componentes/configuracoes/SecaoConexao';
import { SecaoConexoesSalvas } from '@/componentes/configuracoes/SecaoConexoesSalvas';
import { SecaoVersoes } from '@/componentes/configuracoes/SecaoVersoes';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import estilos from './PaginaConfiguracoes.module.css';

export default function PaginaConfiguracoes() {
  useTituloDocumento('Configurações');

  return (
    <div className={estilos.pagina}>
      <CabecalhoPagina
        titulo="Configurações"
        descricao="Gerencie as conexões com os seus bancos, ajuste a aparência e veja a versão do Orynt."
      />

      <div className={estilos.secoes}>
        <div className={estilos.conexoes}>
          <SecaoConexao />
          <SecaoConexoesSalvas />
        </div>
        <SecaoAparencia id="secao-aparencia" idTitulo="titulo-secao-aparencia" />
        <SecaoVersoes id="secao-versoes" idTitulo="titulo-secao-versoes" />
      </div>
    </div>
  );
}
