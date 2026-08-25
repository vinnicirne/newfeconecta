/**
 * Utilitário de Conformidade LGPD/ANPD — Proteção de Crianças e Adolescentes
 * Referência: Lei 13.709/2018 (LGPD), Art. 14 — Dados de crianças e adolescentes
 * Referência: Resolução ANPD CD/ANPD nº 15/2024 — Hipóteses de tratamento de dados de crianças
 *
 * Classificação:
 *  - Criança:      0–12 anos  → Proibido sem consentimento expresso e específico dos pais/responsável
 *  - Adolescente: 13–17 anos → Permitido com consentimento expresso dos pais/responsável
 *  - Adulto:      18+ anos   → Acesso livre com aceite dos próprios Termos
 */

export type AgeCategory = 'child' | 'adolescent' | 'adult';

export interface AgeCheckResult {
  age: number;
  category: AgeCategory;
  isBlocked: boolean;      // menores de 13 → bloqueio total
  requiresConsent: boolean; // 13–17 → precisa de consentimento parental
}

/**
 * Calcula a idade real a partir de uma string de data no formato YYYY-MM-DD.
 * Leva em conta o mês e dia exatos para não antecipar o aniversário.
 */
export function calculateAge(birthdate: string): number {
  if (!birthdate) return -1;
  const today = new Date();
  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) return -1;

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Classifica a faixa etária e determina os requisitos de conformidade.
 */
export function checkAgeCompliance(birthdate: string): AgeCheckResult {
  const age = calculateAge(birthdate);

  if (age < 0) {
    return { age: -1, category: 'adult', isBlocked: false, requiresConsent: false };
  }

  if (age < 13) {
    return { age, category: 'child', isBlocked: true, requiresConsent: false };
  }

  if (age < 18) {
    return { age, category: 'adolescent', isBlocked: false, requiresConsent: true };
  }

  return { age, category: 'adult', isBlocked: false, requiresConsent: false };
}

/**
 * Retorna a data máxima permitida para cadastro (13 anos atrás hoje).
 * Usado como atributo max= no <input type="date">.
 */
export function getMinAllowedBirthdate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 13);
  return d.toISOString().split('T')[0];
}

/**
 * Retorna a data máxima possível para o campo de data de nascimento
 * (não permite datas futuras).
 */
export function getMaxBirthdate(): string {
  return new Date().toISOString().split('T')[0];
}
