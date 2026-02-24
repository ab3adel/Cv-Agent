import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { messageDto } from './dto/message.dto';
@Injectable()
export class NotifierService {

    async notifyOwner(payload: { userId: string; conversation: string }) {
    await this.sendEmail(payload);
    await this.sendWhatsApp(payload);
  }

  async sendEmail(payload: messageDto) {


const resend = new Resend(process.env.RESEND_API_KEY);

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'mohammadismael962@gmail.com',
  subject: 'From Model',
  html: payload.conversation??'text',
 
});
  }

  async sendWhatsApp(payload: any) {
    // Use WhatsApp Cloud API or Twilio
  }
}
