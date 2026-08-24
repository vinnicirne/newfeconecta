/**
 * Motor Central da Arena de Jogos Bíblicos (Inspirado no aBook & Trivia Bíblica)
 * 100% Isolado, Autônomo e sem dependências externas pesadas.
 */

export interface QuizQuestion {
  id: string;
  question: string;
  verseSnippet?: string;
  reference?: string;
  category: 'Gênesis & Patriarcas' | 'Evangelhos & Jesus' | 'Atos & Igreja Primitiva' | 'Profetas & Reis' | 'Curiosidades & Sabedoria';
  difficulty: 'facil' | 'medio' | 'dificil';
  options: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

export interface GameResult {
  score: number;
  totalQuestions: number;
  correctCount: number;
  timeSpentSeconds: number;
  accuracyPercentage: number;
  rankTitle: string;
  earnedXp: number;
}

// 📚 Acervo Nuclear de Perguntas Bíblicas (Curadoria de Alta Fidelidade)
export const QUIZ_QUESTIONS_DATABASE: QuizQuestion[] = [
  // FÁCIL (Iniciante)
  {
    id: "q-1",
    question: "Quem foi colocado em um cesto de juncos no rio Nilo para ser salvo quando bebê?",
    reference: "Êxodo 2:3",
    category: "Gênesis & Patriarcas",
    difficulty: "facil",
    options: ["Moisés", "José do Egito", "Davi", "Samuel"],
    correctAnswer: "Moisés",
    explanation: "A mãe de Moisés, Joquebede, o colocou no cesto para salvá-lo do decreto do Faraó.",
    points: 100
  },
  {
    id: "q-2",
    question: "Qual era a profissão de Pedro e seu irmão André antes de seguirem a Jesus?",
    reference: "Mateus 4:18",
    category: "Evangelhos & Jesus",
    difficulty: "facil",
    options: ["Pescadores", "Carpinteiros", "Cobradores de impostos", "Pastores de ovelhas"],
    correctAnswer: "Pescadores",
    explanation: "Jesus os encontrou lançando as redes no mar da Galiléia e disse: 'Sigam-me, e eu os farei pescadores de homens'.",
    points: 100
  },
  {
    id: "q-3",
    question: "Qual foi o primeiro milagre público registrado de Jesus?",
    reference: "João 2:1-11",
    category: "Evangelhos & Jesus",
    difficulty: "facil",
    options: ["Transformar água em vinho nas bodas de Caná", "Multiplicar os pães e peixes", "Andar sobre as águas", "Ressuscitar Lázaro"],
    correctAnswer: "Transformar água em vinho nas bodas de Caná",
    explanation: "Jesus manifestou Sua glória pela primeira vez transformando água em vinho em Caná da Galiléia.",
    points: 100
  },
  {
    id: "q-4",
    question: "Quem construiu a arca para salvar sua família e os animais do grande dilúvio?",
    reference: "Gênesis 6:14",
    category: "Gênesis & Patriarcas",
    difficulty: "facil",
    options: ["Noé", "Abraão", "Ló", "Matusalém"],
    correctAnswer: "Noé",
    explanation: "Noé andava com Deus e obedeceu às instruções divinas construindo a arca de madeira de gofer.",
    points: 100
  },
  {
    id: "q-5",
    question: "Com que arma o jovem Davi derrotou o gigante filisteu Golias?",
    reference: "1 Samuel 17:49",
    category: "Profetas & Reis",
    difficulty: "facil",
    options: ["Uma atiradeira (funda) e uma pedra", "A espada do rei Saul", "Uma lança de bronze", "Um arco e flecha"],
    correctAnswer: "Uma atiradeira (funda) e uma pedra",
    explanation: "Davi correu em direção a Golias e atirou uma pedra lisa com sua funda que cravou na testa do gigante.",
    points: 100
  },
  {
    id: "q-6",
    question: "Em qual cidade Jesus nasceu?",
    reference: "Lucas 2:4-7",
    category: "Evangelhos & Jesus",
    difficulty: "facil",
    options: ["Belém", "Nazaré", "Jerusalém", "Cafarnaum"],
    correctAnswer: "Belém",
    explanation: "Jesus nasceu em Belém da Judeia, cumprindo a profecia de Miquéias 5:2.",
    points: 100
  },
  {
    id: "q-7",
    question: "Quem foi engolido por um grande peixe após tentar fugir da ordem de Deus para ir a Nínive?",
    reference: "Jonas 1:17",
    category: "Profetas & Reis",
    difficulty: "facil",
    options: ["Jonas", "Elias", "Daniel", "Jeremias"],
    correctAnswer: "Jonas",
    explanation: "Jonas tentou fugir para Társis, mas foi engolido por um grande peixe onde orou durante 3 dias e 3 noites.",
    points: 100
  },
  {
    id: "q-8",
    question: "Quantos discípulos Jesus escolheu como apóstolos principais?",
    reference: "Mateus 10:1-4",
    category: "Evangelhos & Jesus",
    difficulty: "facil",
    options: ["12", "7", "70", "10"],
    correctAnswer: "12",
    explanation: "Jesus convocou Seus doze discípulos e lhes deu autoridade sobre espíritos imundos e para curar enfermidades.",
    points: 100
  },

  // MÉDIO (Discípulo)
  {
    id: "q-9",
    question: "Qual era o nome original do apóstolo Paulo antes de seu encontro com Jesus na estrada de Damasco?",
    reference: "Atos 9:1-4",
    category: "Atos & Igreja Primitiva",
    difficulty: "medio",
    options: ["Saulo de Tarso", "Silas", "Barnabé", "Simão"],
    correctAnswer: "Saulo de Tarso",
    explanation: "Saulo era um fariseu zeloso que perseguia a igreja até ter uma visão de Cristo ressurreto na estrada para Damasco.",
    points: 150
  },
  {
    id: "q-10",
    question: "Qual profeta subiu ao céu em um redemoinho com uma carruagem e cavalos de fogo?",
    reference: "2 Reis 2:11",
    category: "Profetas & Reis",
    difficulty: "medio",
    options: ["Elias", "Eliseu", "Isaías", "Enoque"],
    correctAnswer: "Elias",
    explanation: "Elias foi arrebatado aos céus diante dos olhos de Eliseu, que recebeu a porção dobrada de seu espírito.",
    points: 150
  },
  {
    id: "q-11",
    question: "Qual rainha arriscou sua própria vida ao comparecer perante o rei sem ser chamada para salvar o povo judeu?",
    reference: "Ester 4:16",
    category: "Profetas & Reis",
    difficulty: "medio",
    options: ["Ester", "Rute", "Bate-Seba", "Jezabel"],
    correctAnswer: "Ester",
    explanation: "A rainha Ester declarou: 'Se perecer, pereci' e jejuou por 3 dias antes de interceder junto ao rei Assuero.",
    points: 150
  },
  {
    id: "q-12",
    question: "No dia de Pentecostes, qual fenômeno visível desceu sobre os discípulos reunidos no cenáculo?",
    reference: "Atos 2:3",
    category: "Atos & Igreja Primitiva",
    difficulty: "medio",
    options: ["Línguas repartidas como que de fogo", "Uma nuvem densa de fumaça", "Uma coluna de luz branca", "Gotas de óleo sagrado"],
    correctAnswer: "Línguas repartidas como que de fogo",
    explanation: "O Espírito Santo foi derramado com som de vento impetuoso e línguas como que de fogo pousaram sobre cada um.",
    points: 150
  },
  {
    id: "q-13",
    question: "Qual foi o homem mais velho registrado na Bíblia Sagrada, que viveu 969 anos?",
    reference: "Gênesis 5:27",
    category: "Curiosidades & Sabedoria",
    difficulty: "medio",
    options: ["Matusalém", "Noé", "Jarede", "Adão"],
    correctAnswer: "Matusalém",
    explanation: "Matusalém, filho de Enoque e avô de Noé, viveu 969 anos antes de falecer no ano do dilúvio.",
    points: 150
  },
  {
    id: "q-14",
    question: "Quem foi o cobrador de impostos de baixa estatura que subiu em uma figueira brava (sicômoro) para ver Jesus passar?",
    reference: "Lucas 19:1-10",
    category: "Evangelhos & Jesus",
    difficulty: "medio",
    options: ["Zaqueu", "Mateus", "Nicodemos", "Bartimeu"],
    correctAnswer: "Zaqueu",
    explanation: "Jesus olhou para cima e disse: 'Zaqueu, desça depressa, pois hoje me convém pousar em sua casa'.",
    points: 150
  },
  {
    id: "q-15",
    question: "Qual o nome do vale de ossos secos que o profeta Ezequiel viu reviver pelo poder da Palavra e do Espírito?",
    reference: "Ezequiel 37:1-10",
    category: "Profetas & Reis",
    difficulty: "medio",
    options: ["Vale dos Ossos Secos", "Vale de Escol", "Vale de Elá", "Vale de Sidim"],
    correctAnswer: "Vale dos Ossos Secos",
    explanation: "Deus ordenou a Ezequiel profetizar sobre os ossos secos, e eles se cobriram de carne e receberam o fôlego de vida.",
    points: 150
  },

  // DIFÍCIL (Mestre Teólogo)
  {
    id: "q-16",
    question: "Qual sacerdote do Deus Altíssimo abençoou Abraão e recebeu dele o dízimo de tudo, sem genealogia registrada?",
    reference: "Gênesis 14:18 / Hebreus 7:1-3",
    category: "Curiosidades & Sabedoria",
    difficulty: "dificil",
    options: ["Melquisedeque", "Arão", "Zadoke", "Eli"],
    correctAnswer: "Melquisedeque",
    explanation: "Melquisedeque, rei de Salém e sacerdote do Deus Altíssimo, é figura profética do sacerdócio perpétuo de Cristo.",
    points: 200
  },
  {
    id: "q-17",
    question: "Quantos capítulos possui o livro do profeta Isaías?",
    reference: "Isaías",
    category: "Curiosidades & Sabedoria",
    difficulty: "dificil",
    options: ["66 capítulos", "52 capítulos", "48 capítulos", "70 capítulos"],
    correctAnswer: "66 capítulos",
    explanation: "O livro de Isaías possui 66 capítulos, refletindo a estrutura da própria Bíblia (39 do AT e 27 do NT).",
    points: 200
  },
  {
    id: "q-18",
    question: "Em qual ilha o apóstolo João estava exilado quando recebeu a revelação do Apocalipse?",
    reference: "Apocalipse 1:9",
    category: "Atos & Igreja Primitiva",
    difficulty: "dificil",
    options: ["Ilha de Patmos", "Ilha de Malta", "Ilha de Creta", "Ilha de Chipre"],
    correctAnswer: "Ilha de Patmos",
    explanation: "João estava na ilha chamada Patmos por causa da palavra de Deus e do testemunho de Jesus Cristo.",
    points: 200
  },
  {
    id: "q-19",
    question: "Qual era o nome do juiz de Israel que derrotou os midianitas com apenas 300 homens equipados com tochas e buzinas?",
    reference: "Juízes 7:7",
    category: "Profetas & Reis",
    difficulty: "dificil",
    options: ["Gideão", "Sansão", "Jefté", "Baraque"],
    correctAnswer: "Gideão",
    explanation: "O Senhor reduziu o exército de Gideão para 300 homens para demonstrar que a vitória vinha do poder divino.",
    points: 200
  },
  {
    id: "q-20",
    question: "Quais eram os nomes dos três jovens hebreus lançados na fornalha ardente pelo rei Nabucodonosor?",
    reference: "Daniel 3:19-25",
    category: "Profetas & Reis",
    difficulty: "dificil",
    options: ["Sadraque, Mesaque e Abede-Nego", "Efraim, Manassés e Benjamim", "Nadabe, Abiú e Eleazar", "Esdras, Neemias e Zorobabel"],
    correctAnswer: "Sadraque, Mesaque e Abede-Nego",
    explanation: "Eles recusaram adorar a estátua de ouro, e Deus os livrou da fornalha, aparecendo com eles como o Filho de Deus.",
    points: 200
  }
];

// Motor do Gerador de Desafios Diários (Inspirado no aBook)
export function getRandomDailyQuestions(count: number = 5, difficulty?: 'facil' | 'medio' | 'dificil'): QuizQuestion[] {
  let pool = [...QUIZ_QUESTIONS_DATABASE];
  if (difficulty) {
    pool = pool.filter(q => q.difficulty === difficulty);
  }
  
  // Algoritmo Fisher-Yates de Embaralhamento Seguro
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count).map(q => ({
    ...q,
    options: [...q.options].sort(() => Math.random() - 0.5)
  }));
}

// Avaliador de Rank de Desempenho
export function calculateRank(score: number, accuracy: number): { rank: string; color: string; medal: string } {
  if (accuracy >= 100) return { rank: "Mestre das Escrituras 🌟", color: "text-amber-400", medal: "🥇 Ouro da Fé" };
  if (accuracy >= 80) return { rank: "Discípulo Sábio 📖", color: "text-emerald-400", medal: "🥈 Prata de Honra" };
  if (accuracy >= 60) return { rank: "Guerreiro Aprendiz ⚔️", color: "text-blue-400", medal: "🥉 Bronze da Perseverança" };
  return { rank: "Buscador da Palavra 🌱", color: "text-gray-400", medal: "✨ Estrela de Participação" };
}
