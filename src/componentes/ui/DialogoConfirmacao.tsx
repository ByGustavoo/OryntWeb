import { Botao } from './Botao';
import { Modal } from './Modal';

export interface DialogoConfirmacaoProps {
  aberto: boolean;
  titulo: string;
  descricao: string;
  textoConfirmar: string;
  textoCancelar?: string;
  destrutivo?: boolean;
  carregando?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

export function DialogoConfirmacao({
  aberto,
  titulo,
  descricao,
  textoConfirmar,
  textoCancelar = 'Cancelar',
  destrutivo = false,
  carregando = false,
  aoConfirmar,
  aoCancelar,
}: DialogoConfirmacaoProps) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={carregando ? () => undefined : aoCancelar}
      titulo={titulo}
      descricao={descricao}
      tamanho="sm"
      papel="alertdialog"
      rodape={
        <>
          <Botao variante="secundario" onClick={aoCancelar} disabled={carregando}>
            {textoCancelar}
          </Botao>
          <Botao variante={destrutivo ? 'perigo' : 'primario'} onClick={aoConfirmar} carregando={carregando}>
            {textoConfirmar}
          </Botao>
        </>
      }
    />
  );
}
