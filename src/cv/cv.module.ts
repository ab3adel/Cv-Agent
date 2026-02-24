import { Module } from '@nestjs/common';

import { CvController } from './cv.controller';
import { ResponderModule } from 'src/responder/responder.module';
import { CvService } from './cv.service';
import { OllamaWarmer } from 'src/core/ollamaWarmer';

import { MessageUpdaterModule } from 'src/message-updater/message-updater.module';
import { ActionsModule } from 'src/actions/actions.module';
import { NotifierModule } from 'src/notifier/notifier.module';

@Module({
  controllers: [CvController],
  providers: [CvService,OllamaWarmer],
  imports: [ResponderModule,MessageUpdaterModule,ActionsModule,NotifierModule]
})
export class CvModule {}
