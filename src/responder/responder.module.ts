import { Module } from '@nestjs/common';
import { ResponderService } from './responder.service';

@Module({
  providers: [ResponderService],
  exports :[ResponderService]
})
export class ResponderModule {}
