---
title: Add a feature module
description: Step-by-step recipe for creating a new NestJS feature module in this codebase.
tags: [recipe, module, scaffolding]
---

# Add a feature module

Suppose you're adding a `post` module with CRUD over a `Post` resource.

## 1. Create the folder skeleton

```
src/modules/post/
├── post.module.ts
├── post.controller.ts
├── post.service.ts
└── dto/
    ├── create-post.dto.ts
    ├── update-post.dto.ts
    ├── post-query.dto.ts
    └── index.ts
```

## 2. Add the Prisma model

Edit [prisma/schema.prisma](../../../prisma/schema.prisma):

```prisma
model Post {
  id        String   @id @default(uuid())
  title     String
  content   String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("posts")
  @@index([authorId])
}
```

Then add the back-relation on `User`:

```prisma
model User {
  // ... existing fields ...
  posts     Post[]
}
```

Generate + migrate:

```bash
pnpm prisma:migrate -- --name add_post
```

## 3. DTOs

```ts
// src/modules/post/dto/create-post.dto.ts
import { IsString, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  content: string;
}
```

```ts
// src/modules/post/dto/update-post.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';

export class UpdatePostDto extends PartialType(CreatePostDto) {}
```

```ts
// src/modules/post/dto/post-query.dto.ts
import { PaginationQueryDto } from '@/common/types';
// extend if filtering needed
export class PostQueryDto extends PaginationQueryDto {}
```

```ts
// src/modules/post/dto/index.ts
export * from './create-post.dto';
export * from './update-post.dto';
export * from './post-query.dto';
```

## 4. Service

```ts
// src/modules/post/post.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/database/prisma.service';
import { paginate, calculateSkip } from '@/common/utils';
import { CreatePostDto, UpdatePostDto, PostQueryDto } from './dto';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PostQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = calculateSkip(page, limit);

    const [data, total] = await Promise.all([
      this.prisma.post.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.post.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async findById(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  create(authorId: string, dto: CreatePostDto) {
    return this.prisma.post.create({ data: { ...dto, authorId } });
  }

  async update(id: string, dto: UpdatePostDto) {
    await this.findById(id); // 404 if missing
    return this.prisma.post.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.post.delete({ where: { id } });
  }
}
```

## 5. Controller

```ts
// src/modules/post/post.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators';
import { ParseUUIDPipe } from '@/common/pipes';
import { RequestUser } from '@/common/types';
import { PostService } from './post.service';
import { CreatePostDto, UpdatePostDto, PostQueryDto } from './dto';

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  list(@Query() query: PostQueryDto) {
    return this.postService.list(query);
  }

  @Get(':id')
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.postService.findById(id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePostDto) {
    return this.postService.create(user.id, dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePostDto) {
    return this.postService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.postService.remove(id);
  }
}
```

## 6. Module

```ts
// src/modules/post/post.module.ts
import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService], // export ONLY if other modules need to inject PostService
})
export class PostModule {}
```

## 7. Register in `AppModule`

Add the import to [src/app.module.ts](../../../src/app.module.ts):

```ts
import { PostModule } from './modules/post/post.module';
// ...
@Module({
  imports: [
    // ... existing
    PostModule,
  ],
})
```

## 8. Verify

```bash
pnpm prisma:generate     # if schema changed
pnpm build               # type check
pnpm start:dev           # smoke test
```

Open Swagger at `/api/v1/docs` and verify the new tag/routes appear.

## Common variants

- **Public route on an otherwise authed controller**: add `@Public()` from `@/common/decorators` to the specific handler.
- **Different auth for read vs write**: use `@UseGuards(OptionalAuthGuard)` on the controller, then enforce write permissions in the service.
- **Admin-only routes**: split into `controllers/admin-post.controller.ts` with its own auth/role checks.
- **Heavy filter logic**: keep query parsing in the DTO; don't accept arbitrary `where` from the client.
