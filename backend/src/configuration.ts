import { Configuration, App, IMidwayContainer } from '@midwayjs/core';
import * as koa from '@midwayjs/koa';
import * as validation from '@midwayjs/validation';
import * as info from '@midwayjs/info';
import * as typeorm from '@midwayjs/typeorm';
import { BodyParserMiddleware } from '@midwayjs/koa';
import { join } from 'path';
import { ReportMiddleware } from './middleware/report.middleware';
import { JwtMiddleware } from './middleware/jwt.middleware';
import { CorsMiddleware } from './middleware/cors.middleware';
import { DefaultErrorFilter } from './filter/default.filter';
import { NotFoundFilter } from './filter/notfound.filter';
import { CategoryService } from './service/category.service';

@Configuration({
  imports: [
    koa,
    validation,
    typeorm,
    {
      component: info,
      enabledEnvironment: ['local'],
    },
  ],
  importConfigs: [join(__dirname, './config')],
})
export class MainConfiguration {
  @App('koa')
  app: koa.Application;

  async onReady(container: IMidwayContainer) {
    this.app.useMiddleware([
      BodyParserMiddleware,
      CorsMiddleware,
      ReportMiddleware,
      JwtMiddleware,
    ]);

    this.app.useFilter([NotFoundFilter, DefaultErrorFilter]);

    console.log('[启动] 开始检查并初始化全局数据...');
    await this.seedGlobalData(container);
  }

  async onServerReady() {
    console.log('[启动] 服务已就绪');
  }

  private async seedGlobalData(container: IMidwayContainer) {
    try {
      const categoryService = await container.getAsync(CategoryService);
      await categoryService.seedGlobalData();
      console.log('[启动] 全局数据检查完成');
    } catch (error) {
      console.error('[启动] 全局数据初始化失败:', error);
    }
  }
}
