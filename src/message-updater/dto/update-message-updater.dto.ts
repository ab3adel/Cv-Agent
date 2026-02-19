import { PartialType } from '@nestjs/mapped-types';
import { CreateMessageUpdaterDto } from './create-message-updater.dto';

export class UpdateMessageUpdaterDto extends PartialType(CreateMessageUpdaterDto) {
  id: number;
}
