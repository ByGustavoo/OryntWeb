import { forwardRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Plus, Settings2 } from 'lucide-react';
import { MarcaOrynt } from '@/componentes/comum/MarcaOrynt';
import { Botao, BotaoIcone } from '@/componentes/ui';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import { useNovaConexao } from '@/provedores/ProvedorNovaConexao';
import { caminhos } from '@/rotas/caminhos';
import { BotaoTema } from './BotaoTema';
import { MenuConta } from './MenuConta';
import estilos from './Cabecalho.module.css';

interface CabecalhoProps {
  emGaveta: boolean;
  gavetaAberta: boolean;
  aoAbrirMenu: () => void;
}

export const Cabecalho = forwardRef<HTMLButtonElement, CabecalhoProps>(function Cabecalho(
  { emGaveta, gavetaAberta, aoAbrirMenu },
  botaoMenuRef,
) {
  const { abrir: abrirNovaConexao } = useNovaConexao();
  const navegar = useNavigate();

  return (
    <header className={estilos.cabecalho}>
      <div className={estilos.interno}>
        {emGaveta ? (
          <div className={estilos.inicio}>
            <BotaoIcone
              ref={botaoMenuRef}
              icone={Menu}
              rotulo="Abrir menu"
              mostrarDica={false}
              onClick={aoAbrirMenu}
              aria-expanded={gavetaAberta}
              aria-controls="menu-lateral"
            />
            <Link to={caminhos.dashboard} className={estilos.marca} aria-label={`${NOME_APLICACAO}, ir para o Dashboard`}>
              <MarcaOrynt />
            </Link>
          </div>
        ) : null}

        <div className={estilos.acoes}>
          <Botao tamanho="sm" variante="secundario" icone={Plus} className={estilos.novaConexao} onClick={abrirNovaConexao}>
            Nova conexão
          </Botao>
          <BotaoIcone icone={Plus} rotulo="Nova conexão" className={estilos.novaConexaoCompacta} onClick={abrirNovaConexao} />
          <BotaoIcone
            icone={Settings2}
            rotulo="Configurações"
            onClick={() => navegar(caminhos.configuracoes)}
          />
          <BotaoTema />
          <MenuConta />
        </div>
      </div>
    </header>
  );
});
