import { Inject, Injectable ,MessageEvent, Scope} from '@nestjs/common';
import axios from 'axios';
import { ResponderService } from 'src/responder/responder.service';

import { OllamaWarmer } from 'src/core/ollamaWarmer';
import {Response} from 'express'
import { OLLAMA_ONLINE, OLLAMA_URL, PIPER_URL } from 'src/core/constants';
import { QuestionDto } from './dto/create-cv.dto';
import { MessageUpdaterService } from 'src/message-updater/message-updater.service';
import { questionTypeEnum } from 'src/responder/tools/interfaces';

import { abortPromise, sleep } from 'src/core/tools';
import { once } from 'events';
import { RequestContext } from './interfaces/request';
import { capture_cation, capture_email, check_action } from './tools/regex';
import { ActionsService } from 'src/actions/actions.service';
import { NotifierService } from 'src/notifier/notifier.service';



@Injectable({scope:Scope.REQUEST})
export class CvService {

    private requests : Map<string,RequestContext>= new Map()

    constructor(
         private readonly responder:ResponderService ,
        private readonly warmer : OllamaWarmer ,
        private readonly MessageUpdater :MessageUpdaterService,
        private readonly actions : ActionsService,
        private readonly notifier : NotifierService

){
   setInterval(() => {
      console.log("Active contexts:", this.requests.size);
    }, 5000);
}


async askModel (questiobBody:QuestionDto):Promise<any> {

     let {key,text,userId,assistantAnswer}= questiobBody
     const existing = this.requests.get(key)
     if (existing){
      existing.abortController.abort()
      
     }
     const context = new RequestContext(key)
     this.requests.set(key,context)
    
    try {
     this.MessageUpdater.send(key,"Analyzing the question ...")
    
    const questionType = this.responder.detectIntent(text)
    if (questionType === questionTypeEnum.isCvContent){
        this.MessageUpdater.send(key,"Searching the CV ...")
    }
    else {
      this.MessageUpdater.send(key,"Thinking ...")
    }
    
    console.time("TTFT")
    const res =  await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mohammad-cv-agent',
      prompt:`
          SYSTEM:
          ${this.responder.get_systme_prompt()}

          USER:
          ${this.responder.get_prompt(text, userId)}
      `,
      stream: true,
      
    }),signal:context.abortController.signal
  });
     this.MessageUpdater.send(key,"Generating the Answer")
    
      return res
} 
catch(err) {
  console.log('ask model error',err)
}
finally {
 this.cleanupIfDone(key)
   this.MessageUpdater.complete(key);
}


}

