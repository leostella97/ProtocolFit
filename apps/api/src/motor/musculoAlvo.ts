/**
 * musculoAlvo.ts
 * ---------------------------------------------------------------------------
 * TEAM_012: deriva o MÚSCULO-alvo de um exercício a partir do nome — mais
 * fino que o campo `grupo`, que em alguns casos é uma FAMÍLIA de músculos:
 *
 *   • "pernas" mistura quadríceps / posterior de coxa / glúteos / adutores;
 *   • "ombro"  mistura as três cabeças do deltoide (anterior/lateral/posterior);
 *   • "core"   mistura reto abdominal / oblíquos / anti-extensão.
 *
 * Usado na TROCA de exercício: a alternativa precisa trabalhar o mesmo
 * músculo do exercício substituído — sem isso o usuário trocaria um
 * agachamento (quadríceps) por uma mesa flexora (posterior) e desequilibraria
 * o estímulo da sessão.
 *
 * ATENÇÃO: este arquivo é ESPELHADO no motor do navegador
 * (apps/web/src/lib/motor/musculoAlvo.ts). Qualquer mudança aqui precisa ser
 * replicada lá — a paridade API/navegador é testada em spec/musculo-alvo.spec.ts.
 * ---------------------------------------------------------------------------
 */

/** Normaliza o nome para a comparação: minúsculas e sem acentos. */
function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Músculo-alvo do exercício. Grupos que já são músculo-específicos (peito,
 * costas, biceps, triceps, panturrilha, gluteos, posterior, trapezio, lombar,
 * cardio, mobilidade...) devolvem o próprio grupo — só as "famílias" amplas
 * recebem detalhamento. A ordem das checagens dentro de cada caso importa.
 */
export function musculoAlvoDoExercicio(nome: string, grupo: string): string {
  const nomeNormalizado = normalizarNome(nome);

  switch (grupo) {
    case 'pernas':
      // Cadeia posterior: flexão de joelho ou extensão de quadril com joelho estendido.
      if (/flexora|stiff|terra romeno|terra rumano|\brdl\b|nordic|bom dia|posterior/.test(nomeNormalizado)) {
        return 'posterior_de_coxa';
      }
      // Dominância de glúteo máximo (extensão de quadril com joelho flexionado).
      if (/elevacao pelvica|ponte de gluteo|coice/.test(nomeNormalizado)) {
        return 'gluteos';
      }
      // Postura aberta ou deslocamento lateral: adutores e glúteos médios.
      if (/sumo|cossaco|afundo lateral|skater|patinador/.test(nomeNormalizado)) {
        return 'adutores';
      }
      // Resto do grupo pernas é dominado por quadríceps (extensão de joelho).
      return 'quadriceps';

    case 'ombro':
      // Cabeça posterior: puxada/abertura horizontal do braço.
      if (/crucifixo inverso|face pull|y-t-w|passaro|peck deck inverso/.test(nomeNormalizado)) {
        return 'deltoide_posterior';
      }
      // Cabeça lateral: abdução do braço.
      if (/elevacao lateral/.test(nomeNormalizado)) {
        return 'deltoide_lateral';
      }
      // Pressão vertical e elevação frontal: cabeça anterior.
      return 'deltoide_anterior';

    case 'core':
      // Oblíquos/anti-rotação: rotação, prancha lateral ou movimento cruzado.
      if (/rotacao|russa|cruzad|bicicleta|prancha lateral|windshield/.test(nomeNormalizado)) {
        return 'obliquos';
      }
      // Anti-extensão/estabilização: isometria de tronco, rollout, carregamento.
      if (/prancha|plank|dead bug|bird dog|pallof|hollow|barco|gato-vaca|bear crawl|montanhista|isometr|com roda/.test(nomeNormalizado)) {
        return 'core_estabilizacao';
      }
      // Flexão de tronco: reto abdominal (abdominais, elevações de pernas).
      return 'reto_abdominal';

    // Grupos já músculo-específicos: o próprio grupo é o músculo-alvo.
    default:
      return grupo;
  }
}
