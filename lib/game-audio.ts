type LiquidKind = "milk" | "water" | "soda" | "juice";

// Royalty-free recordings from Mixkit, used under the Mixkit Sound Effects license.
const recordings = {
  doorClose: "https://assets.mixkit.co/active_storage/sfx/189/189-preview.mp3",
  floorCreak: "https://assets.mixkit.co/active_storage/sfx/337/337-preview.mp3",
  footsteps: "https://assets.mixkit.co/active_storage/sfx/542/542-preview.mp3",
  stairFootsteps: "https://assets.mixkit.co/active_storage/sfx/543/543-preview.mp3",
  cabinetClose: "https://assets.mixkit.co/active_storage/sfx/192/192-preview.mp3",
  fridgeOpen: "https://assets.mixkit.co/active_storage/sfx/1861/1861-preview.mp3",
  fridgeClose: "https://assets.mixkit.co/active_storage/sfx/1862/1862-preview.mp3",
  fridgeHum: "https://assets.mixkit.co/active_storage/sfx/1837/1837-preview.mp3",
  closet: "https://assets.mixkit.co/active_storage/sfx/1905/1905-preview.mp3",
  laptopKey: "https://assets.mixkit.co/active_storage/sfx/2541/2541-preview.mp3",
  laptopTyping: "https://assets.mixkit.co/active_storage/sfx/2531/2531-preview.mp3",
  phoneTyping: "/sounds/mixkit-smartphone-typing-1393.mp3",
  phoneRingtone: "https://assets.mixkit.co/active_storage/sfx/1356/1356-preview.mp3",
  remote: "https://assets.mixkit.co/active_storage/sfx/3088/3088-preview.mp3",
  tvReel: "/sounds/mixkit-reel-to-reel-rewind-1095.mp3",
  tvStatic: "https://assets.mixkit.co/active_storage/sfx/2561/2561-preview.mp3",
  tvProgram: "https://assets.mixkit.co/active_storage/sfx/3089/3089-preview.mp3",
  eat: "https://assets.mixkit.co/active_storage/sfx/2252/2252-preview.mp3",
  crunch: "https://assets.mixkit.co/active_storage/sfx/122/122-preview.mp3",
  dishDown: "https://assets.mixkit.co/active_storage/sfx/2933/2933-preview.mp3",
  swallow: "https://assets.mixkit.co/active_storage/sfx/150/150-preview.mp3",
  sip: "https://assets.mixkit.co/active_storage/sfx/1307/1307-preview.mp3",
  pourWater: "https://assets.mixkit.co/active_storage/sfx/2826/2826-preview.mp3",
  pourSoda: "https://assets.mixkit.co/active_storage/sfx/2833/2833-preview.mp3",
  sodaFizz: "https://assets.mixkit.co/active_storage/sfx/3181/3181-preview.mp3",
  frying: "https://assets.mixkit.co/active_storage/sfx/121/121-preview.mp3",
  stove: "/sounds/mixkit-gas-stove-hum-1831.mp3",
  stoveSwitch: "/sounds/mixkit-electric-switch-1808.mp3",
  bowlDown: "/sounds/mixkit-bowl-placed-on-table-1799.mp3",
  coffeeKettle: "/sounds/mixkit-kettle-boiling-1817.mp3",
  coffeePour: "/sounds/mixkit-coffee-pour-2826.mp3",
  coffeeStir: "/sounds/mixkit-stirring-cup-2835.mp3",
  dishes: "https://assets.mixkit.co/active_storage/sfx/2935/2935-preview.mp3",
  sink: "https://assets.mixkit.co/active_storage/sfx/1819/1819-preview.mp3",
  sinkWater: "https://assets.mixkit.co/active_storage/sfx/1875/1875-preview.mp3",
  soap: "https://assets.mixkit.co/active_storage/sfx/1881/1881-preview.mp3",
  soapDispenser: "https://assets.mixkit.co/active_storage/sfx/1883/1883-preview.mp3",
  shower: "https://assets.mixkit.co/active_storage/sfx/1870/1870-preview.mp3",
  quickShower: "https://assets.mixkit.co/active_storage/sfx/1880/1880-preview.mp3",
  bathtub: "https://assets.mixkit.co/active_storage/sfx/1876/1876-preview.mp3",
  toilet: "/sounds/mixkit-hard-toilet-flush-1872.mp3",
  pillow: "https://assets.mixkit.co/active_storage/sfx/1901/1901-preview.mp3",
  sleep: "https://assets.mixkit.co/active_storage/sfx/1914/1914-preview.mp3",
  cloth: "https://assets.mixkit.co/active_storage/sfx/1898/1898-preview.mp3",
} as const;

