import { Controller, Param, Sse ,MessageEvent} from '@nestjs/common';

import { MessageUpdaterService } from './message-updater.service';
import { Observable } from 'rxjs';

@Controller()
export class MessageUpdaterController {
  constructor(private readonly messageUpdaterService: MessageUpdaterService) {}

@Sse('update/:id')
stream(@Param('id') id: string): Observable<MessageEvent> {
  return this.messageUpdaterService.createStream(id);
}
}
