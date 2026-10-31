export type SleepLiveActivityProps = {
  babyName: string;
  startedAt: string;
  startedAtLabel: string;
};

type SleepLiveActivityInstance = {
  update: (props: SleepLiveActivityProps) => Promise<void>;
  end: (policy?: "immediate" | "default") => Promise<void>;
};

const SleepLiveActivity = {
  getInstances: (): SleepLiveActivityInstance[] => [],
  start: (_props: SleepLiveActivityProps, _url?: string): SleepLiveActivityInstance => ({
    update: async () => undefined,
    end: async () => undefined
  })
};

export default SleepLiveActivity;
