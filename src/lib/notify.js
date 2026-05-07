/**
 * notify.js — Sistema global de feedback de ações
 * ÚNICO ponto de entrada para todos os toasts do sistema.
 * Use sempre executeAction() para wrapping de operações assíncronas.
 */
import { toast } from 'sonner';

export const notifySuccess = (message) => toast.success(message);
export const notifyError   = (message) => toast.error(message);
export const notifyWarning = (message) => toast.warning(message);
export const notifyInfo    = (message) => toast.info(message);

/**
 * Executa uma ação assíncrona com feedback automático de sucesso/erro.
 *
 * @param {() => Promise<any>} actionFn  — Função assíncrona a executar
 * @param {{ success: string, error?: string }} messages — Mensagens de feedback
 * @returns {Promise<any>} — Resultado da ação
 *
 * @example
 * await executeAction(
 *   () => base44.entities.Movimentacao.create(payload),
 *   { success: 'Lançamento salvo com sucesso', error: 'Erro ao salvar lançamento' }
 * );
 */
export async function executeAction(actionFn, messages) {
  try {
    const result = await actionFn();
    notifySuccess(messages.success);
    return result;
  } catch (error) {
    notifyError(messages.error || 'Erro ao executar ação');
    throw error;
  }
}