import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

/** Body cho thao tác hàng loạt: { ids: [...] } */
export class IdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  ids!: string[];
}
