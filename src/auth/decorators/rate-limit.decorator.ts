import { SetMetadata } from '@nestjs/common';

export const RateLimit = (limit: number, window: number) => {
  SetMetadata('rate-limit', limit);
  return SetMetadata('rate-window', window);
};
