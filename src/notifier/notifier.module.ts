import { Module } from '@nestjs/common';
import { NotifierService } from './notifier.service';
import { NotifierController } from './notifier.controller';

@Module({
  controllers: [NotifierController],
  providers: [NotifierService],
  exports:[NotifierService]
})
export class NotifierModule {}
