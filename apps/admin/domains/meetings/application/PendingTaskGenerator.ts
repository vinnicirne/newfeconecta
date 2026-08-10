import { PreparationResult } from "./PreparationCalculator";
import { Meeting } from "../domain/Meeting";

export interface PendingAction {
  id: string;
  priority: number;
  icon: string;
  title: string;
  description: string;
  action: {
    type: 'MODAL' | 'LINK' | 'ACTION';
    route?: string;
    params?: any;
  };
}

export class PendingTaskGenerator {
  static generate(meeting: Meeting, prep: PreparationResult): PendingAction[] {
    const tasks: PendingAction[] = [];

    if (!prep.hasWord) {
      tasks.push({
        id: 'word-missing',
        priority: 100,
        icon: 'book',
        title: 'Palavra não definida',
        description: 'Selecione quem será o responsável por ministrar a palavra.',
        action: {
          type: 'MODAL',
          route: 'event-dashboard',
          params: { eventId: meeting.id, tab: 'escala' }
        }
      });
    }

    // Checking if there are other roles missing
    const otherRoles = meeting.roles?.filter(r => !r.role_name.toLowerCase().includes('palavra')) || [];
    const missingRoles = otherRoles.filter(r => !r.assigned_to);
    if (missingRoles.length > 0) {
      tasks.push({
        id: 'roles-missing',
        priority: 80,
        icon: 'shield',
        title: `${missingRoles.length} funções sem responsável`,
        description: 'Complete a escala para garantir o andamento do encontro.',
        action: {
          type: 'MODAL',
          route: 'event-dashboard',
          params: { eventId: meeting.id, tab: 'escala' }
        }
      });
    }

    return tasks.sort((a, b) => b.priority - a.priority);
  }
}
