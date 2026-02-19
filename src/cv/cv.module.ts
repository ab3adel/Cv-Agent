import { Module } from '@nestjs/common';

import { CvController } from './cv.controller';
import { ResponderModule } from 'src/responder/responder.module';
import { CvService } from './cv.service';
import { OllamaWarmer } from 'src/core/ollamaWarmer';

@Module({
  controllers: [CvController],
  providers: [CvService,OllamaWarmer],
  imports: [ResponderModule]
})
export class CvModule {}