type Recording = keyof typeof recordings;

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private activeRecordings = new Set<HTMLAudioElement>();
  private activeByKey = new Map<Recording, HTMLAudioElement>();
  private preloaded = new Map<Recording, HTMLAudioElement>();
  private queuedActions: Array<() => void> = [];
  private busyUntil = 0;
  private queueTimer: number | null = null;

  primeRecordings() {
    if (typeof Audio === "undefined") return;
    (["toilet", "tvReel", "stove", "stoveSwitch", "phoneTyping", "bowlDown", "coffeeKettle", "coffeePour", "coffeeStir"] as Recording[]).forEach(key => this.prepareRecording(key));
  }

  private prepareRecording(key: Recording) {
    if (typeof Audio === "undefined" || this.preloaded.has(key)) return;
    const sound = new Audio(recordings[key]);
    sound.preload = "auto";
    sound.load();
    this.preloaded.set(key, sound);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.activeRecordings.forEach(sound => { sound.pause(); sound.currentTime = 0; });
      this.activeRecordings.clear();
      this.activeByKey.clear();
      this.queuedActions = [];
      this.busyUntil = 0;
      if (this.queueTimer !== null) window.clearTimeout(this.queueTimer);
      this.queueTimer = null;
    }
  }

  private ready() {
    if (!this.enabled || typeof window === "undefined") return false;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") void this.context.resume();
    return true;
  }

  private drainQueuedAction() {
    if (this.activeRecordings.size > 0) return;
    const remaining = this.busyUntil - Date.now();
    if (remaining > 0) {
      if (this.queueTimer !== null) window.clearTimeout(this.queueTimer);
      this.queueTimer = window.setTimeout(() => {
        this.queueTimer = null;
        this.drainQueuedAction();
      }, remaining);
      return;
    }
    const next = this.queuedActions.shift();
    next?.();
  }

  private enqueueAction(action: () => void) {
    this.queuedActions.push(action);
    this.drainQueuedAction();
  }

  private playRecording(key: Recording, onUnavailable?: () => void, volume = 0.72, onFinished?: () => void) {
    if (!this.ready() || typeof Audio === "undefined") return false;
    const previous = this.activeByKey.get(key);
    if (previous) {
      previous.dispatchEvent(new Event("ended"));
      previous.pause();
      previous.currentTime = 0;
      this.activeRecordings.delete(previous);
    }
    const sound = this.preloaded.get(key) || new Audio(recordings[key]);
    this.preloaded.delete(key);
    this.prepareRecording(key);
    let settled = false;
    let playbackStarted = false;
    const cleanup = () => {
      this.activeRecordings.delete(sound);
      if (this.activeByKey.get(key) === sound) this.activeByKey.delete(key);
    };
    const reportUnavailable = () => {
      if (settled || playbackStarted || !this.enabled) return;
      settled = true;
      window.clearTimeout(startTimer);
      sound.pause();
      cleanup();
      onUnavailable?.();
      onFinished?.();
      this.drainQueuedAction();
    };
    const confirmPlayback = () => {
      if (settled) return;
      playbackStarted = true;
      window.clearTimeout(startTimer);
    };
    sound.preload = "auto";
    sound.volume = volume;
    this.activeRecordings.add(sound);
    this.activeByKey.set(key, sound);
    const startTimer = window.setTimeout(reportUnavailable, 2500);
    const finish = () => {
      settled = true;
      window.clearTimeout(startTimer);
      cleanup();
      onFinished?.();
      this.drainQueuedAction();
    };
    sound.addEventListener("playing", confirmPlayback, { once: true });
    sound.addEventListener("ended", finish, { once: true });
    sound.addEventListener("error", reportUnavailable, { once: true });
    void sound.play().then(confirmPlayback).catch(reportUnavailable);
    return true;
  }

  private tone(frequency: number, start: number, duration: number, volume = 0.12, type: OscillatorType = "sine", endFrequency?: number) {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.025, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    this.busyUntil = Math.max(this.busyUntil, Date.now() + Math.max(0, (start + duration - this.context.currentTime) * 1000));
  }

  private noise(start: number, duration: number, volume = 0.09, low = 180, high = 5000) {
    if (!this.context || !this.master) return;
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * duration), this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1;
    const source = this.context.createBufferSource();
    const band = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    band.type = "bandpass";
    band.frequency.value = Math.sqrt(low * high);
    band.Q.value = Math.max(0.3, band.frequency.value / (high - low));
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.04, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(band).connect(gain).connect(this.master);
    source.start(start);
    this.busyUntil = Math.max(this.busyUntil, Date.now() + Math.max(0, (start + duration - this.context.currentTime) * 1000));
  }

  playSelection() {
    if (!this.ready() || !this.context) return;
    const now = this.context.currentTime;
    this.tone(660, now, 0.08, 0.08);
    this.tone(880, now + 0.07, 0.12, 0.07);
  }

  playObjectOpen(kind: string) {
    if (!this.ready() || !this.context) return;
    const now = this.context.currentTime;
    if (kind === "fridge") return this.playRecording("fridgeOpen");
    if (kind === "door") return this.playRecording("doorClose");
    if (kind === "closet" || kind === "linen") return this.playRecording("closet");
    if (kind === "laptop") return this.playRecording("laptopKey");
    if (["cookwareCabinet", "dishCabinet", "pantry", "silverwareDrawer"].includes(kind)) return this.playRecording("cabinetClose");
    this.tone(430, now, 0.07, 0.065, "triangle");
    this.tone(610, now + 0.06, 0.1, 0.055, "triangle");
  }

  playObjectClose(kind: string, onUnavailable?: () => void) {
    if (!this.ready() || !this.context) return false;
    if (kind === "fridge") return this.playRecording("fridgeClose", onUnavailable);
    if (kind === "laptop") return this.playRecording("cabinetClose", onUnavailable);
    if (kind === "closet" || kind === "linen") return this.playRecording("doorClose", onUnavailable);
    return false;
  }

  playMovement(stairs = false) {
    if (!this.ready() || !this.context) return;
    const now = this.context.currentTime;
    this.playRecording(stairs ? "stairFootsteps" : "footsteps", undefined, 0.68);
    if (stairs) window.setTimeout(() => this.playRecording("floorCreak", undefined, 0.48), 260);
  }

  playOutdoorAmbience(period: "morning" | "afternoon" | "evening" | "night") {
    if (!this.ready() || !this.context) return false;
    const now = this.context.currentTime;
    if (period === "morning") {
      this.noise(now, 2.4, 0.028, 180, 2200);
      [0.15, 0.52, 1.1, 1.48, 2.02].forEach((offset, index) => {
        this.tone(index % 2 ? 2100 : 2650, now + offset, 0.1, 0.045, "sine", index % 2 ? 2850 : 3300);
      });
    } else if (period === "afternoon") {
      this.noise(now, 2.6, 0.035, 90, 1600);
      this.tone(96, now + 0.2, 2.1, 0.025, "sine", 112);
    } else {
      this.noise(now, 2.7, 0.022, 120, 1400);
      const spacing = period === "night" ? 0.22 : 0.3;
      for (let index = 0; index < 9; index += 1) {
        const at = now + 0.15 + index * spacing;
        this.tone(index % 2 ? 3650 : 4100, at, 0.045, period === "night" ? 0.035 : 0.026, "sine");
      }
    }
    return true;
  }

  playActionSequence(kind: string, action: string, onUnavailable?: () => void, footsteps: false | "before" | "after" = false): boolean {
    if (!this.ready()) return false;
    this.enqueueAction(() => {
      const playAction = () => {
        if (footsteps === "after") this.queuedActions.unshift(() => {
          this.playRecording("footsteps", undefined, 0.68);
        });
        const played = this.playHousehold(kind, action, onUnavailable);
        if (!played) {
          onUnavailable?.();
          this.drainQueuedAction();
        } else this.drainQueuedAction();
      };
      if (footsteps === "before") this.playRecording("footsteps", undefined, 0.68, playAction);
      else playAction();
    });
    return true;
  }

  queueObjectClose(kind: string) {
    if (!this.ready()) return false;
    this.enqueueAction(() => {
      const played = this.playObjectClose(kind);
      if (!played) this.drainQueuedAction();
    });
    return true;
  }

  queueObjectOpen(kind: string) {
    if (!this.ready()) return false;
    this.enqueueAction(() => {
      this.playObjectOpen(kind);
      this.drainQueuedAction();
    });
    return true;
  }

  private playFootstepsAt(start: number, stairs: boolean) {
    for (let step = 0; step < (stairs ? 8 : 6); step += 1) {
      const at = start + step * (stairs ? 0.25 : 0.2);
      this.noise(at, stairs ? 0.09 : 0.065, stairs ? 0.14 : 0.1, 70, 460);
      this.tone(step % 2 ? 105 : 92, at, 0.08, stairs ? 0.1 : 0.07, "sine");
    }
  }

  private playFloorCreakAt(start: number) {
    this.tone(170, start, 0.42, 0.07, "sawtooth", 92);
    this.noise(start, 0.38, 0.04, 100, 900);
  }

  private playDoorAt(start: number) {
    this.tone(145, start, 0.34, 0.08, "sawtooth", 92);
    this.noise(start + 0.04, 0.28, 0.045, 120, 1100);
    this.tone(520, start + 0.34, 0.055, 0.12, "triangle", 300);
  }

  private playHingeAt(start: number, closing = false) {
    this.tone(closing ? 240 : 190, start, 0.22, 0.055, "triangle", closing ? 110 : 330);
    this.tone(closing ? 105 : 520, start + 0.19, 0.06, 0.1, "square");
  }

  private playFridgeLatch(start: number, closing = false) {
    this.tone(closing ? 150 : 120, start, 0.08, 0.15, "square", closing ? 90 : 185);
    this.noise(start + 0.02, 0.12, 0.08, 80, 800);
    if (!closing) this.tone(78, start + 0.09, 0.5, 0.045, "sine");
  }

  private playLiquidAt(kind: LiquidKind, start: number) {
    const duration = kind === "juice" ? 1.55 : kind === "milk" ? 1.45 : 1.3;
    this.noise(start, duration, kind === "soda" ? 0.12 : 0.09, kind === "water" ? 700 : 190, kind === "soda" ? 9000 : 2200);
    const glugs = kind === "juice" ? 7 : kind === "milk" ? 5 : 3;
    for (let index = 0; index < glugs; index += 1) {
      const at = start + 0.16 + index * (duration - 0.3) / glugs;
      this.tone(kind === "juice" ? 115 : kind === "milk" ? 155 : 360, at, 0.09, 0.07, "sine", kind === "juice" ? 82 : 210);
    }
  }

  private playRunningWater(start: number, duration = 1.5) {
    this.tone(1320, start, 0.09, 0.05, "triangle", 780);
    this.noise(start + 0.06, duration, 0.105, 650, 7500);
    this.tone(760, start + duration + 0.06, 0.1, 0.05, "triangle", 1250);
  }

  playHousehold(kind: string, action: string, onUnavailable?: () => void): boolean {
    if (!this.ready() || !this.context) return false;
    const now = this.context.currentTime;
    const recorded = (key: Recording, _oldFallback: () => void, volume?: number) => this.playRecording(key, onUnavailable, volume);
    const supplemental = (key: Recording, volume?: number) => this.playRecording(key, undefined, volume);

    if (kind === "fridge") {
      recorded("fridgeClose", () => this.playFridgeLatch(now, true));
      return true;
    }

    if (kind === "counter") {
      if (action === "make-cereal") {
        recorded("bowlDown", () => this.tone(880, now, 0.1, 0.05));
        window.setTimeout(() => supplemental("pourWater", 0.62), 450);
        return true;
      }
      if (action.startsWith("pour-")) {
        const liquid = action.replace("pour-", "") as LiquidKind;
        recorded(liquid === "soda" ? "pourSoda" : "pourWater", () => this.playLiquidAt(liquid, now));
        if (liquid === "soda") window.setTimeout(() => supplemental("sodaFizz", 0.5), 650);
        return true;
      }
      if (action.startsWith("drink-")) {
        recorded(action === "drink-soda" ? "sip" : "swallow", () => this.tone(210, now, 0.5, 0.07, "sine", 110));
        return true;
      }
      if (action === "cook-eggs" || action === "reheat-food") {
        recorded("stove", () => this.noise(now, 1.2, 0.08, 180, 3200));
        window.setTimeout(() => supplemental("bowlDown"), 1800);
        return true;
      }
      if (action === "serve-bowl") {
        recorded("bowlDown", () => this.tone(880, now, 0.1, 0.05));
        return true;
      }
      if (action === "eat-soft-food" || action === "eat-crunchy-food") {
        recorded(action === "eat-crunchy-food" ? "crunch" : "eat", () => this.noise(now, 1.1, 0.06, 160, 2100));
        return true;
      }
      if (action === "set-dish-down") {
        recorded("dishDown", () => this.tone(880, now, 0.1, 0.05));
        return true;
      }
      if (action === "serve-bowl") {
        recorded("bowlDown", () => this.tone(880, now, 0.1, 0.05));
        return true;
      }
      if (action === "pick-up-glass") {
        recorded("dishDown", () => this.tone(760, now, 0.09, 0.045), 0.48);
        return true;
      }
      if (action === "return-fridge") {
        recorded("fridgeClose", () => this.playFridgeLatch(now, true));
        return true;
      }
      if (action === "return-cabinet") {
        recorded("cabinetClose", () => this.playHingeAt(now, true));
        return true;
      }
      return false;
    }

    if (["cookwareCabinet", "dishCabinet", "pantry", "silverwareDrawer"].includes(kind)) {
      recorded("cabinetClose", () => this.playHingeAt(now, action.includes("put") || action.includes("return")));
      return true;
    }

    if (kind === "coffeeTable" || kind === "diningTable") {
      if (action.startsWith("drink-")) {
        recorded(action.includes("soda") ? "sip" : "swallow", () => this.tone(210, now, 0.5, 0.07, "sine", 110));
        return true;
      }
      if (action === "eat-soft-food" || action === "eat-crunchy-food") {
        recorded(action === "eat-crunchy-food" ? "crunch" : "eat", () => this.noise(now, 1.1, 0.06, 160, 2100));
        return true;
      }
      if (action === "set-dish-down" || action === "pick-up-glass") {
        recorded("dishDown", () => this.tone(880, now, 0.1, 0.05));
        return true;
      }
      return false;
    }

    if (kind === "kitchenSink") {
      if (action === "set-dish-down" || action === "pick-up-glass") {
        recorded("dishDown", () => this.tone(880, now, 0.1, 0.05));
        return true;
      }
      recorded(action === "wash" ? "sink" : "sinkWater", () => this.playRunningWater(now, 1.7));
      if (action === "wash") window.setTimeout(() => supplemental("dishes"), 500);
      if (action === "hands") window.setTimeout(() => supplemental("soap"), 350);
      return true;
    }
    if (kind === "bins" || kind === "outdoorGarbageBin" || kind === "outdoorRecyclingBin") {
      this.noise(now, action === "empty-bin" ? 0.9 : 0.55, 0.075, 110, 2100);
      this.tone(action === "empty-bin" ? 120 : 180, now + 0.18, 0.32, 0.055, "sawtooth", 85);
      return true;
    }
    if (kind === "bathSink") {
      if (action === "mirror") return false;
      recorded("sinkWater", () => this.playRunningWater(now, 1.4));
      if (action === "face") window.setTimeout(() => supplemental("soapDispenser"), 250);
      return true;
    }
    if (kind === "shower") { recorded(action === "quick" ? "quickShower" : "shower", () => this.playRunningWater(now, 2.2)); return true; }
    if (kind === "tub") { recorded("bathtub", () => this.playRunningWater(now, 2.3)); return true; }
    if (kind === "toilet" && action === "use") { recorded("toilet", () => this.playRunningWater(now, 1.8)); return true; }
    if (kind === "stove") {
      if (action === "stove-on") {
        recorded("stoveSwitch", () => this.tone(540, now, 0.12, 0.08, "square"));
        window.setTimeout(() => supplemental("stove", 0.68), 220);
        return true;
      }
      if (action === "stove-off") {
        recorded("stoveSwitch", () => this.tone(360, now, 0.12, 0.08, "square"));
        return true;
      }
      if (action === "put-away-cookware") {
        recorded("cabinetClose", () => this.playHingeAt(now, true));
        return true;
      }
      if (action === "set-dish-down" || action === "add-ingredient" || action === "serve-bowl") {
        recorded(action === "serve-bowl" ? "bowlDown" : "dishDown", () => this.tone(880, now, 0.1, 0.05));
        return true;
      }
      if (action === "heat-cookware" || action === "finish-cooking") {
        recorded("stove", () => this.noise(now, 1.45, 0.085, 450, 5200));
        return true;
      }
      if (action === "cook-food") {
        recorded("frying", () => this.noise(now, 1.8, 0.09, 650, 6200));
        return true;
      }
      return false;
    }
    if (kind === "coffeeMachine") {
      recorded("coffeeKettle", () => this.playRunningWater(now, 2.2), 0.64);
      window.setTimeout(() => supplemental("coffeePour", 0.7), 2300);
      window.setTimeout(() => supplemental("coffeeStir", 0.58), 5000);
      return true;
    }
    if (kind === "tv") {
      recorded("tvReel", () => this.tone(action === "off" ? 440 : 260, now, 0.35, 0.09, "square"));
      return true;
    }
    if (kind === "gameConsole") {
      if (action !== "watch" && action !== "browse" && action !== "off" && action !== "use") return false;
      recorded("remote", () => this.tone(action === "off" ? 440 : 260, now, 0.12, 0.09, "square"));
      if (action !== "off") window.setTimeout(() => supplemental(action === "browse" ? "tvStatic" : "tvProgram"), 350);
      return true;
    }
    if (kind === "phone") {
      recorded("phoneTyping", () => this.tone(880, now, 0.16, 0.08));
      if (action === "call") window.setTimeout(() => supplemental("phoneRingtone"), 850);
      return true;
    }
    if (kind === "laptop" || kind === "desk") {
      recorded("laptopTyping", () => {
        for (let index = 0; index < 7; index += 1) this.tone(1100 + index * 70, now + index * 0.065, 0.035, 0.035, "square");
      });
      return true;
    }
    if (kind === "bed" || kind === "guestBed") {
      recorded(action === "make" ? "cloth" : "pillow", () => this.noise(now, 0.5, 0.065, 90, 1100));
      if (action !== "make") window.setTimeout(() => supplemental("sleep"), 650);
      return true;
    }
    if ((kind === "sofa" || kind === "chair") && action !== "read") { recorded("pillow", () => this.noise(now, 0.5, 0.065, 90, 1100)); return true; }
    if (kind === "closet" || kind === "linen") { recorded("cloth", () => this.noise(now, 0.5, 0.055, 140, 1600)); return true; }
    if (kind === "lamp") { this.tone(1800, now, 0.035, 0.06, "square", 900); return true; }
    if (action === "clean") { recorded("cloth", () => this.noise(now, 0.55, 0.05, 180, 1600)); return true; }
    return false;
  }
}
