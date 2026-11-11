import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import type { TelasOcultasDTO } from '@/modelos/telas';
import { ehCodigoTela, rotuloDaTela } from '@/regras/telasOcultas';
import { registrarEvento } from '../auditoriaSimulada';
import type { ContextoSimulado } from '../autorizacaoSimulada';
import { semAcessoAutenticado } from '../autorizacaoSimulada';
import { autorDaConta } from '../contasSimuladas';
import { dadosInvalidos, ok } from '../resposta';
import { gravarTelasOcultasSimuladas, lerTelasOcultasSimuladas } from '../telasOcultasSimuladas';

const ROTULO_NO_MENU = 'No menu';
const ROTULO_OCULTA = 'Oculta';

export function buscarTelasOcultas(
  _requisicao: RequisicaoTransporte,
  _agora: Date,
  _parametros: Record<string, string>,
  contexto: ContextoSimulado,
): RespostaTransporte {
  if (!contexto.conta) return semAcessoAutenticado();
  const resposta: TelasOcultasDTO = { telas: lerTelasOcultasSimuladas(contexto.conta.id) };
  return ok(resposta);
}

export function atualizarTelasOcultas(
  requisicao: RequisicaoTransporte,
  agora: Date,
  _parametros: Record<string, string>,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();

  const corpo = requisicao.corpo && typeof requisicao.corpo === 'object' ? (requisicao.corpo as Record<string, unknown>) : {};
  const recebidas: unknown[] | null = Array.isArray(corpo.telas) ? corpo.telas : null;
  if (!recebidas || !recebidas.every(ehCodigoTela)) {
    return dadosInvalidos([{ campo: 'telas', mensagem: 'Informe só telas que podem sair do menu.' }]);
  }

  const anteriores = lerTelasOcultasSimuladas(conta.id);
  const atuais = gravarTelasOcultasSimuladas(conta.id, recebidas);
  const mudancas = [
    ...atuais.filter((codigo) => !anteriores.includes(codigo)).map((codigo) => ({ campo: rotuloDaTela(codigo), antes: ROTULO_NO_MENU, depois: ROTULO_OCULTA })),
    ...anteriores.filter((codigo) => !atuais.includes(codigo)).map((codigo) => ({ campo: rotuloDaTela(codigo), antes: ROTULO_OCULTA, depois: ROTULO_NO_MENU })),
  ];
  if (mudancas.length > 0) {
    registrarEvento({ tipo: 'TELAS_ALTERADAS', resultado: 'SUCESSO', conta: autorDaConta(conta), mudancas }, agora);
  }

  const resposta: TelasOcultasDTO = { telas: atuais };
  return ok(resposta);
}
