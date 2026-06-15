import { Catch, MidwayHttpError } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';

@Catch()
export class DefaultErrorFilter {
  async catch(err: any, ctx: Context) {
    console.error('[错误]', err);
    let status = 500;
    if (err instanceof MidwayHttpError) {
      status = err.status;
    } else if (err && typeof err.status === 'number') {
      status = err.status;
    }
    ctx.status = status;
    return {
      success: false,
      message: err.message || '服务器内部错误',
    };
  }
}
