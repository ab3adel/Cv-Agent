import { Injectable , MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class MessageUpdaterService {
  
 private streams = new Map<string, Subject<MessageEvent>>();

  createStream(requestId: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    this.streams.set(requestId, subject);
    return subject.asObservable();
  }

  send(requestId: string, status: string) {
    const stream = this.streams.get(requestId);
    if (stream) {
      stream.next({ data: { status } });
    }
  }

  complete(requestId: string) {
    const stream = this.streams.get(requestId);
    if (stream) {
      stream.complete();
      this.streams.delete(requestId);
    }
  }
}
