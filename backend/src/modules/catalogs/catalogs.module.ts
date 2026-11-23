import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';
import { CatalogItem } from './entities/catalog-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogItem])],
  controllers: [CatalogsController],
  providers: [CatalogsService],
  exports: [CatalogsService],
})
export class CatalogsModule {}
