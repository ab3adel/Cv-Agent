import { Controller, Param, Sse ,MessageEvent} from '@nestjs/common';

import { ActionsService } from './actions.service';
import { Observable } from 'rxjs';

@Controller()
export class ActionsController {
  constructor(private readonly messageUpdaterService: ActionsService) {}

@Sse('actions/:id')
stream(@Param('id') id: string): Observable<MessageEvent> {
  return this.messageUpdaterService.createStream(id);
}
}
