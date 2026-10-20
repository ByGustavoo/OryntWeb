import { ChevronRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Botao, EstadoVazio, Painel } from '@/componentes/ui';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import type { TelaDoOrynt } from '@/regras/permissoesConta';
import { rotuloDaPermissao, telasPermitidas } from '@/regras/permissoesConta';
import { CabecalhoPagina } from './CabecalhoPagina';

interface SemAcessoNaTelaProps {
  tela: TelaDoOrynt;
}

export function SemAcessoNaTela({ tela }: SemAcessoNaTelaProps) {
  const { usuario } = useAutenticacao();
  const navegar = useNavigate();
  const nome = tela.rotulo.split(' › ').pop() ?? tela.rotulo;
  useTituloDocumento(`${tela.rotulo}: sem acesso`);
  const destino = telasPermitidas(usuario)[0];

  return (
    <>
      <CabecalhoPagina titulo={nome} />
      <Painel aria-label="Sem acesso">
        <EstadoVazio
          icone={Lock}
          titulo="Sua conta não tem acesso a esta tela"
          descricao={
            tela.permissao
              ? `A permissão “${rotuloDaPermissao(tela.permissao)}” não foi concedida à sua conta. Fale com quem administra o Orynt na sua equipe.`
              : 'Fale com quem administra o Orynt na sua equipe.'
          }
          acao={
            destino ? (
              <Botao variante="secundario" iconeDireita={ChevronRight} onClick={() => navegar(destino.caminho)}>
                Ir para {destino.rotulo.split(' › ').pop()}
              </Botao>
            ) : undefined
          }
        />
      </Painel>
    </>
  );
}
