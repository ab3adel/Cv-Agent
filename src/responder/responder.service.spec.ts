import { Test, TestingModule } from '@nestjs/testing';
import { ResponderService } from './responder.service';

describe('ResponderService', () => {
  let service: ResponderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponderService],
    }).compile();

    service = module.get<ResponderService>(ResponderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
