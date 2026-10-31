import { Esqueleto, EsqueletoLista, Painel } from '@/componentes/ui';
import estilosCabecalho from './CabecalhoPagina.module.css';
import estilos from './EsqueletoPagina.module.css';

interface EsqueletoPaginaProps {
  rotulo: string;
}

export function EsqueletoPagina({ rotulo }: EsqueletoPaginaProps) {
  return (
    <div>
      <div className={estilosCabecalho.cabecalhoPagina} aria-hidden="true">
        <div className={estilosCabecalho.textos}>
          <Esqueleto className={estilos.titulo} largura="min(240px, 60%)" altura={26} raio="var(--raio-sm)" />
          <Esqueleto className={estilos.descricao} largura="min(560px, 90%)" altura={16} />
        </div>
      </div>
      <Painel>
        <EsqueletoLista linhas={5} rotulo={rotulo} />
      </Painel>
    </div>
  );
}
