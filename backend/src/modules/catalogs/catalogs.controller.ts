import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CatalogsService } from './catalogs.service';
import { CreateCatalogItemDto, QueryCatalogDto, UpdateCatalogItemDto } from './dto/catalog.dto';

@ApiTags('Catalogs')
@ApiBearerAuth()
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly service: CatalogsService) {}

  /** Mọi người đăng nhập đều đọc được (dùng cho ô chọn) */
  @Get()
  findAll(@Query() query: QueryCatalogDto) {
    return this.service.findAll(query);
  }

  @Get('counts')
  counts() {
    return this.service.counts();
  }

  @Post()
  @Permissions('catalogs.manage')
  create(@Body() dto: CreateCatalogItemDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('catalogs.manage')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCatalogItemDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('catalogs.manage')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
