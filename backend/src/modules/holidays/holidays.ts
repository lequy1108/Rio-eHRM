import { Body, Controller, Delete, Get, HttpCode, Injectable, Module, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, ConflictException, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Between, Repository } from 'typeorm';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { lunarToSolar } from '../../common/utils/lunar';
import { Holiday } from './holiday.entity';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() === '' ? null : value);

export class HolidayDto {
  @IsDateString({}, { message: 'Ngày không hợp lệ' })
  date!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Nhập tên ngày lễ' })
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(255)
  note?: string | null;
}

export class UpdateHolidayDto {
  @IsOptional()
  @IsDateString({}, { message: 'Ngày không hợp lệ' })
  date?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Nhập tên ngày lễ' })
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(255)
  note?: string | null;
}

export class GenerateHolidaysDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

/**
 * Ngày nghỉ lễ theo Điều 112 Bộ luật Lao động 2019. Ngày nghỉ bù và lịch hoán đổi do Chính phủ công bố
 * từng năm, nên đây chỉ là bản gợi ý để quản trị chỉnh lại theo thông báo chính thức.
 */
export function defaultHolidays(year: number): HolidayDto[] {
  const tet = lunarToSolar(1, 1, year);
  const list: HolidayDto[] = [
    { date: `${year}-01-01`, name: 'Tết Dương lịch', paid: true },
    { date: addDays(tet, -1), name: 'Tết Nguyên đán (ngày cuối năm âm lịch)', paid: true },
    ...[1, 2, 3, 4].map((i) => ({ date: addDays(tet, i - 1), name: `Tết Nguyên đán (mùng ${i})`, paid: true })),
    { date: lunarToSolar(10, 3, year), name: 'Giỗ Tổ Hùng Vương (10/3 âm lịch)', paid: true },
    { date: `${year}-04-30`, name: 'Ngày Chiến thắng', paid: true },
    { date: `${year}-05-01`, name: 'Ngày Quốc tế Lao động', paid: true },
    { date: `${year}-09-01`, name: 'Quốc khánh (nghỉ liền kề)', paid: true, note: 'Ngày 1/9 hoặc 3/9 tuỳ thông báo của Chính phủ' },
    { date: `${year}-09-02`, name: 'Quốc khánh', paid: true },
  ];
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

@Injectable()
export class HolidaysService {
  constructor(@InjectRepository(Holiday) private readonly repo: Repository<Holiday>) {}

  findYear(year: number) {
    return this.repo.find({ where: { date: Between(`${year}-01-01`, `${year}-12-31`) }, order: { date: 'ASC' } });
  }

  private async unique(date: string, id?: string) {
    const other = await this.repo.findOne({ where: { date } });
    if (other && other.id !== id) throw new ConflictException(`Ngày ${date.split('-').reverse().join('/')} đã có: ${other.name}`);
  }

  async create(dto: HolidayDto) {
    await this.unique(dto.date);
    return this.repo.save(this.repo.create({ ...dto, paid: dto.paid ?? true }));
  }

  async update(id: string, dto: UpdateHolidayDto) {
    const h = await this.repo.findOne({ where: { id } });
    if (!h) throw new NotFoundException('Không tìm thấy ngày lễ');
    if (dto.date !== undefined) await this.unique(dto.date, id);
    for (const k of ['date', 'name', 'paid', 'note'] as const) if (dto[k] !== undefined) (h as unknown as Record<string, unknown>)[k] = dto[k];
    return this.repo.save(h);
  }

  async remove(id: string) {
    const r = await this.repo.delete(id);
    if (!r.affected) throw new NotFoundException('Không tìm thấy ngày lễ');
    return { message: 'Đã xoá' };
  }

  /** Thêm các ngày lễ mặc định còn thiếu trong năm, không đụng ngày đã có */
  async generate(year: number) {
    const existing = new Set((await this.findYear(year)).map((h) => h.date));
    const add = defaultHolidays(year).filter((h) => !existing.has(h.date));
    if (add.length) await this.repo.save(add.map((h) => this.repo.create(h)));
    return { added: add.length, items: await this.findYear(year) };
  }
}

@ApiTags('Holidays')
@ApiBearerAuth()
@Controller('holidays')
export class HolidaysController {
  constructor(private readonly service: HolidaysService) {}

  /** Mọi người đăng nhập đều xem được lịch nghỉ */
  @Get()
  findYear(@Query('year', new ParseIntPipe({ optional: true })) year?: number) {
    return this.service.findYear(year ?? new Date().getFullYear());
  }

  /** Xem trước danh sách mặc định của một năm */
  @Get('defaults')
  @Permissions('settings.manage')
  defaults(@Query('year', ParseIntPipe) year: number) {
    return defaultHolidays(year);
  }

  @Post('generate')
  @HttpCode(200)
  @Permissions('settings.manage')
  generate(@Body() dto: GenerateHolidaysDto) {
    return this.service.generate(dto.year);
  }

  @Post()
  @Permissions('settings.manage')
  create(@Body() dto: HolidayDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('settings.manage')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHolidayDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('settings.manage')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Holiday])],
  controllers: [HolidaysController],
  providers: [HolidaysService],
  exports: [HolidaysService],
})
export class HolidaysModule {}
