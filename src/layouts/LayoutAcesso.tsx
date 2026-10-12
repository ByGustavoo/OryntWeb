import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { MarcaOrynt } from '@/componentes/comum/MarcaOrynt';
import { NomeOrynt } from '@/componentes/comum/NomeOrynt';
import { BotaoTema } from '@/componentes/layout/BotaoTema';
import { PainelMonitoramento } from '@/componentes/login/PainelMonitoramento';
import { ID_CONTEUDO_PRINCIPAL } from '@/configuracoes/aplicacao';
import { useConsultaMidia } from '@/ganchos/useConsultaMidia';
import type { ContextoAcesso } from './contextoAcesso';
import estilos from './LayoutAcesso.module.css';

const CONSULTA_PAINEL_COM_CENA = '(min-width: 640px)';
const DURACAO_DA_ENTRADA_MS = 1400;

export default function LayoutAcesso() {
  const painelComCena = useConsultaMidia(CONSULTA_PAINEL_COM_CENA);
  const [emailLembrado, setEmailLembrado] = useState('');
  const [senhaRedefinida, setSenhaRedefinida] = useState(false);
  const [entradaConcluida, setEntradaConcluida] = useState(false);

  useEffect(() => {
    const temporizador = window.setTimeout(() => setEntradaConcluida(true), DURACAO_DA_ENTRADA_MS);
    return () => window.clearTimeout(temporizador);
  }, []);

  const registrarSenhaRedefinida = useCallback((email: string) => {
    setEmailLembrado(email);
    setSenhaRedefinida(true);
  }, []);

  const dispensarSenhaRedefinida = useCallback(() => setSenhaRedefinida(false), []);

  const contexto = useMemo<ContextoAcesso>(
    () => ({
      emailLembrado,
      senhaRedefinida,
      lembrarEmail: setEmailLembrado,
      registrarSenhaRedefinida,
      dispensarSenhaRedefinida,
    }),
    [emailLembrado, senhaRedefinida, registrarSenhaRedefinida, dispensarSenhaRedefinida],
  );

  return (
    <div className={estilos.pagina}>
      <a className="link-pular" href={`#${ID_CONTEUDO_PRINCIPAL}`}>
        Pular para o formulário
      </a>

      <div className={estilos.tema}>
        <BotaoTema />
      </div>

      <main
        className={estilos.area}
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        data-ritmo={entradaConcluida ? 'troca' : 'entrada'}
      >
        <div className={estilos.coluna}>
          <div className={estilos.marca}>
            <MarcaOrynt tamanho={32} animada />
            <NomeOrynt className={estilos.nome} />
          </div>

          <Outlet context={contexto} />
        </div>
      </main>

      <PainelMonitoramento comCena={painelComCena} />
    </div>
  );
}
