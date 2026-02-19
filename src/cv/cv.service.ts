import { Inject, Injectable ,MessageEvent} from '@nestjs/common';
import axios from 'axios';
import { ResponderService } from 'src/responder/responder.service';
import * as fs from 'fs'
import FormData from 'form-data'
import { OllamaWarmer } from 'src/core/ollamaWarmer';
import {Response} from 'express'
import { OLLAMA_URL, PIPER_URL } from 'src/core/constants';
import { QuestionDto } from './dto/create-cv.dto';
import { Observable } from 'rxjs';

type TTSJob = {
  seq: number;
  text: string;
  key:string|null
};

@Injectable()
export class CvService {

    private audioQueue: Buffer[] = [];
    private MAX_TTS_WORKERS = 3;
    private activeWorkers = 0;
    private processing = false;
    private audioMap = new Map<number, Buffer>();
    private nextAudioSeq = 0;
    private seq = 0;
    private ttsTextQueue: TTSJob[] = [];
    private audioWaiters: (() => void)[] = [];
    private queueWaiters : (() => void)[] = [];
    private activeRequestId :null|string;
    constructor(
         private readonly responder:ResponderService ,
        private readonly warmer : OllamaWarmer 
){}


 messageUpdater ():Observable<MessageEvent> {
  return new Observable(observer => {

      observer.next({ data: { status: 'Analyzing question...' } });

      setTimeout(() => {
        observer.next({ data: { status: 'Searching CV...' } });
      }, 1500);

      setTimeout(() => {
        observer.next({ data: { status: 'Generating answer...' } });
      }, 3000);

      setTimeout(() => {
        observer.next({ data: { final: 'Here is the answer...' } });
        observer.complete();
      }, 6000);

    });
}

async askModel (questiobBody:QuestionDto):Promise<any> {
     let {key,text,userId,assistantAnswer}= questiobBody
    this.activeRequestId=key
    this.audioQueue = [];
    this.audioMap.clear();
    this.ttsTextQueue = [];
   
    this.seq = 0;
    this.nextAudioSeq = 0;

    this.processing = false;
    this.activeWorkers = 0;

    this.audioWaiters.forEach(r => r());
    this.audioWaiters = [];

    this.queueWaiters.forEach(r => r());
    this.queueWaiters = [];
   
    
    const res =  await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mohammad-cv-agent',
      prompt:this.responder.get_prompt(text,userId),
      stream: true,
    }),
  });
     
      return res



}

async streamText (res:Response,answer:any ,key:string,userId:string) {
   const reader = answer.body!.getReader();
    const decoder = new TextDecoder();

     let fullText = '';
     let ttsBuffer =''

    let buffer = '';

    let streamEnded = false;


    res.on('close', () => {
      console.log('client disconnected');
      streamEnded = true;
    });

      while (!streamEnded) {
        const { value, done } = await reader.read();
        if (done) break;
        if (this.activeRequestId !== key) {
            // stop generating old response
              await reader.cancel();
              res.end();
              return;
          }
              
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop()!; // keep incomplete JSON

        for (const line of lines) {
          if (!line.trim()) continue;

          const json = JSON.parse(line);
         
          if (json.response) {
          
                      
            if (json.response.includes('_MEMORY_FALSE_') ||json.response.includes('_MEMORY_TRUE_') ) {
             console.log("memory",json.response)
            }
            else {
                fullText += json.response;
                ttsBuffer += json.response;
              res.write(json.response);
            }
            

            if (
                ttsBuffer.split(/\s+/).length > 8  ||
             /[.!?,]\s$/.test(ttsBuffer)
            ) {
              this.enqueueTTS(ttsBuffer,key);
              ttsBuffer = '';
            }
          }

          if (json.done) {
            if (ttsBuffer.trim()) {
             
              this.enqueueTTS(ttsBuffer,key);
              ttsBuffer = '';
            }
            

            res.end();
            streamEnded = true;
            break;
          }
        }
     
      }
} 
async generateSpeech(text: string): Promise<Buffer> {
  console.time("G Speech:")
  const response = await axios.post(
    PIPER_URL
    ,
    text
     ,
    {
      headers: { 'Content-Type': 'text/plain' },
      responseType: 'arraybuffer',
    },
  );
  console.timeEnd("G Speech:")
  return Buffer.from(response.data);
}



enqueueTTS(text: string,key:string) {
  this.ttsTextQueue.push({
    key,
    seq: this.seq++,
    text
  });
  this.processTTSQueueV2();
}



private async waitForAudio() {
  if (this.audioQueue.length > 0) return;
  await new Promise<void>(r => this.audioWaiters.push(r));
}

private stripWavHeader(buffer: Buffer) {
  // standard PCM WAV header is 44 bytes
  return buffer.subarray(44);
}

private flushOrderedAudio() {
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

private notifyQueue() {
  this.queueWaiters.forEach(r => r());
  this.queueWaiters = [];
}

private async waitForQueue() {
  if (this.ttsTextQueue.length > 0) return;
  await new Promise<void>(r => this.queueWaiters.push(r));
}

private async processTTSQueueV2() {

  if (this.processing) return;

  this.processing = true;
 try{
  while (this.ttsTextQueue.length > 0 || this.activeWorkers > 0) {

     if (this.ttsTextQueue.length === 0 && this.activeWorkers > 0) {
      await this.waitForQueue();
   }

    while (
      this.ttsTextQueue.length > 0 &&
      this.activeWorkers < this.MAX_TTS_WORKERS
    ) {
 
     
      const item = this.ttsTextQueue.shift()!;

      if (item.key !== this.activeRequestId) continue
      this.activeWorkers++;
      let text = item.text.replace(/\n/g, '. ');
      this.generateSpeech(text)
        .then(audio => {
         
           if (item.key !== this.activeRequestId) return;
          this.audioMap.set(item.seq, audio);
          this.flushOrderedAudio();
        })
        .finally(() => {
          this.activeWorkers--;
          this.notifyQueue();
        });
      }
     
    }

    
  }
 finally {
        
  this.processing = false;
      }
}

async streamAudio(res: Response,key:string,uesrId:string) {
  const FRAME_BYTES = 640


  const onClose = () => {
    console.log("audio client disconnected");

  };

  res.on('close', onClose);
  
  while (!res.writableEnded) {
    
    if (this.activeRequestId !== key) {

              res.end();
              return;
    }

    if (this.audioQueue.length > 0) {
      let chunk = this.audioQueue.shift();
      if (chunk && chunk.length % 2 !== 0) {
          console.warn("odd PCM chunk — fixing");
          chunk = chunk.subarray(0, chunk.length - 1);
        }

      while (chunk && chunk.length > 0) {
          const part = chunk.subarray(0, FRAME_BYTES);
          chunk = chunk.subarray(FRAME_BYTES);

          if (!res.write(part)) {
              await new Promise<void>(resolve =>
                res.once("drain", resolve)
              );
            }
            await new Promise(r => setTimeout(r, 20));
        }

    } else {
      res.write(Buffer.alloc(0));

      await this.waitForAudio();
      if (this.activeRequestId !== key) {
          res.end();
          return;
        }
    }
  }
}
}
