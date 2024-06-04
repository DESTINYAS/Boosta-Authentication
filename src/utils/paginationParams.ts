import { IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationParams {
    @ApiProperty({ default: 0 })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    skip?: number;

    @ApiProperty({ default: 10 })
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number;
}