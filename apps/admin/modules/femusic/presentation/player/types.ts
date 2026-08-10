export type AudioPlayerRefs = {
  audioARef: React.RefObject<HTMLAudioElement>;
  audioBRef: React.RefObject<HTMLAudioElement>;
  activeIndex: 0 | 1;
  setActiveIndex: React.Dispatch<React.SetStateAction<0 | 1>>;
  isCrossfading: React.MutableRefObject<boolean>;
  hasTriggeredCrossfade: React.MutableRefObject<boolean>;
  getActiveAudio: () => HTMLAudioElement | null;
  getInactiveAudio: () => HTMLAudioElement | null;
};
