import { BrowserRouter } from 'react-router-dom';
import { ProvedoresAplicacao } from '@/provedores/ProvedoresAplicacao';
import { RotasAplicacao } from '@/rotas/RotasAplicacao';

export default function Aplicacao() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ProvedoresAplicacao>
        <RotasAplicacao />
      </ProvedoresAplicacao>
    </BrowserRouter>
  );
}
