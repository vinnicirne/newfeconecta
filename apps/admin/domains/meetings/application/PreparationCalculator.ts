import { Meeting } from "../domain/Meeting";

export interface PreparationResult {
  score: number;
  completed: string[];
  pending: string[];
  hasWord: boolean;
}

export interface PreparationStrategy {
  calculate(meeting: Meeting): PreparationResult;
}

export class CellPreparationStrategy implements PreparationStrategy {
  calculate(meeting: Meeting): PreparationResult {
    const completed: string[] = [];
    const pending: string[] = [];
    let score = 0;
    let hasWord = false;

    // Se for um evento social, não precisa de palavra
    if (meeting.metadata?.isSocial) {
      score += 30; // Dá a pontuação total da palavra
      hasWord = true; // Para não exibir o pending task
      completed.push("Evento Social (Palavra opcional)");
    } else {
      // Palavra (30%)
      const palavraRole = meeting.roles?.find(r => r.role_name.toLowerCase().includes('palavra'));
      if (palavraRole && palavraRole.assigned_to) {
        score += 30;
        hasWord = true;
        completed.push("Palavra definida");
      } else {
        pending.push("Definir responsável pela Palavra");
      }
    }

    // Escala (30%)
    const otherRoles = meeting.roles?.filter(r => !r.role_name.toLowerCase().includes('palavra')) || [];
    if (otherRoles.length > 0) {
      const assigned = otherRoles.filter(r => r.assigned_to).length;
      const ratio = assigned / otherRoles.length;
      score += Math.round(30 * ratio);
      if (ratio === 1) completed.push("Escalas preenchidas");
      else pending.push(`${otherRoles.length - assigned} funções sem responsável`);
    } else {
      // If no roles, we just give the score or leave it pending?
      // For cells, having no roles is weird but we don't penalize fully
      score += 15; 
      pending.push("Criar escalas");
    }

    // Louvor (20%) - Not implemented fully in entity yet
    // Mocking for now
    score += 20; 
    completed.push("Louvor não mapeado ainda");

    // Presença (20%) - Not implemented fully in entity yet
    score += 20;
    completed.push("Presença não mapeada ainda");

    return {
      score: Math.min(100, score),
      completed,
      pending,
      hasWord
    };
  }
}

export class PreparationCalculator {
  static calculateFor(meeting: Meeting, groupType: string): PreparationResult {
    let strategy: PreparationStrategy;

    if (groupType === 'célula') {
      strategy = new CellPreparationStrategy();
    } else {
      // Falback strategy
      strategy = new CellPreparationStrategy(); 
    }

    return strategy.calculate(meeting);
  }
}
