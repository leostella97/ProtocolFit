/**
 * geradorDePlanos.ts
 * ---------------------------------------------------------------------------
 * Serviço central de CLONAGEM: cruza os filtros do usuário, localiza o modelo
 * JSON mestre no disco, injeta as quantidades exatas calculadas para aquele
 * perfil e grava uma cópia do plano montado na tabela individual do usuário
 * no SQLite.
 *
 * Fluxo:
 *   1) Localiza o modelo de treino  → /modelos/treinos/{modalidade}/{objetivo}/{dias}dias.json
 *   2) Localiza o modelo de dieta   → /modelos/dietas/{objetivo}.json
 *   3) Calcula o plano nutricional  → motor determinístico (Mifflin-St Jeor)
 *   4) Monta os planos              → injeção de séries, cargas e gramas
 *   5) Desativa cópias antigas      → a nova versão assume a vigência
 *   6) Insere as novas cópias       → tabela `planos` do SQLite
 * ---------------------------------------------------------------------------
 */
import { desativarPlanosDoUsuario, inserirPlano, proximaVersaoDoPlano } from '../bd/banco.js';
import { calcularPlanoNutricional } from '../motor/calculos.js';
import { buscarModeloDieta, buscarModeloTreino } from '../motor/carregadorModelos.js';
import { montarPlanoDieta, montarPlanoTreino } from '../motor/montadorPlano.js';
import type { Perfil, PlanoDieta, PlanoTreino } from '../tipos.js';

/** Gera (ou regenera) os planos de treino e dieta do usuário e devolve ambos. */
export function gerarPlanosParaPerfil(usuarioId: number, perfil: Perfil): { treino: PlanoTreino; dieta: PlanoDieta } {
  // 1) Localiza o modelo mestre de treino cruzando modalidade + objetivo + dias.
  const modeloTreino = buscarModeloTreino(perfil.modalidade, perfil.objetivo, perfil.dias_disponiveis.length);

  // 2) Localiza o modelo mestre de dieta do objetivo.
  const modeloDieta = buscarModeloDieta(perfil.objetivo);

  // 3) Calcula o plano nutricional determinístico (TMB → gasto → meta → macros).
  const planoNutricional = calcularPlanoNutricional(perfil);

  // 4) Monta os planos injetando cargas, séries e quantidades exatas em gramas.
  const treinoMontado = montarPlanoTreino(modeloTreino, perfil);
  const dietaMontada = montarPlanoDieta(modeloDieta, perfil, planoNutricional);

  // 5) Desativa as cópias antigas do usuário (ficam no histórico, inativas).
  desativarPlanosDoUsuario(usuarioId);

  // 6) Calcula a nova versão de cada tipo de plano.
  const versaoTreino = proximaVersaoDoPlano(usuarioId, 'treino');
  const versaoDieta = proximaVersaoDoPlano(usuarioId, 'dieta');

  // 7) Grava as novas cópias montadas no SQLite (isolamento por usuário).
  const modeloOrigemTreino = `treinos/${perfil.modalidade}/${perfil.objetivo}`;
  const modeloOrigemDieta = `dietas/${perfil.objetivo}`;
  const idTreino = inserirPlano(
    usuarioId,
    'treino',
    versaoTreino,
    modeloOrigemTreino,
    JSON.stringify(treinoMontado),
  );
  const idDieta = inserirPlano(
    usuarioId,
    'dieta',
    versaoDieta,
    modeloOrigemDieta,
    JSON.stringify(dietaMontada),
  );

  // 8) Devolve os planos prontos (com id, versão e vínculo com o modelo mestre).
  return {
    treino: { id: idTreino, versao: versaoTreino, modelo_origem: modeloOrigemTreino, ...treinoMontado },
    dieta: { id: idDieta, versao: versaoDieta, modelo_origem: modeloOrigemDieta, ...dietaMontada },
  };
}
