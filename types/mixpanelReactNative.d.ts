declare module 'mixpanel-react-native' {
  export interface MixpanelProperties {
    [key: string]: string | number | boolean | null | undefined | Date | MixpanelProperties;
  }

  export interface MixpanelInstance {
    initialize(): Promise<void>;
    identify(distinctId: string): Promise<void>;
    reset(): Promise<void>;
    track(eventName: string, properties?: MixpanelProperties): Promise<void>;
    getPeople(): Promise<MixpanelPeople>;
    set(properties: MixpanelProperties): Promise<void>;
    setOnce(properties: MixpanelProperties): Promise<void>;
    unset(property: string): Promise<void>;
    append(property: string, value: string | number | boolean | null | Date): Promise<void>;
    union(property: string, values: (string | number | boolean | null | Date)[]): Promise<void>;
    remove(property: string, value: string | number | boolean | null | Date): Promise<void>;
    trackCharge(amount: number, properties?: MixpanelProperties): Promise<void>;
    clearCharges(): Promise<void>;
    deleteUser(): Promise<void>;
  }

  export interface MixpanelPeople {
    set(properties: MixpanelProperties): Promise<void>;
    setOnce(properties: MixpanelProperties): Promise<void>;
    union(property: string, values: (string | number | boolean | null | Date)[]): Promise<void>;
    remove(property: string, value: string | number | boolean | null | Date): Promise<void>;
    increment(property: string, value: number): Promise<void>;
  }

  export interface Mixpanel {
    sharedInstanceWithToken(token: string): Promise<void>;
    getDistinctId(): Promise<string>;
    optInTracking(): Promise<void>;
    optOutTracking(): Promise<void>;
    registerSuperProperties(properties: MixpanelProperties): Promise<void>;
    registerSuperPropertiesOnce(properties: MixpanelProperties): Promise<void>;
    initializeWithToken(token: string): Promise<void>;
    instance: MixpanelInstance;
  }
}
