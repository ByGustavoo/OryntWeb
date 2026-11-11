import { SecaoAparencia } from '@/componentes/configuracoes/SecaoAparencia';
import { SecaoConexao } from '@/componentes/configuracoes/SecaoConexao';
import { SecaoConexoesSalvas } from '@/componentes/configuracoes/SecaoConexoesSalvas';
import { SecaoTelas } from '@/componentes/configuracoes/SecaoTelas';
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
        descricao="Ajuste a aparência, gerencie as conexões com os seus bancos e escolha quais telas aparecem no menu."
      />

      <div className={estilos.secoes}>
        <div className={estilos.topo}>
          <SecaoAparencia id="secao-aparencia" idTitulo="titulo-secao-aparencia" />
          <SecaoVersoes id="secao-versoes" idTitulo="titulo-secao-versoes" />
        </div>
        <div className={estilos.conexoes}>
          <SecaoConexao />
          <SecaoConexoesSalvas />
        </div>
        <SecaoTelas id="secao-telas" idTitulo="titulo-secao-telas" />
      </div>
    </div>
  );
}
