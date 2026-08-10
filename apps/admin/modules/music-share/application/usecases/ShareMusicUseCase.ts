import { CreateMusicPostDTO, IMusicRepository } from '../../domain/repositories/IMusicRepository';
import { MusicPost } from '../../domain/entities/MusicPost';

export class ShareMusicUseCase {
  constructor(private musicRepository: IMusicRepository) {}

  async execute(data: CreateMusicPostDTO): Promise<MusicPost> {
    if (!data.url || !data.platform) {
      throw new Error('URL e plataforma são obrigatórios.');
    }
    
    // Validação básica do texto de reflexão (max 1000)
    if (data.reflection && data.reflection.length > 1000) {
      throw new Error('A reflexão não pode ultrapassar 1000 caracteres.');
    }

    return this.musicRepository.createPost(data);
  }
}
