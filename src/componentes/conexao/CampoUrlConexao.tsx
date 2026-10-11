import { useId, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { ChevronDown, Link2 } from 'lucide-react';
import { Botao, CampoTexto } from '@/componentes/ui';
import { interpretarUrlConexao } from '@/regras/urlConexao';
import type { CamposDaUrl } from '@/regras/urlConexao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './CampoUrlConexao.module.css';

interface CampoUrlConexaoProps {
  desabilitado: boolean;
  aoPreencher: (campos: CamposDaUrl) => void;
}

export function CampoUrlConexao({ desabilitado, aoPreencher }: CampoUrlConexaoProps) {
  const [aberto, setAberto] = useState(false);
  const [url, setUrl] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const idPainel = useId();
  const campoRef = useRef<HTMLInputElement>(null);

  const aplicar = (texto: string) => {
    const resultado = interpretarUrlConexao(texto);
    if (!resultado.valida) {
      setErro(resultado.mensagem);
      campoRef.current?.focus();
      return;
    }
    setUrl('');
    setErro(undefined);
    setAberto(false);
    aoPreencher(resultado.campos);
  };

  const aoColar = (evento: ClipboardEvent<HTMLInputElement>) => {
    const colado = evento.clipboardData.getData('text');
    if (!interpretarUrlConexao(colado).valida) return;
    evento.preventDefault();
    aplicar(colado);
  };

  const aoPressionar = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    aplicar(url);
  };

  return (
    <div className={estilos.bloco}>
      <button
        type="button"
        className={estilos.gatilho}
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-controls={idPainel}
        disabled={desabilitado}
      >
        <Link2 size={16} strokeWidth={2} aria-hidden="true" />
        Preencher com uma URL de conexão
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className={juntarClasses(estilos.seta, aberto && estilos.setaAberta)}
        />
      </button>

      <div id={idPainel} className={estilos.painel} hidden={!aberto}>
        <CampoTexto
          ref={campoRef}
          rotulo="URL de conexão"
          dica="Cole a URL e os campos abaixo são preenchidos. Ela não fica guardada."
          erro={erro}
          value={url}
          onChange={(evento) => {
            setUrl(evento.target.value);
            setErro(undefined);
          }}
          onPaste={aoColar}
          onKeyDown={aoPressionar}
          placeholder="postgresql://usuario:senha@servidor:5432/banco"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={desabilitado}
          className={estilos.campo}
        />
        <Botao variante="secundario" onClick={() => aplicar(url)} disabled={desabilitado} className={estilos.aplicar}>
          Preencher campos
        </Botao>
      </div>
    </div>
  );
}
