import { Injectable , MessageEvent } from '@nestjs/common';
import { CreateMessageUpdaterDto } from './dto/create-message-updater.dto';
import { UpdateMessageUpdaterDto } from './dto/update-message-updater.dto';
import { Observable } from 'rxjs';

@Injectable()
export class MessageUpdaterService {
  
  messageAnalayzing ():Observable<MessageEvent> {
    return 
  }
}
