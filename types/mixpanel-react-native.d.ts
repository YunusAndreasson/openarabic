declare module 'mixpanel-react-native' {
  export class Mixpanel {
    constructor(
      token: string,
      trackAutomaticEvents?: boolean,
      useNative?: boolean,
      serverURL?: string,
      optOutTrackingDefault?: boolean,
      superProperties?: Record<string, any>
    );

    init(): Promise<void>;
    track(eventName: string, properties?: Record<string, any>): Promise<void>;
    identify(distinctId: string): Promise<void>;
    reset(): Promise<void>;
    getPeople(): {
      set(properties: Record<string, any>): Promise<void>;
      setOnce(properties: Record<string, any>): Promise<void>;
      increment(property: string, value: number): Promise<void>;
      append(property: string, value: any): Promise<void>;
      union(property: string, values: any[]): Promise<void>;
      remove(property: string, value: any): Promise<void>;
      unset(property: string): Promise<void>;
      trackCharge(amount: number, properties?: Record<string, any>): Promise<void>;
    };
    getGroup(
      groupKey: string,
      groupID: string | number
    ): {
      set(properties: Record<string, any>): Promise<void>;
      setOnce(properties: Record<string, any>): Promise<void>;
      union(property: string, values: any[]): Promise<void>;
      remove(property: string, value: any): Promise<void>;
      unset(property: string): Promise<void>;
    };
    setGroup(groupKey: string, groupID: string | number | (string | number)[]): Promise<void>;
    getDistinctId(): Promise<string>;
    optInTracking(): Promise<void>;
    optOutTracking(): Promise<void>;
    setLoggingEnabled(enabled: boolean): Promise<void>;
    registerSuperProperties(properties: Record<string, any>): Promise<void>;
    registerSuperPropertiesOnce(properties: Record<string, any>): Promise<void>;
    unregisterSuperProperty(propertyName: string): Promise<void>;
    timeEvent(eventName: string): Promise<void>;
    eventElapsedTime(eventName: string): Promise<number>;
    clearTimedEvents(): Promise<void>;
    getDeviceId(): Promise<string>;
    setServerURL(serverURL: string): Promise<void>;
    setUseIpAddressForGeolocation(enabled: boolean): Promise<void>;
  }
}
