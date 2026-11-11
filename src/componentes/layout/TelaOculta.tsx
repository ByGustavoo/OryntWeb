import { Eye, EyeOff, LayoutDashboard, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Botao, EstadoVazio, Painel } from '@/componentes/ui';
import { ID_CONTEUDO_PRINCIPAL } from '@/configuracoes/aplicacao';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { CodigoTela } from '@/modelos/telas';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { useTelas } from '@/provedores/ProvedorTelas';
import { podeAbrirTela } from '@/regras/permissoesConta';
import { rotuloDaTela } from '@/regras/telasOcultas';
import { caminhos } from '@/rotas/caminhos';
import { CabecalhoPagina } from './CabecalhoPagina';
import estilos from './TelaOculta.module.css';

export function TelaOculta({ tela }: { tela: CodigoTela }) {
  const navegar = useNavigate();
  const notificacoes = useNotificacoes();
  const { usuario } = useAutenticacao();
  const { definirOculta } = useTelas();
  const rotulo = rotuloDaTela(tela);
  const titulo = rotulo.split(' › ').pop() ?? rotulo;
  const vaiAoDashboard = podeAbrirTela(usuario, caminhos.dashboard);
  useTituloDocumento(`${titulo}: tela oculta`);

  const mostrarDeNovo = () => {
    definirOculta(tela, false);
    notificacoes.sucesso(`${rotulo} voltou ao menu.`);
    document.getElementById(ID_CONTEUDO_PRINCIPAL)?.focus({ preventScroll: true });
  };

  return (
    <>
      <CabecalhoPagina titulo={titulo} descricao={`${rotulo} está fora do menu.`} />

      <Painel>
        <EstadoVazio
          icone={EyeOff}
          titulo="Esta tela está oculta"
          descricao="Você a tirou do menu em Configurações › Telas. Nada foi apagado: ela volta inteira assim que for mostrada de novo."
          acao={
            <div className={estilos.acoes}>
              <Botao icone={Eye} onClick={mostrarDeNovo}>
                Mostrar de novo
              </Botao>
              {vaiAoDashboard ? (
                <Botao variante="secundario" icone={LayoutDashboard} onClick={() => navegar(caminhos.dashboard)}>
                  Ir para o Dashboard
                </Botao>
              ) : (
                <Botao variante="secundario" icone={Settings} onClick={() => navegar(caminhos.configuracoes)}>
                  Abrir Configurações
                </Botao>
              )}
            </div>
          }
        />
      </Painel>
    </>
  );
}
