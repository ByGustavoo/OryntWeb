import { forwardRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Plus, Settings2 } from 'lucide-react';
import { MarcaOrynt } from '@/componentes/comum/MarcaOrynt';
import { Botao, BotaoIcone } from '@/componentes/ui';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import { useConexaoAtiva } from '@/provedores/ProvedorConexao';
import { caminhos } from '@/rotas/caminhos';
import { BotaoTema } from './BotaoTema';
import { IndicadorConexao } from './IndicadorConexao';
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
  const conexao = useConexaoAtiva();
  const navegar = useNavigate();
  const abrirNovaConexao = () => navegar(caminhos.conexao);

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
              <MarcaOrynt tamanho={26} />
            </Link>
          </div>
        ) : null}

        <IndicadorConexao conexao={conexao} />

        <div className={estilos.acoes}>
          <Botao tamanho="sm" variante="secundario" icone={Plus} className={estilos.novaConexao} onClick={abrirNovaConexao}>
            Nova conexão
          </Botao>
          <BotaoIcone icone={Plus} rotulo="Nova conexão" className={estilos.novaConexaoCompacta} onClick={abrirNovaConexao} />
          <BotaoIcone
            icone={Settings2}
            rotulo="Configurações da conexão"
            onClick={() => navegar(caminhos.configuracoes)}
          />
          <BotaoTema />
        </div>
      </div>
    </header>
  );
});
