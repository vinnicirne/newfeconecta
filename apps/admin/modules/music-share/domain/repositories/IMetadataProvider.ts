import { MusicPlatform, MusicType } from '../entities/MusicPost';

export interface ExtractedMetadata {
  platform: MusicPlatform;
  type: MusicType;
  externalId: string;
  title: string;
  artist?: string;
  album?: string;
  cover?: string;
  duration?: number;
  url: string;
}

export interface IMetadataProvider {
  canHandle(url: string): boolean;
  extractMetadata(url: string): Promise<ExtractedMetadata>;
}
