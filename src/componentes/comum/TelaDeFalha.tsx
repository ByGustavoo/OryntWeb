import { RotateCw } from 'lucide-react';
import { Botao } from '@/componentes/ui';
import { ID_CONTEUDO_PRINCIPAL } from '@/configuracoes/aplicacao';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { interpretarFalhaDeTela } from '@/regras/falhaDeTela';
import { MarcaOrynt } from './MarcaOrynt';
import { NomeOrynt } from './NomeOrynt';
import { recarregarPagina } from './LimiteDeErro';
import estilos from './TelaDeFalha.module.css';

export function TelaDeFalha({ erro }: { erro: unknown }) {
  const falha = interpretarFalhaDeTela(erro, 'APLICACAO');
  useTituloDocumento(falha.tituloDaAba);

  return (
    <div className={estilos.pagina}>
      <a href="/" className={estilos.marca} aria-label="Orynt, ir para o início">
        <MarcaOrynt tamanho={32} />
        <NomeOrynt className={estilos.nome} />
      </a>

      <main className={estilos.conteudo} id={ID_CONTEUDO_PRINCIPAL} role="alert">
        <p className={`${estilos.linha} codigo`}>
          <span className={estilos.nivel}>ERRO:</span> {falha.linhaDoErro}
        </p>
        <h1 className={estilos.titulo}>{falha.titulo}</h1>
        <p className={estilos.descricao}>{falha.descricao} Nada foi alterado no seu banco.</p>
        <Botao icone={RotateCw} onClick={recarregarPagina} className={estilos.acao}>
          Recarregar a página
        </Botao>
      </main>
    </div>
  );
}
