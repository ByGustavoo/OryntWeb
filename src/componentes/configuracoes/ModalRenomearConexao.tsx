import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { descreverFalha, errosDeCampo } from '@/api/tratamentoErros';
import { Botao, CampoTexto, Modal } from '@/componentes/ui';
import type { ConexaoSalvaDTO } from '@/modelos/conexao';
import { enderecoConexao, validarNomeConexaoSalva } from '@/regras/conexoesSalvas';

interface ModalRenomearConexaoProps {
  conexao: ConexaoSalvaDTO;
  aberto: boolean;
  aoFechar: () => void;
  aoRenomear: (nome: string) => Promise<void>;
}

export function ModalRenomearConexao({ conexao, aberto, aoFechar, aoRenomear }: ModalRenomearConexaoProps) {
  const [nome, setNome] = useState(conexao.nome);
  const [erro, setErro] = useState<string | undefined>();
  const [salvando, setSalvando] = useState(false);
  const campoRef = useRef<HTMLInputElement>(null);
  const idFormulario = useId();

  const alterar = (valor: string) => {
    setNome(valor);
    if (erro) setErro(validarNomeConexaoSalva(valor));
  };

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (salvando) return;

    const invalido = validarNomeConexaoSalva(nome);
    if (invalido) {
      setErro(invalido);
      campoRef.current?.focus();
      return;
    }
    if (nome.trim() === conexao.nome) {
      aoFechar();
      return;
    }

    setSalvando(true);
    try {
      await aoRenomear(nome.trim());
    } catch (falha) {
      setSalvando(false);
      setErro(errosDeCampo<'nome'>(falha).nome ?? descreverFalha(falha));
      campoRef.current?.focus();
    }
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={salvando ? () => undefined : aoFechar}
      titulo="Renomear conexão"
      descricao={enderecoConexao(conexao)}
      tamanho="sm"
      focarPrimeiroCampo
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form={idFormulario} carregando={salvando}>
            {salvando ? 'Salvando…' : 'Salvar nome'}
          </Botao>
        </>
      }
    >
      <form id={idFormulario} onSubmit={enviar} noValidate>
        <CampoTexto
          ref={campoRef}
          rotulo="Nome da conexão"
          dica={erro ? undefined : 'É o nome que aparece no menu da conta e na lista de conexões.'}
          erro={erro}
          value={nome}
          readOnly={salvando}
          onChange={(evento) => alterar(evento.target.value)}
          onFocus={(evento) => evento.target.select()}
          autoComplete="off"
          aria-required="true"
        />
      </form>
    </Modal>
  );
}
