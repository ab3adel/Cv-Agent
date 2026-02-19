import { Test, TestingModule } from '@nestjs/testing';
import { MessageUpdaterController } from './message-updater.controller';
import { MessageUpdaterService } from './message-updater.service';

describe('MessageUpdaterController', () => {
  let controller: MessageUpdaterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageUpdaterController],
      providers: [MessageUpdaterService],
    }).compile();

    controller = module.get<MessageUpdaterController>(MessageUpdaterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
