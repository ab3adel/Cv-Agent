import { Injectable , MessageEvent } from '@nestjs/common';
import { Observable, ReplaySubject, Subject } from 'rxjs';

@Injectable()
export class ActionsService {
  
 private streams = new Map<string, Subject<MessageEvent>>();

 createStream(requestId: string): Observable<MessageEvent> {
  const subject = new ReplaySubject<MessageEvent>(1);
  this.streams.set(requestId, subject);
  return subject.asObservable();
}

  send(requestId: string, status: string , content:string|null) {
    const stream = this.streams.get(requestId);
    if (stream) {
      stream.next({ data: { status,content } });
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
