import { SecaoAparencia } from '@/componentes/configuracoes/SecaoAparencia';
import { SecaoConexao } from '@/componentes/configuracoes/SecaoConexao';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import estilos from './PaginaConfiguracoes.module.css';

export default function PaginaConfiguracoes() {
  useTituloDocumento('Configurações');

  return (
    <div className={estilos.pagina}>
      <CabecalhoPagina titulo="Configurações" descricao="Veja a conexão em uso e ajuste a aparência do Orynt." />

      <div className={estilos.secoes}>
        <SecaoConexao />
        <SecaoAparencia id="secao-aparencia" idTitulo="titulo-secao-aparencia" />
      </div>
    </div>
  );
}
