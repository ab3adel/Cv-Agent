import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CvModule } from './cv/cv.module';
import { ResponderModule } from './responder/responder.module';
import { MessageUpdaterModule } from './message-updater/message-updater.module';
import { ActionsModule } from './actions/actions.module';
import { NotifierModule } from './notifier/notifier.module';
import 'dotenv'
import { ConfigModule } from '@nestjs/config';

  //ContextIdFactory.apply(new AggreateByTenantContextIdStrategy())

@Module({
  imports: [
       CvModule,
       ResponderModule
     , MessageUpdaterModule
     , ActionsModule
     , NotifierModule
     , ConfigModule.forRoot({
      isGlobal:true
     })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
