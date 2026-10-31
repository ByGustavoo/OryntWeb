import { Esqueleto } from '@/componentes/ui';
import estilosFormulario from './FormularioRecuperacao.module.css';
import estilos from './EsqueletoNovaSenha.module.css';

interface EsqueletoNovaSenhaProps {
  rotulo: string;
}

export function EsqueletoNovaSenha({ rotulo }: EsqueletoNovaSenhaProps) {
  return (
    <div className={estilosFormulario.formulario} role="status" aria-label={rotulo}>
      <div className={estilosFormulario.campos}>
        <div className={estilos.campo}>
          <Esqueleto className={estilos.rotulo} largura={80} altura={14} />
          <Esqueleto altura="var(--altura-controle)" raio="var(--raio-md)" />
          <Esqueleto altura={4} raio="var(--raio-pilula)" />
          <Esqueleto className={estilos.dica} largura="85%" altura={12} />
        </div>
        <div className={estilos.campo}>
          <Esqueleto className={estilos.rotulo} largura={148} altura={14} />
          <Esqueleto altura="var(--altura-controle)" raio="var(--raio-md)" />
        </div>
      </div>
      <div className={estilosFormulario.observacao}>
        <Esqueleto altura={59} raio="var(--raio-md)" />
      </div>
      <div className={estilosFormulario.enviar}>
        <Esqueleto altura="var(--altura-controle-lg)" raio="var(--raio-md)" />
      </div>
    </div>
  );
}
