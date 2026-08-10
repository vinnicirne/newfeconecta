import { ExtractedMetadata, IMetadataProvider } from '../../domain/repositories/IMetadataProvider';

export class ExtractMetadataUseCase {
  constructor(private providers: IMetadataProvider[]) {}

  async execute(url: string): Promise<ExtractedMetadata> {
    for (const provider of this.providers) {
      if (provider.canHandle(url)) {
        return provider.extractMetadata(url);
      }
    }
    throw new Error('Plataforma de música não suportada ou URL inválida.');
  }
}
