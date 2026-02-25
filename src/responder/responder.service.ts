import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

import * as path from 'path';
import { cvPatternKeywords, cvStrongKeywords, cvWeakKeywords, greetingKeywords } from './tools/regex';
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
      console.log('add Assistant triggered',assistant)
      if (assistant)
      {
      let q = 'USER EMAIL : '+ assistant
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
    
      this.conversation.set(userId,conversation)


    }

    get_systme_prompt () {

      return `
              ### Instructions

                You can trigger ONLY ONE action per response.
                Do NOT output multiple ACTION fields.

                If the user asks about CV, resume, experience, or curriculum vitae:
                ACTION: SHOW_CV

                If the user asks about contacts, phone number, email, or how to reach Mohammad:
                ACTION: SHOW_CONTACTS

                If multiple actions are requested, prioritize:
                1. SHOW_CV
                2. SHOW_CONTACTS

                If the user explicitly asks to send a message to Mohammad,
                or writes a direct message intended for Mohammad (for example: 
                "Tell Mohammad that...", 
                "Please send this to Mohammad...",
                "I want to contact Mohammad and say..."):

                Return EXACTLY in this format ,The order of fields must NOT change :

                ACTION: SEND_EMAIL
                EMAIL_CONTENT: <verbatim user message>
                STATUS: <STATUS_VALU> 

                EMAIL_CONTENT must contain ONLY the user's message.
                Do NOT modify, summarize, or rephrase it.
                STATUS: contains Tow values : PENDING or APPROVED 
                Approval is detected only if the user explicitly says:
                "approve", "approved", "yes send it","ok","that's good", or "confirm send"
                when user approved EMAIL_CONTENT , you must Retrun it Exactly in this format :
                ACTION: SEND_EMAIL 
                EMAIL_CONTENT: <verbative user message> 
                STATUS: APPROVED


                

                If no action is needed:
                ACTION: null
      `
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

               
                    `

    return prompt
    }
      detectIntent(question: string):questionTypeEnum {
            const text = question.toLowerCase().trim();
            const wordsCount = text.split(/\s+/).filter(Boolean).length;

            const cvStrongScore = cvStrongKeywords.reduce((score, keyword) =>
              score + (this.containsKeyword(text, keyword) ? 2 : 0),
            0);

            const cvWeakScore = cvWeakKeywords.reduce((score, keyword) =>
              score + (this.containsKeyword(text, keyword) ? 1 : 0),
            0);

            const cvPatternScore = cvPatternKeywords.reduce((score, pattern) =>
              score + (pattern.test(text) ? 2 : 0),
            0);

            const cvScore = cvStrongScore + cvWeakScore + cvPatternScore;

            const greetingScore = greetingKeywords.reduce((score, keyword) =>
              score + (this.containsKeyword(text, keyword) ? 1 : 0),
            0);

            const isGreetingOnly =
              greetingScore > 0 &&
              cvScore === 0 &&
              wordsCount <= 8;

            if (cvScore >= 2) {
              return questionTypeEnum.isCvContent;
            }

            if (isGreetingOnly) {
              return questionTypeEnum.isGreeting;
            }

            return questionTypeEnum.GeneralContent;
        }

        private containsKeyword(text: string, keyword: string) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
  return pattern.test(text);
}

}
