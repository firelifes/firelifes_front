import { Controller, Get, Inject } from '@midwayjs/core';
import type { Context } from '@midwayjs/koa';
import { CashflowService } from '../../service/cashflow.service';

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

@Controller('/api/cashflow')
export class CashflowController {
  @Inject()
  cashflowService: CashflowService;

  @Inject()
  ctx: Context;

  @Get('/summary')
  async getSummary(): Promise<IApiResponse> {
    try {
      const userId = this.ctx.state.user?.userId;
      if (!userId) {
        return {
          success: false,
          message: '请先登录',
        };
      }

      const data = await this.cashflowService.getCashflowSummary(userId);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }
}
