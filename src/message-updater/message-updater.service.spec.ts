import { Test, TestingModule } from '@nestjs/testing';
import { MessageUpdaterService } from './message-updater.service';

describe('MessageUpdaterService', () => {
  let service: MessageUpdaterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageUpdaterService],
    }).compile();

    service = module.get<MessageUpdaterService>(MessageUpdaterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
