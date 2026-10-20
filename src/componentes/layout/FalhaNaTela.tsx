import { CloudOff, OctagonAlert, RotateCw } from 'lucide-react';
import { recarregarPagina } from '@/componentes/comum/LimiteDeErro';
import { Botao, EstadoErro } from '@/componentes/ui';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { interpretarFalhaDeTela } from '@/regras/falhaDeTela';
import estilos from './FalhaNaTela.module.css';

export function FalhaNaTela({ erro }: { erro: unknown }) {
  const falha = interpretarFalhaDeTela(erro, 'TELA');
  useTituloDocumento(falha.tituloDaAba);
  return (
    <div className={estilos.falha}>
      <EstadoErro
        titulo={falha.titulo}
        descricao={falha.descricao}
        icone={falha.motivo === 'CARREGAMENTO' ? CloudOff : OctagonAlert}
        acoes={
          <Botao icone={RotateCw} onClick={recarregarPagina}>
            Recarregar a página
          </Botao>
        }
      />
    </div>
  );
}
