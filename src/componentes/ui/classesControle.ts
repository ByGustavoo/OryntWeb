import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './Campo.module.css';

export function classesControle(erro?: string, sucesso?: string, extra?: string | false): string {
  return juntarClasses(
    estilos.controle,
    erro ? estilos.controleErro : sucesso ? estilos.controleSucesso : null,
    extra,
  );
}
