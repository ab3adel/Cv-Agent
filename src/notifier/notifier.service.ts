import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { messageDto } from './dto/message.dto';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class NotifierService {
    
    constructor(private readonly configService:ConfigService){}
    async notifyOwner(payload: { userId: string; conversation: string }) {
    await this.sendEmail(payload);
    await this.sendWhatsApp(payload);
  }

  async sendEmail(payload: messageDto) {


const resend = new Resend(this.configService.get<string>('RESENT_API_KEY'));

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'mohammadismael962@gmail.com',
  subject: 'From Mohammad Agent',
  html: payload.conversation??'text',
 
});
  }

  async sendWhatsApp(payload: any) {
    // Use WhatsApp Cloud API or Twilio
  }
}
