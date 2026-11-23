import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreatePositionDto, QueryPositionDto, UpdatePositionDto } from './dto/position.dto';
import { PositionsService } from './positions.service';

@ApiTags('Positions')
@ApiBearerAuth()
@Controller('positions')
export class PositionsController {
  constructor(private readonly service: PositionsService) {}

  @Get()
  findAll(@Query() query: QueryPositionDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('organization.manage')
  create(@Body() dto: CreatePositionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('organization.manage')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePositionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('organization.manage')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
