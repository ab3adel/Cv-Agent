import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import * as fs from 'fs';

import * as path from 'path';
import { cvKeywords, greetingKeywords } from './tools/regex';
import { conversation, questionTypeEnum } from './tools/interfaces';
import { OLLAMA_URL } from 'src/core/constants';

@Injectable()
export class ResponderService {
      private readonly CV_PATH = path.join(process.cwd(), 'cv.txt');
      private  cvContent: string|null = null
      private conversation :Map<string,conversation>=new Map()
      private previous_question : questionTypeEnum|null = null
    constructor(){
     

    }
  

     private async summarize (oldMessages:string[],conversation:conversation) {
        const memoryInstruction = `
        - Send _MEMORY_TRUE_ only if the   Question from user: contains new personal,
          contextual, or long-term relevant information.
        - Send _MEMORY_FALSE_ for greetings, CV-related questions, or generic requests.
        - At the very end of your response, on a new line, output:
          _MEMORY_TRUE_
          or
          _MEMORY_FALSE_
        - Do not explain why . Commit to the rule
        `;
     const summaryPrompt = `

                 Question : 
                ${oldMessages.join("\n")}
                 ${memoryInstruction}
                `;
       console.log('summaryprompt',summaryPrompt)
       let summary = await  fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:7b',
      prompt: summaryPrompt,
      stream: false,
    })})
    const json_res = await summary.json()
    const summaryText = json_res.response
    console.log('summaryText',summaryText)
    conversation.summary = summaryText.trim();
    return conversation
 
 


    }
   
    async addUserRecentMessages(userQuestion:string,userId:string){
      if (questionTypeEnum.GeneralContent === this.detectIntent(userQuestion)
      ||questionTypeEnum.isCvContent === this.detectIntent(userQuestion) ){
        this.previous_question = questionTypeEnum.GeneralContent
        let q = 'User : '+userQuestion
       return  this.set_recentMessages(q,userId)
      }
      else {
        this.previous_question = questionTypeEnum.isCvContent
      }
    }

    async addAssistantMessages(assistant:string,userId:string) {
      if (this.previous_question &&( this.previous_question === questionTypeEnum.GeneralContent
         ||this.previous_question === questionTypeEnum.isCvContent)
      ){
      let q = 'Assistant Answer : '+ assistant
      return  this.set_recentMessages(q,userId)
      }
    }

   private async  set_recentMessages (userQuestion:string,userId:string) {
      
      let conversation = this.conversation.get(userId)?? {recentMessages:[],summary:''}
      conversation.recentMessages.push(userQuestion)
      
      if (conversation.recentMessages.length > 3) {


        conversation.recentMessages =
          conversation.recentMessages.slice(-3);
      }
      console.log('messages being stored',conversation.recentMessages)
      this.conversation.set(userId,conversation)

    }

     get_prompt (userQuestion:string,userId:string) {
          
          const promptsList = {
         [questionTypeEnum.GeneralContent]: `
          Instructions:
          - Reply briefly and naturally.
          - max 1-2 lines
   
         
          `,
          [questionTypeEnum.isCvContent]:`
          Instructions:
          - Answer based on Mohammad's CV.
          - Keep answers short (max 2–3 lines).
          - Be positive and professional.
      
          
          `,
          [questionTypeEnum.isGreeting]:`
          Instructions:
          - Reply with one short friendly sentence.
      
        
          `
          }
          let memory =this.conversation.get(userId)?? {recentMessages:[],summary:''}
          let questionType =  this.detectIntent(userQuestion)

          console.log('memory',memory)
       
       const prompt =
              `
               ${promptsList[questionType]}
               ### Conversation Context
                ${memory.recentMessages.join('\n')}  
                ### User Question   
                 ${userQuestion}
                 ### Instructions
                  Answer only the User Question.
    
                 
                    `

    return prompt
    }
      detectIntent(question: string):questionTypeEnum {
            const t = question.toLowerCase();
            const cvRegexes = cvKeywords.map(
               word => new RegExp(`\\b${word}s?\\b`, 'i')
            );

            const greetingRegexes = greetingKeywords.map(
              word => new RegExp(`\\b${this.escapeRegex(word)}\\b`, "i")
            );
            const cvScore = cvRegexes.reduce((s, word) =>
              s + (word.test(t) ? 1 : 0),
            0);

            const greetingScore = greetingRegexes.reduce((s, word) =>
              s + (word.test(t) ? 1 : 0),
            0);

            const isGreetingOnly =
              greetingScore > 0 &&
              cvScore === 0

            if (cvScore > 0){
             
              return questionTypeEnum.isCvContent
            }

           else if (isGreetingOnly){
           
              return questionTypeEnum.isGreeting
           }
            
            return questionTypeEnum.GeneralContent
        }

        private escapeRegex(word: string) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

}
