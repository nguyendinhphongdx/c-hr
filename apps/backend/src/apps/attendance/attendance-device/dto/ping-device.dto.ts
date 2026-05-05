import { IsString, MaxLength } from 'class-validator';

export class PingDeviceDto {
  /** JWT token from create / regenerate. Server verifies signature + version. */
  @IsString()
  @MaxLength(2048)
  token: string;
}
