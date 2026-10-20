import { BrowserRouter } from 'react-router-dom';
import { LimiteDeErro } from '@/componentes/comum/LimiteDeErro';
import { TelaDeFalha } from '@/componentes/comum/TelaDeFalha';
import { ProvedoresAplicacao } from '@/provedores/ProvedoresAplicacao';
import { RotasAplicacao } from '@/rotas/RotasAplicacao';

export default function Aplicacao() {
  return (
    <LimiteDeErro alternativa={(erro) => <TelaDeFalha erro={erro} />}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ProvedoresAplicacao>
          <RotasAplicacao />
        </ProvedoresAplicacao>
      </BrowserRouter>
    </LimiteDeErro>
  );
}
