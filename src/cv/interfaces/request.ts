

export type TTSJob = {
  seq: number;
  text: string;
  key:string|null
};

export class RequestContext {
  key: string
  abortController: AbortController
  ttsTextQueue: TTSJob[] = []
  audioMap =new Map<number, Buffer>()

  activeWorkers = 0
  processing = false
   seq = 0;
  nextAudioSeq = 0;
 audioQueue: Buffer[] = [];
  MAX_TTS_WORKERS = 3;
  audioWaiters: (() => void)[] = [];
  queueWaiters : (() => void)[] = [];
  isTextDone:boolean= false
  audioEnabled:boolean=false
  pendingEmails: {
    userId:string,
    conversation:string
  }|null


  waitForAudio() {
    return new Promise<void>(resolve => {
      this.audioWaiters.push(resolve);
    });
  }

  notifyAudio() {
    this.audioWaiters.forEach(r => r());
    this.audioWaiters = [];
  }
    notifyQueue() {
  this.queueWaiters.forEach(r => r());
  this.queueWaiters = [];
}
  
 waitForQueue() {
  return new Promise<void>(resolve => {
    if (this.ttsTextQueue.length > 0) {
      resolve();
    } else {
      this.queueWaiters.push(resolve);
    }
  });
}

   stripWavHeader(buffer: Buffer) {
  // standard PCM WAV header is 44 bytes
  return buffer.subarray(44);
}


  
 flushOrderedAudio() {
  
  while (this.audioMap.has(this.nextAudioSeq)) {
   
    const audio = this.audioMap.get(this.nextAudioSeq)!;
    const pcm = this.stripWavHeader(audio)
    this.audioQueue.push(pcm);
    this.audioMap.delete(this.nextAudioSeq);
    this.nextAudioSeq++;
  }

  this.audioWaiters.forEach(r => r());
  this.audioWaiters = [];
}

  constructor(key: string) {
    this.key = key;
    this.abortController = new AbortController()
    this.abortController.signal.addEventListener("abort", () => {
    this.audioWaiters.forEach(r => r());
     this.queueWaiters.forEach(r => r());
    this.audioWaiters = [];
    this.queueWaiters = []
  });
  }
}
