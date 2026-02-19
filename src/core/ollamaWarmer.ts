import { Injectable, OnModuleInit } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class OllamaWarmer implements OnModuleInit {
  private warmed = false;
   private readonly OLLAMA_URL ='http://ollama:11434/api/generate'

  async onModuleInit() {
    console.log('🔥 Waiting for Ollama...');

    for (let i = 0; i < 10; i++) {
      try {
        await axios.post(this.OLLAMA_URL, {
          //model: 'qwen2.5:1.5b-instruct',
          model:"mohammad-cv-agent",
          prompt: 'ping',
          stream: false,
        });

        console.log('✅ Ollama warm');
        return;
      } catch (err: any) {
        console.log(`⏳ Ollama not ready yet (${i + 1}/10)`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.error('❌ Ollama failed to start');
  }
}