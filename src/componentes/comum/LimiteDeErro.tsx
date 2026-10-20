import { Component } from 'react';
import type { ReactNode } from 'react';

interface LimiteDeErroProps {
  alternativa: (erro: unknown) => ReactNode;
  children: ReactNode;
}

interface EstadoLimiteDeErro {
  falhou: boolean;
  erro: unknown;
}

export class LimiteDeErro extends Component<LimiteDeErroProps, EstadoLimiteDeErro> {
  state: EstadoLimiteDeErro = { falhou: false, erro: null };

  static getDerivedStateFromError(erro: unknown): EstadoLimiteDeErro {
    return { falhou: true, erro };
  }

  render() {
    return this.state.falhou ? this.props.alternativa(this.state.erro) : this.props.children;
  }
}

export function recarregarPagina(): void {
  window.location.reload();
}
