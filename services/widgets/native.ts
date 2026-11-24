import { requireOptionalNativeModule } from 'expo';

export interface Placement {
  families: string[];
  accountState?: 'guest' | 'signed_in';
  canPin: boolean;
  pinObservedAt?: number;
  pinFamily?: string;
}
interface Bridge {
  openPublications(owner: string): void;
  beginPublication(owner: string): boolean;
  endPublication(): void;
  closePublications(): Promise<void>;
  matchesOwner(owner: string, generation: string): boolean;
  setOwner(owner: string): string;
  placement(): Promise<Placement>;
  pin(): Promise<boolean>;
}
export const widgetBridge = requireOptionalNativeModule<Bridge>('WordWidget');
