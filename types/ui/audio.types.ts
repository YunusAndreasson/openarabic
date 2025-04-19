export interface AudioControlPanelProps {
  isVisible: boolean;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onPrevious: () => void;
  onNext: () => void;
  currentSentenceIndex: number | null;
  totalSentences: number;
}