async streamText (res:Response,answer:any ,key:string,userId:string) {

   const reader = answer.body!.getReader();
    const decoder = new TextDecoder();
    const context = this.requests.get(key)
    if (context?.abortController.signal.aborted)return

     let fullText = '';
     let ttsBuffer =''
     let action:RegExpMatchArray|null = null
     let detected_action = ''
     let start_action = false

    let buffer = '';
    let firstChunk = true;

    let streamEnded = false;


    res.on('close', async () => {
      console.log('client disconnected');
      streamEnded = true;

          try {
            await reader.cancel();
          } catch {}

          const context = this.requests.get(key);
          context?.abortController.abort();
          if (context){
            context.pendingEmails=null
            context.isTextDone=true
          }
          
    });
    
    try {
      while (true) {
        if (streamEnded)break
        const { value, done } = await reader.read();
        if (done) {
           
           if(context) {
            context.isTextDone=true
            if (context.audioEnabled)context.notifyAudio();
           
        
          }
          break
        };
   
        if (context?.key !== key) {
            // stop generating old response
          context?.abortController.abort();
            await reader.cancel();
          if(context)context.isTextDone=true
            res.end();
          
            break;
          }
          if (context?.abortController.signal.aborted) {
              await reader.cancel();
              context.isTextDone=true
              res.end();
              break;
            }
              
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop()!; // keep incomplete JSON

        for (const line of lines) {
          if (!line.trim()) continue;

          const json = JSON.parse(line);
         
          if (json.response) {
           
            if (firstChunk){
                firstChunk=false
                console.timeEnd("TTFT")
            }
                  fullText += json.response;
                  console.log('full text',fullText)
                 if (!start_action && (check_action(json.response) || capture_cation(json.response))) {
                      start_action = true;
                    }

                if (start_action){
                  detected_action +=json.response
                  action = capture_cation(detected_action)
                  console.log('action',action)
                  if (action) {
                     
                     if (action[1]==='SEND_EMAIL') {
                          console.log('detected_action',detected_action)
                          let email_action = capture_email(detected_action)
                        if (email_action ){
                             console.log('email captured',email_action)
                             console.log('key',key)
                                start_action=false
                                let email_status= email_action[2]
                                let email_content =email_action[1]
                                
                            this.actions.send(key,action[1] ,email_status+'/'+email_content)
                            if (email_status ==='APPROVED'){
                                context.pendingEmails={
                                  conversation:email_content,
                                  userId
                                }
                               
                            }
                        }  
                    
                       
                     }
                     else {

                     

                      start_action=false
                  
                      this.actions.send(key,action[1],null)
                      }
                    
                    
                  }
                  
              
                }
                else {

                  
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
            context.isTextDone=true
            break;
          }
        }
     
      }
    }
    catch(err) {
      console.log(err)
    }
    finally {
 
     
      
       if (context?.pendingEmails) {
              this.notifier.sendEmail(context.pendingEmails)
        }
       this.cleanupIfDone(key)
       this.actions.complete(key);
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
  let context = this.requests.get(key)
  context?.ttsTextQueue.push({
    key,
    seq: context.seq++,
    text
  });
 if (context?.audioEnabled) this.processTTSQueueV2(key);
}


private async processTTSQueueV2(key:string) {
  const context = this.requests.get(key)
  
  if (context?.processing) return;
  
   if (!context) {
    return
   }

  context.processing = true;
 try{
  while ((context.ttsTextQueue.length > 0 || context.activeWorkers > 0) && !context.abortController.signal.aborted) {

     if (context.ttsTextQueue.length === 0 && context.activeWorkers > 0) {
      await Promise.race([
          context.waitForQueue(),
          abortPromise(context.abortController.signal)
        ]);
        continue
   }

    while (
      context.ttsTextQueue.length > 0 &&
      context.activeWorkers < context.MAX_TTS_WORKERS && 
      !context.abortController.signal.aborted
    ) {
 
     
      const item = context.ttsTextQueue.shift()!;
      if (item.key !== context.key) continue
    
      context.activeWorkers++;
      let text = item.text.replace(/\n/g, '. ');
      this.generateSpeech(text)
        .then(audio => {
         
          if (context.abortController.signal.aborted) return
           if (item.key !== context.key) return;
          context.audioMap.set(item.seq, audio);
          context.flushOrderedAudio();
        })
        .finally(() => {
          context.activeWorkers--;
          context.notifyQueue();
        });
      }
     
    }

    
  }
 finally {
        
  context.processing = false;
 
      }
}

async streamAudio(res: Response,key:string,uesrId:string) {
  
  const FRAME_BYTES = 640
   let retries = 0;
     let context: RequestContext | undefined;

      while (!(context = this.requests.get(key))) {
        await sleep(10);
        retries++;
    
        if (res.writableEnded) return;
        if (retries > 500) return;
      }
  
      context.audioEnabled=true

  const { signal } = context.abortController;

  const onClose = () => {
    context.abortController.abort();
  };

  res.on('close', onClose);

  
  try {
   
  while (!res.writableEnded) {
    
     if (signal.aborted) {
        console.log("request aborted");
       break
      }
      //   if (
      //     context.isTextDone &&
      //   context.activeWorkers === 0 &&
      //   context.audioQueue.length === 0
      // ) {
      //   this.requests.delete(key);
      //   break;
      // }

    if (context.audioQueue.length > 0) {
      let chunk = context.audioQueue.shift();
      if (chunk && chunk.length % 2 !== 0) {
          console.warn("odd PCM chunk — fixing");
          chunk = chunk.subarray(0, chunk.length - 1);
        }

      while (chunk && chunk.length > 0) {
          const part = chunk.subarray(0, FRAME_BYTES);
          chunk = chunk.subarray(FRAME_BYTES);

          if (!res.write(part)) {
              await once(res,'drain')
            }
             await sleep(5)
            if (signal.aborted) break
        }

    } else {
    

      await context.waitForAudio();
     if (signal.aborted) break
    }
  }
}
finally {
  res.off('close',onClose)
  this.cleanupIfDone(key)

  res.end()
}
} 



cleanupIfDone(key: string) {
  const context = this.requests.get(key);
  console.log('cleanupIfDone',context)
  if (!context ) return;

  const textDone = context.isTextDone === true;

  const audioDone =
    !context.audioEnabled ||
    (context.activeWorkers === 0 &&
     context.audioQueue.length === 0);

  if (textDone && audioDone) {

  
    this.requests.delete(key);

    console.log("Cleaned context:", key);
  }
}
}
