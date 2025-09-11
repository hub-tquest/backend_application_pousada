import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  name: string;
}

// Exportação explícita
export { RegisterDto };
