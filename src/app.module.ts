import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CvModule } from './cv/cv.module';
import { ResponderModule } from './responder/responder.module';
import { AggreateByTenantContextIdStrategy } from './core/aggregate_by_tenant.strategy';
import { ContextIdFactory } from '@nestjs/core';
import { MessageUpdaterModule } from './message-updater/message-updater/message-updater.module';
import { MessageUpdaterModule } from './message-updater/message-updater.module';

  //ContextIdFactory.apply(new AggreateByTenantContextIdStrategy())

@Module({
  imports: [CvModule, ResponderModule, MessageUpdaterModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
