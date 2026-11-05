import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const lower = () => Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(80) @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) name: string;
  @IsEmail() @lower() email: string;
  @Matches(/^[0-9+\s-]{8,15}$/, { message: 'Enter a valid phone number.' }) phone: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
}

export class UpdateProfileDto {
  @IsString() @MinLength(2) @MaxLength(80) @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) name: string;
  @Matches(/^[0-9+\s-]{8,15}$/, { message: 'Enter a valid phone number.' }) phone: string;
}

export class LoginDto {
  @IsEmail() @lower() email: string;
  @IsString() @MaxLength(128) password: string;
}
