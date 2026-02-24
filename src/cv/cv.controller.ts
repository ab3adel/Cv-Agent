import { Body, Controller,Get,Post
  , Query, Res,  } from '@nestjs/common';
import { CvService } from './cv.service';

import type {Response } from 'express'
import { QuestionDto } from './dto/create-cv.dto';
import { ResponderService } from 'src/responder/responder.service';


@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService ,
     private readonly cvResponder :ResponderService
  ) {}


  @Post('text')
  async GetAnswer(@Body() body:QuestionDto ,@Res() res: Response) {

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');


    // Send the file to your Whisper service
    //const transcript = await this.cvService.transcribeAudio(file.path);
    
     if (!body?.text) {
    return res.status(400).send({ error: "No text provided" });
  }

     console.time("Ollama")
     const answer= await this.cvService.askModel(body)
     console.timeEnd("Ollama")
     await this.cvService.streamText(res,answer,body.key,body.userId)
     setImmediate(() => {
   if(body.assistantAnswer)this.cvResponder.addAssistantMessages(body.assistantAnswer, body.userId);
   this.cvResponder.addUserRecentMessages(body.text, body.userId);
});


  

  }

 



@Get('audio/stream')
async streamAudio(@Query("key") key:string,@Query("userId") userId:string ,@Res() res: Response) {
  if (!key || !userId) {
  return res.status(400).send("Missing key or userId");
}
  //res.setHeader('Content-Type', 'audio/wav');
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders?.();   

  await this.cvService.streamAudio(res,key,userId);
}

}
