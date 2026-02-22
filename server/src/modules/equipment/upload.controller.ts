/**
 * Equipment photo & signature upload controller.
 *
 * This handles maintenance record photos and electronic signatures,
 * NOT user-uploaded business documents (PDF/Word/Excel).
 * Photo limit: 5MB, Signature limit: 1MB - per TASK-218 requirements.
 */
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../../common/services/storage.service';

const PHOTO_MAX_SIZE = 5 * 1024 * 1024;
const SIGNATURE_MAX_SIZE = 1 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

@Controller('api/v1/upload')
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    this.validateFile(file, PHOTO_MAX_SIZE, ALLOWED_IMAGE_TYPES, 'photo');
    return this.storageService.uploadFile(file, 'equipment/photos');
  }

  @Post('signature')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSignature(@UploadedFile() file: Express.Multer.File) {
    this.validateFile(file, SIGNATURE_MAX_SIZE, ALLOWED_IMAGE_TYPES, 'signature');
    return this.storageService.uploadFile(file, 'equipment/signatures');
  }

  private validateFile(
    file: Express.Multer.File,
    maxSize: number,
    allowedTypes: string[],
    label: string,
  ) {
    if (!file) {
      throw new BadRequestException(`No ${label} file provided`);
    }
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / 1024 / 1024);
      throw new BadRequestException(`${label} file size exceeds ${maxMB}MB limit`);
    }
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid ${label} file type: ${file.mimetype}`);
    }
  }
}
