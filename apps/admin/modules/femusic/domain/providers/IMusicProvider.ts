import { MusicTrack } from '../entities/MusicTrack';

export interface IMusicProvider {
  play(track: MusicTrack): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  search(query: string): Promise<MusicTrack[]>;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
}
