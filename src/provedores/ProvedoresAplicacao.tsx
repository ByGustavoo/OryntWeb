import type { ReactNode } from 'react';
import { ProvedorAutenticacao } from './ProvedorAutenticacao';
import { ProvedorConexao } from './ProvedorConexao';
import { ProvedorNotificacoes } from './ProvedorNotificacoes';
import { ProvedorTema } from './ProvedorTema';

export function ProvedoresAplicacao({ children }: { children: ReactNode }) {
  return (
    <ProvedorTema>
      <ProvedorNotificacoes>
        <ProvedorAutenticacao>
          <ProvedorConexao>{children}</ProvedorConexao>
        </ProvedorAutenticacao>
      </ProvedorNotificacoes>
    </ProvedorTema>
  );
}
