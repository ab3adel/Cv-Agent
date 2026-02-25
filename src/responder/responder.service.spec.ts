import { Test, TestingModule } from '@nestjs/testing';
import { ResponderService } from './responder.service';
import { questionTypeEnum } from './tools/interfaces';

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

  it('detects greeting messages as greeting intent', () => {
    expect(service.detectIntent('Hi there')).toBe(questionTypeEnum.isGreeting);
  });

  it('detects CV messages with strong keywords', () => {
    expect(service.detectIntent('Can you share your resume and skills?')).toBe(
      questionTypeEnum.isCvContent,
    );
  });

  it('detects technical CV keywords with symbols', () => {
    expect(service.detectIntent('Do you have C# and Node.js experience?')).toBe(
      questionTypeEnum.isCvContent,
    );
  });

  it('keeps generic questions as general content', () => {
    expect(service.detectIntent('Can you explain this algorithm?')).toBe(
      questionTypeEnum.GeneralContent,
    );
  });
});
