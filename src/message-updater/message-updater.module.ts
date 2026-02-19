import { Module } from '@nestjs/common';
import { MessageUpdaterService } from './message-updater.service';
import { MessageUpdaterController } from './message-updater.controller';

@Module({
  controllers: [MessageUpdaterController],
  providers: [MessageUpdaterService],
})
export class MessageUpdaterModule {}
